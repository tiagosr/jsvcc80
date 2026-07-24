import * as AST from '../ast/nodes.js';
import { Parser, alt, seq, map, lit, lazy, pred } from './combinators.js';

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
 * Build primary expression rule (identifiers, literals, parenthesized expressions)
 * @param {CPegParser} ctx 
 */
function buildPrimaryExpr(ctx) {
  const identifierOrLiteral = map(
    alt(
      pred(t => t.type === 'IDENTIFIER'),
      pred(t => t.type === 'INTEGER' || t.type === 'STRING'),
      pred(t => t.type === 'KEYWORD' && t.value === 'NULL')
    ),
    (token) => {
      const loc = locFromToken(token);
      if (token.type === 'IDENTIFIER') {
        return new AST.IdentifierNode(token.value, loc);
      }
      if (token.type === 'INTEGER') {
        return new AST.LiteralNode('int', parseInt(token.value, 10), loc);
      }
      if (token.type === 'STRING') {
        return new AST.LiteralNode('string', token.value, loc);
      }
      // NULL keyword - treat as integer 0
      return new AST.LiteralNode('int', 0, loc);
    }
  );

  const parenExpr = seq(lit('('), lazy(() => ctx.ruleRefs.expression), lit(')'));

  const basePrimary = map(
    alt(parenExpr, identifierOrLiteral),
    (value) => {
      if (Array.isArray(value)) {
        return value[1];
      }
      return value;
    }
  );

  const derefExpr = map(
    seq(
      lit('*'),
      lazy(() => ctx.ruleRefs.primaryExpr)
    ),
    ([star, operand]) => {
      return new AST.UnaryOpNode('deref', operand, locFromToken(star));
    }
  );

  // sizeof(expr) or sizeof(type)
  // Note: typeSpecifier must be tried first, since expression (via many) can match zero tokens
  const sizeofExpr = map(
    seq(
      kw('sizeof'),
      lit('('),
      alt(
        lazy(() => ctx.ruleRefs.typeSpecifier),
        pred(t => t.type === 'IDENTIFIER'),
        lazy(() => ctx.ruleRefs.expression)
      ),
      lit(')')
    ),
    ([kwToken, , operand,]) => {
      let resolvedOperand = operand;
      if (operand && operand.type === 'IDENTIFIER') {
        resolvedOperand = new AST.IdentifierNode(operand.value, locFromToken(operand));
      }
      return new AST.SizeOfNode(resolvedOperand, locFromToken(kwToken));
    }
  );

  // offsetof(type, field)
  const offsetofExpr = map(
    seq(
      kw('offsetof'),
      lit('('),
      pred(t => t.type === 'IDENTIFIER'),
      lit(','),
      pred(t => t.type === 'IDENTIFIER'),
      lit(')')
    ),
    ([kwToken, , typeToken, , fieldToken,]) => {
      return new AST.OffsetOfNode(typeToken.value, fieldToken.value, locFromToken(kwToken));
    }
  );

  // typeof(expr)
  const typeofExpr = map(
    seq(
      kw('typeof'),
      lit('('),
      lazy(() => ctx.ruleRefs.expression),
      lit(')')
    ),
    ([kwToken, , operand,]) => {
      return new AST.TypeOfNode(operand, locFromToken(kwToken));
    }
  );

  ctx.ruleRefs.primaryExpr = alt(
    sizeofExpr,
    offsetofExpr,
    typeofExpr,
    derefExpr,
    basePrimary
  );
}

export { buildPrimaryExpr };
