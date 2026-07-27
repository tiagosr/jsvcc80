import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';
import {
  serializeObjectFile, deserializeObjectFile
} from '../../src/linker/objectfile_loader.js';
import {
  ObjectFileDisassembler, ObjectFileDisassembly, SectionDisassembly,
  disassembleObjectFile
} from '../../src/disassembler/objectfile_disassembler.js';
import {
  BinaryDisassembler, BinaryDisassembly, BinarySection,
  disassembleBinary, disassembleBinaryFromFile, bytesToHex
} from '../../src/disassembler/binary_disassembler.js';
import { Z80Instruction } from '../../src/disassembler/z80disassembler.js';

describe('ObjectFileDisassembler - code section', () => {
  it('should disassemble RET instruction (0xC9)', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'RET');
    assert.strictEqual(textSection.instructions[0].length, 1);
    assert.strictEqual(textSection.instructions[0].opcode, 0xC9);
  });

  it('should verify address is correct for code section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile, { baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.baseAddress, 0x1000);
    assert.strictEqual(textSection.instructions[0].address, 0x1000);
  });

  it('should disassemble LD BC,nn instruction (0x01, 0x34, 0x12)', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x01);
    section.appendByte(0x34);
    section.appendByte(0x12);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'LD BC,nn');
    assert.strictEqual(textSection.instructions[0].length, 3);
  });

  it('should verify operands contain correct values for LD BC,nn', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x01);
    section.appendByte(0x34);
    section.appendByte(0x12);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions[0].operands.length, 1);
    assert.strictEqual(textSection.instructions[0].operands[0], '$1234');
  });

  it('should verify bytes array matches original for LD BC,nn', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x01);
    section.appendByte(0x34);
    section.appendByte(0x12);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions[0].bytes.length, 3);
    assert.strictEqual(textSection.instructions[0].bytes[0], 0x01);
    assert.strictEqual(textSection.instructions[0].bytes[1], 0x34);
    assert.strictEqual(textSection.instructions[0].bytes[2], 0x12);
  });

  it('should disassemble multiple instructions in sequence', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 2);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'NOP');
    assert.strictEqual(textSection.instructions[0].address, 0x0000);
    assert.strictEqual(textSection.instructions[1].mnemonic, 'RET');
    assert.strictEqual(textSection.instructions[1].address, 0x0001);
  });

  it('should disassemble LD A,n instruction', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'LD A,n');
    assert.strictEqual(textSection.instructions[0].length, 2);
    assert.strictEqual(textSection.instructions[0].operands[0], '$42');
  });

  it('should disassemble CALL nn instruction', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendByte(0x00);
    section.appendByte(0x10);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'CALL nn');
    assert.strictEqual(textSection.instructions[0].length, 3);
    assert.strictEqual(textSection.instructions[0].operands[0], '$1000');
  });

  it('should disassemble PUSH/POP instructions', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xF5);
    section.appendByte(0xF1);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 2);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'PUSH AF');
    assert.strictEqual(textSection.instructions[0].length, 1);
    assert.strictEqual(textSection.instructions[1].mnemonic, 'POP AF');
    assert.strictEqual(textSection.instructions[1].length, 1);
  });

  it('should disassemble JR instruction with offset', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x18);
    section.appendByte(0x05);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'JR e');
    assert.strictEqual(textSection.instructions[0].length, 2);
    assert.strictEqual(textSection.instructions[0].operands[0], '$05');
  });

  it('should disassemble CB-prefixed RLC instruction', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCB);
    section.appendByte(0x07);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'RLC A');
    assert.strictEqual(textSection.instructions[0].length, 2);
    assert.strictEqual(textSection.instructions[0].operands[0], 'A');
  });

  it('should disassemble ED-prefixed LDIR instruction', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xED);
    section.appendByte(0xB0);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 1);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'LDIR');
    assert.strictEqual(textSection.instructions[0].length, 2);
  });
});

describe('ObjectFileDisassembler - data section', () => {
  it('should treat data section bytes as data not instructions', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.data', SectionType.DATA);
    section.contents = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const dataSection = disassembly.sections.get('.data');

    assert.strictEqual(dataSection.instructions.length, 0);
    assert.strictEqual(dataSection.type, 'data');
  });

  it('should verify dataBytes field contains raw bytes', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.data', SectionType.DATA);
    section.contents = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const dataSection = disassembly.sections.get('.data');

    assert.strictEqual(dataSection.dataBytes.length, 4);
    assert.strictEqual(dataSection.dataBytes[0], 0x00);
    assert.strictEqual(dataSection.dataBytes[1], 0x01);
    assert.strictEqual(dataSection.dataBytes[2], 0x02);
    assert.strictEqual(dataSection.dataBytes[3], 0x03);
  });

  it('should verify toString() outputs .db directives for data section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.data', SectionType.DATA);
    section.contents = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('.db'));
  });

  it('should handle bss section with .ds directive', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.bss', SectionType.BSS);
    section.contents = new Uint8Array(10);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('.ds'));
    assert.ok(output.includes('10'));
  });

  it('should handle empty data section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.data', SectionType.DATA);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const dataSection = disassembly.sections.get('.data');

    assert.strictEqual(dataSection.dataBytes.length, 0);
    assert.strictEqual(dataSection.instructions.length, 0);
  });
});

describe('ObjectFileDisassembly class', () => {
  it('toJSON() returns correct structure with sections, symbols, relocations', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const json = disassembly.toJSON();

    assert.strictEqual(json.objectFileName, 'test.o');
    assert.ok(json.sections);
    assert.ok(json.sections['.text']);
    assert.ok(json.symbols);
    assert.strictEqual(json.symbols.length, 1);
    assert.ok(json.relocations);
  });

  it('toString() returns formatted output with section headers', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('Object File: test.o'));
    assert.ok(output.includes('Section: .text'));
  });

  it('sections Map contains correct entries', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.sections.size, 1);
    assert.strictEqual(disassembly.sections.has('.text'), true);
    assert.ok(disassembly.sections.get('.text') instanceof SectionDisassembly);
  });

  it('symbols array matches object file symbols', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.LOCAL, 5, '.text'));

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.symbols.length, 2);
    assert.strictEqual(disassembly.symbols[0].name, 'main');
    assert.strictEqual(disassembly.symbols[1].name, 'helper');
  });

  it('relocations array matches object file relocations', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendByte(0x00);
    section.appendByte(0x00);
    objFile.addSection(section);
    objFile.addRelocation(new ObjectRelocation(1, 'main', RelocationType.CALL, '.text'));

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.relocations.length, 1);
    assert.strictEqual(disassembly.relocations[0].symbolName, 'main');
    assert.strictEqual(disassembly.relocations[0].type, 'call');
  });

  it('clearSymbolMap() clears cached symbol map', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();

    disassembly._symbolMap;
    disassembly.clearSymbolMap();
    assert.strictEqual(disassembly._cachedSymbolMap, null);
  });
});

describe('SectionDisassembly class', () => {
  it('toJSON() returns correct structure', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    const sectionDisassembly = new SectionDisassembly('.text', 'code', 0x0000);
    sectionDisassembly.instructions = [new Z80Instruction(0xC9, 'RET', [], [0xC9], 1, 0x0000)];

    const json = sectionDisassembly.toJSON();

    assert.strictEqual(json.name, '.text');
    assert.strictEqual(json.type, 'code');
    assert.strictEqual(json.baseAddress, 0x0000);
    assert.strictEqual(json.instructions.length, 1);
    assert.strictEqual(json.dataBytes.length, 0);
    assert.strictEqual(json.relocations.length, 0);
  });

  it('toString() returns formatted section output', () => {
    const sectionDisassembly = new SectionDisassembly('.text', 'code', 0x1000);
    sectionDisassembly.instructions = [new Z80Instruction(0xC9, 'RET', [], [0xC9], 1, 0x1000)];

    const output = sectionDisassembly.toString();

    assert.ok(output.includes('Section: .text'));
    assert.ok(output.includes('code'));
    assert.ok(output.includes('$1000'));
    assert.ok(output.includes('RET'));
  });

  it('instructions array contains Z80Instruction objects', () => {
    const sectionDisassembly = new SectionDisassembly('.text', 'code', 0x0000);
    const instr = new Z80Instruction(0x01, 'LD BC,nn', ['$1234'], [0x01, 0x34, 0x12], 3, 0x0000);
    sectionDisassembly.instructions = [instr];

    assert.strictEqual(sectionDisassembly.instructions.length, 1);
    assert.ok(sectionDisassembly.instructions[0] instanceof Z80Instruction);
    assert.strictEqual(sectionDisassembly.instructions[0].mnemonic, 'LD BC,nn');
  });

  it('relocations array matches input', () => {
    const sectionDisassembly = new SectionDisassembly('.text', 'code', 0x0000);
    const reloc = new ObjectRelocation(1, 'main', RelocationType.CALL, '.text');
    sectionDisassembly.relocations = [reloc];

    assert.strictEqual(sectionDisassembly.relocations.length, 1);
    assert.strictEqual(sectionDisassembly.relocations[0].offset, 1);
    assert.strictEqual(sectionDisassembly.relocations[0].symbolName, 'main');
  });

  it('dataBytes field for data sections', () => {
    const sectionDisassembly = new SectionDisassembly('.data', 'data', 0x2000);
    sectionDisassembly.dataBytes = new Uint8Array([0x42, 0x00]);

    assert.strictEqual(sectionDisassembly.dataBytes.length, 2);
    assert.strictEqual(sectionDisassembly.dataBytes[0], 0x42);
    assert.strictEqual(sectionDisassembly.dataBytes[1], 0x00);
  });

  it('toString() for data section outputs .db directives', () => {
    const sectionDisassembly = new SectionDisassembly('.data', 'data', 0x2000);
    sectionDisassembly.dataBytes = new Uint8Array([0x42, 0x00]);

    const output = sectionDisassembly.toString();

    assert.ok(output.includes('.db'));
    assert.ok(output.includes('$42'));
    assert.ok(output.includes('$00'));
  });
});

describe('Symbol resolution in object file disassembly', () => {
  it('section name symbol resolved at base address', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('.text', SymbolType.SECTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const disassembler = new ObjectFileDisassembler(objFile, { baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('.text'));
  });

  it('symbol at section base address is resolved', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('.text', SymbolType.SECTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const disassembler = new ObjectFileDisassembler(objFile, { baseAddress: 0x0000 });
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.baseAddress, 0x0000);
    assert.strictEqual(textSection.instructions[0].address, 0x0000);
  });

  it('unresolved symbols still show as hex in disassembly', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendByte(0x55);
    section.appendByte(0x66);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile);
    const disassembly = disassembler.disassemble();
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions[0].operands[0], '$6655');
  });

  it('symbolMap correctly maps section names to addresses via disassembly', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembler = new ObjectFileDisassembler(objFile, { baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();
    const symbolMap = disassembly._symbolMap;

    assert.strictEqual(symbolMap.has('.text'), true);
    assert.strictEqual(symbolMap.get('.text'), 0x1000);
  });

  it('section symbol gets its base address via disassembly', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('.text', SymbolType.SECTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const disassembler = new ObjectFileDisassembler(objFile, { baseAddress: 0x2000 });
    const disassembly = disassembler.disassemble();
    const symbolMap = disassembly._symbolMap;

    assert.strictEqual(symbolMap.get('.text'), 0x2000);
  });

  it('multiple sections mapped in symbolMap', () => {
    const objFile = new ObjectFile('test.o');
    const textSection = new ObjectSection('.text', SectionType.CODE);
    textSection.appendByte(0xC9);
    objFile.addSection(textSection);
    const dataSection = new ObjectSection('.data', SectionType.DATA);
    dataSection.contents = new Uint8Array([0x42]);
    objFile.addSection(dataSection);

    const disassembler = new ObjectFileDisassembler(objFile, { baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();
    const symbolMap = disassembly._symbolMap;

    assert.strictEqual(symbolMap.get('.text'), 0x1000);
    assert.strictEqual(symbolMap.get('.data'), 0x1001);
  });
});

describe('DisassembleObjectFile helper', () => {
  it('convenience function works correctly', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembly = disassembleObjectFile(objFile);

    assert.ok(disassembly instanceof ObjectFileDisassembly);
    assert.strictEqual(disassembly.sections.size, 1);
  });

  it('returns ObjectFileDisassembly', () => {
    const objFile = new ObjectFile('test.o');
    const disassembly = disassembleObjectFile(objFile);

    assert.ok(disassembly instanceof ObjectFileDisassembly);
  });

  it('baseAddress option is respected', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembly = disassembleObjectFile(objFile, { baseAddress: 0x5000 });
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.baseAddress, 0x5000);
    assert.strictEqual(textSection.instructions[0].address, 0x5000);
  });

  it('verbose option is respected', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembly = disassembleObjectFile(objFile, { verbose: true });
    const output = disassembly.toString();

    assert.ok(output.includes('Section: .text'));
  });

  it('default options use baseAddress 0x0000 and verbose false', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const disassembly = disassembleObjectFile(objFile);
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.baseAddress, 0x0000);
  });

  it('handles object file with no sections', () => {
    const objFile = new ObjectFile('empty.o');

    const disassembly = disassembleObjectFile(objFile);

    assert.ok(disassembly instanceof ObjectFileDisassembly);
    assert.strictEqual(disassembly.sections.size, 0);
    assert.strictEqual(disassembly.symbols.length, 0);
  });
});

describe('BinaryDisassembler - basic', () => {
  it('disassemble bytes [0x00, 0xC9] to NOP, RET', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 2);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'NOP');
    assert.strictEqual(disassembly.instructions[1].mnemonic, 'RET');
  });

  it('addresses start at baseAddress', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes, { baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions[0].address, 0x1000);
    assert.strictEqual(disassembly.instructions[1].address, 0x1001);
  });

  it('instruction lengths are correct for NOP', () => {
    const bytes = new Uint8Array([0x00]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions[0].length, 1);
  });

  it('instruction lengths are correct for RET', () => {
    const bytes = new Uint8Array([0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions[0].length, 1);
  });

  it('disassemble LD BC,nn bytes [0x01, 0x34, 0x12]', () => {
    const bytes = new Uint8Array([0x01, 0x34, 0x12]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 1);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'LD BC,nn');
    assert.strictEqual(disassembly.instructions[0].length, 3);
  });

  it('verify mnemonic and operands for LD BC,nn', () => {
    const bytes = new Uint8Array([0x01, 0x34, 0x12]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions[0].mnemonic, 'LD BC,nn');
    assert.strictEqual(disassembly.instructions[0].operands[0], '$1234');
  });

  it('empty bytes returns empty instructions array', () => {
    const bytes = new Uint8Array(0);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 0);
    assert.strictEqual(disassembly.totalSize, 0);
  });

  it('disassemble multiple different instruction types', () => {
    const bytes = new Uint8Array([0x3E, 0x42, 0x77, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 3);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'LD A,n');
    assert.strictEqual(disassembly.instructions[1].mnemonic, 'LD (HL),A');
    assert.strictEqual(disassembly.instructions[2].mnemonic, 'RET');
  });

  it('disassemble CALL instruction', () => {
    const bytes = new Uint8Array([0xCD, 0x00, 0x10]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 1);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'CALL nn');
    assert.strictEqual(disassembly.instructions[0].operands[0], '$1000');
  });

  it('disassemble INC/DEC instructions', () => {
    const bytes = new Uint8Array([0x3C, 0x3D, 0x04, 0x05]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 4);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'INC A');
    assert.strictEqual(disassembly.instructions[1].mnemonic, 'DEC A');
    assert.strictEqual(disassembly.instructions[2].mnemonic, 'INC B');
    assert.strictEqual(disassembly.instructions[3].mnemonic, 'DEC B');
  });

  it('disassemble ADD/SUB instructions', () => {
    const bytes = new Uint8Array([0x87, 0x97, 0x81, 0x91]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 4);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'ADD A,A');
    assert.strictEqual(disassembly.instructions[1].mnemonic, 'SUB A,A');
    assert.strictEqual(disassembly.instructions[2].mnemonic, 'ADD A,C');
    assert.strictEqual(disassembly.instructions[3].mnemonic, 'SUB A,C');
  });

  it('disassemble XOR instruction', () => {
    const bytes = new Uint8Array([0xAF]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 1);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'XOR A');
  });
});

describe('BinaryDisassembler - range', () => {
  it('disassembleRange disassembles only specified range', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const instructions = disassembler.disassembleRange(0x0001, 0x0003);

    assert.strictEqual(instructions.length, 2);
    assert.strictEqual(instructions[0].mnemonic, 'RET');
    assert.strictEqual(instructions[1].mnemonic, 'NOP');
  });

  it('addresses are relative to baseAddress', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x00]);
    const disassembler = new BinaryDisassembler(bytes, { baseAddress: 0x5000 });
    const instructions = disassembler.disassembleRange(0x5001, 0x5002);

    assert.strictEqual(instructions.length, 1);
    assert.strictEqual(instructions[0].address, 0x5001);
  });

  it('range boundaries are respected at start', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x00]);
    const disassembler = new BinaryDisassembler(bytes);
    const instructions = disassembler.disassembleRange(0x0002, 0x0004);

    assert.strictEqual(instructions.length, 1);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[0].address, 0x0002);
  });

  it('range boundaries are respected at end', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x00]);
    const disassembler = new BinaryDisassembler(bytes);
    const instructions = disassembler.disassembleRange(0x0000, 0x0001);

    assert.strictEqual(instructions.length, 1);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
  });

  it('range beyond bytes length returns empty', () => {
    const bytes = new Uint8Array([0x00]);
    const disassembler = new BinaryDisassembler(bytes);
    const instructions = disassembler.disassembleRange(0x0005, 0x0010);

    assert.strictEqual(instructions.length, 0);
  });

  it('range with single byte instruction', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x00]);
    const disassembler = new BinaryDisassembler(bytes);
    const instructions = disassembler.disassembleRange(0x0001, 0x0002);

    assert.strictEqual(instructions.length, 1);
    assert.strictEqual(instructions[0].mnemonic, 'RET');
    assert.strictEqual(instructions[0].length, 1);
  });
});

describe('BinaryDisassembler - single instruction', () => {
  it('disassembleAt returns single instruction', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x3E]);
    const disassembler = new BinaryDisassembler(bytes);
    const instruction = disassembler.disassembleAt(0x0001);

    assert.ok(instruction instanceof Z80Instruction);
    assert.strictEqual(instruction.mnemonic, 'RET');
  });

  it('address must be within bounds', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const instruction = disassembler.disassembleAt(0x0010);

    assert.strictEqual(instruction, null);
  });

  it('returns Z80Instruction with correct address', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes, { baseAddress: 0x2000 });
    const instruction = disassembler.disassembleAt(0x2001);

    assert.ok(instruction instanceof Z80Instruction);
    assert.strictEqual(instruction.address, 0x2001);
    assert.strictEqual(instruction.mnemonic, 'RET');
  });

  it('disassembleAt with CB-prefixed instruction', () => {
    const bytes = new Uint8Array([0x00, 0xCB, 0x07]);
    const disassembler = new BinaryDisassembler(bytes);
    const instruction = disassembler.disassembleAt(0x0001);

    assert.ok(instruction instanceof Z80Instruction);
    assert.strictEqual(instruction.mnemonic, 'RLC A');
    assert.strictEqual(instruction.length, 2);
  });
});

describe('BinaryDisassembly class', () => {
  it('toJSON() returns correct structure', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();
    const json = disassembly.toJSON();

    assert.strictEqual(json.baseAddress, 0x0000);
    assert.strictEqual(json.totalSize, 2);
    assert.strictEqual(json.verbose, false);
    assert.strictEqual(json.instructions.length, 2);
    assert.ok(json.sections);
    assert.ok(json.symbols);
  });

  it('toString() returns formatted output with address prefixes', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('Binary Disassembly'));
    assert.ok(output.includes('$0000'));
    assert.ok(output.includes('NOP'));
    assert.ok(output.includes('$0001'));
    assert.ok(output.includes('RET'));
  });

  it('baseAddress field is set correctly', () => {
    const bytes = new Uint8Array([0x00]);
    const disassembler = new BinaryDisassembler(bytes, { baseAddress: 0x3000 });
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.baseAddress, 0x3000);
  });

  it('totalSize matches input bytes length', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x3E, 0x42]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.totalSize, 4);
  });

  it('instructions array is populated', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x3E, 0x42]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 3);
    assert.ok(disassembly.instructions[0] instanceof Z80Instruction);
    assert.ok(disassembly.instructions[1] instanceof Z80Instruction);
    assert.ok(disassembly.instructions[2] instanceof Z80Instruction);
  });

  it('symbols field is populated from constructor', () => {
    const symbols = new Map([['main', 0x1000]]);
    const bytes = new Uint8Array([0x00]);
    const disassembler = new BinaryDisassembler(bytes, { symbols });
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.symbols.size, 1);
    assert.strictEqual(disassembly.symbols.get('main'), 0x1000);
  });
});

describe('BinarySection class', () => {
  it('constructor sets correct fields', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const section = new BinarySection('.text', 0x1000, 0x1002, bytes);

    assert.strictEqual(section.name, '.text');
    assert.strictEqual(section.startAddress, 0x1000);
    assert.strictEqual(section.endAddress, 0x1002);
    assert.strictEqual(section.bytes.length, 2);
  });

  it('size() returns correct value', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x3E]);
    const section = new BinarySection('.text', 0x1000, 0x1003, bytes);

    assert.strictEqual(section.size(), 3);
  });

  it('toJSON() returns correct structure', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const section = new BinarySection('.text', 0x1000, 0x1002, bytes);
    const json = section.toJSON();

    assert.strictEqual(json.name, '.text');
    assert.strictEqual(json.startAddress, 0x1000);
    assert.strictEqual(json.endAddress, 0x1002);
    assert.strictEqual(json.size, 2);
    assert.strictEqual(json.bytes.length, 2);
    assert.strictEqual(json.bytes[0], 0x00);
    assert.strictEqual(json.bytes[1], 0xC9);
  });

  it('bytes field matches input', () => {
    const bytes = new Uint8Array([0x42, 0x00, 0xFF]);
    const section = new BinarySection('.data', 0x2000, 0x2003, bytes);

    assert.strictEqual(section.bytes.length, 3);
    assert.strictEqual(section.bytes[0], 0x42);
    assert.strictEqual(section.bytes[1], 0x00);
    assert.strictEqual(section.bytes[2], 0xFF);
  });

  it('handles zero-length section', () => {
    const bytes = new Uint8Array(0);
    const section = new BinarySection('.bss', 0x3000, 0x3000, bytes);

    assert.strictEqual(section.size(), 0);
    assert.strictEqual(section.bytes.length, 0);
  });
});

describe('bytesToHex helper', () => {
  it('converts bytes to hex string', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x3E]);
    const hex = bytesToHex(bytes);

    assert.strictEqual(hex, '00 c9 3e');
  });

  it('each byte is two hex characters', () => {
    const bytes = new Uint8Array([0xFF, 0x01, 0xAB]);
    const hex = bytesToHex(bytes);

    assert.strictEqual(hex, 'ff 01 ab');
  });

  it('spaces between bytes', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03]);
    const hex = bytesToHex(bytes);

    assert.strictEqual(hex, '01 02 03');
    assert.strictEqual(hex.split(' ').length, 3);
  });

  it('empty bytes returns empty string', () => {
    const bytes = new Uint8Array(0);
    const hex = bytesToHex(bytes);

    assert.strictEqual(hex, '');
  });
});

describe('Object file round-trip', () => {
  it('create ObjectFile → serialize → deserialize → disassemble', () => {
    const objFile = new ObjectFile('roundtrip.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);
    const disassembly = disassembleObjectFile(loaded);

    assert.ok(disassembly instanceof ObjectFileDisassembly);
    assert.strictEqual(disassembly.sections.size, 1);
  });

  it('verify disassembled instructions match original bytes', () => {
    const objFile = new ObjectFile('roundtrip.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);
    const disassembly = disassembleObjectFile(loaded);
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions.length, 2);
    assert.strictEqual(textSection.instructions[0].mnemonic, 'LD A,n');
    assert.strictEqual(textSection.instructions[1].mnemonic, 'RET');
  });

  it('verify symbols are preserved', () => {
    const objFile = new ObjectFile('roundtrip.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);
    const disassembly = disassembleObjectFile(loaded);

    assert.strictEqual(disassembly.symbols.length, 1);
    assert.strictEqual(disassembly.symbols[0].name, 'main');
    assert.strictEqual(disassembly.symbols[0].type, 'function');
    assert.strictEqual(disassembly.symbols[0].visibility, 'global');
  });

  it('verify relocations are preserved in section disassembly', () => {
    const objFile = new ObjectFile('roundtrip.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendByte(0x00);
    section.appendByte(0x00);
    objFile.addSection(section);
    objFile.addRelocation(new ObjectRelocation(1, 'helper', RelocationType.CALL, '.text'));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);
    const disassembly = disassembleObjectFile(loaded);
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.relocations.length, 1);
    assert.strictEqual(textSection.relocations[0].symbolName, 'helper');
    assert.strictEqual(textSection.relocations[0].type, 'call');
    assert.strictEqual(textSection.relocations[0].offset, 1);
  });

  it('verify section contents are preserved through round-trip', () => {
    const objFile = new ObjectFile('roundtrip.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x01);
    section.appendByte(0x34);
    section.appendByte(0x12);
    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);
    const disassembly = disassembleObjectFile(loaded);
    const textSection = disassembly.sections.get('.text');

    assert.strictEqual(textSection.instructions[0].bytes[0], 0x01);
    assert.strictEqual(textSection.instructions[0].bytes[1], 0x34);
    assert.strictEqual(textSection.instructions[0].bytes[2], 0x12);
  });

  it('round-trip with multiple sections', () => {
    const objFile = new ObjectFile('multi.o');
    const textSection = new ObjectSection('.text', SectionType.CODE);
    textSection.appendByte(0xC9);
    objFile.addSection(textSection);
    const dataSection = new ObjectSection('.data', SectionType.DATA);
    dataSection.contents = new Uint8Array([0x42, 0x00]);
    objFile.addSection(dataSection);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);
    const disassembly = disassembleObjectFile(loaded);

    assert.strictEqual(disassembly.sections.size, 2);
    assert.ok(disassembly.sections.has('.text'));
    assert.ok(disassembly.sections.has('.data'));
  });
});

describe('Binary with symbols', () => {
  it('create BinaryDisassembler with symbols Map', () => {
    const symbols = new Map([['main', 0x1000], ['helper', 0x1002]]);
    const bytes = new Uint8Array([0x00, 0x00, 0x00]);
    const disassembler = new BinaryDisassembler(bytes, { symbols, baseAddress: 0x1000 });

    assert.strictEqual(disassembler.symbols.size, 2);
  });

  it('disassemble bytes with CALL to symbol address', () => {
    const symbols = new Map([['main', 0x1000]]);
    const bytes = new Uint8Array([0xCD, 0x00, 0x10]);
    const disassembler = new BinaryDisassembler(bytes, { symbols, baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('main'));
  });

  it('verify symbol name used instead of hex', () => {
    const symbols = new Map([['start', 0x0000]]);
    const bytes = new Uint8Array([0xC9]);
    const disassembler = new BinaryDisassembler(bytes, { symbols });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('start'));
    assert.ok(output.includes('RET'));
  });

  it('verify multiple symbols work', () => {
    const symbols = new Map([['func_a', 0x1000], ['func_b', 0x1002]]);
    const bytes = new Uint8Array([0xC9, 0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes, { symbols, baseAddress: 0x1000 });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('func_a'));
    assert.ok(output.includes('func_b'));
  });

  it('resolveAddress returns symbol name for matching address', () => {
    const symbols = new Map([['main', 0x1000]]);
    const bytes = new Uint8Array([0x00]);
    const disassembler = new BinaryDisassembler(bytes, { symbols, baseAddress: 0x1000 });

    assert.strictEqual(disassembler.resolveAddress(0x1000), 'main');
    assert.strictEqual(disassembler.resolveAddress(0x1001), null);
  });

  it('formatInstruction uses symbol resolution', () => {
    const symbols = new Map([['entry', 0x2000]]);
    const bytes = new Uint8Array([0xC9]);
    const disassembler = new BinaryDisassembler(bytes, { symbols, baseAddress: 0x2000 });
    const instruction = new Z80Instruction(0xC9, 'RET', [], [0xC9], 1, 0x2000);
    const formatted = disassembler.formatInstruction(instruction, 0x2000);

    assert.ok(formatted.includes('entry'));
    assert.ok(formatted.includes('RET'));
  });
});

describe('Verbose mode', () => {
  it('verbose=true includes hex dump alongside assembly', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes, { verbose: true });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('00'));
    assert.ok(output.includes('c9'));
    assert.ok(output.includes('NOP'));
    assert.ok(output.includes('RET'));
  });

  it('hex bytes match instruction bytes', () => {
    const bytes = new Uint8Array([0x3E, 0x42]);
    const disassembler = new BinaryDisassembler(bytes, { verbose: true });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('3e'));
    assert.ok(output.includes('42'));
  });

  it('format includes both hex and mnemonic', () => {
    const bytes = new Uint8Array([0xCD, 0x00, 0x10]);
    const disassembler = new BinaryDisassembler(bytes, { verbose: true });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('00'));
    assert.ok(output.includes('10'));
    assert.ok(output.includes('CALL'));
  });

  it('verbose=false does not include hex dump', () => {
    const bytes = new Uint8Array([0x3E, 0x42]);
    const disassembler = new BinaryDisassembler(bytes, { verbose: false });
    const disassembly = disassembler.disassemble();
    const output = disassembly.toString();

    assert.ok(output.includes('LD A,n'));
    assert.ok(output.includes('$42'));
  });
});

describe('Edge cases', () => {
  it('very long binary (64KB)', () => {
    const bytes = new Uint8Array(65536);
    for (let i = 0; i < 65536; i++) {
      bytes[i] = 0x00;
    }
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.totalSize, 65536);
    assert.strictEqual(disassembly.instructions.length, 65536);
    for (const instr of disassembly.instructions) {
      assert.strictEqual(instr.mnemonic, 'NOP');
    }
  });

  it('mixed instruction types in binary', () => {
    const bytes = new Uint8Array([
      0x00, 0xC9, 0x3E, 0x42, 0x77, 0xCD, 0x00, 0x10,
      0xF5, 0xF1, 0x01, 0x34, 0x12, 0x18, 0x05
    ]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.instructions.length, 9);
    const mnemonics = disassembly.instructions.map(i => i.mnemonic);
    assert.ok(mnemonics.includes('NOP'));
    assert.ok(mnemonics.includes('RET'));
    assert.ok(mnemonics.includes('LD A,n'));
    assert.ok(mnemonics.includes('CALL nn'));
    assert.ok(mnemonics.includes('PUSH AF'));
    assert.ok(mnemonics.includes('LD BC,nn'));
  });

  it('object file with multiple sections', () => {
    const objFile = new ObjectFile('multi.o');
    const textSection = new ObjectSection('.text', SectionType.CODE);
    textSection.appendByte(0xC9);
    objFile.addSection(textSection);
    const dataSection = new ObjectSection('.data', SectionType.DATA);
    dataSection.contents = new Uint8Array([0x42, 0x00]);
    objFile.addSection(dataSection);
    const rodataSection = new ObjectSection('.rodata', SectionType.RODATA);
    rodataSection.contents = new Uint8Array([0x01, 0x02, 0x03]);
    objFile.addSection(rodataSection);

    const disassembly = disassembleObjectFile(objFile);

    assert.strictEqual(disassembly.sections.size, 3);
    assert.ok(disassembly.sections.has('.text'));
    assert.ok(disassembly.sections.has('.data'));
    assert.ok(disassembly.sections.has('.rodata'));
  });

  it('object file with no sections', () => {
    const objFile = new ObjectFile('empty.o');

    const disassembly = disassembleObjectFile(objFile);

    assert.strictEqual(disassembly.sections.size, 0);
    assert.strictEqual(disassembly.symbols.length, 0);
    assert.strictEqual(disassembly.relocations.length, 0);
  });

  it('binary with no symbols', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembler = new BinaryDisassembler(bytes);
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.symbols.size, 0);
    assert.strictEqual(disassembly.instructions.length, 2);
  });

  it('binary section with invalid boundaries', () => {
    const bytes = new Uint8Array([0x00, 0xC9, 0x3E, 0x42]);
    const disassembler = new BinaryDisassembler(bytes, {
      sectionBreaks: [{ name: '.text', start: 0x0005, end: 0x0010 }]
    });
    const disassembly = disassembler.disassemble();

    assert.strictEqual(disassembly.sections.length, 0);
    assert.strictEqual(disassembly.instructions.length, 3);
  });

  it('disassembleBinary helper with number array input', () => {
    const disassembly = disassembleBinary([0x00, 0xC9, 0x3E, 0x42]);

    assert.strictEqual(disassembly.instructions.length, 3);
    assert.strictEqual(disassembly.instructions[0].mnemonic, 'NOP');
    assert.strictEqual(disassembly.instructions[1].mnemonic, 'RET');
    assert.strictEqual(disassembly.instructions[2].mnemonic, 'LD A,n');
  });

  it('disassembleBinary with Uint8Array input', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const disassembly = disassembleBinary(bytes);

    assert.strictEqual(disassembly.instructions.length, 2);
  });
});
