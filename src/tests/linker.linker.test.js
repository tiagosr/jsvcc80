import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';
import { Linker, LinkerOptions, link } from '../../src/linker/linker.js';

describe('Linker', () => {
  it('should link single object file', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.strictEqual(result.success, true);
    assert.ok(result.sections.length > 0);
    assert.ok(result.symbols.length > 0);
  });

  it('should link multiple object files', () => {
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

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    const result = linker.link();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.symbols.length, 2);
  });

  it('should detect duplicate global symbols', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text', SectionType.CODE);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.text', SectionType.CODE);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    const result = linker.link();

    assert.ok(result.errors.length > 0);
  });

  it('should resolve weak symbols', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text', SectionType.CODE);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('weak_func', SymbolType.FUNCTION, SymbolVisibility.WEAK, 0, '.text'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.text', SectionType.CODE);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('weak_func', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    const result = linker.link();

    assert.strictEqual(result.success, true);
  });

  it('should generate WLA DX output', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();
    const output = linker.generateWlaDx();

    assert.ok(output.includes('SECTION'));
    assert.ok(output.includes('OPTION'));
  });

  it('should generate binary output', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();
    const binary = linker.generateBinary();

    assert.ok(binary.length > 0);
  });

  it('should generate map file', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();
    const map = linker.generateMap();

    assert.ok(map.includes('Link Map'));
    assert.ok(map.includes('Sections:'));
    assert.ok(map.includes('Symbols:'));
  });

  it('should resolve relocations', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'helper', 'call', '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.strictEqual(result.success, true);
  });

  it('should warn on unresolved externals', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'undefined_func', 'call', '.text'));

    const linker = new Linker(new LinkerOptions({ resolveExternals: true }));
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.ok(result.warnings.length > 0);
  });

  it('should error on undefined symbols', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'undefined_func', 'call', '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.ok(result.errors.length > 0);
  });
});

describe('link convenience function', () => {
  it('should link array of object files', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const result = link([objFile]);
    assert.strictEqual(result.success, true);
  });

  it('should accept linker options', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const result = link([objFile], new LinkerOptions({ baseAddress: 0x10000 }));
    assert.strictEqual(result.success, true);
  });
});

describe('LinkerOptions', () => {
  it('should have default values', () => {
    const options = new LinkerOptions();
    assert.strictEqual(options.entryPoint, 'main');
    assert.strictEqual(options.outputFormat, 'wladx');
    assert.strictEqual(options.baseAddress, 0x8000);
  });

  it('should accept custom values', () => {
    const options = new LinkerOptions({
      entryPoint: 'custom_entry',
      baseAddress: 0x10000,
      outputFormat: 'binary'
    });
    assert.strictEqual(options.entryPoint, 'custom_entry');
    assert.strictEqual(options.baseAddress, 0x10000);
    assert.strictEqual(options.outputFormat, 'binary');
  });
});
