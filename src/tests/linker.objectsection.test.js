import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectSection, ObjectRelocation, SectionType, RelocationType
} from '../../src/linker/objectfile.js';

describe('ObjectSection', () => {
  it('should create empty section', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    assert.strictEqual(section.name, '.text');
    assert.strictEqual(section.type, SectionType.CODE);
    assert.strictEqual(section.size(), 0);
  });

  it('should append bytes', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    assert.strictEqual(section.size(), 2);
    assert.strictEqual(section.contents[0], 0x3E);
    assert.strictEqual(section.contents[1], 0x42);
  });

  it('should append word in little-endian', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendWord(0x1234);
    assert.strictEqual(section.size(), 2);
    assert.strictEqual(section.contents[0], 0x34);
    assert.strictEqual(section.contents[1], 0x12);
  });

  it('should append data buffer', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.append(new Uint8Array([0x01, 0x02, 0x03]));
    assert.strictEqual(section.size(), 3);
  });

  it('should add relocation', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    const reloc = new ObjectRelocation(0, 'helper', RelocationType.CALL, '.text');
    section.addRelocation(reloc);
    assert.strictEqual(section.relocations.length, 1);
  });

  it('should serialize to JSON', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    const json = section.toJSON();
    assert.strictEqual(json.name, '.text');
    assert.strictEqual(json.type, SectionType.CODE);
    assert.strictEqual(json.size, 1);
  });
});
