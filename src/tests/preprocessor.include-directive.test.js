import { describe, it, beforeEach, afterEach } from 'mocha';
import assert from 'assert';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Lexer, PreprocessedSource } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

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
