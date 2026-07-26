import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';
import {
  serializeObjectFile, deserializeObjectFile, isObjectFile
} from '../../src/linker/objectfile_loader.js';
import {
  FunctionIR, BasicBlock, ProgramIR,
  LoadInstruction, ReturnInstruction
} from '../../src/nanopass/il.js';
import { IrToObjectFile } from '../../src/linker/objectfile.js';
import { Linker } from '../../src/linker/linker.js';

describe('ObjectFile Binary Serialization', () => {
  it('should serialize and deserialize empty object file', () => {
    const objFile = new ObjectFile('empty.o');
    const bytes = serializeObjectFile(objFile);
    assert.ok(bytes.length > 0);
    assert.ok(isObjectFile(bytes));

    const loaded = deserializeObjectFile(bytes);
    assert.strictEqual(loaded.sections.length, 0);
    assert.strictEqual(loaded.symbols.length, 0);
  });

  it('should round-trip object file with sections', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    section.appendByte(0xC9);
    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.sections.length, 1);
    assert.strictEqual(loaded.sections[0].name, '.text');
    assert.strictEqual(loaded.sections[0].type, SectionType.CODE);
    assert.strictEqual(loaded.sections[0].size(), 3);
    assert.strictEqual(loaded.sections[0].contents[0], 0x3E);
    assert.strictEqual(loaded.sections[0].contents[1], 0x42);
    assert.strictEqual(loaded.sections[0].contents[2], 0xC9);
  });

  it('should round-trip object file with symbols', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.LOCAL, 5, '.text'));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.symbols.length, 2);
    assert.strictEqual(loaded.symbols[0].name, 'main');
    assert.strictEqual(loaded.symbols[0].type, SymbolType.FUNCTION);
    assert.strictEqual(loaded.symbols[0].visibility, SymbolVisibility.GLOBAL);
    assert.strictEqual(loaded.symbols[1].name, 'helper');
    assert.strictEqual(loaded.symbols[1].visibility, SymbolVisibility.LOCAL);
    assert.strictEqual(loaded.symbols[1].value, 5);
  });

  it('should round-trip object file with relocations', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    const reloc = new ObjectRelocation(1, 'helper', RelocationType.CALL, '.text', 0);
    section.addRelocation(reloc);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.sections[0].relocations.length, 1);
    const loadedReloc = loaded.sections[0].relocations[0];
    assert.strictEqual(loadedReloc.offset, 1);
    assert.strictEqual(loadedReloc.symbolName, 'helper');
    assert.strictEqual(loadedReloc.type, RelocationType.CALL);
  });

  it('should round-trip multiple sections', () => {
    const objFile = new ObjectFile('test.o');

    const textSection = new ObjectSection('.text', SectionType.CODE);
    textSection.appendByte(0xC9);
    objFile.addSection(textSection);

    const dataSection = new ObjectSection('.data', SectionType.DATA);
    dataSection.appendByte(0x42);
    dataSection.appendByte(0x00);
    objFile.addSection(dataSection);

    const bssSection = new ObjectSection('.bss', SectionType.BSS);
    objFile.addSection(bssSection);

    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('gVar', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data'));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.sections.length, 3);
    assert.strictEqual(loaded.sections[0].type, SectionType.CODE);
    assert.strictEqual(loaded.sections[1].type, SectionType.DATA);
    assert.strictEqual(loaded.sections[2].type, SectionType.BSS);
    assert.strictEqual(loaded.symbols.length, 2);
  });

  it('should round-trip symbol with no section', () => {
    const objFile = new ObjectFile('test.o');
    objFile.addSymbol(new ObjectSymbol('absolute', SymbolType.ABSOLUTE, SymbolVisibility.GLOBAL, 42, null));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.symbols.length, 1);
    assert.strictEqual(loaded.symbols[0].name, 'absolute');
    assert.strictEqual(loaded.symbols[0].type, SymbolType.ABSOLUTE);
    assert.strictEqual(loaded.symbols[0].value, 42);
    assert.strictEqual(loaded.symbols[0].section, null);
  });

  it('should reject invalid magic', () => {
    const badData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00]);
    assert.throws(() => deserializeObjectFile(badData), /Invalid object file/);
  });

  it('should reject unsupported version', () => {
    const encoder = new TextEncoder();
    const magic = encoder.encode('VCC80O');
    const data = new Uint8Array(magic.length + 2);
    data.set(magic);
    data[6] = 0xFF;
    data[7] = 0x00;
    assert.throws(() => deserializeObjectFile(data), /Unsupported object file version/);
  });

  it('should reject too-short data', () => {
    assert.strictEqual(isObjectFile(new Uint8Array([0x00])), false);
  });

  it('should identify valid object file magic', () => {
    const objFile = new ObjectFile('test.o');
    const bytes = serializeObjectFile(objFile);
    assert.strictEqual(isObjectFile(bytes), true);
  });

  it('should round-trip from IR through binary format', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.ok(loaded.sections.length > 0);
    assert.ok(loaded.symbols.length > 0);
    assert.ok(loaded.getSymbol('main') !== null);
  });

  it('should link deserialized object files', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text.main', SectionType.CODE);
    section1.appendByte(0xC9);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.text.helper', SectionType.CODE);
    section2.appendByte(0x3E);
    section2.appendByte(0x01);
    section2.appendByte(0xC9);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.helper'));

    const bytes1 = serializeObjectFile(objFile1);
    const bytes2 = serializeObjectFile(objFile2);

    const loaded1 = deserializeObjectFile(bytes1);
    const loaded2 = deserializeObjectFile(bytes2);

    const linker = new Linker();
    linker.addObjectFile(loaded1);
    linker.addObjectFile(loaded2);
    const result = linker.link();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.symbols.length, 2);
  });

  it('should round-trip with all symbol types', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);

    objFile.addSymbol(new ObjectSymbol('func', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('var', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('lbl', SymbolType.LABEL, SymbolVisibility.LOCAL, 10, '.text'));
    objFile.addSymbol(new ObjectSymbol('equ', SymbolType.EQUATE, SymbolVisibility.LOCAL, 0x8000, null));
    objFile.addSymbol(new ObjectSymbol('weak', SymbolType.FUNCTION, SymbolVisibility.WEAK, 0, '.text'));

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.symbols.length, 5);
    assert.strictEqual(loaded.symbols[0].type, SymbolType.FUNCTION);
    assert.strictEqual(loaded.symbols[1].type, SymbolType.VARIABLE);
    assert.strictEqual(loaded.symbols[2].type, SymbolType.LABEL);
    assert.strictEqual(loaded.symbols[3].type, SymbolType.EQUATE);
    assert.strictEqual(loaded.symbols[4].visibility, SymbolVisibility.WEAK);
  });

  it('should round-trip with all relocation types', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    section.appendByte(0x00);
    section.appendByte(0x00);
    section.appendByte(0x00);
    section.appendByte(0x00);

    section.addRelocation(new ObjectRelocation(0, 's1', RelocationType.ABS8, '.text'));
    section.addRelocation(new ObjectRelocation(1, 's2', RelocationType.ABS16, '.text'));
    section.addRelocation(new ObjectRelocation(2, 's3', RelocationType.PCREL8, '.text'));
    section.addRelocation(new ObjectRelocation(3, 's4', RelocationType.CALL, '.text'));
    section.addRelocation(new ObjectRelocation(4, 's5', RelocationType.JP, '.text'));

    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.sections[0].relocations.length, 5);
    assert.strictEqual(loaded.sections[0].relocations[0].type, RelocationType.ABS8);
    assert.strictEqual(loaded.sections[0].relocations[1].type, RelocationType.ABS16);
    assert.strictEqual(loaded.sections[0].relocations[2].type, RelocationType.PCREL8);
    assert.strictEqual(loaded.sections[0].relocations[3].type, RelocationType.CALL);
    assert.strictEqual(loaded.sections[0].relocations[4].type, RelocationType.JP);
  });

  it('should round-trip with rodata section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.rodata', SectionType.RODATA);
    const str = new TextEncoder().encode('hello');
    for (const b of str) {
      section.appendByte(b);
    }
    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.sections[0].type, SectionType.RODATA);
    assert.strictEqual(loaded.sections[0].size(), 5);
  });

  it('should round-trip with addend in relocation', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    const reloc = new ObjectRelocation(0, 'sym', RelocationType.ABS8, '.text', 42);
    section.addRelocation(reloc);
    objFile.addSection(section);

    const bytes = serializeObjectFile(objFile);
    const loaded = deserializeObjectFile(bytes);

    assert.strictEqual(loaded.sections[0].relocations[0].addend, 42);
  });
});
