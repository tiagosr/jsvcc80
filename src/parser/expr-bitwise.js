import * as AST from '../ast/nodes.js';
import { Parser, seq, map, many, lazy, pred, lit } from './combinators.js';

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

/**
 * Build bitwise AND expression rule (&)
 * @param {CPegParser} ctx 
 */
function buildBitwiseAndExpr(ctx) {
  ctx.ruleRefs.bitwiseAndExpr = map(
    seq(
      ctx.ruleRefs.equalityExpr,
      many(seq(
        pred(t => t.type === '&'),
        lazy(() => ctx.ruleRefs.bitwiseAndExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('and', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build bitwise XOR expression rule (^)
 * @param {CPegParser} ctx 
 */
function buildBitwiseXorExpr(ctx) {
  ctx.ruleRefs.bitwiseXorExpr = map(
    seq(
      ctx.ruleRefs.bitwiseAndExpr,
      many(seq(
        pred(t => t.type === '^'),
        lazy(() => ctx.ruleRefs.bitwiseXorExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('xor', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build bitwise OR expression rule (|)
 * @param {CPegParser} ctx 
 */
function buildBitwiseOrExpr(ctx) {
  ctx.ruleRefs.bitwiseOrExpr = map(
    seq(
      ctx.ruleRefs.bitwiseXorExpr,
      many(seq(
        pred(t => t.type === '|'),
        lazy(() => ctx.ruleRefs.bitwiseOrExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('or', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

export { buildBitwiseAndExpr, buildBitwiseXorExpr, buildBitwiseOrExpr };
