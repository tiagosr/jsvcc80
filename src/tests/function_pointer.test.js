import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';
import { Z80Codegen } from '../../src/backend/z80codegen.js';

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

describe('Function Pointer - Z80 Code Generation', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);
    const codegen = new Z80Codegen();
    return codegen.generate(ir);
  }

  it('should generate CALL_INDIRECT for function pointer call', () => {
    const code = compile(`
      int myfunc(int x) { return x + 1; }
      int main() {
        int (*fp)(int) = myfunc;
        return fp(5);
      }
    `);
    // Should have a function pointer call (funcptrcall label)
    assert.ok(code.includes('funcptrcall_'), 'Should have function pointer call block');
    // Should call through HL (indirect call)
    assert.ok(code.includes('call hl'), 'Should call through function pointer');
  });

  it('should generate correct code for function pointer with arguments', () => {
    const code = compile(`
      int add(int a, int b) { return a + b; }
      int main() {
        int (*fp)(int, int) = add;
        return fp(1, 2);
      }
    `);
    // Should push arguments onto stack
    assert.ok(code.includes('push af'), 'Should push arguments');
    // Should call through function pointer
    assert.ok(code.includes('call hl'), 'Should call through function pointer');
  });
});
