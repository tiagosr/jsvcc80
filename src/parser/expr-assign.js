import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, alt, pred, lit, lazy } from './combinators.js';

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

/**
 * Build assignment expression rule (var = expr)
 * @param {CPegParser} ctx 
 */
function buildAssignmentExpr(ctx) {
  const lhsIdentifier = pred(t => t.type === 'IDENTIFIER');

  ctx.ruleRefs.assignmentExpr = map(
    seq(
      alt(ctx.ruleRefs.conditionalExpr, lhsIdentifier),
      opt(seq(
        pred(t => ['=', '+=', '-=', '*=', '/='].includes(t.type)),
        lazy(() => ctx.ruleRefs.expression)
      ))
    ),
    ([lhs, assign]) => {
      if (assign) {
        const [op, rhs] = assign;
        const resolvedRhs = Array.isArray(rhs) ? (rhs[0] || null) : rhs;
        if (Array.isArray(lhs)) {
          const resolvedLhs = lhs[0];
          return new AST.BinaryOpNode(op.type, resolvedLhs, resolvedRhs, locFromToken(op));
        }
        if (lhs.type === 'Identifier') {
          return new AST.BinaryOpNode(op.type,
            new AST.IdentifierNode(lhs.value, locFromToken(lhs)),
            resolvedRhs, locFromToken(op));
        }
        return new AST.BinaryOpNode(op.type, lhs, resolvedRhs, locFromToken(op));
      }
      if (Array.isArray(lhs)) {
        return lhs[0] || null;
      }
      if (lhs && lhs.type === 'Identifier') {
        return new AST.IdentifierNode(lhs.value, locFromToken(lhs));
      }
      return lhs;
    }
  );
}

export { buildAssignmentExpr };
