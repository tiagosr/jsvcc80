import { describe, it } from 'mocha';
import assert from 'assert';
import {
  FunctionIR, BasicBlock, ProgramIR,
  LoadInstruction, StoreInstruction, BinaryOpInstruction,
  CallInstruction, ReturnInstruction, JumpInstruction, JumpIfInstruction,
  PushInstruction, PopInstruction, UnaryOpInstruction
} from '../../src/nanopass/il.js';
import { IrToObjectFile } from '../../src/linker/objectfile.js';

describe('IrToObjectFile', () => {
  it('should convert simple function', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.strictEqual(objFile.name, 'test.c');
    assert.ok(objFile.sections.length > 0);
    assert.ok(objFile.symbols.length > 0);
  });

  it('should convert function with call', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new CallInstruction('helper', []));
    block.add(new ReturnInstruction());
    func.addBlock(block);

    const helper = new FunctionIR('helper');
    const helperBlock = new BasicBlock('entry');
    helperBlock.add(new LoadInstruction('a', 1));
    helperBlock.add(new ReturnInstruction('a'));
    helper.addBlock(helperBlock);

    const program = new ProgramIR([func, helper], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.strictEqual(objFile.symbols.length, 2);
    assert.ok(objFile.getSymbol('main') !== null);
    assert.ok(objFile.getSymbol('helper') !== null);
  });

  it('should convert global variables', () => {
    const program = new ProgramIR([], [
      { name: 'counter', type: 'data', value: 0, size: 1 },
      { name: 'buffer', type: 'bss', value: undefined, size: 64 }
    ]);

    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.getSymbol('counter') !== null);
    assert.ok(objFile.getSymbol('buffer') !== null);
  });

  it('should generate relocations for calls', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new CallInstruction('external_func', []));
    block.add(new ReturnInstruction());
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.relocations.length > 0);
  });

  it('should convert binary operations', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 10));
    block.add(new BinaryOpInstruction('a', 'add', 'a', 5));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.sections.length > 0);
    assert.ok(objFile.sections[0].size() > 0);
  });

  it('should convert jump instructions', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new JumpInstruction('loop_end'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.relocations.length > 0);
  });

  it('should convert push/pop instructions', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new PushInstruction('a'));
    block.add(new PopInstruction('b'));
    block.add(new ReturnInstruction());
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.sections[0].size() >= 2);
  });

  it('should convert unary operations', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new UnaryOpInstruction('a', 'neg', 'a'));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.sections[0].size() > 0);
  });
});
