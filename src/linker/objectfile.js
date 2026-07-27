/**
 * Object file format for intermediate representation between compilation and linking
 */

/**
 * Symbol types in object files
 */
export const SymbolType = {
  FUNCTION: 'function',
  VARIABLE: 'variable',
  SECTION: 'section',
  ABSOLUTE: 'absolute',
  LABEL: 'label',
  EQUATE: 'equ'
};

/**
 * Symbol visibility
 */
export const SymbolVisibility = {
  GLOBAL: 'global',
  LOCAL: 'local',
  WEAK: 'weak'
};

/**
 * Section types for WLA DX output
 */
export const SectionType = {
  CODE: 'code',
  DATA: 'data',
  BSS: 'bss',
  RODATA: 'rodata'
};

/**
 * Relocation types for Z80 architecture
 */
export const RelocationType = {
  ABS8: 'abs8',
  ABS16: 'abs16',
  PCREL8: 'pcrel8',
  PCREL16: 'pcrel16',
  CALL: 'call',
  JP: 'jp',
  LD: 'ld'
};

/**
  * Represents a single symbol in an object file
  */
 export class ObjectSymbol {
   /**
    * Creates an object symbol
    * @param {string} name - Symbol name
    * @param {string} type - Symbol type (function, variable, section, absolute, label, equ)
    * @param {string} visibility - Symbol visibility (global, local, weak)
    * @param {number} [value] - Symbol value/offset
    * @param {string} [section] - Section name this symbol belongs to
    * @param {number} [size] - Symbol size in bytes
    * @param {number} [line] - Source line number where symbol is defined
    * @param {string} [sourceFile] - Source file where symbol is defined
    */
   constructor(name, type, visibility, value = 0, section = null, size = 0, line = 0, sourceFile = null) {
     this.name = name;
     this.type = type;
     this.visibility = visibility;
     this.value = value;
     this.section = section;
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
       value: this.value,
       section: this.section,
       size: this.size,
       line: this.line,
       sourceFile: this.sourceFile
     };
   }
 }

/**
 * Represents a relocation entry for unresolved references
 */
export class ObjectRelocation {
  /**
   * Creates a relocation entry
   * @param {number} offset - Byte offset within section
   * @param {string} symbolName - Name of the symbol to resolve
   * @param {string} type - Relocation type
   * @param {string} section - Section name this relocation belongs to
   * @param {number} [addend] - Additional value to add during resolution
   */
  constructor(offset, symbolName, type, section, addend = 0) {
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
 * Represents a section (code, data, bss) in an object file
 */
export class ObjectSection {
  /**
   * Creates an object section
   * @param {string} name - Section name
   * @param {string} type - Section type (code, data, bss, rodata)
   * @param {Uint8Array} [contents] - Raw byte contents
   */
  constructor(name, type, contents = null) {
    this.name = name;
    this.type = type;
    this.contents = contents || new Uint8Array(0);
    this.relocations = [];
  }

  /**
   * Appends bytes to the section
   * @param {Uint8Array} data - Bytes to append
   */
  append(data) {
    const newContents = new Uint8Array(this.contents.length + data.length);
    newContents.set(this.contents);
    newContents.set(data, this.contents.length);
    this.contents = newContents;
  }

  /**
   * Appends a single byte to the section
   * @param {number} byte - Byte value (0-255)
   */
  appendByte(byte) {
    const newContents = new Uint8Array(this.contents.length + 1);
    newContents.set(this.contents);
    newContents[this.contents.length] = byte & 0xFF;
    this.contents = newContents;
  }

  /**
   * Appends a 16-bit word (little-endian) to the section
   * @param {number} word - Word value (0-65535)
   */
  appendWord(word) {
    this.appendByte(word & 0xFF);
    this.appendByte((word >> 8) & 0xFF);
  }

  /**
   * Adds a relocation entry to this section
   * @param {ObjectRelocation} reloc - Relocation to add
   */
  addRelocation(reloc) {
    this.relocations.push(reloc);
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
      size: this.contents.length,
      relocations: this.relocations.map(r => r.toJSON())
    };
  }
}

/**
 * Represents a compiled object file ready for linking
 */
export class ObjectFile {
  /**
   * Creates an object file
   * @param {string} name - Source file name
   */
  constructor(name) {
    this.name = name;
    this.sections = [];
    this.symbols = [];
    this.relocations = [];
  }

  /**
   * Adds a section to the object file
   * @param {ObjectSection} section - Section to add
   */
  addSection(section) {
    this.sections.push(section);
  }

  /**
   * Adds a symbol to the object file
   * @param {ObjectSymbol} symbol - Symbol to add
   */
  addSymbol(symbol) {
    this.symbols.push(symbol);
  }

  /**
   * Adds a relocation to the object file
   * @param {ObjectRelocation} reloc - Relocation to add
   */
  addRelocation(reloc) {
    this.relocations.push(reloc);
    const section = this.sections.find(s => s.name === reloc.section);
    if (section) {
      section.addRelocation(reloc);
    }
  }

  /**
   * Gets a section by name
   * @param {string} name - Section name
   * @returns {ObjectSection|null} Section or null if not found
   */
  getSection(name) {
    return this.sections.find(s => s.name === name) || null;
  }

  /**
   * Gets a symbol by name
   * @param {string} name - Symbol name
   * @returns {ObjectSymbol|null} Symbol or null if not found
   */
  getSymbol(name) {
    return this.symbols.find(s => s.name === name) || null;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      sections: this.sections.map(s => s.toJSON()),
      symbols: this.symbols.map(s => s.toJSON()),
      relocations: this.relocations.map(r => r.toJSON())
    };
  }
}

/**
 * Converts IR to an object file
 */
export class IrToObjectFile {
  /**
   * Creates a new IR to object file converter
   * @param {string} sourceName - Source file name for the object
   */
  constructor(sourceName) {
    this.sourceName = sourceName;
    this.objectFile = new ObjectFile(sourceName);
    this.currentSection = null;
    this.sectionCounter = 0;
  }

  /**
   * Converts a program IR to an object file
   * @param {import('../nanopass/il.js').ProgramIR} ir - Program IR
   * @returns {ObjectFile} Object file
   */
  convert(ir) {
    this.objectFile = new ObjectFile(this.sourceName);

    for (const func of ir.functions) {
      this.convertFunction(func);
    }

    for (const global of ir.globals) {
      this.convertGlobal(global);
    }

    return this.objectFile;
  }

  /**
   * Converts a function IR to object file sections and symbols
   * @param {import('../nanopass/il.js').FunctionIR} func - Function IR
   */
  convertFunction(func) {
    const sectionName = `.text.${func.name}`;
    const section = new ObjectSection(sectionName, SectionType.CODE);
    this.objectFile.addSection(section);
    this.currentSection = section;

    const metadata = func.metadata || {};
    this.objectFile.addSymbol(new ObjectSymbol(
      func.name,
      SymbolType.FUNCTION,
      SymbolVisibility.GLOBAL,
      0,
      sectionName,
      0,
      metadata.line || 0,
      metadata.sourceFile || null
    ));

    for (const block of func.blocks) {
      this.convertBlock(block);
    }
  }

  /**
   * Converts a basic block to section bytes
   * @param {import('../nanopass/il.js').BasicBlock} block - Basic block
   */
  convertBlock(block) {
    for (const instr of block.instructions) {
      this.convertInstruction(instr);
    }
  }

  /**
   * Converts an instruction to section bytes
   * @param {import('../nanopass/il.js').Instruction} instr - Instruction
   */
  convertInstruction(instr) {
    switch (instr.opcode) {
      case 'LOAD':
        this.convertLoad(instr);
        break;
      case 'STORE':
        this.convertStore(instr);
        break;
      case 'BINOP':
        this.convertBinOp(instr);
        break;
      case 'UNOP':
        this.convertUnOp(instr);
        break;
      case 'CALL':
        this.convertCall(instr);
        break;
      case 'RET':
        this.convertRet(instr);
        break;
      case 'JUMP':
        this.convertJump(instr);
        break;
      case 'JUMP_IF':
        this.convertJumpIf(instr);
        break;
      case 'PUSH':
        this.convertPush(instr);
        break;
      case 'POP':
        this.convertPop(instr);
        break;
      case 'NOP':
        this.currentSection.appendByte(0x00);
        break;
      default:
        break;
    }
  }

  /**
   * Converts a LOAD instruction to bytes
   * @param {import('../nanopass/il.js').LoadInstruction} instr - Load instruction
   */
  convertLoad(instr) {
    const [dest, src] = instr.operands;
    if (typeof src === 'number') {
      this.currentSection.appendByte(0x3E);
      this.currentSection.appendByte(src & 0xFF);
    } else {
      this.currentSection.appendByte(0x3E);
      this.currentSection.appendByte(0x00);
      this.objectFile.addRelocation(new ObjectRelocation(
        this.currentSection.size() - 1,
        String(src),
        RelocationType.ABS8,
        this.currentSection.name
      ));
    }
  }

  /**
   * Converts a STORE instruction to bytes
   * @param {import('../nanopass/il.js').StoreInstruction} instr - Store instruction
   */
  convertStore(instr) {
    this.currentSection.appendByte(0x77);
  }

  /**
   * Converts a binary operation instruction to bytes
   * @param {import('../nanopass/il.js').BinaryOpInstruction} instr - Binary op instruction
   */
  convertBinOp(instr) {
    const [dest, op, src1, src2] = instr.operands;
    switch (op) {
      case 'add':
        this.currentSection.appendByte(0x89);
        break;
      case 'sub':
        this.currentSection.appendByte(0x8F);
        break;
      case 'and':
        this.currentSection.appendByte(0xA0);
        break;
      case 'or':
        this.currentSection.appendByte(0xB2);
        break;
      case 'xor':
        this.currentSection.appendByte(0xAE);
        break;
      default:
        this.currentSection.appendByte(0x00);
        break;
    }
  }

  /**
   * Converts a unary operation instruction to bytes
   * @param {import('../nanopass/il.js').UnaryOpInstruction} instr - Unary op instruction
   */
  convertUnOp(instr) {
    const [, op] = instr.operands;
    switch (op) {
      case 'neg':
        this.currentSection.appendByte(0x2F);
        this.currentSection.appendByte(0x3C);
        break;
      case 'not':
        this.currentSection.appendByte(0x2F);
        break;
      default:
        this.currentSection.appendByte(0x00);
        break;
    }
  }

  /**
   * Converts a CALL instruction to bytes
   * @param {import('../nanopass/il.js').CallInstruction} instr - Call instruction
   */
  convertCall(instr) {
    const [func] = instr.operands;
    this.currentSection.appendByte(0xCD);
    this.currentSection.appendWord(0x0000);
    this.objectFile.addRelocation(new ObjectRelocation(
      this.currentSection.size() - 2,
      String(func),
      RelocationType.CALL,
      this.currentSection.name
    ));
  }

  /**
   * Converts a RETURN instruction to bytes
   * @param {import('../nanopass/il.js').ReturnInstruction} instr - Return instruction
   */
  convertRet() {
    this.currentSection.appendByte(0xC9);
  }

  /**
   * Converts a JUMP instruction to bytes
   * @param {import('../nanopass/il.js').JumpInstruction} instr - Jump instruction
   */
  convertJump(instr) {
    const [target] = instr.operands;
    this.currentSection.appendByte(0xC3);
    this.currentSection.appendWord(0x0000);
    this.objectFile.addRelocation(new ObjectRelocation(
      this.currentSection.size() - 2,
      String(target),
      RelocationType.JP,
      this.currentSection.name
    ));
  }

  /**
   * Converts a conditional JUMP instruction to bytes
   * @param {import('../nanopass/il.js').JumpIfInstruction} instr - Jump if instruction
   */
  convertJumpIf(instr) {
    this.currentSection.appendByte(0x20);
    this.currentSection.appendByte(0x00);
    const [, , target] = instr.operands;
    this.objectFile.addRelocation(new ObjectRelocation(
      this.currentSection.size() - 1,
      String(target),
      RelocationType.PCREL8,
      this.currentSection.name
    ));
  }

  /**
   * Converts a PUSH instruction to bytes
   * @param {import('../nanopass/il.js').PushInstruction} instr - Push instruction
   */
  convertPush() {
    this.currentSection.appendByte(0xF5);
  }

  /**
   * Converts a POP instruction to bytes
   * @param {import('../nanopass/il.js').PopInstruction} instr - Pop instruction
   */
  convertPop() {
    this.currentSection.appendByte(0xF1);
  }

  /**
   * Converts a global variable to object file sections and symbols
   * @param {Object} global - Global variable descriptor
   */
  convertGlobal(global) {
    const sectionName = `.data.${global.name}`;
    const section = new ObjectSection(sectionName, SectionType.DATA);

    if (global.value !== undefined) {
      section.appendByte(global.value & 0xFF);
    } else {
      const size = global.size || 1;
      for (let i = 0; i < size; i++) {
        section.appendByte(0x00);
      }
    }

    this.objectFile.addSection(section);
    this.objectFile.addSymbol(new ObjectSymbol(
      global.name,
      SymbolType.VARIABLE,
      SymbolVisibility.GLOBAL,
      0,
      sectionName,
      global.size || 1,
      global.line || 0,
      global.sourceFile || null
    ));
  }
}
