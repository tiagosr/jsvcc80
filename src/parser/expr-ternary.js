import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, lazy, lit, alt } from './combinators.js';

/**
 * Build conditional expression rule (cond ? true : false)
 * @param {CPegParser} ctx 
 */
function buildConditionalExpr(ctx) {
  const conditionalBody = map(
    seq(
      lit('?'),
      lazy(() => ctx.ruleRefs.expression),
      lit(':'),
      lazy(() => ctx.ruleRefs.conditionalExpr)
    ),
    ([, trueBranch, , falseBranch]) => {
      return { trueBranch, falseBranch };
    }
  );

  ctx.ruleRefs.conditionalExpr = map(
    alt(
      seq(ctx.ruleRefs.logicalOrExpr, opt(conditionalBody)),
      ctx.ruleRefs.logicalAndExpr
    ),
    (value) => {
      if (Array.isArray(value) && value[1]) {
        const { trueBranch, falseBranch } = value[1];
        return {
          type: 'Conditional',
          condition: value[0],
          trueBranch,
          falseBranch
        };
      }
      return value;
    }
  );
}

export { buildConditionalExpr };
