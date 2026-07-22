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

  // Binary operations with proper operand tracking
  it('should translate binary ops with tracked temp registers', () => {
    const ir = compile('int main() { int x = 1 + 2; }');
    const func = ir.functions[0];
    let foundBinop = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'BINOP') {
          foundBinop = true;
          assert.strictEqual(instr.operands[1], '+');
          assert.ok(instr.operands[2].startsWith('t'), 'left operand should be temp');
          assert.ok(instr.operands[3].startsWith('t'), 'right operand should be temp');
        }
      }
    }
    assert.ok(foundBinop, 'should have a BINOP instruction');
  });

  it('should translate nested binary ops with proper temp tracking', () => {
    const ir = compile('int main() { int x = 1 + 2 * 3; }');
    const func = ir.functions[0];
    let binopCount = 0;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'BINOP') {
          binopCount++;
        }
      }
    }
    assert.strictEqual(binopCount, 2, 'should have two BINOP instructions');
  });

  it('should translate subtraction expression', () => {
    const ir = compile('int main() { int x = 10 - 3; }');
    const func = ir.functions[0];
    let foundSub = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'BINOP' && instr.operands[1] === '-') {
          foundSub = true;
        }
      }
    }
    assert.ok(foundSub, 'should have a subtraction BINOP');
  });

  it('should translate comparison expression', () => {
    const ir = compile('int main() { int x = a < b; }');
    const func = ir.functions[0];
    let foundCmp = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'BINOP' && instr.operands[1] === 'lt') {
          foundCmp = true;
        }
      }
    }
    assert.ok(foundCmp, 'should have a comparison BINOP');
  });

  // Unary operations
  it('should translate unary negation', () => {
    const ir = compile('int main() { int x = -5; }');
    const func = ir.functions[0];
    let foundUnop = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'UNOP') {
          foundUnop = true;
          assert.strictEqual(instr.operands[1], 'neg');
          assert.ok(instr.operands[2].startsWith('t'), 'operand should be temp');
        }
      }
    }
    assert.ok(foundUnop, 'should have a UNOP instruction');
  });

  it('should translate bitwise not', () => {
    const ir = compile('int main() { int x = ~a; }');
    const func = ir.functions[0];
    let foundNot = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'UNOP' && instr.operands[1] === 'not') {
          foundNot = true;
        }
      }
    }
    assert.ok(foundNot, 'should have a bitwise not UNOP');
  });

  // Function calls with arguments
  it('should translate function call with arguments', () => {
    const ir = compile('int main() { foo(1, 2); }');
    const func = ir.functions[0];
    let pushCount = 0;
    let foundCall = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'PUSH') {
          pushCount++;
        }
        if (instr.opcode === 'CALL') {
          foundCall = true;
          assert.strictEqual(instr.operands[0], 'foo');
        }
      }
    }
    assert.strictEqual(pushCount, 2, 'should push 2 arguments');
    assert.ok(foundCall, 'should have a CALL instruction');
  });

  it('should translate nested function call', () => {
    const ir = compile('int main() { foo(bar(1), 2); }');
    const func = ir.functions[0];
    let callCount = 0;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'CALL') {
          callCount++;
        }
      }
    }
    assert.strictEqual(callCount, 2, 'should have 2 CALL instructions');
  });

  // While loops
  it('should translate while loop', () => {
    const ir = compile('int main() { while (x) { y = 1; } }');
    const func = ir.functions[0];
    let foundJumpIf = false;
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP_IF') {
          foundJumpIf = true;
        }
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJumpIf, 'should have conditional jump for condition');
    assert.ok(foundJump, 'should have unconditional jump back to condition');
  });

  it('should translate nested while loops', () => {
    const ir = compile('int main() { while (x) { while (y) { } } }');
    const func = ir.functions[0];
    assert.ok(func.blocks.length >= 4, 'nested loops should produce multiple blocks');
  });

  // Do-while loops
  it('should translate do-while loop', () => {
    const ir = compile('int main() { do { y = 1; } while (x); }');
    const func = ir.functions[0];
    let foundJumpIf = false;
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP_IF') {
          foundJumpIf = true;
        }
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJumpIf, 'should have conditional jump');
    assert.ok(foundJump, 'should have unconditional jump');
  });

  // For loops
  it('should translate for loop', () => {
    const ir = compile('int main() { for (int i = 0; i < 10; i = i + 1) { y = i; } }');
    const func = ir.functions[0];
    let foundJumpIf = false;
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP_IF') {
          foundJumpIf = true;
        }
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJumpIf, 'should have conditional jump');
    assert.ok(foundJump, 'should have unconditional jump');
  });

  it('should translate for loop with empty fields', () => {
    const ir = compile('int main() { for (;;) { y = 1; } }');
    const func = ir.functions[0];
    assert.ok(func.blocks.length >= 2, 'infinite for loop should produce blocks');
  });

  // Break and continue
  it('should translate break statement', () => {
    const ir = compile('int main() { while (1) { break; } }');
    const func = ir.functions[0];
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJump, 'break should produce a JUMP');
  });

  it('should translate continue statement', () => {
    const ir = compile('int main() { while (1) { continue; } }');
    const func = ir.functions[0];
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJump, 'continue should produce a JUMP');
  });

  // Switch/case
  it('should translate switch statement', () => {
    const ir = compile('int main() { switch (x) { case 1: y = 1; break; } }');
    const func = ir.functions[0];
    assert.ok(func.blocks.length >= 3, 'switch should produce multiple blocks');
  });

  it('should translate switch with default', () => {
    const ir = compile('int main() { switch (x) { case 1: y = 1; default: y = 2; } }');
    const func = ir.functions[0];
    assert.ok(func.blocks.length >= 3, 'switch with default should produce blocks');
  });

  it('should translate switch with multiple cases', () => {
    const ir = compile('int main() { switch (x) { case 1: y = 1; break; case 2: y = 2; break; } }');
    const func = ir.functions[0];
    assert.ok(func.blocks.length >= 4, 'switch with multiple cases should produce blocks');
  });

  // Goto and labels
  it('should translate goto statement', () => {
    const ir = compile('int main() { goto end; end: y = 1; }');
    const func = ir.functions[0];
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJump, 'goto should produce a JUMP');
  });

  it('should translate labeled statement', () => {
    const ir = compile('int main() { label: y = 1; }');
    const func = ir.functions[0];
    const hasLabel = func.blocks.some(b => b.name === 'label');
    assert.ok(hasLabel, 'should have a block named "label"');
  });

  // Assignment
  it('should translate assignment expression', () => {
    const ir = compile('int main() { int x; x = 5; }');
    const func = ir.functions[0];
    let foundStore = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'STORE') {
          foundStore = true;
          assert.strictEqual(instr.operands[0], 'x');
        }
      }
    }
    assert.ok(foundStore, 'should have a STORE instruction');
  });

  // Complex expressions
  it('should translate complex nested expression', () => {
    const ir = compile('int main() { int x = (1 + 2) * (3 - 4); }');
    const func = ir.functions[0];
    let binopCount = 0;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'BINOP') {
          binopCount++;
        }
      }
    }
    assert.strictEqual(binopCount, 3, 'should have 3 BINOP instructions');
  });

  it('should translate if-else with complex condition', () => {
    const ir = compile('int main() { if (a + b > 0) { x = 1; } else { x = 2; } }');
    const func = ir.functions[0];
    let foundJumpIf = false;
    let foundJump = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'JUMP_IF') {
          foundJumpIf = true;
        }
        if (instr.opcode === 'JUMP') {
          foundJump = true;
        }
      }
    }
    assert.ok(foundJumpIf, 'should have conditional jump');
    assert.ok(foundJump, 'should have unconditional jump past else');
  });
});
