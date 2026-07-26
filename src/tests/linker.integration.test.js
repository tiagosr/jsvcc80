import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectFile, ObjectSection, ObjectSymbol,
  SymbolType, SymbolVisibility, SectionType
} from '../../src/linker/objectfile.js';
import { Linker, LinkerOptions } from '../../src/linker/linker.js';
import {
  FunctionIR, BasicBlock, ProgramIR,
  LoadInstruction, ReturnInstruction
} from '../../src/nanopass/il.js';
import { IrToObjectFile } from '../../src/linker/objectfile.js';

describe('End-to-end: IR to WLA DX', () => {
  it('should compile IR through linker to WLA DX output', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);

    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.strictEqual(result.success, true);

    const output = linker.generateWlaDx();
    assert.ok(output.includes('SECTION'));
    assert.ok(output.includes('OPTION'));
  });
});

describe('Linker crt0 integration', () => {
  it('should include crt0 section by default', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    const hasCrt0 = result.sections.some(s => s.name === '.crt0');
    assert.ok(hasCrt0, 'Link result should include .crt0 section');
  });

  it('should place crt0 at base address', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker(new LinkerOptions({ baseAddress: 0x8000 }));
    linker.addObjectFile(objFile);
    const result = linker.link();

    const crt0Section = result.sections.find(s => s.name === '.crt0');
    assert.ok(crt0Section);
    assert.strictEqual(crt0Section.baseAddress, 0x8000);
  });

  it('should disable crt0 with enableCrt0: false', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker(new LinkerOptions({ enableCrt0: false }));
    linker.addObjectFile(objFile);
    const result = linker.link();

    const hasCrt0 = result.sections.some(s => s.name === '.crt0');
    assert.ok(!hasCrt0, 'Crt0 section should not be present when disabled');
  });

  it('should accept custom stack top through linker options', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker(new LinkerOptions({ stackTop: 0x9900 }));
    linker.addObjectFile(objFile);
    const result = linker.link();

    const crt0Section = result.sections.find(s => s.name === '.crt0');
    assert.ok(crt0Section);
    // ld sp, $9900 = 0x31, 0x00, 0x99
    assert.strictEqual(crt0Section.contents[0], 0x31);
    assert.strictEqual(crt0Section.contents[1], 0x00);
    assert.strictEqual(crt0Section.contents[2], 0x99);
  });

  it('should place user code after crt0', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker(new LinkerOptions({ baseAddress: 0x8000 }));
    linker.addObjectFile(objFile);
    const result = linker.link();

    const crt0Section = result.sections.find(s => s.name === '.crt0');
    const textSection = result.sections.find(s => s.name === '.text');

    assert.ok(crt0Section);
    assert.ok(textSection);
    assert.ok(textSection.baseAddress >= crt0Section.endAddress(), 'User code should be placed after crt0');
  });

  it('should have LinkerOptions with enableCrt0 defaulting to true', () => {
    const options = new LinkerOptions();
    assert.strictEqual(options.enableCrt0, true);
  });

  it('should have LinkerOptions with stackTop defaulting to 0xFFFF', () => {
    const options = new LinkerOptions();
    assert.strictEqual(options.stackTop, 0xFFFF);
  });
});
