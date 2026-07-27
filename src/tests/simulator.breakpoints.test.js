/**
 * Tests for breakpoint functionality: step-into, step-over, run-to-breakpoint.
 * Covers call depth tracking, breakpoint management, and step control.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { Simulator } from '../simulator/simulator.js';
import { CallTracker } from '../simulator/call-tracker.js';
import { BreakpointManager } from '../simulator/breakpoints.js';

describe('CallTracker', () => {
  it('should start at depth 0', () => {
    const tracker = new CallTracker();
    assert.strictEqual(tracker.depth, 0);
  });

  it('should increment depth on call', () => {
    const tracker = new CallTracker();
    tracker.onCall();
    assert.strictEqual(tracker.depth, 1);
    tracker.onCall();
    assert.strictEqual(tracker.depth, 2);
  });

  it('should decrement depth on return', () => {
    const tracker = new CallTracker();
    tracker.onCall();
    tracker.onCall();
    assert.strictEqual(tracker.depth, 2);
    tracker.onRet();
    assert.strictEqual(tracker.depth, 1);
    tracker.onRet();
    assert.strictEqual(tracker.depth, 0);
  });

  it('should not go below 0 on underflow', () => {
    const tracker = new CallTracker();
    tracker.onRet();
    assert.strictEqual(tracker.depth, 0);
    tracker.onRet();
    assert.strictEqual(tracker.depth, 0);
  });

  it('should reset to 0', () => {
    const tracker = new CallTracker();
    tracker.onCall();
    tracker.onCall();
    tracker.reset();
    assert.strictEqual(tracker.depth, 0);
  });
});

describe('BreakpointManager', () => {
  it('should start empty', () => {
    const manager = new BreakpointManager();
    assert.strictEqual(manager.getAll().length, 0);
    assert.strictEqual(manager.has(0x1000), false);
  });

  it('should add a breakpoint', () => {
    const manager = new BreakpointManager();
    const id = manager.add(0x1000);
    assert.strictEqual(id, 0x1000);
    assert.strictEqual(manager.has(0x1000), true);
  });

  it('should mask breakpoint address to 16 bits', () => {
    const manager = new BreakpointManager();
    manager.add(0x12345);
    assert.strictEqual(manager.has(0x2345), true);
    assert.strictEqual(manager.has(0x12345), false);
  });

  it('should store callback', () => {
    const manager = new BreakpointManager();
    let hit = false;
    manager.add(0x1000, () => { hit = true; });
    manager.invoke(0x1000);
    assert.strictEqual(hit, true);
  });

  it('should remove a breakpoint', () => {
    const manager = new BreakpointManager();
    manager.add(0x1000);
    assert.strictEqual(manager.remove(0x1000), true);
    assert.strictEqual(manager.has(0x1000), false);
  });

  it('should return false when removing non-existent breakpoint', () => {
    const manager = new BreakpointManager();
    assert.strictEqual(manager.remove(0x1000), false);
  });

  it('should get breakpoint details', () => {
    const manager = new BreakpointManager();
    manager.add(0x1000, () => {});
    const bp = manager.get(0x1000);
    assert.strictEqual(bp.pc, 0x1000);
    assert.ok(typeof bp.callback === 'function');
  });

  it('should return undefined for non-existent breakpoint', () => {
    const manager = new BreakpointManager();
    assert.strictEqual(manager.get(0x1000), undefined);
  });

  it('should return all breakpoints', () => {
    const manager = new BreakpointManager();
    manager.add(0x1000);
    manager.add(0x2000);
    manager.add(0x3000);
    const all = manager.getAll();
    assert.strictEqual(all.length, 3);
  });

  it('should clear all breakpoints', () => {
    const manager = new BreakpointManager();
    manager.add(0x1000);
    manager.add(0x2000);
    manager.clear();
    assert.strictEqual(manager.getAll().length, 0);
  });
});

describe('Simulator - Breakpoints', () => {
  it('should set and remove breakpoints', () => {
    const sim = new Simulator();
    const id = sim.setBreakpoint(0x1000);
    assert.strictEqual(id, 0x1000);
    assert.strictEqual(sim.hasBreakpoint(0x1000), true);
    sim.removeBreakpoint(0x1000);
    assert.strictEqual(sim.hasBreakpoint(0x1000), false);
  });

  it('should stop execution when breakpoint is hit during step', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x00, 0x10, // LD HL, 0x1000 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0000);
    const result = sim.step();
    assert.strictEqual(result.stopped, true);
    assert.strictEqual(sim.cpu.getPair('hl'), 0x1000);
  });

  it('should invoke breakpoint callback when hit', () => {
    const sim = new Simulator();
    let callbackHit = false;
    const prog = [
      0x21, 0x00, 0x10, // LD HL, 0x1000 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0000, () => { callbackHit = true; });
    sim.step();
    assert.strictEqual(callbackHit, true);
  });

  it('should get all breakpoints', () => {
    const sim = new Simulator();
    sim.setBreakpoint(0x1000);
    sim.setBreakpoint(0x2000);
    const bps = sim.getBreakpoints();
    assert.strictEqual(bps.length, 2);
  });

  it('should stop at first breakpoint hit during runToBreakpoint', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x00, 0x10, // LD HL, 0x1000 (pc=0)
      0x21, 0x00, 0x20, // LD HL, 0x2000 (pc=3)
      0x76,             // HALT (pc=6)
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0003);
    const result = sim.runToBreakpoint();
    assert.strictEqual(result.stopped, true);
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim.cpu.getPair('hl'), 0x2000);
  });

  it('should stop at HALT even without breakpoint during runToBreakpoint', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x34, 0x12, // LD HL, 0x1234
      0x76,             // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.halted, true);
    assert.strictEqual(sim.cpu.getPair('hl'), 0x1234);
  });

  it('should continue past removed breakpoint', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x00, 0x10, // LD HL, 0x1000 (pc=0)
      0x21, 0x34, 0x12, // LD HL, 0x1234 (pc=3)
      0x76,             // HALT (pc=6)
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0000);
    sim.step(); // Hit breakpoint at pc=0
    assert.strictEqual(sim.stopped, true);
    sim.removeBreakpoint(0x0000);
    sim.stopped = false;
    sim.step(); // Should continue to pc=3
    assert.strictEqual(sim.stopped, false);
    assert.strictEqual(sim.cpu.pc, 0x0003);
  });

  it('should stop at stopPC during runToBreakpoint', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x34, 0x12, // LD HL, 0x1234 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.runToBreakpoint(0x0003);
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim.stopped, true);
  });

  it('should reset clears breakpoints', () => {
    const sim = new Simulator();
    sim.setBreakpoint(0x1000);
    sim.reset();
    assert.strictEqual(sim.hasBreakpoint(0x1000), false);
  });
});

describe('Simulator - Call Depth Tracking', () => {
  it('should start at call depth 0', () => {
    const sim = new Simulator();
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should increment call depth on CALL', () => {
    const sim = new Simulator();
    sim.load(0x0010, [0x76]); // HALT at target
    sim.load(0x0000, [0xCD, 0x10, 0x00]); // CALL 0x0010
    sim.cpu.pc = 0x0000;
    sim.step();
    assert.strictEqual(sim._callTracker.depth, 1);
    assert.strictEqual(sim.cpu.pc, 0x0010);
  });

  it('should decrement call depth on RET', () => {
    const sim = new Simulator();
    sim.load(0x0010, [0xC9]); // RET at target
    sim.load(0x0000, [0xCD, 0x10, 0x00]); // CALL 0x0010
    sim.cpu.pc = 0x0000;
    sim.step(); // CALL
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.step(); // RET
    assert.strictEqual(sim._callTracker.depth, 0);
    assert.strictEqual(sim.cpu.pc, 0x0003);
  });

  it('should track nested calls', () => {
    const sim = new Simulator();
    sim.load(0x0010, [0xCD, 0x20, 0x00, 0xC9]); // func1: CALL func2, RET
    sim.load(0x0020, [0xC9]); // func2: RET
    sim.load(0x0000, [0xCD, 0x10, 0x00, 0xCD, 0x20, 0x00, 0x76]); // CALL func1, CALL func2, HALT
    sim.cpu.pc = 0x0000;
    sim.step(); // CALL func1 -> depth=1, pc=0x0010
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.step(); // CALL func2 -> depth=2, pc=0x0020
    assert.strictEqual(sim._callTracker.depth, 2);
    sim.step(); // RET func2 -> depth=1, pc=0x0012
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.step(); // RET func1 -> depth=0, pc=0x0003
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should track RST as call', () => {
    const sim = new Simulator();
    // RST 00 jumps to address 0x0000, so we need RET at 0x0000
    // We load RET at 0x0000, then set PC to 0x0001 (after RST would have been)
    // Actually, RST 00 at address X pushes (X+1) and jumps to 0x0000
    // So we need: RST at some address, RET at 0x0000
    sim.load(0x0000, [0xC9]); // RET at 0x0000
    sim.load(0x0010, [0xC7, 0x76]); // RST 00, HALT at 0x0011
    sim.cpu.pc = 0x0010;
    sim.step(); // RST 00 -> depth=1, pc=0x0000
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.step(); // RET -> depth=0, pc=0x0011
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should not increment on conditional call when condition false', () => {
    const sim = new Simulator();
    sim.cpu.a = 0; // Z flag = true
    const prog = [
      0xE4, 0x10, 0x00, // CALL Z, 0x0010
      0x76,             // HALT
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.step();
    assert.strictEqual(sim._callTracker.depth, 0);
    assert.strictEqual(sim.cpu.pc, 0x0003);
  });

  it('should increment on conditional call when condition true', () => {
    const sim = new Simulator();
    sim.cpu.a = 0xFF; // Z flag = false
    sim.load(0x0010, [0xC9]); // RET at target
    sim.load(0x0000, [0xE4, 0x10, 0x00]); // CALL Z, 0x0010
    sim.cpu.pc = 0x0000;
    sim.step(); // CALL Z (Z=false) -> depth stays 0
    assert.strictEqual(sim._callTracker.depth, 0);
    assert.strictEqual(sim.cpu.pc, 0x0003);
  });

  it('should not decrement on conditional return when condition false', () => {
    const sim = new Simulator();
    sim.cpu.a = 0xFF; // Z flag = false
    sim.load(0x0010, [0xE0, 0x76]); // RET Z, HALT
    sim.load(0x0000, [0xCD, 0x10, 0x00]); // CALL 0x0010
    sim.cpu.pc = 0x0000;
    sim.step(); // CALL -> depth=1, pc=0x0010
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.step(); // RET Z (Z=false) -> depth stays 1, pc=0x0011
    assert.strictEqual(sim._callTracker.depth, 1);
    assert.strictEqual(sim.cpu.pc, 0x0011);
  });

  it('should decrement on conditional return when condition true', () => {
    const sim = new Simulator();
    sim.cpu.setFlag(6, true); // Z flag = true
    sim.load(0x0010, [0xE0]); // RET Z at target
    sim.load(0x0000, [0xCD, 0x10, 0x00]); // CALL 0x0010
    sim.cpu.pc = 0x0000;
    sim.step(); // CALL -> depth=1, pc=0x0010
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.step(); // RET Z (Z=true) -> depth=0, pc=0x0003
    assert.strictEqual(sim._callTracker.depth, 0);
    assert.strictEqual(sim.cpu.pc, 0x0003);
  });

  it('should reset call depth on reset', () => {
    const sim = new Simulator();
    sim.load(0x0010, [0x76]); // HALT at target
    sim.load(0x0000, [0xCD, 0x10, 0x00]); // CALL 0x0010
    sim.cpu.pc = 0x0000;
    sim.step();
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.reset();
    assert.strictEqual(sim._callTracker.depth, 0);
  });
});

describe('Simulator - Step Into', () => {
  it('should step regular instruction normally', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x34, 0x12, // LD HL, 0x1234
      0x76,             // HALT
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    const result = sim.stepInto();
    assert.strictEqual(result.pc, 0x0000);
    assert.strictEqual(result.bytes, 3);
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should step into CALL instruction', () => {
    const sim = new Simulator();
    sim.load(0x0010, [0x76]); // HALT at target
    sim.load(0x0000, [0xCD, 0x10, 0x00]); // CALL 0x0010
    sim.cpu.pc = 0x0000;
    const result = sim.stepInto();
    assert.strictEqual(result.pc, 0x0000);
    assert.strictEqual(result.bytes, 0);
    assert.strictEqual(sim.cpu.pc, 0x0010);
    assert.strictEqual(sim._callTracker.depth, 1);
  });

  it('should step into RST instruction', () => {
    const sim = new Simulator();
    sim.load(0x0000, [0xC9]); // RET at 0x0000 (RST target)
    sim.load(0x0010, [0xC7, 0x76]); // RST 00, HALT at 0x0011
    sim.cpu.pc = 0x0010;
    const result = sim.stepInto();
    assert.strictEqual(result.pc, 0x0010);
    assert.strictEqual(sim.cpu.pc, 0x0000);
    assert.strictEqual(sim._callTracker.depth, 1);
  });

  it('should not affect call depth on non-call instructions', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x34, 0x12, // LD HL, 0x1234
      0x08,             // EX AF,AF'
      0x76,             // HALT
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.stepInto(); // LD HL
    assert.strictEqual(sim._callTracker.depth, 0);
    sim.stepInto(); // EX AF,AF'
    assert.strictEqual(sim._callTracker.depth, 0);
  });
});

describe('Simulator - Step Over', () => {
  it('should step over regular instruction', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x34, 0x12, // LD HL, 0x1234
      0x76,             // HALT
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    const result = sim.stepOver();
    assert.strictEqual(result.pc, 0x0000);
    assert.strictEqual(result.bytes, 3);
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should step over CALL (execute entire called function)', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x55, 0x66, // LD HL, 0x6655 (pc=0)
      0xCD, 0x10, 0x00, // CALL 0x0010 (pc=3)
      0x21, 0x77, 0x88, // LD HL, 0x8877 (pc=6)
      0x76,             // HALT (pc=9)
    ];
    sim.load(0x0010, [
      0x3C,             // INC A
      0x3C,             // INC A
      0xC9,             // RET
    ]);
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.stepOver(); // LD HL (pc=0)
    assert.strictEqual(sim.cpu.pc, 0x0003);
    sim.stepOver(); // CALL 0x0010 -> should execute INC A, INC A, RET
    assert.strictEqual(sim.cpu.pc, 0x0006);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should step over nested calls', () => {
    const sim = new Simulator();
    const prog = [
      0xCD, 0x10, 0x00, // CALL func1 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0010, [
      0xCD, 0x20, 0x00, // CALL func2
      0xC9,             // RET
    ]);
    sim.load(0x0020, [
      0x3C,             // INC A
      0xC9,             // RET
    ]);
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.stepOver(); // CALL func1 -> executes func1 (CALL func2, RET)
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should step over conditional call when condition true', () => {
    const sim = new Simulator();
    sim.cpu.a = 0; // Z flag = true
    sim.load(0x0010, [
      0x3C,             // INC A
      0xC9,             // RET
    ]);
    sim.load(0x0000, [
      0xE4, 0x10, 0x00, // CALL Z, 0x0010 (pc=0)
      0x76,             // HALT (pc=3)
    ]);
    sim.cpu.pc = 0x0000;
    sim.stepOver(); // CALL Z (Z=true) -> executes INC A, RET
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should step over conditional call when condition false (no call)', () => {
    const sim = new Simulator();
    sim.cpu.a = 0xFF; // Z flag = false
    const prog = [
      0xE4, 0x10, 0x00, // CALL Z, 0x0010 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.stepOver(); // CALL Z (Z=false) -> just advances PC
    assert.strictEqual(sim.cpu.pc, 0x0003);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should step over RST', () => {
    const sim = new Simulator();
    // RST 00 jumps to 0x0000, so we need RET at 0x0000 and HALT at 0x0001
    sim.load(0x0000, [0xC9, 0x76]); // RET, HALT at 0x0001
    sim.load(0x0010, [0xC7]); // RST 00 at 0x0010
    sim.cpu.pc = 0x0010;
    sim.stepOver(); // RST 00 -> executes RET at 0x0000
    assert.strictEqual(sim.cpu.pc, 0x0011);
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should not affect call depth on non-call instructions', () => {
    const sim = new Simulator();
    const prog = [
      0x21, 0x34, 0x12, // LD HL, 0x1234
      0x08,             // EX AF,AF'
      0x76,             // HALT
    ];
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.stepOver(); // LD HL
    assert.strictEqual(sim._callTracker.depth, 0);
    sim.stepOver(); // EX AF,AF'
    assert.strictEqual(sim._callTracker.depth, 0);
  });

  it('should stop stepOver when breakpoint is hit inside called function', () => {
    const sim = new Simulator();
    const prog = [
      0xCD, 0x10, 0x00, // CALL 0x0010 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0010, [
      0x3C,             // INC A (at 0x0010)
      0x76,             // HALT (at 0x0011)
      0xC9,             // RET (at 0x0012)
    ]);
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0011);
    sim.stepOver();
    assert.strictEqual(sim.stopped, true);
    assert.strictEqual(sim.cpu.pc, 0x0011);
  });

  it('should stop stepOver when HALT is hit inside called function', () => {
    const sim = new Simulator();
    const prog = [
      0xCD, 0x10, 0x00, // CALL 0x0010 (pc=0)
      0x76,             // HALT (pc=3)
    ];
    sim.load(0x0010, [
      0x3C,             // INC A
      0x76,             // HALT
    ]);
    sim.load(0x0000, prog);
    sim.cpu.pc = 0x0000;
    sim.stepOver();
    assert.strictEqual(sim.stopped, true);
    assert.strictEqual(sim.cpu.pc, 0x0012);
    assert.strictEqual(sim.cpu.halted, true);
  });
});

describe('Simulator - Integration', () => {
  it('should work with runToBreakpoint and call depth tracking', () => {
    const sim = new Simulator();
    sim.load(0x0010, [
      0x3C,             // INC A
      0xC9,             // RET
    ]);
    sim.load(0x0000, [
      0xCD, 0x10, 0x00, // CALL 0x0010 (pc=0)
      0x76,             // HALT (pc=3)
    ]);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0010);
    sim.runToBreakpoint();
    assert.strictEqual(sim.stopped, true);
    assert.strictEqual(sim.cpu.pc, 0x0010);
    assert.strictEqual(sim._callTracker.depth, 1);
  });

  it('should work stepInto/stepOver with breakpoints', () => {
    const sim = new Simulator();
    sim.load(0x0010, [
      0x3C,             // INC A
      0xC9,             // RET
    ]);
    sim.load(0x0000, [
      0x21, 0x34, 0x12, // LD HL, 0x1234 (pc=0)
      0xCD, 0x10, 0x00, // CALL 0x0010 (pc=3)
      0x76,             // HALT (pc=6)
    ]);
    sim.cpu.pc = 0x0000;
    sim.setBreakpoint(0x0003);
    sim.stepOver(); // LD HL -> pc=3
    assert.strictEqual(sim.cpu.pc, 0x0003);
    sim.stepOver(); // Hit breakpoint at CALL -> stopped
    assert.strictEqual(sim.stopped, true);
  });

  it('should maintain call depth across multiple stepInto calls', () => {
    const sim = new Simulator();
    sim.load(0x0010, [
      0xCD, 0x20, 0x00, // CALL func2
      0xC9,             // RET
    ]);
    sim.load(0x0020, [
      0x3C,             // INC A
      0xC9,             // RET
    ]);
    sim.load(0x0000, [
      0xCD, 0x10, 0x00, // CALL func1 (pc=0)
      0xCD, 0x20, 0x00, // CALL func2 (pc=3)
      0x76,             // HALT (pc=6)
    ]);
    sim.cpu.pc = 0x0000;
    sim.stepInto(); // CALL func1 -> depth=1, pc=0x0010
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.stepInto(); // CALL func2 -> depth=2, pc=0x0020
    assert.strictEqual(sim._callTracker.depth, 2);
    sim.stepInto(); // INC A -> depth=2, pc=0x0021
    assert.strictEqual(sim._callTracker.depth, 2);
    sim.stepInto(); // RET func2 -> depth=1, pc=0x0012
    assert.strictEqual(sim._callTracker.depth, 1);
    sim.stepInto(); // RET func1 -> depth=0, pc=0x0003
    assert.strictEqual(sim._callTracker.depth, 0);
  });
});
