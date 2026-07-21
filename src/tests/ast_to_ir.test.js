import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Lexer } from '../preprocessor/lexer.js';
import { CPegParser } from '../parser/cparser.js';
import { AstToIr } from '../nanopass/ast_to_ir.js';
import * as IL from '../nanopass/il.js';

describe('AST to IR Translation', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    return translator.translate(ast);
  }

  it('should translate empty program', () => {
    const ir = compile('');
    assert.ok(ir instanceof IL.ProgramIR);
    assert.strictEqual(ir.functions.length, 0);
  });

  it('should translate a simple function', () => {
    const ir = compile('int main() {}');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should translate function with return', () => {
    const ir = compile('int main() { return 42; }');
    const func = ir.functions[0];
    assert.strictEqual(func.name, 'main');
    assert.ok(func.getEntry());
  });

  it('should translate function with variable declaration', () => {
    const ir = compile('int main() { int x = 5; }');
    const func = ir.functions[0];
    assert.ok(func.getEntry());
  });

  it('should translate function with if statement', () => {
    const ir = compile('int main() { if (x) {} }');
    const func = ir.functions[0];
    const blocks = func.blocks;
    assert.ok(blocks.length >= 2);
  });

  it('should translate function with arithmetic expression', () => {
    const ir = compile('int main() { int x = 1 + 2; }');
    const func = ir.functions[0];
    assert.ok(func.getEntry());
  });

  it('should translate global variable', () => {
    const ir = compile('int x = 10;');
    assert.strictEqual(ir.globals.length, 1);
    assert.strictEqual(ir.globals[0].name, 'x');
  });

  it('should translate multiple functions', () => {
    const ir = compile('int foo() {} int bar() {}');
    assert.strictEqual(ir.functions.length, 2);
  });

  it('should produce serializable IR', () => {
    const ir = compile('int main() { return 0; }');
    const json = ir.toJSON();
    assert.ok(json.functions);
    assert.ok(json.globals);
  });
});
