import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectRelocation, RelocationType
} from '../../src/linker/objectfile.js';

describe('ObjectRelocation', () => {
  it('should create relocation entry', () => {
    const reloc = new ObjectRelocation(2, 'helper', RelocationType.CALL, '.text', 0);
    assert.strictEqual(reloc.offset, 2);
    assert.strictEqual(reloc.symbolName, 'helper');
    assert.strictEqual(reloc.type, RelocationType.CALL);
  });

  it('should serialize to JSON', () => {
    const reloc = new ObjectRelocation(0, 'main', RelocationType.ABS8, '.text', 1);
    const json = reloc.toJSON();
    assert.strictEqual(json.addend, 1);
  });
});
