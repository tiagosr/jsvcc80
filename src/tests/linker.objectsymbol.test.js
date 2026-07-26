import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectSymbol, SymbolType, SymbolVisibility
} from '../../src/linker/objectfile.js';

describe('ObjectSymbol', () => {
  it('should create function symbol', () => {
    const symbol = new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main');
    assert.strictEqual(symbol.name, 'main');
    assert.strictEqual(symbol.type, SymbolType.FUNCTION);
    assert.strictEqual(symbol.visibility, SymbolVisibility.GLOBAL);
  });

  it('should create variable symbol', () => {
    const symbol = new ObjectSymbol('globalVar', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.globalVar');
    assert.strictEqual(symbol.type, SymbolType.VARIABLE);
    assert.strictEqual(symbol.section, '.data.globalVar');
  });

  it('should serialize to JSON', () => {
    const symbol = new ObjectSymbol('test', SymbolType.FUNCTION, SymbolVisibility.LOCAL, 5, '.text.test');
    const json = symbol.toJSON();
    assert.strictEqual(json.name, 'test');
    assert.strictEqual(json.value, 5);
  });
});
