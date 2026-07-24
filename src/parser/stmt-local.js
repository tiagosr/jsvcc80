import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, many, lazy, lit, alt, pred } from './combinators.js';
import { mergeDeclaratorType, createFunctionPointerType } from './type-system.js';

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
 * Build statement list (sequence of statements)
 * @param {CPegParser} ctx 
 */
function buildStatementList(ctx) {
  ctx.ruleRefs.statementList = many(lazy(() => ctx.ruleRefs.statement));
}

/**
 * Build statement rule (compound, if, return, local declarations, exprStmt)
 * @param {CPegParser} ctx 
 */
function buildStatement(ctx) {
  const compoundStmt = map(
    seq(
      lit('{'),
      ctx.ruleRefs.statementList,
      lit('}')
    ),
    ([lbrace, statements]) => {
      return new AST.CompoundNode(statements, locFromToken(lbrace));
    }
  );

  const ifStmt = map(
    seq(
      kw('if'),
      lit('('),
      lazy(() => ctx.ruleRefs.conditionalExpr),
      lit(')'),
      lazy(() => ctx.ruleRefs.statement),
      opt(seq(
        kw('else'),
        lazy(() => ctx.ruleRefs.statement)
      ))
    ),
    ([keyword, , condition, , body, elsePart]) => {
      const elseBody = elsePart ? elsePart[1] : null;
      return new AST.ControlFlowNode('if', condition, body, elseBody, locFromToken(keyword));
    }
  );

  const returnStmt = map(
    seq(
      kw('return'),
      opt(lazy(() => ctx.ruleRefs.expression)),
      lit(';')
    ),
    ([keyword, value]) => {
      const returnValue = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value;
      return new AST.ReturnNode(returnValue, locFromToken(keyword));
    }
  );

  const literalExpr = map(
    pred(t => t.type === 'INTEGER' || t.type === 'STRING'),
    (t) => {
      return new AST.LiteralNode(t.value, t);
    }
  );

  const braceInit = map(
    seq(
      lit('{'),
      many(seq(
        literalExpr,
        opt(lit(','))
      )),
      lit('}')
    ),
    ([, items]) => {
      // Extract values from the initializer list
      const values = [];
      for (const item of items) {
        const expr = item[0];
        if (expr instanceof AST.LiteralNode) {
          values.push(expr.value);
        } else {
          values.push(null);
        }
      }
      return values;
    }
  );

  const localDecl = map(
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
      opt(alt(
        seq(lit('='), braceInit),  // Brace-enclosed initializer: = {1, 2, 3}
        seq(lit('='), lazy(() => ctx.ruleRefs.expression))  // Single expression initializer: = value
      )),
      lit(';')
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
        const initializer = init[1];
        if (Array.isArray(initializer)) {
          // Brace-enclosed initializer
          initValue = initializer;
        } else {
          // Single expression initializer
          initValue = Array.isArray(initializer) ? initializer[0] : initializer;
        }
      }
      return new AST.DeclNode('var',
        mergedType,
        new AST.IdentifierNode(name.value, locFromToken(name)),
        initValue, locFromToken(typeSpec),
        regKw ? 'register' : null);
    }
  );

  const localDeclWithFuncPointer = map(
    seq(
      opt(kw('register')),
      lazy(() => ctx.ruleRefs.typeSpecifier),
      ctx.ruleRefs.funcPointerDeclarator,
      opt(seq(lit('='), lazy(() => ctx.ruleRefs.expression))),
      lit(';')
    ),
    ([regKw, typeSpec, fpDecl, init]) => {
      const stars = fpDecl.stars || [];
      const pointerDepth = stars.length;
      // fpDecl.name is already a string (extracted by funcPointerDeclarator)
      const name = fpDecl.name || null;
      const params = fpDecl.params || [];
      const returnBase = new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, false, false);
      const funcPtrType = createFunctionPointerType(returnBase, params, locFromToken(fpDecl.name || fpDecl.stars[0]));
      const mergedType = mergeDeclaratorType(funcPtrType, pointerDepth, []);
      let initValue = null;
      if (init) {
        initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
      }
      const ident = name ? new AST.IdentifierNode(name, locFromToken(fpDecl.name || fpDecl.stars[0])) : null;
      return new AST.DeclNode('var', mergedType,
        ident, initValue, locFromToken(typeSpec),
        regKw ? 'register' : null);
    }
  );

  const exprStmt = map(
    seq(
      lazy(() => ctx.ruleRefs.expression),
      lit(';')
    ),
    ([expression, semi]) => {
      const expr = Array.isArray(expression) ? expression[0] : expression;
      return new AST.ExprStmtNode(expr, locFromToken(semi));
    }
  );

  ctx.ruleRefs.statement = alt(
    compoundStmt,
    ifStmt,
    ctx.ruleRefs.whileStmt,
    ctx.ruleRefs.doWhileStmt,
    ctx.ruleRefs.forStmt,
    ctx.ruleRefs.switchStmt,
    ctx.ruleRefs.breakStmt,
    ctx.ruleRefs.gotoStmt,
    ctx.ruleRefs.labelStmt,
    returnStmt,
    localDeclWithFuncPointer,
    localDecl,
    exprStmt
  );
}

export { buildStatementList, buildStatement };
