import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';

describe('ObjectFile', () => {
  it('should create object file', () => {
    const objFile = new ObjectFile('test.o');
    assert.strictEqual(objFile.name, 'test.o');
    assert.strictEqual(objFile.sections.length, 0);
    assert.strictEqual(objFile.symbols.length, 0);
  });

  it('should add section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    assert.strictEqual(objFile.sections.length, 1);
  });

  it('should add symbol', () => {
    const objFile = new ObjectFile('test.o');
    const symbol = new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text');
    objFile.addSymbol(symbol);
    assert.strictEqual(objFile.symbols.length, 1);
  });

  it('should get section by name', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    assert.strictEqual(objFile.getSection('.text'), section);
    assert.strictEqual(objFile.getSection('.data'), null);
  });

  it('should get symbol by name', () => {
    const objFile = new ObjectFile('test.o');
    const symbol = new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text');
    objFile.addSymbol(symbol);
    assert.strictEqual(objFile.getSymbol('main'), symbol);
    assert.strictEqual(objFile.getSymbol('other'), null);
  });

  it('should add relocation to section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    const reloc = new ObjectRelocation(0, 'main', RelocationType.CALL, '.text');
    objFile.addRelocation(reloc);
    assert.strictEqual(section.relocations.length, 1);
  });

  it('should serialize to JSON', () => {
    const objFile = new ObjectFile('test.o');
    objFile.addSection(new ObjectSection('.text', SectionType.CODE));
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    const json = objFile.toJSON();
    assert.strictEqual(json.name, 'test.o');
    assert.strictEqual(json.sections.length, 1);
    assert.strictEqual(json.symbols.length, 1);
  });
});
