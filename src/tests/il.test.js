import { describe, it } from 'mocha';
import assert from 'assert';
import { 
  Instruction, LoadInstruction, StoreInstruction, BinaryOpInstruction,
  CallInstruction, ReturnInstruction, JumpIfInstruction, JumpInstruction, LabelInstruction,
  BasicBlock, FunctionIR, ProgramIR, SymbolTable
} from '../../src/nanopass/il.js';

describe('IL Instructions', () => {
  it('should create basic instruction', () => {
    const instr = new Instruction('NOP');
    
    assert.strictEqual(instr.opcode, 'NOP');
    assert.strictEqual(instr.operands, null);
  });

  it('should format string representation', () => {
    const instr1 = new LoadInstruction('a', '#42');
    assert.ok(instr1.toString().includes('LOAD'));

    const instr2 = new Instruction('NOP');
    assert.strictEqual(instr2.toString(), 'NOP');
  });

  it('should create load instruction', () => {
    const instr = new LoadInstruction('hl', '#0xFF');
    
    assert.strictEqual(instr.opcode, 'LOAD');
    assert.deepStrictEqual(instr.operands, ['hl', '#0xFF']);
  });

  it('should create store instruction', () => {
    const instr = new StoreInstruction('(0x1000)', 'a');
    
    assert.strictEqual(instr.opcode, 'STORE');
    assert.deepStrictEqual(instr.operands, ['(0x1000)', 'a']);
  });

  it('should create binary operation instruction', () => {
    const instr = new BinaryOpInstruction('a', 'add', 'b', '#5');
    
    assert.strictEqual(instr.opcode, 'BINOP');
    assert.deepStrictEqual(instr.operands, ['a', 'add', 'b', '#5']);
  });

  it('should create call instruction', () => {
    const instr = new CallInstruction('main', ['a', 'b', 'c']);
    
    assert.strictEqual(instr.opcode, 'CALL');
    assert.deepStrictEqual(instr.operands[0], 'main');
    assert.deepStrictEqual(instr.operands.slice(1), ['a', 'b', 'c']);
  });

  it('should create return instruction', () => {
    const instr = new ReturnInstruction('a');
    
    assert.strictEqual(instr.opcode, 'RET');
    assert.deepStrictEqual(instr.operands, ['a']);

    const voidInstr = new ReturnInstruction();
    assert.strictEqual(voidInstr.operands[0], null);
  });

  it('should create jump instructions', () => {
    const conditional = new JumpIfInstruction('eq', 'a', 'label1');
    assert.strictEqual(conditional.opcode, 'JUMP_IF');
    
    const unconditional = new JumpInstruction('main');
    assert.strictEqual(unconditional.opcode, 'JUMP');
  });

  it('should create label instruction', () => {
    const instr = new LabelInstruction('loop_start');
    
    assert.strictEqual(instr.opcode, 'LABEL');
    assert.deepStrictEqual(instr.operands, ['loop_start']);
  });

  it('should serialize to JSON', () => {
    const instr = new BinaryOpInstruction('a', 'sub', 'b', '#10');
    const json = instr.toJSON();
    
    assert.strictEqual(json.opcode, 'BINOP');
    assert.deepStrictEqual(json.operands, ['a', 'sub', 'b', '#10']);
  });
});

describe('BasicBlock', () => {
  it('should create empty basic block', () => {
    const block = new BasicBlock('entry');
    
    assert.strictEqual(block.name, 'entry');
    assert.deepStrictEqual(block.instructions, []);
  });

  it('should add instructions to block', () => {
    const block = new BasicBlock('loop');
    block.add(new LoadInstruction('a', '#1'));
    block.add(new BinaryOpInstruction('b', 'add', 'a', '#1'));
    
    assert.strictEqual(block.instructions.length, 2);
  });

  it('should set successor', () => {
    const block1 = new BasicBlock('entry');
    const block2 = new BasicBlock('loop');
    
    block1.successor = block2;
    assert.strictEqual(block1.successor.name, 'loop');
  });

  it('should format string representation', () => {
    const block = new BasicBlock('entry');
    block.add(new Instruction('NOP'));
    
    const str = block.toString();
    assert.ok(str.includes('entry:'));
    assert.ok(str.includes('NOP'));
  });

  it('should serialize to JSON', () => {
    const block = new BasicBlock('test');
    block.instructions.push(new LabelInstruction('start'));
    
    const json = block.toJSON();
    
    assert.strictEqual(json.name, 'test');
    assert.deepStrictEqual(json.instructions[0].opcode, 'LABEL');
  });
});

describe('FunctionIR', () => {
  it('should create function IR', () => {
    const func = new FunctionIR('main');
    
    assert.strictEqual(func.name, 'main');
    assert.strictEqual(func.blocks.length, 0);
  });

  it('should add basic blocks', () => {
    const func = new FunctionIR('test');
    func.addBlock(new BasicBlock('entry'));
    func.addBlock(new BasicBlock('exit'));
    
    assert.strictEqual(func.blocks.length, 2);
  });

  it('should get entry block', () => {
    const func = new FunctionIR('main');
    const entry = new BasicBlock('entry');
    func.addBlock(entry);
    
    assert.strictEqual(func.getEntry(), entry);
  });

  it('should return null for empty function', () => {
    const func = new FunctionIR('empty');
    assert.strictEqual(func.getEntry(), null);
  });

  it('should format string representation', () => {
    const func = new FunctionIR('main');
    func.addBlock(new BasicBlock('entry'));
    
    const str = func.toString();
    assert.ok(str.includes('function main'));
  });
});

describe('ProgramIR', () => {
  it('should create program IR with functions and globals', () => {
    const func = new FunctionIR('main');
    const program = new ProgramIR([func], [{ name: 'global_var', type: 'data' }]);
    
    assert.strictEqual(program.functions.length, 1);
    assert.strictEqual(program.globals.length, 1);
  });

  it('should add functions', () => {
    const program = new ProgramIR();
    const func1 = new FunctionIR('func1');
    const func2 = new FunctionIR('func2');
    
    program.addFunction(func1);
    program.addFunction(func2);
    
    assert.strictEqual(program.functions.length, 2);
  });

  it('should get function by name', () => {
    const program = new ProgramIR();
    program.addFunction(new FunctionIR('main'));
    program.addFunction(new FunctionIR('helper'));
    
    assert.ok(program.getFunction('main') !== null);
    assert.strictEqual(program.getFunction('nonexistent'), null);
  });

  it('should serialize to JSON', () => {
    const func = new FunctionIR('test');
    const program = new ProgramIR([func], [{ name: 'x' }]);
    
    const json = program.toJSON();
    
    assert.ok(Array.isArray(json.functions));
    assert.deepStrictEqual(json.globals.length, 1);
  });
});

describe('SymbolTable', () => {
  it('should define symbols in scope', () => {
    const table = new SymbolTable();
    
    table.define('x', { name: 'x', kind: 'variable' });
    table.define('y', { name: 'y', kind: 'variable' });
    
    assert.ok(table.hasLocal('x'));
  });

  it('should throw on duplicate definition in same scope', () => {
    const table = new SymbolTable();
    table.define('x', { name: 'x', kind: 'variable' });
    
    let threw = false;
    try {
      table.define('x', { name: 'x', kind: 'function' });
    } catch (error) {
      threw = true;
    }
    
    assert.strictEqual(threw, true);
  });

  it('should look up symbols in parent scopes', () => {
    const parent = new SymbolTable();
    parent.define('x', { name: 'x', kind: 'variable' });
    
    const child = parent.pushScope();
    child.define('y', { name: 'y', kind: 'variable' });
    
    assert.ok(child.lookup('x') !== null); // From parent
    assert.ok(child.lookup('y') !== null); // Local
  });

  it('should create new scopes', () => {
    const table = new SymbolTable();
    const child = table.pushScope();
    
    assert.strictEqual(child.parent, table);
  });

  it('should not allow popping root scope', () => {
    const table = new SymbolTable();
    
    let threw = false;
    try {
      table.popScope();
    } catch (error) {
      threw = true;
    }
    
    assert.strictEqual(threw, true);
  });

  it('should not find undefined symbols', () => {
    const parent = new SymbolTable();
    parent.define('x', { name: 'x' });
    
    const child = parent.pushScope();
    
    assert.strictEqual(child.lookup('undefined'), null);
  });
});
