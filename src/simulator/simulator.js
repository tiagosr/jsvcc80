/**
 * Top-level Z80 simulator orchestrating CPU, memory, I/O, and watchers.
 * Cycle-unaware: instructions execute to completion without cycle counting.
 */

import { CPU, Flags } from './cpu.js';
import { Memory } from './memory.js';
import { IOHandler } from './io.js';
import { WatchManager } from './watcher.js';

/** @typedef {import('./cpu.js').CPU} CPU */
/** @typedef {import('./cpu.js').Flags} Flags */
/** @typedef {import('./memory.js').Memory} Memory */
/** @typedef {import('./io.js').IOHandler} IOHandler */
/** @typedef {import('./watcher.js').WatchManager} WatchManager */

/**
 * Simulator configuration options.
 * @typedef {Object} SimulatorOptions
 * @property {number} [startAddr] - Initial PC address (default: 0).
 * @property {boolean} [trackAccess] - Track memory read/write history.
 * @property {number} [fill] - Memory fill value (default: 0xFF).
 */

/**
 * Z80 Simulator - cycle-unaware execution engine.
 */
export class Simulator {
  /**
   * @param {SimulatorOptions} [options]
   */
  constructor(options = {}) {
    /** @type {SimulatorOptions} */ this.options = options;
     /** @type {WatchManager} */ this.watcher = new WatchManager();
     const memory = new Memory({ trackAccess: options.trackAccess || false, fill: options.fill });
     memory.watcher = this.watcher;
     /** @type {CPU} */ this.cpu = new CPU(memory);
     /** @type {Memory} */ this.memory = memory;
     /** @type {IOHandler} */ this.io = new IOHandler();
    /** @type {boolean} */ this.running = false;
    /** @type {boolean} */ this.stopped = false;
    /** @type {number} */ this.stepCount = 0;
    /** @type {number|null} */ this.stopPC = null;
  }

  /** @returns {CPU} The CPU instance. */
  get cpu() { return this._cpu; }
  /** @param {CPU} v */
  set cpu(v) { this._cpu = v; }

  /** @returns {Memory} The memory instance. */
  get memory() { return this._memory; }
  /** @param {Memory} v */
  set memory(v) { this._memory = v; }

  /** @returns {IOHandler} The I/O handler. */
  get io() { return this._io; }
  /** @param {IOHandler} v */
  set io(v) { this._io = v; }

  /** @returns {WatchManager} The watch manager. */
  get watcher() { return this._watcher; }
  /** @param {WatchManager} v */
  set watcher(v) { this._watcher = v; }

  /** Reset simulator to initial state.
   * @param {number} [startAddr] - Override start address.
   */
  reset(startAddr) {
    this.cpu.reset();
    this.cpu.pc = startAddr ?? this.options.startAddr ?? 0;
    this.cpu.sp = 0xFFFF;
    this.running = false;
    this.stopped = false;
    this.stepCount = 0;
    this.stopPC = null;
    if (this.memory.trackAccess) this.memory.clearAccessLog();
  }

  /** Load binary data into memory at the given address.
   * @param {number} addr - Load address.
   * @param {number[]|Uint8Array} data - Binary data.
   */
  load(addr, data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    for (let i = 0; i < bytes.length; i++) {
      this.memory.writeByte(addr + i, bytes[i]);
    }
  }

  /** Load binary data and set PC to start address.
   * @param {number} addr - Load/entry address.
   * @param {number[]|Uint8Array} data
   */
  loadAndRun(addr, data) {
    this.load(addr, data);
    this.cpu.pc = addr;
    this.run();
  }

  /** Execute a single instruction at PC.
   * @returns {{pc:number,bytes:number,stopped:boolean}} Info about executed instruction.
   */
  step() {
    if (this.cpu.halted) {
      return { pc: this.cpu.pc, bytes: 1, stopped: true };
    }

    const pc = this.cpu.pc;
    const bytes = this._decodeAndExecute();
    // Only advance PC if the instruction didn't set it directly (bytes > 0)
    if (bytes > 0) {
      this.cpu.pc = (pc + bytes) & 0xFFFF;
    }
    this.cpu.r = (this.cpu.r + 1) & 0xFF;
    this.stepCount++;

    const currentPC = this.cpu.pc;

    // Check stop PC
    if (this.stopPC !== null && currentPC === this.stopPC) {
      this.stopped = true;
      this.running = false;
    }

    // Notify watchers
    if (this.watcher.hasWatches(pc)) {
      for (let i = 0; i < bytes; i++) {
        this.watcher.notify(pc + i, undefined, 'read');
      }
    }

    return { pc, bytes, stopped: this.stopped };
  }

  /** Execute instructions until HALT or run() is called with stopPC.
   * @param {number} [stopPC] - PC address to stop at.
   */
  run(stopPC) {
    if (stopPC !== undefined) this.stopPC = stopPC;
    this.running = true;
    this.stopped = false;
    while (this.running) {
      this.step();
      if (this.cpu.halted) break;
      if (this.stopped) break;
    }
    this.running = false;
  }

  /** Stop the simulator. */
  stop() {
    this.running = false;
    this.stopped = true;
  }

  /** Set a breakpoint at a PC address.
   * @param {number} pc
   * @param {() => void} [callback] - Callback when breakpoint hit.
   * @returns {number} Breakpoint ID.
   */
  setBreakpoint(pc, callback) {
    this.watcher.addWatch(pc, () => {
      if (callback) callback();
      this.stop();
    }, 'access');
    return pc;
  }

  /** Remove a breakpoint.
   * @param {number} pc
   */
  removeBreakpoint(pc) { this.watcher.removeWatches(pc); }

  /** Get a snapshot of CPU state.
   * @returns {Record<string, number>}
   */
  getSnapshot() { return this.cpu.getSnapshot(); }

  /** Restore CPU state from a snapshot.
   * @param {Record<string, number>} snap
   */
  restoreSnapshot(snap) { this.cpu.restoreSnapshot(snap); }

  /** Get execution statistics.
    * @returns {{steps:number,pc:number,sp:number,a:number,f:number}}
    */
   getStats() {
     return { steps: this.stepCount, pc: this.cpu.pc, sp: this.cpu.sp, a: this.cpu.a, f: this.cpu.f };
   }

   /** Get a flag bit.
    * @param {number} flag - Flag constant.
    * @returns {number}
    */
   getFlag(flag) { return this.cpu.getFlag(flag); }

  /**
   * Decode and execute one instruction.
   * @returns {number} Number of bytes consumed.
   * @private
   */
  _decodeAndExecute() {
    const pc = this.cpu.pc;
    const opcode = this.cpu.readByte(pc);
    return this._executeOpcode(opcode, pc);
  }

  /**
   * Execute an opcode at the given PC.
   * @param {number} opcode
   * @param {number} pc
   * @returns {number} Bytes consumed.
   * @private
   */
  _executeOpcode(opcode, pc) {
    const c = this.cpu;
    const m = c.memory;

    // 8-bit LD r, n
    if (opcode === 0x06) { c.b = m.readByte(pc + 1); c.setFlags8(c.b); return 2; }
    if (opcode === 0x0E) { c.c = m.readByte(pc + 1); c.setFlags8(c.c); return 2; }
    if (opcode === 0x16) { c.d = m.readByte(pc + 1); c.setFlags8(c.d); return 2; }
    if (opcode === 0x1E) { c.e = m.readByte(pc + 1); c.setFlags8(c.e); return 2; }
    if (opcode === 0x26) { c.h = m.readByte(pc + 1); c.setFlags8(c.h); return 2; }
    if (opcode === 0x2E) { c.l = m.readByte(pc + 1); c.setFlags8(c.l); return 2; }
    if (opcode === 0x3E) { c.a = m.readByte(pc + 1); c.setFlags8(c.a); return 2; }

    // 16-bit LD (MUST be before (HL) handlers)
    if (opcode === 0x01) { c.setPair('bc', m.readWord(pc + 1)); return 3; }
    if (opcode === 0x11) { c.setPair('de', m.readWord(pc + 1)); return 3; }
    if (opcode === 0x21) { c.setPair('hl', m.readWord(pc + 1)); return 3; }
    if (opcode === 0x31) { c.sp = m.readWord(pc + 1); return 3; }
    if (opcode === 0x22) { m.writeWord(m.readWord(pc + 1), c.getPair('hl')); return 3; }
    if (opcode === 0x2A) { c.setPair('hl', m.readWord(m.readWord(pc + 1))); return 3; }

    // LD A, (nn) / LD (nn), A
    if (opcode === 0x3A) { c.a = m.readByte(m.readWord(pc + 1)); c.setFlags8(c.a); return 3; }
    if (opcode === 0x32) { m.writeByte(m.readWord(pc + 1), c.a); return 3; }

    // LD (HL), n
    if (opcode === 0x36) { m.writeByte(c.getPair('hl'), m.readByte(pc + 1)); return 2; }

    // EX DE, HL
    if (opcode === 0x09) { const hl = c.getPair('hl'); const de = c.getPair('de'); c.setPair('hl', de); c.setPair('de', hl); return 1; }

    // PUSH/POP
    if (opcode === 0xC5) { c.push(c.getPair('bc')); return 1; }
    if (opcode === 0xD5) { c.push(c.getPair('de')); return 1; }
    if (opcode === 0xE5) { c.push(c.getPair('hl')); return 1; }
    if (opcode === 0xF5) { c.push(c.getPair('af')); return 1; }
    if (opcode === 0xC1) { c.setPair('bc', c.pop()); return 1; }
    if (opcode === 0xD1) { c.setPair('de', c.pop()); return 1; }
    if (opcode === 0xE1) { c.setPair('hl', c.pop()); return 1; }
    if (opcode === 0xF1) { c.setPair('af', c.pop()); return 1; }

    // INC/DEC rr
    if (opcode === 0x03) { c.setPair('bc', (c.getPair('bc') + 1) & 0xFFFF); return 1; }
    if (opcode === 0x13) { c.setPair('de', (c.getPair('de') + 1) & 0xFFFF); return 1; }
    if (opcode === 0x23) { c.setPair('hl', (c.getPair('hl') + 1) & 0xFFFF); return 1; }
    if (opcode === 0x33) { c.sp = (c.sp + 1) & 0xFFFF; return 1; }
    if (opcode === 0x0B) { c.setPair('bc', (c.getPair('bc') - 1) & 0xFFFF); return 1; }
    if (opcode === 0x1B) { c.setPair('de', (c.getPair('de') - 1) & 0xFFFF); return 1; }
    if (opcode === 0x2B) { c.setPair('hl', (c.getPair('hl') - 1) & 0xFFFF); return 1; }
    if (opcode === 0x3B) { c.sp = (c.sp - 1) & 0xFFFF; return 1; }

    // LD r, (HL) -- high3 = 6 or 7, low3 = 6
    if (((opcode & 0x38) === 0x30 || (opcode & 0x38) === 0x38) && (opcode & 0x07) === 0x06) {
      const val = m.readByte(c.getPair('hl'));
      if ((opcode & 0x38) === 0x30) {
        // 0x76 = HALT (high3=6, low3=6)
        c.halted = true;
        return 1;
      }
      // 0x7E = LD A, (HL) (high3=7, low3=6)
      c.a = val;
      c.setFlags8(val);
      return 1;
    }

    // LD r, (HL) -- high3 = 6, low3 = 0-5 (B,C,D,E,H,L)
    if ((opcode & 0x38) === 0x30 && (opcode & 0x07) < 6) {
      const r = opcode & 0x07;
      const val = m.readByte(c.getPair('hl'));
      const regs = [c.b, c.c, c.d, c.e, c.h, c.l];
      this._setReg8(r, regs[r]);
      c.setFlags8(regs[r]);
      return 1;
    }

    // LD (HL), r -- high3 = 6 (0b110), but exclude 0x21(LD HL,nn), 0x22(LD (nn),HL), 0x23(INC HL), 0x27(DAA)
    if ((opcode & 0x38) === 0x30 && (opcode & 0x07) !== 0x01 && (opcode & 0x07) !== 0x02 && (opcode & 0x07) !== 0x03) {
      const r = opcode & 0x07;
      if (r < 7) {
        const regs = [c.b, c.c, c.d, c.e, c.h, c.l, 0, c.a];
        m.writeByte(c.getPair('hl'), regs[r]);
      } else {
        m.writeByte(c.getPair('hl'), c.a);
      }
      return 1;
    }

    // INC/DEC r -- RRRR 001
    if ((opcode & 0x07) === 0x01) {
      const r = (opcode >> 3) & 0x07;
      const isInc = (opcode & 0x08) === 0;
      const regs = [c.b, c.c, c.d, c.e, c.h, c.l, m.readByte(c.getPair('hl')), c.a];
      let val = regs[r];
      if (isInc) {
        val = (val + 1) & 0xFF;
        c.setFlag(Flags.HALF_CARRY, (val & 0x0F) === 0x0F);
      } else {
        val = (val - 1) & 0xFF;
        c.setFlag(Flags.HALF_CARRY, (val & 0x0F) === 0x0F);
      }
      c.setFlag(Flags.ZERO, val === 0);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.PARITY_OVERFLOW, this._parity(val));
      if (r < 7) this._setReg8(r, val);
      else c.a = val;
      return 1;
    }

    // Rotations
    if (opcode === 0x07) { const a = c.a; const cy = (a >> 7) & 1; c.a = ((a << 1) & 0xFF) | cy; c.setFlag(Flags.CARRY, cy === 1); c.setFlag(Flags.ZERO, false); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); return 1; }
    if (opcode === 0x1F) { const a = c.a; const cy = c.getFlag(Flags.CARRY); c.a = ((a << 1) & 0xFF) | cy; c.setFlag(Flags.CARRY, ((a >> 7) & 1) === 1); c.setFlag(Flags.ZERO, false); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); return 1; }
    if (opcode === 0x0F) { const a = c.a; const cy = a & 1; c.a = (a >> 1) | ((cy & 1) << 7); c.setFlag(Flags.CARRY, cy === 1); c.setFlag(Flags.ZERO, c.a === 0); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); return 1; }
    if (opcode === 0x17) { const a = c.a; const cy = c.getFlag(Flags.CARRY); c.a = (a >> 1) | ((cy & 1) << 7); c.setFlag(Flags.CARRY, (a & 1) === 1); c.setFlag(Flags.ZERO, c.a === 0); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); return 1; }

    // CPL / CCF
    if (opcode === 0x2F) { c.a = ~c.a & 0xFF; c.setFlag(Flags.NEGATIVE, true); c.setFlag(Flags.HALF_CARRY, true); return 1; }
    if (opcode === 0x3F) { c.setFlag(Flags.CARRY, !c.getFlag(Flags.CARRY)); c.setFlag(Flags.NEGATIVE, false); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.ZERO, false); c.setFlag(Flags.PARITY_OVERFLOW, 0); return 1; }

    // DAA
    if (opcode === 0x27) { return this._daa(); }

    // ADD HL, rr
    if ((opcode & 0xF0) === 0x88) {
      const pairs = ['bc', 'de', 'hl', 'sp'];
      const hl = c.getPair('hl');
      const rv = c.getPair(pairs[opcode & 0x03]);
      const result = (hl + rv) & 0xFFFF;
      c.setPair('hl', result);
      c.setFlag(Flags.CARRY, result > 0xFFFF);
      c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) + (rv & 0x0FFF)) > 0x0FFF);
      c.setFlag(Flags.NEGATIVE, false);
      return 1;
    }

    // ADD HL, HL / ADD HL, SP
    if (opcode === 0x29) { const hl = c.getPair('hl'); const r = (hl + hl) & 0xFFFF; c.setPair('hl', r); c.setFlag(Flags.CARRY, r > 0xFFFF); c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) + (hl & 0x0FFF)) > 0x0FFF); c.setFlag(Flags.NEGATIVE, false); return 1; }
    if (opcode === 0x39) { const hl = c.getPair('hl'); const r = (hl + c.sp) & 0xFFFF; c.setPair('hl', r); c.setFlag(Flags.CARRY, r > 0xFFFF); c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) + (c.sp & 0x0FFF)) > 0x0FFF); c.setFlag(Flags.NEGATIVE, false); return 1; }

    // ALU: ADD A, r/(HL)/n
    if (opcode === 0x80) return this._addA(c.b);
    if (opcode === 0x81) return this._addA(c.c);
    if (opcode === 0x82) return this._addA(c.d);
    if (opcode === 0x83) return this._addA(c.e);
    if (opcode === 0x84) return this._addA(c.h);
    if (opcode === 0x85) return this._addA(c.l);
    if (opcode === 0x86) return this._addA(m.readByte(c.getPair('hl')));
    if (opcode === 0xC6) return this._addA(m.readByte(pc + 1));

    // ADC A, r/(HL)/n
    if (opcode === 0x88) return this._adcA(c.b);
    if (opcode === 0x89) return this._adcA(c.c);
    if (opcode === 0x8A) return this._adcA(c.d);
    if (opcode === 0x8B) return this._adcA(c.e);
    if (opcode === 0x8C) return this._adcA(c.h);
    if (opcode === 0x8D) return this._adcA(c.l);
    if (opcode === 0x8E) return this._adcA(m.readByte(c.getPair('hl')));
    if (opcode === 0xCE) return this._adcA(m.readByte(pc + 1));

    // SUB A, r/(HL)/n
    if (opcode === 0x90) return this._subA(c.b);
    if (opcode === 0x91) return this._subA(c.c);
    if (opcode === 0x92) return this._subA(c.d);
    if (opcode === 0x93) return this._subA(c.e);
    if (opcode === 0x94) return this._subA(c.h);
    if (opcode === 0x95) return this._subA(c.l);
    if (opcode === 0x96) return this._subA(m.readByte(c.getPair('hl')));
    if (opcode === 0xD6) return this._subA(m.readByte(pc + 1));

    // SBC A, r/(HL)/n
    if (opcode === 0x98) return this._sbcA(c.b);
    if (opcode === 0x99) return this._sbcA(c.c);
    if (opcode === 0x9A) return this._sbcA(c.d);
    if (opcode === 0x9B) return this._sbcA(c.e);
    if (opcode === 0x9C) return this._sbcA(c.h);
    if (opcode === 0x9D) return this._sbcA(c.l);
    if (opcode === 0x9E) return this._sbcA(m.readByte(c.getPair('hl')));
    if (opcode === 0xDE) return this._sbcA(m.readByte(pc + 1));

    // AND
    if (opcode === 0xA0) return this._andA(c.b);
    if (opcode === 0xA1) return this._andA(c.c);
    if (opcode === 0xA2) return this._andA(c.d);
    if (opcode === 0xA3) return this._andA(c.e);
    if (opcode === 0xA4) return this._andA(c.h);
    if (opcode === 0xA5) return this._andA(c.l);
    if (opcode === 0xA6) return this._andA(m.readByte(c.getPair('hl')));
    if (opcode === 0xE6) return this._andA(m.readByte(pc + 1));

    // OR
    if (opcode === 0xB0) return this._orA(c.b);
    if (opcode === 0xB1) return this._orA(c.c);
    if (opcode === 0xB2) return this._orA(c.d);
    if (opcode === 0xB3) return this._orA(c.e);
    if (opcode === 0xB4) return this._orA(c.h);
    if (opcode === 0xB5) return this._orA(c.l);
    if (opcode === 0xB6) return this._orA(m.readByte(c.getPair('hl')));
    if (opcode === 0xF6) return this._orA(m.readByte(pc + 1));

    // CP
    if (opcode === 0xB8) return this._cpA(c.b);
    if (opcode === 0xB9) return this._cpA(c.c);
    if (opcode === 0xBA) return this._cpA(c.d);
    if (opcode === 0xBB) return this._cpA(c.e);
    if (opcode === 0xBC) return this._cpA(c.h);
    if (opcode === 0xBD) return this._cpA(c.l);
    if (opcode === 0xBE) return this._cpA(m.readByte(c.getPair('hl')));
    if (opcode === 0xFE) return this._cpA(m.readByte(pc + 1));

    // JP
    if (opcode === 0xC3) return this._jp(m.readWord(pc + 1));
    if (opcode === 0xC2) { const a = m.readWord(pc + 1); return c.getFlag(Flags.ZERO) ? 3 : this._jp(a); }
    if (opcode === 0xEA) { const a = m.readWord(pc + 1); return c.getFlag(Flags.ZERO) ? this._jp(a) : 3; }
    if (opcode === 0xC4) { const a = m.readWord(pc + 1); return c.getFlag(Flags.CARRY) ? 3 : this._jp(a); }
    if (opcode === 0xE4) { const a = m.readWord(pc + 1); return c.getFlag(Flags.CARRY) ? this._jp(a) : 3; }

    // JR
    if (opcode === 0x18) { const d = m.readByte(pc + 1); const s = d > 0x7F ? d - 256 : d; c.pc = (pc + 2 + s) & 0xFFFF; return 0; }
    if (opcode === 0x10) { const d = m.readByte(pc + 1); const s = d > 0x7F ? d - 256 : d; c.b = (c.b - 1) & 0xFF; if (c.b !== 0) { c.pc = (pc + 2 + s) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x20) { const d = m.readByte(pc + 1); const s = d > 0x7F ? d - 256 : d; if (!c.getFlag(Flags.ZERO)) { c.pc = (pc + 2 + s) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x28) { const d = m.readByte(pc + 1); const s = d > 0x7F ? d - 256 : d; if (c.getFlag(Flags.ZERO)) { c.pc = (pc + 2 + s) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x30) { const d = m.readByte(pc + 1); const s = d > 0x7F ? d - 256 : d; if (!c.getFlag(Flags.CARRY)) { c.pc = (pc + 2 + s) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x38) { const d = m.readByte(pc + 1); const s = d > 0x7F ? d - 256 : d; if (c.getFlag(Flags.CARRY)) { c.pc = (pc + 2 + s) & 0xFFFF; return 0; } return 2; }

    // CALL/RET
    if (opcode === 0xCD) { c.push(c.pc + 3); return this._jp(m.readWord(pc + 1)); }
    if (opcode === 0xC0) { if (!c.getFlag(Flags.ZERO)) { c.pc = c.pop(); return 1; } return 1; }
    if (opcode === 0xC8) { if (c.getFlag(Flags.ZERO)) { c.pc = c.pop(); return 1; } return 1; }
    if (opcode === 0xD0) { if (!c.getFlag(Flags.CARRY)) { c.pc = c.pop(); return 1; } return 1; }
    if (opcode === 0xD8) { if (c.getFlag(Flags.CARRY)) { c.pc = c.pop(); return 1; } return 1; }
    if (opcode === 0xC9) { c.pc = c.pop(); return 1; }

    // RST
    if (opcode === 0xC7) { c.push(c.pc + 1); c.pc = 0; return 1; }
    if (opcode === 0xCF) { c.push(c.pc + 1); c.pc = 8; return 1; }
    if (opcode === 0xD7) { c.push(c.pc + 1); c.pc = 0x10; return 1; }
    if (opcode === 0xDF) { c.push(c.pc + 1); c.pc = 0x18; return 1; }
    if (opcode === 0xE7) { c.push(c.pc + 1); c.pc = 0x20; return 1; }
    if (opcode === 0xEF) { c.push(c.pc + 1); c.pc = 0x28; return 1; }
    if (opcode === 0xF7) { c.push(c.pc + 1); c.pc = 0x30; return 1; }
    if (opcode === 0xFF) { c.push(c.pc + 1); c.pc = 0x38; return 1; }

    // IN/OUT
    if (opcode === 0xDB) { c.a = this.io.handleIn(m.readByte(pc + 1)); return 2; }
    if (opcode === 0xD3) { this.io.handleOut(m.readByte(pc + 1), c.a); return 2; }

    // ED prefix
    if (opcode === 0xED) { return this._executeEDPrefix(m.readByte(pc + 1), pc + 1); }

    // EI/DI
    if (opcode === 0xFB) { c.iff1 = 1; c.iff2 = 1; return 1; }
    if (opcode === 0xF3) { c.iff1 = 0; c.iff2 = 0; return 1; }

    // EXX
    if (opcode === 0xD9) { const t = { b: c.b, c: c.c, d: c.d, e: c.e, h: c.h, l: c.l }; c.b = c.shadow.b; c.c = c.shadow.c; c.d = c.shadow.d; c.e = c.shadow.e; c.h = c.shadow.h; c.l = c.shadow.l; c.shadow = t; return 1; }

    // EX AF, AF'
    if (opcode === 0x08) { const sf = c.f; c.f = c.shadow.f; c.shadow.f = sf; return 1; }

    // EX (SP), HL
    if (opcode === 0xE3) { const hl = c.getPair('hl'); const sv = m.readWord(c.sp); m.writeWord(c.sp, hl); c.setPair('hl', sv); return 1; }

    // NOP
    if (opcode === 0x00) return 1;

    // Unknown
    return 1;
  }

  /** Execute ED-prefixed instruction.
   * @param {number} opcode
   * @param {number} pc
   * @returns {number}
   * @private
   */
  _executeEDPrefix(opcode, pc) {
    const c = this.cpu;
    const m = c.memory;

    // SBC HL, rr
    if ((opcode & 0xF8) === 0x48) {
      const pairs = ['bc', 'de', 'hl', 'sp'];
      const hl = c.getPair('hl');
      const rv = c.getPair(pairs[opcode & 0x03]);
      const cy = c.getFlag(Flags.CARRY) ? 1 : 0;
      const r = (hl - rv - cy) & 0xFFFF;
      c.setPair('hl', r);
      c.setFlag(Flags.CARRY, r > 0xFFFF);
      c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) - (rv & 0x0FFF) - cy) > 0x0FFF);
      c.setFlag(Flags.NEGATIVE, true);
      return 2;
    }

    // ADC HL, rr
    if ((opcode & 0xF8) === 0x40) {
      const pairs = ['bc', 'de', 'hl', 'sp'];
      const hl = c.getPair('hl');
      const rv = c.getPair(pairs[opcode & 0x03]);
      const cy = c.getFlag(Flags.CARRY) ? 1 : 0;
      const r = (hl + rv + cy) & 0xFFFF;
      c.setPair('hl', r);
      c.setFlag(Flags.CARRY, r > 0xFFFF);
      c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) + (rv & 0x0FFF) + cy) > 0x0FFF);
      c.setFlag(Flags.NEGATIVE, false);
      return 2;
    }

    // INC/DEC rr
    if ((opcode & 0xF0) === 0x00) {
      const pairs = ['bc', 'de', 'hl', 'sp'];
      const isInc = (opcode & 0x04) !== 0;
      const v = c.getPair(pairs[(opcode >> 2) & 0x03]);
      c.setPair(pairs[(opcode >> 2) & 0x03], isInc ? (v + 1) & 0xFFFF : (v - 1) & 0xFFFF);
      return 2;
    }

    // LD rr, nn
    if ((opcode & 0xF0) === 0x40) {
      const pairs = ['bc', 'de', 'hl', 'sp'];
      c.setPair(pairs[(opcode >> 4) & 0x03], m.readWord(pc + 1));
      return 3;
    }

    // LD (nn), rr
    if (opcode === 0x4B) { m.writeWord(m.readWord(pc + 1), c.getPair('bc')); return 3; }
    if (opcode === 0x5B) { m.writeWord(m.readWord(pc + 1), c.getPair('de')); return 3; }
    if (opcode === 0x6B) { m.writeWord(m.readWord(pc + 1), c.getPair('hl')); return 3; }
    if (opcode === 0x7B) { m.writeWord(m.readWord(pc + 1), c.sp); return 3; }

    // LD rr, (nn)
    if (opcode === 0x4A) { c.setPair('bc', m.readWord(m.readWord(pc + 1))); return 3; }
    if (opcode === 0x5A) { c.setPair('de', m.readWord(m.readWord(pc + 1))); return 3; }
    if (opcode === 0x6A) { c.setPair('hl', m.readWord(m.readWord(pc + 1))); return 3; }
    if (opcode === 0x7A) { c.sp = m.readWord(m.readWord(pc + 1)); return 3; }

    // NEG
    if (opcode === 0x44) { return this._neg(); }

    // RRD / RLD
    if (opcode === 0x6F) {
      const hl = c.getPair('hl');
      const val = m.readByte(hl);
      const low = val & 0x0F;
      const high = c.a & 0x0F;
      m.writeByte(hl, (c.a >> 4) | (low << 4));
      c.a = (c.a & 0xF0) | high;
      c.setFlags8(c.a);
      return 2;
    }
    if (opcode === 0x67) {
      const hl = c.getPair('hl');
      const val = m.readByte(hl);
      const low = val & 0x0F;
      const high = c.a & 0x0F;
      m.writeByte(hl, (c.a >> 4) | (low << 4));
      c.a = (c.a & 0xF0) | high;
      c.setFlags8(c.a);
      return 2;
    }

    // IM modes
    if (opcode === 0x56) { c.im = 1; return 2; }
    if (opcode === 0x5E) { c.im = 0; return 2; }
    if (opcode === 0x7E) { c.im = 2; return 2; }

    // RES b, r (ED 80-BF)
    if ((opcode & 0xC0) === 0x80) {
      const bit = (opcode >> 3) & 0x07;
      const reg = opcode & 0x07;
      const mask = ~(1 << bit);
      if (reg === 7) {
        const val = m.readByte(c.getPair('hl'));
        m.writeByte(c.getPair('hl'), val & mask);
      } else {
        const regs = [c.a, c.b, c.c, c.d, c.e, c.h, c.l, 0];
        regs[reg] &= mask;
        this._setReg8(reg, regs[reg]);
      }
      return 2;
    }

    // SET b, r (ED C0-FF)
    if ((opcode & 0xC0) === 0xC0) {
      const bit = (opcode >> 3) & 0x07;
      const reg = opcode & 0x07;
      const mask = 1 << bit;
      if (reg === 7) {
        const val = m.readByte(c.getPair('hl'));
        m.writeByte(c.getPair('hl'), val | mask);
      } else {
        const regs = [c.a, c.b, c.c, c.d, c.e, c.h, c.l, 0];
        regs[reg] |= mask;
        this._setReg8(reg, regs[reg]);
      }
      return 2;
    }

    return 2;
  }

  /** Execute ADD A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _addA(r) {
    const c = this.cpu;
    const result = (c.a + r) & 0xFF;
    c.a = result;
    c.setAddFlags8(c.a, r);
    c.setFlags8(result);
    c.setFlag(Flags.NEGATIVE, false);
    return 1;
  }

  /** Execute ADC A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _adcA(r) {
    const c = this.cpu;
    const cy = c.getFlag(Flags.CARRY) ? 1 : 0;
    const result = (c.a + r + cy) & 0xFF;
    c.a = result;
    c.setAddFlags8(c.a, r, cy === 1);
    c.setFlags8(result);
    c.setFlag(Flags.NEGATIVE, false);
    return 1;
  }

  /** Execute SUB A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _subA(r) {
    const c = this.cpu;
    const result = (c.a - r) & 0xFF;
    c.a = result;
    c.setFlag(Flags.CARRY, c.a > r);
    c.setFlag(Flags.HALF_CARRY, (c.a & 0x0F) > (r & 0x0F));
    c.setFlags8(result);
    c.setFlag(Flags.NEGATIVE, true);
    return 1;
  }

  /** Execute SBC A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _sbcA(r) {
    const c = this.cpu;
    const cy = c.getFlag(Flags.CARRY) ? 1 : 0;
    const result = (c.a - r - cy) & 0xFF;
    c.a = result;
    c.setFlag(Flags.CARRY, c.a > (r + cy));
    c.setFlag(Flags.HALF_CARRY, (c.a & 0x0F) > ((r + cy) & 0x0F));
    c.setFlags8(result);
    c.setFlag(Flags.NEGATIVE, true);
    return 1;
  }

  /** Execute AND A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _andA(r) {
    const c = this.cpu;
    c.a &= r;
    c.setFlags8(c.a);
    c.setFlag(Flags.PARITY_OVERFLOW, this._parity(c.a));
    c.setFlag(Flags.HALF_CARRY, true);
    c.setFlag(Flags.CARRY, false);
    return 1;
  }

  /** Execute OR A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _orA(r) {
    const c = this.cpu;
    c.a |= r;
    c.setFlags8(c.a);
    c.setFlag(Flags.PARITY_OVERFLOW, this._parity(c.a));
    c.setFlag(Flags.HALF_CARRY, false);
    c.setFlag(Flags.CARRY, false);
    return 1;
  }

  /** Execute CP A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _cpA(r) {
    const c = this.cpu;
    const result = (c.a - r) & 0xFF;
    c.setFlag(Flags.CARRY, c.a < r);
    c.setFlag(Flags.HALF_CARRY, (c.a & 0x0F) < (r & 0x0F));
    c.setFlags8(result);
    c.setFlag(Flags.NEGATIVE, true);
    return 1;
  }

  /** Execute DAA.
   * @returns {number}
   * @private
   */
  _daa() {
    const c = this.cpu;
    let a = c.a;
    let carry = c.getFlag(Flags.CARRY);
    if (c.getFlag(Flags.HALF_CARRY) || (a & 0x0F) > 9) {
      a = (a + 0x06) & 0xFF;
      carry = carry || (a > 0xFF);
    }
    if (c.getFlag(Flags.CARRY) || a > 0x9F) {
      a = (a + 0x60) & 0xFF;
      carry = true;
    }
    c.a = a;
    c.setFlag(Flags.ZERO, a === 0);
    c.setFlag(Flags.PARITY_OVERFLOW, this._parity(a));
    c.setFlag(Flags.HALF_CARRY, false);
    c.setFlag(Flags.CARRY, carry);
    c.setFlag(Flags.NEGATIVE, false);
    return 1;
  }

  /** Execute NEG.
   * @returns {number}
   * @private
   */
  _neg() {
    const c = this.cpu;
    const result = (0 - c.a) & 0xFF;
    c.a = result;
    c.setFlag(Flags.CARRY, c.a !== 0);
    c.setFlag(Flags.HALF_CARRY, (c.a & 0x0F) > 0);
    c.setFlags8(result);
    c.setFlag(Flags.NEGATIVE, true);
    c.setFlag(Flags.PARITY_OVERFLOW, this._parity(c.a));
    return 2;
  }

  /** Jump to address.
   * @param {number} addr
   * @returns {number}
   * @private
   */
  _jp(addr) { this.cpu.pc = addr; return 0; }

  /** Set an 8-bit register by index.
   * @param {number} reg
   * @param {number} value
   * @private
   */
  _setReg8(reg, value) {
    const v = value & 0xFF;
    switch (reg) {
      case 0: this.cpu.a = v; break;
      case 1: this.cpu.b = v; break;
      case 2: this.cpu.c = v; break;
      case 3: this.cpu.d = v; break;
      case 4: this.cpu.e = v; break;
      case 5: this.cpu.h = v; break;
      case 6: this.cpu.l = v; break;
    }
  }

  /** Calculate parity.
   * @param {number} value
   * @returns {number}
   * @private
   */
  _parity(value) {
    const v = value & 0xFF;
    let p = 0;
    for (let i = 0; i < 8; i++) p ^= (v >> i) & 1;
    return p ^ 1;
  }
}
