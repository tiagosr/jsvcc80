import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, many, lazy, lit, alt, pred } from './combinators.js';
import { mergeDeclaratorType } from './type-system.js';

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
 * Build while loop statement
 * @param {CPegParser} ctx 
 */
function buildWhileStmt(ctx) {
  ctx.ruleRefs.whileStmt = map(
    seq(
      kw('while'),
      lit('('),
      lazy(() => ctx.ruleRefs.conditionalExpr),
      lit(')'),
      lazy(() => ctx.ruleRefs.statement)
    ),
    ([keyword, , condition, , body]) => {
      return new AST.ControlFlowNode('while', condition, body, null, locFromToken(keyword));
    }
  );
}

/**
 * Build do-while loop statement
 * @param {CPegParser} ctx 
 */
function buildDoWhileStmt(ctx) {
  ctx.ruleRefs.doWhileStmt = map(
    seq(
      kw('do'),
      lazy(() => ctx.ruleRefs.statement),
      kw('while'),
      lit('('),
      lazy(() => ctx.ruleRefs.conditionalExpr),
      lit(')'),
      lit(';')
    ),
    ([doKw, body, , lparen, condition, , semi]) => {
      return new AST.ControlFlowNode('do_while', condition, body, null, locFromToken(doKw));
    }
  );
}

/**
 * Build for loop statement
 * @param {CPegParser} ctx 
 */
function buildForStmt(ctx) {
  const forInitDecl = map(
    seq(
      opt(kw('register')),
      lazy(() => ctx.ruleRefs.typeSpecifier),
      many(lit('*')),
      pred(t => t.type === 'IDENTIFIER'),
      many(seq(
        lit('['),
        opt(lazy(() => ctx.ruleRefs.expression)),
        lit(']')
      )),
      opt(seq(lit('='), lazy(() => ctx.ruleRefs.expression)))
    ),
    ([regKw, typeSpec, stars, name, arrayDims, init]) => {
      const pointerDepth = stars.length;
      const dims = arrayDims.map(dim => {
        const expr = dim[1];
        if (expr === null || expr === undefined) return null;
        if (expr instanceof AST.LiteralNode) return expr.value;
        return null;
      });
      const mergedType = mergeDeclaratorType(typeSpec, pointerDepth, dims);
      let initValue = null;
      if (init) {
        initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
      }
      return new AST.DeclNode('var',
        mergedType,
        new AST.IdentifierNode(name.value, locFromToken(name)),
        initValue, locFromToken(typeSpec),
        regKw ? 'register' : null);
    }
  );

  const forInitExpr = map(
    opt(lazy(() => ctx.ruleRefs.expression)),
    (expr) => {
      if (!expr) return null;
      return Array.isArray(expr) ? expr[0] : expr;
    }
  );

  ctx.ruleRefs.forStmt = map(
    seq(
      kw('for'),
      lit('('),
      alt(forInitDecl, forInitExpr),
      lit(';'),
      opt(lazy(() => ctx.ruleRefs.expression)),
      lit(';'),
      opt(lazy(() => ctx.ruleRefs.expression)),
      lit(')'),
      lazy(() => ctx.ruleRefs.statement)
    ),
    ([forKw, , init, , condExpr, , incrExpr, , body]) => {
      const condition = Array.isArray(condExpr) ? (condExpr[0] || null) : (condExpr || null);
      const increment = Array.isArray(incrExpr) ? (incrExpr[0] || null) : (incrExpr || null);
      return new AST.ControlFlowNode('for', condition, body, null, locFromToken(forKw), init, increment);
    }
  );
}

/**
 * Build switch statement with case/default clauses
 * @param {CPegParser} ctx 
 */
function buildSwitchStmt(ctx) {
  const caseClause = map(
    seq(
      kw('case'),
      lazy(() => ctx.ruleRefs.conditionalExpr),
      lit(':'),
      many(lazy(() => ctx.ruleRefs.statement))
    ),
    ([, value, , statements]) => {
      return new AST.CaseClauseNode(value, statements, locFromToken(value));
    }
  );

  const defaultClause = map(
    seq(
      kw('default'),
      lit(':'),
      many(lazy(() => ctx.ruleRefs.statement))
    ),
    ([keyword, , statements]) => {
      return new AST.CaseClauseNode(null, statements, locFromToken(keyword));
    }
  );

  ctx.ruleRefs.switchStmt = map(
    seq(
      kw('switch'),
      lit('('),
      lazy(() => ctx.ruleRefs.conditionalExpr),
      lit(')'),
      lit('{'),
      many(alt(caseClause, defaultClause)),
      lit('}')
    ),
    ([keyword, , expression, , lbrace, cases,]) => {
      const regularCases = cases.filter(c => c.value !== null);
      const defClause = cases.find(c => c.value === null);
      return new AST.SwitchNode(expression, regularCases, defClause, locFromToken(keyword));
    }
  );
}

/**
 * Build break and continue statements
 * @param {CPegParser} ctx 
 */
function buildBreakContinueStmt(ctx) {
  ctx.ruleRefs.breakStmt = map(
    seq(
      alt(kw('break'), kw('continue')),
      lit(';')
    ),
    ([keyword]) => {
      return new AST.JumpNode(keyword.value, locFromToken(keyword));
    }
  );
}

/**
 * Build goto statement and labeled statement
 * @param {CPegParser} ctx 
 */
function buildGotoLabelStmt(ctx) {
  ctx.ruleRefs.gotoStmt = map(
    seq(
      kw('goto'),
      pred(t => t.type === 'IDENTIFIER'),
      lit(';')
    ),
    ([keyword, target]) => {
      return new AST.GotoNode(new AST.IdentifierNode(target.value, locFromToken(target)), locFromToken(keyword));
    }
  );

  ctx.ruleRefs.labelStmt = map(
    seq(
      pred(t => t.type === 'IDENTIFIER'),
      lit(':'),
      lazy(() => ctx.ruleRefs.statement)
    ),
    ([label, , body]) => {
      return new AST.LabelNode(new AST.IdentifierNode(label.value, locFromToken(label)), body, locFromToken(label));
    }
  );
}

export {
  buildWhileStmt,
  buildDoWhileStmt,
  buildForStmt,
  buildSwitchStmt,
  buildBreakContinueStmt,
  buildGotoLabelStmt,
};
