import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';

describe('Function Pointer Parsing', () => {
  it('should parse global function pointer declaration', () => {
    const source = `int (*fp)(int);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse local function pointer declaration', () => {
    const source = `int main() { int (*fp)(int); }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse function pointer with multiple parameters', () => {
    const source = `int (*fp)(int, char);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse function pointer with void parameter', () => {
    const source = `void (*fp)(void);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse function pointer with initialization', () => {
    const source = `int main() { int (*fp)(int) = func; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse function pointer parameter in function definition', () => {
    const source = `int caller(int (*fp)(int), int x) { return fp(x); }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse nested function pointer (pointer to function returning function pointer)', () => {
    const source = `int (*(*fp)(int))(int);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });

  it('should parse function pointer array', () => {
    const source = `int (*fp[3])(int);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast);
  });
});
