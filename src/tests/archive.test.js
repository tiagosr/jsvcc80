import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Archive,
  ArchiveMember,
  serializeArchive,
  deserializeArchive,
  isArchive,
  createArchive
} from '../../src/linker/archive.js';
import {
  ObjectFile,
  ObjectSection,
  ObjectSymbol,
  ObjectRelocation,
  SymbolType,
  SymbolVisibility,
  SectionType,
  RelocationType
} from '../../src/linker/objectfile.js';
import {
  serializeObjectFile,
  deserializeObjectFile
} from '../../src/linker/objectfile_loader.js';

describe('ArchiveMember', () => {
  it('should create member with name and object file', () => {
    const objFile = new ObjectFile('test.o');
    const member = new ArchiveMember('test.o', objFile);
    assert.strictEqual(member.name, 'test.o');
    assert.strictEqual(member.objectFile, objFile);
  });

  it('should serialize to JSON', () => {
    const objFile = new ObjectFile('test.o');
    const member = new ArchiveMember('test.o', objFile);
    const json = member.toJSON();
    assert.strictEqual(json.name, 'test.o');
    assert.deepStrictEqual(json.objectFile, objFile.toJSON());
  });
});

describe('Archive', () => {
  it('should create empty archive', () => {
    const archive = new Archive('libtest.a');
    assert.strictEqual(archive.name, 'libtest.a');
    assert.strictEqual(archive.members.length, 0);
  });

  it('should add members', () => {
    const archive = new Archive('libtest.a');
    const objFile1 = new ObjectFile('func1.o');
    const objFile2 = new ObjectFile('func2.o');
    archive.addMember('func1.o', objFile1);
    archive.addMember('func2.o', objFile2);
    assert.strictEqual(archive.members.length, 2);
  });

  it('should get member by name', () => {
    const archive = new Archive('libtest.a');
    const objFile = new ObjectFile('func.o');
    archive.addMember('func.o', objFile);
    const member = archive.getMember('func.o');
    assert.ok(member !== null);
    assert.strictEqual(member.name, 'func.o');
  });

  it('should return null for missing member', () => {
    const archive = new Archive('libtest.a');
    const member = archive.getMember('missing.o');
    assert.strictEqual(member, null);
  });

  it('should get all object files', () => {
    const archive = new Archive('libtest.a');
    const objFile1 = new ObjectFile('func1.o');
    const objFile2 = new ObjectFile('func2.o');
    archive.addMember('func1.o', objFile1);
    archive.addMember('func2.o', objFile2);
    const files = archive.getObjectFiles();
    assert.strictEqual(files.length, 2);
    assert.strictEqual(files[0], objFile1);
    assert.strictEqual(files[1], objFile2);
  });

  it('should list member names', () => {
    const archive = new Archive('libtest.a');
    const objFile1 = new ObjectFile('func1.o');
    const objFile2 = new ObjectFile('func2.o');
    archive.addMember('func1.o', objFile1);
    archive.addMember('func2.o', objFile2);
    const names = archive.listMembers();
    assert.deepStrictEqual(names, ['func1.o', 'func2.o']);
  });

  it('should serialize to JSON', () => {
    const archive = new Archive('libtest.a');
    const objFile = new ObjectFile('func.o');
    archive.addMember('func.o', objFile);
    const json = archive.toJSON();
    assert.strictEqual(json.name, 'libtest.a');
    assert.strictEqual(json.members.length, 1);
  });
});

describe('createArchive', () => {
  it('should create archive from object files', () => {
    const objFile1 = new ObjectFile('func1.o');
    const objFile2 = new ObjectFile('func2.o');
    const archive = createArchive('libtest.a', [objFile1, objFile2]);
    assert.strictEqual(archive.name, 'libtest.a');
    assert.strictEqual(archive.members.length, 2);
  });

  it('should use custom member names when provided', () => {
    const objFile1 = new ObjectFile('func1.o');
    const objFile2 = new ObjectFile('func2.o');
    const archive = createArchive('libtest.a', [objFile1, objFile2], ['a.o', 'b.o']);
    assert.strictEqual(archive.members[0].name, 'a.o');
    assert.strictEqual(archive.members[1].name, 'b.o');
  });

  it('should use default member names when not provided', () => {
    const objFile1 = new ObjectFile('func1.o');
    const objFile2 = new ObjectFile('func2.o');
    const archive = createArchive('libtest.a', [objFile1, objFile2]);
    assert.strictEqual(archive.members[0].name, 'member0.o');
    assert.strictEqual(archive.members[1].name, 'member1.o');
  });
});

describe('Archive serialization', () => {
  it('should serialize and deserialize empty archive', () => {
    const archive = new Archive('libempty.a');
    const data = serializeArchive(archive);
    assert.ok(data.length >= 10);
    const restored = deserializeArchive(data);
    assert.strictEqual(restored.members.length, 0);
  });

  it('should serialize and deserialize archive with single member', () => {
    const archive = new Archive('libtest.a');
    const objFile = new ObjectFile('func.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    objFile.addSection(section);
    archive.addMember('func.o', objFile);

    const data = serializeArchive(archive);
    const restored = deserializeArchive(data);

    assert.strictEqual(restored.members.length, 1);
    assert.strictEqual(restored.members[0].name, 'func.o');
    assert.strictEqual(restored.members[0].objectFile.sections.length, 1);
  });

  it('should serialize and deserialize archive with multiple members', () => {
    const archive = new Archive('libmulti.a');

    const objFile1 = new ObjectFile('func1.o');
    const section1 = new ObjectSection('.text', SectionType.CODE);
    section1.appendByte(0x01);
    objFile1.addSection(section1);

    const objFile2 = new ObjectFile('func2.o');
    const section2 = new ObjectSection('.data', SectionType.DATA);
    section2.appendByte(0x42);
    objFile2.addSection(section2);

    archive.addMember('func1.o', objFile1);
    archive.addMember('func2.o', objFile2);

    const data = serializeArchive(archive);
    const restored = deserializeArchive(data);

    assert.strictEqual(restored.members.length, 2);
    assert.strictEqual(restored.members[0].name, 'func1.o');
    assert.strictEqual(restored.members[1].name, 'func2.o');
  });

  it('should preserve symbols through round-trip', () => {
    const archive = new Archive('libsymbols.a');
    const objFile = new ObjectFile('sym.o');

    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    objFile.addSection(section);

    const symbol = new ObjectSymbol('myFunc', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text');
    objFile.addSymbol(symbol);

    archive.addMember('sym.o', objFile);

    const data = serializeArchive(archive);
    const restored = deserializeArchive(data);

    const restoredSymbol = restored.members[0].objectFile.getSymbol('myFunc');
    assert.ok(restoredSymbol !== null);
    assert.strictEqual(restoredSymbol.name, 'myFunc');
    assert.strictEqual(restoredSymbol.type, SymbolType.FUNCTION);
  });

  it('should preserve relocations through round-trip', () => {
    const archive = new Archive('librelocs.a');
    const objFile = new ObjectFile('reloc.o');

    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    section.appendByte(0x00);
    const reloc = new ObjectRelocation(0, 'target', RelocationType.CALL, '.text');
    section.addRelocation(reloc);
    objFile.addSection(section);

    archive.addMember('reloc.o', objFile);

    const data = serializeArchive(archive);
    const restored = deserializeArchive(data);

    const restoredSection = restored.members[0].objectFile.getSection('.text');
    assert.ok(restoredSection !== null);
    assert.strictEqual(restoredSection.relocations.length, 1);
    assert.strictEqual(restoredSection.relocations[0].symbolName, 'target');
  });

  it('should round-trip complex archive with all section types', () => {
    const archive = new Archive('libcomplex.a');
    const objFile = new ObjectFile('complex.o');

    const textSection = new ObjectSection('.text', SectionType.CODE);
    textSection.appendByte(0xCD);
    objFile.addSection(textSection);

    const dataSection = new ObjectSection('.data', SectionType.DATA);
    dataSection.appendWord(0x1234);
    objFile.addSection(dataSection);

    const bssSection = new ObjectSection('.bss', SectionType.BSS);
    objFile.addSection(bssSection);

    const rodataSection = new ObjectSection('.rodata', SectionType.RODATA);
    rodataSection.appendByte(0x00);
    objFile.addSection(rodataSection);

    archive.addMember('complex.o', objFile);

    const data = serializeArchive(archive);
    const restored = deserializeArchive(data);

    const restoredFile = restored.members[0].objectFile;
    assert.strictEqual(restoredFile.sections.length, 4);
    assert.strictEqual(restoredFile.getSection('.text').type, SectionType.CODE);
    assert.strictEqual(restoredFile.getSection('.data').type, SectionType.DATA);
    assert.strictEqual(restoredFile.getSection('.bss').type, SectionType.BSS);
    assert.strictEqual(restoredFile.getSection('.rodata').type, SectionType.RODATA);
  });
});

describe('isArchive', () => {
  it('should return true for valid archive data', () => {
    const archive = new Archive('libtest.a');
    const data = serializeArchive(archive);
    assert.strictEqual(isArchive(data), true);
  });

  it('should return false for object file data', () => {
    const objFile = new ObjectFile('test.o');
    const data = serializeObjectFile(objFile);
    assert.strictEqual(isArchive(data), false);
  });

  it('should return false for short data', () => {
    assert.strictEqual(isArchive(new Uint8Array([0x00])), false);
  });

  it('should return false for random data', () => {
    const data = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A]);
    assert.strictEqual(isArchive(data), false);
  });
});

describe('Archive deserialization errors', () => {
  it('should reject data that is too short', () => {
    const shortData = new Uint8Array([0x00, 0x01, 0x02]);
    assert.throws(() => deserializeArchive(shortData), /too short/);
  });

  it('should reject invalid magic', () => {
    const data = new Uint8Array(20).fill(0);
    assert.throws(() => deserializeArchive(data), /bad magic/);
  });

  it('should reject unsupported version', () => {
    const archive = new Archive('libtest.a');
    const data = serializeArchive(archive);
    data[6] = 0xFF;
    assert.throws(() => deserializeArchive(data), /Unsupported archive version/);
  });
});

describe('Archive integration with linker', () => {
  it('should produce object files that linker can consume', async () => {
    const { Linker } = await import('../../src/linker/linker.js');

    const archive = new Archive('liblink.a');

    const objFile1 = new ObjectFile('add.o');
    const addSection = new ObjectSection('.text.add', SectionType.CODE);
    addSection.appendByte(0x3E);
    addSection.appendByte(0x05);
    addSection.appendByte(0xCD);
    const addSymbol = new ObjectSymbol('add', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.add');
    objFile1.addSection(addSection);
    objFile1.addSymbol(addSymbol);
    archive.addMember('add.o', objFile1);

    const objFile2 = new ObjectFile('sub.o');
    const subSection = new ObjectSection('.text.sub', SectionType.CODE);
    subSection.appendByte(0x3E);
    subSection.appendByte(0x03);
    subSection.appendByte(0xCD);
    const subSymbol = new ObjectSymbol('sub', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.sub');
    objFile2.addSection(subSection);
    objFile2.addSymbol(subSymbol);
    archive.addMember('sub.o', objFile2);

    const data = serializeArchive(archive);
    const restored = deserializeArchive(data);

    const linker = new Linker();
    for (const objFile of restored.getObjectFiles()) {
      linker.addObjectFile(objFile);
    }

    const result = linker.link();
    assert.strictEqual(result.success, true);
  });
});
