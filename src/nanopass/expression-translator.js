import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

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
    block.add(new IL.LoadInstruction(temp, ident.name));
    return { blocks: [block], result: temp };
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

    const opMapping = {
      '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod',
      '<<': 'shl', '>>': 'shr'
    };
    const mappedOp = opMapping[binOp.op] || binOp.op;

    const leftResult = this.translateExpression(binOp.left);
    const rightResult = this.translateExpression(binOp.right);
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
      block.add(new IL.StoreInstruction(target, rightResult.result));
    }
    return {
      blocks: [...rightResult.blocks, block],
      result: rightResult.result
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
