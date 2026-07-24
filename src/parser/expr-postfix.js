import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, lazy, lit, many, pred, alt } from './combinators.js';

/**
 * Build postfix expression rule (function calls, array subscripts, member access)
 * @param {CPegParser} ctx 
 */
function buildPostfixExpr(ctx) {
  const functionCall = map(
    seq(
      lit('('),
      opt(lazy(() => ctx.ruleRefs.expression)),
      lit(')')
    ),
    ([lparen, args]) => {
      return { kind: 'call', args: args || [] };
    }
  );

  const arraySubscript = map(
    seq(
      lit('['),
      lazy(() => ctx.ruleRefs.expression),
      lit(']')
    ),
    ([, index]) => {
      return { kind: 'index', index };
    }
  );

  const memberAccessDot = map(
    seq(
      lit('.'),
      pred(t => t.type === 'IDENTIFIER')
    ),
    ([, field]) => {
      return { kind: 'member', field: new AST.IdentifierNode(field.value, locFromToken(field)) };
    }
  );

  const memberAccessArrow = map(
    seq(
      lit('->'),
      pred(t => t.type === 'IDENTIFIER')
    ),
    ([, field]) => {
      return { kind: 'pointerMember', field: new AST.IdentifierNode(field.value, locFromToken(field)) };
    }
  );

  const postfixOp = alt(
    functionCall,
    arraySubscript,
    memberAccessDot,
    memberAccessArrow,
    // Postfix increment/decrement: x++, x--
    map(
      pred(t => ['++', '--'].includes(t.type)),
      (op) => {
        return { kind: 'postfixIncDec', op: op.value };
      }
    )
  );

  ctx.ruleRefs.postfixExpr = map(
    seq(
      ctx.ruleRefs.unaryExpr,
      many(postfixOp)
    ),
    ([base, ops]) => {
      let node = base;
      for (const op of ops) {
        switch (op.kind) {
          case 'call':
            if (node instanceof AST.UnaryOpNode && node.op === 'deref') {
              node = new AST.FunctionPointerCallNode(node, op.args, locFromToken(node));
            } else {
              node = new AST.CallNode(node, op.args, locFromToken(node));
            }
            break;
          case 'index':
            node = new AST.IndexNode(node, op.index, locFromToken(node));
            break;
          case 'member':
            node = new AST.MemberNode(node, op.field, locFromToken(node));
            break;
          case 'pointerMember':
            node = new AST.PointerMemberNode(node, op.field, locFromToken(node));
            break;
          case 'postfixIncDec':
            node = new AST.UnaryOpNode(op.op === '++' ? 'inc' : 'dec', node, locFromToken(op));
            break;
        }
      }
      return node;
    }
  );
}

/**
 * Get location from first token in parse result
 */
const locFromToken = (token) => token?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

export { buildPostfixExpr };
