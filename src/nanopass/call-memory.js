import * as AST from '../ast/nodes.js';
import * as IL from './il.js';
import { IntrinsicHandler, IntrinsicMap } from './intrinsics.js';

/**
 * Handles function calls, memory access (index/member/address-of/deref),
 * and function pointer operations.
 */
export class CallAndMemoryTranslator {
  /**
   * Creates a new call and memory translator
   * @param {Object} context - TranslationContext
   * @param {Object} expressionTranslator - ExpressionTranslator instance
   */
  constructor(context, expressionTranslator) {
    this.context = context;
    this.expressionTranslator = expressionTranslator;
  }

  // ==================== Call Methods ====================

  /**
   * Translate a regular function call expression
   * @param {AST.CallNode} call - Function call
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateCall(call) {
    const blocks = [];
    const callTarget = call.callee.name || call.callee;
    const args = Array.isArray(call.args) ? call.args : [];

    if (IntrinsicMap[callTarget]) {
      return IntrinsicHandler.translateIntrinsic(callTarget, args, blocks,
        this.expressionTranslator.translateExpression.bind(this.expressionTranslator),
        this.context.state.label.bind(this.context.state),
        this.context.state.temp.bind(this.context.state));
    }

    for (const arg of args) {
      const argResult = this.expressionTranslator.translateExpression(arg);
      blocks.push(...argResult.blocks);
      blocks.push(new IL.BasicBlock(this.context.state.label('arg'), [
        new IL.PushInstruction(argResult.result)
      ]));
    }

    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('call'));
    const pushedRegs = [];
    for (let i = 0; i < args.length; i++) {
      pushedRegs.push(`arg${i}`);
    }
    block.add(new IL.CallInstruction(callTarget, pushedRegs));
    block.add(new IL.LoadInstruction(dest, 'ret_val'));
    return { blocks: [...blocks, block], result: dest };
  }

  /**
   * Translate a call through a function pointer
   * @param {AST.FunctionPointerCallNode} fpCall - Function pointer call
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateFuncPtrCall(fpCall) {
    const blocks = [];
    const args = Array.isArray(fpCall.args) ? fpCall.args : [];

    const pointerResult = this.expressionTranslator.translateExpression(fpCall.pointer);
    blocks.push(...pointerResult.blocks);

    for (const arg of args) {
      const argResult = this.expressionTranslator.translateExpression(arg);
      blocks.push(...argResult.blocks);
      blocks.push(new IL.BasicBlock(this.context.state.label('arg'), [
        new IL.PushInstruction(argResult.result)
      ]));
    }

    const dest = this.context.state.temp();
    const pushedRegs = [];
    for (let i = 0; i < args.length; i++) {
      pushedRegs.push(`arg${i}`);
    }
    const block = new IL.BasicBlock(this.context.state.label('funcptrcall'));
    block.add(new IL.CallIndirectInstruction(pointerResult.result, pushedRegs));
    block.add(new IL.LoadInstruction(dest, 'ret_val'));
    return { blocks: [...blocks, block], result: dest };
  }

  /**
   * Translate a regular call node that is actually a function pointer call
   * @param {AST.CallNode} call - Call node with function pointer callee
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateFuncPtrCallForRegularNode(call) {
    return this.translateFuncPtrCall({
      ...call,
      callee: { name: call.callee.name || call.callee }
    });
  }

  /**
   * Translate a call through a function pointer array element (fp[i](args))
   * Handles calls like fp[0](5) where fp is an array of function pointers
   * @param {AST.CallNode} call - Call node with IndexNode callee
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateFuncPtrCallForIndexCall(call) {
    const blocks = [];
    const args = Array.isArray(call.args) ? call.args : [];

    // Translate the index expression (e.g., fp[0]) to get the function pointer address
    const indexResult = this.expressionTranslator.translateExpression(call.callee);
    blocks.push(...indexResult.blocks);

    // Translate arguments
    for (const arg of args) {
      const argResult = this.expressionTranslator.translateExpression(arg);
      blocks.push(...argResult.blocks);
      blocks.push(new IL.BasicBlock(this.context.state.label('arg'), [
        new IL.PushInstruction(argResult.result)
      ]));
    }

    // Generate the call through the function pointer
    const dest = this.context.state.temp();
    const pushedRegs = [];
    for (let i = 0; i < args.length; i++) {
      pushedRegs.push(`arg${i}`);
    }
    const block = new IL.BasicBlock(this.context.state.label('funcptrcall'));
    block.add(new IL.CallIndirectInstruction(indexResult.result, pushedRegs));
    block.add(new IL.LoadInstruction(dest, 'ret_val'));
    return { blocks: [...blocks, block], result: dest };
  }

  // ==================== Memory Access Methods ====================

  /**
   * Translate an array index expression
   * @param {AST.IndexNode} index - Index expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateIndex(index) {
    const baseResult = this.expressionTranslator.translateExpression(index.base);
    const idxResult = this.expressionTranslator.translateExpression(index.index);
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('index'));
    const elemSize = this.inferElementSize(index.base);
    block.add(new IL.IndexedLoadInstruction(dest, baseResult.result, idxResult.result, elemSize));
    return {
      blocks: [...baseResult.blocks, ...idxResult.blocks, block],
      result: dest
    };
  }

  /**
   * Infer element size from an expression's type
   * @param {AST.ASTNode} expr - Expression to infer type from
   * @returns {number} Element size in bytes
   */
  inferElementSize(expr) {
    if (expr instanceof AST.IdentifierNode) {
      const sym = this.context.state.symbolTable.lookup(expr.name);
      if (sym) {
        if (sym.structType) {
          const structDef = this.context.typeRegistry.structRegistry.get(sym.structType);
          if (structDef) {
            return structDef.size;
          }
        }
        return sym.elemSize || 1;
      }
    }
    return 1;
  }

  /**
   * Translate a member access expression (struct.field)
   * @param {AST.MemberNode} member - Member access
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateMember(member) {
    const objResult = this.expressionTranslator.translateExpression(member.object);
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('member'));

    // Look up the object's type to find struct definition
    let structDef = null;
    let fieldOffset = 0;
    const fieldName = member.field.name;

    if (member.object instanceof AST.IdentifierNode) {
      const sym = this.context.state.symbolTable.lookup(member.object.name);
      if (sym && sym.structType) {
        structDef = this.context.typeRegistry.structRegistry.get(sym.structType);
        if (structDef) {
          fieldOffset = structDef.fieldOffsets.get(fieldName) || 0;
        }
      }
    }

    if (fieldOffset === 0) {
      block.add(new IL.BinaryOpInstruction(dest, '.', objResult.result, fieldName));
    } else {
      // Load base address, add offset, dereference
      const addrTemp = this.context.state.temp();
      block.add(new IL.BinaryOpInstruction(addrTemp, 'add', objResult.result, fieldOffset));
      block.add(new IL.DerefLoadInstruction(dest, addrTemp));
    }

    return {
      blocks: [...objResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate an address-of expression (&expr)
   * @param {AST.AddressOfNode} addr - Address-of expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateAddressOf(addr) {
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('addr'));
    if (addr.operand instanceof AST.IdentifierNode) {
      // Check if this is the address of a function (returns function pointer)
      const sym = this.context.state.symbolTable.lookup(addr.operand.name);
      if (sym && sym.kind === 'function') {
        // Get the address of a function - this IS a function pointer value
        block.add(new IL.LoadAddrInstruction(dest, addr.operand.name));
        return { blocks: [block], result: dest };
      }
      // Regular variable - get its address
      block.add(new IL.LoadAddrInstruction(dest, addr.operand.name));
    } else if (addr.operand instanceof AST.IndexNode) {
      const baseResult = this.expressionTranslator.translateExpression(addr.operand.base);
      const idxResult = this.expressionTranslator.translateExpression(addr.operand.index);
      const elemSize = this.inferElementSize(addr.operand.base);
      const addrTemp = this.context.state.temp();
      block.add(new IL.BinaryOpInstruction(addrTemp, 'add', baseResult.result, idxResult.result));
      block.add(new IL.LoadAddrInstruction(dest, addrTemp));
      return {
        blocks: [...baseResult.blocks, ...idxResult.blocks, block],
        result: dest
      };
    } else {
      const operandResult = this.expressionTranslator.translateExpression(addr.operand);
      block.add(new IL.LoadAddrInstruction(dest, operandResult.result));
      return {
        blocks: [...operandResult.blocks, block],
        result: dest
      };
    }
    return { blocks: [block], result: dest };
  }

  /**
   * Translate a dereference expression (*expr)
   * @param {AST.DerefNode} deref - Dereference expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateDeref(deref) {
    const ptrResult = this.expressionTranslator.translateExpression(deref.operand);
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('deref'));
    block.add(new IL.DerefLoadInstruction(dest, ptrResult.result));
    return {
      blocks: [...ptrResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate a pointer member access expression (ptr->field)
   * @param {AST.PointerMemberNode} pmem - Pointer member access
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translatePointerMember(pmem) {
    const ptrResult = this.expressionTranslator.translateExpression(pmem.object);
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('pmem'));

    let structDef = null;
    let fieldOffset = 0;
    const fieldName = pmem.field.name;

    if (pmem.object instanceof AST.IdentifierNode) {
      const sym = this.context.state.symbolTable.lookup(pmem.object.name);
      if (sym && sym.structType) {
        structDef = this.context.typeRegistry.structRegistry.get(sym.structType);
        if (structDef) {
          fieldOffset = structDef.fieldOffsets.get(fieldName) || 0;
        }
      }
    }

    if (fieldOffset === 0) {
      block.add(new IL.BinaryOpInstruction(dest, '->', ptrResult.result, fieldName));
    } else {
      const addrTemp = this.context.state.temp();
      block.add(new IL.BinaryOpInstruction(addrTemp, 'add', ptrResult.result, fieldOffset));
      block.add(new IL.DerefLoadInstruction(dest, addrTemp));
    }

    return {
      blocks: [...ptrResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate loading a function pointer value from a variable
   * Used when reading from a function pointer variable
   * @param {string} varName - Variable name holding the function pointer
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateLoadFunctionPointer(varName) {
    const dest = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('load_func_ptr'));
    // Load the function address stored in the function pointer variable
    // First get the address of the variable, then dereference to get the stored address
    block.add(new IL.LoadAddrInstruction('fp_addr', varName));
    block.add(new IL.DerefLoadInstruction(dest, 'fp_addr'));
    return { blocks: [block], result: dest };
  }
}
