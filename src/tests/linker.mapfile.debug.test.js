import { describe, it } from 'mocha';
import assert from 'assert';
import {
  MapSymbol, MapSection, MapRelocation, LinkMap,
  MapSectionType, MapSymbolType, MapSymbolVisibility, MapRelocationType,
  bytesToHex, createLinkMapFromLinker
} from '../../src/linker/mapfile.js';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';
import { Linker, LinkerOptions, ResolvedSymbol } from '../../src/linker/linker.js';

describe('MapSymbol debugging fields', () => {
  it('should create a map symbol with size and line', () => {
    const symbol = new MapSymbol('buf', MapSymbolType.VARIABLE, MapSymbolVisibility.GLOBAL, 0xC000, '.data', 0, 128, 42, 'main.c');
    assert.strictEqual(symbol.name, 'buf');
    assert.strictEqual(symbol.type, MapSymbolType.VARIABLE);
    assert.strictEqual(symbol.visibility, MapSymbolVisibility.GLOBAL);
    assert.strictEqual(symbol.address, 0xC000);
    assert.strictEqual(symbol.section, '.data');
    assert.strictEqual(symbol.value, 0);
    assert.strictEqual(symbol.size, 128);
    assert.strictEqual(symbol.line, 42);
    assert.strictEqual(symbol.sourceFile, 'main.c');
  });

  it('should serialize size and line to JSON', () => {
    const symbol = new MapSymbol('counter', MapSymbolType.VARIABLE, MapSymbolVisibility.GLOBAL, 0xC000, '.data', 0, 4, 15, 'utils.c');
    const json = symbol.toJSON();
    assert.strictEqual(json.size, 4);
    assert.strictEqual(json.line, 15);
    assert.strictEqual(json.sourceFile, 'utils.c');
  });

  it('should default size and line to 0 when not provided', () => {
    const symbol = new MapSymbol('main', MapSymbolType.FUNCTION, MapSymbolVisibility.GLOBAL, 0x8000, '.text', 0);
    assert.strictEqual(symbol.size, 0);
    assert.strictEqual(symbol.line, 0);
    assert.strictEqual(symbol.sourceFile, null);
  });

  it('should serialize defaults to JSON', () => {
    const symbol = new MapSymbol('main', MapSymbolType.FUNCTION, MapSymbolVisibility.GLOBAL, 0x8000, '.text', 0);
    const json = symbol.toJSON();
    assert.strictEqual(json.size, 0);
    assert.strictEqual(json.line, 0);
    assert.strictEqual(json.sourceFile, null);
  });
});

describe('ResolvedSymbol debugging fields', () => {
  it('should create a resolved symbol with size and line', () => {
    const symbol = new ResolvedSymbol('globalVar', 'variable', 0xC000, '.data', 8, 30, 'main.c');
    assert.strictEqual(symbol.name, 'globalVar');
    assert.strictEqual(symbol.address, 0xC000);
    assert.strictEqual(symbol.size, 8);
    assert.strictEqual(symbol.line, 30);
    assert.strictEqual(symbol.sourceFile, 'main.c');
  });

  it('should serialize size and line to JSON', () => {
    const symbol = new ResolvedSymbol('func', 'function', 0x8000, '.text', 0, 5, 'app.c');
    const json = symbol.toJSON();
    assert.strictEqual(json.size, 0);
    assert.strictEqual(json.line, 5);
    assert.strictEqual(json.sourceFile, 'app.c');
  });

  it('should default size and line to 0', () => {
    const symbol = new ResolvedSymbol('unknown', 'variable', 0x0000, null);
    assert.strictEqual(symbol.size, 0);
    assert.strictEqual(symbol.line, 0);
    assert.strictEqual(symbol.sourceFile, null);
  });
});

describe('ObjectSymbol debugging fields', () => {
  it('should create an object symbol with size and line', () => {
    const symbol = new ObjectSymbol('array', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.array', 64, 12, 'test.c');
    assert.strictEqual(symbol.size, 64);
    assert.strictEqual(symbol.line, 12);
    assert.strictEqual(symbol.sourceFile, 'test.c');
  });

  it('should serialize size and line to JSON', () => {
    const symbol = new ObjectSymbol('ptr', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.ptr', 2, 8, 'test.c');
    const json = symbol.toJSON();
    assert.strictEqual(json.size, 2);
    assert.strictEqual(json.line, 8);
    assert.strictEqual(json.sourceFile, 'test.c');
  });

  it('should default size and line to 0', () => {
    const symbol = new ObjectSymbol('label', SymbolType.LABEL, SymbolVisibility.LOCAL, 0, '.text.func');
    assert.strictEqual(symbol.size, 0);
    assert.strictEqual(symbol.line, 0);
    assert.strictEqual(symbol.sourceFile, null);
  });
});

describe('createLinkMapFromLinker with debugging info', () => {
  it('should include symbol size in map', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text.main', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main', 0, 5, 'test.c'));

    const objFile2 = new ObjectFile('data.o');
    const dataSection = new ObjectSection('.data.buf', SectionType.DATA);
    for (let i = 0; i < 32; i++) dataSection.appendByte(0x00);
    objFile2.addSection(dataSection);
    objFile2.addSymbol(new ObjectSymbol('buf', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.buf', 32, 10, 'data.c'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.addObjectFile(objFile2);
    linker.link();

    const map = createLinkMapFromLinker(linker, { inputFiles: ['test.c', 'data.c'] });
    const json = map.toJSON();

    const mainSymbol = json.symbols.find(s => s.name === 'main');
    assert.ok(mainSymbol);
    assert.strictEqual(mainSymbol.size, 0);
    assert.strictEqual(mainSymbol.line, 5);
    assert.strictEqual(mainSymbol.sourceFile, 'test.c');

    const bufSymbol = json.symbols.find(s => s.name === 'buf');
    assert.ok(bufSymbol);
    assert.strictEqual(bufSymbol.size, 32);
    assert.strictEqual(bufSymbol.line, 10);
    assert.strictEqual(bufSymbol.sourceFile, 'data.c');
  });

  it('should include line numbers for functions', () => {
    const objFile = new ObjectFile('funcs.o');
    const section1 = new ObjectSection('.text.foo', SectionType.CODE);
    section1.appendByte(0x3E); section1.appendByte(0x01); section1.appendByte(0xC9);
    objFile.addSection(section1);
    objFile.addSymbol(new ObjectSymbol('foo', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.foo', 0, 3, 'funcs.c'));

    const section2 = new ObjectSection('.text.bar', SectionType.CODE);
    section2.appendByte(0x3E); section2.appendByte(0x02); section2.appendByte(0xC9);
    objFile.addSection(section2);
    objFile.addSymbol(new ObjectSymbol('bar', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.bar', 0, 7, 'funcs.c'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const map = createLinkMapFromLinker(linker);
    const json = map.toJSON();

    const fooSymbol = json.symbols.find(s => s.name === 'foo');
    assert.strictEqual(fooSymbol.line, 3);

    const barSymbol = json.symbols.find(s => s.name === 'bar');
    assert.strictEqual(barSymbol.line, 7);
  });

  it('should include source file in map symbols', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text.a_func', SectionType.CODE);
    section1.appendByte(0xC9);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('a_func', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.a_func', 0, 1, 'a.c'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.data.b_var', SectionType.DATA);
    section2.appendByte(0x42);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('b_var', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.b_var', 1, 20, 'b.c'));

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    linker.link();

    const map = createLinkMapFromLinker(linker, { inputFiles: ['a.c', 'b.c'] });
    const json = map.toJSON();

    const aSymbol = json.symbols.find(s => s.name === 'a_func');
    assert.strictEqual(aSymbol.sourceFile, 'a.c');

    const bSymbol = json.symbols.find(s => s.name === 'b_var');
    assert.strictEqual(bSymbol.sourceFile, 'b.c');
  });
});

describe('Linker.generateJsonMap with debugging info', () => {
  it('should produce JSON with size and line fields', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text.main', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main', 0, 1, 'test.c'));

    const dataSection = new ObjectSection('.data.x', SectionType.DATA);
    dataSection.appendByte(0x00);
    objFile.addSection(dataSection);
    objFile.addSymbol(new ObjectSymbol('x', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.x', 1, 5, 'test.c'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();

    const jsonMap = linker.generateJsonMap();
    const parsed = JSON.parse(jsonMap);

    const mainSym = parsed.symbols.find(s => s.name === 'main');
    assert.strictEqual(mainSym.size, 0);
    assert.strictEqual(mainSym.line, 1);

    const xSym = parsed.symbols.find(s => s.name === 'x');
    assert.strictEqual(xSym.size, 1);
    assert.strictEqual(xSym.line, 5);
  });
});

describe('LinkResult with debugging info', () => {
  it('should include size and line in symbol JSON', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text.main', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main', 0, 1, 'test.c'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    const json = result.toJSON();
    const mainSym = json.symbols.find(s => s.name === 'main');
    assert.strictEqual(mainSym.size, 0);
    assert.strictEqual(mainSym.line, 1);
    assert.strictEqual(mainSym.sourceFile, 'test.c');
  });
});
