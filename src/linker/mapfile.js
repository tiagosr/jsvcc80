/**
 * Linker map file - JSON-based format for linking output
 */

/**
 * Section types for JSON map
 */
export const MapSectionType = {
  CODE: 'code',
  DATA: 'data',
  BSS: 'bss',
  RODATA: 'rodata'
};

/**
 * Symbol types for JSON map
 */
export const MapSymbolType = {
  FUNCTION: 'function',
  VARIABLE: 'variable',
  SECTION: 'section',
  ABSOLUTE: 'absolute',
  LABEL: 'label',
  EQUATE: 'equ'
};

/**
 * Symbol visibility for JSON map
 */
export const MapSymbolVisibility = {
  GLOBAL: 'global',
  LOCAL: 'local',
  WEAK: 'weak'
};

/**
 * Relocation types for JSON map
 */
export const MapRelocationType = {
  ABS8: 'abs8',
  ABS16: 'abs16',
  PCREL8: 'pcrel8',
  PCREL16: 'pcrel16',
  CALL: 'call',
  JP: 'jp',
  LD: 'ld'
};

/**
 * Represents a section in a link map
 */
export class MapSection {
  /**
   * Creates a map section
   * @param {string} name - Section name
   * @param {string} type - Section type (code, data, bss, rodata)
   * @param {number} baseAddress - Base memory address
   * @param {number} size - Size in bytes
   * @param {string} contentsHex - Hex string of section contents
   */
  constructor(name, type, baseAddress, size, contentsHex) {
    this.name = name;
    this.type = type;
    this.baseAddress = baseAddress;
    this.size = size;
    this.contentsHex = contentsHex;
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
      endAddress: this.baseAddress + this.size,
      size: this.size,
      contentsHex: this.contentsHex
    };
  }
}

/**
  * Represents a symbol in a link map
  */
 export class MapSymbol {
   /**
    * Creates a map symbol
    * @param {string} name - Symbol name
    * @param {string} type - Symbol type (function, variable, section, absolute, label, equ)
    * @param {string} visibility - Symbol visibility (global, local, weak)
    * @param {number} address - Final memory address
    * @param {string} section - Section name
    * @param {number} value - Symbol value/offset within section
    * @param {number} [size] - Symbol size in bytes
    * @param {number} [line] - Source line number where symbol is defined
    * @param {string} [sourceFile] - Source file name
    */
   constructor(name, type, visibility, address, section, value, size = 0, line = 0, sourceFile = null) {
     this.name = name;
     this.type = type;
     this.visibility = visibility;
     this.address = address;
     this.section = section;
     this.value = value;
     this.size = size;
     this.line = line;
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
       visibility: this.visibility,
       address: this.address,
       section: this.section,
       value: this.value,
       size: this.size,
       line: this.line,
       sourceFile: this.sourceFile
     };
   }
 }

/**
 * Represents a relocation in a link map
 */
export class MapRelocation {
  /**
   * Creates a map relocation
   * @param {number} offset - Byte offset within section
   * @param {string} symbolName - Name of the symbol to resolve
   * @param {string} type - Relocation type
   * @param {string} section - Section name
   * @param {number} addend - Additional value
   */
  constructor(offset, symbolName, type, section, addend) {
    this.offset = offset;
    this.symbolName = symbolName;
    this.type = type;
    this.section = section;
    this.addend = addend;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      offset: this.offset,
      symbolName: this.symbolName,
      type: this.type,
      section: this.section,
      addend: this.addend
    };
  }
}

/**
 * Represents a complete link map in JSON format
 */
export class LinkMap {
  /**
   * Creates a link map
   * @param {Object} options - Map options
   * @param {string} [options.compilerVersion] - Compiler version
   * @param {string} [options.timestamp] - Generation timestamp
   * @param {string[]} [options.inputFiles] - Input source files
   * @param {number} [options.baseAddress] - Base address
   */
  constructor(options = {}) {
    this.compilerVersion = options.compilerVersion || 'vcc80 v0.1.0';
    this.timestamp = options.timestamp || new Date().toISOString();
    this.inputFiles = options.inputFiles || [];
    this.baseAddress = options.baseAddress || 0;
    this.sections = [];
    this.symbols = [];
    this.relocations = [];
    this.warnings = [];
    this.errors = [];
    this.hasCrt0 = false;
  }

  /**
   * Adds a section to the map
   * @param {MapSection} section - Section to add
   */
  addSection(section) {
    this.sections.push(section);
  }

  /**
   * Adds a symbol to the map
   * @param {MapSymbol} symbol - Symbol to add
   */
  addSymbol(symbol) {
    this.symbols.push(symbol);
  }

  /**
   * Adds a relocation to the map
   * @param {MapRelocation} relocation - Relocation to add
   */
  addRelocation(relocation) {
    this.relocations.push(relocation);
  }

  /**
   * Adds a warning to the map
   * @param {string} warning - Warning message
   */
  addWarning(warning) {
    this.warnings.push(warning);
  }

  /**
   * Adds an error to the map
   * @param {string} error - Error message
   */
  addError(error) {
    this.errors.push(error);
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      header: {
        compilerVersion: this.compilerVersion,
        timestamp: this.timestamp,
        inputFiles: this.inputFiles,
        baseAddress: this.baseAddress
      },
      sections: this.sections.map(s => s.toJSON()),
      symbols: this.symbols.map(s => s.toJSON()),
      relocations: this.relocations.map(r => r.toJSON()),
      warnings: this.warnings,
      errors: this.errors,
      crt0: this.hasCrt0
    };
  }

  /**
   * Converts the map to a JSON string
   * @returns {string} JSON string
   */
  toJSONString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

/**
 * Converts a Uint8Array to a hex string
 * @param {Uint8Array} data - Byte data
 * @returns {string} Hex string
 */
export function bytesToHex(data) {
  return Array.from(data)
    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    .join('');
}

/**
 * Creates a link map from a linker instance
 * @param {import('./linker.js').Linker} linker - Linker instance
 * @param {Object} [options] - Map options
 * @param {string} [options.compilerVersion] - Compiler version
 * @param {string[]} [options.inputFiles] - Input files
 * @returns {LinkMap} Link map
 */
export function createLinkMapFromLinker(linker, options = {}) {
  const map = new LinkMap({
    compilerVersion: options.compilerVersion || 'vcc80 v0.1.0',
    inputFiles: options.inputFiles || [],
    baseAddress: linker.options.baseAddress
  });

  // Add sections
  for (const [name, data] of linker.sections) {
    const hex = bytesToHex(data.contents);
    map.addSection(new MapSection(
      name,
      data.type,
      data.address,
      data.contents.length,
      hex
    ));
  }

  // Add symbols
  for (const [name, symbol] of linker.symbolTable) {
    map.addSymbol(new MapSymbol(
      symbol.name,
      symbol.type,
      symbol.visibility || 'global',
      symbol.address,
      symbol.section,
      symbol.value || 0,
      symbol.size || 0,
      symbol.line || 0,
      symbol.sourceFile || 'unknown'
    ));
  }

  // Add relocations from object files
  for (const objFile of linker.objectFiles) {
    for (const section of objFile.sections) {
      for (const reloc of section.relocations) {
        map.addRelocation(new MapRelocation(
          reloc.offset,
          reloc.symbolName,
          reloc.type,
          section.name,
          reloc.addend || 0
        ));
      }
    }
  }

  // Add warnings and errors
  for (const warning of linker.warnings) {
    map.addWarning(warning);
  }
  for (const error of linker.errors) {
    map.addError(error);
  }

  // Mark crt0 presence
  map.hasCrt0 = !!linker.sections.get('.crt0');

  return map;
}
