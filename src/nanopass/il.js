/**
 * Calling convention constants for function calls
 */
export const CALLING_CONVENTION_CDECL = 'cdecl';
export const CALLING_CONVENTION_FASTCALL = 'fastcall';
export const CALLING_CONVENTION_CALLEE = 'callee';
export const CALLING_CONVENTION_NEW_Sdcc = 'new_sdcc';
export const CALLING_CONVENTION_DEFAULT = CALLING_CONVENTION_CDECL;

/**
 * Base class for all IL instructions
 */
export class Instruction {
  /**
   * Creates an instruction
   * @param {string} opcode - Opcode identifier
   * @param {*} [operands] - Operands for the instruction
   * @param {Object} [meta] - Additional metadata
   */
  constructor(opcode, operands = null, meta = {}) {
    this.opcode = opcode;
    this.operands = operands;
    this.meta = meta;
  }

  /**
   * Returns a string representation of the instruction
   * @returns {string} Assembly-like string
   */
  toString() {
    if (this.operands) {
      return `${this.opcode} ${Array.isArray(this.operands) ? this.operands.join(', ') : this.operands}`;
    }
    return this.opcode;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      opcode: this.opcode,
      operands: this.operands,
      meta: this.meta
    };
  }
}

/**
 * Instruction for loading a value into a register or memory location
 */
export class LoadInstruction extends Instruction {
  /**
   * Creates a load instruction
   * @param {string} dest - Destination (register name or 'mem')
   * @param {*} src - Source value, label, or immediate
   * @returns {LoadInstruction}
   */
  constructor(dest, src) {
    super('LOAD', [dest, src]);
  }
}

/**
 * Instruction for storing a value from register to memory
 */
export class StoreInstruction extends Instruction {
  /**
   * Creates a store instruction
   * @param {string} dest - Destination memory location
   * @param {string} src - Source register
   * @returns {StoreInstruction}
   */
  constructor(dest, src) {
    super('STORE', [dest, src]);
  }
}

/**
 * Instruction for binary operations
 */
export class BinaryOpInstruction extends Instruction {
  /**
   * Creates a binary operation instruction
   * @param {string} dest - Destination register
   * @param {string} op - Operation ('add', 'sub', 'mul', 'div', 'and', 'or', 'xor')
   * @param {string} src1 - First operand (register or immediate)
   * @param {string} src2 - Second operand (register or immediate)
   * @returns {BinaryOpInstruction}
   */
  constructor(dest, op, src1, src2) {
    super('BINOP', [dest, op, src1, src2]);
  }
}

/**
 * Instruction for unary operations
 */
export class UnaryOpInstruction extends Instruction {
  /**
   * Creates a unary operation instruction
   * @param {string} dest - Destination register
   * @param {string} op - Operation ('neg', 'not')
   * @param {string} src - Source register or immediate
   * @returns {UnaryOpInstruction}
   */
  constructor(dest, op, src) {
    super('UNOP', [dest, op, src]);
  }
}

/**
 * Instruction for function calls
 */
export class CallInstruction extends Instruction {
  /**
    * Creates a call instruction
    * @param {string} func - Function label or address
    * @param {string[]} args - Arguments (registers or immediates)
    * @param {string} [callingConvention] - Calling convention for the call
    * @returns {CallInstruction}
    */
   constructor(func, args = [], callingConvention = CALLING_CONVENTION_DEFAULT) {
     super('CALL', [func, ...args]);
     this.callingConvention = callingConvention;
   }
}

/**
 * Instruction for returns from functions
 */
export class ReturnInstruction extends Instruction {
  /**
   * Creates a return instruction
   * @param {string|null} value - Return value register (null for void)
   * @returns {ReturnInstruction}
   */
  constructor(value = null) {
    super('RET', [value]);
  }
}

/**
 * Instruction for conditional jumps
 */
export class JumpIfInstruction extends Instruction {
  /**
   * Creates a conditional jump instruction
   * @param {string} condition - Condition ('eq', 'ne', 'lt', 'le', 'gt', 'ge')
   * @param {string} value - Value register to test
   * @param {string} target - Jump target label
   * @returns {JumpIfInstruction}
   */
  constructor(condition, value, target) {
    super('JUMP_IF', [condition, value, target]);
  }
}

/**
 * Instruction for unconditional jumps
 */
export class JumpInstruction extends Instruction {
  /**
   * Creates an unconditional jump instruction
   * @param {string} target - Jump target label
   * @returns {JumpInstruction}
   */
  constructor(target) {
    super('JUMP', [target]);
  }
}

/**
 * Instruction for labels in the code
 */
export class LabelInstruction extends Instruction {
  /**
   * Creates a label instruction
   * @param {string} name - Label name
   * @returns {LabelInstruction}
   */
  constructor(name) {
    super('LABEL', [name]);
  }
}

/**
 * Instruction for allocating stack space
 */
export class AllocStackInstruction extends Instruction {
  /**
   * Creates a stack allocation instruction
   * @param {number} bytes - Number of bytes to allocate
   * @returns {AllocStackInstruction}
   */
  constructor(bytes) {
    super('ALLOC_STACK', [bytes]);
  }
}

/**
 * Instruction for freeing/deallocating stack space
 */
export class FreeStackInstruction extends Instruction {
  /**
   * Creates a stack deallocation instruction
   * @param {number} bytes - Number of bytes to free
   * @returns {FreeStackInstruction}
   */
  constructor(bytes) {
    super('FREE_STACK', [bytes]);
  }
}

/**
 * Instruction for pushing values onto the stack (for function calls)
 */
export class PushInstruction extends Instruction {
  /**
   * Creates a push instruction
   * @param {string} value - Value to push (register or immediate)
   * @returns {PushInstruction}
   */
  constructor(value) {
    super('PUSH', [value]);
  }
}

/**
 * Instruction for popping values from the stack
 */
export class PopInstruction extends Instruction {
  /**
   * Creates a pop instruction
   * @param {string} dest - Destination register or memory location
   * @returns {PopInstruction}
   */
  constructor(dest) {
    super('POP', [dest]);
  }
}

/**
 * Instruction for Z80 processor intrinsics (special opcodes, port access, etc.)
 */
export class IntrinsicInstruction extends Instruction {
  /**
   * Creates an intrinsic instruction
   * @param {string} name - Intrinsic name (e.g. 'NOP', 'HALT', 'IN', 'OUT')
   * @param {string[]} [operands] - Operands for the intrinsic (e.g. port address, data register)
   */
  constructor(name, operands = []) {
    super('INTRINSIC', [name, ...operands]);
  }
}

/**
 * Instruction for loading the address of a variable into a register
 */
export class LoadAddrInstruction extends Instruction {
  /**
   * Creates a load address instruction
   * @param {string} dest - Destination register for the address
   * @param {string} src - Variable name whose address to load
   * @returns {LoadAddrInstruction}
   */
  constructor(dest, src) {
    super('LOAD_ADDR', [dest, src]);
  }
}

/**
 * Instruction for loading a value from a memory address held in a register (pointer dereference)
 */
export class DerefLoadInstruction extends Instruction {
  /**
   * Creates a dereference load instruction
   * @param {string} dest - Destination register for the loaded value
   * @param {string} ptr - Register holding the pointer address
   * @returns {DerefLoadInstruction}
   */
  constructor(dest, ptr) {
    super('DEREF_LOAD', [dest, ptr]);
  }
}

/**
 * Instruction for storing a value to a memory address held in a register (pointer store)
 */
export class DerefStoreInstruction extends Instruction {
  /**
   * Creates a dereference store instruction
   * @param {string} ptr - Register holding the pointer address
   * @param {string} src - Source register holding the value to store
   * @returns {DerefStoreInstruction}
   */
  constructor(ptr, src) {
    super('DEREF_STORE', [ptr, src]);
  }
}

/**
 * Instruction for indexed memory access (array indexing with element size)
 */
export class IndexedLoadInstruction extends Instruction {
  /**
   * Creates an indexed load instruction
   * @param {string} dest - Destination register for the loaded value
   * @param {string} base - Base address register
   * @param {string} index - Index register
   * @param {number} elemSize - Element size in bytes
   * @returns {IndexedLoadInstruction}
   */
  constructor(dest, base, index, elemSize = 1) {
    super('INDEXED_LOAD', [dest, base, index, elemSize]);
  }
}

/**
 * Instruction for indexed memory store (array indexed store)
 */
export class IndexedStoreInstruction extends Instruction {
  /**
   * Creates an indexed store instruction
   * @param {string} base - Base address register
   * @param {string} index - Index register
   * @param {string} src - Source register holding the value to store
   * @param {number} elemSize - Element size in bytes
   * @returns {IndexedStoreInstruction}
   */
  constructor(base, index, src, elemSize = 1) {
    super('INDEXED_STORE', [base, index, src, elemSize]);
  }
}

/**
 * Instruction for calling through a function pointer (indirect call)
 */
export class CallIndirectInstruction extends Instruction {
  /**
    * Creates a call indirect instruction
    * @param {string} ptr - Address of the function pointer variable (holds pointer to function address)
    * @param {string[]} args - Arguments (registers or immediates)
    * @param {string} [callingConvention] - Calling convention for the indirect call
    * @returns {CallIndirectInstruction}
    */
   constructor(ptr, args = [], callingConvention = CALLING_CONVENTION_DEFAULT) {
     super('CALL_INDIRECT', [ptr, ...args]);
     this.callingConvention = callingConvention;
   }
}

/**
 * Intermediate representation for basic blocks and functions
 */
export class BasicBlock {
  /**
   * Creates a basic block
   * @param {string} name - Block label/name
   * @param {Instruction[]} instructions - Instructions in the block
   * @param {BasicBlock|null} [successor] - Successor block (for control flow)
   */
  constructor(name, instructions = [], successor = null) {
    this.name = name;
    this.instructions = instructions;
    this.successor = successor;
  }

  /**
   * Adds an instruction to the block
   * @param {Instruction} instr - Instruction to add
   */
  add(instr) {
    this.instructions.push(instr);
  }

  /**
   * Returns a string representation of the block
   * @returns {string}
   */
  toString() {
    const lines = [`${this.name}:`];
    for (const instr of this.instructions) {
      lines.push(`  ${instr}`);
    }
    if (this.successor) {
      lines.push(`  ; -> ${this.successor.name}`);
    }
    return lines.join('\n');
  }

  /**
   * Returns a JSON representation of the block
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      instructions: this.instructions.map(i => i.toJSON()),
      successor: this.successor ? this.successor.name : null
    };
  }
}

/**
 * Intermediate representation for a function
 */
export class FunctionIR {
  /**
    * Creates an IR function representation
    * @param {string} name - Function name
    * @param {BasicBlock[]} blocks - Basic blocks in the function
    * @param {Object} [metadata] - Function metadata (return type, parameters, etc.)
    * @param {string} [callingConvention] - Calling convention ('cdecl', 'fastcall', 'callee', 'new_sdcc')
    */
   constructor(name, blocks = [], metadata = {}, callingConvention = CALLING_CONVENTION_DEFAULT) {
     this.name = name;
     this.blocks = blocks;
     this.metadata = metadata;
     this.callingConvention = callingConvention;
   }

  /**
   * Adds a basic block to the function
   * @param {BasicBlock} block - Block to add
   */
  addBlock(block) {
    this.blocks.push(block);
  }

  /**
   * Gets the entry block of the function
   * @returns {BasicBlock|null} First block or null if empty
   */
  getEntry() {
    return this.blocks.length > 0 ? this.blocks[0] : null;
  }

  /**
   * Returns a string representation of the function
   * @returns {string}
   */
  toString() {
    const lines = [`function ${this.name}`];
    
    for (const block of this.blocks) {
      lines.push(block.toString());
    }

    return lines.join('\n');
  }

  /**
    * Returns a JSON representation of the function
    * @returns {Object}
    */
   toJSON() {
     return {
       name: this.name,
       metadata: this.metadata,
       callingConvention: this.callingConvention,
       blocks: this.blocks.map(b => b.toJSON())
     };
   }
}

/**
 * Intermediate representation for a complete program
 */
export class ProgramIR {
  /**
   * Creates a program IR representation
   * @param {FunctionIR[]} functions - All functions in the program
   * @param {Object[]} globals - Global variable declarations
   */
  constructor(functions = [], globals = []) {
    this.functions = functions;
    this.globals = globals;
  }

  /**
   * Adds a function to the program
   * @param {FunctionIR} func - Function to add
   */
  addFunction(func) {
    this.functions.push(func);
  }

  /**
   * Gets a function by name
   * @param {string} name - Function name
   * @returns {FunctionIR|null} Function or null if not found
   */
  getFunction(name) {
    return this.functions.find(f => f.name === name) || null;
  }

  /**
   * Returns a string representation of the program
   * @returns {string}
   */
  toString() {
    const lines = ['=== Program IR ==='];
    
    for (const func of this.functions) {
      lines.push(func.toString());
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Returns a JSON representation of the program
   * @returns {Object}
   */
  toJSON() {
    return {
      functions: this.functions.map(f => f.toJSON()),
      globals: this.globals
    };
  }
}

/**
 * Represents a symbol in the symbol table
 * @typedef {Object} Symbol
 * @property {string} name - Symbol name
 * @property {string} kind - 'function', 'variable', 'label', or 'type'
 * @property {*} type - Type information
 * @property {number} [offset] - Memory offset (for variables)
 * @property {string} [address] - Address label (for labels)
 */

/**
 * Symbol table for tracking symbols during compilation
 */
export class SymbolTable {
  constructor(parent = null) {
    this.symbols = new Map();
    this.parent = parent;
  }

  /**
   * Defines a symbol in the current scope
   * @param {string} name - Symbol name (must be unique in scope)
   * @param {Symbol} symbol - Symbol definition
   */
  define(name, symbol) {
    if (this.symbols.has(name)) {
      throw new Error(`Duplicate symbol: ${name}`);
    }
    this.symbols.set(name, symbol);
  }

  /**
   * Looks up a symbol name in current scope and parent scopes
   * @param {string} name - Symbol name to look up
   * @returns {Symbol|null} Symbol or null if not found
   */
  lookup(name) {
    if (this.symbols.has(name)) {
      return this.symbols.get(name);
    }

    if (this.parent) {
      return this.parent.lookup(name);
    }

    return null;
  }

  /**
   * Checks if a symbol exists in current scope only
   * @param {string} name - Symbol name to check
   * @returns {boolean} True if found in current scope
   */
  hasLocal(name) {
    return this.symbols.has(name);
  }

  /**
   * Creates a new child scope
   * @returns {SymbolTable} New symbol table with this as parent
   */
  pushScope() {
    return new SymbolTable(this);
  }

  /**
    * Pops the current scope (must not be root)
    */
   popScope() {
     if (!this.parent) {
       throw new Error('Cannot pop root scope');
     }
     // Return parent - caller should reassign
   }
}

/**
 * Looks up a function's calling convention from a ProgramIR
 * @param {IL.ProgramIR} program - Program IR to search
 * @param {string} funcName - Function name to look up
 * @returns {string} Calling convention or default if not found
 */
export function getFunctionCallingConvention(program, funcName) {
  const func = program.getFunction(funcName);
  if (func) {
    return func.callingConvention;
  }
  return CALLING_CONVENTION_DEFAULT;
}
