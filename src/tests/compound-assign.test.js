import { describe, it } from 'mocha';
import assert from 'assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import * as AST from '../../src/ast/nodes.js';
import { Compiler, CompilerOptions } from '../../src/compiler.js';

const compoundOps = ['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];

describe('Compound Assignment - Parser', () => {
  for (const op of compoundOps) {
    it(`should parse ${op} as BinaryOpNode`, () => {
      const source = `int main() { int x; x ${op} 3; }`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new CPegParser();
      const ast = parser.parse(tokens);

      assert.strictEqual(ast.type, 'Compound');
      const funcNode = ast.statements[0];
      assert.strictEqual(funcNode.type, 'Function');

      // Find the compound assignment in the function body (ExprStmt with BinaryOp expression)
      let compAssign = null;
      for (const stmt of funcNode.body.statements) {
        if (stmt.type === 'ExprStmt' && stmt.type === 'BinaryOp') {
          compAssign = stmt;
          break;
        }
        if (stmt.type === 'ExprStmt' && stmt.expression?.type === 'BinaryOp') {
          compAssign = stmt.expression;
          break;
        }
        if (stmt.type === 'BinaryOp') {
          compAssign = stmt;
          break;
        }
      }

      assert.ok(compAssign !== null, `Compound assignment ${op} should produce BinaryOpNode`);
      assert.strictEqual(compAssign.type, 'BinaryOp');
      assert.strictEqual(compAssign.op, op);
      assert.ok(compAssign.left instanceof AST.IdentifierNode);
      assert.strictEqual(compAssign.left.name, 'x');
      assert.ok(compAssign.right instanceof AST.LiteralNode);
      assert.strictEqual(compAssign.right.value, 3);
    });
  }

  it(`should parse compound assignment with expression RHS`, () => {
    const source = `int main() { int x; int y; x += y; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.strictEqual(ast.type, 'Compound');
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');

    let compAssign = null;
    for (const stmt of funcNode.body.statements) {
      if (stmt.type === 'ExprStmt' && stmt.expression?.type === 'BinaryOp') {
        compAssign = stmt.expression;
        break;
      }
      if (stmt.type === 'BinaryOp') {
        compAssign = stmt;
        break;
      }
    }

    assert.ok(compAssign !== null);
    assert.strictEqual(compAssign.op, '+=');
    assert.ok(compAssign.left instanceof AST.IdentifierNode);
    assert.strictEqual(compAssign.left.name, 'x');
    assert.ok(compAssign.right instanceof AST.IdentifierNode);
    assert.strictEqual(compAssign.right.name, 'y');
  });

  it(`should parse compound assignment in for loop`, () => {
    const source = `int main() { for (int i = 0; i < 10; i += 1) { } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.strictEqual(ast.type, 'Compound');
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.body.statements[0].type, 'ControlFlow');
  });
});

describe('Compound Assignment - Full Compilation', () => {
  function compileAndCheck(source, expectedPatterns) {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true, `Compilation failed: ${result.errors.join(', ')}`);
    assert.ok(result.code.length > 0, 'Generated code should not be empty');

    for (const pattern of expectedPatterns) {
      assert.ok(result.code.includes(pattern),
        `Assembly should contain "${pattern}" but got:\n${result.code}`);
    }
  }

  it('should compile x += 3 (load, add, store)', () => {
    compileAndCheck(`void main() { int x = 5; x += 3; }`, [
      'ld hl, (x)',   // load x into HL
      'add a, b',     // add 3 (in B) to A
      'ld (x), hl'    // store result back to x
    ]);
  });

  it('should compile x -= 3 (load, sub, store)', () => {
    compileAndCheck(`void main() { int x = 5; x -= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'sub b',        // subtract 3 (in B) from A
      'ld (x), hl'    // store result back to x
    ]);
  });

  it('should compile x *= 3 (load, mul loop, store)', () => {
    compileAndCheck(`void main() { int x = 5; x *= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'mul_loop'      // multiplication loop
    ]);
  });

  it('should compile x /= 3 (load, div loop, store)', () => {
    compileAndCheck(`void main() { int x = 5; x /= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'div_0'         // division loop label
    ]);
  });

  it('should compile x %= 3 (load, mod loop, store)', () => {
    compileAndCheck(`void main() { int x = 5; x %= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'mod_0'         // modulo loop label
    ]);
  });

  it('should compile x &= 3 (load, and, store)', () => {
    compileAndCheck(`void main() { int x = 5; x &= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'and b',        // AND 3 (in B) with A
      'ld (x), hl'    // store result back to x
    ]);
  });

  it('should compile x |= 3 (load, or, store)', () => {
    compileAndCheck(`void main() { int x = 5; x |= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'or b',         // OR 3 (in B) with A
      'ld (x), hl'    // store result back to x
    ]);
  });

  it('should compile x ^= 3 (load, xor, store)', () => {
    compileAndCheck(`void main() { int x = 5; x ^= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'xor b',        // XOR 3 (in B) with A
      'ld (x), hl'    // store result back to x
    ]);
  });

  it('should compile x <<= 3 (load, shl loop, store)', () => {
    compileAndCheck(`void main() { int x = 5; x <<= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'shl_0'         // shift left loop label
    ]);
  });

  it('should compile x >>= 3 (load, shr loop, store)', () => {
    compileAndCheck(`void main() { int x = 5; x >>= 3; }`, [
      'ld hl, (x)',   // load x into HL
      'shr_0'         // shift right loop label
    ]);
  });

  it('should compile chained compound assignments', () => {
    compileAndCheck(`void main() { int x = 1; x += 2; x *= 3; }`, [
      'ld hl, (x)',
      'add a, b',
      'ld (x), hl',
      'mul_loop'
    ]);
  });

  it('should compile compound assignment in loop', () => {
    compileAndCheck(`void main() { int x = 0; while (x < 10) { x += 1; } }`, [
      'ld hl, (x)',
      'add a, c',
      'ld (x), hl'
    ]);
  });
});
