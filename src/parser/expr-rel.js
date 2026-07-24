import * as AST from '../ast/nodes.js';
import { Parser, seq, map, many, lazy, pred, lit } from './combinators.js';

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

/**
 * Build relational expression rule (< > <= >=)
 * @param {CPegParser} ctx 
 */
function buildRelationalExpr(ctx) {
  ctx.ruleRefs.relationalExpr = map(
    seq(
      ctx.ruleRefs.shiftExpr,
      many(seq(
        pred(t => ['<', '>', '<=', '>='].includes(t.type)),
        lazy(() => ctx.ruleRefs.relationalExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        const opStr = op.type;
        let mappedOp = opStr;
        if (opStr === '<') mappedOp = 'lt';
        else if (opStr === '>') mappedOp = 'gt';
        else if (opStr === '<=') mappedOp = 'le';
        else if (opStr === '>=') mappedOp = 'ge';
        node = new AST.BinaryOpNode(mappedOp, node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build equality expression rule (== !=)
 * @param {CPegParser} ctx 
 */
function buildEqualityExpr(ctx) {
  ctx.ruleRefs.equalityExpr = map(
    seq(
      ctx.ruleRefs.relationalExpr,
      many(seq(
        pred(t => t.type === '==' || t.type === '!='),
        lazy(() => ctx.ruleRefs.equalityExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        const mappedOp = op.type === '==' ? 'eq' : 'ne';
        node = new AST.BinaryOpNode(mappedOp, node, right, locFromToken(op));
      }
      return node;
    }
  );
}

export { buildRelationalExpr, buildEqualityExpr };
