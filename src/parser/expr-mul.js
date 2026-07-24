import * as AST from '../ast/nodes.js';
import { Parser, seq, map, many, lazy, pred, lit } from './combinators.js';

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

/**
 * Build multiplicative expression rule (* / %)
 * @param {CPegParser} ctx 
 */
function buildMultiplicativeExpr(ctx) {
  ctx.ruleRefs.multiplicativeExpr = map(
    seq(
      ctx.ruleRefs.postfixExpr,
      many(seq(
        pred(t => ['*', '/', '%'].includes(t.type)),
        lazy(() => ctx.ruleRefs.multiplicativeExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode(op.type, node, right, locFromToken(op));
      }
      return node;
    }
  );
}

export { buildMultiplicativeExpr };
