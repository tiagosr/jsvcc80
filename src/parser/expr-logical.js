import * as AST from '../ast/nodes.js';
import { Parser, seq, map, many, lazy, pred, lit } from './combinators.js';

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

/**
 * Build logical AND expression rule (&&)
 * @param {CPegParser} ctx 
 */
function buildLogicalAndExpr(ctx) {
  ctx.ruleRefs.logicalAndExpr = map(
    seq(
      ctx.ruleRefs.bitwiseOrExpr,
      many(seq(
        pred(t => t.type === '&&'),
        lazy(() => ctx.ruleRefs.logicalAndExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('land', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build logical OR expression rule (||)
 * @param {CPegParser} ctx 
 */
function buildLogicalOrExpr(ctx) {
  ctx.ruleRefs.logicalOrExpr = map(
    seq(
      ctx.ruleRefs.logicalAndExpr,
      many(seq(
        pred(t => t.type === '||'),
        lazy(() => ctx.ruleRefs.logicalOrExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('lor', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

export { buildLogicalAndExpr, buildLogicalOrExpr };
