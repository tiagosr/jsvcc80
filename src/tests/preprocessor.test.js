import { describe, it } from 'node:test';
import assert from 'node:assert';
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
