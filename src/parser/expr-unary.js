import * as AST from '../ast/nodes.js';
import { Parser, some, seq, map, lazy, pred, lit, alt, many } from './combinators.js';
import { buildTypeSpecifier, locFromToken } from './type-system.js';

/**
 * Match a keyword token (type is KEYWORD, value is the keyword)
 * @param {string} keyword - Keyword to match
 */
const kw = (keyword) => pred(t => t.type === 'KEYWORD' && t.value === keyword);

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

  // C-style cast: (type)expression
  // Handles: (int)x, (char *)p, (unsigned char)c
  const castExpr = map(
    seq(
      lit('('),
      lazy(() => ctx.ruleRefs.typeSpecifier),
      many(lit('*')),
      lit(')'),
      lazy(() => ctx.ruleRefs.unaryExpr)
    ),
    ([_, typeSpec, stars, , operand]) => {
      const pointerDepth = stars.length;
      const loc = typeSpec.location || locFromToken(typeSpec);
      // Create a TypeSpecNode with the appropriate pointer depth
      const castType = new AST.TypeSpecNode(
        typeSpec.baseType,
        typeSpec.isSigned,
        typeSpec.isConst,
        typeSpec.isVolatile,
        typeSpec.bitWidth,
        loc,
        pointerDepth,
        false,
        null,
        null,
        null,
        typeSpec.isFunctionPointer,
        typeSpec.functionReturnType,
        typeSpec.functionParams
      );
      return new AST.CastNode(castType, operand, locFromToken(typeSpec));
    }
  );

  ctx.ruleRefs.unaryExpr = alt(
    castExpr,
    unaryPrefix,
    addressOf,
    ctx.ruleRefs.primaryExpr
  );
}

export { buildUnaryExpr };
