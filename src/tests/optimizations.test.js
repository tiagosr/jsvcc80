import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Instruction, LoadInstruction, StoreInstruction, BinaryOpInstruction,
  UnaryOpInstruction, CallInstruction, ReturnInstruction, JumpIfInstruction,
  JumpInstruction, LabelInstruction, AllocStackInstruction, FreeStackInstruction,
  PushInstruction, PopInstruction, BasicBlock, FunctionIR, ProgramIR
} from '../../src/nanopass/il.js';
import { PeepholeOptimizer, RegisterAllocator } from '../../src/nanopass/optimizations.js';

describe('PeepholeOptimizer', () => {
  it('should return name', () => {
    const optimizer = new PeepholeOptimizer();
    assert.strictEqual(optimizer.getName(), 'PeepholeOptimizer');
  });

  it('should optimize ProgramIR', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new LoadInstruction('t1', 't0'),
    ]);
    const func = new FunctionIR('test', [block]);
    const program = new ProgramIR([func]);

    const optimizer = new PeepholeOptimizer();
    const result = optimizer.run(program);

    assert.ok(result instanceof ProgramIR);
    assert.strictEqual(result.functions.length, 1);
  });

  it('should eliminate redundant moves (load x, x)', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new LoadInstruction('t0', 't0'),
      new LoadInstruction('t1', '3'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    assert.strictEqual(block.instructions.length, 2);
    const stats = optimizer.getStats();
    assert.ok(stats.redundantMovesEliminated > 0);
  });

  it('should eliminate redundant stores (store x, x)', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new StoreInstruction('t0', 't0'),
      new StoreInstruction('mem', 't0'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.redundantMovesEliminated > 0);
  });

  it('should fold constant binary operations', () => {
    const block = new BasicBlock('entry', [
      new BinaryOpInstruction('t0', '+', '10', '20'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.constantsFolded > 0);
  });

  it('should fold constant subtraction', () => {
    const block = new BasicBlock('entry', [
      new BinaryOpInstruction('t0', '-', '100', '30'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    assert.strictEqual(block.instructions.length, 1);
    assert.ok(block.instructions[0] instanceof LoadInstruction);
    const stats = optimizer.getStats();
    assert.ok(stats.constantsFolded > 0);
  });

  it('should fold constant unary negation', () => {
    const block = new BasicBlock('entry', [
      new UnaryOpInstruction('t0', 'neg', '42'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    assert.strictEqual(block.instructions.length, 1);
    assert.ok(block.instructions[0] instanceof LoadInstruction);
    const stats = optimizer.getStats();
    assert.ok(stats.constantsFolded > 0);
  });

  it('should fold bitwise operations on constants', () => {
    const block = new BasicBlock('entry', [
      new BinaryOpInstruction('t0', '&', '255', '15'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.constantsFolded > 0);
  });

  it('should fold comparison operations on constants', () => {
    const block = new BasicBlock('entry', [
      new BinaryOpInstruction('t0', 'lt', '5', '10'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.constantsFolded > 0);
  });

  it('should eliminate dead stores', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new StoreInstruction('x', 't0'),
      new LoadInstruction('t1', '10'),
      new StoreInstruction('x', 't1'),
      new LoadInstruction('t2', 'x'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.deadStoresEliminated > 0);
  });

  it('should eliminate redundant jumps to successor', () => {
    const block1 = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new JumpInstruction('next'),
    ]);
    const block2 = new BasicBlock('next', [
      new LoadInstruction('t1', '10'),
    ]);
    block1.successor = block2;

    const func = new FunctionIR('test', [block1, block2]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.redundantJumpsEliminated > 0);
  });

  it('should merge consecutive stack allocations', () => {
    const block = new BasicBlock('entry', [
      new AllocStackInstruction(4),
      new AllocStackInstruction(8),
      new LoadInstruction('t0', '5'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    let allocCount = 0;
    for (const instr of block.instructions) {
      if (instr instanceof AllocStackInstruction) {
        allocCount++;
      }
    }
    assert.strictEqual(allocCount, 1);
  });

  it('should cancel alloc/free pairs', () => {
    const block = new BasicBlock('entry', [
      new AllocStackInstruction(8),
      new FreeStackInstruction(8),
      new LoadInstruction('t0', '5'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    let stackOps = 0;
    for (const instr of block.instructions) {
      if (instr instanceof AllocStackInstruction || instr instanceof FreeStackInstruction) {
        stackOps++;
      }
    }
    assert.strictEqual(stackOps, 0);
  });

  it('should return optimization stats', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', 't0'),
      new BinaryOpInstruction('t1', '+', '1', '2'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(typeof stats.instructionsRemoved === 'number');
    assert.ok(typeof stats.constantsFolded === 'number');
    assert.ok(typeof stats.redundantMovesEliminated === 'number');
    assert.ok(typeof stats.iterations === 'number');
  });

  it('should iterate multiple times until stable', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '10'),
      new LoadInstruction('t1', '20'),
      new BinaryOpInstruction('t2', '+', 't0', 't1'),
      new LoadInstruction('t3', 't2'),
      new LoadInstruction('t3', 't3'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer({ maxIterations: 5 });
    optimizer.run(func);

    const stats = optimizer.getStats();
    assert.ok(stats.iterations >= 1);
  });

  it('should not modify non-constant operations', () => {
    const block = new BasicBlock('entry', [
      new BinaryOpInstruction('t0', '+', 't1', 't2'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    assert.strictEqual(block.instructions.length, 1);
    assert.ok(block.instructions[0] instanceof BinaryOpInstruction);
  });

  it('should handle empty program', () => {
    const program = new ProgramIR();
    const optimizer = new PeepholeOptimizer();
    const result = optimizer.run(program);
    assert.ok(result instanceof ProgramIR);
  });
});

describe('RegisterAllocator', () => {
  it('should return name', () => {
    const allocator = new RegisterAllocator();
    assert.strictEqual(allocator.getName(), 'RegisterAllocator');
  });

  it('should allocate registers for a program', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new LoadInstruction('t1', '10'),
      new BinaryOpInstruction('t2', '+', 't0', 't1'),
    ]);
    const func = new FunctionIR('test', [block]);
    const program = new ProgramIR([func]);

    const allocator = new RegisterAllocator();
    const result = allocator.run(program);

    assert.ok(result instanceof ProgramIR);
    const stats = allocator.getStats();
    assert.ok(stats.registersAllocated > 0);
  });

  it('should replace virtual registers with physical ones', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new LoadInstruction('t1', '10'),
      new BinaryOpInstruction('t2', '+', 't0', 't1'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    for (const instr of block.instructions) {
      for (const operand of instr.operands) {
        assert.ok(!operand.startsWith('t'), `operand ${operand} should not be a virtual register`);
      }
    }
  });

  it('should handle store instructions', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new StoreInstruction('x', 't0'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const storeInstr = block.instructions[1];
    assert.ok(!storeInstr.operands[1].startsWith('t'));
  });

  it('should handle unary operations', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '42'),
      new UnaryOpInstruction('t1', 'neg', 't0'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const stats = allocator.getStats();
    assert.ok(stats.registersAllocated > 0);
  });

  it('should handle return instructions', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '0'),
      new ReturnInstruction('t0'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const retInstr = block.instructions[1];
    assert.ok(!retInstr.operands[0].startsWith('t'));
  });

  it('should handle push instructions', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new PushInstruction('t0'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const pushInstr = block.instructions[1];
    assert.ok(!pushInstr.operands[0].startsWith('t'));
  });

  it('should handle pop instructions', () => {
    const block = new BasicBlock('entry', [
      new PopInstruction('t0'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const popInstr = block.instructions[0];
    assert.ok(!popInstr.operands[0].startsWith('t'));
  });

  it('should handle jump if instructions', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new JumpIfInstruction('eq', 't0', 'target'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const jumpInstr = block.instructions[1];
    assert.ok(!jumpInstr.operands[1].startsWith('t'));
  });

  it('should handle call instructions (clear register state)', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new CallInstruction('foo', ['t0']),
      new LoadInstruction('t1', '10'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const stats = allocator.getStats();
    assert.ok(stats.registersAllocated > 0);
  });

  it('should return allocation stats', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    const stats = allocator.getStats();
    assert.ok(typeof stats.registersAllocated === 'number');
    assert.ok(typeof stats.spills === 'number');
    assert.ok(typeof stats.reloads === 'number');
  });

  it('should handle empty function', () => {
    const func = new FunctionIR('empty', []);
    const allocator = new RegisterAllocator();
    const result = allocator.run(func);
    assert.ok(result instanceof FunctionIR);
  });

  it('should not modify non-virtual registers', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('a', '5'),
      new BinaryOpInstruction('b', '+', 'a', 'c'),
    ]);
    const func = new FunctionIR('test', [block]);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    assert.strictEqual(block.instructions[0].operands[0], 'a');
  });
});

describe('PeepholeOptimizer and RegisterAllocator integration', () => {
  it('should work together on complex IR', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '10'),
      new LoadInstruction('t1', '20'),
      new BinaryOpInstruction('t2', '+', 't0', 't1'),
      new LoadInstruction('t3', 't2'),
      new StoreInstruction('result', 't3'),
    ]);
    const func = new FunctionIR('test', [block]);

    const optimizer = new PeepholeOptimizer();
    optimizer.run(func);

    const allocator = new RegisterAllocator();
    allocator.run(func);

    for (const instr of block.instructions) {
      for (const operand of instr.operands) {
        if (typeof operand === 'string') {
          assert.ok(!operand.startsWith('t'), `virtual register ${operand} should be allocated`);
        }
      }
    }
  });
});
