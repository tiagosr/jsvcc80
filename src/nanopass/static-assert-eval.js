import * as AST from '../ast/nodes.js';

/**
 * Safely look up a symbol from a symbol table (supports both lookup() and get() APIs)
 * @param {Object} symbolTable - Symbol table with lookup or get method
 * @param {string} name - Symbol name
 * @returns {Object|null} Symbol or null
 */
function lookupSymbol(symbolTable, name) {
  if (!symbolTable) return null;
  if (typeof symbolTable.lookup === 'function') return symbolTable.lookup(name);
  if (typeof symbolTable.get === 'function') return symbolTable.get(name);
  return null;
}

/**
 * Evaluates compile-time expressions for static_assert.
 * Returns a numeric value or null if the expression cannot be evaluated at compile time.
 */
export class StaticAssertEvaluator {
  /**
   * Creates a new static assert evaluator
   * @param {Object} context - TranslationContext with symbol table and type registry
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Evaluate an expression at compile time
   * @param {AST.ASTNode} expr - Expression to evaluate
   * @returns {number|null} Numeric result or null if cannot evaluate
   */
  evaluate(expr) {
    if (!expr) return 0;

    if (expr instanceof AST.LiteralNode) {
      if (typeof expr.value === 'number') return expr.value;
      return null;
    }

    if (expr instanceof AST.IdentifierNode) {
      const sym = lookupSymbol(this.context.state?.symbolTable, expr.name);
      if (sym && sym.kind === 'constant' && typeof sym.value === 'number') {
        return sym.value;
      }
      if (sym && sym.kind === 'enum' && typeof sym.value === 'number') {
        return sym.value;
      }
      return null;
    }

    if (expr instanceof AST.BinaryOpNode) {
      const left = this.evaluate(expr.left);
      const right = this.evaluate(expr.right);
      if (left === null || right === null) return null;

      switch (expr.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right !== 0 ? left / right : null;
        case '%': return right !== 0 ? left % right : null;
        case 'and': return left & right;
        case 'or': return left | right;
        case 'xor': return left ^ right;
        case 'eq': return (left === right) ? 1 : 0;
        case 'ne': return (left !== right) ? 1 : 0;
        case 'lt': return (left < right) ? 1 : 0;
        case 'gt': return (left > right) ? 1 : 0;
        case 'le': return (left <= right) ? 1 : 0;
        case 'ge': return (left >= right) ? 1 : 0;
        case '<<': return left << right;
        case '>>': return left >> right;
        case 'land': return (left && right) ? 1 : 0;
        case 'lor': return (left || right) ? 1 : 0;
        default: return null;
      }
    }

    if (expr instanceof AST.UnaryOpNode) {
      const operand = this.evaluate(expr.operand);
      if (operand === null) return null;

      switch (expr.op) {
        case 'neg': return -operand;
        case 'lognot': return (operand === 0) ? 1 : 0;
        case 'not': return ~operand;
        case 'deref': return null;
        default: return null;
      }
    }

    if (expr instanceof AST.SizeOfNode) {
      if (this.context.typeQueryHandler?.translateSizeOf) {
        const operand = expr.operand;
        let size;
        if (operand instanceof AST.TypeSpecNode) {
          size = operand.getSize(this.context.typeRegistry?.structRegistry);
        } else if (operand instanceof AST.IdentifierNode) {
          const sym = lookupSymbol(this.context.state?.symbolTable, operand.name);
          if (sym) size = sym.size || sym.elemSize || 2;
          else size = 2;
        } else if (typeof operand === 'string') {
          size = this.context.typeRegistry?.structRegistry?.get(operand)?.size || 2;
        } else {
          size = 2;
        }
        return size;
      }
      return 2;
    }

    if (expr instanceof AST.OffsetOfNode) {
      if (this.context.typeQueryHandler?.translateOffsetOf) {
        const structDef = this.context.typeRegistry?.structRegistry?.get(expr.typeName);
        if (structDef) {
          const fieldOffset = structDef.fieldOffsets?.get(expr.fieldName);
          if (fieldOffset !== undefined) return fieldOffset;
        }
      }
      return 0;
    }

    if (expr instanceof AST.TypeOfNode) {
      const op = expr.operand;
      let size = 2;
      if (op instanceof AST.IdentifierNode) {
        const sym = lookupSymbol(this.context.state?.symbolTable, op.name);
        if (sym) size = sym.size || sym.elemSize || 2;
      }
      return size;
    }

    if (expr instanceof AST.CastNode) {
      return this.evaluate(expr.operand);
    }

    if (expr && typeof expr === 'object' && expr.type === 'Conditional') {
      const cond = this.evaluate(expr.condition);
      if (cond === null) return null;
      const trueVal = this.evaluate(expr.trueExpr);
      const falseVal = this.evaluate(expr.falseExpr);
      if (trueVal === null || falseVal === null) return null;
      return cond !== 0 ? trueVal : falseVal;
    }

    return null;
  }
}
