/**
 * Tests for IX/IY instructions in the Z80 simulator.
 * Covers LD, PUSH/POP, INC/DEC, memory access, and bit manipulation.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { Simulator } from '../simulator/simulator.js';
import { Flags } from '../simulator/cpu.js';

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

  it('should execute INC IX (DD 23)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x34, 0x12, // LD IX, 0x1234 (low=0x34, high=0x12)
      0xDD, 0x23, // INC IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x1235, 'IX should be incremented to 0x1235');
  });

  it('should execute INC IX with wrap-around (DD 23)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0xFF, 0xFF, // LD IX, 0xFFFF (low=0xFF, high=0xFF)
      0xDD, 0x23, // INC IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x0000, 'IX should wrap from 0xFFFF to 0x0000');
  });

  it('should execute INC IY (FD 23)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0xCD, 0xAB, // LD IY, 0xABCD (low=0xCD, high=0xAB)
      0xFD, 0x23, // INC IY
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.iy, 0xABCE, 'IY should be incremented to 0xABCE');
  });

  it('should execute DEC IX (DD 2B)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x34, 0x12, // LD IX, 0x1234 (low=0x34, high=0x12)
      0xDD, 0x2B, // DEC IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0x1233, 'IX should be decremented to 0x1233');
  });

  it('should execute DEC IX with wrap-around (DD 2B)', () => {
    const sim = new Simulator();
    const prog = [
      0xDD, 0x21, 0x00, 0x00, // LD IX, 0x0000 (low=0x00, high=0x00)
      0xDD, 0x2B, // DEC IX
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.ix, 0xFFFF, 'IX should wrap from 0x0000 to 0xFFFF');
  });

  it('should execute DEC IY (FD 2B)', () => {
    const sim = new Simulator();
    const prog = [
      0xFD, 0x21, 0xCD, 0xAB, // LD IY, 0xABCD (low=0xCD, high=0xAB)
      0xFD, 0x2B, // DEC IY
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.iy, 0xABCC, 'IY should be decremented to 0xABCC');
  });

  it('should execute INC (IX+d) (DD CB 34)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1208, 0x42); // IX=0x1200, disp=8 -> 0x1208
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x08, 0x34, // INC (IX+8) - address 0x1208
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1208), 0x43, 'Memory at 0x1208 should be incremented');
  });

  it('should execute DEC (IX+d) (DD CB 3C)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1209, 0x42); // IX=0x1200, disp=9 -> 0x1209
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x09, 0x3C, // DEC (IX+9) - address 0x1209
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1209), 0x41, 'Memory at 0x1209 should be decremented');
  });

  it('should execute INC (IY+d) (FD CB 34)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0xAB2C, 0xFF); // IY=0xAB00 (LE: 00,AB), disp=44=0x2C -> 0xAB2C
    const prog = [
      0xFD, 0x21, 0x00, 0xAB, // LD IY, 0xAB00 (low=0x00, high=0xAB)
      0xFD, 0xCB, 0x2C, 0x34, // INC (IY+44) - address 0xAB2C
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0xAB2C), 0x00, 'Memory at 0xAB2C should wrap from 0xFF to 0x00');
  });

  it('should execute DEC (IY+d) (FD CB 3C)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0xAB2D, 0x00); // IY=0xAB00 (LE: 00,AB), disp=45=0x2D -> 0xAB2D
    const prog = [
      0xFD, 0x21, 0x00, 0xAB, // LD IY, 0xAB00 (low=0x00, high=0xAB)
      0xFD, 0xCB, 0x2D, 0x3C, // DEC (IY+45) - address 0xAB2D
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0xAB2D), 0xFF, 'Memory at 0xAB2D should wrap from 0x00 to 0xFF');
  });

  it('should execute ADD A,(IX+d) (DD CB 86)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x120A, 0x10); // IX=0x1200, disp=10 -> 0x120A
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x0A, 0x86, // ADD A,(IX+10) - address 0x120A
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x10, 'A should be B(0) + 16 = 0x10');
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), false, 'ZERO flag should be false');
  });

  it('should execute ADC A,(IX+d) (DD CB 8E)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x120B, 0x05); // IX=0x1200, disp=11 -> 0x120B
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x0B, 0x8E, // ADC A,(IX+11) - address 0x120B
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x05, 'A should be B(0) + 5 = 0x05');
  });

  it('should execute SUB (IX+d) (DD CB 96)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x120C, 0x05); // IX=0x1200, disp=12 -> 0x120C
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x0C, 0x96, // SUB (IX+12) - address 0x120C
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0xFB, 'A should be B(0) - 5 = 0xFB');
  });

  it('should execute SBC A,(IX+d) (DD CB 9E)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x120D, 0x03); // IX=0x1200, disp=13 -> 0x120D
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x0D, 0x9E, // SBC A,(IX+13) - address 0x120D
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0xFD, 'A should be B(0) - 3 = 0xFD');
  });

  it('should execute AND (IX+d) (DD CB A6)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x120E, 0xF0); // IX=0x1200, disp=14 -> 0x120E
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x0E, 0xA6, // AND (IX+14) - address 0x120E
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x00, 'A should be B(0) & 0xF0 = 0x00');
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), true, 'ZERO flag should be true');
  });

  it('should execute XOR (IX+d) (DD CB AE)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x120F, 0xFF); // IX=0x1200, disp=15 -> 0x120F
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x0F, 0xAE, // XOR (IX+15) - address 0x120F
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0xFF, 'A should be B(0) ^ 0xFF = 0xFF');
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), false, 'ZERO flag should be false');
  });

  it('should execute OR (IX+d) (DD CB B6)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1210, 0x0F); // IX=0x1200, disp=16 -> 0x1210
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x10, 0xB6, // OR (IX+16) - address 0x1210
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x0F, 'A should be B(0) | 0x0F = 0x0F');
  });

  it('should execute CP (IX+d) (DD CB BE)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1211, 0xB0); // IX=0x1200, disp=17 -> 0x1211
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B
      0xDD, 0xCB, 0x11, 0xBE, // CP (IX+17) - address 0x1211
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x00, 'A should remain unchanged after CP');
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), false, 'ZERO flag should be false (0 != 0xB0)');
  });

  it('should execute RLC (IX+d) (DD CB 07)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1212, 0x80); // IX=0x1200, disp=18 -> 0x1212
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x12, 0x07, // RLC (IX+18) - address 0x1212
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1212), 0x01, 'RLC of 0x80 should be 0x01');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), true, 'CARRY flag should be true (MSB was 1)');
  });

  it('should execute RRC (IX+d) (DD CB 0F)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1213, 0x01); // IX=0x1200, disp=19 -> 0x1213
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x13, 0x0F, // RRC (IX+19) - address 0x1213
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1213), 0x80, 'RRC of 0x01 should be 0x80');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), true, 'CARRY flag should be true (LSB was 1)');
  });

  it('should execute RL (IX+d) (DD CB 17)', () => {
    const sim = new Simulator();
    sim.cpu.setFlag(Flags.CARRY, true);
    sim.memory.writeByte(0x1214, 0x80); // IX=0x1200, disp=20 -> 0x1214
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x14, 0x17, // RL (IX+20) - address 0x1214
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1214), 0x01, 'RL of 0x80 with CY=1 should be 0x01');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), true, 'CARRY flag should be true (MSB was 1)');
  });

  it('should execute RR (IX+d) (DD CB 1F)', () => {
    const sim = new Simulator();
    sim.cpu.setFlag(Flags.CARRY, true);
    sim.memory.writeByte(0x1215, 0x80); // IX=0x1200, disp=21 -> 0x1215
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x15, 0x1F, // RR (IX+21) - address 0x1215
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1215), 0xC0, 'RR of 0x80 with CY=1 should be 0xC0');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), false, 'CARRY flag should be false (LSB was 0)');
  });

  it('should execute SLA (IX+d) (DD CB 27)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1216, 0x07); // IX=0x1200, disp=22 -> 0x1216
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x16, 0x27, // SLA (IX+22) - address 0x1216
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1216), 0x0E, 'SLA of 0x07 should be 0x0E');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), false, 'CARRY flag should be false (MSB was 0)');
  });

  it('should execute SRA (IX+d) (DD CB 2F)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1217, 0xF7); // IX=0x1200, disp=23 -> 0x1217
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x17, 0x2F, // SRA (IX+23) - address 0x1217
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1217), 0xFB, 'SRA of 0xF7 should be 0xFB');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), true, 'CARRY flag should be true (LSB was 1)');
  });

  it('should execute SLL (IX+d) (DD CB 37)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1218, 0x07); // IX=0x1200, disp=24 -> 0x1218
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x18, 0x37, // SLL (IX+24) - address 0x1218
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1218), 0x0F, 'SLL of 0x07 should be 0x0F');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), false, 'CARRY flag should be false (MSB was 0)');
  });

  it('should execute SRL (IX+d) (DD CB 3F)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1219, 0xF7); // IX=0x1200, disp=25 -> 0x1219
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x19, 0x3F, // SRL (IX+25) - address 0x1219
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1219), 0x7B, 'SRL of 0xF7 should be 0x7B');
    assert.strictEqual(sim.cpu.getFlag(Flags.CARRY), true, 'CARRY flag should be true (LSB was 1)');
  });

  it('should execute BIT b,(IX+d) (DD CB 41)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x121A, 0b10101010); // IX=0x1200, disp=26 -> 0x121A
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0x1A, 0x41, // BIT 1,(IX+26) - address 0x121A
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), true, 'ZERO flag should be true (bit 1 is not set)');
    assert.strictEqual(sim.cpu.getFlag(Flags.NEGATIVE), false, 'NEGATIVE flag should be false');
    assert.strictEqual(sim.cpu.getFlag(Flags.HALF_CARRY), true, 'HALF_CARRY flag should be true');
  });

  it('should execute ADD A,(IX+d) (DD CB 81)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x121B, 0x05); // IX=0x1200, disp=27 -> 0x121B
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0x7C, // LD A, B (A=0)
      0xDD, 0xCB, 0x1B, 0x81, // ADD A,(IX+27) - address 0x121B (CB 81 = ADD, r=1 ignored)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x05, 'A should be 0 + 5 = 0x05');
  });

  it('should execute SET b,r (CB C1)', () => {
    const sim = new Simulator();
    const prog = [
      0xCB, 0xC1, // SET 0, C (CB C1 = SET bit 0, r=1=C)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.c, 0x01, 'C should be set to 0x01 (bit 0 set)');
  });

  it('should execute SET b,(IX+d) (DD CB d C6)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x1212, 0x00);
    sim.cpu.ix = 0x1210;
    const prog = [
      0xDD, 0xCB, 0x02, 0xC7, // SET 0, (IX+2) (DD CB d C7 = SET bit 0,(IX+d))
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x1212), 0x01, 'C should be set to 0x01 (bit 0 set)');
  });

  it('should execute negative displacement with (IX+d)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0x11FE, 0x5A); // IX=0x1200, disp=-2=0xFE -> 0x11FE
    const prog = [
      0xDD, 0x21, 0x00, 0x12, // LD IX, 0x1200
      0xDD, 0xCB, 0xFE, 0x34, // INC (IX-2) - address 0x11FE (displacement 0xFE = -2)
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.memory.readByte(0x11FE), 0x5B, 'Memory at 0x11FE should be incremented');
  });

  it('should execute ADD A,(IY+d) (FD CB 86)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0xAB2C, 0x20); // IY=0xAB00 (LE: 00,AB), disp=44 -> 0xAB2C
    const prog = [
      0xFD, 0x21, 0x00, 0xAB, // LD IY, 0xAB00 (low=0x00, high=0xAB)
      0x7C, // LD A, B
      0xFD, 0xCB, 0x2C, 0x86, // ADD A,(IY+44) - address 0xAB2C
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0x20, 'A should be B(0) + 0x20 = 0x20');
  });

  it('should execute SUB (IY+d) (FD CB 96)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0xAB2D, 0x10); // IY=0xAB00 (LE: 00,AB), disp=45 -> 0xAB2D
    const prog = [
      0xFD, 0x21, 0x00, 0xAB, // LD IY, 0xAB00 (low=0x00, high=0xAB)
      0x7C, // LD A, B
      0xFD, 0xCB, 0x2D, 0x96, // SUB (IY+45) - address 0xAB2D
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.a, 0xF0, 'A should be B(0) - 0x10 = 0xF0');
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), false, 'ZERO flag should be false');
  });

  it('should execute BIT b,(IY+d) (FD CB 41)', () => {
    const sim = new Simulator();
    sim.memory.writeByte(0xABE6, 0b11001100); // IY=0x00AB, disp=46 -> 0xABE6
    const prog = [
      0xFD, 0x21, 0x00, 0xAB, // LD IY, 0x00AB
      0xFD, 0xCB, 0x2E, 0x41, // BIT 2,(IY+46) - address 0xABE6
      0x76 // HALT
    ];
    sim.loadAndRun(0x0000, prog);
    assert.strictEqual(sim.cpu.getFlag(Flags.ZERO), false, 'ZERO flag should be false (bit 2 is set)');
    assert.strictEqual(sim.cpu.getFlag(Flags.PARITY_OVERFLOW), false, 'PARITY_OVERFLOW should be false');
  });
});
