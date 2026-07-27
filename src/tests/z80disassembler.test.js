/**
 * Comprehensive tests for the Z80 disassembler module.
 * Covers standard opcodes, CB/ED/DD/FD prefixed instructions,
 * Z80Instruction class, Z80Disassembler class, symbol resolution,
 * disassembleToLines helper, and edge cases.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import {
  Z80Disassembler,
  Z80Instruction,
  disassemble,
  disassembleToLines
} from '../../src/disassembler/z80disassembler.js';

describe('Z80 Disassembler - Standard Opcode Disassembly', () => {
  it('should disassemble NOP (0x00) as "NOP" with length 1', () => {
    const inst = disassemble([0x00])[0];
    assert.strictEqual(inst.mnemonic, 'NOP');
    assert.strictEqual(inst.length, 1);
    assert.strictEqual(inst.bytes.length, 1);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LD BC,nn (0x01) with 16-bit immediate', () => {
    const inst = disassemble([0x01, 0x34, 0x12])[0];
    assert.strictEqual(inst.mnemonic, 'LD BC,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.bytes.length, 3);
    assert.strictEqual(inst.operands[0], '$1234');
  });

  it('should disassemble LD (BC),A (0x02) with length 1', () => {
    const inst = disassemble([0x02])[0];
    assert.strictEqual(inst.mnemonic, 'LD (BC),A');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble INC BC (0x03) with length 1', () => {
    const inst = disassemble([0x03])[0];
    assert.strictEqual(inst.mnemonic, 'INC BC');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble INC B (0x04) with length 1', () => {
    const inst = disassemble([0x04])[0];
    assert.strictEqual(inst.mnemonic, 'INC B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble DEC B (0x05) with length 1', () => {
    const inst = disassemble([0x05])[0];
    assert.strictEqual(inst.mnemonic, 'DEC B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD B,n (0x06) with 8-bit immediate', () => {
    const inst = disassemble([0x06, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'LD B,n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble RLCA (0x07) with length 1', () => {
    const inst = disassemble([0x07])[0];
    assert.strictEqual(inst.mnemonic, 'RLCA');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble EX AF,AF\' (0x08) with length 1', () => {
    const inst = disassemble([0x08])[0];
    assert.strictEqual(inst.mnemonic, 'EX AF,AF\'');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble ADD HL,BC (0x09) with length 1', () => {
    const inst = disassemble([0x09])[0];
    assert.strictEqual(inst.mnemonic, 'ADD HL,BC');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD A,(BC) (0x0A) with length 1', () => {
    const inst = disassemble([0x0A])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,(BC)');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble DEC BC (0x0B) with length 1', () => {
    const inst = disassemble([0x0B])[0];
    assert.strictEqual(inst.mnemonic, 'DEC BC');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD DE,nn (0x11) with 16-bit immediate', () => {
    const inst = disassemble([0x11, 0x78, 0x56])[0];
    assert.strictEqual(inst.mnemonic, 'LD DE,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$5678');
  });

  it('should disassemble INC DE (0x13) with length 1', () => {
    const inst = disassemble([0x13])[0];
    assert.strictEqual(inst.mnemonic, 'INC DE');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RLA (0x17) with length 1', () => {
    const inst = disassemble([0x17])[0];
    assert.strictEqual(inst.mnemonic, 'RLA');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble JR e (0x18) with relative offset', () => {
    const inst = disassemble([0x18, 0x10])[0];
    assert.strictEqual(inst.mnemonic, 'JR e');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$10');
  });

  it('should disassemble LD HL,nn (0x21) with 16-bit immediate', () => {
    const inst = disassemble([0x21, 0xCD, 0xAB])[0];
    assert.strictEqual(inst.mnemonic, 'LD HL,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$abcd');
  });

  it('should disassemble INC HL (0x23) with length 1', () => {
    const inst = disassemble([0x23])[0];
    assert.strictEqual(inst.mnemonic, 'INC HL');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble DEC HL (0x2B) with length 1', () => {
    const inst = disassemble([0x2B])[0];
    assert.strictEqual(inst.mnemonic, 'DEC HL');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD A,n (0x3E) with 8-bit immediate', () => {
    const inst = disassemble([0x3E, 0xFF])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$ff');
  });

  it('should disassemble RET (0xC9) with length 1', () => {
    const inst = disassemble([0xC9])[0];
    assert.strictEqual(inst.mnemonic, 'RET');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble JP nn (0xC3) with 16-bit address', () => {
    const inst = disassemble([0xC3, 0x34, 0x12])[0];
    assert.strictEqual(inst.mnemonic, 'JP nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$1234');
  });

  it('should disassemble CALL nn (0xCD) with 16-bit address', () => {
    const inst = disassemble([0xCD, 0x78, 0x56])[0];
    assert.strictEqual(inst.mnemonic, 'CALL nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$5678');
  });

  it('should disassemble JP (HL) (0xE9) with length 1', () => {
    const inst = disassemble([0xE9])[0];
    assert.strictEqual(inst.mnemonic, 'JP (HL)');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD SP,nn (0x31) with 16-bit immediate', () => {
    const inst = disassemble([0x31, 0xFF, 0xFF])[0];
    assert.strictEqual(inst.mnemonic, 'LD SP,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$ffff');
  });

  it('should disassemble PUSH BC (0xC5) with length 1', () => {
    const inst = disassemble([0xC5])[0];
    assert.strictEqual(inst.mnemonic, 'PUSH BC');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble POP BC (0xC1) with length 1', () => {
    const inst = disassemble([0xC1])[0];
    assert.strictEqual(inst.mnemonic, 'POP BC');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble HALT (0x76) with length 1', () => {
    const inst = disassemble([0x76])[0];
    assert.strictEqual(inst.mnemonic, 'HALT');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble EI (0xFB) with length 1', () => {
    const inst = disassemble([0xFB])[0];
    assert.strictEqual(inst.mnemonic, 'EI');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble DI (0xF3) with length 1', () => {
    const inst = disassemble([0xF3])[0];
    assert.strictEqual(inst.mnemonic, 'DI');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble DAA (0x27) with length 1', () => {
    const inst = disassemble([0x27])[0];
    assert.strictEqual(inst.mnemonic, 'DAA');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble SCF (0x37) with length 1', () => {
    const inst = disassemble([0x37])[0];
    assert.strictEqual(inst.mnemonic, 'SCF');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble CCF (0x3F) with length 1', () => {
    const inst = disassemble([0x3F])[0];
    assert.strictEqual(inst.mnemonic, 'CCF');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble CPL (0x2F) with length 1', () => {
    const inst = disassemble([0x2F])[0];
    assert.strictEqual(inst.mnemonic, 'CPL');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 0 (0xC7) with length 1', () => {
    const inst = disassemble([0xC7])[0];
    assert.strictEqual(inst.mnemonic, 'RST 0');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 8 (0xCF) with length 1', () => {
    const inst = disassemble([0xCF])[0];
    assert.strictEqual(inst.mnemonic, 'RST 8');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 10 (0xD7) with length 1', () => {
    const inst = disassemble([0xD7])[0];
    assert.strictEqual(inst.mnemonic, 'RST 10');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 18 (0xDF) with length 1', () => {
    const inst = disassemble([0xDF])[0];
    assert.strictEqual(inst.mnemonic, 'RST 18');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 20 (0xE7) with length 1', () => {
    const inst = disassemble([0xE7])[0];
    assert.strictEqual(inst.mnemonic, 'RST 20');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 28 (0xEF) with length 1', () => {
    const inst = disassemble([0xEF])[0];
    assert.strictEqual(inst.mnemonic, 'RST 28');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 30 (0xF7) with length 1', () => {
    const inst = disassemble([0xF7])[0];
    assert.strictEqual(inst.mnemonic, 'RST 30');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RST 38 (0xFF) with length 1', () => {
    const inst = disassemble([0xFF])[0];
    assert.strictEqual(inst.mnemonic, 'RST 38');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble JR NZ,e (0x20) with relative offset', () => {
    const inst = disassemble([0x20, 0x10])[0];
    assert.strictEqual(inst.mnemonic, 'JR NZ,e');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$10');
  });

  it('should disassemble JR Z,e (0x28) with relative offset', () => {
    const inst = disassemble([0x28, 0x10])[0];
    assert.strictEqual(inst.mnemonic, 'JR Z,e');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$10');
  });

  it('should disassemble JR NC,e (0x30) with relative offset', () => {
    const inst = disassemble([0x30, 0x10])[0];
    assert.strictEqual(inst.mnemonic, 'JR NC,e');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$10');
  });

  it('should disassemble JR C,e (0x38) with relative offset', () => {
    const inst = disassemble([0x38, 0x10])[0];
    assert.strictEqual(inst.mnemonic, 'JR C,e');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$10');
  });

  it('should disassemble RET NZ (0xC0) with length 1', () => {
    const inst = disassemble([0xC0])[0];
    assert.strictEqual(inst.mnemonic, 'RET NZ');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble RET Z (0xC8) with length 1', () => {
    const inst = disassemble([0xC8])[0];
    assert.strictEqual(inst.mnemonic, 'RET Z');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble JP NZ,nn (0xC2) with 16-bit address', () => {
    const inst = disassemble([0xC2, 0x34, 0x12])[0];
    assert.strictEqual(inst.mnemonic, 'JP NZ,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$1234');
  });

  it('should disassemble JP Z,nn (0xCA) with 16-bit address', () => {
    const inst = disassemble([0xCA, 0x34, 0x12])[0];
    assert.strictEqual(inst.mnemonic, 'JP Z,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$1234');
  });

  it('should disassemble CALL NZ,nn (0xC4) with 16-bit address', () => {
    const inst = disassemble([0xC4, 0x78, 0x56])[0];
    assert.strictEqual(inst.mnemonic, 'CALL NZ,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$5678');
  });

  it('should disassemble CALL Z,nn (0xCC) with 16-bit address', () => {
    const inst = disassemble([0xCC, 0x78, 0x56])[0];
    assert.strictEqual(inst.mnemonic, 'CALL Z,nn');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '$5678');
  });

  it('should disassemble ADD A,n (0xC6) with 8-bit immediate', () => {
    const inst = disassemble([0xC6, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'ADD A,n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble SUB n (0xD6) with 8-bit immediate', () => {
    const inst = disassemble([0xD6, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'SUB n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble AND n (0xE6) with 8-bit immediate', () => {
    const inst = disassemble([0xE6, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'AND n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble XOR n (0xEE) with 8-bit immediate', () => {
    const inst = disassemble([0xEE, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'XOR n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble OR n (0xF6) with 8-bit immediate', () => {
    const inst = disassemble([0xF6, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'OR n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble CP n (0xFE) with 8-bit immediate', () => {
    const inst = disassemble([0xFE, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'CP n');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '$42');
  });

  it('should disassemble LD B,B (0x40) with length 1', () => {
    const inst = disassemble([0x40])[0];
    assert.strictEqual(inst.mnemonic, 'LD B,B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD B,C (0x41) with length 1', () => {
    const inst = disassemble([0x41])[0];
    assert.strictEqual(inst.mnemonic, 'LD B,C');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD B,(HL) (0x46) with length 1', () => {
    const inst = disassemble([0x46])[0];
    assert.strictEqual(inst.mnemonic, 'LD B,(HL)');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD B,A (0x47) with length 1', () => {
    const inst = disassemble([0x47])[0];
    assert.strictEqual(inst.mnemonic, 'LD B,A');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD (HL),B (0x70) with length 1', () => {
    const inst = disassemble([0x70])[0];
    assert.strictEqual(inst.mnemonic, 'LD (HL),B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble LD (HL),A (0x77) with length 1', () => {
    const inst = disassemble([0x77])[0];
    assert.strictEqual(inst.mnemonic, 'LD (HL),A');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble ADD A,B (0x80) with length 1', () => {
    const inst = disassemble([0x80])[0];
    assert.strictEqual(inst.mnemonic, 'ADD A,B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble SUB A,B (0x90) with length 1', () => {
    const inst = disassemble([0x90])[0];
    assert.strictEqual(inst.mnemonic, 'SUB A,B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble AND B (0xA0) with length 1', () => {
    const inst = disassemble([0xA0])[0];
    assert.strictEqual(inst.mnemonic, 'AND B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble OR B (0xB0) with length 1', () => {
    const inst = disassemble([0xB0])[0];
    assert.strictEqual(inst.mnemonic, 'OR B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble CP B (0xB8) with length 1', () => {
    const inst = disassemble([0xB8])[0];
    assert.strictEqual(inst.mnemonic, 'CP B');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble EX (SP),HL (0xE3) with length 1', () => {
    const inst = disassemble([0xE3])[0];
    assert.strictEqual(inst.mnemonic, 'EX (SP),HL');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble EX DE,HL (0xEB) with length 1', () => {
    const inst = disassemble([0xEB])[0];
    assert.strictEqual(inst.mnemonic, 'EX DE,HL');
    assert.strictEqual(inst.length, 1);
  });

  it('should disassemble EXX (0xD9) with length 1', () => {
    const inst = disassemble([0xD9])[0];
    assert.strictEqual(inst.mnemonic, 'EXX');
    assert.strictEqual(inst.length, 1);
  });
});

describe('Z80 Disassembler - CB-Prefixed Opcode Disassembly', () => {
  it('should disassemble RLC B (CB 00) with length 2', () => {
    const inst = disassemble([0xCB, 0x00])[0];
    assert.strictEqual(inst.mnemonic, 'RLC B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble RLC C (CB 01) with length 2', () => {
    const inst = disassemble([0xCB, 0x01])[0];
    assert.strictEqual(inst.mnemonic, 'RLC C');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'C');
  });

  it('should disassemble RLC (HL) (CB 06) with length 2', () => {
    const inst = disassemble([0xCB, 0x06])[0];
    assert.strictEqual(inst.mnemonic, 'RLC (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble RLC A (CB 07) with length 2', () => {
    const inst = disassemble([0xCB, 0x07])[0];
    assert.strictEqual(inst.mnemonic, 'RLC A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble RRC B (CB 08) with length 2', () => {
    const inst = disassemble([0xCB, 0x08])[0];
    assert.strictEqual(inst.mnemonic, 'RRC B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble RRC (HL) (CB 0E) with length 2', () => {
    const inst = disassemble([0xCB, 0x0E])[0];
    assert.strictEqual(inst.mnemonic, 'RRC (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble RRC A (CB 0F) with length 2', () => {
    const inst = disassemble([0xCB, 0x0F])[0];
    assert.strictEqual(inst.mnemonic, 'RRC A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble RL B (CB 10) with length 2', () => {
    const inst = disassemble([0xCB, 0x10])[0];
    assert.strictEqual(inst.mnemonic, 'RL B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble RL (HL) (CB 16) with length 2', () => {
    const inst = disassemble([0xCB, 0x16])[0];
    assert.strictEqual(inst.mnemonic, 'RL (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble RL A (CB 17) with length 2', () => {
    const inst = disassemble([0xCB, 0x17])[0];
    assert.strictEqual(inst.mnemonic, 'RL A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble RR B (CB 18) with length 2', () => {
    const inst = disassemble([0xCB, 0x18])[0];
    assert.strictEqual(inst.mnemonic, 'RR B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble RR (HL) (CB 1E) with length 2', () => {
    const inst = disassemble([0xCB, 0x1E])[0];
    assert.strictEqual(inst.mnemonic, 'RR (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble RR A (CB 1F) with length 2', () => {
    const inst = disassemble([0xCB, 0x1F])[0];
    assert.strictEqual(inst.mnemonic, 'RR A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble SLA B (CB 20) with length 2', () => {
    const inst = disassemble([0xCB, 0x20])[0];
    assert.strictEqual(inst.mnemonic, 'SLA B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble SLA (HL) (CB 26) with length 2', () => {
    const inst = disassemble([0xCB, 0x26])[0];
    assert.strictEqual(inst.mnemonic, 'SLA (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble SLA A (CB 27) with length 2', () => {
    const inst = disassemble([0xCB, 0x27])[0];
    assert.strictEqual(inst.mnemonic, 'SLA A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble SRA B (CB 28) with length 2', () => {
    const inst = disassemble([0xCB, 0x28])[0];
    assert.strictEqual(inst.mnemonic, 'SRA B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble SRA (HL) (CB 2E) with length 2', () => {
    const inst = disassemble([0xCB, 0x2E])[0];
    assert.strictEqual(inst.mnemonic, 'SRA (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble SRA A (CB 2F) with length 2', () => {
    const inst = disassemble([0xCB, 0x2F])[0];
    assert.strictEqual(inst.mnemonic, 'SRA A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble SLL B (CB 30) with length 2', () => {
    const inst = disassemble([0xCB, 0x30])[0];
    assert.strictEqual(inst.mnemonic, 'SLL B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble SLL (HL) (CB 36) with length 2', () => {
    const inst = disassemble([0xCB, 0x36])[0];
    assert.strictEqual(inst.mnemonic, 'SLL (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble SLL A (CB 37) with length 2', () => {
    const inst = disassemble([0xCB, 0x37])[0];
    assert.strictEqual(inst.mnemonic, 'SLL A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble SRL B (CB 38) with length 2', () => {
    const inst = disassemble([0xCB, 0x38])[0];
    assert.strictEqual(inst.mnemonic, 'SRL B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'B');
  });

  it('should disassemble SRL (HL) (CB 3E) with length 2', () => {
    const inst = disassemble([0xCB, 0x3E])[0];
    assert.strictEqual(inst.mnemonic, 'SRL (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '(HL)');
  });

  it('should disassemble SRL A (CB 3F) with length 2', () => {
    const inst = disassemble([0xCB, 0x3F])[0];
    assert.strictEqual(inst.mnemonic, 'SRL A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], 'A');
  });

  it('should disassemble BIT 0,B (CB 40) with length 2', () => {
    const inst = disassemble([0xCB, 0x40])[0];
    assert.strictEqual(inst.mnemonic, 'BIT 0,B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], 'B');
  });

  it('should disassemble BIT 0,(HL) (CB 46) with length 2', () => {
    const inst = disassemble([0xCB, 0x46])[0];
    assert.strictEqual(inst.mnemonic, 'BIT 0,(HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], '(HL)');
  });

  it('should disassemble BIT 0,A (CB 47) with length 2', () => {
    const inst = disassemble([0xCB, 0x47])[0];
    assert.strictEqual(inst.mnemonic, 'BIT 0,A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], 'A');
  });

  it('should disassemble RES 0,B (CB 80) with length 2', () => {
    const inst = disassemble([0xCB, 0x80])[0];
    assert.strictEqual(inst.mnemonic, 'RES 0,B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], 'B');
  });

  it('should disassemble RES 0,(HL) (CB 86) with length 2', () => {
    const inst = disassemble([0xCB, 0x86])[0];
    assert.strictEqual(inst.mnemonic, 'RES 0,(HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], '(HL)');
  });

  it('should disassemble RES 0,A (CB 87) with length 2', () => {
    const inst = disassemble([0xCB, 0x87])[0];
    assert.strictEqual(inst.mnemonic, 'RES 0,A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], 'A');
  });

  it('should disassemble SET 0,B (CB C0) with length 2', () => {
    const inst = disassemble([0xCB, 0xC0])[0];
    assert.strictEqual(inst.mnemonic, 'SET 0,B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], 'B');
  });

  it('should disassemble SET 0,(HL) (CB C6) with length 2', () => {
    const inst = disassemble([0xCB, 0xC6])[0];
    assert.strictEqual(inst.mnemonic, 'SET 0,(HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], '(HL)');
  });

  it('should disassemble SET 0,A (CB C7) with length 2', () => {
    const inst = disassemble([0xCB, 0xC7])[0];
    assert.strictEqual(inst.mnemonic, 'SET 0,A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], 'A');
  });
});

describe('Z80 Disassembler - ED-Prefixed Opcode Disassembly', () => {
  it('should disassemble ADC B (ED 40) with length 2', () => {
    const inst = disassemble([0xED, 0x40])[0];
    assert.strictEqual(inst.mnemonic, 'ADC B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble ADC (HL) (ED 46) with length 2', () => {
    const inst = disassemble([0xED, 0x46])[0];
    assert.strictEqual(inst.mnemonic, 'ADC (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble ADC A (ED 47) with length 2', () => {
    const inst = disassemble([0xED, 0x47])[0];
    assert.strictEqual(inst.mnemonic, 'ADC A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble SBC B (ED 48) with length 2', () => {
    const inst = disassemble([0xED, 0x48])[0];
    assert.strictEqual(inst.mnemonic, 'SBC B');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble SBC (HL) (ED 4E) with length 2', () => {
    const inst = disassemble([0xED, 0x4E])[0];
    assert.strictEqual(inst.mnemonic, 'SBC (HL)');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble SBC A (ED 4F) with length 2', () => {
    const inst = disassemble([0xED, 0x4F])[0];
    assert.strictEqual(inst.mnemonic, 'SBC A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble IM 0 (ED 50) with length 2', () => {
    const inst = disassemble([0xED, 0x50])[0];
    assert.strictEqual(inst.mnemonic, 'IM 0');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble IM 1 (ED 51) with length 2', () => {
    const inst = disassemble([0xED, 0x51])[0];
    assert.strictEqual(inst.mnemonic, 'IM 1');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble IM 2 (ED 52) with length 2', () => {
    const inst = disassemble([0xED, 0x52])[0];
    assert.strictEqual(inst.mnemonic, 'IM 2');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LD A,I (ED 53) with length 2', () => {
    const inst = disassemble([0xED, 0x53])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,I');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LD A,R (ED 54) with length 2', () => {
    const inst = disassemble([0xED, 0x54])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,R');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LD I,A (ED 55) with length 2', () => {
    const inst = disassemble([0xED, 0x55])[0];
    assert.strictEqual(inst.mnemonic, 'LD I,A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LD R,A (ED 56) with length 2', () => {
    const inst = disassemble([0xED, 0x56])[0];
    assert.strictEqual(inst.mnemonic, 'LD R,A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble NEG (ED 57) with length 2', () => {
    const inst = disassemble([0xED, 0x57])[0];
    assert.strictEqual(inst.mnemonic, 'NEG');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble INI (ED 00) with length 2', () => {
    const inst = disassemble([0xED, 0x00])[0];
    assert.strictEqual(inst.mnemonic, 'INI');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble OUTI (ED 01) with length 2', () => {
    const inst = disassemble([0xED, 0x01])[0];
    assert.strictEqual(inst.mnemonic, 'OUTI');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble INIR (ED 20) with length 2', () => {
    const inst = disassemble([0xED, 0x20])[0];
    assert.strictEqual(inst.mnemonic, 'INIR');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble OTIR (ED 21) with length 2', () => {
    const inst = disassemble([0xED, 0x21])[0];
    assert.strictEqual(inst.mnemonic, 'OTIR');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble INDR (ED 30) with length 2', () => {
    const inst = disassemble([0xED, 0x30])[0];
    assert.strictEqual(inst.mnemonic, 'INDR');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble OTDR (ED 31) with length 2', () => {
    const inst = disassemble([0xED, 0x31])[0];
    assert.strictEqual(inst.mnemonic, 'OTDR');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LDIR (ED B0) with length 2', () => {
    const inst = disassemble([0xED, 0xB0])[0];
    assert.strictEqual(inst.mnemonic, 'LDIR');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble LDDR (ED B8) with length 2', () => {
    const inst = disassemble([0xED, 0xB8])[0];
    assert.strictEqual(inst.mnemonic, 'LDDR');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });

  it('should disassemble RETN (ED 58) with length 2', () => {
    const inst = disassemble([0xED, 0x58])[0];
    assert.strictEqual(inst.mnemonic, 'RETN');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.operands.length, 0);
  });
});

describe('Z80 Disassembler - DD/IX-Prefixed Opcode Disassembly', () => {
  it('should disassemble LD IX,nn (DD 21) with 16-bit immediate', () => {
    const inst = disassemble([0xDD, 0x21, 0xCD, 0xAB])[0];
    assert.strictEqual(inst.mnemonic, 'LD IX,nn');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '$abcd');
  });

  it('should disassemble ADD IX,BC (DD 09) with length 2', () => {
    const inst = disassemble([0xDD, 0x09])[0];
    assert.strictEqual(inst.mnemonic, 'ADD IX,BC');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble INC IX (DD 23) with length 2', () => {
    const inst = disassemble([0xDD, 0x23])[0];
    assert.strictEqual(inst.mnemonic, 'INC IX');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble DEC IX (DD 2B) with length 2', () => {
    const inst = disassemble([0xDD, 0x2B])[0];
    assert.strictEqual(inst.mnemonic, 'DEC IX');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble LD (nn),IX (DD 22) with 16-bit address', () => {
    const inst = disassemble([0xDD, 0x22, 0x34, 0x12])[0];
    assert.strictEqual(inst.mnemonic, 'LD (nn),IX');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '$1234');
  });

  it('should disassemble LD IX,(nn) (DD 2A) with 16-bit address', () => {
    const inst = disassemble([0xDD, 0x2A, 0x78, 0x56])[0];
    assert.strictEqual(inst.mnemonic, 'LD IX,(nn)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '$5678');
  });

  it('should disassemble ADD IX,SP (DD 39) with length 2', () => {
    const inst = disassemble([0xDD, 0x39])[0];
    assert.strictEqual(inst.mnemonic, 'ADD IX,SP');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble JP (IX) (DD E9) with length 2', () => {
    const inst = disassemble([0xDD, 0xE9])[0];
    assert.strictEqual(inst.mnemonic, 'JP (IX)');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble LD A,(IX+d) (DD 7E) with displacement', () => {
    const inst = disassemble([0xDD, 0x7E, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,(IX+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+5');
  });

  it('should disassemble LD (IX+d),A (DD 77) with displacement', () => {
    const inst = disassemble([0xDD, 0x77, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'LD (IX+d),A');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+5');
  });

  it('should disassemble ADD A,(IX+d) (DD 86) with displacement', () => {
    const inst = disassemble([0xDD, 0x86, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'ADD A,(IX+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+5');
  });

  it('should disassemble LD (IX+d),n (DD 36) with displacement and byte', () => {
    const inst = disassemble([0xDD, 0x36, 0x05, 0x42])[0];
    assert.strictEqual(inst.mnemonic, 'LD (IX+d),n');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '+5');
    assert.strictEqual(inst.operands[1], '$42');
  });

  it('should disassemble negative displacement for IX', () => {
    const inst = disassemble([0xDD, 0x7E, 0xF5])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,(IX+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '-11');
  });

  it('should disassemble INC (IX+d) (DD 34) with displacement', () => {
    const inst = disassemble([0xDD, 0x34, 0x03])[0];
    assert.strictEqual(inst.mnemonic, 'INC (IX+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+3');
  });

  it('should disassemble DEC (IX+d) (DD 35) with displacement', () => {
    const inst = disassemble([0xDD, 0x35, 0x03])[0];
    assert.strictEqual(inst.mnemonic, 'DEC (IX+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+3');
  });
});

describe('Z80 Disassembler - FD/IY-Prefixed Opcode Disassembly', () => {
  it('should disassemble LD IY,nn (FD 21) with 16-bit immediate', () => {
    const inst = disassemble([0xFD, 0x21, 0xEF, 0xCD])[0];
    assert.strictEqual(inst.mnemonic, 'LD IY,nn');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '$cdef');
  });

  it('should disassemble ADD IY,BC (FD 09) with length 2', () => {
    const inst = disassemble([0xFD, 0x09])[0];
    assert.strictEqual(inst.mnemonic, 'ADD IY,BC');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble INC IY (FD 23) with length 2', () => {
    const inst = disassemble([0xFD, 0x23])[0];
    assert.strictEqual(inst.mnemonic, 'INC IY');
    assert.strictEqual(inst.length, 2);
  });

  it('should disassemble LD A,(IY+d) (FD 7E) with displacement', () => {
    const inst = disassemble([0xFD, 0x7E, 0x07])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,(IY+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+7');
  });

  it('should disassemble LD (IY+d),A (FD 77) with displacement', () => {
    const inst = disassemble([0xFD, 0x77, 0x07])[0];
    assert.strictEqual(inst.mnemonic, 'LD (IY+d),A');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '+7');
  });

  it('should disassemble negative displacement for IY', () => {
    const inst = disassemble([0xFD, 0x7E, 0xF8])[0];
    assert.strictEqual(inst.mnemonic, 'LD A,(IY+d)');
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.operands[0], '-8');
  });
});

describe('Z80 Disassembler - DD/FD CB-Prefixed Disassembly', () => {
  it('should disassemble RLC (IX+d) (DD CB 06) with length 4', () => {
    const inst = disassemble([0xDD, 0xCB, 0x06, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'RLC (IX++5)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '(IX++5)');
  });

  it('should disassemble SLL H (DD CB 34) with length 4', () => {
    const inst = disassemble([0xDD, 0xCB, 0x34, 0x03])[0];
    assert.strictEqual(inst.mnemonic, 'SLL H');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '(IX++3)');
  });

  it('should disassemble SLL L (DD CB 35) with length 4', () => {
    const inst = disassemble([0xDD, 0xCB, 0x35, 0x03])[0];
    assert.strictEqual(inst.mnemonic, 'SLL L');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '(IX++3)');
  });

  it('should disassemble RLC (IY+d) (FD CB 06) with length 4', () => {
    const inst = disassemble([0xFD, 0xCB, 0x06, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'RLC (IY++5)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '(IY++5)');
  });

  it('should disassemble SLL H (FD CB 34) with length 4', () => {
    const inst = disassemble([0xFD, 0xCB, 0x34, 0x03])[0];
    assert.strictEqual(inst.mnemonic, 'SLL H');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '(IY++3)');
  });

  it('should disassemble BIT 0,(IX+d) (DD CB 46) with length 4', () => {
    const inst = disassemble([0xDD, 0xCB, 0x46, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'BIT 0,(IX++5)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], '(IX++5)');
  });

  it('should disassemble SET 0,(IY+d) (FD CB C1) with length 4', () => {
    const inst = disassemble([0xFD, 0xCB, 0xC1, 0x03])[0];
    assert.strictEqual(inst.mnemonic, 'SET 0,(IY++3)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '0');
    assert.strictEqual(inst.operands[1], '(IY++3)');
  });
});

describe('Z80 Instruction Class', () => {
  it('should create instruction with correct opcode, mnemonic, operands, bytes, length, address', () => {
    const inst = new Z80Instruction(0x01, 'LD BC,nn', ['$1234'], [0x01, 0x34, 0x12], 3, 0x1000);
    assert.strictEqual(inst.opcode, 0x01);
    assert.strictEqual(inst.mnemonic, 'LD BC,nn');
    assert.strictEqual(inst.operands[0], '$1234');
    assert.strictEqual(inst.bytes[0], 0x01);
    assert.strictEqual(inst.bytes[1], 0x34);
    assert.strictEqual(inst.bytes[2], 0x12);
    assert.strictEqual(inst.length, 3);
    assert.strictEqual(inst.address, 0x1000);
  });

  it('should create instruction with no operands', () => {
    const inst = new Z80Instruction(0x00, 'NOP', [], [0x00], 1, 0);
    assert.strictEqual(inst.opcode, 0x00);
    assert.strictEqual(inst.mnemonic, 'NOP');
    assert.strictEqual(inst.operands.length, 0);
    assert.strictEqual(inst.bytes.length, 1);
    assert.strictEqual(inst.length, 1);
    assert.strictEqual(inst.address, 0);
  });

  it('should toJSON return correct structure', () => {
    const inst = new Z80Instruction(0xC9, 'RET', [], [0xC9], 1, 0x0050);
    const json = inst.toJSON();
    assert.strictEqual(json.opcode, 0xC9);
    assert.strictEqual(json.mnemonic, 'RET');
    assert.deepStrictEqual(json.operands, []);
    assert.deepStrictEqual(json.bytes, [0xC9]);
    assert.strictEqual(json.length, 1);
    assert.strictEqual(json.address, 0x0050);
  });

  it('should toJSON for instruction with operands', () => {
    const inst = new Z80Instruction(0x01, 'LD BC,nn', ['$1234'], [0x01, 0x34, 0x12], 3, 0x0000);
    const json = inst.toJSON();
    assert.strictEqual(json.opcode, 0x01);
    assert.strictEqual(json.mnemonic, 'LD BC,nn');
    assert.strictEqual(json.operands[0], '$1234');
    assert.deepStrictEqual(json.bytes, [0x01, 0x34, 0x12]);
    assert.strictEqual(json.length, 3);
    assert.strictEqual(json.address, 0x0000);
  });

  it('should toJSON for CB-prefixed instruction', () => {
    const inst = new Z80Instruction(0x00, 'RLC B', ['B'], [0xCB, 0x00], 2, 0x0100);
    const json = inst.toJSON();
    assert.strictEqual(json.opcode, 0x00);
    assert.strictEqual(json.mnemonic, 'RLC B');
    assert.deepStrictEqual(json.operands, ['B']);
    assert.deepStrictEqual(json.bytes, [0xCB, 0x00]);
    assert.strictEqual(json.length, 2);
    assert.strictEqual(json.address, 0x0100);
  });
});

describe('Z80Disassembler Class', () => {
  it('should disassemble() return correct array of instructions', () => {
    const disasm = new Z80Disassembler([0x00, 0x01, 0x34, 0x12, 0xC9]);
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions.length, 3);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[1].mnemonic, 'LD BC,nn');
    assert.strictEqual(instructions[2].mnemonic, 'RET');
  });

  it('should disassembleRange() disassemble only a subset', () => {
    const disasm = new Z80Disassembler([0x00, 0x01, 0x34, 0x12, 0xC9]);
    const instructions = disasm.disassembleRange(0, 1);
    assert.strictEqual(instructions.length, 1);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[0].address, 0);
  });

  it('should disassembleRange() with offset baseAddress', () => {
    const disasm = new Z80Disassembler([0x00, 0xC9], { baseAddress: 0x1000 });
    const instructions = disasm.disassembleRange(0x1000, 0x1002);
    assert.strictEqual(instructions.length, 2);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[0].address, 0x1000);
    assert.strictEqual(instructions[1].mnemonic, 'RET');
    assert.strictEqual(instructions[1].address, 0x1001);
  });

  it('should disassembleAt() disassemble single instruction', () => {
    const disasm = new Z80Disassembler([0x00, 0x01, 0x34, 0x12, 0xC9]);
    const inst = disasm.disassembleAt(1);
    assert.strictEqual(inst.mnemonic, 'LD BC,nn');
    assert.strictEqual(inst.address, 1);
  });

  it('should disassembleAt() return null for out-of-range address', () => {
    const disasm = new Z80Disassembler([0x00, 0xC9]);
    assert.strictEqual(disasm.disassembleAt(-1), null);
    assert.strictEqual(disasm.disassembleAt(2), null);
  });

  it('should disassembleAt() return null for address before baseAddress', () => {
    const disasm = new Z80Disassembler([0x00, 0xC9], { baseAddress: 0x1000 });
    assert.strictEqual(disasm.disassembleAt(0x0FFF), null);
  });

  it('should empty bytes return empty array', () => {
    const disasm = new Z80Disassembler([]);
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions.length, 0);
  });

  it('should baseAddress option shifts all addresses', () => {
    const disasm = new Z80Disassembler([0x00, 0xC9, 0x01, 0x34, 0x12], { baseAddress: 0x8000 });
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions[0].address, 0x8000);
    assert.strictEqual(instructions[1].address, 0x8001);
    assert.strictEqual(instructions[2].address, 0x8002);
  });

  it('should disassemble mixed standard and CB instructions', () => {
    const disasm = new Z80Disassembler([0x00, 0xCB, 0x07, 0x01, 0x34, 0x12]);
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions.length, 3);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[0].address, 0);
    assert.strictEqual(instructions[1].mnemonic, 'RLC A');
    assert.strictEqual(instructions[1].address, 1);
    assert.strictEqual(instructions[2].mnemonic, 'LD BC,nn');
    assert.strictEqual(instructions[2].address, 3);
  });

  it('should disassemble mixed standard and ED instructions', () => {
    const disasm = new Z80Disassembler([0xC9, 0xED, 0x50, 0x01, 0x34, 0x12]);
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions.length, 3);
    assert.strictEqual(instructions[0].mnemonic, 'RET');
    assert.strictEqual(instructions[1].mnemonic, 'IM 0');
    assert.strictEqual(instructions[2].mnemonic, 'LD BC,nn');
  });

  it('should disassemble mixed DD and standard instructions', () => {
    const disasm = new Z80Disassembler([0xDD, 0x21, 0xCD, 0xAB, 0xC9]);
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions.length, 2);
    assert.strictEqual(instructions[0].mnemonic, 'LD IX,nn');
    assert.strictEqual(instructions[0].length, 4);
    assert.strictEqual(instructions[1].mnemonic, 'RET');
    assert.strictEqual(instructions[1].length, 1);
  });

  it('should instructions have correct sequential addresses', () => {
    const disasm = new Z80Disassembler([0x00, 0x01, 0x34, 0x12, 0xC9, 0x01, 0x56, 0x78]);
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions[0].address, 0);
    assert.strictEqual(instructions[1].address, 1);
    assert.strictEqual(instructions[2].address, 4);
    assert.strictEqual(instructions[3].address, 5);
  });

  it('should disassembleAt() for CB-prefixed instruction', () => {
    const disasm = new Z80Disassembler([0x00, 0xCB, 0x07, 0xC9]);
    const inst = disasm.disassembleAt(1);
    assert.strictEqual(inst.mnemonic, 'RLC A');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.address, 1);
  });

  it('should disassembleAt() for DD-prefixed instruction', () => {
    const disasm = new Z80Disassembler([0xDD, 0x21, 0xCD, 0xAB, 0xC9]);
    const inst = disasm.disassembleAt(0);
    assert.strictEqual(inst.mnemonic, 'LD IX,nn');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.address, 0);
  });
});

describe('Z80 Disassembler - Symbol Resolution', () => {
  it('should resolve addresses to symbol names when symbols Map is provided', () => {
    const symbols = new Map([['main', 0x1000], ['start', 0x0000]]);
    const disasm = new Z80Disassembler([0xCD, 0x00, 0x10], { symbols });
    const inst = disasm.disassemble()[0];
    assert.strictEqual(inst.operands[0], 'main');
  });

  it('should unresolved addresses show as hex values', () => {
    const symbols = new Map([['main', 0x1000]]);
    const disasm = new Z80Disassembler([0xCD, 0x56, 0x78], { symbols });
    const inst = disasm.disassemble()[0];
    assert.strictEqual(inst.operands[0], '$7856');
  });

  it('should symbol resolution work for CALL operands', () => {
    const symbols = new Map([['handler', 0x2000]]);
    const disasm = new Z80Disassembler([0xCD, 0x00, 0x20], { symbols });
    const inst = disasm.disassemble()[0];
    assert.strictEqual(inst.mnemonic, 'CALL nn');
    assert.strictEqual(inst.operands[0], 'handler');
  });

  it('should symbol resolution work for JP operands', () => {
    const symbols = new Map([['loop', 0x3000]]);
    const disasm = new Z80Disassembler([0xC3, 0x00, 0x30], { symbols });
    const inst = disasm.disassemble()[0];
    assert.strictEqual(inst.mnemonic, 'JP nn');
    assert.strictEqual(inst.operands[0], 'loop');
  });

  it('should symbol resolution work for LD (nn) operands', () => {
    const symbols = new Map([['buffer', 0x4000]]);
    const disasm = new Z80Disassembler([0x32, 0x00, 0x40], { symbols });
    const inst = disasm.disassemble()[0];
    assert.strictEqual(inst.mnemonic, 'LD (nn),A');
    assert.strictEqual(inst.operands[0], 'buffer');
  });

  it('should symbol resolution work for LD (nn),HL operands', () => {
    const symbols = new Map([['dest', 0x5000]]);
    const disasm = new Z80Disassembler([0xDD, 0x22, 0x00, 0x50], { symbols });
    const inst = disasm.disassemble()[0];
    assert.strictEqual(inst.operands[0], 'dest');
  });

  it('should multiple symbols resolve correctly in same stream', () => {
    const symbols = new Map([['funcA', 0x1000], ['funcB', 0x2000]]);
    const disasm = new Z80Disassembler([
      0xCD, 0x00, 0x10,
      0xC3, 0x00, 0x20
    ], { symbols });
    const instructions = disasm.disassemble();
    assert.strictEqual(instructions[0].operands[0], 'funcA');
    assert.strictEqual(instructions[1].operands[0], 'funcB');
  });
});

describe('disassembleToLines Helper', () => {
  it('should return formatted lines with addresses', () => {
    const lines = disassembleToLines([0x00, 0xC9]);
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], '$0000: NOP');
    assert.strictEqual(lines[1], '$0001: RET');
  });

  it('should lines include address prefix $XXXX:', () => {
    const lines = disassembleToLines([0x01, 0x34, 0x12, 0xC9]);
    assert.strictEqual(lines[0], '$0000: LD BC,nn $1234');
    assert.strictEqual(lines[1], '$0003: RET');
  });

  it('should lines include mnemonic and operands', () => {
    const lines = disassembleToLines([0x06, 0x42]);
    assert.strictEqual(lines[0], '$0000: LD B,n $42');
  });

  it('should lines with baseAddress option', () => {
    const lines = disassembleToLines([0x00, 0xC9], { baseAddress: 0x8000 });
    assert.strictEqual(lines[0], '$8000: NOP');
    assert.strictEqual(lines[1], '$8001: RET');
  });

  it('should lines with symbol resolution', () => {
    const symbols = new Map([['entry', 0x0000]]);
    const lines = disassembleToLines([0xCD, 0x00, 0x00], { symbols });
    assert.strictEqual(lines[0], '$0000: CALL nn entry');
  });

  it('should lines for CB-prefixed instruction', () => {
    const lines = disassembleToLines([0xCB, 0x07]);
    assert.strictEqual(lines[0], '$0000: RLC A A');
  });

  it('should lines for DD-prefixed instruction', () => {
    const lines = disassembleToLines([0xDD, 0x21, 0xCD, 0xAB]);
    assert.strictEqual(lines[0], '$0000: LD IX,nn $abcd');
  });

  it('should empty bytes return empty lines array', () => {
    const lines = disassembleToLines([]);
    assert.strictEqual(lines.length, 0);
  });
});

describe('Z80 Disassembler - Edge Cases', () => {
  it('should disassemble single byte', () => {
    const inst = disassemble([0x00])[0];
    assert.strictEqual(inst.mnemonic, 'NOP');
    assert.strictEqual(inst.length, 1);
    assert.strictEqual(inst.bytes.length, 1);
  });

  it('should disassemble very long byte stream', () => {
    const bytes = [];
    for (let i = 0; i < 100; i++) {
      bytes.push(0x00);
    }
    const instructions = disassemble(bytes);
    assert.strictEqual(instructions.length, 100);
    for (const inst of instructions) {
      assert.strictEqual(inst.mnemonic, 'NOP');
      assert.strictEqual(inst.length, 1);
    }
  });

  it('should handle mixed standard/CB/ED/DD/FD instructions', () => {
    const bytes = [
      0x00, // NOP
      0xCB, 0x07, // RLC A
      0xED, 0x50, // IM 0
      0xDD, 0x21, 0xCD, 0xAB, // LD IX,nn
      0xFD, 0x21, 0xEF, 0xCD, // LD IY,nn
      0xC9 // RET
    ];
    const instructions = disassemble(bytes);
    assert.strictEqual(instructions.length, 6);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[1].mnemonic, 'RLC A');
    assert.strictEqual(instructions[2].mnemonic, 'IM 0');
    assert.strictEqual(instructions[3].mnemonic, 'LD IX,nn');
    assert.strictEqual(instructions[4].mnemonic, 'LD IY,nn');
    assert.strictEqual(instructions[5].mnemonic, 'RET');
  });

  it('should handle valid opcode 0xAA (XOR D)', () => {
    const inst = disassemble([0x00, 0xAA, 0xC9])[1];
    assert.strictEqual(inst.mnemonic, 'XOR D');
    assert.strictEqual(inst.length, 1);
  });

  it('should handle CB 0xAA (RES 5,D)', () => {
    const inst = disassemble([0xCB, 0xAA])[0];
    assert.strictEqual(inst.mnemonic, 'RES 5,D');
    assert.strictEqual(inst.length, 2);
  });

  it('should handle DD prefix with XOR D (DD AA)', () => {
    const inst = disassemble([0xDD, 0xAA])[0];
    assert.strictEqual(inst.mnemonic, 'XOR D');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.bytes[0], 0xDD);
    assert.strictEqual(inst.bytes[1], 0xAA);
  });

  it('should handle FD prefix with XOR D (FD AA)', () => {
    const inst = disassemble([0xFD, 0xAA])[0];
    assert.strictEqual(inst.mnemonic, 'XOR D');
    assert.strictEqual(inst.length, 2);
    assert.strictEqual(inst.bytes[0], 0xFD);
    assert.strictEqual(inst.bytes[1], 0xAA);
  });

  it('should disassemble Uint8Array input', () => {
    const bytes = new Uint8Array([0x00, 0xC9]);
    const instructions = disassemble(bytes);
    assert.strictEqual(instructions.length, 2);
    assert.strictEqual(instructions[0].mnemonic, 'NOP');
    assert.strictEqual(instructions[1].mnemonic, 'RET');
  });

  it('should disassemble with DD CB prefixed known opcode', () => {
    const inst = disassemble([0xDD, 0xCB, 0xAA, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'RES 5,(IX++5)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '5');
    assert.strictEqual(inst.operands[1], '(IX++5)');
    assert.strictEqual(inst.bytes.length, 4);
  });

  it('should disassemble with FD CB prefixed known opcode', () => {
    const inst = disassemble([0xFD, 0xCB, 0xAA, 0x05])[0];
    assert.strictEqual(inst.mnemonic, 'RES 5,(IY++5)');
    assert.strictEqual(inst.length, 4);
    assert.strictEqual(inst.operands[0], '5');
    assert.strictEqual(inst.operands[1], '(IY++5)');
    assert.strictEqual(inst.bytes.length, 4);
  });
});
