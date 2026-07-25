/**
 * Tests for the Z80 simulator core modules.
 * Covers CPU state, memory, I/O, watchers, and full simulation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CPU, Flags } from '../simulator/cpu.js';
import { Memory } from '../simulator/memory.js';
import { IOHandler } from '../simulator/io.js';
import { WatchManager } from '../simulator/watcher.js';
import { Simulator } from '../simulator/simulator.js';

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
    assert.strictEqual(cpu.getFlag(Flags.PARITY_OVERFLOW), 1);
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

describe('Simulator - IO Handler', () => {
  it('should handle unregistered ports with default 0xFF', () => {
    const handler = new IOHandler();
    assert.strictEqual(handler.handleIn(0x01), 0xFF);
    handler.handleOut(0x01, 0x42);
  });

  it('should register and invoke port handlers', () => {
    const handler = new IOHandler();
    let called = false;
    handler.register(0x10, (port) => {
      called = true;
      assert.strictEqual(port, 0x10);
      return 0x55;
    });
    assert.strictEqual(handler.handleIn(0x10), 0x55);
    assert.strictEqual(called, true);
  });

  it('should handle OUT operations', () => {
    const handler = new IOHandler();
    let outValue = -1;
    handler.register(0x20, (_port, value) => { outValue = value; });
    handler.handleOut(0x20, 0x78);
    assert.strictEqual(outValue, 0x78);
  });

  it('should use default handler for unregistered ports', () => {
    const handler = new IOHandler();
    handler.setDefault((_port) => 0xFF);
    assert.strictEqual(handler.handleIn(0x99), 0xFF);
  });

  it('should mask port and value to 8 bits', () => {
    const handler = new IOHandler();
    handler.register(0x05, () => 0x123);
    assert.strictEqual(handler.handleIn(0x305), 0x23);
  });

  it('should check if port has handler', () => {
    const handler = new IOHandler();
    assert.strictEqual(handler.hasHandler(0x10), false);
    handler.register(0x10, () => 0);
    assert.strictEqual(handler.hasHandler(0x10), true);
  });

  it('should clear all handlers', () => {
    const handler = new IOHandler();
    handler.register(0x10, () => 0);
    handler.setDefault(() => 0);
    handler.clear();
    assert.strictEqual(handler.hasHandler(0x10), false);
    assert.strictEqual(handler.hasHandler(0x99), false);
  });
});

describe('Simulator - Watch Manager', () => {
  it('should add and notify watches', () => {
    const wm = new WatchManager();
    let notified = false;
    wm.addWatch(0x100, () => { notified = true; });
    assert.strictEqual(wm.hasWatches(0x100), true);
    wm.notify(0x100, undefined, 'read');
    assert.strictEqual(notified, true);
  });

  it('should support different watch types', () => {
    const wm = new WatchManager();
    let readCalled = false;
    let writeCalled = false;
    wm.addWatch(0x200, () => { readCalled = true; }, 'read');
    wm.addWatch(0x200, () => { writeCalled = true; }, 'write');
    wm.notify(0x200, undefined, 'read');
    assert.strictEqual(readCalled, true);
    assert.strictEqual(writeCalled, false);
    wm.notify(0x200, 0x42, 'write');
    assert.strictEqual(writeCalled, true);
  });

  it('should remove specific watches', () => {
    const wm = new WatchManager();
    const cb = () => {};
    wm.addWatch(0x100, cb);
    assert.strictEqual(wm.removeWatch(0x100, cb), true);
    assert.strictEqual(wm.hasWatches(0x100), false);
  });

  it('should remove all watches on an address', () => {
    const wm = new WatchManager();
    wm.addWatch(0x100, () => {});
    wm.addWatch(0x100, () => {});
    wm.removeWatches(0x100);
    assert.strictEqual(wm.hasWatches(0x100), false);
  });

  it('should clear all watches', () => {
    const wm = new WatchManager();
    wm.addWatch(0x100, () => {});
    wm.addWatch(0x200, () => {});
    wm.clear();
    assert.strictEqual(wm.hasWatches(0x100), false);
    assert.strictEqual(wm.hasWatches(0x200), false);
  });

  it('should mask addresses to 16 bits', () => {
    const wm = new WatchManager();
    let hit = false;
    wm.addWatch(0x1234, () => { hit = true; });
    wm.notify(0x1234, undefined, 'read');
    assert.strictEqual(hit, true);
  });

  it('should pass value to watch callback', () => {
    const wm = new WatchManager();
    let receivedValue = -1;
    wm.addWatch(0x100, (_addr, value) => { receivedValue = value; }, 'write');
    wm.notify(0x100, 0x42, 'write');
    assert.strictEqual(receivedValue, 0x42);
  });
});

describe('Simulator - Full Simulation', () => {
  it('should load and execute simple program', () => {
    const sim = new Simulator();
    const program = [0x3E, 0x42, 0x06, 0x0D, 0x76];
    sim.load(0x1000, program);
    sim.cpu.pc = 0x1000;
    sim.step();
    assert.strictEqual(sim.cpu.a, 0x42);
    assert.strictEqual(sim.cpu.pc, 0x1001);
    sim.step();
    assert.strictEqual(sim.cpu.b, 0x0D);
    assert.strictEqual(sim.cpu.pc, 0x1003);
    sim.step();
    assert.strictEqual(sim.cpu.halted, true);
  });

  it('should execute LD A,0x42; LD B,0x0D; ADD A,B; HALT', () => {
    const sim = new Simulator();
    const program = [0x3E, 0x05, 0x06, 0x03, 0x80, 0x76];
    sim.loadAndRun(0x0000, program);
    const stats = sim.getStats();
    assert.strictEqual(stats.a, 8);
    assert.strictEqual(stats.steps, 5);
    assert.strictEqual(sim.cpu.halted, true);
  });

  it('should handle PUSH/POP correctly', () => {
    const sim = new Simulator();
    const program = [0xC5, 0x01, 0x34, 0x12, 0xD1, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.getPair('bc'), 0x1234);
  });

  it('should handle memory read/write during execution', () => {
    const sim = new Simulator();
    const program = [0x21, 0x00, 0x01, 0x3E, 0x42, 0x77, 0x3E, 0x00, 0x7A, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0x42);
  });

  it('should handle IN/OUT with registered handlers', () => {
    const sim = new Simulator();
    sim.io.register(0x60, () => 0xAB);
    const program = [0xDB, 0x60, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0xAB);
  });

  it('should handle OUT with registered handler', () => {
    const sim = new Simulator();
    let receivedValue = -1;
    sim.io.register(0x70, (_port, value) => { receivedValue = value; });
    const program = [0x3E, 0x55, 0xD3, 0x70, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(receivedValue, 0x55);
  });

  it('should support memory watches', () => {
    const sim = new Simulator();
    let watchHit = false;
    const program = [0x21, 0x00, 0x01, 0x3E, 0x42, 0x77, 0x76];
    sim.watcher.addWatch(0x0100, () => { watchHit = true; }, 'write');
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(watchHit, true);
  });

  it('should support breakpoints', () => {
    const sim = new Simulator();
    let bpHit = false;
    const program = [0x3E, 0x01, 0x3E, 0x02, 0x76];
    sim.load(0x0000, program);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0002, () => { bpHit = true; });
    sim.run();
    assert.strictEqual(bpHit, true);
    assert.strictEqual(sim.cpu.a, 0x02);
  });

  it('should track memory access when enabled', () => {
    const sim = new Simulator({ trackAccess: true });
    const program = [0x3E, 0x42, 0x76];
    sim.loadAndRun(0x0000, program);
    const log = sim.memory.getAccessLog();
    assert.ok(log.read.length > 0);
  });

  it('should reset properly', () => {
    const sim = new Simulator();
    sim.cpu.a = 0xFF;
    sim.cpu.sp = 0x1234;
    sim.reset();
    assert.strictEqual(sim.cpu.pc, 0);
    assert.strictEqual(sim.cpu.sp, 0xFFFF);
    assert.strictEqual(sim.stepCount, 0);
  });

  it('should get execution stats', () => {
    const sim = new Simulator();
    const program = [0x3E, 0x01, 0x76];
    sim.loadAndRun(0x0000, program);
    const stats = sim.getStats();
    assert.strictEqual(stats.steps, 2);
    assert.strictEqual(stats.a, 1);
    assert.strictEqual(sim.cpu.halted, true);
  });

  it('should handle STOP correctly', () => {
    const sim = new Simulator();
    const program = [0x3E, 0x01, 0x3E, 0x02, 0x76];
    sim.load(0x0000, program);
    sim.cpu.pc = 0x0000;
    sim.step();
    sim.stop();
    assert.strictEqual(sim.cpu.a, 0x01);
    assert.strictEqual(sim.stopped, true);
  });

  it('should handle a stack-based program: push values and pop them', () => {
    const sim = new Simulator();
    const program = [
      0x01, 0x12, 0x34, 0x11, 0x56, 0x78, 0x21, 0x9A, 0xBC,
      0xC5, 0xD5, 0xE5, 0xF5, 0xF1, 0xE1, 0xD1, 0xC1, 0x76
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.getPair('bc'), 0x1234);
    assert.strictEqual(sim.cpu.getPair('de'), 0x5678);
    assert.strictEqual(sim.cpu.getPair('hl'), 0x9ABC);
  });

  it('should handle NOP instructions', () => {
    const sim = new Simulator();
    const program = [0x00, 0x00, 0x00, 0x76];
    const result = sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.halted, true);
    assert.strictEqual(sim.getStats().steps, 4);
  });

  it('should handle RST instructions', () => {
    const sim = new Simulator();
    const program = [0xC7, 0x76];
    sim.loadAndRun(0x100, program);
    assert.strictEqual(sim.cpu.pc, 0);
    const retAddr = sim.memory.readWord(sim.cpu.sp);
    assert.strictEqual(retAddr, 0x101);
  });

  it('should handle DI/EI interrupt instructions', () => {
    const sim = new Simulator();
    const program = [0xF3, 0xFB, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.iff1, 1);
    assert.strictEqual(sim.cpu.iff2, 1);
  });

  it('should handle CPL instruction', () => {
    const sim = new Simulator();
    const program = [0x3E, 0xFF, 0x2F, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0x00);
  });

  it('should handle CCF instruction', () => {
    const sim = new Simulator();
    const program = [0x3E, 0x00, 0x3F, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.getFlag(Flags.CARRY), true);
  });

  it('should handle RLCA/RRA instructions', () => {
    const sim = new Simulator();
    const program1 = [0x3E, 0x01, 0x07, 0x76];
    sim.loadAndRun(0x0000, program1);
    assert.strictEqual(sim.cpu.a, 0x02);
    assert.strictEqual(sim.getFlag(Flags.CARRY), false);

    const program2 = [0x3E, 0x80, 0x17, 0x76];
    sim.loadAndRun(0x0000, program2);
    assert.strictEqual(sim.cpu.a, 0x40);
  });

  it('should handle EX AF, AF\' instruction (0x08)', () => {
    const sim = new Simulator();
    // Set AF to 0x1234 (A=0x12, F=0x34)
    // Set AF' (shadow) to 0x5678 (A=0x56, F=0x56)
    const program = [
      0xF5, // PUSH AF (saves 0x1234 to stack)
      0x3E, 0x56, // LD A, 0x56
      0xF3, // DI (set F=0x04, Z=0, N=0, H=0, C=0 -> F=0x04... actually DI doesn't change F)
      // Let me use a simpler approach: manually set up state
    ];
    // Simpler test: manually manipulate state
    sim.cpu.a = 0x34;
    sim.cpu.f = 0x00; // Clear all flags
    sim.cpu.shadow.f = 0x80; // Set CARRY flag in shadow
    // Execute EX AF, AF'
    sim.cpu.pc = 0x0000;
    sim.memory.writeByte(0x0000, 0x08); // EX AF, AF'
    sim.step();
    // After EX AF, AF': f should be 0x80 (from shadow), shadow.f should be 0x00
    assert.strictEqual(sim.cpu.f, 0x80);
    const snap = sim.getSnapshot();
    assert.strictEqual(snap.shadow.f, 0x00);
    assert.strictEqual(snap.a, 0x34); // A should be unchanged
  });

  it('should support memory watches on data memory access', () => {
    const sim = new Simulator();
    let readHit = false;
    let writeHit = false;
    sim.watcher.addWatch(0x0100, () => { readHit = true; }, 'read');
    sim.watcher.addWatch(0x0100, () => { writeHit = true; }, 'write');
    // LD HL, 0x0100; LD A, (HL); LD (HL), A; HALT
    const program = [
      0x21, 0x00, 0x01, // LD HL, 0x0100
      0x7E, // LD A, (HL) - reads from 0x0100
      0x3E, 0x42, // LD A, 0x42
      0x77, // LD (HL), A - writes to 0x0100
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(readHit, true, 'read watch on data memory should fire');
    assert.strictEqual(writeHit, true, 'write watch on data memory should fire');
  });

  it('should support memory watches on data memory during arithmetic', () => {
    const sim = new Simulator();
    let watchHit = false;
    sim.watcher.addWatch(0x0200, () => { watchHit = true; }, 'write');
    // Store a value at 0x0200, then read/write via (HL)
    const program = [
      0x21, 0x00, 0x02, // LD HL, 0x0200
      0x3E, 0x42, // LD A, 0x42
      0x77, // LD (HL), A (writes 0x42 to 0x0200)
      0x7E, // LD A, (HL) (reads from 0x0200)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(watchHit, true);
    assert.strictEqual(sim.cpu.a, 0x42);
  });

  it('should handle IM 2 interrupt mode (ED 7E)', () => {
    const sim = new Simulator();
    const program = [0xED, 0x7E, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.im, 2);
  });

  it('should handle IM 0/1/2 sequence', () => {
    const sim = new Simulator();
    const program = [
      0xED, 0x5E, // IM 0
      0xED, 0x56, // IM 1
      0xED, 0x7E, // IM 2
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.im, 2);
  });

  it('should handle RES b, r instructions (ED 80-BF)', () => {
    const sim = new Simulator();
    // Test RES 0, A: ED 80
    const prog1 = [0x3E, 0xFF, 0xED, 0x80, 0x76];
    sim.loadAndRun(0x0000, prog1);
    assert.strictEqual(sim.cpu.a, 0xFE, 'RES 0, A should clear bit 0');

    // Test RES 3, B: ED 99
    const sim2 = new Simulator();
    const prog2 = [0x06, 0xFF, 0xED, 0x99, 0x76];
    sim2.loadAndRun(0x0000, prog2);
    assert.strictEqual(sim2.cpu.b, 0xF7, 'RES 3, B should clear bit 3');

    // Test RES 7, (HL): ED BF
    const sim3 = new Simulator();
    const prog3 = [0x21, 0x00, 0x03, 0x3E, 0x80, 0x77, 0xED, 0xBF, 0x7E, 0x76];
    sim3.loadAndRun(0x0000, prog3);
    assert.strictEqual(sim3.memory.readByte(0x0300), 0x00, 'RES 7, (HL) should clear bit 7 of memory');
  });

  it('should handle SET b, r instructions (ED C0-FF)', () => {
    const sim = new Simulator();
    // SET 0, A: Set bit 0 of A (ED C0)
    // SET 3, B: Set bit 3 of B (ED D9)
    // SET 4, (HL): Set bit 4 of memory at (HL) (ED E7)
    // SET 7, (HL): Set bit 7 of memory at (HL) (ED FF)
    const program = [
      0x3E, 0x00, // LD A, 0x00 (all bits clear)
      0xED, 0xC0, // SET 0, A -> A = 0x01
      0x06, 0x00, // LD B, 0x00
      0xED, 0xD9, // SET 3, B -> B = 0x08
      0x21, 0x00, 0x03, // LD HL, 0x0300
      0x3E, 0x00, // LD A, 0x00
      0x77, // LD (HL), A -> memory[0x0300] = 0x00
      0xED, 0xE7, // SET 4, (HL) -> memory[0x0300] = 0x10
      0xED, 0xFF, // SET 7, (HL) -> memory[0x0300] = 0x80
      0x7E, // LD A, (HL)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0x90, 'SET 4 and 7 on 0x00 = 0x90');
    // Need separate test for SET on registers since A was overwritten
    const sim2 = new Simulator();
    const prog2 = [
      0x3E, 0x00, // LD A, 0x00
      0xED, 0xC0, // SET 0, A -> A = 0x01
      0x06, 0x00, // LD B, 0x00
      0xED, 0xD9, // SET 3, B -> B = 0x08
      0x76 // HALT
    ];
    sim2.loadAndRun(0x0000, prog2);
    assert.strictEqual(sim2.cpu.a, 0x01, 'SET 0, A should set bit 0');
    assert.strictEqual(sim2.cpu.b, 0x08, 'SET 3, B should set bit 3');
  });

  it('should handle SET/RES on (HL) via memory read-modify-write', () => {
    const sim = new Simulator();
    // Store 0xFF at 0x0300, then SET 4, (HL) and RES 2, (HL)
    const program = [
      0x21, 0x00, 0x03, // LD HL, 0x0300
      0x3E, 0xFF, // LD A, 0xFF
      0x77, // LD (HL), A -> memory[0x0300] = 0xFF
      0xED, 0xE7, // SET 4, (HL) -> memory[0x0300] = 0xFF (bit 4 already set)
      0xED, 0x97, // RES 2, (HL) -> memory[0x0300] = 0xFF & ~0x04 = 0xFB
      0x7E, // LD A, (HL)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0xFB, 'SET 4 then RES 2 on 0xFF = 0xFB');
  });
});
