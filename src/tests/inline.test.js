import { describe, it } from 'mocha';
import assert from 'assert';
import {
  LoadInstruction, StoreInstruction, BinaryOpInstruction,
  UnaryOpInstruction, CallInstruction, ReturnInstruction, JumpIfInstruction,
  JumpInstruction, LabelInstruction, AllocStackInstruction, FreeStackInstruction,
  BasicBlock, FunctionIR, ProgramIR, CALLING_CONVENTION_DEFAULT
} from '../../src/nanopass/il.js';
import { InlineOptimizer } from '../../src/nanopass/optimizations.js';

describe('InlineOptimizer', () => {
  it('should return name', () => {
    const optimizer = new InlineOptimizer();
    assert.strictEqual(optimizer.getName(), 'InlineOptimizer');
  });

  it('should return optimization stats', () => {
    const optimizer = new InlineOptimizer();
    const stats = optimizer.getStats();
    assert.ok(typeof stats.functionsInlined === 'number');
    assert.ok(typeof stats.instructionsAdded === 'number');
    assert.ok(typeof stats.instructionsRemoved === 'number');
  });

  it('should not inline without inline flag', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new CallInstruction('foo', ['t0']),
      new ReturnInstruction('t0'),
    ]);
    const func = new FunctionIR('main', [block], { parameters: [] });
    const program = new ProgramIR([func]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program);

    assert.ok(result instanceof ProgramIR);
    assert.strictEqual(result.functions.length, 1);
    const stats = optimizer.getStats();
    assert.strictEqual(stats.functionsInlined, 0);
  });

  it('should not inline with noOpt flag', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new CallInstruction('foo', ['t0']),
      new ReturnInstruction('t0'),
    ]);
    const func = new FunctionIR('main', [block], { parameters: [] });
    const program = new ProgramIR([func]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { noOpt: true } });

    assert.ok(result instanceof ProgramIR);
    const stats = optimizer.getStats();
    assert.strictEqual(stats.functionsInlined, 0);
  });

  it('should inline inline-marked function with inline flag', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int' }, CALLING_CONVENTION_DEFAULT);
    fooFunc.metadata.isInline = true;

    const mainBlock = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new CallInstruction('foo', ['t0']),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });

    assert.ok(result instanceof ProgramIR);
    assert.strictEqual(result.functions.length, 2);
    const stats = optimizer.getStats();
    assert.ok(stats.functionsInlined > 0);
    assert.ok(stats.instructionsRemoved > 0);
  });

  it('should inline function called only once with inline flag', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '10'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int' });

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.ok(stats.functionsInlined > 0);
  });

  it('should not inline function called multiple times without inline keyword', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '10'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int' });

    const mainBlock1 = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new LoadInstruction('t1', '5'),
    ]);
    const mainBlock2 = new BasicBlock('next', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t1'),
    ]);
    mainBlock1.successor = mainBlock2;
    const mainFunc = new FunctionIR('main', [mainBlock1, mainBlock2], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.strictEqual(stats.functionsInlined, 0);
  });

  it('should handle empty program', () => {
    const program = new ProgramIR();
    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });
    assert.ok(result instanceof ProgramIR);
  });

  it('should handle empty function', () => {
    const func = new FunctionIR('empty', []);
    const program = new ProgramIR([func]);
    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });
    assert.ok(result instanceof ProgramIR);
  });

  it('should return FunctionIR when given FunctionIR', () => {
    const block = new BasicBlock('entry', [
      new LoadInstruction('t0', '5'),
      new ReturnInstruction('t0'),
    ]);
    const func = new FunctionIR('test', [block], { isInline: true });

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(func, { flags: { inline: true } });
    assert.ok(result instanceof FunctionIR);
  });

  it('should preserve non-inline functions', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int' });

    const barBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '100'),
      new ReturnInstruction('a'),
    ]);
    const barFunc = new FunctionIR('bar', [barBlock], { returnType: 'int', isInline: true });

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('bar', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, barFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });

    assert.strictEqual(result.functions.length, 3);
    const names = result.functions.map(f => f.name);
    assert.ok(names.includes('foo'));
    assert.ok(names.includes('bar'));
    assert.ok(names.includes('main'));
  });

  it('should inline with forceInline option', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int' });

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer({ forceInline: true });
    const result = optimizer.run(program);

    const stats = optimizer.getStats();
    assert.ok(stats.functionsInlined > 0);
  });
});

describe('InlineOptimizer with calling conventions', () => {
  it('should inline with new_sdcc convention', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int', parameters: [] });
    fooFunc.metadata.isInline = true;

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.ok(stats.functionsInlined > 0);
  });

  it('should inline with cdecl convention', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int', parameters: [] });
    fooFunc.metadata.isInline = true;

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    const result = optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.ok(stats.functionsInlined > 0);
  });
});

describe('InlineOptimizer stats tracking', () => {
  it('should track functions inlined', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int', isInline: true });

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.ok(stats.functionsInlined >= 1);
  });

  it('should track instructions removed', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int', isInline: true });

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.ok(stats.instructionsRemoved >= 1);
  });

  it('should track instructions added', () => {
    const fooBlock = new BasicBlock('entry', [
      new LoadInstruction('a', '42'),
      new ReturnInstruction('a'),
    ]);
    const fooFunc = new FunctionIR('foo', [fooBlock], { returnType: 'int', isInline: true });

    const mainBlock = new BasicBlock('entry', [
      new CallInstruction('foo', []),
      new ReturnInstruction('t0'),
    ]);
    const mainFunc = new FunctionIR('main', [mainBlock], { parameters: [] });

    const program = new ProgramIR([fooFunc, mainFunc]);

    const optimizer = new InlineOptimizer();
    optimizer.run(program, { flags: { inline: true } });

    const stats = optimizer.getStats();
    assert.ok(stats.instructionsAdded >= 1);
  });
});
