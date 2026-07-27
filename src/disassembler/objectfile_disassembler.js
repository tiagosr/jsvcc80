/**
 * Object file disassembler - disassembles VCC80 .o files into annotated Z80 assembly
 */

import { Z80Disassembler } from './z80disassembler.js';

/**
 * Disassembles a VCC80 object file into annotated Z80 assembly
 * @param {import('../linker/objectfile.js').ObjectFile} objectFile - The object file to disassemble
 * @param {Object} options - Disassembly options
 * @param {number} options.baseAddress - Base address for section placement (default 0x0000)
 * @param {boolean} options.verbose - Include verbose annotations (default false)
 * @returns {ObjectFileDisassembly} Disassembly result
 */
export function disassembleObjectFile(objectFile, options = {}) {
  const disassembler = new ObjectFileDisassembler(objectFile, options);
  return disassembler.disassemble();
}

/**
 * Disassembles a single object section into a SectionDisassembly
 * @param {import('../linker/objectfile.js').ObjectSection} section - The section to disassemble
 * @param {number} baseAddress - Address where this section is placed
 * @param {boolean} verbose - Include verbose annotations
 * @param {Map<string, number>} symbolMap - Symbol name to address map
 * @returns {SectionDisassembly} Disassembled section
 */
function disassembleSection(section, baseAddress, verbose, symbolMap) {
  const sectionDisassembly = new SectionDisassembly(section.name, section.type, baseAddress);

  if (section.type === 'code') {
    const disassembler = new Z80Disassembler(section.contents, { baseAddress, symbols: symbolMap });
    sectionDisassembly.instructions = disassembler.disassemble();
  } else {
    sectionDisassembly.dataBytes = section.contents;
  }

  sectionDisassembly.relocations = section.relocations;
  return sectionDisassembly;
}

/**
 * Creates a Map from symbol name to absolute address for symbol resolution
 * @param {import('../linker/objectfile.js').ObjectFile} objectFile - The object file
 * @param {Map<string, number>} sectionBaseAddresses - Section name to base address map
 * @returns {Map<string, number>} Symbol name to address map
 */
function buildSymbolMap(objectFile, sectionBaseAddresses) {
  const symbolMap = new Map();

  for (const symbol of objectFile.symbols) {
    if (symbol.section) {
      const sectionBase = sectionBaseAddresses.get(symbol.section);
      if (sectionBase !== undefined) {
        symbolMap.set(symbol.name, sectionBase + symbol.value);
      }
    } else {
      symbolMap.set(symbol.name, symbol.value);
    }
  }

  return symbolMap;
}

/**
 * Returns a comment header for a section
 * @param {string} sectionName - Section name
 * @param {string} sectionType - Section type
 * @param {number} baseAddress - Base address
 * @returns {string} Formatted header comment
 */
function formatSectionHeader(sectionName, sectionType, baseAddress) {
  return `; Section: ${sectionName} (${sectionType}) at $${baseAddress.toString(16).padStart(4, '0')}`;
}

/**
 * Returns a formatted line for a disassembled instruction with address and symbol annotations
 * @param {Z80Instruction} instruction - The disassembled instruction
 * @param {number} baseAddress - Base address of the section
 * @param {Map<string, number>} symbolMap - Symbol name to address map
 * @param {boolean} verbose - Include verbose annotations
 * @param {import('../linker/objectfile.js').ObjectRelocation[]} relocations - Relocations for this section
 * @returns {string} Formatted instruction line
 */
function formatInstruction(instruction, baseAddress, symbolMap, verbose, relocations) {
  const addr = `$${instruction.address.toString(16).padStart(4, '0')}`;
  const operands = instruction.operands.length > 0 ? ` ${instruction.operands.join(', ')}` : '';
  const resolvedSymbol = symbolMap.get(instruction.address);

  let line = '';

  if (resolvedSymbol) {
    line = `${addr}: ${resolvedSymbol}:`;
  }

  line += `${addr}: ${instruction.mnemonic}${operands}`;

  if (verbose) {
    const sectionOffset = instruction.address - baseAddress;
    const reloc = relocations.find(r => r.offset === sectionOffset);
    if (reloc) {
      line += ` ; relocation: ${reloc.symbolName} (${reloc.type})`;
    }
  }

  return line;
}

/**
 * Returns formatted .db/.ds directives for data sections
 * @param {string} sectionName - Section name
 * @param {string} sectionType - Section type
 * @param {number} baseAddress - Base address
 * @param {Uint8Array} dataBytes - Raw data bytes
 * @param {Map<string, number>} symbolMap - Symbol name to address map
 * @returns {string} Formatted data section output
 */
function formatDataSection(sectionName, sectionType, baseAddress, dataBytes, symbolMap) {
  const lines = [];
  const resolvedSymbol = symbolMap.get(baseAddress);
  const symbolPrefix = resolvedSymbol ? `${resolvedSymbol}: ` : '';

  lines.push(formatSectionHeader(sectionName, sectionType, baseAddress));

  if (sectionType === 'bss') {
    lines.push(`${symbolPrefix}.ds ${dataBytes.length}`);
  } else {
    const bytesPerLine = 16;
    for (let i = 0; i < dataBytes.length; i += bytesPerLine) {
      const chunk = dataBytes.slice(i, i + bytesPerLine);
      const byteStrs = Array.from(chunk).map(b => `$${b.toString(16).padStart(2, '0')}`);
      const addr = `$${(baseAddress + i).toString(16).padStart(4, '0')}`;

      if (chunk.length === 1) {
        lines.push(`${addr}: ${symbolPrefix}.db ${byteStrs[0]}`);
      } else {
        lines.push(`${addr}: ${symbolPrefix}.db ${byteStrs.join(', ')}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Represents a disassembled section from an object file
 */
export class SectionDisassembly {
  /**
   * Creates a section disassembly
   * @param {string} name - Section name
   * @param {string} type - Section type (code, data, bss, rodata)
   * @param {number} baseAddress - Address where this section is placed
   */
  constructor(name, type, baseAddress) {
    this.name = name;
    this.type = type;
    this.baseAddress = baseAddress;
    this.instructions = [];
    this.dataBytes = new Uint8Array(0);
    this.relocations = [];
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      baseAddress: this.baseAddress,
      instructions: this.instructions.map(i => i.toJSON()),
      dataBytes: Array.from(this.dataBytes),
      relocations: this.relocations.map(r => r.toJSON())
    };
  }

  /**
   * Returns formatted assembly output for this section
   * @param {Map<string, number>} symbolMap - Symbol name to address map
   * @param {boolean} verbose - Include verbose annotations
   * @returns {string} Formatted section output
   */
  toString(symbolMap = new Map(), verbose = false) {
    if (this.type === 'code') {
      const lines = [formatSectionHeader(this.name, this.type, this.baseAddress)];
      for (const instruction of this.instructions) {
        lines.push(formatInstruction(instruction, this.baseAddress, symbolMap, verbose, this.relocations));
      }
      return lines.join('\n');
    }

    return formatDataSection(this.name, this.type, this.baseAddress, this.dataBytes, symbolMap);
  }
}

/**
 * Represents a complete disassembly of an object file
 */
export class ObjectFileDisassembly {
  /**
   * Creates an object file disassembly
   * @param {string} objectFileName - Name of the object file
   */
  constructor(objectFileName) {
    this.objectFileName = objectFileName;
    this.sections = new Map();
    this.symbols = [];
    this.relocations = [];
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      objectFileName: this.objectFileName,
      sections: Object.fromEntries(
        Array.from(this.sections.entries()).map(([name, section]) => [name, section.toJSON()])
      ),
      symbols: this.symbols.map(s => s.toJSON()),
      relocations: this.relocations.map(r => r.toJSON())
    };
  }

  /**
   * Returns formatted assembly output for the entire object file
   * @param {boolean} verbose - Include verbose annotations
   * @returns {string} Formatted output
   */
  toString(verbose = false) {
    const lines = [`; Object File: ${this.objectFileName}`, `; =====================`];

    for (const [sectionName, sectionDisassembly] of this.sections) {
      lines.push('');
      lines.push(sectionDisassembly.toString(this._symbolMap, verbose));
    }

    if (this.relocations.length > 0) {
      lines.push('');
      lines.push('; Relocations:');
      for (const reloc of this.relocations) {
        const resolved = this._symbolMap.has(reloc.symbolName);
        lines.push(`; ${reloc.section} offset $${reloc.offset.toString(16).padStart(4, '0')}: ${reloc.symbolName} (${reloc.type}) → ${resolved ? 'resolved' : 'unresolved'}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Lazily builds the symbol map for this disassembly
   * @returns {Map<string, number>} Symbol name to address map
   */
  get _symbolMap() {
    if (!this._cachedSymbolMap) {
      this._cachedSymbolMap = buildSymbolMapFromSections(this.sections);
    }
    return this._cachedSymbolMap;
  }

  /**
   * Clears the cached symbol map
   */
  clearSymbolMap() {
    this._cachedSymbolMap = null;
  }
}

/**
 * Builds a symbol map from section disassemblies
 * @param {Map<string, SectionDisassembly>} sections - Section disassemblies
 * @returns {Map<string, number>} Symbol name to address map
 */
function buildSymbolMapFromSections(sections) {
  const symbolMap = new Map();
  for (const [, section] of sections) {
    symbolMap.set(section.name, section.baseAddress);
  }
  return symbolMap;
}

/**
 * Disassembler for VCC80 object files
 */
export class ObjectFileDisassembler {
  /**
   * Creates an object file disassembler
   * @param {import('../linker/objectfile.js').ObjectFile} objectFile - The object file to disassemble
   * @param {Object} options - Disassembly options
   * @param {number} options.baseAddress - Base address for section placement (default 0x0000)
   * @param {boolean} options.verbose - Include verbose annotations (default false)
   */
  constructor(objectFile, options = {}) {
    this.objectFile = objectFile;
    this.baseAddress = options.baseAddress ?? 0x0000;
    this.verbose = options.verbose ?? false;
  }

  /**
   * Disassembles the entire object file
   * @returns {ObjectFileDisassembly} Complete disassembly result
   */
  disassemble() {
    return this.disassembleAll();
  }

  /**
   * Disassembles a specific section by name
   * @param {string} sectionName - Name of the section to disassemble
   * @returns {SectionDisassembly} Disassembled section
   */
  disassembleSection(sectionName) {
    const section = this.objectFile.getSection(sectionName);
    if (!section) {
      throw new Error(`Section '${sectionName}' not found in object file`);
    }

    const sectionBaseAddress = this.baseAddress;
    const symbolMap = buildSymbolMap(this.objectFile, new Map([[sectionName, sectionBaseAddress]]));
    return disassembleSection(section, sectionBaseAddress, this.verbose, symbolMap);
  }

  /**
   * Disassembles all sections in the object file
   * @returns {ObjectFileDisassembly} Complete disassembly result
   */
  disassembleAll() {
    const disassembly = new ObjectFileDisassembly(this.objectFile.name);
    disassembly.symbols = this.objectFile.symbols;
    disassembly.relocations = this.objectFile.relocations;

    let currentAddress = this.baseAddress;

    for (const section of this.objectFile.sections) {
      const sectionDisassembly = disassembleSection(section, currentAddress, this.verbose, new Map());
      disassembly.sections.set(section.name, sectionDisassembly);
      currentAddress += section.size();
    }

    return disassembly;
  }
}
