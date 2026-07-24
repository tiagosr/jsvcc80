import * as AST from '../ast/nodes.js';
import { Parser, some, seq, map, lazy, pred, lit, alt } from './combinators.js';

/**
 * Match a keyword token (type is KEYWORD, value is the keyword)
 * @param {string} keyword - Keyword to match
 */
const kw = (keyword) => pred(t => t.type === 'KEYWORD' && t.value === keyword);

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

/**
 * Build unary expression rule (prefix operators)
 * @param {CPegParser} ctx 
 */
function buildUnaryExpr(ctx) {
  const unaryPrefix = map(
    seq(
      some(pred(t => ['++', '--', '+', '-', '~', '!'].includes(t.type))),
      lazy(() => ctx.ruleRefs.unaryExpr)
    ),
    ([operators, operand]) => {
      let node = operand;
      for (const op of Array.isArray(operators) ? operators : [operators]) {
        let mappedOp = op.type;
        if (op.type === '-') mappedOp = 'neg';
        else if (op.type === '~') mappedOp = 'not';
        else if (op.type === '!') mappedOp = 'lognot';
        else if (op.type === '+') mappedOp = 'pos';
        node = new AST.UnaryOpNode(mappedOp, node, locFromToken(op));
      }
      return node;
    }
  );

  const addressOf = map(
    seq(
      pred(t => t.type === '&'),
      lazy(() => ctx.ruleRefs.unaryExpr)
    ),
    ([amp, operand]) => {
      return new AST.AddressOfNode(operand, locFromToken(amp));
    }
  );

  ctx.ruleRefs.unaryExpr = alt(
    unaryPrefix,
    addressOf,
    ctx.ruleRefs.primaryExpr
  );
}

export { buildUnaryExpr };
