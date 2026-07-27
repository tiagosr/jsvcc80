/**
 * Binary Disassembler - disassembles flat binary files into annotated Z80 assembly
 */

import { readFileSync } from 'fs';
import { Z80Disassembler, Z80Instruction, disassemble } from './z80disassembler.js';

/**
 * Represents a binary section with name, address range, and bytes
 */
export class BinarySection {
  /**
   * Creates a new binary section
   * @param {string} name - Section name
   * @param {number} startAddress - Start address
   * @param {number} endAddress - End address
   * @param {Uint8Array} bytes - Section bytes
   */
  constructor(name, startAddress, endAddress, bytes) {
    this.name = name;
    this.startAddress = startAddress;
    this.endAddress = endAddress;
    this.bytes = bytes;
  }

  /**
   * Returns the section size in bytes
   * @returns {number} Section size
   */
  size() {
    return this.bytes.length;
  }

  /**
   * Serializes the section to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      startAddress: this.startAddress,
      endAddress: this.endAddress,
      size: this.size(),
      bytes: Array.from(this.bytes)
    };
  }
}

/**
 * Represents the complete disassembly of a binary file
 */
export class BinaryDisassembly {
  /**
   * Creates a new binary disassembly result
   * @param {Z80Instruction[]} instructions - Disassembled instructions
   * @param {BinarySection[]} sections - Binary sections
   * @param {Map<string, number>} symbols - Symbol map
   * @param {number} baseAddress - Starting address
   * @param {number} totalSize - Total byte count
   * @param {boolean} verbose - Whether verbose output is enabled
   */
  constructor(instructions = [], sections = [], symbols = new Map(), baseAddress = 0x0000, totalSize = 0, verbose = false) {
    this.instructions = instructions;
    this.sections = sections;
    this.symbols = symbols;
    this.baseAddress = baseAddress;
    this.totalSize = totalSize;
    this.verbose = verbose;
  }

  /**
   * Serializes the disassembly to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      baseAddress: this.baseAddress,
      totalSize: this.totalSize,
      verbose: this.verbose,
      instructions: this.instructions.map(i => i.toJSON()),
      sections: this.sections.map(s => s.toJSON()),
      symbols: Array.from(this.symbols.entries())
    };
  }

  /**
   * Returns formatted assembly output as a string
   * @returns {string} Formatted assembly text
   */
  toString() {
    const lines = [];
    lines.push('; Binary Disassembly');
    lines.push(`; Base Address: $${this.baseAddress.toString(16).padStart(4, '0')}`);
    lines.push(`; Total Size: ${this.totalSize} bytes`);
    lines.push('');

    if (this.sections.length > 0) {
      for (const section of this.sections) {
        lines.push(`; === ${section.name} ($${section.startAddress.toString(16).padStart(4, '0')} - $${section.endAddress.toString(16).padStart(4, '0')}) ===`);
      }
      lines.push('');
    }

    for (const instruction of this.instructions) {
      lines.push(this.formatInstructionLine(instruction));
    }

    if (this.symbols.size > 0) {
      lines.push('');
      lines.push('; Symbols:');
      for (const [name, addr] of this.symbols) {
        lines.push(`; ${name}: $${addr.toString(16).padStart(4, '0')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Formats a single instruction as an output line
   * @param {Z80Instruction} instruction - The instruction to format
   * @returns {string} Formatted line
   */
  formatInstructionLine(instruction) {
    const addr = `$${instruction.address.toString(16).padStart(4, '0')}`;
    const hexBytes = instruction.bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const operands = instruction.operands.length > 0 ? ` ${instruction.operands.join(', ')}` : '';
    const symbol = resolveSymbolForAddress(instruction.address, this.symbols);

    if (this.verbose) {
      return `${addr}: ${hexBytes.padEnd(16)} ${instruction.mnemonic}${operands}`;
    }

    if (symbol) {
      return `${addr}: ${symbol}: ${instruction.mnemonic}${operands}`;
    }

    return `${addr}: ${instruction.mnemonic}${operands}`;
  }
}

/**
 * Attempts to resolve a symbol name for an address
 * @param {number} address - The address to resolve
 * @param {Map<string, number>} symbols - Symbol map
 * @returns {string|null} The symbol name or null
 */
function resolveSymbolForAddress(address, symbols) {
  for (const [name, addr] of symbols) {
    if (addr === address) return name;
  }
  return null;
}

/**
 * Binary Disassembler class for disassembling flat binary files
 */
export class BinaryDisassembler {
  /**
   * Creates a new binary disassembler
   * @param {Uint8Array} bytes - Binary data to disassemble
   * @param {Object} options - Disassembler options
   * @param {number} options.baseAddress - Memory address where binary starts (default 0x0000)
   * @param {Map<string, number>} options.symbols - Symbol name to address mapping
   * @param {boolean} options.verbose - Include extra annotations (default false)
   * @param {Array<{name: string, start: number, end: number}>} options.sectionBreaks - Section boundaries
   */
  constructor(bytes, options = {}) {
    this.bytes = bytes;
    this.baseAddress = options.baseAddress ?? 0x0000;
    this.symbols = options.symbols ?? new Map();
    this.verbose = options.verbose ?? false;
    this.sectionBreaks = options.sectionBreaks ?? [];
  }

  /**
   * Disassembles all bytes starting from baseAddress
   * @returns {BinaryDisassembly} Complete disassembly result
   */
  disassemble() {
    const instructions = this.disassembleRange(this.baseAddress, this.baseAddress + this.bytes.length);
    const sections = this.buildSections();
    return new BinaryDisassembly(instructions, sections, this.symbols, this.baseAddress, this.bytes.length, this.verbose);
  }

  /**
   * Disassembles a specific address range
   * @param {number} start - Start address
   * @param {number} end - End address
   * @returns {Z80Instruction[]} Disassembled instructions in the range
   */
  disassembleRange(start, end) {
    const z80Disassembler = new Z80Disassembler(this.bytes, {
      baseAddress: this.baseAddress,
      symbols: this.symbols
    });
    return z80Disassembler.disassembleRange(start, end);
  }

  /**
   * Disassembles a single instruction at an address
   * @param {number} address - The address to disassemble
   * @returns {Z80Instruction|null} The disassembled instruction or null
   */
  disassembleAt(address) {
    const z80Disassembler = new Z80Disassembler(this.bytes, {
      baseAddress: this.baseAddress,
      symbols: this.symbols
    });
    return z80Disassembler.disassembleAt(address);
  }

  /**
   * Builds BinarySection objects from sectionBreaks configuration
   * @returns {BinarySection[]} Array of sections
   */
  buildSections() {
    const sections = [];
    for (const { name, start, end } of this.sectionBreaks) {
      const startOffset = start - this.baseAddress;
      const endOffset = end - this.baseAddress;
      if (startOffset >= 0 && endOffset <= this.bytes.length && startOffset < endOffset) {
        const sectionBytes = this.bytes.slice(startOffset, endOffset);
        sections.push(new BinarySection(name, start, end, sectionBytes));
      }
    }
    return sections;
  }

  /**
   * Builds a symbol map for address resolution
   * @returns {Map<string, number>} Symbol name to address mapping
   */
  buildSymbolMap() {
    return this.symbols;
  }

  /**
   * Attempts to resolve a symbol name for an address
   * @param {number} address - The address to resolve
   * @returns {string|null} The symbol name or null
   */
  resolveAddress(address) {
    return resolveSymbolForAddress(address, this.symbols);
  }

  /**
   * Formats a single instruction with address, mnemonic, and symbol resolution
   * @param {Z80Instruction} instruction - The instruction to format
   * @param {number} address - The instruction address
   * @returns {string} Formatted line
   */
  formatInstruction(instruction, address) {
    const addr = `$${address.toString(16).padStart(4, '0')}`;
    const symbol = this.resolveAddress(address);
    const operands = instruction.operands.length > 0 ? ` ${instruction.operands.join(', ')}` : '';

    if (symbol) {
      return `${addr}: ${symbol}: ${instruction.mnemonic}${operands}`;
    }

    return `${addr}: ${instruction.mnemonic}${operands}`;
  }

  /**
   * Returns complete formatted assembly with section headers
   * @returns {string} Formatted assembly output
   */
  formatOutput() {
    const disassembly = this.disassemble();
    return disassembly.toString();
  }
}

/**
 * Convenience function to disassemble binary data
 * @param {Uint8Array|number[]} bytes - Binary data
 * @param {Object} options - Disassembler options
 * @param {number} options.baseAddress - Base address (default 0x0000)
 * @param {Map<string, number>} options.symbols - Symbol table
 * @param {boolean} options.verbose - Verbose output (default false)
 * @param {Array<{name: string, start: number, end: number}>} options.sectionBreaks - Section boundaries
 * @returns {BinaryDisassembly} Disassembly result
 */
export function disassembleBinary(bytes, options = {}) {
  const binaryDisassembler = new BinaryDisassembler(Array.from(bytes), options);
  return binaryDisassembler.disassemble();
}

/**
 * Reads a binary file from disk and disassembles it
 * @param {string} filePath - Path to the binary file
 * @param {Object} options - Disassembler options
 * @param {number} options.baseAddress - Base address (default 0x0000)
 * @param {Map<string, number>} options.symbols - Symbol table
 * @param {boolean} options.verbose - Verbose output (default false)
 * @param {Array<{name: string, start: number, end: number}>} options.sectionBreaks - Section boundaries
 * @returns {BinaryDisassembly} Disassembly result
 */
export function disassembleBinaryFromFile(filePath, options = {}) {
  const data = readFileSync(filePath);
  const bytes = new Uint8Array(data);
  const binaryDisassembler = new BinaryDisassembler(bytes, options);
  return binaryDisassembler.disassemble();
}

/**
 * Converts a Uint8Array to a hex string representation
 * @param {Uint8Array} bytes - Binary data
 * @returns {string} Hex string representation
 */
export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}
