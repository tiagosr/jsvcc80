import * as AST from '../ast/nodes.js';
import * as IL from './il.js';
import { CALLING_CONVENTION_DEFAULT } from './il.js';

/**
 * Translates expression nodes to IR basic blocks.
 * Handles literals, identifiers, binary/unary ops, calls, and special expressions.
 */
export class ExpressionTranslator {
  /**
   * Creates a new expression translator
   * @param {Object} context - TranslationContext
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Main dispatch for expression translation
   * @param {AST.ASTNode|Object} expr - Expression AST node or parser result
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateExpression(expr) {
    // Handle array results from comma-separated expression parser
    if (Array.isArray(expr)) {
      let lastResult = null;
      const allBlocks = [];
      for (const item of expr) {
        if (item !== null) {
          const result = this.translateExpression(item);
          allBlocks.push(...result.blocks);
          lastResult = result.result;
        }
      }
      return { blocks: allBlocks, result: lastResult || this.context.state.temp() };
    }

    // Handle Conditional expression from parser
    if (expr && typeof expr === 'object' && expr.type === 'Conditional') {
      return this.translateConditional(expr);
    }
    if (expr instanceof AST.LiteralNode) {
      return this.translateLiteral(expr);
    }

    if (expr instanceof AST.IdentifierNode) {
      return this.translateIdentifier(expr);
    }

    if (expr instanceof AST.BinaryOpNode) {
      return this.translateBinaryOp(expr);
    }

    if (expr instanceof AST.UnaryOpNode) {
      if (expr.op === 'deref') {
        return this.context.callMemoryTranslator.translateDeref({ operand: expr.operand });
      }
      return this.translateUnaryOp(expr);
    }

    if (expr instanceof AST.CallNode) {
      return this.translateCallNode(expr);
    }

    if (expr instanceof AST.FunctionPointerCallNode) {
      return this.context.callMemoryTranslator.translateFuncPtrCall(expr);
    }

    if (expr instanceof AST.IndexNode) {
      return this.context.callMemoryTranslator.translateIndex(expr);
    }

    if (expr instanceof AST.MemberNode) {
      return this.context.callMemoryTranslator.translateMember(expr);
    }

    if (expr instanceof AST.AddressOfNode) {
      return this.context.callMemoryTranslator.translateAddressOf(expr);
    }

    if (expr instanceof AST.DerefNode) {
      return this.context.callMemoryTranslator.translateDeref(expr);
    }

    if (expr instanceof AST.PointerMemberNode) {
      return this.context.callMemoryTranslator.translatePointerMember(expr);
    }

    if (expr instanceof AST.SizeOfNode) {
      return this.context.typeQueryHandler.translateSizeOf(expr);
    }

    if (expr instanceof AST.OffsetOfNode) {
      return this.context.typeQueryHandler.translateOffsetOf(expr);
    }

    if (expr instanceof AST.TypeOfNode) {
      return this.context.typeQueryHandler.translateTypeOf(expr);
    }

    if (expr instanceof AST.CastNode) {
      return this.context.typeQueryHandler.translateCast(expr);
    }

    const temp = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('expr'));
    block.add(new IL.LoadInstruction(temp, 'unknown'));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate a literal node
   * @param {AST.LiteralNode} literal - Literal node
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateLiteral(literal) {
    if (literal.type === 'string') {
      const label = this.context.stringCollector.emitStringData(literal.value);
      const temp = this.context.state.temp();
      const block = new IL.BasicBlock(this.context.state.label('str'));
      block.add(new IL.LoadAddrInstruction(temp, label));
      return { blocks: [block], result: temp };
    }
    if (literal.type === 'float') {
      const label = this.context.floatCollector.emitFloatData(literal.value);
      const temp = this.context.state.temp();
      const block = new IL.BasicBlock(this.context.state.label('flt'));
      block.add(new IL.LoadAddrInstruction(temp, label));
      return { blocks: [block], result: temp, isFloat: true };
    }
    const temp = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('lit'));
    block.add(new IL.LoadInstruction(temp, literal.value));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate an identifier expression
   * @param {AST.IdentifierNode} ident - Identifier node
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateIdentifier(ident) {
    const sym = this.context.state.symbolTable.lookup(ident.name);
    // Check if this identifier is a function - return its address (function pointer)
    if (sym && sym.kind === 'function') {
      const temp = this.context.state.temp();
      const block = new IL.BasicBlock(this.context.state.label('func_addr'));
      block.add(new IL.LoadAddrInstruction(temp, ident.name));
      return { blocks: [block], result: temp };
    }
    // Check if this is a function pointer variable - load its stored address
    if (sym && (sym.isFunctionPointer || sym.type === 'function_pointer')) {
      return this.context.callMemoryTranslator.translateLoadFunctionPointer(ident.name);
    }
    const temp = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('ident'));
    const isFloat = sym && sym.type === 'float';
    const loadSize = isFloat ? 4 : 2;
    block.add(new IL.LoadInstruction(temp, ident.name, loadSize));
    return { blocks: [block], result: temp, isFloat };
  }

  /**
    * Translate a function call node (dispatches to direct or indirect call)
    * @param {AST.CallNode} call - Call node
    * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
    */
   translateCallNode(call) {
    const calleeName = call.callee?.name || (typeof call.callee === 'string' ? call.callee : null);
    if (calleeName && this.context.state.symbolTable) {
      const sym = this.context.state.symbolTable.lookup(calleeName);
      if (sym && (sym.type === 'function_pointer' || sym.isFunctionPointer)) {
        return this.context.callMemoryTranslator.translateFuncPtrCallForRegularNode(call);
      }
    }
    // Check if callee is an IndexNode (array element call like fp[0]())
    if (call.callee instanceof AST.IndexNode) {
      return this.context.callMemoryTranslator.translateFuncPtrCallForIndexCall(call);
    }
    // Handle float-returning standard library functions with special IR generation
    const floatFuncMapping = {
      'fabsf': { internal: '_float_abs', hasResultPtr: true },
      'floorf': { internal: '_float_floor', hasResultPtr: true },
      'ceilf': { internal: '_float_ceil', hasResultPtr: true },
      'modff': { internal: '_float_modf', hasResultPtr: true },
      'frexpf': { internal: '_float_frexpf', hasResultPtr: true },
      'ldexpf': { internal: '_float_ldexpf', hasResultPtr: true },
      'sinf': { internal: '_float_sinf', hasResultPtr: true },
      'cosf': { internal: '_float_cosf', hasResultPtr: true },
      'tanf': { internal: '_float_tanf', hasResultPtr: true },
      'cotf': { internal: '_float_cotf', hasResultPtr: true },
      'asinf': { internal: '_float_asinf', hasResultPtr: true },
      'acosf': { internal: '_float_acosf', hasResultPtr: true },
      'atanf': { internal: '_float_atanf', hasResultPtr: true },
      'atan2f': { internal: '_float_atan2f', hasResultPtr: true },
      'sqrtf': { internal: '_float_sqrtf', hasResultPtr: true },
      'expf': { internal: '_float_expf', hasResultPtr: true },
      'powf': { internal: '_float_powf', hasResultPtr: true },
      'logf': { internal: '_float_logf', hasResultPtr: true },
      'log10f': { internal: '_float_log10f', hasResultPtr: true }
    };
    if (floatFuncMapping[calleeName]) {
      return this.translateFloatCall(calleeName, floatFuncMapping[calleeName], call.args);
    }
    return this.context.callMemoryTranslator.translateCall(call);
  }

  /**
   * Translate a binary operation expression
   * @param {AST.BinaryOpNode} binOp - Binary operation
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateBinaryOp(binOp) {
    if (binOp.op === '=') {
      return this.translateAssignment(binOp);
    }

    const compoundAssignOps = ['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
    if (compoundAssignOps.includes(binOp.op)) {
      return this.translateCompoundAssignment(binOp);
    }

    const leftResult = this.translateExpression(binOp.left);
    const rightResult = this.translateExpression(binOp.right);

    const isFloatOp = leftResult.isFloat || rightResult.isFloat;
    if (isFloatOp) {
      const floatOpMapping = {
        '+': '_float_add', '-': '_float_sub', '*': '_float_mul',
        '/': '_float_div', '%': '_float_mod'
      };
      const floatCmpMapping = {
        'eq': '_float_eq', 'ne': '_float_ne',
        'lt': '_float_lt', 'gt': '_float_gt',
        'le': '_float_le', 'ge': '_float_ge'
      };
      const funcName = floatOpMapping[binOp.op];
      if (funcName) {
        const resultLabel = this.context.floatCollector.emitFloatData(0);
        const resultTemp = this.context.state.temp();
        const block = new IL.BasicBlock(this.context.state.label('fltop'));
        block.add(new IL.LoadAddrInstruction(resultTemp, resultLabel));
        block.add(new IL.CallInstruction(funcName, resultTemp, leftResult.result, rightResult.result, CALLING_CONVENTION_DEFAULT, { floatResult: true }));
        return {
          blocks: [...leftResult.blocks, ...rightResult.blocks, block],
          result: resultTemp,
          isFloat: true
        };
      }
      const cmpFuncName = floatCmpMapping[binOp.op];
      if (cmpFuncName) {
        const dest = this.context.state.temp();
        const block = new IL.BasicBlock(this.context.state.label('fltcmp'));
        block.add(new IL.CallInstruction(cmpFuncName, dest, leftResult.result, rightResult.result, CALLING_CONVENTION_DEFAULT));
        return {
          blocks: [...leftResult.blocks, ...rightResult.blocks, block],
          result: dest,
          isFloat: false
        };
      }
    }

    const opMapping = {
      '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod',
      '<<': 'shl', '>>': 'shr'
    };
    const mappedOp = opMapping[binOp.op] || binOp.op;
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('binop'));
    block.add(new IL.BinaryOpInstruction(dest, mappedOp, leftResult.result, rightResult.result));
    return {
      blocks: [...leftResult.blocks, ...rightResult.blocks, block],
      result: dest
    };
  }

  /**
    * Translate an assignment expression
    * @param {AST.BinaryOpNode} assign - Assignment expression (op is '=')
    * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
    */
   translateAssignment(assign) {
     const rightResult = this.translateExpression(assign.right);
     const block = new IL.BasicBlock(this.context.state.label('assign'));

     let target;
     let isFuncPtrTarget = false;
     if (assign.left instanceof AST.IdentifierNode) {
       target = assign.left.name;
       // Check if target is a function pointer variable
       const targetSym = this.context.state.symbolTable.lookup(target);
       if (targetSym && (targetSym.isFunctionPointer || targetSym.type === 'function_pointer')) {
         isFuncPtrTarget = true;
       }
     } else if (assign.left instanceof AST.MemberNode) {
       // Struct member assignment: p.x = value
       const fieldName = assign.left.field.name;
       const obj = assign.left.object;

       // Look up struct definition for offset
       let fieldOffset = 0;
       if (obj instanceof AST.IdentifierNode) {
         const sym = this.context.state.symbolTable.lookup(obj.name);
         if (sym && sym.structType) {
           const structDef = this.context.typeRegistry.structRegistry.get(sym.structType);
           if (structDef) {
             fieldOffset = structDef.fieldOffsets.get(fieldName) || 0;
           }
         }
       }

       // Get address of struct, add offset, store value
       if (obj instanceof AST.IdentifierNode) {
         const sym = this.context.state.symbolTable.lookup(obj.name);
         if (sym && sym.structType) {
           const baseAddr = this.context.state.temp();
           block.add(new IL.LoadAddrInstruction(baseAddr, obj.name));
           if (fieldOffset > 0) {
             const addrTemp = this.context.state.temp();
             block.add(new IL.BinaryOpInstruction(addrTemp, 'add', baseAddr, fieldOffset));
             block.add(new IL.DerefStoreInstruction(addrTemp, rightResult.result));
           } else {
             block.add(new IL.DerefStoreInstruction(baseAddr, rightResult.result));
           }
           return {
             blocks: [...rightResult.blocks, block],
             result: rightResult.result
           };
         }
       }

       // For computed pointer object (*ptr): add offset, store
       const objResult = this.translateExpression(obj);
       block.add(...objResult.blocks);
       if (fieldOffset > 0) {
         const addrTemp = this.context.state.temp();
         block.add(new IL.BinaryOpInstruction(addrTemp, 'add', objResult.result, fieldOffset));
         block.add(new IL.DerefStoreInstruction(addrTemp, rightResult.result));
       } else {
         block.add(new IL.DerefStoreInstruction(objResult.result, rightResult.result));
       }
       return {
         blocks: [...objResult.blocks, ...rightResult.blocks, block],
         result: rightResult.result
       };
     } else if (assign.left instanceof AST.PointerMemberNode) {
       // Pointer member assignment: ptr->x = value
       const fieldName = assign.left.field.name;
       const obj = assign.left.object;

       // Look up struct definition for offset
       let fieldOffset = 0;
       if (obj instanceof AST.IdentifierNode) {
         const sym = this.context.state.symbolTable.lookup(obj.name);
         if (sym && sym.structType) {
           const structDef = this.context.typeRegistry.structRegistry.get(sym.structType);
           if (structDef) {
             fieldOffset = structDef.fieldOffsets.get(fieldName) || 0;
           }
         }
       }

       // Get address from pointer variable, add offset, store
       if (obj instanceof AST.IdentifierNode) {
         const sym = this.context.state.symbolTable.lookup(obj.name);
         if (sym && (sym.pointerDepth > 0 || sym.type === 'pointer')) {
           const ptrResult = this.translateExpression(obj);
           block.add(...ptrResult.blocks);
           // Dereference pointer variable to get actual address
           const actualAddr = this.context.state.temp();
           block.add(new IL.DerefLoadInstruction(actualAddr, ptrResult.result));
           if (fieldOffset > 0) {
             const addrTemp = this.context.state.temp();
             block.add(new IL.BinaryOpInstruction(addrTemp, 'add', actualAddr, fieldOffset));
             block.add(new IL.DerefStoreInstruction(addrTemp, rightResult.result));
           } else {
             block.add(new IL.DerefStoreInstruction(actualAddr, rightResult.result));
           }
           return {
             blocks: [...ptrResult.blocks, ...rightResult.blocks, block],
             result: rightResult.result
           };
         }
       }

       // For computed pointer object: add offset, store
       const objResult = this.translateExpression(obj);
       block.add(...objResult.blocks);
       if (fieldOffset > 0) {
         const addrTemp = this.context.state.temp();
         block.add(new IL.BinaryOpInstruction(addrTemp, 'add', objResult.result, fieldOffset));
         block.add(new IL.DerefStoreInstruction(addrTemp, rightResult.result));
       } else {
         block.add(new IL.DerefStoreInstruction(objResult.result, rightResult.result));
       }
       return {
         blocks: [...objResult.blocks, ...rightResult.blocks, block],
         result: rightResult.result
       };
     } else {
       const leftResult = this.translateExpression(assign.left);
       block.add(new IL.BinaryOpInstruction('addr', 'addr', leftResult.result, 'sp'));
       block.add(new IL.StoreInstruction('mem', rightResult.result));
       return {
         blocks: [...leftResult.blocks, ...rightResult.blocks, block],
         result: rightResult.result
       };
     }

      // Handle function pointer assignment: store the address
      if (isFuncPtrTarget) {
        block.add(new IL.LoadAddrInstruction('fp_addr', target));
        block.add(new IL.BinaryOpInstruction('fp_addr', 'addr', 'fp_addr', rightResult.result));
      } else {
        const targetSym = this.context.state.symbolTable.lookup(target);
        if (targetSym && targetSym.type === 'float') {
          block.add(new IL.StoreInstruction(target, rightResult.result, 4));
        } else {
          block.add(new IL.StoreInstruction(target, rightResult.result));
        }
      }
      return {
        blocks: [...rightResult.blocks, block],
        result: rightResult.result
      };
    }

   /**
    * Translate a compound assignment expression (x op= y => x = x op y)
    * @param {AST.BinaryOpNode} compAssign - Compound assignment expression
    * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
    */
   translateCompoundAssignment(compAssign) {
     const compoundOpToIL = {
       '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod',
       '&': 'and', '|': 'or', '^': 'xor',
       '<<': 'shl', '>>': 'shr'
     };
     const baseOp = compoundOpToIL[compAssign.op.replace('=', '')];

     const rightResult = this.translateExpression(compAssign.right);
     const blocks = [...rightResult.blocks];

     let varName = null;
     let isFuncPtrTarget = false;
     let isFloatVar = false;
     if (compAssign.left instanceof AST.IdentifierNode) {
       varName = compAssign.left.name;
       const targetSym = this.context.state.symbolTable.lookup(varName);
       if (targetSym && (targetSym.isFunctionPointer || targetSym.type === 'function_pointer')) {
         isFuncPtrTarget = true;
       }
       if (targetSym && targetSym.type === 'float') {
         isFloatVar = true;
       }
     }

      if (varName && isFloatVar) {
        const compoundOpToFloatFunc = {
          '+': '_float_add', '-': '_float_sub', '*': '_float_mul',
          '/': '_float_div', '%': '_float_mod'
        };
        const floatFuncName = compoundOpToFloatFunc[compAssign.op.replace('=', '')];
        if (floatFuncName) {
          const resultLabel = this.context.floatCollector.emitFloatData(0);
          const resultTemp = this.context.state.temp();
          const origTemp = this.context.state.temp();
          const loadBlock = new IL.BasicBlock(this.context.state.label('compassign_load'));
          const opBlock = new IL.BasicBlock(this.context.state.label('compassign_op'));
          const storeBlock = new IL.BasicBlock(this.context.state.label('compassign_store'));

          loadBlock.add(new IL.LoadAddrInstruction(resultTemp, resultLabel));
          loadBlock.add(new IL.LoadInstruction(origTemp, varName));
          opBlock.add(new IL.CallInstruction(floatFuncName, resultTemp, origTemp, rightResult.result, CALLING_CONVENTION_DEFAULT, { floatResult: true }));
          storeBlock.add(new IL.StoreInstruction(varName, resultTemp, 4));

          return {
            blocks: [...blocks, loadBlock, opBlock, storeBlock],
            result: resultTemp
          };
        }
      }

     if (varName) {
       const loadBlock = new IL.BasicBlock(this.context.state.label('compassign_load'));
       const opBlock = new IL.BasicBlock(this.context.state.label('compassign_op'));
       const storeBlock = new IL.BasicBlock(this.context.state.label('compassign_store'));

       const origTemp = this.context.state.temp();
       loadBlock.add(new IL.LoadInstruction(origTemp, varName));

       const resultTemp = this.context.state.temp();
       opBlock.add(new IL.BinaryOpInstruction(resultTemp, baseOp, origTemp, rightResult.result));

       if (isFuncPtrTarget) {
         storeBlock.add(new IL.LoadAddrInstruction('fp_addr', varName));
         storeBlock.add(new IL.BinaryOpInstruction('fp_addr', 'addr', 'fp_addr', resultTemp));
       } else {
         storeBlock.add(new IL.StoreInstruction(varName, resultTemp));
       }

       return {
         blocks: [...blocks, loadBlock, opBlock, storeBlock],
         result: resultTemp
       };
     }

    const leftResult = this.translateExpression(compAssign.left);
    blocks.push(...leftResult.blocks);

    const loadBlock = new IL.BasicBlock(this.context.state.label('compassign_load'));
    const opBlock = new IL.BasicBlock(this.context.state.label('compassign_op'));
    const storeBlock = new IL.BasicBlock(this.context.state.label('compassign_store'));

    const origTemp = this.context.state.temp();
    loadBlock.add(new IL.LoadInstruction(origTemp, leftResult.result));

    const resultTemp = this.context.state.temp();
    opBlock.add(new IL.BinaryOpInstruction(resultTemp, baseOp, origTemp, rightResult.result));

    const addrTemp = this.context.state.temp();
    storeBlock.add(new IL.BinaryOpInstruction('addr', 'addr', leftResult.result, 'sp'));
    storeBlock.add(new IL.StoreInstruction('mem', resultTemp));

    return {
      blocks: [...blocks, loadBlock, opBlock, storeBlock],
      result: resultTemp
    };
  }

  /**
    * Translate a float-returning function call with special IR generation.
    * Emits a float data label, calls the internal _float_* function,
    * and returns the result pointer with isFloat: true.
    * @param {string} cFuncName - C function name (e.g., 'fabsf')
    * @param {Object} mapping - Mapping with internal function name and hasResultPtr flag
    * @param {AST.ASTNode[]} args - Argument AST nodes
    * @returns {{blocks: IL.BasicBlock[], result: string, isFloat: boolean}} Blocks and result register
    */
   translateFloatCall(cFuncName, mapping, args) {
     const internalFuncName = mapping.internal;
     const hasResultPtr = mapping.hasResultPtr;
     const argsArray = Array.isArray(args) ? args : [args];
     const operandResult = this.translateExpression(argsArray[0]);
     const blocks = [...operandResult.blocks];

     const resultLabel = this.context.floatCollector.emitFloatData(0);
     const resultTemp = this.context.state.temp();
     const block = new IL.BasicBlock(this.context.state.label('fltc'));
     block.add(new IL.LoadAddrInstruction(resultTemp, resultLabel));

     let callArgs;
     if (cFuncName === 'modff') {
       const iptrResult = this.translateExpression(argsArray[1]);
       blocks.push(...iptrResult.blocks);
       const iptrTemp = this.context.state.temp();
       const iptrBlock = new IL.BasicBlock(this.context.state.label('modf_iptr'));
       iptrBlock.add(new IL.LoadAddrInstruction(iptrTemp, iptrResult.result));
       blocks.push(iptrBlock);
       callArgs = [resultTemp, iptrTemp, operandResult.result];
     } else if (cFuncName === 'frexpf') {
       const expResult = this.translateExpression(argsArray[1]);
       blocks.push(...expResult.blocks);
       const expTemp = this.context.state.temp();
       const expBlock = new IL.BasicBlock(this.context.state.label('frexp_exp'));
       expBlock.add(new IL.LoadAddrInstruction(expTemp, expResult.result));
       blocks.push(expBlock);
       callArgs = [resultTemp, operandResult.result, expTemp];
     } else if (cFuncName === 'ldexpf') {
       const expResult = this.translateExpression(argsArray[1]);
       blocks.push(...expResult.blocks);
       callArgs = [resultTemp, operandResult.result, expResult.result];
     } else if (cFuncName === 'atan2f') {
       const yResult = this.translateExpression(argsArray[0]);
       const xResult = this.translateExpression(argsArray[1]);
       blocks.push(...yResult.blocks, ...xResult.blocks);
       callArgs = [resultTemp, yResult.result, xResult.result];
     } else if (cFuncName === 'powf') {
       const baseResult = this.translateExpression(argsArray[0]);
       const expResult = this.translateExpression(argsArray[1]);
       blocks.push(...baseResult.blocks, ...expResult.blocks);
       callArgs = [resultTemp, baseResult.result, expResult.result];
     } else {
       callArgs = [resultTemp, operandResult.result];
     }

    block.add(new IL.CallInstruction(internalFuncName, ...callArgs, CALLING_CONVENTION_DEFAULT, { floatResult: true }));
    return {
      blocks: [...blocks, block],
      result: resultTemp,
      isFloat: true
    };
  }

  /**
    * Translate a unary operation expression
   * @param {AST.UnaryOpNode} unaryOp - Unary operation
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
   translateUnaryOp(unaryOp) {
    // Handle postfix increment/decrement (inc/dec)
    if (unaryOp.op === 'inc' || unaryOp.op === 'dec') {
      return this.translateIncDec(unaryOp);
    }
    const operandResult = this.translateExpression(unaryOp.operand);
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('unop'));
    block.add(new IL.UnaryOpInstruction(dest, unaryOp.op, operandResult.result));
    return {
      blocks: [...operandResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate postfix increment/decrement (inc/dec)
   * @param {AST.UnaryOpNode} unaryOp - Increment/decrement operation
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateIncDec(unaryOp) {
    const operandResult = this.translateExpression(unaryOp.operand);
    const originalTemp = operandResult.result;
    const dest = this.context.state.temp();
    const blocks = [...operandResult.blocks];

    // Get the variable name from the operand (should be an identifier)
    let varName = null;
    const operand = unaryOp.operand;
    if (operand instanceof AST.IdentifierNode) {
      varName = operand.name;
    }

    if (varName) {
      // For postfix inc/dec: load original value, modify, store back
      const addSubOp = unaryOp.op === 'inc' ? 'add' : 'sub';
      const modifiedTemp = this.context.state.temp();
      const storeBlock = new IL.BasicBlock(this.context.state.label('incdec'));

      // Calculate modified value: original + 1 or original - 1
      storeBlock.add(new IL.BinaryOpInstruction(modifiedTemp, addSubOp, originalTemp, 1));

      // Store back to variable
      storeBlock.add(new IL.StoreInstruction(varName, modifiedTemp));

      // Return original value
      return {
        blocks: [...blocks, storeBlock],
        result: originalTemp
      };
    } else {
      // For expressions (like *(p++)): just return the operand
      return operandResult;
    }
  }

  /**
   * Translate a conditional (ternary) expression
   * @param {Object} cond - Conditional expression from parser
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateConditional(cond) {
    const dest = this.context.state.temp();
    const trueLabel = this.context.state.label('true');
    const falseLabel = this.context.state.label('false');
    const endLabel = this.context.state.label('endcond');

    const condResult = this.translateExpression(cond.condition);
    const blocks = [...condResult.blocks];

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, falseLabel));

    const trueResult = this.translateExpression(cond.trueBranch);
    blocks.push(...trueResult.blocks);
    blocks[blocks.length - 1].add(new IL.StoreInstruction(dest, trueResult.result));
    blocks.push(new IL.BasicBlock(this.context.state.label('jmp'), [
      new IL.JumpInstruction(endLabel)
    ]));

    blocks.push(new IL.BasicBlock(falseLabel, []));
    const falseResult = this.translateExpression(cond.falseBranch);
    blocks.push(...falseResult.blocks);
    blocks[blocks.length - 1].add(new IL.StoreInstruction(dest, falseResult.result));

    blocks.push(new IL.BasicBlock(endLabel, []));
    blocks[blocks.length - 1].add(new IL.LoadInstruction(dest, dest));

    return { blocks, result: dest };
  }

  /**
   * Translate expression to a simple value (for initializers)
   * @param {AST.ASTNode} expr - Expression AST node
   * @returns {*} Value
   */
  translateExpressionValue(expr) {
    if (expr instanceof AST.LiteralNode) {
      return expr.value;
    }
    return null;
  }
}
