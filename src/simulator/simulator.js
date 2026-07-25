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
    this.cpu.halted = false;
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
    const pairs = ['bc', 'de', 'hl', 'sp'];

    // Prefixes
    if (opcode === 0xCB) return 1 + this._executeCBPrefix(m.readByte(pc + 1));
    if (opcode === 0xED) return 1 + this._executeEDPrefix(m.readByte(pc + 1), pc + 1);

    // NOP
    if (opcode === 0x00) return 1;

    // HALT (0x76) / LD r, r' / LD r, (HL) / LD (HL), r -- 01 ddd sss
    if (opcode >= 0x40 && opcode <= 0x7F) {
      if (opcode === 0x76) { c.halted = true; return 1; }
      const dst = (opcode >> 3) & 0x07;
      const src = opcode & 0x07;
      this._writeReg8(dst, this._readReg8(src));
      return 1;
    }

    // LD r, n / LD (HL), n -- 00 rrr 110
    if ((opcode & 0xC7) === 0x06) {
      const dst = (opcode >> 3) & 0x07;
      this._writeReg8(dst, m.readByte(pc + 1));
      return 2;
    }

    // LD dd, nn -- 00 dd0 001
    if ((opcode & 0xCF) === 0x01) {
      const dd = (opcode >> 4) & 0x03;
      const val = m.readWord(pc + 1);
      if (dd === 3) c.sp = val; else c.setPair(pairs[dd], val);
      return 3;
    }

    // LD (nn), HL / LD HL, (nn)
    if (opcode === 0x22) { m.writeWord(m.readWord(pc + 1), c.getPair('hl')); return 3; }
    if (opcode === 0x2A) { c.setPair('hl', m.readWord(m.readWord(pc + 1))); return 3; }

    // LD A, (nn) / LD (nn), A
    if (opcode === 0x3A) { c.a = m.readByte(m.readWord(pc + 1)); return 3; }
    if (opcode === 0x32) { m.writeByte(m.readWord(pc + 1), c.a); return 3; }

    // LD A, (BC) / LD A, (DE) / LD (BC), A / LD (DE), A
    if (opcode === 0x0A) { c.a = m.readByte(c.getPair('bc')); return 1; }
    if (opcode === 0x1A) { c.a = m.readByte(c.getPair('de')); return 1; }
    if (opcode === 0x02) { m.writeByte(c.getPair('bc'), c.a); return 1; }
    if (opcode === 0x12) { m.writeByte(c.getPair('de'), c.a); return 1; }

    // LD SP, HL
    if (opcode === 0xF9) { c.sp = c.getPair('hl'); return 1; }

    // PUSH/POP
    if (opcode === 0xC5) { c.push(c.getPair('bc')); return 1; }
    if (opcode === 0xD5) { c.push(c.getPair('de')); return 1; }
    if (opcode === 0xE5) { c.push(c.getPair('hl')); return 1; }
    if (opcode === 0xF5) { c.push(c.getPair('af')); return 1; }
    if (opcode === 0xC1) { c.setPair('bc', c.pop()); return 1; }
    if (opcode === 0xD1) { c.setPair('de', c.pop()); return 1; }
    if (opcode === 0xE1) { c.setPair('hl', c.pop()); return 1; }
    if (opcode === 0xF1) { c.setPair('af', c.pop()); return 1; }

    // INC ss -- 00 dd0 011 / DEC ss -- 00 dd1 011
    if ((opcode & 0xCF) === 0x03) {
      const dd = (opcode >> 4) & 0x03;
      const v = dd === 3 ? c.sp : c.getPair(pairs[dd]);
      const r = (v + 1) & 0xFFFF;
      if (dd === 3) c.sp = r; else c.setPair(pairs[dd], r);
      return 1;
    }
    if ((opcode & 0xCF) === 0x0B) {
      const dd = (opcode >> 4) & 0x03;
      const v = dd === 3 ? c.sp : c.getPair(pairs[dd]);
      const r = (v - 1) & 0xFFFF;
      if (dd === 3) c.sp = r; else c.setPair(pairs[dd], r);
      return 1;
    }

    // ADD HL, ss -- 00 ss1 001
    if ((opcode & 0xCF) === 0x09) {
      const ss = (opcode >> 4) & 0x03;
      const hl = c.getPair('hl');
      const rv = ss === 3 ? c.sp : c.getPair(pairs[ss]);
      const result = (hl + rv) & 0xFFFF;
      c.setPair('hl', result);
      c.setFlag(Flags.CARRY, (hl + rv) > 0xFFFF);
      c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) + (rv & 0x0FFF)) > 0x0FFF);
      c.setFlag(Flags.NEGATIVE, false);
      return 1;
    }

    // INC r -- 00 rrr 100
    if ((opcode & 0xC7) === 0x04) {
      const r = (opcode >> 3) & 0x07;
      const val = this._readReg8(r);
      const result = (val + 1) & 0xFF;
      this._writeReg8(r, result);
      c.setFlag(Flags.HALF_CARRY, (val & 0x0F) === 0x0F);
      c.setFlag(Flags.ZERO, result === 0);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.PARITY_OVERFLOW, val === 0x7F);
      c.setFlag(Flags.SIGN, (result & 0x80) !== 0);
      return 1;
    }

    // DEC r -- 00 rrr 101
    if ((opcode & 0xC7) === 0x05) {
      const r = (opcode >> 3) & 0x07;
      const val = this._readReg8(r);
      const result = (val - 1) & 0xFF;
      this._writeReg8(r, result);
      c.setFlag(Flags.HALF_CARRY, (val & 0x0F) === 0x00);
      c.setFlag(Flags.ZERO, result === 0);
      c.setFlag(Flags.NEGATIVE, true);
      c.setFlag(Flags.PARITY_OVERFLOW, val === 0x80);
      c.setFlag(Flags.SIGN, (result & 0x80) !== 0);
      return 1;
    }

    // RLCA / RRCA / RLA / RRA
    if (opcode === 0x07) { const a = c.a; const cy = (a >> 7) & 1; c.a = ((a << 1) & 0xFF) | cy; c.setFlag(Flags.CARRY, cy === 1); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); c.setFlag(Flags.SIGN, ((c.a) & 0x80) !== 0); return 1; }
    if (opcode === 0x0F) { const a = c.a; const cy = a & 1; c.a = (a >> 1) | (cy << 7); c.setFlag(Flags.CARRY, cy === 1); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); c.setFlag(Flags.SIGN, ((c.a) & 0x80) !== 0); return 1; }
    if (opcode === 0x17) { const a = c.a; const oldCy = c.getFlag(Flags.CARRY) ? 1 : 0; c.setFlag(Flags.CARRY, ((a >> 7) & 1) === 1); c.a = ((a << 1) & 0xFF) | oldCy; c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); c.setFlag(Flags.SIGN, ((c.a) & 0x80) !== 0); return 1; }
    if (opcode === 0x1F) { const a = c.a; const oldCy = c.getFlag(Flags.CARRY) ? 1 : 0; c.setFlag(Flags.CARRY, (a & 1) === 1); c.a = (a >> 1) | (oldCy << 7); c.setFlag(Flags.HALF_CARRY, false); c.setFlag(Flags.NEGATIVE, false); c.setFlag(Flags.SIGN, ((c.a) & 0x80) !== 0); return 1; }

    // EX AF, AF'
    if (opcode === 0x08) { const sf = c.f; c.f = c.shadow.f; c.shadow.f = sf; return 1; }

    // DJNZ e
    if (opcode === 0x10) { const d = this._signedByte(m.readByte(pc + 1)); c.b = (c.b - 1) & 0xFF; if (c.b !== 0) { c.pc = (pc + 2 + d) & 0xFFFF; return 0; } return 2; }

    // JR e / JR cc, e
    if (opcode === 0x18) { const d = this._signedByte(m.readByte(pc + 1)); c.pc = (pc + 2 + d) & 0xFFFF; return 0; }
    if (opcode === 0x20) { const d = this._signedByte(m.readByte(pc + 1)); if (!c.getFlag(Flags.ZERO)) { c.pc = (pc + 2 + d) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x28) { const d = this._signedByte(m.readByte(pc + 1)); if (c.getFlag(Flags.ZERO)) { c.pc = (pc + 2 + d) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x30) { const d = this._signedByte(m.readByte(pc + 1)); if (!c.getFlag(Flags.CARRY)) { c.pc = (pc + 2 + d) & 0xFFFF; return 0; } return 2; }
    if (opcode === 0x38) { const d = this._signedByte(m.readByte(pc + 1)); if (c.getFlag(Flags.CARRY)) { c.pc = (pc + 2 + d) & 0xFFFF; return 0; } return 2; }

    // CPL / SCF / CCF
    if (opcode === 0x2F) { c.a = ~c.a & 0xFF; c.setFlag(Flags.NEGATIVE, true); c.setFlag(Flags.HALF_CARRY, true); return 1; }
    if (opcode === 0x37) { c.setFlag(Flags.CARRY, true); c.setFlag(Flags.NEGATIVE, false); c.setFlag(Flags.HALF_CARRY, false); return 1; }
    if (opcode === 0x3F) { const oldCy = c.getFlag(Flags.CARRY); c.setFlag(Flags.HALF_CARRY, oldCy); c.setFlag(Flags.CARRY, !oldCy); c.setFlag(Flags.NEGATIVE, false); return 1; }

    // DAA
    if (opcode === 0x27) { return this._daa(); }

    // ALU A, r -- 10 ooo rrr (0x80-0xBF)
    if (opcode >= 0x80 && opcode <= 0xBF) {
      const op = (opcode >> 3) & 0x07;
      this._aluApply(op, this._readReg8(opcode & 0x07));
      return 1;
    }

    // ALU A, n -- 11 ooo 110
    if ((opcode & 0xC7) === 0xC6) {
      const op = (opcode >> 3) & 0x07;
      this._aluApply(op, m.readByte(pc + 1));
      return 2;
    }

    // JP nn / JP cc, nn
    if (opcode === 0xC3) { c.pc = m.readWord(pc + 1); return 0; }
    if (opcode === 0xC2) { const a = m.readWord(pc + 1); if (c.getFlag(Flags.PARITY_OVERFLOW)) { c.pc = a; return 0; } return 3; }
    if (opcode === 0xCA) { const a = m.readWord(pc + 1); if (c.getFlag(Flags.SIGN)) { c.pc = a; return 0; } return 3; }
    if (opcode === 0xD2) { const a = m.readWord(pc + 1); if (!c.getFlag(Flags.PARITY_OVERFLOW)) { c.pc = a; return 0; } return 3; }
    if (opcode === 0xDA) { const a = m.readWord(pc + 1); if (!c.getFlag(Flags.PARITY_OVERFLOW)) { c.pc = a; return 0; } return 3; }
    if (opcode === 0xE2) { const a = m.readWord(pc + 1); if (c.getFlag(Flags.ZERO)) { c.pc = a; return 0; } return 3; }
    if (opcode === 0xEA) { const a = m.readWord(pc + 1); if (!c.getFlag(Flags.ZERO)) { c.pc = a; return 0; } return 3; }
    if (opcode === 0xE9) { c.pc = c.getPair('hl'); return 0; }

    // CALL nn / CALL cc, nn
    if (opcode === 0xCD) { c.push((pc + 3) & 0xFFFF); c.pc = m.readWord(pc + 1); return 0; }
    if (opcode === 0xC4) { const a = m.readWord(pc + 1); if (c.getFlag(Flags.PARITY_OVERFLOW)) { c.push((pc + 3) & 0xFFFF); c.pc = a; return 0; } return 3; }
    if (opcode === 0xCC) { const a = m.readWord(pc + 1); if (c.getFlag(Flags.SIGN)) { c.push((pc + 3) & 0xFFFF); c.pc = a; return 0; } return 3; }
    if (opcode === 0xD4) { const a = m.readWord(pc + 1); if (!c.getFlag(Flags.PARITY_OVERFLOW)) { c.push((pc + 3) & 0xFFFF); c.pc = a; return 0; } return 3; }
    if (opcode === 0xDC) { const a = m.readWord(pc + 1); if (!c.getFlag(Flags.PARITY_OVERFLOW)) { c.push((pc + 3) & 0xFFFF); c.pc = a; return 0; } return 3; }
    if (opcode === 0xE4) { const a = m.readWord(pc + 1); if (c.getFlag(Flags.ZERO)) { c.push((pc + 3) & 0xFFFF); c.pc = a; return 0; } return 3; }
    if (opcode === 0xEC) { const a = m.readWord(pc + 1); if (!c.getFlag(Flags.ZERO)) { c.push((pc + 3) & 0xFFFF); c.pc = a; return 0; } return 3; }

    // RET / RET cc
    if (opcode === 0xC9) { c.pc = c.pop(); return 0; }
    if (opcode === 0xC0) { if (c.getFlag(Flags.PARITY_OVERFLOW)) { c.pc = c.pop(); return 0; } return 1; }
    if (opcode === 0xC8) { if (c.getFlag(Flags.SIGN)) { c.pc = c.pop(); return 0; } return 1; }
    if (opcode === 0xD0) { if (!c.getFlag(Flags.PARITY_OVERFLOW)) { c.pc = c.pop(); return 0; } return 1; }
    if (opcode === 0xD8) { if (!c.getFlag(Flags.PARITY_OVERFLOW)) { c.pc = c.pop(); return 0; } return 1; }
    if (opcode === 0xE0) { if (c.getFlag(Flags.ZERO)) { c.pc = c.pop(); return 0; } return 1; }
    if (opcode === 0xE8) { if (!c.getFlag(Flags.ZERO)) { c.pc = c.pop(); return 0; } return 1; }

    // RST
    if (opcode === 0xC7) { c.push((pc + 1) & 0xFFFF); c.pc = 0x00; return 0; }
    if (opcode === 0xCF) { c.push((pc + 1) & 0xFFFF); c.pc = 0x08; return 0; }
    if (opcode === 0xD7) { c.push((pc + 1) & 0xFFFF); c.pc = 0x10; return 0; }
    if (opcode === 0xDF) { c.push((pc + 1) & 0xFFFF); c.pc = 0x18; return 0; }
    if (opcode === 0xE7) { c.push((pc + 1) & 0xFFFF); c.pc = 0x20; return 0; }
    if (opcode === 0xEF) { c.push((pc + 1) & 0xFFFF); c.pc = 0x28; return 0; }
    if (opcode === 0xF7) { c.push((pc + 1) & 0xFFFF); c.pc = 0x30; return 0; }
    if (opcode === 0xFF) { c.push((pc + 1) & 0xFFFF); c.pc = 0x38; return 0; }

    // IN A, (n) / OUT (n), A
    if (opcode === 0xDB) { c.a = this.io.handleIn(m.readByte(pc + 1)); return 2; }
    if (opcode === 0xD3) { this.io.handleOut(m.readByte(pc + 1), c.a); return 2; }

    // EI / DI
    if (opcode === 0xFB) { c.iff1 = 1; c.iff2 = 1; return 1; }
    if (opcode === 0xF3) { c.iff1 = 0; c.iff2 = 0; return 1; }

    // EXX
    if (opcode === 0xD9) { const t = { b: c.b, c: c.c, d: c.d, e: c.e, h: c.h, l: c.l }; c.b = c.shadow.b; c.c = c.shadow.c; c.d = c.shadow.d; c.e = c.shadow.e; c.h = c.shadow.h; c.l = c.shadow.l; c.shadow = t; return 1; }

    // EX DE, HL
    if (opcode === 0xEB) { const hl = c.getPair('hl'); const de = c.getPair('de'); c.setPair('hl', de); c.setPair('de', hl); return 1; }

    // EX (SP), HL
    if (opcode === 0xE3) { const hl = c.getPair('hl'); const sv = m.readWord(c.sp); m.writeWord(c.sp, hl); c.setPair('hl', sv); return 1; }

    // DD/FD prefixes (IX/IY) not implemented - treat as NOP + swallow prefix byte
    if (opcode === 0xDD || opcode === 0xFD) return 1;

    // Unknown
    return 1;
  }

  /** Execute a CB-prefixed instruction (rotates/shifts, BIT/RES/SET).
   * @param {number} opcode
   * @returns {number} Bytes consumed by the operation byte (always 1).
   * @private
   */
  _executeCBPrefix(opcode) {
    const c = this.cpu;
    const reg = opcode & 0x07;

    if (opcode < 0x40) {
      const op = (opcode >> 3) & 0x07;
      const result = this._shiftRotate8(op, this._readReg8(reg));
      this._writeReg8(reg, result);
      return 1;
    }

    const bit = (opcode >> 3) & 0x07;

    if (opcode < 0x80) {
      // BIT b, r/(HL)
      const val = this._readReg8(reg);
      const z = ((val >> bit) & 1) === 0;
      c.setFlag(Flags.ZERO, z);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, true);
      c.setFlag(Flags.PARITY_OVERFLOW, z);
      return 1;
    }

    if (opcode < 0xC0) {
      // RES b, r/(HL) -- no flags affected
      const val = this._readReg8(reg);
      this._writeReg8(reg, val & ~(1 << bit));
      return 1;
    }

    // SET b, r/(HL) -- no flags affected
    const val = this._readReg8(reg);
    this._writeReg8(reg, val | (1 << bit));
    return 1;
  }

  /** Apply a CB-prefixed rotate/shift operation.
   * @param {number} op - 0=RLC,1=RRC,2=RL,3=RR,4=SLA,5=SRA,6=SLL(undoc),7=SRL
   * @param {number} val
   * @returns {number} Result byte.
   * @private
   */
  _shiftRotate8(op, val) {
    const c = this.cpu;
    let result, carryOut;
    switch (op) {
      case 0: // RLC
        carryOut = (val >> 7) & 1;
        result = ((val << 1) & 0xFF) | carryOut;
        break;
      case 1: // RRC
        carryOut = val & 1;
        result = (val >> 1) | (carryOut << 7);
        break;
      case 2: { // RL
        const oldCarry = c.getFlag(Flags.CARRY) ? 1 : 0;
        carryOut = (val >> 7) & 1;
        result = ((val << 1) & 0xFF) | oldCarry;
        break;
      }
      case 3: { // RR
        const oldCarry = c.getFlag(Flags.CARRY) ? 1 : 0;
        carryOut = val & 1;
        result = (val >> 1) | (oldCarry << 7);
        break;
      }
      case 4: // SLA
        carryOut = (val >> 7) & 1;
        result = (val << 1) & 0xFF;
        break;
      case 5: // SRA
        carryOut = val & 1;
        result = (val >> 1) | (val & 0x80);
        break;
      case 6: // SLL (undocumented)
        carryOut = (val >> 7) & 1;
        result = ((val << 1) & 0xFF) | 1;
        break;
      default: // SRL
        carryOut = val & 1;
        result = val >> 1;
        break;
    }
    c.setFlag(Flags.CARRY, carryOut === 1);
    c.setFlag(Flags.ZERO, result === 0);
    c.setFlag(Flags.NEGATIVE, false);
    c.setFlag(Flags.HALF_CARRY, false);
    c.setFlag(Flags.PARITY_OVERFLOW, this._parity(result));
    c.setFlag(Flags.SIGN, (result & 0x80) !== 0);
    return result;
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
    const pairs = ['bc', 'de', 'hl', 'sp'];

    // LD (nn), dd -- ED 43,53,63,73
    if ((opcode & 0xCF) === 0x43) {
      const dd = (opcode >> 4) & 0x03;
      const addr = m.readWord(pc + 1);
      m.writeWord(addr, dd === 3 ? c.sp : c.getPair(pairs[dd]));
      return 3;
    }

    // LD dd, (nn) -- ED 4B,5B,6B,7B
    if ((opcode & 0xCF) === 0x4B) {
      const dd = (opcode >> 4) & 0x03;
      const addr = m.readWord(pc + 1);
      const val = m.readWord(addr);
      if (dd === 3) c.sp = val; else c.setPair(pairs[dd], val);
      return 3;
    }

    // ADC HL, ss -- ED 4A,5A,6A,7A
    if ((opcode & 0xCF) === 0x4A) {
      const ss = (opcode >> 4) & 0x03;
      const hl = c.getPair('hl');
      const rv = ss === 3 ? c.sp : c.getPair(pairs[ss]);
      const cy = c.getFlag(Flags.CARRY) ? 1 : 0;
      const result = (hl + rv + cy) & 0xFFFF;
      c.setPair('hl', result);
      c.setFlag(Flags.CARRY, (hl + rv + cy) > 0xFFFF);
      c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) + (rv & 0x0FFF) + cy) > 0x0FFF);
      c.setFlag(Flags.ZERO, result === 0);
      c.setFlag(Flags.NEGATIVE, false);
      return 1;
    }

    // SBC HL, ss -- ED 42,52,62,72
    if ((opcode & 0xCF) === 0x42) {
      const ss = (opcode >> 4) & 0x03;
      const hl = c.getPair('hl');
      const rv = ss === 3 ? c.sp : c.getPair(pairs[ss]);
      const cy = c.getFlag(Flags.CARRY) ? 1 : 0;
      const result = (hl - rv - cy) & 0xFFFF;
      c.setPair('hl', result);
      c.setFlag(Flags.CARRY, (hl - rv - cy) < 0);
      c.setFlag(Flags.HALF_CARRY, ((hl & 0x0FFF) - (rv & 0x0FFF) - cy) < 0);
      c.setFlag(Flags.ZERO, result === 0);
      c.setFlag(Flags.NEGATIVE, true);
      return 1;
    }

    // IN r, (C) -- ED 40,48,50,58,60,68,70,78
    if ((opcode & 0xC7) === 0x40) {
      const reg = (opcode >> 3) & 0x07;
      const val = this.io.handleIn(c.c);
      if (reg !== 6) this._writeReg8(reg, val);
      c.setFlag(Flags.ZERO, val === 0);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      c.setFlag(Flags.PARITY_OVERFLOW, this._parity(val));
      return 1;
    }

    // OUT (C), r -- ED 41,49,51,59,61,69,71,79
    if ((opcode & 0xC7) === 0x41) {
      const reg = (opcode >> 3) & 0x07;
      this.io.handleOut(c.c, reg === 6 ? 0 : this._readReg8(reg));
      return 1;
    }

    // NEG -- ED 44
    if (opcode === 0x44) return this._neg();

    // RETN -- ED 45
    if (opcode === 0x45) { c.pc = c.pop(); c.iff1 = c.iff2; return 0; }

    // RETI -- ED 4D
    if (opcode === 0x4D) { c.pc = c.pop(); return 0; }

    // IM 0 / IM 1 / IM 2
    if (opcode === 0x46) { c.im = 0; return 1; }
    if (opcode === 0x56) { c.im = 1; return 1; }
    if (opcode === 0x5E) { c.im = 2; return 1; }

    // LD I, A / LD R, A -- no flags affected
    if (opcode === 0x47) { c.i = c.a; return 1; }
    if (opcode === 0x4F) { c.r = c.a; return 1; }

    // LD A, I / LD A, R
    if (opcode === 0x57) {
      c.a = c.i;
      c.setFlag(Flags.ZERO, c.a === 0);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      c.setFlag(Flags.PARITY_OVERFLOW, c.iff2 === 1);
      return 1;
    }
    if (opcode === 0x5F) {
      c.a = c.r;
      c.setFlag(Flags.ZERO, c.a === 0);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      c.setFlag(Flags.PARITY_OVERFLOW, c.iff2 === 1);
      return 1;
    }

    // RRD -- ED 67
    if (opcode === 0x67) {
      const addr = c.getPair('hl');
      const memv = m.readByte(addr);
      const aLow = c.a & 0x0F;
      const memHigh = (memv >> 4) & 0x0F;
      const memLow = memv & 0x0F;
      m.writeByte(addr, ((aLow << 4) | memHigh) & 0xFF);
      c.a = (c.a & 0xF0) | memLow;
      c.setFlags8(c.a);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      return 1;
    }

    // RLD -- ED 6F
    if (opcode === 0x6F) {
      const addr = c.getPair('hl');
      const memv = m.readByte(addr);
      const aLow = c.a & 0x0F;
      const memHigh = (memv >> 4) & 0x0F;
      const memLow = memv & 0x0F;
      m.writeByte(addr, ((memLow << 4) | aLow) & 0xFF);
      c.a = (c.a & 0xF0) | memHigh;
      c.setFlags8(c.a);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      return 1;
    }

    // LDI / LDIR -- ED A0 / B0
    if (opcode === 0xA0 || opcode === 0xB0) {
      let hl = c.getPair('hl'), de = c.getPair('de'), bc = c.getPair('bc');
      do {
        m.writeByte(de, m.readByte(hl));
        hl = (hl + 1) & 0xFFFF; de = (de + 1) & 0xFFFF; bc = (bc - 1) & 0xFFFF;
      } while (opcode === 0xB0 && bc !== 0);
      c.setPair('hl', hl); c.setPair('de', de); c.setPair('bc', bc);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      c.setFlag(Flags.PARITY_OVERFLOW, bc !== 0);
      return 1;
    }

    // LDD / LDDR -- ED A8 / B8
    if (opcode === 0xA8 || opcode === 0xB8) {
      let hl = c.getPair('hl'), de = c.getPair('de'), bc = c.getPair('bc');
      do {
        m.writeByte(de, m.readByte(hl));
        hl = (hl - 1) & 0xFFFF; de = (de - 1) & 0xFFFF; bc = (bc - 1) & 0xFFFF;
      } while (opcode === 0xB8 && bc !== 0);
      c.setPair('hl', hl); c.setPair('de', de); c.setPair('bc', bc);
      c.setFlag(Flags.NEGATIVE, false);
      c.setFlag(Flags.HALF_CARRY, false);
      c.setFlag(Flags.PARITY_OVERFLOW, bc !== 0);
      return 1;
    }

    // CPI / CPIR -- ED A1 / B1
    if (opcode === 0xA1 || opcode === 0xB1) {
      let hl = c.getPair('hl'), bc = c.getPair('bc');
      let result = 0, halfCarry = false;
      do {
        const val = m.readByte(hl);
        result = (c.a - val) & 0xFF;
        halfCarry = (c.a & 0x0F) < (val & 0x0F);
        hl = (hl + 1) & 0xFFFF; bc = (bc - 1) & 0xFFFF;
      } while (opcode === 0xB1 && bc !== 0 && result !== 0);
      c.setPair('hl', hl); c.setPair('bc', bc);
      c.setFlag(Flags.ZERO, result === 0);
      c.setFlag(Flags.NEGATIVE, true);
      c.setFlag(Flags.HALF_CARRY, halfCarry);
      c.setFlag(Flags.PARITY_OVERFLOW, bc !== 0);
      return 1;
    }

    // CPD / CPDR -- ED A9 / B9
    if (opcode === 0xA9 || opcode === 0xB9) {
      let hl = c.getPair('hl'), bc = c.getPair('bc');
      let result = 0, halfCarry = false;
      do {
        const val = m.readByte(hl);
        result = (c.a - val) & 0xFF;
        halfCarry = (c.a & 0x0F) < (val & 0x0F);
        hl = (hl - 1) & 0xFFFF; bc = (bc - 1) & 0xFFFF;
      } while (opcode === 0xB9 && bc !== 0 && result !== 0);
      c.setPair('hl', hl); c.setPair('bc', bc);
      c.setFlag(Flags.ZERO, result === 0);
      c.setFlag(Flags.NEGATIVE, true);
      c.setFlag(Flags.HALF_CARRY, halfCarry);
      c.setFlag(Flags.PARITY_OVERFLOW, bc !== 0);
      return 1;
    }

    // INI / INIR -- ED A2 / B2
    if (opcode === 0xA2 || opcode === 0xB2) {
      let hl = c.getPair('hl');
      do {
        m.writeByte(hl, this.io.handleIn(c.c));
        hl = (hl + 1) & 0xFFFF;
        c.b = (c.b - 1) & 0xFF;
      } while (opcode === 0xB2 && c.b !== 0);
      c.setPair('hl', hl);
      c.setFlag(Flags.ZERO, c.b === 0);
      c.setFlag(Flags.NEGATIVE, true);
      return 1;
    }

    // IND / INDR -- ED AA / BA
    if (opcode === 0xAA || opcode === 0xBA) {
      let hl = c.getPair('hl');
      do {
        m.writeByte(hl, this.io.handleIn(c.c));
        hl = (hl - 1) & 0xFFFF;
        c.b = (c.b - 1) & 0xFF;
      } while (opcode === 0xBA && c.b !== 0);
      c.setPair('hl', hl);
      c.setFlag(Flags.ZERO, c.b === 0);
      c.setFlag(Flags.NEGATIVE, true);
      return 1;
    }

    // OUTI / OTIR -- ED A3 / B3
    if (opcode === 0xA3 || opcode === 0xB3) {
      let hl = c.getPair('hl');
      do {
        this.io.handleOut(c.c, m.readByte(hl));
        hl = (hl + 1) & 0xFFFF;
        c.b = (c.b - 1) & 0xFF;
      } while (opcode === 0xB3 && c.b !== 0);
      c.setPair('hl', hl);
      c.setFlag(Flags.ZERO, c.b === 0);
      c.setFlag(Flags.NEGATIVE, true);
      return 1;
    }

    // OUTD / OTDR -- ED AB / BB
    if (opcode === 0xAB || opcode === 0xBB) {
      let hl = c.getPair('hl');
      do {
        this.io.handleOut(c.c, m.readByte(hl));
        hl = (hl - 1) & 0xFFFF;
        c.b = (c.b - 1) & 0xFF;
      } while (opcode === 0xBB && c.b !== 0);
      c.setPair('hl', hl);
      c.setFlag(Flags.ZERO, c.b === 0);
      c.setFlag(Flags.NEGATIVE, true);
      return 1;
    }

    // Unimplemented/undocumented ED opcode
    return 1;
  }

  /** Apply an ALU operation (as encoded in the "ooo" field of ADD/ADC/SUB/SBC/AND/XOR/OR/CP) to A.
   * @param {number} op - 0=ADD,1=ADC,2=SUB,3=SBC,4=AND,5=XOR,6=OR,7=CP
   * @param {number} value
   * @private
   */
  _aluApply(op, value) {
    switch (op) {
      case 0: this._addA(value); break;
      case 1: this._adcA(value); break;
      case 2: this._subA(value); break;
      case 3: this._sbcA(value); break;
      case 4: this._andA(value); break;
      case 5: this._xorA(value); break;
      case 6: this._orA(value); break;
      default: this._cpA(value); break;
    }
  }

  /** Execute ADD A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _addA(r) {
    const c = this.cpu;
    const a = c.a;
    const result = (a + r) & 0xFF;
    c.a = result;
    c.setFlags8(result);
    c.setAddFlags8(a, r);
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
    const a = c.a;
    const result = (a + r + cy) & 0xFF;
    c.a = result;
    c.setFlags8(result);
    c.setAddFlags8(a, r, cy === 1);
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
    const a = c.a;
    const result = (a - r) & 0xFF;
    c.a = result;
    c.setFlags8(result);
    c.setFlag(Flags.CARRY, a < r);
    c.setFlag(Flags.HALF_CARRY, (a & 0x0F) < (r & 0x0F));
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
    const a = c.a;
    const rc = r + cy;
    const result = (a - rc) & 0xFF;
    c.a = result;
    c.setFlags8(result);
    c.setFlag(Flags.CARRY, a < rc);
    c.setFlag(Flags.HALF_CARRY, (a & 0x0F) < (r & 0x0F) + cy);
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
    c.setFlag(Flags.NEGATIVE, false);
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
    c.setFlag(Flags.NEGATIVE, false);
    c.setFlag(Flags.HALF_CARRY, false);
    c.setFlag(Flags.CARRY, false);
    return 1;
  }

  /** Execute XOR A, r.
   * @param {number} r
   * @returns {number}
   * @private
   */
  _xorA(r) {
    const c = this.cpu;
    c.a ^= r;
    c.setFlags8(c.a);
    c.setFlag(Flags.NEGATIVE, false);
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
    c.setFlags8(result);
    c.setFlag(Flags.CARRY, c.a < r);
    c.setFlag(Flags.HALF_CARRY, (c.a & 0x0F) < (r & 0x0F));
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
    const a = c.a;
    const result = (0 - a) & 0xFF;
    c.a = result;
    c.setFlags8(result);
    c.setFlag(Flags.CARRY, a !== 0);
    c.setFlag(Flags.HALF_CARRY, (a & 0x0F) !== 0);
    c.setFlag(Flags.NEGATIVE, true);
    c.setFlag(Flags.PARITY_OVERFLOW, this._parity(result));
    return 1;
  }

  /** Sign-extend an 8-bit byte to a JS number.
   * @param {number} b
   * @returns {number}
   * @private
   */
  _signedByte(b) { return b > 0x7F ? b - 256 : b; }

  /** Read an 8-bit register by standard Z80 r-field index (0=B,1=C,2=D,3=E,4=H,5=L,6=(HL),7=A).
   * @param {number} reg
   * @returns {number}
   * @private
   */
  _readReg8(reg) {
    const c = this.cpu;
    switch (reg) {
      case 0: return c.b;
      case 1: return c.c;
      case 2: return c.d;
      case 3: return c.e;
      case 4: return c.h;
      case 5: return c.l;
      case 6: return c.memory.readByte(c.getPair('hl'));
      default: return c.a;
    }
  }

  /** Write an 8-bit register by standard Z80 r-field index (0=B,1=C,2=D,3=E,4=H,5=L,6=(HL),7=A).
   * @param {number} reg
   * @param {number} value
   * @private
   */
  _writeReg8(reg, value) {
    const c = this.cpu;
    const v = value & 0xFF;
    switch (reg) {
      case 0: c.b = v; break;
      case 1: c.c = v; break;
      case 2: c.d = v; break;
      case 3: c.e = v; break;
      case 4: c.h = v; break;
      case 5: c.l = v; break;
      case 6: c.memory.writeByte(c.getPair('hl'), v); break;
      default: c.a = v; break;
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
