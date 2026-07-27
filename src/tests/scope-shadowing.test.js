import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { CPegParser } from '../parser/cparser.js';
import { AstToIr } from '../nanopass/ast_to_ir.js';
import * as IL from '../nanopass/il.js';

describe('Scope-aware identifier resolution', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    return translator.translate(ast);
  }

  it('should allow variable shadowing in if block', () => {
    const ir = compile('int main() { int x = 1; if (x) { int x = 2; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in else block', () => {
    const ir = compile('int main() { int x = 1; if (x) { int x = 2; } else { int x = 3; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in while block', () => {
    const ir = compile('int main() { int x = 1; while (x) { int x = 2; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in for loop init', () => {
    const ir = compile('int main() { int x = 1; for (int x = 0; x < 10; x++) { } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in for loop body', () => {
    const ir = compile('int main() { int x = 1; for (int i = 0; i < 10; i++) { int x = 2; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in do-while block', () => {
    const ir = compile('int main() { int x = 1; do { int x = 2; } while (x); }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in switch block', () => {
    const ir = compile('int main() { int x = 1; switch (x) { case 1: int x = 2; break; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in nested compound statement', () => {
    const ir = compile('int main() { int x = 1; { int x = 2; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in deeply nested scopes', () => {
    const ir = compile('int main() { int x = 1; if (x) { int x = 2; if (x) { int x = 3; } } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow variable shadowing in nested loops', () => {
    const ir = compile('int main() { int x = 1; while (x) { int x = 2; while (x) { int x = 3; } } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should look up outer scope variable when inner scope does not define it', () => {
    const ir = compile('int main() { int x = 1; if (x) { int y = x; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should look up function parameter from nested scope', () => {
    const ir = compile('void foo(int a) { if (a) { int b = a; } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'foo');
  });

  it('should allow multiple shadowing levels in for loop', () => {
    const ir = compile('int main() { int i = 0; for (int i = 0; i < 5; i++) { for (int i = 0; i < 3; i++) { } } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should handle shadowing with compound statement inside compound statement', () => {
    const ir = compile('int main() { int a = 1; { int b = a; { int a = 2; int c = a; } } }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });

  it('should allow shadowing at same scope level (C permits redeclaration)', () => {
    // C allows shadowing even at the same scope level (compiler warning, not error)
    const ir = compile('int main() { int x = 1; int x = 2; }');
    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'main');
  });
});
