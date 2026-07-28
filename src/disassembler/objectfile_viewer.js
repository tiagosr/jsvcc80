/**
 * Object file viewer - objdump-like viewer for VCC80 .o files
 * Produces comprehensive formatted output with file headers, section tables,
 * disassembly with hex bytes, hex dumps, symbol tables, and relocation tables.
 */

import { Z80Disassembler } from './z80disassembler.js';
import {
  ObjectFile,
  ObjectSection,
  ObjectSymbol,
  ObjectRelocation
} from '../linker/objectfile.js';

/**
 * Formats a number as hex string with specified width
 * @param {number} value - Number to format
 * @param {number} width - Hex string width (default 4)
 * @returns {string} Formatted hex string with $ prefix
 */
function formatHex(value, width = 4) {
  return `$${value.toString(16).padStart(width, '0')}`;
}

/**
 * Formats a number as hex string with 2-digit width (no $ prefix for individual bytes)
 * @param {number} value - Number to format
 * @returns {string} Formatted 2-digit hex string
 */
function formatHex2(value) {
  return value.toString(16).padStart(2, '0');
}

/**
 * Builds a symbol name to address map from object file and section bases
 * @param {ObjectFile} objectFile - The object file
 * @param {Map<string, number>} sectionBases - Section name to base address
 * @returns {Map<string, number>} Symbol name to address map
 */
function buildSymbolMap(objectFile, sectionBases) {
  const map = new Map();
  for (const symbol of objectFile.symbols) {
    if (symbol.section) {
      const base = sectionBases.get(symbol.section);
      if (base !== undefined) {
        map.set(symbol.name, base + symbol.value);
      }
    } else {
      map.set(symbol.name, symbol.value);
    }
  }
  return map;
}

/**
 * Formats code section disassembly with hex bytes alongside assembly
 * @param {ObjectSection} section - The code section
 * @param {number} baseAddress - Section base address
 * @param {Map<string, number>} symbolMap - Symbol name to address map
 * @returns {string[]} Formatted lines
 */
function formatCodeSection(section, baseAddress, symbolMap) {
  const lines = [];
  const disassembler = new Z80Disassembler(section.contents, { baseAddress, symbols: symbolMap });
  const instructions = disassembler.disassemble();

  const resolvedSymbol = symbolMap.get(baseAddress);
  if (resolvedSymbol) {
    lines.push(`; ${formatHex(baseAddress)}: ${resolvedSymbol}:`);
  }

  for (const inst of instructions) {
    const addr = formatHex(inst.address);
    const hexBytes = inst.bytes.map(b => formatHex2(b)).join(' ');
    const operands = inst.operands.length > 0 ? ` ${inst.operands.join(', ')}` : '';
    lines.push(`${addr}: ${hexBytes} ${inst.mnemonic}${operands}`);
  }

  return lines;
}

/**
 * Formats data section as hex dump with ASCII representation
 * @param {ObjectSection} section - The data section
 * @param {number} baseAddress - Section base address
 * @param {Map<string, number>} symbolMap - Symbol name to address map
 * @returns {string[]} Formatted lines
 */
function formatDataSection(section, baseAddress, symbolMap) {
  const lines = [];
  const resolvedSymbol = symbolMap.get(baseAddress);
  const symbolPrefix = resolvedSymbol ? `${resolvedSymbol}: ` : '';

  if (section.type === 'bss') {
    lines.push(`; ${formatHex(baseAddress)}: .ds ${section.contents.length}`);
    return lines;
  }

  const bytesPerLine = 16;
  for (let i = 0; i < section.contents.length; i += bytesPerLine) {
    const chunk = section.contents.slice(i, i + bytesPerLine);
    const addr = formatHex(baseAddress + i);
    const hexBytes = Array.from(chunk).map(b => formatHex2(b)).join(' ');
    const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
    lines.push(`${addr}: ${hexBytes} ; '${ascii}'`);
  }

  return lines;
}

/**
 * Formats section headers table
 * @param {ObjectFile} objectFile - The object file
 * @param {Map<string, number>} sectionBases - Section name to base address (only includes sections to show)
 * @returns {string} Formatted table
 */
function formatSectionHeaders(objectFile, sectionBases) {
  const lines = [];
  lines.push('; Section headers:');

  const nameWidth = 20;
  const typeWidth = 8;
  const sizeWidth = 8;
  const addrWidth = 8;

  const header = `; ${padRight('Name', nameWidth)} ${padRight('Type', typeWidth)} ${padRight('Size', sizeWidth)} ${padRight('Address', addrWidth)}`;
  lines.push(header);

  for (const section of objectFile.sections) {
    if (!sectionBases.has(section.name)) continue;
    const base = sectionBases.get(section.name);
    const name = padRight(section.name, nameWidth);
    const type = padRight(section.type, typeWidth);
    const size = padRight(formatHex2(section.contents.length), sizeWidth);
    const addr = formatHex(base);
    lines.push(`; ${name} ${type} ${size} ${addr}`);
  }

  return lines.join('\n');
}

/**
 * Pads a string to the right with spaces
 * @param {string} str - String to pad
 * @param {number} width - Target width
 * @returns {string} Padded string
 */
function padRight(str, width) {
  return str.padEnd(width);
}

/**
 * Formats the symbol table
 * @param {ObjectFile} objectFile - The object file
 * @param {Map<string, number>} sectionBases - Section name to base address
 * @returns {string} Formatted table
 */
function formatSymbolTable(objectFile, sectionBases) {
  const lines = [];
  lines.push('; Symbol table:');

  const valueWidth = 8;
  const sizeWidth = 8;
  const typeWidth = 12;
  const visWidth = 12;
  const nameWidth = 20;

  const header = `; ${padRight('Value', valueWidth)} ${padRight('Size', sizeWidth)} ${padRight('Type', typeWidth)} ${padRight('Visibility', visWidth)} ${padRight('Name', nameWidth)}`;
  lines.push(header);

  for (const symbol of objectFile.symbols) {
    const base = symbol.section ? (sectionBases.get(symbol.section) ?? 0) : 0;
    const value = formatHex(base + symbol.value);
    const size = formatHex2(symbol.size);
    const type = padRight(symbol.type, typeWidth);
    const vis = padRight(symbol.visibility, visWidth);
    const name = padRight(symbol.name, nameWidth);
    lines.push(`; ${value} ${size} ${type} ${vis} ${name}`);
  }

  return lines.join('\n');
}

/**
 * Formats the relocation table
 * @param {ObjectFile} objectFile - The object file
 * @returns {string} Formatted table
 */
function formatRelocationTable(objectFile) {
  const lines = [];
  lines.push('; Relocations:');

  const sectionWidth = 16;
  const offsetWidth = 8;
  const symbolWidth = 16;
  const typeWidth = 8;

  const header = `; ${padRight('Section', sectionWidth)} ${padRight('Offset', offsetWidth)} ${padRight('Symbol', symbolWidth)} ${padRight('Type', typeWidth)}`;
  lines.push(header);

  for (const reloc of objectFile.relocations) {
    const section = padRight(reloc.section, sectionWidth);
    const offset = formatHex(reloc.offset, 4);
    const symbol = padRight(reloc.symbolName, symbolWidth);
    const type = padRight(reloc.type, typeWidth);
    lines.push(`; ${section} ${offset} ${symbol} ${type}`);
  }

  return lines.join('\n');
}

/**
 * Represents a complete view of an object file in objdump format
 */
export class ObjectFileView {
  /**
   * Creates an object file view
   * @param {string} fileName - Object file name
   * @param {string} format - Format identifier
   * @param {string} architecture - Target architecture
   * @param {string} sectionHeaders - Formatted section header table
   * @param {Map<string, SectionView>} sections - Section views by name
   * @param {ObjectSymbol[]} symbols - Symbol table entries
   * @param {ObjectRelocation[]} relocations - Relocation table entries
   */
  constructor(fileName, format, architecture, sectionHeaders, sections, symbols, relocations) {
    this.fileName = fileName;
    this.format = format;
    this.architecture = architecture;
    this.sectionHeaders = sectionHeaders;
    this.sections = sections;
    this.symbols = symbols;
    this.relocations = relocations;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      fileName: this.fileName,
      format: this.format,
      architecture: this.architecture,
      sectionHeaders: this.sectionHeaders,
      sections: Object.fromEntries(
        Array.from(this.sections.entries()).map(([name, section]) => [name, section.toJSON()])
      ),
      symbols: this.symbols.map(s => s.toJSON()),
      relocations: this.relocations.map(r => r.toJSON())
    };
  }

  /**
   * Returns formatted objdump-like output
   * @returns {string} Formatted output
   */
  toString() {
    const lines = [];

    lines.push(`; Object file: ${this.fileName}`);
    lines.push(`; Format: ${this.format}`);
    lines.push(`; Architecture: ${this.architecture}`);
    lines.push('');

    lines.push(this.sectionHeaders);
    lines.push('');

    for (const [name, sectionView] of this.sections) {
      lines.push(`; Disassembly of section ${name}:`);
      lines.push('');
      lines.push(sectionView.toString());
      lines.push('');
    }

    if (this.symbols.length > 0) {
      lines.push(formatSymbolTableFromView(this.symbols));
      lines.push('');
    }

    if (this.relocations.length > 0) {
      lines.push(formatRelocationTableFromView(this.relocations));
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Formats symbol table from view symbols array
 * @param {ObjectSymbol[]} symbols - Symbol entries
 * @returns {string} Formatted table
 */
function formatSymbolTableFromView(symbols) {
  const lines = [];
  lines.push('; Symbol table:');

  const valueWidth = 8;
  const sizeWidth = 8;
  const typeWidth = 12;
  const visWidth = 12;
  const nameWidth = 20;

  const header = `; ${padRight('Value', valueWidth)} ${padRight('Size', sizeWidth)} ${padRight('Type', typeWidth)} ${padRight('Visibility', visWidth)} ${padRight('Name', nameWidth)}`;
  lines.push(header);

  for (const symbol of symbols) {
    const value = formatHex(symbol.value);
    const size = formatHex2(symbol.size);
    const type = padRight(symbol.type, typeWidth);
    const vis = padRight(symbol.visibility, visWidth);
    const name = padRight(symbol.name, nameWidth);
    lines.push(`; ${value} ${size} ${type} ${vis} ${name}`);
  }

  return lines.join('\n');
}

/**
 * Formats relocation table from view relocations array
 * @param {ObjectRelocation[]} relocations - Relocation entries
 * @returns {string} Formatted table
 */
function formatRelocationTableFromView(relocations) {
  const lines = [];
  lines.push('; Relocations:');

  const sectionWidth = 16;
  const offsetWidth = 8;
  const symbolWidth = 16;
  const typeWidth = 8;

  const header = `; ${padRight('Section', sectionWidth)} ${padRight('Offset', offsetWidth)} ${padRight('Symbol', symbolWidth)} ${padRight('Type', typeWidth)}`;
  lines.push(header);

  for (const reloc of relocations) {
    const section = padRight(reloc.section, sectionWidth);
    const offset = formatHex(reloc.offset, 4);
    const symbol = padRight(reloc.symbolName, symbolWidth);
    const type = padRight(reloc.type, typeWidth);
    lines.push(`; ${section} ${offset} ${symbol} ${type}`);
  }

  return lines.join('\n');
}

/**
 * Represents a view of a single section
 */
export class SectionView {
  /**
   * Creates a section view
   * @param {string} name - Section name
   * @param {string} type - Section type
   * @param {number} baseAddress - Base address
   * @param {Uint8Array} dataBytes - Raw data bytes
   * @param {Z80Instruction[]} instructions - Disassembled instructions (for code sections)
   * @param {string[]} hexDumpLines - Hex dump lines (for data sections)
   */
  constructor(name, type, baseAddress, dataBytes, instructions, hexDumpLines) {
    this.name = name;
    this.type = type;
    this.baseAddress = baseAddress;
    this.dataBytes = dataBytes;
    this.instructions = instructions;
    this.hexDumpLines = hexDumpLines;
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
      dataBytes: Array.from(this.dataBytes),
      instructions: this.instructions.map(i => i.toJSON()),
      hexDumpLines: this.hexDumpLines
    };
  }

  /**
   * Returns formatted output for this section
   * @returns {string} Formatted section output
   */
  toString() {
    if (this.type === 'code') {
      return this.hexDumpLines.join('\n');
    }

    if (this.type === 'bss') {
      return this.hexDumpLines.join('\n');
    }

    return this.hexDumpLines.join('\n');
  }
}

/**
 * Viewer for VCC80 object files producing objdump-like output
 */
export class ObjectFileViewer {
  /**
   * Creates an object file viewer
   * @param {ObjectFile} objectFile - The object file to view
   * @param {Object} options - Viewer options
   * @param {number} options.baseAddress - Base address for section placement (default 0x8000)
   * @param {boolean} options.verbose - Include verbose annotations (default false)
   * @param {string[]|null} options.sections - Section names to show, or null for all
   */
  constructor(objectFile, options = {}) {
    this.objectFile = objectFile;
    this.baseAddress = options.baseAddress ?? 0x8000;
    this.verbose = options.verbose ?? false;
    this.sections = options.sections ?? null;
  }

  /**
   * Views the entire object file
   * @returns {ObjectFileView} Complete object file view
   */
  view() {
    return this.viewAll();
  }

  /**
   * Views a single section by name
   * @param {string} sectionName - Section name to view
   * @returns {SectionView} Single section view
   */
  viewSection(sectionName) {
    const section = this.objectFile.getSection(sectionName);
    if (!section) {
      throw new Error(`Section '${sectionName}' not found in object file`);
    }

    const sectionBases = new Map([[sectionName, this.baseAddress]]);
    const symbolMap = buildSymbolMap(this.objectFile, sectionBases);
    return this.createSectionView(section, this.baseAddress, symbolMap);
  }

  /**
   * Views all sections in the object file
   * @returns {ObjectFileView} Complete object file view
   */
  viewAll() {
    const sectionBases = new Map();
    let currentAddress = this.baseAddress;

    for (const section of this.objectFile.sections) {
      if (this.sections && !this.sections.includes(section.name)) continue;
      sectionBases.set(section.name, currentAddress);
      currentAddress += section.size();
    }

    const symbolMap = buildSymbolMap(this.objectFile, sectionBases);

    const sectionHeaders = formatSectionHeaders(this.objectFile, sectionBases);

    const sections = new Map();
    for (const section of this.objectFile.sections) {
      if (this.sections && !this.sections.includes(section.name)) continue;
      const base = sectionBases.get(section.name);
      if (base === undefined) continue;
      sections.set(section.name, this.createSectionView(section, base, symbolMap));
    }

    return new ObjectFileView(
      this.objectFile.name,
      'VCC80O',
      'Z80',
      sectionHeaders,
      sections,
      this.objectFile.symbols,
      this.objectFile.relocations
    );
  }

  /**
   * Creates a SectionView for a given section
   * @param {ObjectSection} section - The section to view
   * @param {number} baseAddress - Base address
   * @param {Map<string, number>} symbolMap - Symbol name to address map
   * @returns {SectionView} Section view
   */
  createSectionView(section, baseAddress, symbolMap) {
    if (section.type === 'code') {
      const lines = formatCodeSection(section, baseAddress, symbolMap);
      const instructions = new Z80Disassembler(section.contents, { baseAddress, symbols: symbolMap }).disassemble();
      return new SectionView(section.name, section.type, baseAddress, section.contents, instructions, lines);
    }

    const lines = formatDataSection(section, baseAddress, symbolMap);
    return new SectionView(section.name, section.type, baseAddress, section.contents, [], lines);
  }
}

/**
 * Convenience function to view an object file
 * @param {ObjectFile} objectFile - The object file to view
 * @param {Object} options - Viewer options
 * @param {number} options.baseAddress - Base address (default 0x8000)
 * @param {boolean} options.verbose - Verbose mode (default false)
 * @param {string[]|null} options.sections - Sections to show (default null)
 * @returns {ObjectFileView} Object file view
 */
export function viewObjectFile(objectFile, options = {}) {
  const viewer = new ObjectFileViewer(objectFile, options);
  return viewer.view();
}
