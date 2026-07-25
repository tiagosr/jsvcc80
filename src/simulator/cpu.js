/**
 * Z80 CPU state and instruction execution engine.
 * Cycle-unaware: instructions execute to completion without cycle counting.
 */

import { Memory } from './memory.js';

/** @typedef {import('./memory.js').Memory} Memory */

const MASK_8 = 0xFF;
const MASK_16 = 0xFFFF;

/**
 * Flags register (F) bit positions.
 */
export const Flags = {
  CARRY: 0,
  HALF_CARRY: 1,
  PARITY_OVERFLOW: 2,
  NEGATIVE: 3,
  ZERO: 6,
};

/**
 * Z80 CPU state holding all registers and flags.
 */
export class CPU {
  /**
   * @param {Memory} memory - Memory instance to use for accesses.
   */
  constructor(memory) {
    /** @type {Memory} */ this.memory = memory;
    this.reset();
  }

  /** Reset all registers to known state. */
  reset() {
    this.registers = {
      a: 0, f: 0,
      b: 0, c: 0,
      d: 0, e: 0,
      h: 0, l: 0,
      ix: 0, iy: 0,
      sp: 0xFFFF,
      pc: 0,
      r: 0,
      i: 0,
      iff1: 0,
      iff2: 0,
      im: 0,
      halted: false,
    };
    // Shadow registers for EXX
    this.shadow = { f: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0 };
    this._nextInstruction = null;
  }

  /** @returns {Record<string, number>} Current register values. */
  get registers() { return this._registers; }
  /** @param {Record<string, number>} v */
  set registers(v) { this._registers = v; }

  /** @returns {number} Program counter. */
  get pc() { return this._registers.pc; }
  /** @param {number} v */
  set pc(v) { this._registers.pc = v & MASK_16; }

  /** @returns {number} Stack pointer. */
  get sp() { return this._registers.sp; }
  /** @param {number} v */
  set sp(v) { this._registers.sp = v & MASK_16; }

  /** @returns {number} Accumulator (A). */
  get a() { return this._registers.a; }
  /** @param {number} v */
  set a(v) { this._registers.a = v & MASK_8; }

  /** @returns {number} Register B. */
  get b() { return this._registers.b; }
  /** @param {number} v */
  set b(v) { this._registers.b = v & MASK_8; }

  /** @returns {number} Register C. */
  get c() { return this._registers.c; }
  /** @param {number} v */
  set c(v) { this._registers.c = v & MASK_8; }

  /** @returns {number} Register D. */
  get d() { return this._registers.d; }
  /** @param {number} v */
  set d(v) { this._registers.d = v & MASK_8; }

  /** @returns {number} Register E. */
  get e() { return this._registers.e; }
  /** @param {number} v */
  set e(v) { this._registers.e = v & MASK_8; }

  /** @returns {number} Register H. */
  get h() { return this._registers.h; }
  /** @param {number} v */
  set h(v) { this._registers.h = v & MASK_8; }

  /** @returns {number} Register L. */
  get l() { return this._registers.l; }
  /** @param {number} v */
  set l(v) { this._registers.l = v & MASK_8; }

  /** @returns {number} Flags register (F). */
  get f() { return this._registers.f; }
  /** @param {number} v */
  set f(v) { this._registers.f = v & MASK_8; }

  /** @returns {{a:number,f:number,b:number,c:number,d:number,e:number,h:number,l:number,ix:number,iy:number,sp:number,pc:number,r:number,i:number,iff1:number,iff2:number,im:number,halted:boolean}} Full register state snapshot. */
  getSnapshot() {
    const s = { ...this._registers };
    s.shadow = { ...this.shadow };
    return s;
  }

  /** Restore from a snapshot.
   * @param {Record<string, unknown>} snap
   */
   restoreSnapshot(snap) {
     this._registers = {
       a: snap.a, f: snap.f,
       b: snap.b, c: snap.c,
       d: snap.d, e: snap.e,
       h: snap.h, l: snap.l,
       ix: snap.ix, iy: snap.iy,
       sp: snap.sp, pc: snap.pc,
       r: snap.r, i: snap.i,
       iff1: snap.iff1, iff2: snap.iff2,
       im: snap.im, halted: snap.halted,
     };
     if (snap.shadow) this.shadow = { ...snap.shadow };
   }

  /** Get 16-bit register pair value.
   * @param {'af'|'bc'|'de'|'hl'|'ix'|'iy'|'sp'} pair
   * @returns {number}
   */
  getPair(pair) {
    const p = pair.toLowerCase();
    switch (p) {
      case 'af': return (this.a << 8) | this.f;
      case 'bc': return (this.b << 8) | this.c;
      case 'de': return (this.d << 8) | this.e;
      case 'hl': return (this.h << 8) | this.l;
      case 'ix': return this.ix;
      case 'iy': return this.iy;
      case 'sp': return this.sp;
      default: throw new Error(`Unknown pair: ${pair}`);
    }
  }

  /** Set 16-bit register pair value.
   * @param {'af'|'bc'|'de'|'hl'|'ix'|'iy'|'sp'} pair
   * @param {number} value
   */
  setPair(pair, value) {
    const v = value & MASK_16;
    const p = pair.toLowerCase();
    switch (p) {
      case 'af': this.a = (v >> 8) & MASK_8; this.f = v & MASK_8; break;
      case 'bc': this.b = (v >> 8) & MASK_8; this.c = v & MASK_8; break;
      case 'de': this.d = (v >> 8) & MASK_8; this.e = v & MASK_8; break;
      case 'hl': this.h = (v >> 8) & MASK_8; this.l = v & MASK_8; break;
      case 'ix': this.ix = v; break;
      case 'iy': this.iy = v; break;
      case 'sp': this.sp = v; break;
    }
  }

  /** Read byte from memory.
   * @param {number} addr
   * @returns {number}
   */
  readByte(addr) { return this.memory.readByte(addr); }

  /** Read 16-bit value from memory (little-endian).
   * @param {number} addr
   * @returns {number}
   */
  readWord(addr) {
    return this.memory.readByte(addr) | (this.memory.readByte(addr + 1) << 8);
  }

  /** Write byte to memory.
   * @param {number} addr
   * @param {number} value
   */
  writeByte(addr, value) { this.memory.writeByte(addr, value); }

  /** Write 16-bit value to memory (little-endian).
   * @param {number} addr
   * @param {number} value
   */
  writeWord(addr, value) {
    this.memory.writeByte(addr, value & MASK_8);
    this.memory.writeByte(addr + 1, (value >> 8) & MASK_8);
  }

  /** Push 16-bit value onto stack.
   * @param {number} value
   */
   push(value) {
     this.sp = ((this.sp - 2) & MASK_16);
     this.writeWord(this.sp, value);
   }

   /** Pop 16-bit value from stack.
    * @returns {number}
    */
   pop() {
     const val = this.readWord(this.sp);
     this.sp = (this.sp + 2) & MASK_16;
     return val;
   }

  /** Set flag bit.
   * @param {number} flag - Flag constant.
   * @param {boolean} value
   */
  setFlag(flag, value) {
    this.f = (this.f & ~(1 << flag)) | ((value ? 1 : 0) << flag);
  }

  /** Get flag bit.
    * @param {number} flag
    * @returns {boolean}
    */
   getFlag(flag) { return ((this.f >> flag) & 1) === 1; }

  /** Set flags based on 8-bit result.
   * @param {number} value
   */
  setFlags8(value) {
    this.setFlag(Flags.ZERO, (value & MASK_8) === 0);
    this.setFlag(Flags.NEGATIVE, ((value & 0x80) !== 0) || (value < 0));
    this.setFlag(Flags.HALF_CARRY, false);
    this.setFlag(Flags.CARRY, (value & 0x100) !== 0);
    this.setFlag(Flags.PARITY_OVERFLOW, this._parity(value));
  }

  /** Set flags based on 16-bit result.
   * @param {number} _value - Not used for 16-bit flags.
   */
  setFlags16(_value) {
    // 16-bit ops don't affect Z or P flags per Z80 spec
    this.setFlag(Flags.ZERO, false);
    this.setFlag(Flags.NEGATIVE, false);
  }

  /** Set carry/half-carry flags for 8-bit addition.
   * @param {number} a
   * @param {number} b
   * @param {boolean} [carryIn=false]
   */
  setAddFlags8(a, b, carryIn = false) {
    const result = a + b + (carryIn ? 1 : 0);
    this.setFlag(Flags.CARRY, result > MASK_8);
    this.setFlag(Flags.HALF_CARRY, ((a & 0x0F) + (b & 0x0F) + (carryIn ? 1 : 0)) > 0x0F);
  }

  /** Set carry/half-carry flags for 16-bit addition.
   * @param {number} a
   * @param {number} b
   * @param {boolean} [carryIn=false]
   */
  setAddFlags16(a, b, carryIn = false) {
    const result = a + b + (carryIn ? 1 : 0);
    this.setFlag(Flags.CARRY, result > MASK_16);
    this.setFlag(Flags.HALF_CARRY, ((a & 0x0FFF) + (b & 0x0FFF) + (carryIn ? 1 : 0)) > 0x0FFF);
  }

  /** Calculate parity of an 8-bit value.
   * @param {number} value
   * @returns {number} 1 if even parity, 0 otherwise.
   */
  _parity(value) {
    const v = value & MASK_8;
    let p = 0;
    for (let i = 0; i < 8; i++) p ^= (v >> i) & 1;
    return p ^ 1; // Z80 sets P flag for even parity
  }
}
