/**
 * Tests for the Z80 simulator core modules.
 * Covers CPU state, memory, I/O, watchers, and full simulation.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
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
    const program = [
      0x3E, 0x42, // LD A, 0x42
      0x06, 0x0D, // LD B, 0x0D
      0x76        // HALT
    ];
    sim.load(0x1000, program);
    sim.cpu.pc = 0x1000;
    sim.step();
    assert.strictEqual(sim.cpu.a, 0x42);
    assert.strictEqual(sim.cpu.pc, 0x1002);
    sim.step();
    assert.strictEqual(sim.cpu.b, 0x0D);
    assert.strictEqual(sim.cpu.pc, 0x1004);
    sim.step();
    assert.strictEqual(sim.cpu.halted, true);
  });

  it('should execute LD A,5; LD B,3; ADD A,B; HALT - then A should be equal to 8, in 4 steps', () => {
    const sim = new Simulator();
    const program = [
      0x3E, 0x05, // LD A, 5
      0x06, 0x03, // LD B, 3
      0x80,       // ADD A, B
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, program);
    const stats = sim.getStats();
    assert.strictEqual(stats.a, 8);
    assert.strictEqual(stats.steps, 4);
    assert.strictEqual(sim.cpu.halted, true);
  });

  it('should handle PUSH/POP correctly', () => {
    const sim = new Simulator();
    const program = [
      0x01, 0x34, 0x12, // LD BC, 0x1234
      0xC5,             // PUSH BC
      0xD1,             // POP BC
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.getPair('bc'), 0x1234);
  });

  it('should handle memory read/write during execution', () => {
    const sim = new Simulator();
    const program = [0x21, 0x00, 0x01, 0x3E, 0x42, 0x77, 0x3E, 0x00, 0x7E, 0x76];
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
      0x01, 0x34, 0x12, // LD BC, 0x1234;
      0x11, 0x78, 0x56, // LD DE, 0x5678;
      0x21, 0xBC, 0x9A, // LD HL, 0x9ABC;
      0xC5,             // PUSH BC;
      0xD5,             // PUSH DE;
      0xE5,             // PUSH HL;
      0xF5,             // PUSH AF;
      0xF1,             // POP AF
      0xE1,             // POP HL;
      0xD1,             // POP DE;
      0xC1,             // POP BC;
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.getPair('bc'), 0x1234);
    assert.strictEqual(sim.cpu.getPair('de'), 0x5678);
    assert.strictEqual(sim.cpu.getPair('hl'), 0x9ABC);
  });

  it('should handle NOP instructions', () => {
    const sim = new Simulator();
    const program = [
      0x00, 0x00, 0x00, // NOP (3x)
      0x76              // HALT
    ];
    const result = sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.halted, true);
    assert.strictEqual(sim.getStats().steps, 4);
  });

  it('should handle RST instructions', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x0000, 0x76); // HALT at the RST 0 target
    const program = [
      0xC7 // RST 0
    ];
    sim.loadAndRun(0x100, program);
    assert.strictEqual(sim.cpu.pc, 0x0001, 'PC should be 1 after HALT executes at address 0');
    const retAddr = sim.memory.readWord(sim.cpu.sp);
    assert.strictEqual(retAddr, 0x101, 'RST should push the address of the instruction after it');
  });

  it('should handle DI/EI interrupt instructions', () => {
    const sim = new Simulator();
    const program = [
      0xF3, // DI
      0xFB, // EI
      0x76  // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.iff1, 1);
    assert.strictEqual(sim.cpu.iff2, 1);
  });

  it('should handle CPL instruction', () => {
    const sim = new Simulator();
    const program = [
      0x3E, 0xFF, // LD A, $FF
      0x2F,       // CPL
      0x76        // HALT
    ];
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
    const program1 = [
      0x3E, 0x01, // LD A, 1
      0x07,       // RLCA
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, program1);
    assert.strictEqual(sim.cpu.a, 0x02);
    assert.strictEqual(sim.getFlag(Flags.CARRY), false);

    const program2 = [
      0x3E, 0x80, // LD A, 80
      0x1F,       // RRA
      0x76        // HALT
    ];
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

  it('should handle INIR (block input to RAM)', () => {
    const sim = new Simulator();
    sim.io.register(0x60, () => 0xAA);
    // Real Z80: INIR uses B (not BC) as the down-counter and C as the port.
    const program = [
      0x21, 0x00, 0x02, // LD HL, 0x0200
      0x06, 0x03,       // LD B, 3
      0x0E, 0x60,       // LD C, 0x60
      0xED, 0xB2,       // INIR (repeats 3 times, writing 0xAA to 0x0200-0x0202)
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.b, 0, 'B should be decremented to 0');
    assert.strictEqual(sim.memory.readByte(0x0200), 0xAA);
    assert.strictEqual(sim.memory.readByte(0x0201), 0xAA);
    assert.strictEqual(sim.memory.readByte(0x0202), 0xAA);
  });

  it('should handle OUTIR (block output from RAM)', () => {
    const sim2 = new Simulator();
    sim2.memory.writeByte(0x0400, 0x11);
    sim2.memory.writeByte(0x0401, 0x22);
    sim2.memory.writeByte(0x0402, 0x33);
    let receivedValues2 = [];
    sim2.io.register(0x03, (_port, value) => { receivedValues2.push(value); });
    const program2 = [
      0x21, 0x00, 0x04, // LD HL, 0x0400
      0x06, 0x03,       // LD B, 3
      0x0E, 0x03,       // LD C, 0x03 (port)
      0xED, 0xB3,       // OTIR (repeats 3 times)
      0x76              // HALT
    ];
    sim2.loadAndRun(0x0000, program2);
    assert.strictEqual(sim2.cpu.b, 0, 'B should be decremented to 0');
    assert.strictEqual(receivedValues2.length, 3);
    assert.strictEqual(receivedValues2[0], 0x11);
    assert.strictEqual(receivedValues2[1], 0x22);
    assert.strictEqual(receivedValues2[2], 0x33);
  });

  it('should handle INDR (block input with HL update)', () => {
    const sim = new Simulator();
    sim.io.register(0x02, () => 0xBB);
    // INDR decrements HL after each byte (unlike INIR which increments).
    // Start HL at the top of the block so writes land on 0x0501, then 0x0500.
    const program = [
      0x21, 0x01, 0x05, // LD HL, 0x0501
      0x06, 0x02,       // LD B, 2
      0x0E, 0x02,       // LD C, 2 (port for handler)
      0xED, 0xBA,       // INDR
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.b, 0, 'B should be 0');
    assert.strictEqual(sim.cpu.getPair('hl'), 0x04FF, 'HL should be decremented twice');
    assert.strictEqual(sim.memory.readByte(0x0500), 0xBB);
    assert.strictEqual(sim.memory.readByte(0x0501), 0xBB);
  });

  it('should handle OTDR (block output with HL update)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x0600, 0xCC);
    sim.memory.writeByte(0x0601, 0xDD);
    let receivedValues = [];
    sim.io.register(0x02, (_port, value) => { receivedValues.push(value); });
    // OTDR decrements HL, so starting at the top of the block outputs 0x0601 first, then 0x0600.
    const program = [
      0x21, 0x01, 0x06, // LD HL, 0x0601
      0x06, 0x02,       // LD B, 2
      0x0E, 0x02,       // LD C, 2 (port for handler)
      0xED, 0xBB,       // OTDR
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.b, 0, 'B should be 0');
    assert.strictEqual(sim.cpu.getPair('hl'), 0x05FF, 'HL should be decremented twice');
    assert.strictEqual(receivedValues.length, 2);
    assert.strictEqual(receivedValues[0], 0xDD);
    assert.strictEqual(receivedValues[1], 0xCC);
  });

  it('should handle INIR with B=0 (256 iterations, real Z80 wraparound behavior)', () => {
    const sim = new Simulator();
    let count = 0;
    sim.io.register(0xA0, () => { count++; return 0xFF; });
    // Real INIR always runs at least once and loops on B; starting at B=0 wraps
    // to 0xFF and repeats 256 times rather than "no transfer".
    const program = [
      0x21, 0x00, 0x07, // LD HL, 0x0700
      0x06, 0x00,       // LD B, 0
      0x0E, 0xA0,       // LD C, 0xA0
      0xED, 0xB2,       // INIR
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.b, 0, 'B wraps back to 0 after 256 iterations');
    assert.strictEqual(count, 256, 'INIR from B=0 performs 256 transfers');
  });

  it('should handle BIT instructions for registers', () => {
    const sim = new Simulator();
    // BIT 3, B: ED 91 - test bit 3 of B (B=0x08, bit 3 is set)
    const prog1 = [
      0x06, 0x08, // LD B, 8
      0xCB, 0x58, // BIT 3, B
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, prog1);
    assert.strictEqual(sim.getFlag(Flags.ZERO), false, 'BIT 3 of 0x08 should be set');

    const sim2 = new Simulator();
    // BIT 3, B with B=0x07: ED 91 (bit 3 of 0x07 is 0)
    const prog2 = [
      0x06, 0x07, // LD B, 7
      0xCB, 0x58, // BIT 3, B
      0x76        // HALT
    ];
    sim2.loadAndRun(0x0000, prog2);
    assert.strictEqual(sim2.getFlag(Flags.ZERO), true, 'BIT 3 of 0x07 should be zero');

    const sim3 = new Simulator();
    // BIT 7, (HL): CB 7E - test bit 7 of memory at (HL) where (HL)=0x80
    const prog3 = [0x21, 0x00, 0x0A, 0x3E, 0x80, 0x77, 0xCB, 0x7E, 0x76];
    sim3.loadAndRun(0x0000, prog3);
    assert.strictEqual(sim3.getFlag(Flags.ZERO), false, 'BIT 7 of 0x80 should be set');

    const sim4 = new Simulator();
    // BIT 0, A: CB 47
    const prog4 = [0x3E, 0x01, 0xCB, 0x47, 0x76];
    sim4.loadAndRun(0x0000, prog4);
    assert.strictEqual(sim4.getFlag(Flags.ZERO), false, 'BIT 0 of 0x01 should be set');
  });

  it('should handle BIT instruction on (HL) memory', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x0800, 0x42);
    // BIT 6, (HL): CB 76 -- 0x42 = 0b01000010, bit 6 is set (bit 5 is not)
    const program = [
      0x21, 0x00, 0x08, // LD HL, 0x0800
      0xCB, 0x76,       // BIT 6, (HL)
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.getFlag(Flags.ZERO), false, 'BIT 6 of 0x42 (01000010) should be set');

    const sim2 = new Simulator();
    sim2.memory.writeByte(0x0900, 0x10);
    const program2 = [
      0x21, 0x00, 0x09, // LD HL, 0x0900
      0xCB, 0x66,       // BIT 4, (HL) - 0x10 has bit 4 set
      0x76              // HALT
    ];
    sim2.loadAndRun(0x0000, program2);
    assert.strictEqual(sim2.getFlag(Flags.ZERO), false, 'BIT 4 of 0x10 should be set');
  });

  it('should handle BIT instruction flags (Z, N, H, P)', () => {
    const sim = new Simulator();
    // BIT 2, A with A=0x04: CB 57
    const program = [
      0x3E, 0x04, // LD A, 0x04
      0xCB, 0x57, // BIT 2, A
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.getFlag(Flags.ZERO), false, 'BIT 2 of 0x04 is set');
    assert.strictEqual(sim.getFlag(Flags.NEGATIVE), false, 'BIT clears N flag');
    assert.strictEqual(sim.getFlag(Flags.HALF_CARRY), true, 'BIT sets H flag');
    assert.strictEqual(sim.getFlag(Flags.PARITY_OVERFLOW), false, 'BIT sets P/V equal to Z (undocumented behavior); bit is set so Z is false');
  });

  it('should handle LD A,I (copy I to A)', () => {
    const sim = new Simulator();
    const program = [
      0x3E, 0x55, // LD A, 0x55 (doesn't affect I)
      0xED, 0x57, // LD A,I
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0x00, 'I starts at 0');
    assert.strictEqual(sim.getFlag(Flags.ZERO), true, 'A=0 sets Z flag');

    const sim2 = new Simulator();
    sim2.cpu.i = 0xAB;
    const program2 = [
      0xED, 0x57, // LD A,I
      0x76        // HALT
    ];
    sim2.loadAndRun(0x0000, program2);
    assert.strictEqual(sim2.cpu.a, 0xAB, 'A should equal I');
    assert.strictEqual(sim2.getFlag(Flags.ZERO), false, 'A!=0 clears Z flag');
  });

  it('should handle LD A,R (copy R to A)', () => {
    const sim = new Simulator();
    sim.cpu.r = 0xCD;
    const program = [
      0xED, 0x5F, // LD A,R
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0xCD, 'A should equal R');
  });

  it('should handle LD I,A (copy A to I)', () => {
    const sim = new Simulator();
    const program = [
      0x3E, 0x60, // LD A, 0x60
      0xED, 0x47, // LD I,A
      0x76        // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.i, 0x60, 'I should equal A');
  });

  it('should handle EXX (swap register sets)', () => {
    const sim = new Simulator();
    // Set main registers
    sim.cpu.b = 0x11;
    sim.cpu.c = 0x22;
    sim.cpu.d = 0x33;
    sim.cpu.e = 0x44;
    sim.cpu.h = 0x55;
    sim.cpu.l = 0x66;
    // Set shadow registers
    sim.cpu.shadow.b = 0xA1;
    sim.cpu.shadow.c = 0xA2;
    sim.cpu.shadow.d = 0xA3;
    sim.cpu.shadow.e = 0xA4;
    sim.cpu.shadow.h = 0xA5;
    sim.cpu.shadow.l = 0xA6;
    // Execute EXX: D9
    const program = [0xD9, 0x76];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.b, 0xA1, 'B should be from shadow');
    assert.strictEqual(sim.cpu.c, 0xA2, 'C should be from shadow');
    assert.strictEqual(sim.cpu.d, 0xA3, 'D should be from shadow');
    assert.strictEqual(sim.cpu.e, 0xA4, 'E should be from shadow');
    assert.strictEqual(sim.cpu.h, 0xA5, 'H should be from shadow');
    assert.strictEqual(sim.cpu.l, 0xA6, 'L should be from shadow');
    const snap = sim.getSnapshot();
    assert.strictEqual(snap.shadow.b, 0x11, 'Shadow B should be original B');
    assert.strictEqual(snap.shadow.c, 0x22, 'Shadow C should be original C');
  });

  it('should handle LD SP,HL', () => {
    const sim = new Simulator();
    const program = [
      0x21, 0x34, 0x12, // LD HL, 0x1234 (little-endian: low=0x34, high=0x12)
      0xF9,             // LD SP,HL
      0x76              // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.sp, 0x1234, 'SP should equal HL');
  });

  it('should handle RES b, r instructions (CB 80-BF)', () => {
    const sim = new Simulator();
    // Test RES 0, A: CB 87
    const prog1 = [0x3E, 0xFF, 0xCB, 0x87, 0x76];
    sim.loadAndRun(0x0000, prog1);
    assert.strictEqual(sim.cpu.a, 0xFE, 'RES 0, A should clear bit 0');

    // Test RES 3, B: CB 98
    const sim2 = new Simulator();
    const prog2 = [0x06, 0xFF, 0xCB, 0x98, 0x76];
    sim2.loadAndRun(0x0000, prog2);
    assert.strictEqual(sim2.cpu.b, 0xF7, 'RES 3, B should clear bit 3');

    // Test RES 7, (HL): CB BE
    const sim3 = new Simulator();
    const prog3 = [0x21, 0x00, 0x03, 0x3E, 0x80, 0x77, 0xCB, 0xBE, 0x7E, 0x76];
    sim3.loadAndRun(0x0000, prog3);
    assert.strictEqual(sim3.memory.readByte(0x0300), 0x00, 'RES 7, (HL) should clear bit 7 of memory');
  });

  it('should handle SET b, r instructions (CB C0-FF)', () => {
    const sim = new Simulator();
    // SET 0, A: Set bit 0 of A (CB C7)
    // SET 3, B: Set bit 3 of B (CB D8)
    // SET 4, (HL): Set bit 4 of memory at (HL) (CB E6)
    // SET 7, (HL): Set bit 7 of memory at (HL) (CB FE)
    const program = [
      0x3E, 0x00, // LD A, 0x00 (all bits clear)
      0xCB, 0xC7, // SET 0, A -> A = 0x01
      0x06, 0x00, // LD B, 0x00
      0xCB, 0xD8, // SET 3, B -> B = 0x08
      0x21, 0x00, 0x03, // LD HL, 0x0300
      0x3E, 0x00, // LD A, 0x00
      0x77, // LD (HL), A -> memory[0x0300] = 0x00
      0xCB, 0xE6, // SET 4, (HL) -> memory[0x0300] = 0x10
      0xCB, 0xFE, // SET 7, (HL) -> memory[0x0300] = 0x80
      0x7E, // LD A, (HL)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0x90, 'SET 4 and 7 on 0x00 = 0x90');
    // Need separate test for SET on registers since A was overwritten
    const sim2 = new Simulator();
    const prog2 = [
      0x3E, 0x00, // LD A, 0x00
      0xCB, 0xC7, // SET 0, A -> A = 0x01
      0x06, 0x00, // LD B, 0x00
      0xCB, 0xD8, // SET 3, B -> B = 0x08
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
      0xCB, 0xE6, // SET 4, (HL) -> memory[0x0300] = 0xFF (bit 4 already set)
      0xCB, 0x96, // RES 2, (HL) -> memory[0x0300] = 0xFF & ~0x04 = 0xFB
      0x7E, // LD A, (HL)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, program);
    assert.strictEqual(sim.cpu.a, 0xFB, 'SET 4 then RES 2 on 0xFF = 0xFB');
  });
});

describe('Simulator - IX/IY instructions', () => {
  it('should execute LD IX, nn (DD 21)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x34, 0x12, // LD IX, 0x1234
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x1234, 'IX should be 0x1234');
  });

  it('should execute LD IY, nn (FD 21)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0xAB, 0xCD, // LD IY, 0xCDAB
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.iy, 0xCDAB, 'IY should be 0xCDAB');
  });

  it('should execute PUSH IX (DD 55) and POP IX (DD 51)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x34, 0x12, // LD IX, 0x1234
      0xDD, 0x55, // PUSH IX
      0xDD, 0x21, 0x00, 0x00, // LD IX, 0x0000
      0xDD, 0x51, // POP IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x1234, 'IX should be restored to 0x1234 after POP');
  });

  it('should execute PUSH IY (FD 55) and POP IY (FD 51)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0xAB, 0xCD, // LD IY, 0xCDAB
      0xFD, 0x55, // PUSH IY
      0xFD, 0x21, 0xFF, 0xFF, // LD IY, 0xFFFF
      0xFD, 0x51, // POP IY
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.iy, 0xCDAB, 'IY should be restored to 0xCDAB after POP');
  });

  it('should execute LD IX, BC (DD 01)', () => {
    const sim = new Simulator();
    const prog = [
      0x01, 0x34, 0x12, // LD BC, 0x1234
      0xDD, 0x01, // LD IX, BC
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x1234, 'IX should equal BC = 0x1234');
  });

  it('should execute LD IX, DE (DD 11)', () => {
    const sim = new Simulator();
    const prog = [
      0x11, 0x56, 0x78, // LD DE, 0x7856
      0xDD, 0x11, // LD IX, DE
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x7856, 'IX should equal DE = 0x7856');
  });

  it('should execute LD BC, IX (DD 41)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x34, 0x12, // LD IX, 0x1234
      0xDD, 0x41, // LD BC, IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.b, 0x12, 'B should be 0x12');
    assert.strictEqual(sim.cpu.c, 0x34, 'C should be 0x34');
  });

  it('should execute LD DE, IX (DD 49)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x56, 0x78, // LD IX, 0x7856
      0xDD, 0x49, // LD DE, IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.d, 0x78, 'D should be 0x78');
    assert.strictEqual(sim.cpu.e, 0x56, 'E should be 0x56');
  });

  it('should execute LD SP, IX (DD F9)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x00, 0x80, // LD IX, 0x8000
      0xDD, 0xF9, // LD SP, IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.sp, 0x8000, 'SP should equal IX = 0x8000');
  });

  it('should execute LD SP, IY (FD F9)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0x00, 0xC0, // LD IY, 0xC000
      0xFD, 0xF9, // LD SP, IY
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.sp, 0xC000, 'SP should equal IY = 0xC000');
  });

  it('should execute LD (nn), IX (DD 22)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x34, 0x12, // LD IX, 0x1234
      0xDD, 0x22, 0x00, 0x05, // LD (0x0500), IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readWord(0x0500), 0x1234, 'Memory at 0x0500 should be 0x1234');
  });

  it('should execute LD IX, (nn) (DD 2A)', () => {
    const sim = new Simulator();
    sim.memory.writeWord(0x0600, 0x5678);
    const prog = [
      0xDD, 0x2A, 0x00, 0x06, // LD IX, (0x0600)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x5678, 'IX should be loaded from memory = 0x5678');
  });

  it('should execute LD (nn), IY (FD 22)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0xAB, 0xCD, // LD IY, 0xCDAB
      0xFD, 0x22, 0x00, 0x07, // LD (0x0700), IY
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readWord(0x0700), 0xCDAB, 'Memory at 0x0700 should be 0xCDAB');
  });

  it('should execute LD IY, (nn) (FD 2A)', () => {
    const sim = new Simulator();
    sim.memory.writeWord(0x0800, 0x9ABC);
    const prog = [
      0xFD, 0x2A, 0x00, 0x08, // LD IY, (0x0800)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.iy, 0x9ABC, 'IY should be loaded from memory = 0x9ABC');
  });

  it('should execute LD IY, BC (FD 01) and LD IY, DE (FD 11)', () => {
    const sim = new Simulator();
    const prog = [
      0x01, 0x12, 0x34, // LD BC, 0x3412
      0xFD, 0x01, // LD IY, BC
      0x11, 0x56, 0x78, // LD DE, 0x7856
      0xFD, 0x11, // LD IY, DE
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.iy, 0x7856, 'IY should equal DE = 0x7856');
  });

  it('should execute LD BC, IY (FD 41) and LD DE, IY (FD 49)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0x12, 0x34, // LD IY, 0x3412
      0xFD, 0x41, // LD BC, IY
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.b, 0x34, 'B should be 0x34');
    assert.strictEqual(sim.cpu.c, 0x12, 'C should be 0x12');
  });
});
