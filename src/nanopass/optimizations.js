/**
 * Z80 Optimization passes - peephole optimization and register allocation
 */
import { OptimizationPass } from '../plugins/interfaces.js';
import {
  Instruction, LoadInstruction, StoreInstruction, BinaryOpInstruction,
  UnaryOpInstruction, CallInstruction, CallIndirectInstruction, ReturnInstruction, JumpIfInstruction,
  JumpInstruction, LabelInstruction, AllocStackInstruction, FreeStackInstruction,
  PushInstruction, PopInstruction, LoadAddrInstruction, DerefLoadInstruction, DerefStoreInstruction,
  IndexedLoadInstruction, IndexedStoreInstruction, BasicBlock, FunctionIR, ProgramIR
} from './il.js';

/**
 * Peephole optimization pass - simplifies instruction sequences
 */
export class PeepholeOptimizer extends OptimizationPass {
  /**
   * Creates a new peephole optimizer
   * @param {Object} [options] - Optimization options
   */
  constructor(options = {}) {
    super();
    this.options = {
      maxIterations: options.maxIterations || 3,
      ...options
    };
    this.stats = {
      instructionsRemoved: 0,
      constantsFolded: 0,
      redundantMovesEliminated: 0,
      redundantJumpsEliminated: 0,
      deadStoresEliminated: 0,
      iterations: 0
    };
  }

  /**
   * Returns the name of this pass
   * @returns {string}
   */
  getName() {
    return 'PeepholeOptimizer';
  }

  /**
   * Executes the peephole optimization on IR
   * @param {ProgramIR|FunctionIR} ir - IR to optimize
   * @param {Object} [context] - Pass context
   * @returns {ProgramIR|FunctionIR} Optimized IR
   */
  run(ir, context = {}) {
    this.stats = {
      instructionsRemoved: 0,
      constantsFolded: 0,
      redundantMovesEliminated: 0,
      redundantJumpsEliminated: 0,
      deadStoresEliminated: 0,
      iterations: 0
    };

    if (ir instanceof ProgramIR) {
      return this.optimizeProgram(ir);
    }
    if (ir instanceof FunctionIR) {
      return this.optimizeFunction(ir);
    }
    return ir;
  }

  /**
   * Optimizes a complete program
   * @param {ProgramIR} program - Program to optimize
   * @returns {ProgramIR} Optimized program
   */
  optimizeProgram(program) {
    const optimizedFunctions = program.functions.map(func =>
      this.optimizeFunction(func)
    );
    const optimized = new ProgramIR(optimizedFunctions, program.globals);
    return optimized;
  }

  /**
   * Optimizes a function
   * @param {FunctionIR} func - Function to optimize
   * @returns {FunctionIR} Optimized function
   */
  optimizeFunction(func) {
    let changed = true;
    let iterations = 0;

    while (changed && iterations < this.options.maxIterations) {
      changed = false;
      iterations++;

      for (const block of func.blocks) {
        const oldLen = block.instructions.length;
        this.optimizeBlock(block);
        if (block.instructions.length !== oldLen) {
          changed = true;
        }
      }

      this.stats.iterations = iterations;
    }

    return func;
  }

  /**
   * Optimizes a single basic block
   * @param {BasicBlock} block - Block to optimize
   */
  optimizeBlock(block) {
    this.eliminateRedundantMoves(block);
    this.foldConstants(block);
    this.propagateCopies(block);
    this.eliminateDeadStores(block);
    this.eliminateRedundantJumps(block);
    this.mergeStackOps(block);
  }

  /**
   * Eliminates redundant move instructions (load from same register)
   * @param {BasicBlock} block - Block to optimize
   */
  eliminateRedundantMoves(block) {
    const newInstructions = [];
    const regValues = new Map();

    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i];

      if (instr instanceof LoadInstruction) {
        const [dest, src] = instr.operands;
        if (dest === src) {
          this.stats.instructionsRemoved++;
          this.stats.redundantMovesEliminated++;
          continue;
        }
        regValues.set(dest, src);
        newInstructions.push(instr);
      } else if (instr instanceof StoreInstruction) {
        const [dest, src] = instr.operands;
        if (dest === src) {
          this.stats.instructionsRemoved++;
          this.stats.redundantMovesEliminated++;
          continue;
        }
        newInstructions.push(instr);
      } else {
        newInstructions.push(instr);
      }
    }

    block.instructions = newInstructions;
  }

  /**
   * Folds constant arithmetic operations at compile time
   * @param {BasicBlock} block - Block to optimize
   */
  foldConstants(block) {
    const newInstructions = [];

    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i];

      if (instr instanceof BinaryOpInstruction) {
        const [dest, op, src1, src2] = instr.operands;
        const val1 = this.tryParseNumber(src1);
        const val2 = this.tryParseNumber(src2);

        if (val1 !== null && val2 !== null) {
          const result = this.foldBinaryOp(op, val1, val2);
          if (result !== null) {
            newInstructions.push(new LoadInstruction(dest, result));
            this.stats.instructionsRemoved++;
            this.stats.constantsFolded++;
            continue;
          }
        }
      }

      if (instr instanceof UnaryOpInstruction) {
        const [dest, op, src] = instr.operands;
        const val = this.tryParseNumber(src);

        if (val !== null) {
          const result = this.foldUnaryOp(op, val);
          if (result !== null) {
            newInstructions.push(new LoadInstruction(dest, result));
            this.stats.instructionsRemoved++;
            this.stats.constantsFolded++;
            continue;
          }
        }
      }

      newInstructions.push(instr);
    }

    block.instructions = newInstructions;
  }

  /**
   * Propagates copy values through subsequent instructions
   * Replaces uses of a register with its known value when possible
   * @param {BasicBlock} block - Block to optimize
   */
  propagateCopies(block) {
    const env = new Map();

    const newInstructions = [];
    for (const instr of block.instructions) {
      if (instr instanceof LoadInstruction) {
        const [dest, src] = instr.operands;
        const resolvedSrc = env.has(src) ? env.get(src) : src;
        if (resolvedSrc !== src) {
          newInstructions.push(new LoadInstruction(dest, resolvedSrc));
          env.set(dest, resolvedSrc);
          this.stats.constantsFolded++;
        } else {
          newInstructions.push(instr);
          env.set(dest, src);
        }
      } else if (instr instanceof StoreInstruction) {
        const [dest, src] = instr.operands;
        const resolvedSrc = env.has(src) ? env.get(src) : src;
        if (resolvedSrc !== src) {
          newInstructions.push(new StoreInstruction(dest, resolvedSrc));
          this.stats.constantsFolded++;
        } else {
          newInstructions.push(instr);
        }
        for (const [k] of env) {
          if (k === dest) env.delete(k);
        }
      } else if (instr instanceof BinaryOpInstruction) {
        const [dest, op, src1, src2] = instr.operands;
        const r1 = env.has(src1) ? env.get(src1) : src1;
        const r2 = env.has(src2) ? env.get(src2) : src2;
        if (r1 !== src1 || r2 !== src2) {
          newInstructions.push(new BinaryOpInstruction(dest, op, r1, r2));
          this.stats.constantsFolded++;
        } else {
          newInstructions.push(instr);
        }
        env.set(dest, dest);
        for (const [k, v] of env) {
          if (v === src1 || v === src2) env.delete(k);
        }
        env.set(dest, dest);
      } else if (instr instanceof UnaryOpInstruction) {
        const [dest, op, src] = instr.operands;
        const resolvedSrc = env.has(src) ? env.get(src) : src;
        if (resolvedSrc !== src) {
          newInstructions.push(new UnaryOpInstruction(dest, op, resolvedSrc));
          this.stats.constantsFolded++;
        } else {
          newInstructions.push(instr);
        }
        env.set(dest, dest);
      } else if (instr instanceof JumpInstruction || instr instanceof JumpIfInstruction) {
        env.clear();
        newInstructions.push(instr);
      } else {
        newInstructions.push(instr);
      }
    }

    block.instructions = newInstructions;
  }

  /**
    * Eliminates dead stores (stores to a location never read before overwrite)
    * @param {BasicBlock} block - Block to optimize
    */
   eliminateDeadStores(block) {
     if (block.instructions.length <= 1) return;

     const instructions = [...block.instructions];
     const liveStores = new Set();

     for (let i = instructions.length - 1; i >= 0; i--) {
       const instr = instructions[i];

       if (instr instanceof StoreInstruction) {
         const [dest] = instr.operands;
         if (!liveStores.has(dest)) {
           liveStores.add(dest);
         } else {
           liveStores.delete(dest);
         }
       } else if (instr instanceof LoadInstruction) {
         const [, src] = instr.operands;
         liveStores.delete(src);
       } else if (instr instanceof BinaryOpInstruction) {
         const [dest, , src1, src2] = instr.operands;
         liveStores.delete(src1);
         liveStores.delete(src2);
         liveStores.add(dest);
       } else if (instr instanceof ReturnInstruction) {
         const [value] = instr.operands;
         if (value) {
           liveStores.delete(value);
         }
       } else if (instr instanceof JumpInstruction || instr instanceof JumpIfInstruction) {
         liveStores.clear();
       }
     }

     const newInstructions = [];

     for (let i = 0; i < block.instructions.length; i++) {
       const instr = block.instructions[i];

       if (instr instanceof StoreInstruction) {
         const [dest, src] = instr.operands;
         // For variable names (non-temp), only eliminate if overwritten by another store
         // to the same destination within the block (definitely dead)
         // Otherwise preserve as it may be read in subsequent blocks
         const isVarName = !/^t\d+$/.test(dest);
         if (isVarName) {
           // Check if there's a subsequent store to the same destination
           let overwritten = false;
           for (let j = i + 1; j < block.instructions.length; j++) {
             const nextInstr = block.instructions[j];
             if (nextInstr instanceof StoreInstruction) {
               const [sDest] = nextInstr.operands;
               if (sDest === dest) {
                 overwritten = true;
                 break;
               }
             }
           }
           if (!overwritten) {
             newInstructions.push(instr);
             continue;
           }
         }
         const nextUses = this.isStoreLive(block, i, dest);
         if (!nextUses) {
           this.stats.instructionsRemoved++;
           this.stats.deadStoresEliminated++;
           continue;
         }
       }

       newInstructions.push(instr);
     }

     block.instructions = newInstructions;
   }

  /**
    * Checks if a store to a destination is live (will be read before overwrite)
    * @param {BasicBlock} block - Block to check
    * @param {number} storeIndex - Index of the store instruction
    * @param {string} dest - Destination of the store
    * @returns {boolean} True if the store is live
    */
   isStoreLive(block, storeIndex, dest) {
     for (let i = storeIndex + 1; i < block.instructions.length; i++) {
       const instr = block.instructions[i];

       if (instr instanceof LoadInstruction) {
         const [, src] = instr.operands;
         if (src === dest) return true;
       }

       if (instr instanceof BinaryOpInstruction) {
         const [, , src1, src2] = instr.operands;
         if (src1 === dest || src2 === dest) return true;
       }

       if (instr instanceof StoreInstruction) {
         const [sDest] = instr.operands;
         if (sDest === dest) return false;
       }

       if (instr instanceof ReturnInstruction) {
         const [value] = instr.operands;
         if (value === dest) return true;
       }

       if (instr instanceof JumpInstruction || instr instanceof JumpIfInstruction) {
         return false;
       }
     }

     // Check successor block for cross-block liveness
     if (block.successor) {
       for (const instr of block.successor.instructions) {
         if (instr instanceof LoadInstruction) {
           const [, src] = instr.operands;
           if (src === dest) return true;
         }

         if (instr instanceof BinaryOpInstruction) {
           const [, , src1, src2] = instr.operands;
           if (src1 === dest || src2 === dest) return true;
         }

         if (instr instanceof StoreInstruction) {
           const [sDest] = instr.operands;
           if (sDest === dest) return false;
         }

         if (instr instanceof ReturnInstruction) {
           const [value] = instr.operands;
           if (value === dest) return true;
         }

         if (instr instanceof JumpInstruction || instr instanceof JumpIfInstruction) {
           return false;
         }
       }
     }

     return false;
   }

  /**
   * Eliminates redundant jumps (jump to the next instruction)
   * @param {BasicBlock} block - Block to optimize
   */
  eliminateRedundantJumps(block) {
    const newInstructions = [];

    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i];

      if (instr instanceof JumpInstruction) {
        const [target] = instr.operands;
        if (block.successor && block.successor.name === target) {
          this.stats.instructionsRemoved++;
          this.stats.redundantJumpsEliminated++;
          continue;
        }
      }

      newInstructions.push(instr);
    }

    block.instructions = newInstructions;
  }

  /**
   * Merges consecutive stack allocation/deallocation operations
   * @param {BasicBlock} block - Block to optimize
   */
  mergeStackOps(block) {
    const newInstructions = [];
    let pendingAlloc = 0;

    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i];

      if (instr instanceof AllocStackInstruction) {
        pendingAlloc += instr.operands[0];
        this.stats.instructionsRemoved++;
        continue;
      }

      if (instr instanceof FreeStackInstruction) {
        const freeBytes = instr.operands[0];
        if (pendingAlloc >= freeBytes) {
          pendingAlloc -= freeBytes;
          this.stats.instructionsRemoved++;
          continue;
        } else {
          pendingAlloc = 0;
        }
      }

      if (pendingAlloc > 0) {
        newInstructions.push(new AllocStackInstruction(pendingAlloc));
        pendingAlloc = 0;
      }

      newInstructions.push(instr);
    }

    if (pendingAlloc > 0) {
      newInstructions.push(new AllocStackInstruction(pendingAlloc));
    }

    block.instructions = newInstructions;
  }

  /**
   * Tries to parse a value as a number
   * @param {*} value - Value to parse
   * @returns {number|null} Parsed number or null
   */
  tryParseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (/^\d+$/.test(value)) return parseInt(value, 10);
      if (/^0x[0-9a-fA-F]+$/.test(value)) return parseInt(value, 16);
      if (value.startsWith('#')) {
        const hex = value.slice(1);
        if (/^[0-9a-fA-F]+$/.test(hex)) return parseInt(hex, 16);
      }
    }
    return null;
  }

  /**
   * Folds a binary operation on constant values
   * @param {string} op - Operation
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @returns {number|null} Result or null if cannot fold
   */
  foldBinaryOp(op, a, b) {
    switch (op) {
      case 'add': return a + b;
      case 'sub': return a - b;
      case 'mul': return a * b;
      case 'div': return b !== 0 ? Math.floor(a / b) : null;
      case 'mod': return b !== 0 ? a % b : null;
      case 'and': return a & b;
      case 'or': return a | b;
      case 'xor': return a ^ b;
      case 'shl': return a << b;
      case 'shr': return a >> b;
      case 'lt': return a < b ? 1 : 0;
      case 'gt': return a > b ? 1 : 0;
      case 'le': return a <= b ? 1 : 0;
      case 'ge': return a >= b ? 1 : 0;
      case 'eq': return a === b ? 1 : 0;
      case 'ne': return a !== b ? 1 : 0;
      case 'land': return a && b ? 1 : 0;
      case 'lor': return a || b ? 1 : 0;
      default: return null;
    }
  }

  /**
   * Folds a unary operation on a constant value
   * @param {string} op - Operation
   * @param {number} val - Operand value
   * @returns {number|null} Result or null if cannot fold
   */
  foldUnaryOp(op, val) {
    switch (op) {
      case 'neg': return -val;
      case 'not': return ~val;
      case 'lognot': return val ? 0 : 1;
      default: return null;
    }
  }

  /**
   * Returns statistics about the optimization performed
   * @returns {Object} Statistics object
   */
  getStats() {
    return this.stats;
  }
}

/**
 * Register allocator - assigns physical Z80 registers to virtual registers
 */
export class RegisterAllocator extends OptimizationPass {
  /**
   * Creates a new register allocator
   * @param {Object} [options] - Allocator options
   */
  constructor(options = {}) {
    super();
    this.options = {
      spillThreshold: options.spillThreshold || 8,
      ...options
    };
    this.stats = {
      registersAllocated: 0,
      spills: 0,
      reloads: 0
    };
  }

  /**
   * Returns the name of this pass
   * @returns {string}
   */
  getName() {
    return 'RegisterAllocator';
  }

  /**
   * Executes register allocation on IR
   * @param {ProgramIR|FunctionIR} ir - IR to allocate registers for
   * @param {Object} [context] - Pass context
   * @returns {ProgramIR|FunctionIR} IR with allocated registers
   */
  run(ir, context = {}) {
    this.stats = {
      registersAllocated: 0,
      spills: 0,
      reloads: 0
    };

    if (ir instanceof ProgramIR) {
      return this.allocateProgram(ir);
    }
    if (ir instanceof FunctionIR) {
      return this.allocateFunction(ir);
    }
    return ir;
  }

  /**
   * Allocates registers for a complete program
   * @param {ProgramIR} program - Program to allocate
   * @returns {ProgramIR} Program with allocated registers
   */
  allocateProgram(program) {
    const allocatedFunctions = program.functions.map(func =>
      this.allocateFunction(func)
    );
    return new ProgramIR(allocatedFunctions, program.globals);
  }

  /**
   * Allocates registers for a function
   * @param {FunctionIR} func - Function to allocate
   * @returns {FunctionIR} Function with allocated registers
   */
  allocateFunction(func) {
    const allocator = new BlockRegisterAllocator(this.options);

    for (const block of func.blocks) {
      allocator.allocateBlock(block);
    }

    this.stats.registersAllocated = allocator.stats.registersAllocated;
    this.stats.spills = allocator.stats.spills;
    this.stats.reloads = allocator.stats.reloads;

    return func;
  }

  /**
   * Returns statistics about the allocation performed
   * @returns {Object} Statistics object
   */
  getStats() {
    return this.stats;
  }
}

/**
 * Per-block register allocator
 */
class BlockRegisterAllocator {
  /**
   * Creates a new block allocator
   * @param {Object} options - Allocator options
   */
  constructor(options) {
    this.options = options;
    /** @type {Map<string, string>} */
    this.vregToPreg = new Map();
    /** @type {Map<string, string>} */
    this.pregToVreg = new Map();
    /** @type {string[]} */
    this.availableRegs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
    /** @type {string[]} */
    this.usedRegs = [];
    this.stats = {
      registersAllocated: 0,
      spills: 0,
      reloads: 0
    };
  }

  /**
   * Allocates registers for a block's instructions
   * @param {BasicBlock} block - Block to allocate
   */
  allocateBlock(block) {
    for (const instr of block.instructions) {
      this.allocateInstruction(instr);
    }
  }

  /**
    * Allocates registers for a single instruction
    * @param {Instruction} instr - Instruction to allocate
    */
   allocateInstruction(instr) {
     if (instr instanceof LoadInstruction) {
       this.allocateLoad(instr);
     } else if (instr instanceof StoreInstruction) {
       this.allocateStore(instr);
     } else if (instr instanceof BinaryOpInstruction) {
       this.allocateBinaryOp(instr);
     } else if (instr instanceof UnaryOpInstruction) {
       this.allocateUnaryOp(instr);
     } else if (instr instanceof CallInstruction) {
       this.allocateCall(instr);
     } else if (instr instanceof CallIndirectInstruction) {
       this.allocateCallIndirect(instr);
     } else if (instr instanceof ReturnInstruction) {
       this.allocateReturn(instr);
     } else if (instr instanceof JumpIfInstruction) {
       this.allocateJumpIf(instr);
     } else if (instr instanceof PushInstruction) {
       this.allocatePush(instr);
     } else if (instr instanceof PopInstruction) {
       this.allocatePop(instr);
     } else if (instr instanceof LoadAddrInstruction) {
       this.allocateLoadAddr(instr);
     } else if (instr instanceof DerefLoadInstruction) {
       this.allocateDerefLoad(instr);
     } else if (instr instanceof DerefStoreInstruction) {
       this.allocateDerefStore(instr);
     } else if (instr instanceof IndexedLoadInstruction) {
       this.allocateIndexedLoad(instr);
     } else if (instr instanceof IndexedStoreInstruction) {
       this.allocateIndexedStore(instr);
     }
   }

  /**
    * Allocates a load instruction
    * @param {LoadInstruction} instr - Load instruction
    */
   allocateLoad(instr) {
     const [dest, src] = instr.operands;

     if (this.isVreg(dest)) {
       // For memory loads (src is a variable label), result is 16-bit -> use HL
       if (typeof src === 'string' && !this.isVreg(src) && !/^\d+$/.test(src)) {
         instr.operands[0] = 'hl';
       } else {
         const preg = this.allocateRegister(dest);
         if (preg) {
           instr.operands[0] = preg;
         }
       }
     }

     if (this.isVreg(src)) {
       const preg = this.getPhysicalRegister(src);
       if (preg) {
         instr.operands[1] = preg;
       } else {
         // src vreg not yet allocated - allocate it
         const newPreg = this.allocateRegister(src);
         if (newPreg) {
           instr.operands[1] = newPreg;
         }
       }
     }
   }

  /**
   * Allocates a store instruction
   * @param {StoreInstruction} instr - Store instruction
   */
  allocateStore(instr) {
    const [dest, src] = instr.operands;

    if (this.isVreg(src)) {
      const preg = this.getPhysicalRegister(src);
      if (preg) {
        instr.operands[1] = preg;
        this.freeRegister(src);
      }
    }
  }

  /**
   * Allocates a binary operation instruction
   * @param {BinaryOpInstruction} instr - Binary op instruction
   */
  allocateBinaryOp(instr) {
    const [dest, op, src1, src2] = instr.operands;

    const preg1 = this.isVreg(src1) ? this.getPhysicalRegister(src1) : src1;
    const preg2 = this.isVreg(src2) ? this.getPhysicalRegister(src2) : src2;

    if (this.isVreg(dest)) {
      const preg = this.allocateRegister(dest);
      if (preg) {
        instr.operands[0] = preg;
        instr.operands[2] = preg1;
        instr.operands[3] = preg2;

        if (this.isVreg(src1)) this.freeRegister(src1);
        if (this.isVreg(src2)) this.freeRegister(src2);
      }
    } else {
      instr.operands[2] = preg1;
      instr.operands[3] = preg2;
    }
  }

  /**
   * Allocates a unary operation instruction
   * @param {UnaryOpInstruction} instr - Unary op instruction
   */
  allocateUnaryOp(instr) {
    const [dest, op, src] = instr.operands;

    const preg = this.isVreg(src) ? this.getPhysicalRegister(src) : src;

    if (this.isVreg(dest)) {
      const dReg = this.allocateRegister(dest);
      if (dReg) {
        instr.operands[0] = dReg;
        instr.operands[2] = preg;
        if (this.isVreg(src)) this.freeRegister(src);
      }
    } else {
      instr.operands[2] = preg;
    }
  }

  /**
    * Allocates a call instruction
    * @param {CallInstruction} instr - Call instruction
    */
   allocateCall(instr) {
     const isFloatCall = instr.meta?.floatResult === true;
     if (isFloatCall) {
       const resultVreg = instr.operands[0];
       this.vregToPreg.clear();
       this.pregToVreg.clear();
       this.usedRegs = [];
       if (resultVreg && this.isVreg(resultVreg)) {
         this.vregToPreg.set(resultVreg, 'hl');
         this.pregToVreg.set('hl', resultVreg);
         this.usedRegs.push('hl');
       }
     } else {
       this.vregToPreg.clear();
       this.pregToVreg.clear();
       this.usedRegs = [];
     }
   }

  /**
   * Allocates registers for a call indirect instruction (function pointer call)
   * @param {CallIndirectInstruction} instr - Call indirect instruction
   */
  allocateCallIndirect(instr) {
    const [ptr, ...args] = instr.operands;
    
    // Allocate register for the function pointer value
    if (this.isVreg(ptr)) {
      const preg = this.allocateRegister(ptr);
      if (preg) {
        instr.operands[0] = preg;
      }
    }
    
    // Allocate registers for arguments
    for (let i = 0; i < args.length; i++) {
      if (this.isVreg(args[i])) {
        const preg = this.allocateRegister(args[i]);
        if (preg) {
          args[i] = preg;
        }
      }
    }
    
    // Clear tracking after call (callee-saved registers may be clobbered)
    this.vregToPreg.clear();
    this.pregToVreg.clear();
    this.usedRegs = [];
  }

  /**
   * Allocates a return instruction
   * @param {ReturnInstruction} instr - Return instruction
   */
  allocateReturn(instr) {
    const [value] = instr.operands;

    if (value && this.isVreg(value)) {
      const preg = this.getPhysicalRegister(value);
      if (preg) {
        instr.operands[0] = preg;
      } else {
        instr.operands[0] = 'a';
      }
    }
  }

  /**
   * Allocates a conditional jump instruction
   * @param {JumpIfInstruction} instr - Conditional jump instruction
   */
  allocateJumpIf(instr) {
    const [condition, value, target] = instr.operands;

    if (this.isVreg(value)) {
      const preg = this.getPhysicalRegister(value);
      if (preg) {
        instr.operands[1] = preg;
      }
    }
  }

  /**
   * Allocates a push instruction
   * @param {PushInstruction} instr - Push instruction
   */
  allocatePush(instr) {
    const [value] = instr.operands;

    if (this.isVreg(value)) {
      const preg = this.getPhysicalRegister(value);
      if (preg) {
        instr.operands[0] = preg;
      }
    }
  }

  /**
    * Allocates a pop instruction
    * @param {PopInstruction} instr - Pop instruction
    */
   allocatePop(instr) {
     const [dest] = instr.operands;

     if (this.isVreg(dest)) {
       const preg = this.allocateRegister(dest);
       if (preg) {
         instr.operands[0] = preg;
       }
     }
   }

  /**
    * Allocates a load address instruction
    * @param {LoadAddrInstruction} instr - Load address instruction
    */
   allocateLoadAddr(instr) {
     const [dest, src] = instr.operands;

     // Result is 16-bit address -> use HL
     if (this.isVreg(dest)) {
       this.vregToPreg.set(dest, 'hl');
       this.pregToVreg.set('hl', dest);
       this.usedRegs.push('hl');
       instr.operands[0] = 'hl';
     }
   }

  /**
    * Allocates a dereference load instruction
    * @param {DerefLoadInstruction} instr - Dereference load instruction
    */
   allocateDerefLoad(instr) {
     const [dest, ptr] = instr.operands;

     // ptr is a pointer address (16-bit)
     if (this.isVreg(ptr)) {
       const preg = this.getPhysicalRegister(ptr);
       if (preg) {
         instr.operands[1] = preg;
       } else {
         instr.operands[1] = 'hl';
       }
     }

     // dest is 8-bit result
     if (this.isVreg(dest)) {
       const preg = this.allocateRegister(dest);
       if (preg) {
         instr.operands[0] = preg;
       }
     }
   }

  /**
    * Allocates a dereference store instruction
    * @param {DerefStoreInstruction} instr - Dereference store instruction
    */
   allocateDerefStore(instr) {
     const [ptr, src] = instr.operands;

     // ptr is a pointer address (16-bit)
     if (this.isVreg(ptr)) {
       const preg = this.getPhysicalRegister(ptr);
       if (preg) {
         instr.operands[0] = preg;
       } else {
         instr.operands[0] = 'hl';
       }
     }

     // src is the value to store
     if (this.isVreg(src)) {
       const preg = this.getPhysicalRegister(src);
       if (preg) {
         instr.operands[1] = preg;
       }
     }
   }

  /**
    * Allocates an indexed load instruction
    * @param {IndexedLoadInstruction} instr - Indexed load instruction
    */
   allocateIndexedLoad(instr) {
     const [dest, base, index, elemSize] = instr.operands;

     if (this.isVreg(base)) {
       const preg = this.getPhysicalRegister(base);
       if (preg) {
         instr.operands[1] = preg;
       }
     }

     if (this.isVreg(index)) {
       const preg = this.getPhysicalRegister(index);
       if (preg) {
         instr.operands[2] = preg;
       }
     }

     if (this.isVreg(dest)) {
       const preg = this.allocateRegister(dest);
       if (preg) {
         instr.operands[0] = preg;
       }
     }
   }

  /**
    * Allocates an indexed store instruction
    * @param {IndexedStoreInstruction} instr - Indexed store instruction
    */
   allocateIndexedStore(instr) {
     const [base, index, src, elemSize] = instr.operands;

     if (this.isVreg(base)) {
       const preg = this.getPhysicalRegister(base);
       if (preg) {
         instr.operands[0] = preg;
       }
     }

     if (this.isVreg(index)) {
       const preg = this.getPhysicalRegister(index);
       if (preg) {
         instr.operands[1] = preg;
       }
     }

     if (this.isVreg(src)) {
       const preg = this.getPhysicalRegister(src);
       if (preg) {
         instr.operands[2] = preg;
       }
     }
   }

  /**
   * Checks if a name is a virtual register
   * @param {string} name - Name to check
   * @returns {boolean} True if it's a virtual register
   */
  isVreg(name) {
    return typeof name === 'string' && name.startsWith('t');
  }

  /**
   * Allocates a physical register for a virtual register
   * @param {string} vreg - Virtual register name
   * @returns {string|null} Physical register name or null
   */
  allocateRegister(vreg) {
    if (this.vregToPreg.has(vreg)) {
      return this.vregToPreg.get(vreg);
    }

    if (this.usedRegs.length < this.availableRegs.length) {
      const preg = this.availableRegs[this.usedRegs.length];
      this.usedRegs.push(preg);
      this.vregToPreg.set(vreg, preg);
      this.pregToVreg.set(preg, vreg);
      this.stats.registersAllocated++;
      return preg;
    }

    return this.spillAndAllocate(vreg);
  }

  /**
   * Spills a register and allocates a new one
   * @param {string} vreg - Virtual register to allocate
   * @returns {string|null} Physical register or null
   */
  spillAndAllocate(vreg) {
    if (this.usedRegs.length === 0) return null;

    const spilledVreg = this.pregToVreg.get(this.availableRegs[0]);
    if (spilledVreg) {
      this.stats.spills++;
      this.vregToPreg.delete(spilledVreg);
      this.pregToVreg.delete(this.availableRegs[0]);
    }

    this.vregToPreg.set(vreg, this.availableRegs[0]);
    this.pregToVreg.set(this.availableRegs[0], vreg);
    this.stats.registersAllocated++;
    return this.availableRegs[0];
  }

  /**
   * Frees a physical register associated with a virtual register
   * @param {string} vreg - Virtual register to free
   */
  freeRegister(vreg) {
    const preg = this.vregToPreg.get(vreg);
    if (preg) {
      const idx = this.usedRegs.indexOf(preg);
      if (idx !== -1) {
        this.usedRegs.splice(idx, 1);
      }
      this.vregToPreg.delete(vreg);
      this.pregToVreg.delete(preg);
    }
  }

  /**
   * Gets the physical register for a virtual register
   * @param {string} vreg - Virtual register name
   * @returns {string|null} Physical register or null
   */
  getPhysicalRegister(vreg) {
    return this.vregToPreg.get(vreg) || null;
  }
}
