import { Parser, seq, map, many, opt, lazy, lit } from './combinators.js';

/**
 * Build full expression rule (comma operator)
 * @param {CPegParser} ctx 
 */
function buildExpression(ctx) {
  ctx.ruleRefs.expression = map(
    many(
      seq(ctx.ruleRefs.assignmentExpr, opt(lit(',')))
    ),
    (items) => {
      if (items.length === 0) return null;
      if (items.length === 1) return items[0][0];
      return items.map(item => item[0]);
    }
  );

  // Single expression (non-array version for use in contexts expecting one expression)
  ctx.ruleRefs.singleExpression = map(ctx.ruleRefs.expression, (expr) => expr);
}

export { buildExpression };
