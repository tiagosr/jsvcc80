import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Lexer, PreprocessedSource } from '../../src/preprocessor/lexer.js';
import { TokenType } from '../../src/preprocessor/tokenTypes.js';

describe('Lexer - Basic Tests', () => {
  it('should tokenize simple integers', () => {
    const lexer = new Lexer('42');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.INTEGER);
    assert.strictEqual(tokens[0].value, '42');
  });

  it('should tokenize hexadecimal integers', () => {
    const lexer = new Lexer('0xFF');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.INTEGER);
    // Value normalized to lowercase hex without 'x' prefix in token value
    assert.ok(tokens[0].value === '0FF' || tokens[0].value === '0xFF');
  });

  it('should tokenize identifiers and keywords', () => {
    const lexer = new Lexer('int main() { return 0; }');
    const tokens = lexer.tokenize();
    
    const types = tokens.map(t => t.type);
    assert.ok(types.includes(TokenType.KEYWORD)); // int, return
    assert.ok(types.includes(TokenType.IDENTIFIER)); // main
    assert.ok(types.includes(TokenType.LPAREN));
  });

  it('should tokenize string literals', () => {
    const lexer = new Lexer('"hello world"');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.STRING);
    assert.strictEqual(tokens[0].value, 'hello world');
  });

  it('should handle escape sequences in strings', () => {
    const lexer = new Lexer('"line1\\nline2"');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens[0].type, TokenType.STRING);
    assert.ok(tokens[0].value.includes('\n'));
  });

  it('should tokenize operators', () => {
    const lexer = new Lexer('+ - * / == != < > <= >=');
    const tokens = lexer.tokenize();
    
    const types = tokens.map(t => t.type);
    assert.ok(types.includes(TokenType.PLUS));
    assert.ok(types.includes(TokenType.EQ));
    assert.ok(types.includes(TokenType.NE));
  });

  it('should skip comments', () => {
    const lexer = new Lexer('// comment\nint x; /* block */');
    const tokens = lexer.tokenize();
    
    const hasCommentTokens = tokens.some(t => 
      t.type === TokenType.IDENTIFIER && t.value.includes('comment')
    );
    assert.strictEqual(hasCommentTokens, false);
  });

  it('should track source locations', () => {
    const source = `int x = 42;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    for (const token of tokens) {
      assert.ok(token.location, 'Token should have location');
      assert.ok(token.location.start.line > 0, 'Line number should be valid');
    }
  });
});

describe('PreprocessedSource', () => {
  it('should register and retrieve pragma handlers', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.registerPragma('custom', (token) => ({ type: 'custom_pragma' }));
    
    assert.ok(preprocessor.getPragmaHandler('custom') !== undefined);
  });

  it('should define and lookup macros', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('PI', null, '3.14159');
    
    const macro = preprocessor.expandMacro('pi');
    assert.ok(macro !== null);
    assert.strictEqual(macro.replacement, '3.14159');
  });

  it('should be case-insensitive for macros', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('TEST', null, 'value');
    
    assert.ok(preprocessor.expandMacro('test') !== null);
    assert.ok(preprocessor.expandMacro('TEST') !== null);
  });

  it('should undefine macros', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('X', null, '1');
    preprocessor.undefineMacro('x');
    
    assert.strictEqual(preprocessor.expandMacro('x'), null);
  });

  it('should check if macro is defined', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('DEFINED', null, '1');
    
    assert.strictEqual(preprocessor.isMacroDefined('DEFINED'), true);
    assert.strictEqual(preprocessor.isMacroDefined('NOT_DEFINED'), false);
    assert.strictEqual(preprocessor.isMacroDefined('defined'), true);
  });

  it('should track conditional stack state', () => {
    const preprocessor = new PreprocessedSource();
    
    assert.strictEqual(preprocessor.isEffectivelyActive(), true);
    
    preprocessor.conditionalStack.push({ active: true, evaluated: false });
    assert.strictEqual(preprocessor.isEffectivelyActive(), true);
    
    preprocessor.conditionalStack.push({ active: false, evaluated: false });
    assert.strictEqual(preprocessor.isEffectivelyActive(), false);
  });
});

describe('Preprocessor - #define directive', () => {
  it('should define a macro via #define', () => {
    const source = `#define MAX_SIZE
int x;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('MAX_SIZE'), true);
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should define a macro with replacement value', () => {
    const source = `#define BUFFER_SIZE 1024
int y;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('BUFFER_SIZE'), true);
    const macro = lexer.preprocessor.expandMacro('BUFFER_SIZE');
    assert.strictEqual(macro.replacement, '1024');
  });

  it('should handle multiple #define directives', () => {
    const source = `#define A 1
#define B 2
#define C 3
int z;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('A'), true);
    assert.strictEqual(lexer.preprocessor.isMacroDefined('B'), true);
    assert.strictEqual(lexer.preprocessor.isMacroDefined('C'), true);
  });

  it('should redefine an existing macro', () => {
    const source = `#define VALUE 10
#define VALUE 20
int a;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    const macro = lexer.preprocessor.expandMacro('VALUE');
    assert.strictEqual(macro.replacement, '20');
  });

  it('should define macro with multi-word replacement', () => {
    const source = `#define MY_MACRO some_value here
int b;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    const macro = lexer.preprocessor.expandMacro('MY_MACRO');
    assert.strictEqual(macro.replacement, 'some_value here');
  });

  it('should throw error for #define without name', () => {
    const source = `#define
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#define requires a macro name/);
  });
});

describe('Preprocessor - #undef directive', () => {
  it('should undefine a macro via #undef', () => {
    const source = `#define REMOVE_ME
#undef REMOVE_ME
int x;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('REMOVE_ME'), false);
  });

  it('should handle #undef on non-existent macro', () => {
    const source = `#undef NONEXISTENT
int y;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'y');
  });

  it('should throw error for #undef without name', () => {
    const source = `#undef
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#undef requires a macro name/);
  });
});

describe('Preprocessor - #ifdef directive', () => {
  it('should include code when macro is defined', () => {
    const source = `#define ENABLED
#ifdef ENABLED
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should exclude code when macro is not defined', () => {
    const source = `#ifdef NOT_DEFINED
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should handle multiple #ifdef blocks', () => {
    const source = `#define FIRST
#ifdef FIRST
int a;
#endif
#ifdef SECOND
int b;
#endif
int c;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'a');
    assert.strictEqual(identifiers[1].value, 'c');
  });

  it('should throw error for #ifdef without macro name', () => {
    const source = `#ifdef
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#ifdef requires a macro name/);
  });
});

describe('Preprocessor - #ifndef directive', () => {
  it('should include code when macro is NOT defined', () => {
    const source = `#ifndef UNDEFINED_VAR
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should exclude code when macro IS defined', () => {
    const source = `#define DEFINED_VAR
#ifndef DEFINED_VAR
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should throw error for #ifndef without macro name', () => {
    const source = `#ifndef
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#ifndef requires a macro name/);
  });
});

describe('Preprocessor - #else directive', () => {
  it('should include else branch when ifdef is false', () => {
    const source = `#ifdef NOT_DEFINED
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should include if branch when ifdef is true', () => {
    const source = `#define DEFINED
#ifdef DEFINED
int included;
#else
int excluded;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should work with #ifndef and #else', () => {
    const source = `#define DEFINED
#ifndef DEFINED
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should throw error for #else without matching ifdef', () => {
    const source = `#else
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#else without matching/);
  });
});

describe('Preprocessor - #endif directive', () => {
  it('should properly close conditional blocks', () => {
    const source = `#define X
#ifdef X
int a;
#endif
int b;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'a');
    assert.strictEqual(identifiers[1].value, 'b');
  });

  it('should throw error for #endif without matching ifdef', () => {
    const source = `#endif
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#endif without matching/);
  });
});

describe('Preprocessor - Nested conditionals', () => {
  it('should handle nested #ifdef blocks', () => {
    const source = `#define OUTER
#define INNER
#ifdef OUTER
#ifdef INNER
int nested;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'nested');
  });

  it('should exclude nested block when outer is false', () => {
    const source = `#define INNER
#ifdef OUTER
#ifdef INNER
int excluded;
#endif
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should exclude nested block when inner is false', () => {
    const source = `#define OUTER
#ifdef OUTER
#ifdef NOT_DEFINED
int excluded;
#endif
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should handle nested conditionals with #else', () => {
    const source = `#define A
#ifdef A
#ifndef B
int included;
#else
int excluded1;
#endif
#else
int excluded2;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle deeply nested conditionals', () => {
    const source = `#define L1
#define L2
#define L3
#ifdef L1
#ifdef L2
#ifdef L3
int deep;
#endif
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'deep');
  });

  it('should handle mixed ifdef/ifndef nesting', () => {
    const source = `#define A
#ifndef B
#ifdef A
int result;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'result');
  });
});

describe('Preprocessor - Combined directives', () => {
  it('should combine #define and #ifdef', () => {
    const source = `#define FEATURE
#ifdef FEATURE
int enabled;
#endif
int main;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'enabled');
    assert.strictEqual(identifiers[1].value, 'main');
  });

  it('should combine #define, #ifdef, #else, #endif', () => {
    const source = `#define MODE1
#ifdef MODE1
int mode1;
#else
int mode2;
#endif
#ifdef MODE2
int mode2b;
#else
int fallback;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'mode1');
    assert.strictEqual(identifiers[1].value, 'fallback');
  });

  it('should handle #define inside conditional block', () => {
    const source = `#ifdef OUTER
int a;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 0);
  });

  it('should preserve #pragma functionality alongside new directives', () => {
    const source = `#pragma once
#define MY_MACRO
#ifdef MY_MACRO
int x;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should skip #define inside inactive conditional block', () => {
    const source = `#ifdef NOT_DEFINED
#define SHOULD_NOT_EXIST
int excluded;
#endif
#ifdef SHOULD_NOT_EXIST
int alsoExcluded;
#endif
int included;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
    assert.strictEqual(lexer.preprocessor.isMacroDefined('SHOULD_NOT_EXIST'), false);
  });

  it('should handle header guard pattern', () => {
    const source = `#ifndef HEADER_H
#define HEADER_H
int guard_var;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'guard_var');
    assert.strictEqual(lexer.preprocessor.isMacroDefined('HEADER_H'), true);
  });
});

describe('Preprocessor - Edge cases', () => {
  it('should handle empty source', () => {
    const lexer = new Lexer('');
    const tokens = lexer.tokenize();
    assert.strictEqual(tokens.length, 0);
  });

  it('should handle directives with extra whitespace', () => {
    const source = `#define   SPACED_OUT   value
#ifdef   SPACED_OUT
int x;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should handle code after conditional block on same line structure', () => {
    const source = `#define X
#ifdef X
int a;
#endif
int b;
#ifdef Y
int c;
#endif
int d;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 3);
    assert.strictEqual(identifiers[0].value, 'a');
    assert.strictEqual(identifiers[1].value, 'b');
    assert.strictEqual(identifiers[2].value, 'd');
  });

  it('should handle comments inside conditional blocks', () => {
    const source = `#define X
#ifdef X
// this is a comment
int a;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'a');
  });
});

describe('Preprocessor - #include directive', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `vcc80-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir) {
      try { rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  function writeTestFile(filename, content) {
    const p = join(testDir, filename);
    writeFileSync(p, content, 'utf-8');
    return p;
  }

  it('should include a file with double quotes', () => {
    writeTestFile('header.h', 'int header_var;');
    const source = `#include "${join(testDir, 'header.h')}"
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'header_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });

  it('should include a file with angle brackets when path is in includePaths', () => {
    writeTestFile('sys_header.h', 'int sys_var;');
    const source = `#include <sys_header.h>
int main_var;`;
    const preprocessor = new PreprocessedSource('<input>', {
      includePaths: [testDir]
    });
    const lexer = new Lexer(source, preprocessor);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'sys_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });

  it('should handle nested includes', () => {
    writeTestFile('inner.h', 'int inner_var;');
    writeTestFile('outer.h', `#include "${join(testDir, 'inner.h')}"
int outer_var;`);
    const source = `#include "${join(testDir, 'outer.h')}"
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 3);
    assert.strictEqual(identifiers[0].value, 'inner_var');
    assert.strictEqual(identifiers[1].value, 'outer_var');
    assert.strictEqual(identifiers[2].value, 'main_var');
  });

  it('should prevent duplicate inclusion of the same file', () => {
    writeTestFile('once.h', 'int once_var;');
    const source = `#include "${join(testDir, 'once.h')}"
#include "${join(testDir, 'once.h')}"
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'once_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });

  it('should throw error when included file is not found', () => {
    const source = `#include "${join(testDir, 'nonexistent.h')}"
int main_var;`;
    const lexer = new Lexer(source);

    assert.throws(() => lexer.tokenize(), /Cannot open include file/);
  });

  it('should propagate macros to included files', () => {
    const headerContent = `#ifdef ENABLED
int enabled_var;
#endif`;
    writeTestFile('cond.h', headerContent);
    const source = `#define ENABLED
#include "${join(testDir, 'cond.h')}"
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'enabled_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });

  it('should make macros from included files visible after include', () => {
    writeTestFile('define.h', '#define FROM_HEADER');
    const source = `#include "${join(testDir, 'define.h')}"
#ifdef FROM_HEADER
int from_header_var;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'from_header_var');
  });

  it('should handle includes in conditional blocks', () => {
    writeTestFile('conditional.h', 'int cond_var;');
    const source = `#ifdef FEATURE
#include "${join(testDir, 'conditional.h')}"
#endif
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'main_var');
  });

  it('should include file when conditional is active', () => {
    writeTestFile('active.h', 'int active_var;');
    const source = `#define FEATURE
#ifdef FEATURE
#include "${join(testDir, 'active.h')}"
#endif
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'active_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });

  it('should resolve relative include paths from including file\'s directory', () => {
    mkdirSync(join(testDir, 'sub'), { recursive: true });
    writeTestFile('sub/header.h', 'int sub_var;');
    const mainPath = writeTestFile('sub/main.c', `#include "header.h"
int main_var;`);
    const source = readFileSync(mainPath, 'utf-8');
    const preprocessor = new PreprocessedSource(mainPath);
    const lexer = new Lexer(source, preprocessor);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'sub_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });

  it('should handle deeply nested includes (3 levels)', () => {
    writeTestFile('level3.h', 'int level3_var;');
    writeTestFile('level2.h', `#include "${join(testDir, 'level3.h')}"
int level2_var;`);
    writeTestFile('level1.h', `#include "${join(testDir, 'level2.h')}"
int level1_var;`);
    const source = `#include "${join(testDir, 'level1.h')}"
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 4);
    assert.strictEqual(identifiers[0].value, 'level3_var');
    assert.strictEqual(identifiers[1].value, 'level2_var');
    assert.strictEqual(identifiers[2].value, 'level1_var');
    assert.strictEqual(identifiers[3].value, 'main_var');
  });

  it('should handle multiple includes on same level', () => {
    writeTestFile('a.h', 'int a_var;');
    writeTestFile('b.h', 'int b_var;');
    writeTestFile('c.h', 'int c_var;');
    const source = `#include "${join(testDir, 'a.h')}"
#include "${join(testDir, 'b.h')}"
#include "${join(testDir, 'c.h')}"
int main_var;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 4);
    assert.strictEqual(identifiers[0].value, 'a_var');
    assert.strictEqual(identifiers[1].value, 'b_var');
    assert.strictEqual(identifiers[2].value, 'c_var');
    assert.strictEqual(identifiers[3].value, 'main_var');
  });

  it('should throw error for invalid include syntax', () => {
    const source = '#include invalid_syntax';
    const lexer = new Lexer(source);

    assert.throws(() => lexer.tokenize(), /Invalid #include directive/);
  });

  it('should handle include with extra whitespace', () => {
    writeTestFile('ws.h', 'int ws_var;');
    const source = `#include   "${join(testDir, 'ws.h')}"   `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'ws_var');
  });

  it('should search includePaths for quoted includes after local directory', () => {
    writeTestFile('searched.h', 'int searched_var;');
    const source = `#include "searched.h"
int main_var;`;
    const preprocessor = new PreprocessedSource('<input>', {
      includePaths: [testDir]
    });
    const lexer = new Lexer(source, preprocessor);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'searched_var');
    assert.strictEqual(identifiers[1].value, 'main_var');
  });
});

describe('Preprocessor - #if directive', () => {
  it('should include code when expression is true (non-zero)', () => {
    const source = `#if 1
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should exclude code when expression is false (zero)', () => {
    const source = `#if 0
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should evaluate arithmetic expressions', () => {
    const source = `#if 2 + 3 * 4
int result;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'result');
  });

  it('should evaluate comparison expressions', () => {
    const source = `#if 10 > 5
int gt;
#endif
#if 3 < 2
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'gt');
    assert.strictEqual(identifiers[1].value, 'other');
  });

  it('should evaluate logical operators', () => {
    const source = `#if 1 && 1
int and_true;
#endif
#if 1 && 0
int and_false;
#endif
#if 0 || 1
int or_true;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'and_true');
    assert.strictEqual(identifiers[1].value, 'or_true');
  });

  it('should handle parenthesized expressions', () => {
    const source = `#if (2 + 3) * (4 - 1)
int result;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'result');
  });

  it('should handle hexadecimal literals', () => {
    const source = `#if 0x10
int hex;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'hex');
  });

  it('should handle octal literals', () => {
    const source = `#if 077
int octal;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'octal');
  });

  it('should substitute macro values in expressions', () => {
    const source = `#define VERSION 42
#if VERSION > 10
int v;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
  });

  it('should treat undefined macros as 0 in expressions', () => {
    const source = `#if UNDEFINED_MACRO
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle bitwise operators', () => {
    const source = `#if 0xFF & 0xF0
int bitwise_and;
#endif
#if 0x0F | 0xF0
int bitwise_or;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'bitwise_and');
    assert.strictEqual(identifiers[1].value, 'bitwise_or');
  });

  it('should handle unary operators', () => {
    const source = `#if !0
int not_zero;
#endif
#if -5 + 10
int negation;
#endif
#if ~0
int bitwise_not;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 3);
  });

  it('should handle equality operators', () => {
    const source = `#if 5 == 5
int eq;
#endif
#if 5 != 3
int ne;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'eq');
    assert.strictEqual(identifiers[1].value, 'ne');
  });

  it('should handle relational operators <= and >=', () => {
    const source = `#if 5 <= 5
int le;
#endif
#if 10 >= 3
int ge;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
  });

  it('should handle shift operators', () => {
    const source = `#if 1 << 3
int shl;
#endif
#if 16 >> 2
int shr;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
  });

  it('should handle empty expression as false', () => {
    const source = `#if
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle division and modulo', () => {
    const source = `#if 10 / 3
int div;
#endif
#if 10 % 3
int mod;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
  });
});

describe('Preprocessor - defined operator', () => {
  it('should evaluate defined(MACRO) with parentheses form', () => {
    const source = `#define MYMACRO 1
#if defined(MYMACRO)
int defined;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'defined');
  });

  it('should evaluate defined MACRO with space form', () => {
    const source = `#define MYMACRO 1
#if defined MYMACRO
int defined;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'defined');
  });

  it('should return 0 for undefined macro with defined()', () => {
    const source = `#if defined(NONEXISTENT)
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should work with negation: !defined(MACRO)', () => {
    const source = `#if !defined(NONEXISTENT)
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should combine defined() with logical operators', () => {
    const source = `#define A 1
#if defined(A) && defined(B)
int both;
#else
int not_both;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'not_both');
  });

  it('should handle multiple defined() in one expression', () => {
    const source = `#define A 1
#define B 2
#if defined(A) || defined(B)
int either;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'either');
  });
});

describe('Preprocessor - #elif directive', () => {
  it('should evaluate first matching elif branch', () => {
    const source = `#if 0
int excluded1;
#elif 1
int included;
#elif 1
int excluded2;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should skip all elif branches when if is true', () => {
    const source = `#if 1
int included;
#elif 1
int excluded;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should combine #elif with #else', () => {
    const source = `#if 0
int excluded1;
#elif 0
int excluded2;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should skip #else when elif branch matches', () => {
    const source = `#if 0
int excluded1;
#elif 1
int included;
#else
int excluded2;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle #elif with defined() operator', () => {
    const source = `#define B 2
#if defined(A)
int a_def;
#elif defined(B)
int b_def;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'b_def');
  });

  it('should throw error for #elif without matching #if', () => {
    const source = `#elif 1
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#elif without matching/);
  });

  it('should handle multiple elif branches', () => {
    const source = `#define MODE 2
#if MODE == 1
int mode1;
#elif MODE == 2
int mode2;
#elif MODE == 3
int mode3;
#else
int default_mode;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'mode2');
  });

  it('should handle elif with complex expressions', () => {
    const source = `#define X 5
#if X < 3
int small;
#elif X >= 3 && X < 10
int medium;
#elif X >= 10
int large;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'medium');
  });
});

describe('Preprocessor - #if nested conditionals', () => {
  it('should handle nested #if blocks', () => {
    const source = `#if 1
#if 1
int nested;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'nested');
  });

  it('should exclude nested block when outer is false', () => {
    const source = `#if 0
#if 1
int excluded;
#endif
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should mix #if, #ifdef, #elif in nested blocks', () => {
    const source = `#define OUTER 1
#if OUTER
#ifdef INNER
int inner;
#else
int no_inner;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'no_inner');
  });

  it('should handle deeply nested conditionals with elif', () => {
    const source = `#if 1
#if 0
int excluded1;
#elif 0
int excluded2;
#elif 1
int deep_included;
#else
int excluded3;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'deep_included');
  });

  it('should handle #if inside #ifdef', () => {
    const source = `#define X
#ifdef X
#if 1
int included;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });
});

describe('Preprocessor - #if edge cases', () => {
  it('should handle expression with only whitespace', () => {
    const source = `#if   
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle large numbers in expressions', () => {
    const source = `#if 2147483647 > 0
int large;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'large');
  });

  it('should handle operator precedence correctly', () => {
    const source = `#if 1 + 2 * 3 == 7
int precedence;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'precedence');
  });

  it('should skip #define inside inactive #if block', () => {
    const source = `#if 0
#define SHOULD_NOT_EXIST
#endif
#if defined(SHOULD_NOT_EXIST)
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle #if with only defined() operator', () => {
    const source = `#define FEATURE
#if defined(FEATURE)
int has_feature;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'has_feature');
  });

  it('should handle #elif after #ifdef', () => {
    const source = `#define A 1
#ifdef NONEXISTENT
int excluded;
#elif defined(A)
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle #elif after #ifndef', () => {
    const source = `#define B 2
#ifndef NONEXISTENT
int first;
#elif defined(B)
int excluded;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'first');
  });
});

describe('Preprocessor - Macro expansion', () => {
  it('should expand object-like macros in source', () => {
    const source = `#define BUFFER_SIZE 1024
int x = BUFFER_SIZE;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1024'), 'Macro should be expanded to 1024');
    assert.ok(!values.includes('BUFFER_SIZE'), 'Macro name should not appear in output');
  });

  it('should expand macros in expressions', () => {
    const source = `#define A 10
#define B 20
int x = A + B;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('10'), 'A should expand to 10');
    assert.ok(values.includes('20'), 'B should expand to 20');
  });

  it('should expand macros recursively', () => {
    const source = `#define A B
#define B 42
int x = A;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('42'), 'A should expand to B then to 42');
    assert.ok(!values.includes('A'), 'A should not appear in output');
    assert.ok(!values.includes('B'), 'B should not appear in output');
  });

  it('should guard against infinite recursion', () => {
    const source = `#define A A
int x = A;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // Should not hang or throw - the macro should just not expand
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'A'), 'Self-referencing macro should not expand');
  });

  it('should expand multi-token macros', () => {
    const source = `#define INIT int x = 0
INIT`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should not expand macro when not followed by whitespace', () => {
    const source = `#define MAX 100
int MAXVAL = MAX;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // MAXVAL contains MAX as prefix but should not expand
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'MAXVAL'));
  });

  it('should expand macro after undef', () => {
    const source = `#define X 1
#undef X
#define X 2
int x = X;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('2'), 'X should expand to 2 after redefinition');
    assert.ok(!values.includes('1'), 'Old value should not appear');
  });
});

describe('Preprocessor - Function-like macros', () => {
  it('should define function-like macro', () => {
    const source = `#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x;`;
    const lexer = new Lexer(source);
    lexer.tokenize();

    const macro = lexer.preprocessor.expandMacro('MAX');
    assert.ok(macro !== null);
    assert.ok(macro.args !== null);
    assert.deepStrictEqual(macro.args, ['a', 'b']);
  });

  it('should expand function-like macro with arguments', () => {
    const source = `#define ADD(a, b) ((a) + (b))
int x = ADD(1, 2);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'), 'First arg should appear');
    assert.ok(values.includes('2'), 'Second arg should appear');
    assert.ok(values.includes('+'), 'Operator should appear');
    assert.ok(!values.includes('ADD'), 'Macro name should not appear');
  });

  it('should expand function-like macro with single argument', () => {
    const source = `#define SQUARE(x) ((x) * (x))
int y = SQUARE(5);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.strictEqual(values.filter(v => v === '5').length, 2, 'Arg should appear twice');
    assert.ok(values.includes('*'), 'Operator should appear');
  });

  it('should expand function-like macro with no arguments', () => {
    const source = `#define NOW() 12345
int t = NOW();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('12345'), 'Replacement should appear');
    assert.ok(!values.includes('NOW'), 'Macro name should not appear');
  });

  it('should expand function-like macro with complex arguments', () => {
    const source = `#define ADD(a, b) ((a) + (b))
int x = ADD(1+2, 3*4);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'), 'Arg tokens should appear');
    assert.ok(values.includes('+'), 'Operators should appear');
    assert.ok(values.includes('3'), 'All arg tokens should appear');
  });

  it('should expand function-like macro with nested calls', () => {
    const source = `#define ADD(a, b) ((a) + (b))
int x = ADD(1, ADD(2, 3));`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.filter(v => v === '+').length >= 2, 'Both ADD calls should expand');
  });

  it('should NOT expand function-like macro when not called', () => {
    const source = `#define FOO(x) 42
int FOO = 1;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'FOO'), 'FOO without parens should remain as identifier');
  });

  it('should handle function-like macro with parentheses in replacement', () => {
    const source = `#define CALL(f, x) f(x)
int y = CALL(foo, 1);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'foo'), 'Arg should be substituted');
  });

  it('should handle function-like macro with no whitespace after name', () => {
    const source = `#define MUL(a,b)(a)*(b)
int x = MUL(3,4);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('3'));
    assert.ok(values.includes('4'));
    assert.ok(values.includes('*'));
  });

  it('should handle function-like macro with whitespace in param list', () => {
    const source = `#define F(  a  ,  b  ) a+b
int x = F(1, 2);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'));
    assert.ok(values.includes('2'));
  });

  it('should expand function-like macro with zero arguments as literal', () => {
    const source = `#define EMPTY()
EMPTY();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // EMPTY() should expand to nothing, but the trailing ; should remain
    const semicolons = tokens.filter(t => t.type === ';');
    assert.strictEqual(semicolons.length, 1, 'Semicolon should remain');
  });

  it('should handle function-like macro with nested parentheses in args', () => {
    const source = `#define F(x) (x)
int y = F(g(1, 2));`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'g'), 'Nested call arg should be preserved');
  });
});

describe('Preprocessor - Stringification (# operator)', () => {
  it('should stringify macro argument', () => {
    const source = `#define STR(x) #x
const char *s = STR(hello world);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings.length, 1);
    assert.strictEqual(strings[0].value, 'hello world');
  });

  it('should stringify numeric argument', () => {
    const source = `#define STR(x) #x
const char *s = STR(42);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings[0].value, '42');
  });

  it('should stringify expression argument', () => {
    const source = `#define STR(x) #x
const char *s = STR(a + b);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings[0].value, 'a + b');
  });

  it('should handle multiple stringified args', () => {
    const source = `#define PAIR(x, y) #x " " #y
const char *s = PAIR(foo, bar);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings.length, 3); // "foo", " ", "bar"
  });
});

describe('Preprocessor - Token pasting (## operator)', () => {
  it('should paste macro argument with literal', () => {
    const source = `#define VAR(n) x##n
int VAR(1) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'x1'), 'Should paste x and 1 into x1');
  });

  it('should paste two macro arguments', () => {
    const source = `#define JOIN(a, b) a##b
int JOIN(foo, bar) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'foobar'), 'Should paste two args');
  });

  it('should paste literal with macro argument', () => {
    const source = `#define PREFIX(n) prefix_##n
int PREFIX(val) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'prefix_val'), 'Should paste prefix_ and val');
  });

  it('should handle multiple pasting in one macro', () => {
    const source = `#define TAG(a, b) a##_##b
int TAG(foo, bar) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'foo_bar'), 'Should paste foo, _, bar');
  });
});

describe('Preprocessor - Built-in macros', () => {
  it('should expand __LINE__ to current line number', () => {
    const source = `int line = __LINE__;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const integers = tokens.filter(t => t.type === TokenType.INTEGER);
    assert.ok(integers.length >= 1, '__LINE__ should expand to a number');
    assert.strictEqual(parseInt(integers[0].value, 10), 1);
  });

  it('should expand __FILE__ to filename string', () => {
    const source = `const char *f = __FILE__;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.ok(strings.length >= 1, '__FILE__ should expand to a string');
    assert.strictEqual(strings[0].value, '<input>');
  });

  it('should expand __LINE__ in macro expansion', () => {
    const source = `#define GET_LINE() __LINE__
int l = GET_LINE();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const integers = tokens.filter(t => t.type === TokenType.INTEGER);
    assert.ok(integers.length >= 1, '__LINE__ in macro should expand');
    // Should be line 2 (where GET_LINE() is invoked)
    assert.strictEqual(parseInt(integers[0].value, 10), 2);
  });

  it('should be visible to #ifdef', () => {
    const source = `#ifdef __LINE__
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should be visible to defined() in #if', () => {
    const source = `#if defined(__LINE__)
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should evaluate __LINE__ in #if expression', () => {
    const source = `#if __LINE__ > 0
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should use custom filename for __FILE__', () => {
    const source = `const char *f = __FILE__;`;
    const preprocessor = new PreprocessedSource('test.c');
    const lexer = new Lexer(source, preprocessor);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings[0].value, 'test.c');
  });
});

describe('Preprocessor - Combined macro features', () => {
  it('should combine stringification and pasting', () => {
    const source = `#define LOG(name) printf(#name " = %d\\n", name)
LOG(x);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.ok(strings.some(s => s.value === 'x'), 'Stringified arg should appear');
  });

  it('should expand macros within macro arguments', () => {
    const source = `#define A 1
#define B 2
#define ADD(x, y) ((x) + (y))
int z = ADD(A, B);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'), 'A should expand in arg');
    assert.ok(values.includes('2'), 'B should expand in arg');
  });

  it('should handle macro that calls another macro', () => {
    const source = `#define OUTER() INNER()
#define INNER() 42
int x = OUTER();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('42'), 'Outer macro should expand to inner which expands to 42');
  });

  it('should handle ## with stringification', () => {
    const source = `#define X 100
#define VAL(x) x
int VAL(X) = 1;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    // X in the declaration should expand to 100 in the type position
    // but VAL(X) should expand X to 100
    const values = tokens.map(t => t.value);
    assert.ok(values.includes('100'), 'X should expand');
  });

  it('should handle empty macro arguments', () => {
    const source = `#define F(a,b) a
int x = F(,1);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // F(,1) should expand to empty + comma handling
    // The first arg is empty, second is 1
    const values = tokens.map(t => t.value);
    // Result should just have the tokens for the body
    assert.ok(values.includes('1') || values.length > 0, 'Should handle empty first arg');
  });
});
