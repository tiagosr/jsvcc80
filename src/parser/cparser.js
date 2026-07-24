import { ParserError } from '../core/errors.js';
import * as AST from '../ast/nodes.js';
import { TokenType } from '../preprocessor/tokenTypes.js';
import { 
  Parser,
  alt, any, lazy, lit, many, map, opt, pred, seq, some,
} from './combinators.js';

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
 * Type information for C basic types
 * Maps type keyword to { baseType, isSigned, sizeInBytes }
 */
const TypeInfos = {
  'void':    { baseType: 'void',    isSigned: true,  size: 0  },
  'char':    { baseType: 'char',    isSigned: true,  size: 1  },
  '_Bool':   { baseType: '_Bool',   isSigned: true,  size: 1  },
  'short':   { baseType: 'short',   isSigned: true,  size: 2  },
  'int':     { baseType: 'int',     isSigned: true,  size: 2  },
  'long':    { baseType: 'long',    isSigned: true,  size: 4  },
  'signed':  { baseType: 'int',     isSigned: true,  size: 2  },
  'unsigned':{ baseType: 'unsigned', isSigned: false, size: 2  },
};

/**
 * Create a TypeSpecNode from a type keyword token and optional signedness modifier
 * @param {string} typeKw - Type keyword (e.g., 'int', 'char', 'unsigned')
 * @param {boolean} isSigned - Override signedness (undefined = use default)
 * @param {Token} token - Token for location
 * @param {boolean} [isConst] - Whether const qualified
 * @param {boolean} [isVolatile] - Whether volatile qualified
 * @returns {AST.TypeSpecNode}
 */
function createTypeSpec(typeKw, isSigned, token, isConst = false, isVolatile = false) {
  const info = TypeInfos[typeKw];
  if (!info) {
    return new AST.TypeSpecNode(typeKw, isSigned !== false, isConst, isVolatile, null, locFromToken(token));
  }
  const effectiveSigned = isSigned !== undefined ? isSigned : info.isSigned;
  return new AST.TypeSpecNode(info.baseType, effectiveSigned, isConst, isVolatile, null, locFromToken(token));
}

/**
 * Merge a base type spec with declarator info (pointer stars, array dimensions)
 * @param {AST.TypeSpecNode} baseType - Base type specification
 * @param {number} pointerDepth - Number of pointer indirection levels
 * @param {Array} arrayDims - Array of dimension sizes (empty if not array)
 * @returns {AST.TypeSpecNode} Merged type specification
 */
function mergeDeclaratorType(baseType, pointerDepth, arrayDims) {
  const loc = baseType.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };
  if (pointerDepth === 0 && arrayDims.length === 0) {
    return baseType;
  }
  if (arrayDims.length > 0) {
    const dim = arrayDims[0];
    return new AST.TypeSpecNode(
      baseType.baseType, 
      baseType.isSigned, 
      baseType.isConst, 
      baseType.isVolatile, 
      baseType.bitWidth, 
      loc, 
      0, 
      true, 
      dim,
      null,
      null,
      baseType.isFunctionPointer,
      baseType.functionReturnType,
      baseType.functionParams
    );
  }
  return new AST.TypeSpecNode(
    baseType.baseType, 
    baseType.isSigned, 
    baseType.isConst, 
    baseType.isVolatile, 
    baseType.bitWidth, 
    loc, 
    pointerDepth, 
    false, 
    null,
    null,
    null,
    baseType.isFunctionPointer,
    baseType.functionReturnType,
    baseType.functionParams
  );
}

/**
 * Create a function pointer type specification
 * @param {AST.TypeSpecNode} returnType - Function return type
 * @param {AST.ParameterNode[]} params - Function parameters (empty for void)
 * @param {SourceLocation} location - Source location
 * @returns {AST.TypeSpecNode} Function pointer type
 */
function createFunctionPointerType(returnType, params, location) {
  // Create a copy of return type without const/volatile for function return
  const returnCopy = new AST.TypeSpecNode(
    returnType.baseType,
    returnType.isSigned,
    false,  // Functions don't have const returns in C
    false,
    returnType.bitWidth,
    location
  );
  
  return new AST.TypeSpecNode(
    'function',
    true,
    false,
    false,
    null,
    location,
    1,  // pointerDepth = 1 for function pointers
    false,
    null,
    null,
    null,
    true,  // isFunctionPointer = true
    returnCopy,
    params || []
  );
}

/**
 * Build a type specifier parser rule
 * Matches: [const|volatile]* [signed|unsigned] [void|char|_Bool|short|int|long] or struct/union tag
 * Requires at least one token to be consumed.
 * @returns {Object} Parser rule
 */
function buildTypeSpecifier() {
  const typeQualifier = alt(kw('const'), kw('volatile'));
  const signedness = alt(kw('signed'), kw('unsigned'));
  const basicType = alt(
    kw('void'), kw('char'), kw('_Bool'),
    kw('short'), kw('int'), kw('long')
  );

  // Collect zero or more qualifiers
  const qualifiers = many(typeQualifier);

  // Try signedness + basicType first (e.g., "unsigned int")
  const withBoth = map(seq(qualifiers, signedness, basicType), ([qs, s, t]) => [qs, s, t]);
  // Try signedness only (e.g., "unsigned")
  const onlySign = map(seq(qualifiers, signedness), ([qs, s]) => [qs, s, null]);
  // Try basicType only (e.g., "int")
  const onlyType = map(seq(qualifiers, basicType), ([qs, t]) => [qs, null, t]);

  return map(
    alt(withBoth, onlySign, onlyType),
    ([qualTokens, signToken, typeToken]) => {
      const isConst = qualTokens.some(t => t.value === 'const');
      const isVolatile = qualTokens.some(t => t.value === 'volatile');
      const locToken = qualTokens.length > 0 ? qualTokens[0] : (signToken || typeToken);

      if (typeToken) {
        const typeKw = typeToken.value;
        let isSigned = undefined;
        if (signToken) {
          isSigned = signToken.value === 'signed';
        }
        return createTypeSpec(typeKw, isSigned, typeToken, isConst, isVolatile);
      } else if (signToken) {
        const isSigned = signToken.value === 'signed';
        const baseType = isSigned ? 'int' : 'unsigned';
        return new AST.TypeSpecNode(baseType, isSigned, isConst, isVolatile, null, locFromToken(locToken));
      }
      return new AST.TypeSpecNode('int', true, isConst, isVolatile, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    }
  );
}

/**
 * Build a struct/union type reference parser
 * Matches: struct <tag> or union <tag>
 * @returns {Object} Parser rule
 */
function buildStructTypeRef() {
  return map(
    seq(
      alt(kw('struct'), kw('union')),
      pred(t => t.type === 'IDENTIFIER')
    ),
    ([kindToken, tagToken]) => {
      return new AST.TypeSpecNode(
        kindToken.value, true, false, false, null,
        locFromToken(kindToken), 0, false, null,
        tagToken.value, kindToken.value
      );
    }
  );
}

/**
 * Build primary expression rule (identifiers, literals, parenthesized expressions)
 * @param {CPegParser} ctx 
 */
function buildPrimaryExpr(ctx) {
  const identifierOrLiteral = map(
    alt(
      pred(t => t.type === 'IDENTIFIER'),
      pred(t => t.type === 'INTEGER' || t.type === 'STRING')
    ),
    (token) => {
      const loc = locFromToken(token);
      if (token.type === 'IDENTIFIER') {
        return new AST.IdentifierNode(token.value, loc);
      }
      if (token.type === 'INTEGER') {
        return new AST.LiteralNode('int', parseInt(token.value, 10), loc);
      }
      return new AST.LiteralNode('string', token.value, loc);
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
    memberAccessArrow
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
        }
      }
      return node;
    }
  );
}

/**
 * Build multiplicative expression rule (* / %)
 * @param {CPegParser} ctx 
 */
function buildMultiplicativeExpr(ctx) {
  ctx.ruleRefs.multiplicativeExpr = map(
    seq(
      ctx.ruleRefs.postfixExpr,
      many(seq(
        pred(t => ['*', '/', '%'].includes(t.type)),
        lazy(() => ctx.ruleRefs.multiplicativeExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode(op.type, node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build additive expression rule (+ -)
 * @param {CPegParser} ctx 
 */
function buildAdditiveExpr(ctx) {
  ctx.ruleRefs.additiveExpr = map(
    seq(
      ctx.ruleRefs.multiplicativeExpr,
      many(seq(
        pred(t => ['+', '-'].includes(t.type)),
        lazy(() => ctx.ruleRefs.additiveExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode(op.type, node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build shift expression rule (<< >>)
 * @param {CPegParser} ctx 
 */
function buildShiftExpr(ctx) {
  ctx.ruleRefs.shiftExpr = map(
    seq(
      ctx.ruleRefs.additiveExpr,
      many(seq(
        pred(t => t.type === '<<' || t.type === '>>'),
        lazy(() => ctx.ruleRefs.shiftExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode(op.type, node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build relational expression rule (< > <= >=)
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

/**
 * Build bitwise AND expression rule (&)
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

/**
 * Build logical AND expression rule (&&)
 */
function buildLogicalAndExpr(ctx) {
  ctx.ruleRefs.logicalAndExpr = map(
    seq(
      ctx.ruleRefs.bitwiseOrExpr,
      many(seq(
        pred(t => t.type === '&&'),
        lazy(() => ctx.ruleRefs.logicalAndExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('land', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build logical OR expression rule (||)
 */
function buildLogicalOrExpr(ctx) {
  ctx.ruleRefs.logicalOrExpr = map(
    seq(
      ctx.ruleRefs.logicalAndExpr,
      many(seq(
        pred(t => t.type === '||'),
        lazy(() => ctx.ruleRefs.logicalOrExpr)
      ))
    ),
    ([left, ops]) => {
      let node = left;
      for (const [op, right] of ops) {
        node = new AST.BinaryOpNode('lor', node, right, locFromToken(op));
      }
      return node;
    }
  );
}

/**
 * Build conditional expression rule (cond ? true : false)
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

/**
 * Build assignment expression rule (var = expr)
 */
function buildAssignmentExpr(ctx) {
  const lhsIdentifier = pred(t => t.type === 'IDENTIFIER');

  ctx.ruleRefs.assignmentExpr = map(
    seq(
      alt(ctx.ruleRefs.conditionalExpr, lhsIdentifier),
      opt(seq(
        pred(t => ['=', '+=', '-=', '*=', '/='].includes(t.type)),
        lazy(() => ctx.ruleRefs.expression)
      ))
    ),
    ([lhs, assign]) => {
      if (assign) {
        const [op, rhs] = assign;
        const resolvedRhs = Array.isArray(rhs) ? (rhs[0] || null) : rhs;
        if (Array.isArray(lhs)) {
          const resolvedLhs = lhs[0];
          return new AST.BinaryOpNode(op.type, resolvedLhs, resolvedRhs, locFromToken(op));
        }
        if (lhs.type === 'Identifier') {
          return new AST.BinaryOpNode(op.type,
            new AST.IdentifierNode(lhs.value, locFromToken(lhs)),
            resolvedRhs, locFromToken(op));
        }
        return new AST.BinaryOpNode(op.type, lhs, resolvedRhs, locFromToken(op));
      }
      if (Array.isArray(lhs)) {
        return lhs[0] || null;
      }
      if (lhs && lhs.type === 'Identifier') {
        return new AST.IdentifierNode(lhs.value, locFromToken(lhs));
      }
      return lhs;
    }
  );
}

/**
 * Build full expression rule (comma operator)
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

/**
 * Build while loop statement
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

/**
 * Build struct/union declaration
 */
function buildStructDecl(ctx) {
  const structField = map(
    seq(
      lazy(() => ctx.ruleRefs.typeSpecifier),
      many(lit('*')),
      pred(t => t.type === 'IDENTIFIER'),
      opt(seq(lit('='), lazy(() => ctx.ruleRefs.expression))),
      lit(';')
    ),
    ([typeSpec, stars, name, init]) => {
      let initValue = null;
      if (init) {
        initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
      }
      const pointerDepth = stars.length;
      const fieldType = pointerDepth > 0
        ? new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, typeSpec.isConst, typeSpec.isVolatile, typeSpec.bitWidth, typeSpec.location, pointerDepth)
        : typeSpec;
      return new AST.StructFieldNode(
        fieldType,
        new AST.IdentifierNode(name.value, locFromToken(name)),
        null, locFromToken(typeSpec));
    }
  );

  ctx.ruleRefs.structDecl = map(
    seq(
      alt(kw('struct'), kw('union')),
      opt(pred(t => t.type === 'IDENTIFIER')),
      lit('{'),
      many(structField),
      lit('}'),
      many(seq(
        pred(t => t.type === 'IDENTIFIER'),
        opt(lit('='))
      )),
      lit(';')
    ),
    ([keyword, nameOpt, lbrace, fields, rbrace, declarators, semi]) => {
      const name = nameOpt ? new AST.IdentifierNode(nameOpt.value, locFromToken(nameOpt)) : null;
      return new AST.StructNode(keyword.value, name, fields, locFromToken(keyword));
    }
  );
}

/**
 * Build enum declaration
 */
function buildEnumDecl(ctx) {
  const enumValue = map(
    seq(
      pred(t => t.type === 'IDENTIFIER'),
      opt(seq(lit('='), lazy(() => ctx.ruleRefs.conditionalExpr)))
    ),
    ([name, valueOpt]) => {
      const value = valueOpt ? (Array.isArray(valueOpt[1]) ? valueOpt[1][0] : valueOpt[1]) : null;
      return new AST.EnumValueNode(
        new AST.IdentifierNode(name.value, locFromToken(name)),
        value, locFromToken(name));
    }
  );

  ctx.ruleRefs.enumDecl = map(
    seq(
      kw('enum'),
      opt(pred(t => t.type === 'IDENTIFIER')),
      lit('{'),
      many(seq(enumValue, opt(lit(',')))),
      lit('}'),
      many(seq(
        pred(t => t.type === 'IDENTIFIER'),
        opt(lit('='))
      )),
      lit(';')
    ),
    ([keyword, nameOpt, lbrace, values, rbrace, declarators, semi]) => {
      const name = nameOpt ? new AST.IdentifierNode(nameOpt.value, locFromToken(nameOpt)) : null;
      const enumValues = values.map(v => v[0]);
      return new AST.EnumNode(name, enumValues, locFromToken(keyword));
    }
  );
}

/**
 * Build typedef declaration
 */
function buildTypedefDecl(ctx) {
  ctx.ruleRefs.typedefDecl = map(
    seq(
      kw('typedef'),
      lazy(() => ctx.ruleRefs.typeSpecifier),
      pred(t => t.type === 'IDENTIFIER'),
      lit(';')
    ),
    ([typedefKw, typeSpec, name, semi]) => {
      return new AST.DeclNode('typedef',
        typeSpec,
        new AST.IdentifierNode(name.value, locFromToken(name)),
        null, locFromToken(typedefKw));
    }
  );
}

/**
 * Build statement list (sequence of statements)
 */
function buildStatementList(ctx) {
  ctx.ruleRefs.statementList = many(lazy(() => ctx.ruleRefs.statement));
}

/**
 * Build statement rule (compound, if, return, etc.)
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
      opt(seq(lit('='), lazy(() => ctx.ruleRefs.expression))),
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
        initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
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
      const name = fpDecl.name ? fpDecl.name.value : null;
      const params = fpDecl.params || [];
      const returnBase = new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, false, false);
      const funcPtrType = createFunctionPointerType(returnBase, params, locFromToken(fpDecl.name || fpDecl.stars[0]));
      const mergedType = mergeDeclaratorType(funcPtrType, pointerDepth, []);
      let initValue = null;
      if (init) {
        initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
      }
      const ident = name ? new AST.IdentifierNode(name, locFromToken(fpDecl.name)) : null;
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

/**
 * Build function pointer declarator parser rule
 * Recognizes: (*name)(params) or (*)(params) for function pointers
 */
function buildFunctionPointerDeclarator(ctx) {
  // Parse parameter list for function pointer
  const paramType = map(
    seq(
      lazy(() => ctx.ruleRefs.typeSpecifier),
      opt(pred(t => t.type === 'IDENTIFIER'))
    ),
    ([typeSpec, nameOpt]) => {
      return new AST.ParameterNode(typeSpec, nameOpt ? nameOpt.value : null, locFromToken(typeSpec));
    }
  );

  const paramList = map(
    seq(
      lit('('),
      opt(alt(kw('void'), seq(paramType, many(seq(lit(','), paramType))))),
      lit(')')
    ),
    ([lparen, params]) => {
      if (!params || (Array.isArray(params) && params.length === 0)) {
        return null;
      }
      if (Array.isArray(params) && Array.isArray(params[1])) {
        const allParams = [params[0]];
        for (const [, p] of params[1]) {
          allParams.push(p);
        }
        return allParams;
      }
      return null;
    }
  );

  // Array dimension: [3]
  const arrayDim = map(
    seq(
      lit('['),
      pred(t => t.type === 'INTEGER'),
      lit(']')
    ),
    ([, dimToken]) => {
      return parseInt(dimToken.value, 10);
    }
  );

  // Function pointer declarator - basic pattern (*name)(params) with array dimension support
  const funcPointerDeclarator = map(
    seq(
      lit('('),
      opt(many(lit('*'))),
      pred(t => t.type === 'IDENTIFIER'),
      opt(arrayDim),
      lit(')'),
      lazy(() => paramList)
    ),
    ([lparen, stars, name, arrayDim, rparen, params]) => {
      return { kind: 'funcPointer', stars: stars || [], name: name.value, arrayDim: arrayDim || null, params };
    }
  );

  ctx.ruleRefs.funcPointerDeclarator = funcPointerDeclarator;
}

  /**
   * Build a type specifier rule that includes typedef names and struct/union tags
   * @param {string[]} typedefNames - Typedef names to recognize as types
   * @param {string[]} structTags - Struct/union tag names to recognize
   * @returns {Object} Type specifier parser rule
   */
  function buildExtendedTypeSpecifier(typedefNames, structTags) {
    const typedefNameParser = map(
      pred(t => t.type === 'IDENTIFIER' && typedefNames.includes(t.value)),
      (token) => {
        return { kind: 'typedef', token };
      }
    );

    const structTypeRef = buildStructTypeRef();

    const typeQualifier = alt(kw('const'), kw('volatile'));
    const signedness = alt(kw('signed'), kw('unsigned'));
    const basicType = alt(
      kw('void'), kw('char'), kw('_Bool'),
      kw('short'), kw('int'), kw('long')
    );

    const qualifiers = many(typeQualifier);

    const withBoth = map(seq(qualifiers, signedness, basicType), ([qs, s, t]) => ({ kind: 'keyword', qualifiers: qs, signToken: s, typeToken: t }));
    const onlySign = map(seq(qualifiers, signedness), ([qs, s]) => ({ kind: 'keyword', qualifiers: qs, signToken: s, typeToken: null }));
    const onlyType = map(seq(qualifiers, basicType), ([qs, t]) => ({ kind: 'keyword', qualifiers: qs, signToken: null, typeToken: t }));

    return map(
      alt(
        structTypeRef,
        typedefNameParser,
        withBoth,
        onlySign,
        onlyType
      ),
      (value) => {
        if (value.structKind) {
          return value;
        }
        if (value.kind === 'typedef') {
          return new AST.TypeSpecNode(value.token.value, true, false, false, null, locFromToken(value.token));
        }
        const qualTokens = value.qualifiers || [];
        const isConst = qualTokens.some(t => t.value === 'const');
        const isVolatile = qualTokens.some(t => t.value === 'volatile');
        const locToken = qualTokens.length > 0 ? qualTokens[0] : (value.signToken || value.typeToken);
        if (value.typeToken) {
          const typeKw = value.typeToken.value;
          let isSigned = undefined;
          if (value.signToken) {
            isSigned = value.signToken.value === 'signed';
          }
          return createTypeSpec(typeKw, isSigned, value.typeToken, isConst, isVolatile);
        } else if (value.signToken) {
          const isSigned = value.signToken.value === 'signed';
          const baseType = isSigned ? 'int' : 'unsigned';
          return new AST.TypeSpecNode(baseType, isSigned, isConst, isVolatile, null, locFromToken(locToken));
        }
        return new AST.TypeSpecNode('int', true, isConst, isVolatile, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
      }
    );
  }

// Helper to build recursive function pointer parameter for nested cases
function buildRecursiveFuncPointerParam(ctx) {
  // This handles cases where a function parameter is itself a function pointer returning another function pointer
  return map(
    seq(
      opt(kw('register')),
      lazy(() => ctx.ruleRefs.typeSpecifier),
      lit('('),
      basicFuncPointerPattern,
      lit(')'),
      lazy(() => paramList)
    ),
    ([regKw, typeSpec, lparen, inner, rparen, params]) => {
      const returnBase = new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, false, false);
      const funcPtrType = createFunctionPointerType(returnBase, params || [], locFromToken(rparen));
      return new AST.ParameterNode(
        funcPtrType,
        inner.name,
        locFromToken(inner.name),
        regKw ? 'register' : null
      );
    }
  );
}



/**
 * C Grammar parser using PEG combinators with proper AST construction
 */
export class CPegParser {
  /**
   * Creates a new C grammar parser with all rules defined
   */
  constructor() {
    this.ruleRefs = {};
    this.typedefNames = [];
    this.structTags = [];
    
    this.ruleRefs.typeSpecifier = buildTypeSpecifier();
    buildPrimaryExpr(this);
    buildUnaryExpr(this);
    buildPostfixExpr(this);
    buildMultiplicativeExpr(this);
    buildAdditiveExpr(this);
    buildShiftExpr(this);
    buildRelationalExpr(this);
    buildEqualityExpr(this);
    buildBitwiseAndExpr(this);
    buildBitwiseXorExpr(this);
    buildBitwiseOrExpr(this);
    buildLogicalAndExpr(this);
    buildLogicalOrExpr(this);
    buildConditionalExpr(this);
    buildAssignmentExpr(this);
    buildExpression(this);
    buildStatementList(this);
    buildWhileStmt(this);
    buildDoWhileStmt(this);
    buildForStmt(this);
    buildSwitchStmt(this);
    buildBreakContinueStmt(this);
    buildGotoLabelStmt(this);
    buildStructDecl(this);
    buildEnumDecl(this);
    buildTypedefDecl(this);
    buildFunctionPointerDeclarator(this);
    buildStatement(this);
  }

  /**
   * Parse a token stream into an AST
   * @param {Token[]} tokens - Token array to parse
   * @returns {ASTNode|null} Parsed AST or null on failure
   */
  parse(tokens) {
    if (tokens.length === 0 || tokens[0].type === 'EOF') {
      return new AST.CompoundNode([], 
        { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    }

    if (!this.ruleRefs.statement || !this.ruleRefs.expression) {
      throw new Error("Parser not initialized properly");
    }

    const typedefNames = this.collectTypedefNames(tokens);
    const structTags = this.collectStructTags(tokens);
    return this.doParse(tokens, typedefNames, structTags);
  }

  /**
   * First pass: collect typedef names from the token stream
   * @param {Token[]} tokens - Token array to scan
   * @returns {string[]} Array of typedef names
   */
  collectTypedefNames(tokens) {
    const names = [];
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i].type === 'KEYWORD' && tokens[i].value === 'typedef') {
        i++;
        // Skip type keywords and already-known typedef names
        while (i < tokens.length && (tokens[i].type === 'KEYWORD' || names.includes(tokens[i].value))) {
          i++;
        }
        // Skip pointer stars and array brackets
        while (i < tokens.length && (tokens[i].type === '*' || tokens[i].type === '[' || tokens[i].type === ']')) {
          i++;
        }
        if (i < tokens.length && tokens[i].type === 'IDENTIFIER') {
          names.push(tokens[i].value);
          i++;
        }
      } else {
        i++;
      }
    }
    return names;
  }

  /**
   * First pass: collect struct/union tag names from the token stream
   * @param {Token[]} tokens - Token array to scan
   * @returns {string[]} Array of struct/union tag names
   */
  collectStructTags(tokens) {
    const tags = [];
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i].type === 'KEYWORD' && (tokens[i].value === 'struct' || tokens[i].value === 'union')) {
        i++;
        if (i < tokens.length && tokens[i].type === 'IDENTIFIER') {
          tags.push(tokens[i].value);
          i++;
        }
      } else {
        i++;
      }
    }
    return tags;
  }


  /**
   * Build the program-level parser with extended type support
   * @param {Token[]} tokens - Token array to parse
   * @param {string[]} typedefNames - Typedef names to recognize
   * @param {string[]} structTags - Struct/union tag names to recognize
   * @returns {AST.CompoundNode} Parsed AST
   */
  doParse(tokens, typedefNames, structTags) {
    this.typedefNames = typedefNames;
    this.structTags = structTags;
    if (typedefNames.length > 0 || structTags.length > 0) {
      this.ruleRefs.typeSpecifier = buildExtendedTypeSpecifier(typedefNames, structTags);
    }

    const defaultType = new AST.TypeSpecNode('int', true, false, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });

    const typedParam = map(
      seq(
        opt(kw('register')),
        lazy(() => this.ruleRefs.typeSpecifier),
        many(lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        many(seq(
          lit('['),
          opt(lazy(() => this.ruleRefs.expression)),
          lit(']')
        ))
      ),
      ([regKw, typeSpec, stars, name, arrayDims]) => {
        const pointerDepth = stars.length;
        const dims = arrayDims.map(dim => {
          const expr = dim[1];
          if (expr === null || expr === undefined) return null;
          if (expr instanceof AST.LiteralNode) return expr.value;
          return null;
        });
        const mergedType = mergeDeclaratorType(typeSpec, pointerDepth, dims);
        return new AST.ParameterNode(
          mergedType,
          name.value,
          locFromToken(typeSpec),
          regKw ? 'register' : null
        );
      }
    );

    const voidParam = kw('void');

    const bareParam = map(
      pred(t => t.type === 'IDENTIFIER'),
      (name) => {
        return new AST.ParameterNode(defaultType, name.value, locFromToken(name));
      }
    );

    const funcPointerParam = map(
      seq(
        opt(kw('register')),
        lazy(() => this.ruleRefs.typeSpecifier),
        this.ruleRefs.funcPointerDeclarator
      ),
      ([regKw, typeSpec, fpDecl]) => {
        const stars = fpDecl.stars || [];
        const pointerDepth = stars.length;
        const name = fpDecl.name ? fpDecl.name.value : null;
        const params = fpDecl.params || [];
        const returnBase = new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, false, false);
        const funcPtrType = createFunctionPointerType(returnBase, params, locFromToken(fpDecl.name || fpDecl.stars[0]));
        const mergedType = mergeDeclaratorType(funcPtrType, pointerDepth, []);
        return new AST.ParameterNode(
          mergedType,
          name,
          locFromToken(fpDecl.name || fpDecl.stars[0]),
          regKw ? 'register' : null
        );
      }
    );


    const singleParam = alt(typedParam, funcPointerParam, bareParam);

    // Variadic function: at least one named parameter followed by ellipsis (nothing after)
    const variadicWithEllipsis = map(
      seq(
        singleParam,
        many(seq(lit(','), singleParam)),
        lit(','),
        pred(t => t.type === 'ELLIPSIS')
      ),
      ([firstParam, restMiddle, , lastComma, ellipsis]) => {
        const params = [firstParam];
        for (const [, param] of restMiddle) {
          params.push(param);
        }
        // Create ellipsis parameter node and add to list
        const ellipsisParam = new AST.ParameterNode(
          new AST.TypeSpecNode('int', false, false, false, 0),
          null,
          locFromToken(ellipsis),
          null,
          true
        );
        params.push(ellipsisParam);
        return params;
      }
    );

    // Variadic function with only ellipsis: ...
    const variadicOnly = map(
      pred(t => t.type === 'ELLIPSIS'),
      (ellipsis) => {
        return [new AST.ParameterNode(
          new AST.TypeSpecNode('int', false, false, false, 0),
          null,
          locFromToken(ellipsis),
          null,
          true
        )];
      }
    );

    const paramList = alt(variadicWithEllipsis, variadicOnly, 
      map(
        seq(
          singleParam,
          many(seq(lit(','), singleParam))
        ),
        ([firstParam, rest]) => {
          const params = [firstParam];
          for (const [, param] of rest) {
            params.push(param);
          }
          return params;
        }
      )
    );

    const functionDef = map(
      seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        pred(t => t.type === 'IDENTIFIER'),
        lit('('),
        opt(alt(paramList, voidParam)),
        lit(')'),
        this.ruleRefs.statement
      ),
      ([returnType, name, , params, , body]) => {
        let paramNodes = [];
        if (params !== undefined && Array.isArray(params)) {
          paramNodes = params;
        }
        return new AST.FunctionNode(
          new AST.IdentifierNode(name.value, locFromToken(name)),
          returnType,
          paramNodes,
          body,
          locFromToken(returnType)
        );
      }
    );

    const variableDecl = map(
      seq(
        opt(kw('register')),
        lazy(() => this.ruleRefs.typeSpecifier),
        many(lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        many(seq(
          lit('['),
          opt(lazy(() => this.ruleRefs.expression)),
          lit(']')
        )),
        opt(seq(lit('='), lazy(() => this.ruleRefs.expression))),
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
        const initValue = init ? init[1] : null;
        return new AST.DeclNode('var', mergedType,
          new AST.IdentifierNode(name.value, locFromToken(name)),
          initValue, locFromToken(typeSpec),
          regKw ? 'register' : null);
      }
    );

    const variableDeclWithFuncPointer = alt(
      // Function pointer: type (*name)(params)
      map(
        seq(
          opt(kw('register')),
          lazy(() => this.ruleRefs.typeSpecifier),
          this.ruleRefs.funcPointerDeclarator,
          lit(';')
        ),
        ([regKw, typeSpec, fpDecl]) => {
          const stars = fpDecl.stars || [];
          const pointerDepth = stars.length;
          const name = fpDecl.name ? fpDecl.name.value : null;
          const params = fpDecl.params || [];
          const returnBase = new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, false, false);
          const funcPtrType = createFunctionPointerType(returnBase, params, locFromToken(fpDecl.name || fpDecl.stars[0]));
          const mergedType = mergeDeclaratorType(funcPtrType, pointerDepth, []);
          const ident = name ? new AST.IdentifierNode(name, locFromToken(fpDecl.name)) : null;
          return new AST.DeclNode('var', mergedType,
            ident, null, locFromToken(typeSpec),
            regKw ? 'register' : null);
        }
      ),
      variableDecl
    );

    const globalDecl = alt(
      this.ruleRefs.structDecl,
      this.ruleRefs.enumDecl,
      this.ruleRefs.typedefDecl,
      functionDef,
      variableDeclWithFuncPointer
    );
    const programParser = many(globalDecl);

    const result = programParser.parse(tokens, 0);

    const meaningfulTokens = tokens.filter(t => t.type !== 'EOF');
    if (!result.success || result.nextPos < meaningfulTokens.length) {
      const loc = tokens[result.nextPos]?.location || tokens[0]?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };
      throw new ParserError(result.error || 'Unexpected tokens after program', loc);
    }

    if (Array.isArray(result.value) && result.value.length > 0) {
      return new AST.CompoundNode(result.value,
        { file: '<input>', start: tokens[0].location.start, end: tokens[tokens.length-1].location.end });
    }

    return new AST.CompoundNode([],
      { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
  }

}
