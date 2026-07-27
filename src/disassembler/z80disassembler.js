/**
 * Z80 Disassembler - disassembles Z80 machine code to assembly language
 */

/**
 * Register names for Z80
 */
const RegisterNames = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];

/**
 * Standard Z80 opcode table (0x00-0xFF)
 */
export const Z80OpcodeTable = {
  0x00: { mnemonic: 'NOP', bytes: 1 },
  0x01: { mnemonic: 'LD BC,nn', bytes: 3 },
  0x02: { mnemonic: 'LD (BC),A', bytes: 1 },
  0x03: { mnemonic: 'INC BC', bytes: 1 },
  0x04: { mnemonic: 'INC B', bytes: 1 },
  0x05: { mnemonic: 'DEC B', bytes: 1 },
  0x06: { mnemonic: 'LD B,n', bytes: 2 },
  0x07: { mnemonic: 'RLCA', bytes: 1 },
  0x08: { mnemonic: 'EX AF,AF\'', bytes: 1 },
  0x09: { mnemonic: 'ADD HL,BC', bytes: 1 },
  0x0A: { mnemonic: 'LD A,(BC)', bytes: 1 },
  0x0B: { mnemonic: 'DEC BC', bytes: 1 },
  0x0C: { mnemonic: 'INC C', bytes: 1 },
  0x0D: { mnemonic: 'DEC C', bytes: 1 },
  0x0E: { mnemonic: 'LD C,n', bytes: 2 },
  0x0F: { mnemonic: 'RRCA', bytes: 1 },
  0x10: { mnemonic: 'DJNZ e', bytes: 2 },
  0x11: { mnemonic: 'LD DE,nn', bytes: 3 },
  0x12: { mnemonic: 'LD (DE),A', bytes: 1 },
  0x13: { mnemonic: 'INC DE', bytes: 1 },
  0x14: { mnemonic: 'INC D', bytes: 1 },
  0x15: { mnemonic: 'DEC D', bytes: 1 },
  0x16: { mnemonic: 'LD D,n', bytes: 2 },
  0x17: { mnemonic: 'RLA', bytes: 1 },
  0x18: { mnemonic: 'JR e', bytes: 2 },
  0x19: { mnemonic: 'ADD HL,DE', bytes: 1 },
  0x1A: { mnemonic: 'LD A,(DE)', bytes: 1 },
  0x1B: { mnemonic: 'DEC DE', bytes: 1 },
  0x1C: { mnemonic: 'INC E', bytes: 1 },
  0x1D: { mnemonic: 'DEC E', bytes: 1 },
  0x1E: { mnemonic: 'LD E,n', bytes: 2 },
  0x1F: { mnemonic: 'RRA', bytes: 1 },
  0x20: { mnemonic: 'JR NZ,e', bytes: 2 },
  0x21: { mnemonic: 'LD HL,nn', bytes: 3 },
  0x22: { mnemonic: 'LD (nn),HL', bytes: 3 },
  0x23: { mnemonic: 'INC HL', bytes: 1 },
  0x24: { mnemonic: 'INC H', bytes: 1 },
  0x25: { mnemonic: 'DEC H', bytes: 1 },
  0x26: { mnemonic: 'LD H,n', bytes: 2 },
  0x27: { mnemonic: 'DAA', bytes: 1 },
  0x28: { mnemonic: 'JR Z,e', bytes: 2 },
  0x29: { mnemonic: 'ADD HL,HL', bytes: 1 },
  0x2A: { mnemonic: 'LD HL,(nn)', bytes: 3 },
  0x2B: { mnemonic: 'DEC HL', bytes: 1 },
  0x2C: { mnemonic: 'INC L', bytes: 1 },
  0x2D: { mnemonic: 'DEC L', bytes: 1 },
  0x2E: { mnemonic: 'LD L,n', bytes: 2 },
  0x2F: { mnemonic: 'CPL', bytes: 1 },
  0x30: { mnemonic: 'JR NC,e', bytes: 2 },
  0x31: { mnemonic: 'LD SP,nn', bytes: 3 },
  0x32: { mnemonic: 'LD (nn),A', bytes: 3 },
  0x33: { mnemonic: 'INC SP', bytes: 1 },
  0x34: { mnemonic: 'INC (HL)', bytes: 1 },
  0x35: { mnemonic: 'DEC (HL)', bytes: 1 },
  0x36: { mnemonic: 'LD (HL),n', bytes: 2 },
  0x37: { mnemonic: 'SCF', bytes: 1 },
  0x38: { mnemonic: 'JR C,e', bytes: 2 },
  0x39: { mnemonic: 'ADD HL,SP', bytes: 1 },
  0x3A: { mnemonic: 'LD A,(nn)', bytes: 3 },
  0x3B: { mnemonic: 'DEC SP', bytes: 1 },
  0x3C: { mnemonic: 'INC A', bytes: 1 },
  0x3D: { mnemonic: 'DEC A', bytes: 1 },
  0x3E: { mnemonic: 'LD A,n', bytes: 2 },
  0x3F: { mnemonic: 'CCF', bytes: 1 },
  0x40: { mnemonic: 'LD B,B', bytes: 1 },
  0x41: { mnemonic: 'LD B,C', bytes: 1 },
  0x42: { mnemonic: 'LD B,D', bytes: 1 },
  0x43: { mnemonic: 'LD B,E', bytes: 1 },
  0x44: { mnemonic: 'LD B,H', bytes: 1 },
  0x45: { mnemonic: 'LD B,L', bytes: 1 },
  0x46: { mnemonic: 'LD B,(HL)', bytes: 1 },
  0x47: { mnemonic: 'LD B,A', bytes: 1 },
  0x48: { mnemonic: 'LD C,B', bytes: 1 },
  0x49: { mnemonic: 'LD C,C', bytes: 1 },
  0x4A: { mnemonic: 'LD C,D', bytes: 1 },
  0x4B: { mnemonic: 'LD C,E', bytes: 1 },
  0x4C: { mnemonic: 'LD C,H', bytes: 1 },
  0x4D: { mnemonic: 'LD C,L', bytes: 1 },
  0x4E: { mnemonic: 'LD C,(HL)', bytes: 1 },
  0x4F: { mnemonic: 'LD C,A', bytes: 1 },
  0x50: { mnemonic: 'LD D,B', bytes: 1 },
  0x51: { mnemonic: 'LD D,C', bytes: 1 },
  0x52: { mnemonic: 'LD D,D', bytes: 1 },
  0x53: { mnemonic: 'LD D,E', bytes: 1 },
  0x54: { mnemonic: 'LD D,H', bytes: 1 },
  0x55: { mnemonic: 'LD D,L', bytes: 1 },
  0x56: { mnemonic: 'LD D,(HL)', bytes: 1 },
  0x57: { mnemonic: 'LD D,A', bytes: 1 },
  0x58: { mnemonic: 'LD E,B', bytes: 1 },
  0x59: { mnemonic: 'LD E,C', bytes: 1 },
  0x5A: { mnemonic: 'LD E,D', bytes: 1 },
  0x5B: { mnemonic: 'LD E,E', bytes: 1 },
  0x5C: { mnemonic: 'LD E,H', bytes: 1 },
  0x5D: { mnemonic: 'LD E,L', bytes: 1 },
  0x5E: { mnemonic: 'LD E,(HL)', bytes: 1 },
  0x5F: { mnemonic: 'LD E,A', bytes: 1 },
  0x60: { mnemonic: 'LD H,B', bytes: 1 },
  0x61: { mnemonic: 'LD H,C', bytes: 1 },
  0x62: { mnemonic: 'LD H,D', bytes: 1 },
  0x63: { mnemonic: 'LD H,E', bytes: 1 },
  0x64: { mnemonic: 'LD H,H', bytes: 1 },
  0x65: { mnemonic: 'LD H,L', bytes: 1 },
  0x66: { mnemonic: 'LD H,(HL)', bytes: 1 },
  0x67: { mnemonic: 'LD H,A', bytes: 1 },
  0x68: { mnemonic: 'LD L,B', bytes: 1 },
  0x69: { mnemonic: 'LD L,C', bytes: 1 },
  0x6A: { mnemonic: 'LD L,D', bytes: 1 },
  0x6B: { mnemonic: 'LD L,E', bytes: 1 },
  0x6C: { mnemonic: 'LD L,H', bytes: 1 },
  0x6D: { mnemonic: 'LD L,L', bytes: 1 },
  0x6E: { mnemonic: 'LD L,(HL)', bytes: 1 },
  0x6F: { mnemonic: 'LD L,A', bytes: 1 },
  0x70: { mnemonic: 'LD (HL),B', bytes: 1 },
  0x71: { mnemonic: 'LD (HL),C', bytes: 1 },
  0x72: { mnemonic: 'LD (HL),D', bytes: 1 },
  0x73: { mnemonic: 'LD (HL),E', bytes: 1 },
  0x74: { mnemonic: 'LD (HL),H', bytes: 1 },
  0x75: { mnemonic: 'LD (HL),L', bytes: 1 },
  0x76: { mnemonic: 'HALT', bytes: 1 },
  0x77: { mnemonic: 'LD (HL),A', bytes: 1 },
  0x78: { mnemonic: 'LD A,B', bytes: 1 },
  0x79: { mnemonic: 'LD A,C', bytes: 1 },
  0x7A: { mnemonic: 'LD A,D', bytes: 1 },
  0x7B: { mnemonic: 'LD A,E', bytes: 1 },
  0x7C: { mnemonic: 'LD A,H', bytes: 1 },
  0x7D: { mnemonic: 'LD A,L', bytes: 1 },
  0x7E: { mnemonic: 'LD A,(HL)', bytes: 1 },
  0x7F: { mnemonic: 'LD A,A', bytes: 1 },
  0x80: { mnemonic: 'ADD A,B', bytes: 1 },
  0x81: { mnemonic: 'ADD A,C', bytes: 1 },
  0x82: { mnemonic: 'ADD A,D', bytes: 1 },
  0x83: { mnemonic: 'ADD A,E', bytes: 1 },
  0x84: { mnemonic: 'ADD A,H', bytes: 1 },
  0x85: { mnemonic: 'ADD A,L', bytes: 1 },
  0x86: { mnemonic: 'ADD A,(HL)', bytes: 1 },
  0x87: { mnemonic: 'ADD A,A', bytes: 1 },
  0x88: { mnemonic: 'ADC A,B', bytes: 1 },
  0x89: { mnemonic: 'ADC A,C', bytes: 1 },
  0x8A: { mnemonic: 'ADC A,D', bytes: 1 },
  0x8B: { mnemonic: 'ADC A,E', bytes: 1 },
  0x8C: { mnemonic: 'ADC A,H', bytes: 1 },
  0x8D: { mnemonic: 'ADC A,L', bytes: 1 },
  0x8E: { mnemonic: 'ADC A,(HL)', bytes: 1 },
  0x8F: { mnemonic: 'ADC A,A', bytes: 1 },
  0x90: { mnemonic: 'SUB A,B', bytes: 1 },
  0x91: { mnemonic: 'SUB A,C', bytes: 1 },
  0x92: { mnemonic: 'SUB A,D', bytes: 1 },
  0x93: { mnemonic: 'SUB A,E', bytes: 1 },
  0x94: { mnemonic: 'SUB A,H', bytes: 1 },
  0x95: { mnemonic: 'SUB A,L', bytes: 1 },
  0x96: { mnemonic: 'SUB A,(HL)', bytes: 1 },
  0x97: { mnemonic: 'SUB A,A', bytes: 1 },
  0x98: { mnemonic: 'SBC A,B', bytes: 1 },
  0x99: { mnemonic: 'SBC A,C', bytes: 1 },
  0x9A: { mnemonic: 'SBC A,D', bytes: 1 },
  0x9B: { mnemonic: 'SBC A,E', bytes: 1 },
  0x9C: { mnemonic: 'SBC A,H', bytes: 1 },
  0x9D: { mnemonic: 'SBC A,L', bytes: 1 },
  0x9E: { mnemonic: 'SBC A,(HL)', bytes: 1 },
  0x9F: { mnemonic: 'SBC A,A', bytes: 1 },
  0xA0: { mnemonic: 'AND B', bytes: 1 },
  0xA1: { mnemonic: 'AND C', bytes: 1 },
  0xA2: { mnemonic: 'AND D', bytes: 1 },
  0xA3: { mnemonic: 'AND E', bytes: 1 },
  0xA4: { mnemonic: 'AND H', bytes: 1 },
  0xA5: { mnemonic: 'AND L', bytes: 1 },
  0xA6: { mnemonic: 'AND (HL)', bytes: 1 },
  0xA7: { mnemonic: 'AND A', bytes: 1 },
  0xA8: { mnemonic: 'XOR B', bytes: 1 },
  0xA9: { mnemonic: 'XOR C', bytes: 1 },
  0xAA: { mnemonic: 'XOR D', bytes: 1 },
  0xAB: { mnemonic: 'XOR E', bytes: 1 },
  0xAC: { mnemonic: 'XOR H', bytes: 1 },
  0xAD: { mnemonic: 'XOR L', bytes: 1 },
  0xAE: { mnemonic: 'XOR (HL)', bytes: 1 },
  0xAF: { mnemonic: 'XOR A', bytes: 1 },
  0xB0: { mnemonic: 'OR B', bytes: 1 },
  0xB1: { mnemonic: 'OR C', bytes: 1 },
  0xB2: { mnemonic: 'OR D', bytes: 1 },
  0xB3: { mnemonic: 'OR E', bytes: 1 },
  0xB4: { mnemonic: 'OR H', bytes: 1 },
  0xB5: { mnemonic: 'OR L', bytes: 1 },
  0xB6: { mnemonic: 'OR (HL)', bytes: 1 },
  0xB7: { mnemonic: 'OR A', bytes: 1 },
  0xB8: { mnemonic: 'CP B', bytes: 1 },
  0xB9: { mnemonic: 'CP C', bytes: 1 },
  0xBA: { mnemonic: 'CP D', bytes: 1 },
  0xBB: { mnemonic: 'CP E', bytes: 1 },
  0xBC: { mnemonic: 'CP H', bytes: 1 },
  0xBD: { mnemonic: 'CP L', bytes: 1 },
  0xBE: { mnemonic: 'CP (HL)', bytes: 1 },
  0xBF: { mnemonic: 'CP A', bytes: 1 },
  0xC0: { mnemonic: 'RET NZ', bytes: 1 },
  0xC1: { mnemonic: 'POP BC', bytes: 1 },
  0xC2: { mnemonic: 'JP NZ,nn', bytes: 3 },
  0xC3: { mnemonic: 'JP nn', bytes: 3 },
  0xC4: { mnemonic: 'CALL NZ,nn', bytes: 3 },
  0xC5: { mnemonic: 'PUSH BC', bytes: 1 },
  0xC6: { mnemonic: 'ADD A,n', bytes: 2 },
  0xC7: { mnemonic: 'RST 0', bytes: 1 },
  0xC8: { mnemonic: 'RET Z', bytes: 1 },
  0xC9: { mnemonic: 'RET', bytes: 1 },
  0xCA: { mnemonic: 'JP Z,nn', bytes: 3 },
  0xCC: { mnemonic: 'CALL Z,nn', bytes: 3 },
  0xCD: { mnemonic: 'CALL nn', bytes: 3 },
  0xCE: { mnemonic: 'ADC A,n', bytes: 2 },
  0xCF: { mnemonic: 'RST 8', bytes: 1 },
  0xD0: { mnemonic: 'RET NC', bytes: 1 },
  0xD1: { mnemonic: 'POP DE', bytes: 1 },
  0xD2: { mnemonic: 'JP NC,nn', bytes: 3 },
  0xD4: { mnemonic: 'CALL NC,nn', bytes: 3 },
  0xD5: { mnemonic: 'PUSH DE', bytes: 1 },
  0xD6: { mnemonic: 'SUB n', bytes: 2 },
  0xD7: { mnemonic: 'RST 10', bytes: 1 },
  0xD8: { mnemonic: 'RET C', bytes: 1 },
  0xD9: { mnemonic: 'EXX', bytes: 1 },
  0xDA: { mnemonic: 'JP C,nn', bytes: 3 },
  0xDB: { mnemonic: 'IN A,(n)', bytes: 2 },
  0xDC: { mnemonic: 'CALL C,nn', bytes: 3 },
  0xDE: { mnemonic: 'SBC A,n', bytes: 2 },
  0xDF: { mnemonic: 'RST 18', bytes: 1 },
  0xE0: { mnemonic: 'RET PO', bytes: 1 },
  0xE1: { mnemonic: 'POP HL', bytes: 1 },
  0xE2: { mnemonic: 'JP PO,nn', bytes: 3 },
  0xE3: { mnemonic: 'EX (SP),HL', bytes: 1 },
  0xE4: { mnemonic: 'CALL PO,nn', bytes: 3 },
  0xE5: { mnemonic: 'PUSH HL', bytes: 1 },
  0xE6: { mnemonic: 'AND n', bytes: 2 },
  0xE7: { mnemonic: 'RST 20', bytes: 1 },
  0xE8: { mnemonic: 'RET PE', bytes: 1 },
  0xE9: { mnemonic: 'JP (HL)', bytes: 1 },
  0xEA: { mnemonic: 'JP PE,nn', bytes: 3 },
  0xEB: { mnemonic: 'EX DE,HL', bytes: 1 },
  0xEC: { mnemonic: 'CALL PE,nn', bytes: 3 },
  0xEE: { mnemonic: 'XOR n', bytes: 2 },
  0xEF: { mnemonic: 'RST 28', bytes: 1 },
  0xF0: { mnemonic: 'RET P', bytes: 1 },
  0xF1: { mnemonic: 'POP AF', bytes: 1 },
  0xF2: { mnemonic: 'JP P,nn', bytes: 3 },
  0xF3: { mnemonic: 'DI', bytes: 1 },
  0xF4: { mnemonic: 'CALL P,nn', bytes: 3 },
  0xF5: { mnemonic: 'PUSH AF', bytes: 1 },
  0xF6: { mnemonic: 'OR n', bytes: 2 },
  0xF7: { mnemonic: 'RST 30', bytes: 1 },
  0xF8: { mnemonic: 'RET M', bytes: 1 },
  0xF9: { mnemonic: 'LD SP,HL', bytes: 1 },
  0xFA: { mnemonic: 'JP M,nn', bytes: 3 },
  0xFB: { mnemonic: 'EI', bytes: 1 },
  0xFC: { mnemonic: 'CALL M,nn', bytes: 3 },
  0xFE: { mnemonic: 'CP n', bytes: 2 },
  0xFF: { mnemonic: 'RST 38', bytes: 1 }
};

/**
 * CB-prefixed opcode table (CB xx)
 */
export const Z80CBOpcodeTable = {
  0x00: { mnemonic: 'RLC B', bytes: 2 },
  0x01: { mnemonic: 'RLC C', bytes: 2 },
  0x02: { mnemonic: 'RLC D', bytes: 2 },
  0x03: { mnemonic: 'RLC E', bytes: 2 },
  0x04: { mnemonic: 'RLC H', bytes: 2 },
  0x05: { mnemonic: 'RLC L', bytes: 2 },
  0x06: { mnemonic: 'RLC (HL)', bytes: 2 },
  0x07: { mnemonic: 'RLC A', bytes: 2 },
  0x08: { mnemonic: 'RRC B', bytes: 2 },
  0x09: { mnemonic: 'RRC C', bytes: 2 },
  0x0A: { mnemonic: 'RRC D', bytes: 2 },
  0x0B: { mnemonic: 'RRC E', bytes: 2 },
  0x0C: { mnemonic: 'RRC H', bytes: 2 },
  0x0D: { mnemonic: 'RRC L', bytes: 2 },
  0x0E: { mnemonic: 'RRC (HL)', bytes: 2 },
  0x0F: { mnemonic: 'RRC A', bytes: 2 },
  0x10: { mnemonic: 'RL B', bytes: 2 },
  0x11: { mnemonic: 'RL C', bytes: 2 },
  0x12: { mnemonic: 'RL D', bytes: 2 },
  0x13: { mnemonic: 'RL E', bytes: 2 },
  0x14: { mnemonic: 'RL H', bytes: 2 },
  0x15: { mnemonic: 'RL L', bytes: 2 },
  0x16: { mnemonic: 'RL (HL)', bytes: 2 },
  0x17: { mnemonic: 'RL A', bytes: 2 },
  0x18: { mnemonic: 'RR B', bytes: 2 },
  0x19: { mnemonic: 'RR C', bytes: 2 },
  0x1A: { mnemonic: 'RR D', bytes: 2 },
  0x1B: { mnemonic: 'RR E', bytes: 2 },
  0x1C: { mnemonic: 'RR H', bytes: 2 },
  0x1D: { mnemonic: 'RR L', bytes: 2 },
  0x1E: { mnemonic: 'RR (HL)', bytes: 2 },
  0x1F: { mnemonic: 'RR A', bytes: 2 },
  0x20: { mnemonic: 'SLA B', bytes: 2 },
  0x21: { mnemonic: 'SLA C', bytes: 2 },
  0x22: { mnemonic: 'SLA D', bytes: 2 },
  0x23: { mnemonic: 'SLA E', bytes: 2 },
  0x24: { mnemonic: 'SLA H', bytes: 2 },
  0x25: { mnemonic: 'SLA L', bytes: 2 },
  0x26: { mnemonic: 'SLA (HL)', bytes: 2 },
  0x27: { mnemonic: 'SLA A', bytes: 2 },
  0x28: { mnemonic: 'SRA B', bytes: 2 },
  0x29: { mnemonic: 'SRA C', bytes: 2 },
  0x2A: { mnemonic: 'SRA D', bytes: 2 },
  0x2B: { mnemonic: 'SRA E', bytes: 2 },
  0x2C: { mnemonic: 'SRA H', bytes: 2 },
  0x2D: { mnemonic: 'SRA L', bytes: 2 },
  0x2E: { mnemonic: 'SRA (HL)', bytes: 2 },
  0x2F: { mnemonic: 'SRA A', bytes: 2 },
  0x30: { mnemonic: 'SLL B', bytes: 2 },
  0x31: { mnemonic: 'SLL C', bytes: 2 },
  0x32: { mnemonic: 'SLL D', bytes: 2 },
  0x33: { mnemonic: 'SLL E', bytes: 2 },
  0x34: { mnemonic: 'SLL H', bytes: 2 },
  0x35: { mnemonic: 'SLL L', bytes: 2 },
  0x36: { mnemonic: 'SLL (HL)', bytes: 2 },
  0x37: { mnemonic: 'SLL A', bytes: 2 },
  0x38: { mnemonic: 'SRL B', bytes: 2 },
  0x39: { mnemonic: 'SRL C', bytes: 2 },
  0x3A: { mnemonic: 'SRL D', bytes: 2 },
  0x3B: { mnemonic: 'SRL E', bytes: 2 },
  0x3C: { mnemonic: 'SRL H', bytes: 2 },
  0x3D: { mnemonic: 'SRL L', bytes: 2 },
  0x3E: { mnemonic: 'SRL (HL)', bytes: 2 },
  0x3F: { mnemonic: 'SRL A', bytes: 2 },
  0x40: { mnemonic: 'BIT 0,B', bytes: 2 },
  0x41: { mnemonic: 'BIT 0,C', bytes: 2 },
  0x42: { mnemonic: 'BIT 0,D', bytes: 2 },
  0x43: { mnemonic: 'BIT 0,E', bytes: 2 },
  0x44: { mnemonic: 'BIT 0,H', bytes: 2 },
  0x45: { mnemonic: 'BIT 0,L', bytes: 2 },
  0x46: { mnemonic: 'BIT 0,(HL)', bytes: 2 },
  0x47: { mnemonic: 'BIT 0,A', bytes: 2 },
  0x48: { mnemonic: 'BIT 1,B', bytes: 2 },
  0x49: { mnemonic: 'BIT 1,C', bytes: 2 },
  0x4A: { mnemonic: 'BIT 1,D', bytes: 2 },
  0x4B: { mnemonic: 'BIT 1,E', bytes: 2 },
  0x4C: { mnemonic: 'BIT 1,H', bytes: 2 },
  0x4D: { mnemonic: 'BIT 1,L', bytes: 2 },
  0x4E: { mnemonic: 'BIT 1,(HL)', bytes: 2 },
  0x4F: { mnemonic: 'BIT 1,A', bytes: 2 },
  0x50: { mnemonic: 'BIT 2,B', bytes: 2 },
  0x51: { mnemonic: 'BIT 2,C', bytes: 2 },
  0x52: { mnemonic: 'BIT 2,D', bytes: 2 },
  0x53: { mnemonic: 'BIT 2,E', bytes: 2 },
  0x54: { mnemonic: 'BIT 2,H', bytes: 2 },
  0x55: { mnemonic: 'BIT 2,L', bytes: 2 },
  0x56: { mnemonic: 'BIT 2,(HL)', bytes: 2 },
  0x57: { mnemonic: 'BIT 2,A', bytes: 2 },
  0x58: { mnemonic: 'BIT 3,B', bytes: 2 },
  0x59: { mnemonic: 'BIT 3,C', bytes: 2 },
  0x5A: { mnemonic: 'BIT 3,D', bytes: 2 },
  0x5B: { mnemonic: 'BIT 3,E', bytes: 2 },
  0x5C: { mnemonic: 'BIT 3,H', bytes: 2 },
  0x5D: { mnemonic: 'BIT 3,L', bytes: 2 },
  0x5E: { mnemonic: 'BIT 3,(HL)', bytes: 2 },
  0x5F: { mnemonic: 'BIT 3,A', bytes: 2 },
  0x60: { mnemonic: 'BIT 4,B', bytes: 2 },
  0x61: { mnemonic: 'BIT 4,C', bytes: 2 },
  0x62: { mnemonic: 'BIT 4,D', bytes: 2 },
  0x63: { mnemonic: 'BIT 4,E', bytes: 2 },
  0x64: { mnemonic: 'BIT 4,H', bytes: 2 },
  0x65: { mnemonic: 'BIT 4,L', bytes: 2 },
  0x66: { mnemonic: 'BIT 4,(HL)', bytes: 2 },
  0x67: { mnemonic: 'BIT 4,A', bytes: 2 },
  0x68: { mnemonic: 'BIT 5,B', bytes: 2 },
  0x69: { mnemonic: 'BIT 5,C', bytes: 2 },
  0x6A: { mnemonic: 'BIT 5,D', bytes: 2 },
  0x6B: { mnemonic: 'BIT 5,E', bytes: 2 },
  0x6C: { mnemonic: 'BIT 5,H', bytes: 2 },
  0x6D: { mnemonic: 'BIT 5,L', bytes: 2 },
  0x6E: { mnemonic: 'BIT 5,(HL)', bytes: 2 },
  0x6F: { mnemonic: 'BIT 5,A', bytes: 2 },
  0x70: { mnemonic: 'BIT 6,B', bytes: 2 },
  0x71: { mnemonic: 'BIT 6,C', bytes: 2 },
  0x72: { mnemonic: 'BIT 6,D', bytes: 2 },
  0x73: { mnemonic: 'BIT 6,E', bytes: 2 },
  0x74: { mnemonic: 'BIT 6,H', bytes: 2 },
  0x75: { mnemonic: 'BIT 6,L', bytes: 2 },
  0x76: { mnemonic: 'BIT 6,(HL)', bytes: 2 },
  0x77: { mnemonic: 'BIT 6,A', bytes: 2 },
  0x78: { mnemonic: 'BIT 7,B', bytes: 2 },
  0x79: { mnemonic: 'BIT 7,C', bytes: 2 },
  0x7A: { mnemonic: 'BIT 7,D', bytes: 2 },
  0x7B: { mnemonic: 'BIT 7,E', bytes: 2 },
  0x7C: { mnemonic: 'BIT 7,H', bytes: 2 },
  0x7D: { mnemonic: 'BIT 7,L', bytes: 2 },
  0x7E: { mnemonic: 'BIT 7,(HL)', bytes: 2 },
  0x7F: { mnemonic: 'BIT 7,A', bytes: 2 },
  0x80: { mnemonic: 'RES 0,B', bytes: 2 },
  0x81: { mnemonic: 'RES 0,C', bytes: 2 },
  0x82: { mnemonic: 'RES 0,D', bytes: 2 },
  0x83: { mnemonic: 'RES 0,E', bytes: 2 },
  0x84: { mnemonic: 'RES 0,H', bytes: 2 },
  0x85: { mnemonic: 'RES 0,L', bytes: 2 },
  0x86: { mnemonic: 'RES 0,(HL)', bytes: 2 },
  0x87: { mnemonic: 'RES 0,A', bytes: 2 },
  0x88: { mnemonic: 'RES 1,B', bytes: 2 },
  0x89: { mnemonic: 'RES 1,C', bytes: 2 },
  0x8A: { mnemonic: 'RES 1,D', bytes: 2 },
  0x8B: { mnemonic: 'RES 1,E', bytes: 2 },
  0x8C: { mnemonic: 'RES 1,H', bytes: 2 },
  0x8D: { mnemonic: 'RES 1,L', bytes: 2 },
  0x8E: { mnemonic: 'RES 1,(HL)', bytes: 2 },
  0x8F: { mnemonic: 'RES 1,A', bytes: 2 },
  0x90: { mnemonic: 'RES 2,B', bytes: 2 },
  0x91: { mnemonic: 'RES 2,C', bytes: 2 },
  0x92: { mnemonic: 'RES 2,D', bytes: 2 },
  0x93: { mnemonic: 'RES 2,E', bytes: 2 },
  0x94: { mnemonic: 'RES 2,H', bytes: 2 },
  0x95: { mnemonic: 'RES 2,L', bytes: 2 },
  0x96: { mnemonic: 'RES 2,(HL)', bytes: 2 },
  0x97: { mnemonic: 'RES 2,A', bytes: 2 },
  0x98: { mnemonic: 'RES 3,B', bytes: 2 },
  0x99: { mnemonic: 'RES 3,C', bytes: 2 },
  0x9A: { mnemonic: 'RES 3,D', bytes: 2 },
  0x9B: { mnemonic: 'RES 3,E', bytes: 2 },
  0x9C: { mnemonic: 'RES 3,H', bytes: 2 },
  0x9D: { mnemonic: 'RES 3,L', bytes: 2 },
  0x9E: { mnemonic: 'RES 3,(HL)', bytes: 2 },
  0x9F: { mnemonic: 'RES 3,A', bytes: 2 },
  0xA0: { mnemonic: 'RES 4,B', bytes: 2 },
  0xA1: { mnemonic: 'RES 4,C', bytes: 2 },
  0xA2: { mnemonic: 'RES 4,D', bytes: 2 },
  0xA3: { mnemonic: 'RES 4,E', bytes: 2 },
  0xA4: { mnemonic: 'RES 4,H', bytes: 2 },
  0xA5: { mnemonic: 'RES 4,L', bytes: 2 },
  0xA6: { mnemonic: 'RES 4,(HL)', bytes: 2 },
  0xA7: { mnemonic: 'RES 4,A', bytes: 2 },
  0xA8: { mnemonic: 'RES 5,B', bytes: 2 },
  0xA9: { mnemonic: 'RES 5,C', bytes: 2 },
  0xAA: { mnemonic: 'RES 5,D', bytes: 2 },
  0xAB: { mnemonic: 'RES 5,E', bytes: 2 },
  0xAC: { mnemonic: 'RES 5,H', bytes: 2 },
  0xAD: { mnemonic: 'RES 5,L', bytes: 2 },
  0xAE: { mnemonic: 'RES 5,(HL)', bytes: 2 },
  0xAF: { mnemonic: 'RES 5,A', bytes: 2 },
  0xB0: { mnemonic: 'RES 6,B', bytes: 2 },
  0xB1: { mnemonic: 'RES 6,C', bytes: 2 },
  0xB2: { mnemonic: 'RES 6,D', bytes: 2 },
  0xB3: { mnemonic: 'RES 6,E', bytes: 2 },
  0xB4: { mnemonic: 'RES 6,H', bytes: 2 },
  0xB5: { mnemonic: 'RES 6,L', bytes: 2 },
  0xB6: { mnemonic: 'RES 6,(HL)', bytes: 2 },
  0xB7: { mnemonic: 'RES 6,A', bytes: 2 },
  0xB8: { mnemonic: 'RES 7,B', bytes: 2 },
  0xB9: { mnemonic: 'RES 7,C', bytes: 2 },
  0xBA: { mnemonic: 'RES 7,D', bytes: 2 },
  0xBB: { mnemonic: 'RES 7,E', bytes: 2 },
  0xBC: { mnemonic: 'RES 7,H', bytes: 2 },
  0xBD: { mnemonic: 'RES 7,L', bytes: 2 },
  0xBE: { mnemonic: 'RES 7,(HL)', bytes: 2 },
  0xBF: { mnemonic: 'RES 7,A', bytes: 2 },
  0xC0: { mnemonic: 'SET 0,B', bytes: 2 },
  0xC1: { mnemonic: 'SET 0,C', bytes: 2 },
  0xC2: { mnemonic: 'SET 0,D', bytes: 2 },
  0xC3: { mnemonic: 'SET 0,E', bytes: 2 },
  0xC4: { mnemonic: 'SET 0,H', bytes: 2 },
  0xC5: { mnemonic: 'SET 0,L', bytes: 2 },
  0xC6: { mnemonic: 'SET 0,(HL)', bytes: 2 },
  0xC7: { mnemonic: 'SET 0,A', bytes: 2 },
  0xC8: { mnemonic: 'SET 1,B', bytes: 2 },
  0xC9: { mnemonic: 'SET 1,C', bytes: 2 },
  0xCA: { mnemonic: 'SET 1,D', bytes: 2 },
  0xCB: { mnemonic: 'SET 1,E', bytes: 2 },
  0xCC: { mnemonic: 'SET 1,H', bytes: 2 },
  0xCD: { mnemonic: 'SET 1,L', bytes: 2 },
  0xCE: { mnemonic: 'SET 1,(HL)', bytes: 2 },
  0xCF: { mnemonic: 'SET 1,A', bytes: 2 },
  0xD0: { mnemonic: 'SET 2,B', bytes: 2 },
  0xD1: { mnemonic: 'SET 2,C', bytes: 2 },
  0xD2: { mnemonic: 'SET 2,D', bytes: 2 },
  0xD3: { mnemonic: 'SET 2,E', bytes: 2 },
  0xD4: { mnemonic: 'SET 2,H', bytes: 2 },
  0xD5: { mnemonic: 'SET 2,L', bytes: 2 },
  0xD6: { mnemonic: 'SET 2,(HL)', bytes: 2 },
  0xD7: { mnemonic: 'SET 2,A', bytes: 2 },
  0xD8: { mnemonic: 'SET 3,B', bytes: 2 },
  0xD9: { mnemonic: 'SET 3,C', bytes: 2 },
  0xDA: { mnemonic: 'SET 3,D', bytes: 2 },
  0xDB: { mnemonic: 'SET 3,E', bytes: 2 },
  0xDC: { mnemonic: 'SET 3,H', bytes: 2 },
  0xDD: { mnemonic: 'SET 3,L', bytes: 2 },
  0xDE: { mnemonic: 'SET 3,(HL)', bytes: 2 },
  0xDF: { mnemonic: 'SET 3,A', bytes: 2 },
  0xE0: { mnemonic: 'SET 4,B', bytes: 2 },
  0xE1: { mnemonic: 'SET 4,C', bytes: 2 },
  0xE2: { mnemonic: 'SET 4,D', bytes: 2 },
  0xE3: { mnemonic: 'SET 4,E', bytes: 2 },
  0xE4: { mnemonic: 'SET 4,H', bytes: 2 },
  0xE5: { mnemonic: 'SET 4,L', bytes: 2 },
  0xE6: { mnemonic: 'SET 4,(HL)', bytes: 2 },
  0xE7: { mnemonic: 'SET 4,A', bytes: 2 },
  0xE8: { mnemonic: 'SET 5,B', bytes: 2 },
  0xE9: { mnemonic: 'SET 5,C', bytes: 2 },
  0xEA: { mnemonic: 'SET 5,D', bytes: 2 },
  0xEB: { mnemonic: 'SET 5,E', bytes: 2 },
  0xEC: { mnemonic: 'SET 5,H', bytes: 2 },
  0xED: { mnemonic: 'SET 5,L', bytes: 2 },
  0xEE: { mnemonic: 'SET 5,(HL)', bytes: 2 },
  0xEF: { mnemonic: 'SET 5,A', bytes: 2 },
  0xF0: { mnemonic: 'SET 6,B', bytes: 2 },
  0xF1: { mnemonic: 'SET 6,C', bytes: 2 },
  0xF2: { mnemonic: 'SET 6,D', bytes: 2 },
  0xF3: { mnemonic: 'SET 6,E', bytes: 2 },
  0xF4: { mnemonic: 'SET 6,H', bytes: 2 },
  0xF5: { mnemonic: 'SET 6,L', bytes: 2 },
  0xF6: { mnemonic: 'SET 6,(HL)', bytes: 2 },
  0xF7: { mnemonic: 'SET 6,A', bytes: 2 },
  0xF8: { mnemonic: 'SET 7,B', bytes: 2 },
  0xF9: { mnemonic: 'SET 7,C', bytes: 2 },
  0xFA: { mnemonic: 'SET 7,D', bytes: 2 },
  0xFB: { mnemonic: 'SET 7,E', bytes: 2 },
  0xFC: { mnemonic: 'SET 7,H', bytes: 2 },
  0xFD: { mnemonic: 'SET 7,L', bytes: 2 },
  0xFE: { mnemonic: 'SET 7,(HL)', bytes: 2 },
  0xFF: { mnemonic: 'SET 7,A', bytes: 2 }
};

/**
 * ED-prefixed opcode table (ED xx)
 */
export const Z80EDOpcodeTable = {
  0x40: { mnemonic: 'ADC B', bytes: 2 },
  0x41: { mnemonic: 'ADC C', bytes: 2 },
  0x42: { mnemonic: 'ADC D', bytes: 2 },
  0x43: { mnemonic: 'ADC E', bytes: 2 },
  0x44: { mnemonic: 'ADC H', bytes: 2 },
  0x45: { mnemonic: 'ADC L', bytes: 2 },
  0x46: { mnemonic: 'ADC (HL)', bytes: 2 },
  0x47: { mnemonic: 'ADC A', bytes: 2 },
  0x48: { mnemonic: 'SBC B', bytes: 2 },
  0x49: { mnemonic: 'SBC C', bytes: 2 },
  0x4A: { mnemonic: 'SBC D', bytes: 2 },
  0x4B: { mnemonic: 'SBC E', bytes: 2 },
  0x4C: { mnemonic: 'SBC H', bytes: 2 },
  0x4D: { mnemonic: 'SBC L', bytes: 2 },
  0x4E: { mnemonic: 'SBC (HL)', bytes: 2 },
  0x4F: { mnemonic: 'SBC A', bytes: 2 },
  0x50: { mnemonic: 'IM 0', bytes: 2 },
  0x51: { mnemonic: 'IM 1', bytes: 2 },
  0x52: { mnemonic: 'IM 2', bytes: 2 },
  0x53: { mnemonic: 'LD A,I', bytes: 2 },
  0x54: { mnemonic: 'LD A,R', bytes: 2 },
  0x55: { mnemonic: 'LD I,A', bytes: 2 },
  0x56: { mnemonic: 'LD R,A', bytes: 2 },
  0x57: { mnemonic: 'NEG', bytes: 2 },
  0x58: { mnemonic: 'RETN', bytes: 2 },
  0x00: { mnemonic: 'INI', bytes: 2 },
  0x01: { mnemonic: 'OUTI', bytes: 2 },
  0x02: { mnemonic: 'IND', bytes: 2 },
  0x03: { mnemonic: 'OUTD', bytes: 2 },
  0x20: { mnemonic: 'INIR', bytes: 2 },
  0x21: { mnemonic: 'OTIR', bytes: 2 },
  0x30: { mnemonic: 'INDR', bytes: 2 },
  0x31: { mnemonic: 'OTDR', bytes: 2 },
  0xB0: { mnemonic: 'LDIR', bytes: 2 },
  0xB8: { mnemonic: 'LDDR', bytes: 2 },
  0x49: { mnemonic: 'LD SP,HL', bytes: 2 },
  0x4A: { mnemonic: 'LD SP,BC', bytes: 2 },
  0x4B: { mnemonic: 'LD SP,DE', bytes: 2 },
  0x59: { mnemonic: 'LD H,I', bytes: 2 },
  0x5A: { mnemonic: 'LD H,R', bytes: 2 },
  0x5B: { mnemonic: 'LD R,I', bytes: 2 },
  0x5C: { mnemonic: 'LD R,H', bytes: 2 },
  0x78: { mnemonic: 'LD I,H', bytes: 2 },
  0x79: { mnemonic: 'LD I,R', bytes: 2 },
  0x7A: { mnemonic: 'LD I,E', bytes: 2 },
  0x7B: { mnemonic: 'LD R,E', bytes: 2 },
  0x7C: { mnemonic: 'LD I,L', bytes: 2 },
  0x7D: { mnemonic: 'LD R,L', bytes: 2 },
  0x7E: { mnemonic: 'LD I,A', bytes: 2 },
  0x7F: { mnemonic: 'LD R,A', bytes: 2 },
  0x83: { mnemonic: 'RETn', bytes: 2 },
  0x8B: { mnemonic: 'RETn', bytes: 2 },
  0xA0: { mnemonic: 'SBC16 HL', bytes: 2 },
  0xA1: { mnemonic: 'SBC16 SP', bytes: 2 },
  0xA8: { mnemonic: 'ADC16 HL', bytes: 2 },
  0xA9: { mnemonic: 'ADC16 SP', bytes: 2 }
};

/**
 * DD-prefixed (IX) opcode table
 */
export const Z80DDOpcodeTable = {
  0x21: { mnemonic: 'LD IX,nn', bytes: 4 },
  0x09: { mnemonic: 'ADD IX,BC', bytes: 2 },
  0x19: { mnemonic: 'ADD IX,DE', bytes: 2 },
  0x23: { mnemonic: 'INC IX', bytes: 2 },
  0x2B: { mnemonic: 'DEC IX', bytes: 2 },
  0x22: { mnemonic: 'LD (nn),IX', bytes: 4 },
  0x2A: { mnemonic: 'LD IX,(nn)', bytes: 4 },
  0x39: { mnemonic: 'ADD IX,SP', bytes: 2 },
  0xE9: { mnemonic: 'JP (IX)', bytes: 2 },
  0xF9: { mnemonic: 'LD SP,IX', bytes: 2 },
  0x03: { mnemonic: 'INC IX', bytes: 2 },
  0x0B: { mnemonic: 'DEC IX', bytes: 2 },
  0x46: { mnemonic: 'LD B,(IX+d)', bytes: 3 },
  0x4E: { mnemonic: 'LD C,(IX+d)', bytes: 3 },
  0x56: { mnemonic: 'LD D,(IX+d)', bytes: 3 },
  0x5E: { mnemonic: 'LD E,(IX+d)', bytes: 3 },
  0x66: { mnemonic: 'LD H,(IX+d)', bytes: 3 },
  0x6E: { mnemonic: 'LD L,(IX+d)', bytes: 3 },
  0x7E: { mnemonic: 'LD A,(IX+d)', bytes: 3 },
  0x70: { mnemonic: 'LD (IX+d),B', bytes: 3 },
  0x71: { mnemonic: 'LD (IX+d),C', bytes: 3 },
  0x72: { mnemonic: 'LD (IX+d),D', bytes: 3 },
  0x73: { mnemonic: 'LD (IX+d),E', bytes: 3 },
  0x74: { mnemonic: 'LD (IX+d),H', bytes: 3 },
  0x75: { mnemonic: 'LD (IX+d),L', bytes: 3 },
  0x77: { mnemonic: 'LD (IX+d),A', bytes: 3 },
  0x86: { mnemonic: 'ADD A,(IX+d)', bytes: 3 },
  0x8E: { mnemonic: 'ADC A,(IX+d)', bytes: 3 },
  0x96: { mnemonic: 'SUB A,(IX+d)', bytes: 3 },
  0x9E: { mnemonic: 'SBC A,(IX+d)', bytes: 3 },
  0xA6: { mnemonic: 'AND (IX+d)', bytes: 3 },
  0xAE: { mnemonic: 'XOR (IX+d)', bytes: 3 },
  0xB6: { mnemonic: 'OR (IX+d)', bytes: 3 },
  0xBE: { mnemonic: 'CP (IX+d)', bytes: 3 },
  0x34: { mnemonic: 'INC (IX+d)', bytes: 3 },
  0x35: { mnemonic: 'DEC (IX+d)', bytes: 3 },
  0x36: { mnemonic: 'LD (IX+d),n', bytes: 4 }
};

/**
 * FD-prefixed (IY) opcode table
 */
export const Z80FDOpcodeTable = {
  0x21: { mnemonic: 'LD IY,nn', bytes: 4 },
  0x09: { mnemonic: 'ADD IY,BC', bytes: 2 },
  0x19: { mnemonic: 'ADD IY,DE', bytes: 2 },
  0x23: { mnemonic: 'INC IY', bytes: 2 },
  0x2B: { mnemonic: 'DEC IY', bytes: 2 },
  0x22: { mnemonic: 'LD (nn),IY', bytes: 4 },
  0x2A: { mnemonic: 'LD IY,(nn)', bytes: 4 },
  0x39: { mnemonic: 'ADD IY,SP', bytes: 2 },
  0xE9: { mnemonic: 'JP (IY)', bytes: 2 },
  0xF9: { mnemonic: 'LD SP,IY', bytes: 2 },
  0x03: { mnemonic: 'INC IY', bytes: 2 },
  0x0B: { mnemonic: 'DEC IY', bytes: 2 },
  0x46: { mnemonic: 'LD B,(IY+d)', bytes: 3 },
  0x4E: { mnemonic: 'LD C,(IY+d)', bytes: 3 },
  0x56: { mnemonic: 'LD D,(IY+d)', bytes: 3 },
  0x5E: { mnemonic: 'LD E,(IY+d)', bytes: 3 },
  0x66: { mnemonic: 'LD H,(IY+d)', bytes: 3 },
  0x6E: { mnemonic: 'LD L,(IY+d)', bytes: 3 },
  0x7E: { mnemonic: 'LD A,(IY+d)', bytes: 3 },
  0x70: { mnemonic: 'LD (IY+d),B', bytes: 3 },
  0x71: { mnemonic: 'LD (IY+d),C', bytes: 3 },
  0x72: { mnemonic: 'LD (IY+d),D', bytes: 3 },
  0x73: { mnemonic: 'LD (IY+d),E', bytes: 3 },
  0x74: { mnemonic: 'LD (IY+d),H', bytes: 3 },
  0x75: { mnemonic: 'LD (IY+d),L', bytes: 3 },
  0x77: { mnemonic: 'LD (IY+d),A', bytes: 3 },
  0x86: { mnemonic: 'ADD A,(IY+d)', bytes: 3 },
  0x8E: { mnemonic: 'ADC A,(IY+d)', bytes: 3 },
  0x96: { mnemonic: 'SUB A,(IY+d)', bytes: 3 },
  0x9E: { mnemonic: 'SBC A,(IY+d)', bytes: 3 },
  0xA6: { mnemonic: 'AND (IY+d)', bytes: 3 },
  0xAE: { mnemonic: 'XOR (IY+d)', bytes: 3 },
  0xB6: { mnemonic: 'OR (IY+d)', bytes: 3 },
  0xBE: { mnemonic: 'CP (IY+d)', bytes: 3 },
  0x34: { mnemonic: 'INC (IY+d)', bytes: 3 },
  0x35: { mnemonic: 'DEC (IY+d)', bytes: 3 },
  0x36: { mnemonic: 'LD (IY+d),n', bytes: 4 }
};

/**
 * Represents a disassembled Z80 instruction
 */
export class Z80Instruction {
  /**
   * Creates a new Z80 instruction
   * @param {number} opcode - The raw opcode byte value
   * @param {string} mnemonic - The Z80 mnemonic
   * @param {string[]} operands - Operand strings
   * @param {number[]} bytes - The raw bytes including prefixes
   * @param {number} length - Total instruction length in bytes
   * @param {number} address - The address where this instruction was found
   */
  constructor(opcode, mnemonic, operands, bytes, length, address) {
    this.opcode = opcode;
    this.mnemonic = mnemonic;
    this.operands = operands;
    this.bytes = bytes;
    this.length = length;
    this.address = address;
  }

  /**
   * Serializes the instruction to JSON
   * @returns {Object} JSON representation of the instruction
   */
  toJSON() {
    return {
      opcode: this.opcode,
      mnemonic: this.mnemonic,
      operands: this.operands,
      bytes: this.bytes,
      length: this.length,
      address: this.address
    };
  }
}

/**
 * Z80 Disassembler class
 */
export class Z80Disassembler {
  /**
   * Creates a new Z80 disassembler
   * @param {Uint8Array|number[]} bytes - The machine code bytes to disassemble
   * @param {Object} options - Disassembler options
   * @param {number} options.baseAddress - Base address for disassembly (default 0x0000)
   * @param {Map<string, number>} options.symbols - Symbol table mapping names to addresses
   */
  constructor(bytes, options = {}) {
    this.bytes = Array.from(bytes);
    this.baseAddress = options.baseAddress ?? 0x0000;
    this.symbols = options.symbols ?? new Map();
  }

  /**
   * Disassembles all bytes and returns an array of instructions
   * @returns {Z80Instruction[]} Array of disassembled instructions
   */
  disassemble() {
    return this.disassembleRange(this.baseAddress, this.baseAddress + this.bytes.length);
  }

  /**
   * Disassembles a specific address range
   * @param {number} start - Start address
   * @param {number} end - End address
   * @returns {Z80Instruction[]} Array of disassembled instructions in the range
   */
  disassembleRange(start, end) {
    const instructions = [];
    let offset = start - this.baseAddress;

    while (offset >= 0 && offset < this.bytes.length && start < end) {
      const instruction = this.disassembleAt(start);
      if (!instruction) break;
      instructions.push(instruction);
      start += instruction.length;
      offset += instruction.length;
    }

    return instructions;
  }

  /**
   * Disassembles a single instruction at the given address
   * @param {number} address - The address to disassemble
   * @returns {Z80Instruction|null} The disassembled instruction or null
   */
  disassembleAt(address) {
    const offset = address - this.baseAddress;
    if (offset < 0 || offset >= this.bytes.length) return null;

    const byte = this.bytes[offset];

    if (byte === 0xCB) {
      return this.parseCbprefixed(address, offset);
    }

    if (byte === 0xED) {
      return this.parseEdprefixed(address, offset);
    }

    if (byte === 0xDD) {
      return this.parseDdprefixed(address, offset);
    }

    if (byte === 0xFD) {
      return this.parseFdprefixed(address, offset);
    }

    return this.parseStandardOpcode(address, offset);
  }

  /**
   * Parses a standard opcode (0x00-0xFF without prefixes)
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseStandardOpcode(address, offset) {
    const byte = this.bytes[offset];
    const entry = Z80OpcodeTable[byte];

    if (!entry) {
      return new Z80Instruction(byte, `DB $${byte.toString(16).padStart(2, '0')}`, [], [byte], 1, address);
    }

    const bytes = [byte];
    const operands = [];

    if (entry.bytes === 2) {
      const n = this.bytes[offset + 1];
      bytes.push(n);
      operands.push(this.formatOperand(n, 'byte'));
    }

    if (entry.bytes === 3) {
      const low = this.bytes[offset + 1];
      const high = this.bytes[offset + 2];
      const nn = (high << 8) | low;
      bytes.push(low, high);
      operands.push(this.formatOperand(nn, 'address'));
    }

    return new Z80Instruction(byte, entry.mnemonic, operands, bytes, entry.bytes, address);
  }

  /**
   * Parses a CB-prefixed instruction
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseCbprefixed(address, offset) {
    const cb = this.bytes[offset];
    const xx = this.bytes[offset + 1];
    const entry = Z80CBOpcodeTable[xx];

    if (!entry) {
      return new Z80Instruction(xx, `DB $${xx.toString(16).padStart(2, '0')}`, [], [cb, xx], 2, address);
    }

    const mnemonic = entry.mnemonic;
    const registerIndex = xx & 0x07;
    const registerName = RegisterNames[registerIndex];

    if (mnemonic.startsWith('BIT') || mnemonic.startsWith('RES') || mnemonic.startsWith('SET')) {
      const bitNum = (xx >> 3) & 0x07;
      const operands = [this.formatOperand(bitNum, 'bit'), registerName];
      return new Z80Instruction(xx, `${mnemonic.split(' ')[0]} ${bitNum},${registerName}`, operands, [cb, xx], 2, address);
    }

    return new Z80Instruction(xx, mnemonic, [registerName], [cb, xx], 2, address);
  }

  /**
   * Parses an ED-prefixed instruction
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseEdprefixed(address, offset) {
    const ed = this.bytes[offset];
    const xx = this.bytes[offset + 1];
    const entry = Z80EDOpcodeTable[xx];

    if (!entry) {
      return new Z80Instruction(xx, `DB $${xx.toString(16).padStart(2, '0')}`, [], [ed, xx], 2, address);
    }

    const mnemonic = entry.mnemonic;
    const bytes = [ed, xx];
    const operands = [];

    if (entry.bytes === 4) {
      const low = this.bytes[offset + 2];
      const high = this.bytes[offset + 3];
      const nn = (high << 8) | low;
      bytes.push(low, high);
      operands.push(this.formatOperand(nn, 'address'));
    }

    if (mnemonic === 'IM 0' || mnemonic === 'IM 1' || mnemonic === 'IM 2') {
      const imMode = mnemonic.split(' ')[1];
      return new Z80Instruction(xx, `IM ${imMode}`, [], bytes, 2, address);
    }

    if (mnemonic.includes('16')) {
      const parts = mnemonic.split(' ');
      return new Z80Instruction(xx, `${parts[0]} ${parts[1]}`, [], bytes, 2, address);
    }

    return new Z80Instruction(xx, mnemonic, operands, bytes, entry.bytes, address);
  }

  /**
   * Parses a DD-prefixed (IX) instruction
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseDdprefixed(address, offset) {
    const dd = this.bytes[offset];
    const nextByte = this.bytes[offset + 1];

    if (nextByte === 0xCB) {
      return this.parseDdCbprefixed(address, offset);
    }

    const entry = Z80DDOpcodeTable[nextByte];

    if (!entry) {
      return this.parseDdStandard(address, offset, nextByte);
    }

    const mnemonic = entry.mnemonic;
    const bytes = [dd, nextByte];
    const operands = [];

    if (entry.bytes === 4 && mnemonic.includes('nn')) {
      const low = this.bytes[offset + 2];
      const high = this.bytes[offset + 3];
      const nn = (high << 8) | low;
      bytes.push(low, high);
      operands.push(this.formatOperand(nn, 'address'));
    }

    if (entry.bytes === 4 && mnemonic.includes('d')) {
      const d = this.bytes[offset + 2];
      bytes.push(d);
      operands.push(this.formatOperand(d, 'displacement'));
      const n = this.bytes[offset + 3];
      bytes.push(n);
      operands.push(this.formatOperand(n, 'byte'));
    }

    if (entry.bytes === 3 && mnemonic.includes('d')) {
      const d = this.bytes[offset + 2];
      bytes.push(d);
      operands.push(this.formatOperand(d, 'displacement'));
    }

    if (entry.bytes === 2 && mnemonic.includes('d')) {
      const d = this.bytes[offset + 2];
      bytes.push(d);
      operands.push(this.formatOperand(d, 'displacement'));
    }

    return new Z80Instruction(nextByte, mnemonic, operands, bytes, entry.bytes, address);
  }

  /**
   * Parses a DD-prefixed CB instruction (IX+d operations)
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseDdCbprefixed(address, offset) {
    const dd = this.bytes[offset];
    const cb = this.bytes[offset + 1];
    const xx = this.bytes[offset + 2];
    const d = this.bytes[offset + 3];
    const entry = Z80CBOpcodeTable[xx];

    if (!entry) {
      return new Z80Instruction(xx, `DB $${xx.toString(16).padStart(2, '0')}`, [], [dd, cb, xx, d], 4, address);
    }

    const mnemonic = entry.mnemonic;
    const registerIndex = xx & 0x07;
    const registerName = RegisterNames[registerIndex];
    const ixAddr = `(IX+${this.formatOperand(d, 'displacement')})`;

    if (mnemonic.startsWith('BIT') || mnemonic.startsWith('RES') || mnemonic.startsWith('SET')) {
      const bitNum = (xx >> 3) & 0x07;
      const operands = [this.formatOperand(bitNum, 'bit'), ixAddr];
      return new Z80Instruction(xx, `${mnemonic.split(' ')[0]} ${bitNum},${ixAddr}`, operands, [dd, cb, xx, d], 4, address);
    }

    return new Z80Instruction(xx, mnemonic.replace('(HL)', ixAddr), [ixAddr], [dd, cb, xx, d], 4, address);
  }

  /**
   * Parses a DD-prefixed standard instruction not in the DD table
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @param {number} nextByte - The byte after DD prefix
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseDdStandard(address, offset, nextByte) {
    const dd = this.bytes[offset];
    const bytes = [dd];
    const operands = [];

    if (Z80OpcodeTable[nextByte]) {
      const entry = Z80OpcodeTable[nextByte];
      const baseMnemonic = entry.mnemonic;

      let mnemonic = baseMnemonic;
      let hasIxDisplacement = false;
      if (baseMnemonic.includes('(HL)')) {
        mnemonic = baseMnemonic.replace('(HL)', '(IX+d)');
        hasIxDisplacement = true;
      }
      if (baseMnemonic.includes('HL') && !baseMnemonic.includes('(HL)')) {
        mnemonic = baseMnemonic.replace('HL', 'IX');
      }

      bytes.push(nextByte);

      if (hasIxDisplacement) {
        const d = this.bytes[offset + 2];
        bytes.push(d);
        operands.push(this.formatOperand(d, 'displacement'));

        if (entry.bytes === 2) {
          const n = this.bytes[offset + 3];
          bytes.push(n);
          operands.push(this.formatOperand(n, 'byte'));
        }

        if (entry.bytes === 3) {
          const low = this.bytes[offset + 3];
          const high = this.bytes[offset + 4];
          const nn = (high << 8) | low;
          bytes.push(low, high);
          operands.push(this.formatOperand(nn, 'address'));
        }

        return new Z80Instruction(nextByte, mnemonic, operands, bytes, bytes.length, address);
      }

      if (entry.bytes === 2) {
        const n = this.bytes[offset + 2];
        bytes.push(n);
        operands.push(this.formatOperand(n, 'byte'));
      }

      if (entry.bytes === 3) {
        const low = this.bytes[offset + 2];
        const high = this.bytes[offset + 3];
        const nn = (high << 8) | low;
        bytes.push(low, high);
        operands.push(this.formatOperand(nn, 'address'));
      }

      return new Z80Instruction(nextByte, mnemonic, operands, bytes, bytes.length, address);
    }

    return new Z80Instruction(nextByte, `DB $${nextByte.toString(16).padStart(2, '0')}`, [], bytes, 1, address);
  }

  /**
   * Parses an FD-prefixed (IY) instruction
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseFdprefixed(address, offset) {
    const fd = this.bytes[offset];
    const nextByte = this.bytes[offset + 1];

    if (nextByte === 0xCB) {
      return this.parseFdCbprefixed(address, offset);
    }

    const entry = Z80FDOpcodeTable[nextByte];

    if (!entry) {
      return this.parseFdStandard(address, offset, nextByte);
    }

    const mnemonic = entry.mnemonic;
    const bytes = [fd, nextByte];
    const operands = [];

    if (entry.bytes === 4 && mnemonic.includes('nn')) {
      const low = this.bytes[offset + 2];
      const high = this.bytes[offset + 3];
      const nn = (high << 8) | low;
      bytes.push(low, high);
      operands.push(this.formatOperand(nn, 'address'));
    }

    if (entry.bytes === 4 && mnemonic.includes('d')) {
      const d = this.bytes[offset + 2];
      bytes.push(d);
      operands.push(this.formatOperand(d, 'displacement'));
      const n = this.bytes[offset + 3];
      bytes.push(n);
      operands.push(this.formatOperand(n, 'byte'));
    }

    if (entry.bytes === 3 && mnemonic.includes('d')) {
      const d = this.bytes[offset + 2];
      bytes.push(d);
      operands.push(this.formatOperand(d, 'displacement'));
    }

    if (entry.bytes === 2 && mnemonic.includes('d')) {
      const d = this.bytes[offset + 2];
      bytes.push(d);
      operands.push(this.formatOperand(d, 'displacement'));
    }

    return new Z80Instruction(nextByte, mnemonic, operands, bytes, entry.bytes, address);
  }

  /**
   * Parses an FD-prefixed CB instruction (IY+d operations)
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseFdCbprefixed(address, offset) {
    const fd = this.bytes[offset];
    const cb = this.bytes[offset + 1];
    const xx = this.bytes[offset + 2];
    const d = this.bytes[offset + 3];
    const entry = Z80CBOpcodeTable[xx];

    if (!entry) {
      return new Z80Instruction(xx, `DB $${xx.toString(16).padStart(2, '0')}`, [], [fd, cb, xx, d], 4, address);
    }

    const mnemonic = entry.mnemonic;
    const registerIndex = xx & 0x07;
    const registerName = RegisterNames[registerIndex];
    const iyAddr = `(IY+${this.formatOperand(d, 'displacement')})`;

    if (mnemonic.startsWith('BIT') || mnemonic.startsWith('RES') || mnemonic.startsWith('SET')) {
      const bitNum = (xx >> 3) & 0x07;
      const operands = [this.formatOperand(bitNum, 'bit'), iyAddr];
      return new Z80Instruction(xx, `${mnemonic.split(' ')[0]} ${bitNum},${iyAddr}`, operands, [fd, cb, xx, d], 4, address);
    }

    return new Z80Instruction(xx, mnemonic.replace('(HL)', iyAddr), [iyAddr], [fd, cb, xx, d], 4, address);
  }

  /**
   * Parses an FD-prefixed standard instruction not in the FD table
   * @param {number} address - The address of the instruction
   * @param {number} offset - The byte offset in the input array
   * @param {number} nextByte - The byte after FD prefix
   * @returns {Z80Instruction} The disassembled instruction
   */
  parseFdStandard(address, offset, nextByte) {
    const fd = this.bytes[offset];
    const bytes = [fd];
    const operands = [];

    if (Z80OpcodeTable[nextByte]) {
      const entry = Z80OpcodeTable[nextByte];
      const baseMnemonic = entry.mnemonic;

      let mnemonic = baseMnemonic;
      let hasIyDisplacement = false;
      if (baseMnemonic.includes('(HL)')) {
        mnemonic = baseMnemonic.replace('(HL)', '(IY+d)');
        hasIyDisplacement = true;
      }
      if (baseMnemonic.includes('HL') && !baseMnemonic.includes('(HL)')) {
        mnemonic = baseMnemonic.replace('HL', 'IY');
      }

      bytes.push(nextByte);

      if (hasIyDisplacement) {
        const d = this.bytes[offset + 2];
        bytes.push(d);
        operands.push(this.formatOperand(d, 'displacement'));

        if (entry.bytes === 2) {
          const n = this.bytes[offset + 3];
          bytes.push(n);
          operands.push(this.formatOperand(n, 'byte'));
        }

        if (entry.bytes === 3) {
          const low = this.bytes[offset + 3];
          const high = this.bytes[offset + 4];
          const nn = (high << 8) | low;
          bytes.push(low, high);
          operands.push(this.formatOperand(nn, 'address'));
        }

        return new Z80Instruction(nextByte, mnemonic, operands, bytes, bytes.length, address);
      }

      if (entry.bytes === 2) {
        const n = this.bytes[offset + 2];
        bytes.push(n);
        operands.push(this.formatOperand(n, 'byte'));
      }

      if (entry.bytes === 3) {
        const low = this.bytes[offset + 2];
        const high = this.bytes[offset + 3];
        const nn = (high << 8) | low;
        bytes.push(low, high);
        operands.push(this.formatOperand(nn, 'address'));
      }

      return new Z80Instruction(nextByte, mnemonic, operands, bytes, bytes.length, address);
    }

    return new Z80Instruction(nextByte, `DB $${nextByte.toString(16).padStart(2, '0')}`, [], bytes, 1, address);
  }

  /**
   * Attempts to resolve a symbol name for an address
   * @param {number} address - The address to resolve
   * @returns {string|null} The symbol name or null if not found
   */
  resolveSymbol(address) {
    for (const [name, addr] of this.symbols) {
      if (addr === address) return name;
    }
    return null;
  }

  /**
   * Formats an operand value based on its type
   * @param {number} value - The operand value
   * @param {string} type - The operand type ('byte', 'address', 'displacement', 'bit')
   * @returns {string} The formatted operand string
   */
  formatOperand(value, type) {
    switch (type) {
      case 'bit':
        return value.toString();
      case 'byte': {
        const resolved = this.resolveSymbol(value);
        if (resolved) return resolved;
        return `$${value.toString(16).padStart(2, '0')}`;
      }
      case 'address': {
        const resolved = this.resolveSymbol(value);
        if (resolved) return resolved;
        return `$${value.toString(16).padStart(4, '0')}`;
      }
      case 'displacement': {
        if (value >= 0x80) {
          return `-${(0x100 - value).toString(10)}`;
        }
        return `+${value.toString(10)}`;
      }
      default:
        return value.toString();
    }
  }
}

/**
 * Convenience function to disassemble bytes
 * @param {Uint8Array|number[]} bytes - The machine code bytes
 * @param {Object} options - Disassembler options
 * @param {number} options.baseAddress - Base address (default 0x0000)
 * @param {Map<string, number>} options.symbols - Symbol table
 * @returns {Z80Instruction[]} Array of disassembled instructions
 */
export function disassemble(bytes, options = {}) {
  const disassembler = new Z80Disassembler(bytes, options);
  return disassembler.disassemble();
}

/**
 * Disassembles bytes to formatted assembly lines with addresses
 * @param {Uint8Array|number[]} bytes - The machine code bytes
 * @param {Object} options - Disassembler options
 * @param {number} options.baseAddress - Base address (default 0x0000)
 * @param {Map<string, number>} options.symbols - Symbol table
 * @returns {string[]} Array of formatted assembly lines
 */
export function disassembleToLines(bytes, options = {}) {
  const instructions = disassemble(bytes, options);
  return instructions.map(inst => {
    const addr = `$${inst.address.toString(16).padStart(4, '0')}`;
    const operands = inst.operands.length > 0 ? ` ${inst.operands.join(', ')}` : '';
    return `${addr}: ${inst.mnemonic}${operands}`;
  });
}
