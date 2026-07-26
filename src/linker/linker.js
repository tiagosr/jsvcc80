/**
 * Linker - combines object files into a single output
 */
import { ObjectFile, ObjectSection, ObjectSymbol, SymbolType, SymbolVisibility, SectionType } from './objectfile.js';
import { WlaDxCodegen } from './wladxcodegen.js';
import { createCrt0, resolveCrt0Relocations } from './crt0.js';
import { createLinkMapFromLinker } from './mapfile.js';

/**
 * Linker options and configuration
 */
export class LinkerOptions {
  /**
   * Creates linker options with defaults
   * @param {Object} [options] - Override options
   * @param {string[]} [options.inputFiles] - Input files for link map
   */
   constructor(options = {}) {
     this.entryPoint = options.entryPoint || 'main';
     this.outputFormat = options.outputFormat || 'wladx';
     this.baseAddress = options.baseAddress || 0x8000;
     this.dataAddress = options.dataAddress || 0xC000;
     this.bssAddress = options.bssAddress || 0xD000;
     this.rodataAddress = options.rodataAddress || 0x10000;
     this.resolveExternals = !!options.resolveExternals;
     this.verbose = !!options.verbose;
     this.enableCrt0 = options.enableCrt0 !== false;
     this.stackTop = options.stackTop ?? 0xFFFF;
     this.inputFiles = options.inputFiles || [];
   }
}

/**
 * Represents a resolved symbol with final address
 */
export class ResolvedSymbol {
  /**
   * Creates a resolved symbol
   * @param {string} name - Symbol name
   * @param {string} type - Symbol type
   * @param {number} address - Final memory address
   * @param {string} section - Section name
   * @param {string} sourceFile - Source file name
   */
  constructor(name, type, address, section, sourceFile) {
    this.name = name;
    this.type = type;
    this.address = address;
    this.section = section;
    this.sourceFile = sourceFile;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      address: this.address,
      section: this.section,
      sourceFile: this.sourceFile
    };
  }
}

/**
 * Represents a linked section with final address
 */
export class LinkedSection {
  /**
   * Creates a linked section
   * @param {string} name - Section name
   * @param {string} type - Section type
   * @param {number} baseAddress - Base memory address
   * @param {Uint8Array} contents - Final byte contents
   */
  constructor(name, type, baseAddress, contents) {
    this.name = name;
    this.type = type;
    this.baseAddress = baseAddress;
    this.contents = contents;
  }

  /**
   * Returns the end address (exclusive) of this section
   * @returns {number} End address
   */
  endAddress() {
    return this.baseAddress + this.contents.length;
  }

  /**
   * Returns the size of the section in bytes
   * @returns {number} Size in bytes
   */
  size() {
    return this.contents.length;
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
      size: this.contents.length
    };
  }
}

/**
 * Result of a link operation
 */
export class LinkResult {
  /**
   * Creates a link result
   * @param {boolean} success - Whether linking succeeded
   * @param {LinkedSection[]} sections - Linked sections
   * @param {ResolvedSymbol[]} symbols - Resolved symbols
   * @param {string[]} warnings - Warning messages
   * @param {string[]} errors - Error messages
   */
  constructor(success, sections, symbols, warnings, errors) {
    this.success = success;
    this.sections = sections;
    this.symbols = symbols;
    this.warnings = warnings;
    this.errors = errors;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      success: this.success,
      sections: this.sections.map(s => s.toJSON()),
      symbols: this.symbols.map(s => s.toJSON()),
      warnings: this.warnings,
      errors: this.errors
    };
  }
}

/**
 * Z80 Linker - combines object files and resolves references
 */
export class Linker {
  /**
   * Creates a new linker instance
   * @param {LinkerOptions} [options] - Linker options
   */
  constructor(options = null) {
    this.options = options || new LinkerOptions();
    this.objectFiles = [];
    this.symbolTable = new Map();
    this.sections = new Map();
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Adds an object file to be linked
   * @param {ObjectFile} objectFile - Object file to add
   */
  addObjectFile(objectFile) {
    this.objectFiles.push(objectFile);
  }

  /**
   * Links all loaded object files
   * @returns {LinkResult} Link result
   */
  link() {
    this.symbolTable = new Map();
    this.sections = new Map();
    this.warnings = [];
    this.errors = [];

    try {
      this.collectSymbols();
      this.collectSections();
      this.resolveCrt0();
      this.resolveRelocations();
      this.buildSymbolTable();

      const linkedSections = [];
      for (const [name, data] of this.sections) {
        linkedSections.push(new LinkedSection(name, data.type, data.address, data.contents));
      }
      const resolvedSymbols = Array.from(this.symbolTable.values());

      return new LinkResult(true, linkedSections, resolvedSymbols, this.warnings, this.errors);
    } catch (error) {
      this.errors.push(error.message);
      return new LinkResult(false, [], [], this.warnings, this.errors);
    }
  }

  /**
   * Collects all symbols from object files
   */
  collectSymbols() {
    for (const objFile of this.objectFiles) {
      for (const symbol of objFile.symbols) {
        if (this.symbolTable.has(symbol.name)) {
          const existing = this.symbolTable.get(symbol.name);
          if (existing.visibility === SymbolVisibility.GLOBAL && symbol.visibility === SymbolVisibility.GLOBAL) {
            this.errors.push(`Duplicate global symbol: ${symbol.name}`);
            continue;
          }
          if (existing.visibility === SymbolVisibility.WEAK) {
            this.symbolTable.set(symbol.name, symbol);
          }
        } else {
          this.symbolTable.set(symbol.name, symbol);
        }
      }
    }
  }

  /**
    * Collects sections from all object files and assigns addresses
    */
  collectSections() {
    let codeAddress = this.options.baseAddress;
    let dataAddress = this.options.dataAddress;
    let bssAddress = this.options.bssAddress;
    let rodataAddress = this.options.rodataAddress;

    if (this.options.enableCrt0) {
      const crt0 = createCrt0({
        stackTop: this.options.stackTop,
        entryPoint: this.options.entryPoint
      });
      const crt0Section = crt0.getSection('.crt0');
      const crt0Size = crt0Section.size();

      this.sections.set('.crt0', {
        type: SectionType.CODE,
        address: codeAddress,
        contents: new Uint8Array(crt0Section.contents),
        relocations: crt0Section.relocations.map(r => ({ ...r })),
        isCrt0: true,
        crt0Object: crt0
      });

      codeAddress += crt0Size;
    }

    for (const objFile of this.objectFiles) {
      for (const section of objFile.sections) {
        let address;
        let size = section.size();

        switch (section.type) {
          case SectionType.CODE:
            address = codeAddress;
            codeAddress += size;
            break;
          case SectionType.DATA:
            address = dataAddress;
            dataAddress += size;
            break;
          case SectionType.BSS:
            address = bssAddress;
            bssAddress += size;
            break;
          case SectionType.RODATA:
            address = rodataAddress;
            rodataAddress += size;
            break;
          default:
            address = codeAddress;
            codeAddress += size;
            break;
        }

        this.sections.set(section.name, {
          type: section.type,
          address: address,
          contents: new Uint8Array(section.contents),
          relocations: section.relocations.map(r => ({ ...r }))
        });
      }
    }
  }

  /**
    * Resolves crt0 relocations with addresses from linked sections
    */
  resolveCrt0() {
    const crt0Data = this.sections.get('.crt0');
    if (!crt0Data || !crt0Data.isCrt0) return;

    const crt0Obj = crt0Data.crt0Object;
    const crt0Address = crt0Data.address;

    const symbolAddresses = new Map();

    const bssSection = this.sections.get('.bss');
    if (bssSection) {
      symbolAddresses.set('_bss_start', bssSection.address);
      symbolAddresses.set('_bss_end', bssSection.endAddress());
      symbolAddresses.set('_bss_size', bssSection.contents.length);
    } else {
      symbolAddresses.set('_bss_start', this.options.bssAddress);
      symbolAddresses.set('_bss_end', this.options.bssAddress);
      symbolAddresses.set('_bss_size', 0);
    }

    const entryPoint = this.options.entryPoint;
    for (const [name, symbol] of this.symbolTable) {
      if (symbol.type === 'function' && name === entryPoint) {
        const section = this.sections.get(symbol.section);
        if (section) {
          symbolAddresses.set(name, section.address + symbol.value);
        }
      }
    }

    resolveCrt0Relocations(crt0Obj, symbolAddresses, crt0Address);

    const codeSection = crt0Obj.getSection('.crt0');
    if (codeSection) {
      crt0Data.contents = new Uint8Array(codeSection.contents);
    }
  }

  /**
    * Resolves relocation entries
    */
  resolveRelocations() {
    for (const [sectionName, sectionData] of this.sections) {
      if (!sectionData.relocations || sectionData.relocations.length === 0) {
        continue;
      }

      for (const reloc of sectionData.relocations) {
        const symbol = this.symbolTable.get(reloc.symbolName);
        if (!symbol) {
          if (this.options.resolveExternals) {
            this.warnings.push(`Unresolved external: ${reloc.symbolName}`);
            continue;
          }
          this.errors.push(`Undefined symbol: ${reloc.symbolName}`);
          continue;
        }

        const symbolAddress = this.getSymbolAddress(symbol);
        this.applyRelocation(sectionData, reloc, symbolAddress);
      }
    }
  }

  /**
   * Gets the final address of a symbol
   * @param {Object} symbol - Symbol to resolve
   * @returns {number} Final address
   */
  getSymbolAddress(symbol) {
    const section = this.sections.get(symbol.section);
    if (!section) {
      return symbol.value;
    }
    return section.address + symbol.value;
  }

  /**
   * Applies a relocation to section data
   * @param {Object} sectionData - Section data
   * @param {Object} reloc - Relocation data
   * @param {number} symbolAddress - Resolved symbol address
   */
  applyRelocation(sectionData, reloc, symbolAddress) {
    const offset = reloc.offset;
    const contents = sectionData.contents;

    switch (reloc.type) {
      case 'abs8':
        if (offset < contents.length) {
          contents[offset] = symbolAddress & 0xFF;
        }
        break;

      case 'abs16':
        if (offset + 1 < contents.length) {
          contents[offset] = symbolAddress & 0xFF;
          contents[offset + 1] = (symbolAddress >> 8) & 0xFF;
        }
        break;

      case 'call':
      case 'jp':
        if (offset + 1 < contents.length) {
          contents[offset] = symbolAddress & 0xFF;
          contents[offset + 1] = (symbolAddress >> 8) & 0xFF;
        }
        break;

      case 'pcrel8': {
        if (offset < contents.length) {
          const pc = sectionData.address + offset + 2;
          let distance = symbolAddress - pc;
          if (distance > 127) distance -= 256;
          if (distance < -128) distance += 256;
          contents[offset] = (distance + 256) & 0xFF;
        }
        break;
      }

      default:
        if (offset < contents.length) {
          contents[offset] = symbolAddress & 0xFF;
        }
        break;
    }
  }

  /**
   * Builds final symbol table with resolved addresses
   */
  buildSymbolTable() {
    const resolved = new Map();

    for (const [name, symbol] of this.symbolTable) {
      const address = this.getSymbolAddress(symbol);
      resolved.set(name, new ResolvedSymbol(
        name,
        symbol.type,
        address,
        symbol.section,
        symbol.sourceFile || 'unknown'
      ));
    }

    this.symbolTable = resolved;
  }

  /**
   * Generates WLA DX assembly from linked output
   * @returns {string} WLA DX assembly source
   */
  generateWlaDx() {
    const codegen = new WlaDxCodegen(this.options);
    return codegen.generate(this.objectFiles);
  }

  /**
   * Generates raw binary from linked output
   * @returns {Uint8Array} Raw binary data
   */
  generateBinary() {
    const sections = Array.from(this.sections.values());
    if (sections.length === 0) {
      return new Uint8Array(0);
    }

    const minAddress = Math.min(...sections.map(s => s.address));
    const maxAddress = Math.max(...sections.map(s => s.address + s.contents.length));
    const size = maxAddress - minAddress;

    const binary = new Uint8Array(size);

    for (const section of sections) {
      const offset = section.address - minAddress;
      binary.set(section.contents, offset);
    }

    return binary;
  }

  /**
   * Generates a map file listing all symbols and sections
   * @returns {string} Map file contents
   */
  generateMap() {
    const lines = [];
    lines.push('=== Link Map ===');
    lines.push('');

    lines.push('Sections:');
    for (const [name, data] of this.sections) {
      lines.push(`  ${name}: ${data.type} at $${data.address.toString(16).toUpperCase()} ($${data.contents.length.toString(16).toUpperCase()} bytes)`);
    }

    lines.push('');
    lines.push('Symbols:');
    for (const [name, symbol] of this.symbolTable) {
      lines.push(`  ${name}: $${symbol.address.toString(16).toUpperCase()} (${symbol.type})`);
    }

    if (this.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      for (const warning of this.warnings) {
        lines.push(`  ${warning}`);
      }
    }

    if (this.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      for (const error of this.errors) {
        lines.push(`  ${error}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Generates a JSON link map from linked output
   * @returns {string} JSON map string
   */
  generateJsonMap() {
    const map = createLinkMapFromLinker(this, {
      inputFiles: this.options.inputFiles,
      compilerVersion: 'vcc80 v0.1.0',
      baseAddress: this.options.baseAddress
    });
    return map.toJSONString();
  }
}

/**
 * Convenience function to link object files
 * @param {ObjectFile[]} objectFiles - Object files to link
 * @param {LinkerOptions} [options] - Linker options
 * @returns {LinkResult} Link result
 */
export function link(objectFiles, options = null) {
  const linker = new Linker(options);
  for (const objFile of objectFiles) {
    linker.addObjectFile(objFile);
  }
  return linker.link();
}
