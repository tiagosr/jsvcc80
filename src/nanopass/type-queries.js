import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

/**
 * Handles compile-time type queries: sizeof, offsetof, typeof, and casts.
 */
export class TypeQueryHandler {
  /**
   * Creates a new type query handler
   * @param {Object} context - TranslationContext
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Translate a sizeof expression (compile-time constant)
   * @param {AST.SizeOfNode} sizeOf - Sizeof expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateSizeOf(sizeOf) {
    let size;
    const operand = sizeOf.operand;

    if (operand instanceof AST.TypeSpecNode) {
      size = operand.getSize(this.context.typeRegistry.structRegistry);
    } else if (operand instanceof AST.IdentifierNode) {
      if (this.context.typeRegistry.structRegistry.has(operand.name)) {
        size = this.context.typeRegistry.structRegistry.get(operand.name).size;
      } else {
        const sym = this.context.state.symbolTable.lookup(operand.name);
        if (sym) {
          size = sym.size || sym.elemSize || 2;
        } else {
          const resolved = this.context.typeRegistry.resolveType(
            new AST.TypeSpecNode(operand.name, true, false, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } })
          );
          size = resolved.getSize(this.context.typeRegistry.structRegistry);
        }
      }
    } else if (typeof operand === 'string') {
      if (this.context.typeRegistry.structRegistry.has(operand)) {
        size = this.context.typeRegistry.structRegistry.get(operand).size;
      } else {
        const resolved = this.context.typeRegistry.resolveType(
          new AST.TypeSpecNode(operand, true, false, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } })
        );
        size = resolved.getSize(this.context.typeRegistry.structRegistry);
      }
    } else {
      const operandResult = this.context.expressionTranslator.translateExpression(operand);
      const sym = this.lookupSymbolFromExpr(operand);
      if (sym) {
        size = sym.size || sym.elemSize || 2;
      } else {
        size = 2;
      }
      return {
        blocks: operandResult.blocks,
        result: this.createConstBlock(size, operandResult.result)
      };
    }

    const temp = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('sizeof'));
    block.add(new IL.LoadInstruction(temp, size));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate an offsetof expression (compile-time constant)
   * @param {AST.OffsetOfNode} offsetOf - Offsetof expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateOffsetOf(offsetOf) {
    const structDef = this.context.typeRegistry.structRegistry.get(offsetOf.typeName);
    let offset = 0;

    if (structDef) {
      const fieldOffset = structDef.fieldOffsets.get(offsetOf.fieldName);
      if (fieldOffset !== undefined) {
        offset = fieldOffset;
      }
    }

    const temp = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('offsetof'));
    block.add(new IL.LoadInstruction(temp, offset));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate a typeof expression (returns size of the expression's type)
   * @param {AST.TypeOfNode} typeofExpr - Typeof expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateTypeOf(typeofExpr) {
    const operandResult = this.context.expressionTranslator.translateExpression(typeofExpr.operand);
    const sym = this.lookupSymbolFromExpr(typeofExpr.operand);
    let size = 2;

    if (sym) {
      size = sym.size || sym.elemSize || 2;
    }

    const temp = this.context.state.temp();
    const block = new IL.BasicBlock(this.context.state.label('typeof'));
    block.add(new IL.LoadInstruction(temp, size));
    return {
      blocks: [...operandResult.blocks, block],
      result: temp
    };
  }

  /**
   * Translate a C-style cast expression (no IR instruction, passes through)
   * @param {AST.CastNode} cast - Cast expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateCast(cast) {
    // Cast to pointer type: just evaluate the operand (pointer arithmetic handles the cast)
    // Cast to integer type: no explicit IR instruction needed, the value is preserved
    // The type information is used by the codegen to emit proper instructions
    const operandResult = this.context.expressionTranslator.translateExpression(cast.operand);
    return {
      blocks: operandResult.blocks,
      result: operandResult.result
    };
  }

  /**
   * Look up a symbol from an expression (for sizeof/typeof resolution)
   * @param {AST.ASTNode} expr - Expression to look up
   * @returns {Object|null} Symbol info or null
   */
  lookupSymbolFromExpr(expr) {
    if (expr instanceof AST.IdentifierNode) {
      return this.context.state.symbolTable.lookup(expr.name) || null;
    }
    return null;
  }

  /**
   * Create a basic block that loads a constant value
   * @param {number} value - Constant value to load
   * @param {string} resultReg - Result register name
   * @returns {string} Result register name
   */
  createConstBlock(value, resultReg) {
    const block = new IL.BasicBlock(this.context.state.label('const'));
    block.add(new IL.LoadInstruction(resultReg, value));
    return resultReg;
  }

  /**
   * Check if a symbol refers to a function
   * @param {string} name - Symbol name
   * @returns {boolean} True if symbol is a function
   */
  isFunctionSymbol(name) {
    const sym = this.context.state.symbolTable.lookup(name);
    return sym && sym.kind === 'function';
  }

  /**
   * Check if a symbol is a function pointer type
   * @param {string} name - Symbol name
   * @returns {boolean} True if symbol is a function pointer
   */
  isFunctionPointerSymbol(name) {
    const sym = this.context.state.symbolTable.lookup(name);
    return sym && (sym.isFunctionPointer || sym.type === 'function_pointer');
  }
}
