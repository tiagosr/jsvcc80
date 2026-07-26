/**
 * Tests for the Z80 Memory module.
 * Covers 64KB memory, fill/clear, access tracking, and mapped regions.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { Memory } from '../simulator/memory.js';

describe('Simulator - Memory', () => {
  it('should create 64KB memory filled with 0xFF', () => {
    const mem = new Memory();
    assert.strictEqual(mem.getSize(), 0x10000);
    assert.strictEqual(mem.readByte(0), 0xFF);
    assert.strictEqual(mem.readByte(0xFFFF), 0xFF);
  });

  it('should fill and clear memory', () => {
    const mem = new Memory();
    mem.fill(0x55);
    for (let i = 0; i < 256; i++) {
      assert.strictEqual(mem.readByte(i), 0x55);
    }
    mem.clear();
    for (let i = 0; i < 256; i++) {
      assert.strictEqual(mem.readByte(i), 0);
    }
  });

  it('should read and write bytes at arbitrary addresses', () => {
    const mem = new Memory();
    for (let i = 0; i < 1000; i++) {
      mem.writeByte(i, i & 0xFF);
    }
    for (let i = 0; i < 1000; i++) {
      assert.strictEqual(mem.readByte(i), i & 0xFF);
    }
  });

  it('should read and write words (little-endian)', () => {
    const mem = new Memory();
    mem.writeWord(0x100, 0xABCD);
    assert.strictEqual(mem.readWord(0x100), 0xABCD);
    mem.writeWord(0x5000, 0x1234);
    assert.strictEqual(mem.readWord(0x5000), 0x1234);
  });

  it('should track access when enabled', () => {
    const mem = new Memory({ trackAccess: true });
    mem.writeByte(0x100, 0x42);
    mem.readByte(0x200);
    mem.writeByte(0x300, 0x80);
    const log = mem.getAccessLog();
    assert.strictEqual(log.write.length, 2);
    assert.strictEqual(log.read.length, 1);
    assert.strictEqual(log.write[0], 0x100);
    assert.strictEqual(log.write[1], 0x300);
    assert.strictEqual(log.read[0], 0x200);
  });

  it('should clear access log', () => {
    const mem = new Memory({ trackAccess: true });
    mem.writeByte(0x100, 0x42);
    mem.clearAccessLog();
    const log = mem.getAccessLog();
    assert.strictEqual(log.write.length, 0);
    assert.strictEqual(log.read.length, 0);
  });

  it('should throw when getting access log without tracking', () => {
    const mem = new Memory();
    assert.throws(() => mem.getAccessLog(), /tracking/);
  });

  it('should support mapped regions with masking', () => {
    const mem = new Memory();
    mem.addRegion({ start: 0xE000, end: 0xEFFF, mask: 0xF0 });
    mem.writeByte(0xE050, 0xAB);
    assert.strictEqual(mem.readByte(0xE050), 0xA0);
  });

  it('should fill memory with custom value', () => {
    const mem = new Memory({ fill: 0xAA });
    assert.strictEqual(mem.readByte(0), 0xAA);
    assert.strictEqual(mem.readByte(0x8000), 0xAA);
  });
});
