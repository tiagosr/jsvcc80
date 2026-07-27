import { describe, it } from 'mocha';
import assert from 'assert';
import {
  MapSection, MapSymbol, MapRelocation, LinkMap,
  MapSectionType, MapSymbolType, MapSymbolVisibility, MapRelocationType,
  bytesToHex, createLinkMapFromLinker
} from '../../src/linker/mapfile.js';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';
import { Linker, LinkerOptions } from '../../src/linker/linker.js';

describe('MapSection', () => {
  it('should create a map section', () => {
    const section = new MapSection('.text', MapSectionType.CODE, 0x8000, 100, 'DEADBEEF');
    assert.strictEqual(section.name, '.text');
    assert.strictEqual(section.type, MapSectionType.CODE);
    assert.strictEqual(section.baseAddress, 0x8000);
    assert.strictEqual(section.size, 100);
    assert.strictEqual(section.contentsHex, 'DEADBEEF');
  });

  it('should serialize to JSON', () => {
    const section = new MapSection('.data', MapSectionType.DATA, 0xC000, 50, 'CAFE');
    const json = section.toJSON();
    assert.strictEqual(json.name, '.data');
    assert.strictEqual(json.type, MapSectionType.DATA);
    assert.strictEqual(json.baseAddress, 0xC000);
    assert.strictEqual(json.endAddress, 0xC000 + 50);
    assert.strictEqual(json.size, 50);
    assert.strictEqual(json.contentsHex, 'CAFE');
  });
});

describe('MapSymbol', () => {
  it('should create a map symbol', () => {
    const symbol = new MapSymbol('main', MapSymbolType.FUNCTION, MapSymbolVisibility.GLOBAL, 0x8000, '.text', 0, 2, 10, 'test.c');
    assert.strictEqual(symbol.name, 'main');
    assert.strictEqual(symbol.type, MapSymbolType.FUNCTION);
    assert.strictEqual(symbol.visibility, MapSymbolVisibility.GLOBAL);
    assert.strictEqual(symbol.address, 0x8000);
    assert.strictEqual(symbol.section, '.text');
    assert.strictEqual(symbol.value, 0);
    assert.strictEqual(symbol.size, 2);
    assert.strictEqual(symbol.line, 10);
    assert.strictEqual(symbol.sourceFile, 'test.c');
  });

  it('should serialize to JSON', () => {
    const symbol = new MapSymbol('counter', MapSymbolType.VARIABLE, MapSymbolVisibility.GLOBAL, 0xC000, '.data', 0, 4, 25, 'test.c');
    const json = symbol.toJSON();
    assert.strictEqual(json.name, 'counter');
    assert.strictEqual(json.type, MapSymbolType.VARIABLE);
    assert.strictEqual(json.visibility, MapSymbolVisibility.GLOBAL);
    assert.strictEqual(json.address, 0xC000);
    assert.strictEqual(json.section, '.data');
    assert.strictEqual(json.value, 0);
    assert.strictEqual(json.size, 4);
    assert.strictEqual(json.line, 25);
    assert.strictEqual(json.sourceFile, 'test.c');
  });
});

describe('MapRelocation', () => {
  it('should create a map relocation', () => {
    const reloc = new MapRelocation(5, 'helper', MapRelocationType.CALL, '.text', 0);
    assert.strictEqual(reloc.offset, 5);
    assert.strictEqual(reloc.symbolName, 'helper');
    assert.strictEqual(reloc.type, MapRelocationType.CALL);
    assert.strictEqual(reloc.section, '.text');
    assert.strictEqual(reloc.addend, 0);
  });

  it('should serialize to JSON', () => {
    const reloc = new MapRelocation(10, 'extern_func', MapRelocationType.ABS16, '.text', 42);
    const json = reloc.toJSON();
    assert.strictEqual(json.offset, 10);
    assert.strictEqual(json.symbolName, 'extern_func');
    assert.strictEqual(json.type, MapRelocationType.ABS16);
    assert.strictEqual(json.section, '.text');
    assert.strictEqual(json.addend, 42);
  });
});

describe('LinkMap', () => {
  it('should create an empty link map', () => {
    const map = new LinkMap({ compilerVersion: 'vcc80 v0.2.0', inputFiles: ['test.c'] });
    assert.strictEqual(map.compilerVersion, 'vcc80 v0.2.0');
    assert.strictEqual(map.inputFiles.length, 1);
    assert.strictEqual(map.inputFiles[0], 'test.c');
    assert.strictEqual(map.sections.length, 0);
    assert.strictEqual(map.symbols.length, 0);
    assert.strictEqual(map.relocations.length, 0);
    assert.strictEqual(map.warnings.length, 0);
    assert.strictEqual(map.errors.length, 0);
    assert.strictEqual(map.hasCrt0, false);
  });

  it('should add sections', () => {
    const map = new LinkMap();
    map.addSection(new MapSection('.text', MapSectionType.CODE, 0x8000, 10, '00'));
    assert.strictEqual(map.sections.length, 1);
  });

  it('should add symbols', () => {
    const map = new LinkMap();
    map.addSymbol(new MapSymbol('main', MapSymbolType.FUNCTION, MapSymbolVisibility.GLOBAL, 0x8000, '.text', 0, 2, 10, 'test.c'));
    assert.strictEqual(map.symbols.length, 1);
  });

  it('should add relocations', () => {
    const map = new LinkMap();
    map.addRelocation(new MapRelocation(1, 'helper', MapRelocationType.CALL, '.text', 0));
    assert.strictEqual(map.relocations.length, 1);
  });

  it('should add warnings', () => {
    const map = new LinkMap();
    map.addWarning('unresolved symbol');
    assert.strictEqual(map.warnings.length, 1);
    assert.strictEqual(map.warnings[0], 'unresolved symbol');
  });

  it('should add errors', () => {
    const map = new LinkMap();
    map.addError('duplicate symbol');
    assert.strictEqual(map.errors.length, 1);
    assert.strictEqual(map.errors[0], 'duplicate symbol');
  });

  it('should serialize to JSON', () => {
    const map = new LinkMap({ compilerVersion: 'vcc80 v0.1.0', inputFiles: ['a.c', 'b.c'], baseAddress: 0x8000 });
    map.addSection(new MapSection('.text', MapSectionType.CODE, 0x8000, 100, 'DEAD'));
    map.addSymbol(new MapSymbol('main', MapSymbolType.FUNCTION, MapSymbolVisibility.GLOBAL, 0x8000, '.text', 0, 2, 10, 'a.c'));
    map.addWarning('test warning');
    map.addError('test error');
    map.hasCrt0 = true;

    const json = map.toJSON();
    assert.strictEqual(json.header.compilerVersion, 'vcc80 v0.1.0');
    assert.ok(json.header.timestamp.includes('T'));
    assert.strictEqual(json.header.inputFiles.length, 2);
    assert.strictEqual(json.header.baseAddress, 0x8000);
    assert.strictEqual(json.sections.length, 1);
    assert.strictEqual(json.symbols.length, 1);
    assert.strictEqual(json.warnings.length, 1);
    assert.strictEqual(json.errors.length, 1);
    assert.strictEqual(json.crt0, true);
  });

  it('should serialize to JSON string', () => {
    const map = new LinkMap();
    const str = map.toJSONString();
    assert.ok(typeof str === 'string');
    assert.ok(str.startsWith('{'));
    assert.ok(str.endsWith('}'));
    const parsed = JSON.parse(str);
    assert.ok(parsed.header);
    assert.ok(parsed.sections);
    assert.ok(parsed.symbols);
  });
});

describe('bytesToHex', () => {
  it('should convert empty array to empty string', () => {
    assert.strictEqual(bytesToHex(new Uint8Array(0)), '');
  });

  it('should convert single byte', () => {
    assert.strictEqual(bytesToHex(new Uint8Array([0x00])), '00');
    assert.strictEqual(bytesToHex(new Uint8Array([0xFF])), 'FF');
    assert.strictEqual(bytesToHex(new Uint8Array([0xAB])), 'AB');
  });

  it('should convert multiple bytes', () => {
    assert.strictEqual(bytesToHex(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])), 'DEADBEEF');
  });

  it('should produce uppercase hex', () => {
    const result = bytesToHex(new Uint8Array([0x0a, 0x1b, 0x2c]));
    assert.strictEqual(result, '0A1B2C');
    assert.ok(result === result.toUpperCase());
  });

  it('should pad single-digit bytes', () => {
    assert.strictEqual(bytesToHex(new Uint8Array([0x01, 0x02, 0x03])), '010203');
  });
});

describe('createLinkMapFromLinker', () => {
  it('should create map from single object file', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const map = createLinkMapFromLinker(linker, { inputFiles: ['test.c'] });
    assert.ok(map.sections.length > 0);
    assert.ok(map.symbols.length > 0);
    assert.strictEqual(map.hasCrt0, true);

    const json = map.toJSON();
    assert.ok(json.header.inputFiles.includes('test.c'));
  });

  it('should create map from multiple object files', () => {
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
    linker.link();

    const map = createLinkMapFromLinker(linker, { inputFiles: ['a.c', 'b.c'] });
    assert.ok(map.sections.length > 0);
    assert.strictEqual(map.symbols.length, 2);
    assert.ok(map.toJSON().header.inputFiles.includes('a.c'));
    assert.ok(map.toJSON().header.inputFiles.includes('b.c'));
  });

  it('should include relocations in map', () => {
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
    linker.link();

    const map = createLinkMapFromLinker(linker);
    assert.ok(map.relocations.length > 0);
    const json = map.toJSON();
    assert.ok(json.relocations.length > 0);
  });

  it('should include warnings in map', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'undefined_func', 'call', '.text'));

    const linker = new Linker(new LinkerOptions({ resolveExternals: true }));
    linker.addObjectFile(objFile);
    linker.link();

    const map = createLinkMapFromLinker(linker);
    assert.ok(map.warnings.length > 0);
    const json = map.toJSON();
    assert.ok(json.warnings.length > 0);
  });

  it('should include errors in map', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'undefined_func', 'call', '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const map = createLinkMapFromLinker(linker);
    assert.ok(map.errors.length > 0);
    const json = map.toJSON();
    assert.ok(json.errors.length > 0);
  });

  it('should produce valid JSON string', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const map = createLinkMapFromLinker(linker);
    const str = map.toJSONString();
    const parsed = JSON.parse(str);
    assert.ok(parsed.header);
    assert.ok(Array.isArray(parsed.sections));
    assert.ok(Array.isArray(parsed.symbols));
  });
});

describe('Linker.generateJsonMap', () => {
  it('should generate JSON map', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const jsonMap = linker.generateJsonMap();
    assert.ok(typeof jsonMap === 'string');
    const parsed = JSON.parse(jsonMap);
    assert.ok(parsed.header);
    assert.ok(parsed.sections.length > 0);
    assert.ok(parsed.symbols.length > 0);
  });

  it('should include crt0 flag', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const jsonMap = linker.generateJsonMap();
    const parsed = JSON.parse(jsonMap);
    assert.strictEqual(parsed.crt0, true);
  });

  it('should include base address in header', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker(new LinkerOptions({ baseAddress: 0x10000 }));
    linker.addObjectFile(objFile);
    linker.link();

    const jsonMap = linker.generateJsonMap();
    const parsed = JSON.parse(jsonMap);
    assert.strictEqual(parsed.header.baseAddress, 0x10000);
  });
});

describe('Map constants', () => {
  it('should have correct section types', () => {
    assert.strictEqual(MapSectionType.CODE, 'code');
    assert.strictEqual(MapSectionType.DATA, 'data');
    assert.strictEqual(MapSectionType.BSS, 'bss');
    assert.strictEqual(MapSectionType.RODATA, 'rodata');
  });

  it('should have correct symbol types', () => {
    assert.strictEqual(MapSymbolType.FUNCTION, 'function');
    assert.strictEqual(MapSymbolType.VARIABLE, 'variable');
    assert.strictEqual(MapSymbolType.SECTION, 'section');
    assert.strictEqual(MapSymbolType.ABSOLUTE, 'absolute');
    assert.strictEqual(MapSymbolType.LABEL, 'label');
    assert.strictEqual(MapSymbolType.EQUATE, 'equ');
  });

  it('should have correct symbol visibility', () => {
    assert.strictEqual(MapSymbolVisibility.GLOBAL, 'global');
    assert.strictEqual(MapSymbolVisibility.LOCAL, 'local');
    assert.strictEqual(MapSymbolVisibility.WEAK, 'weak');
  });

  it('should have correct relocation types', () => {
    assert.strictEqual(MapRelocationType.ABS8, 'abs8');
    assert.strictEqual(MapRelocationType.ABS16, 'abs16');
    assert.strictEqual(MapRelocationType.PCREL8, 'pcrel8');
    assert.strictEqual(MapRelocationType.PCREL16, 'pcrel16');
    assert.strictEqual(MapRelocationType.CALL, 'call');
    assert.strictEqual(MapRelocationType.JP, 'jp');
    assert.strictEqual(MapRelocationType.LD, 'ld');
  });
});
