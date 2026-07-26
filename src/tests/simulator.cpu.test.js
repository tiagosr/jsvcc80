/**
 * Tests for the Z80 CPU core module.
 * Covers register state, flags, stack operations, and memory access.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { CPU, Flags } from '../simulator/cpu.js';
import { Memory } from '../simulator/memory.js';

describe('Simulator - CPU', () => {
  it('should initialize with reset values', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    const snap = cpu.getSnapshot();
    assert.strictEqual(snap.pc, 0);
    assert.strictEqual(snap.sp, 0xFFFF);
    assert.strictEqual(snap.a, 0);
    assert.strictEqual(snap.f, 0);
    assert.strictEqual(snap.iff1, 0);
    assert.strictEqual(snap.halted, false);
  });

  it('should set and get individual registers', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.a = 0x55; cpu.b = 0xAA; cpu.c = 0x12;
    cpu.d = 0x34; cpu.e = 0x56; cpu.h = 0x78; cpu.l = 0x9A;
    assert.strictEqual(cpu.a, 0x55);
    assert.strictEqual(cpu.b, 0xAA);
    assert.strictEqual(cpu.c, 0x12);
    assert.strictEqual(cpu.d, 0x34);
    assert.strictEqual(cpu.e, 0x56);
    assert.strictEqual(cpu.h, 0x78);
    assert.strictEqual(cpu.l, 0x9A);
  });

  it('should mask registers to 8/16 bits', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.a = 0x123;
    assert.strictEqual(cpu.a, 0x23);
    cpu.sp = 0x12345;
    assert.strictEqual(cpu.sp, 0x2345);
  });

  it('should get and set register pairs', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.setPair('bc', 0x1234);
    assert.strictEqual(cpu.getPair('bc'), 0x1234);
    cpu.setPair('de', 0x5678);
    assert.strictEqual(cpu.getPair('de'), 0x5678);
    cpu.setPair('hl', 0x9ABC);
    assert.strictEqual(cpu.getPair('hl'), 0x9ABC);
    cpu.setPair('sp', 0xDEF0);
    assert.strictEqual(cpu.getPair('sp'), 0xDEF0);
  });

  it('should handle flags correctly', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    assert.strictEqual(cpu.getFlag(Flags.ZERO), false);
    assert.strictEqual(cpu.getFlag(Flags.CARRY), false);
    cpu.setFlag(Flags.ZERO, true);
    assert.strictEqual(cpu.getFlag(Flags.ZERO), true);
    cpu.setFlag(Flags.CARRY, true);
    assert.strictEqual(cpu.getFlag(Flags.CARRY), true);
  });

  it('should set flags from 8-bit value', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.setFlags8(0);
    assert.strictEqual(cpu.getFlag(Flags.ZERO), true);
    cpu.setFlags8(0xFF);
    assert.strictEqual(cpu.getFlag(Flags.ZERO), false);
    assert.strictEqual(cpu.getFlag(Flags.PARITY_OVERFLOW), true);
  });

  it('should push and pop from stack', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.sp = 0xFFFE;
    cpu.push(0x1234);
    assert.strictEqual(cpu.sp, 0xFFFC);
    const val = cpu.pop();
    assert.strictEqual(val, 0x1234);
    assert.strictEqual(cpu.sp, 0xFFFE);
  });

  it('should snapshot and restore state', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.a = 0x55; cpu.b = 0xAA; cpu.sp = 0x1234;
    const snap = cpu.getSnapshot();
    cpu.a = 0; cpu.b = 0; cpu.sp = 0;
    cpu.restoreSnapshot(snap);
    assert.strictEqual(cpu.a, 0x55);
    assert.strictEqual(cpu.b, 0xAA);
    assert.strictEqual(cpu.sp, 0x1234);
  });

  it('should read and write bytes through memory', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.writeByte(0x1000, 0x42);
    assert.strictEqual(cpu.readByte(0x1000), 0x42);
  });

  it('should read and write words through memory', () => {
    const mem = new Memory();
    const cpu = new CPU(mem);
    cpu.writeWord(0x1000, 0x1234);
    assert.strictEqual(cpu.readWord(0x1000), 0x1234);
  });
});
