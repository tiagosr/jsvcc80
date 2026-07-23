import { ParserError } from '../core/errors.js';
import * as AST from '../ast/nodes.js';
import { 
  Parser, LitParser, SeqParser, AltParser, ManyParser, SomeParser, OptParser, PredParser,
  lazy, map
} from './combinators.js';

/**
 * Helper function to create predicate parsers using Parser static method
 */
const pred = (predicate) => Parser.pred(predicate);

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
 * @returns {AST.TypeSpecNode}
 */
function createTypeSpec(typeKw, isSigned, token) {
  const info = TypeInfos[typeKw];
  if (!info) {
    return new AST.TypeSpecNode(typeKw, isSigned !== false, false, null, locFromToken(token));
  }
  const effectiveSigned = isSigned !== undefined ? isSigned : info.isSigned;
  return new AST.TypeSpecNode(info.baseType, effectiveSigned, false, null, locFromToken(token));
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
    return new AST.TypeSpecNode(baseType.baseType, baseType.isSigned, baseType.isConst, baseType.bitWidth, loc, 0, true, dim);
  }
  return new AST.TypeSpecNode(baseType.baseType, baseType.isSigned, baseType.isConst, baseType.bitWidth, loc, pointerDepth, false, null);
}

/**
 * Build a type specifier parser rule
 * Matches: [signed|unsigned] [void|char|_Bool|short|int|long] or struct/union tag
 * Requires at least one token to be consumed.
 * @returns {Object} Parser rule
 */
function buildTypeSpecifier() {
  const signedness = Parser.alt(kw('signed'), kw('unsigned'));
  const basicType = Parser.alt(
    kw('void'), kw('char'), kw('_Bool'),
    kw('short'), kw('int'), kw('long')
  );

  // Try signedness + basicType first (e.g., "unsigned int")
  const withBoth = map(Parser.seq(signedness, basicType), ([s, t]) => [s, t]);
  // Try signedness only (e.g., "unsigned")
  const onlySign = map(signedness, (s) => [s, null]);
  // Try basicType only (e.g., "int")
  const onlyType = map(basicType, (t) => [null, t]);

  return map(
    Parser.alt(withBoth, onlySign, onlyType),
    ([signToken, typeToken]) => {
      if (typeToken) {
        const typeKw = typeToken.value;
        let isSigned = undefined;
        if (signToken) {
          isSigned = signToken.value === 'signed';
        }
        return createTypeSpec(typeKw, isSigned, typeToken);
      } else if (signToken) {
        const isSigned = signToken.value === 'signed';
        const baseType = isSigned ? 'int' : 'unsigned';
        return new AST.TypeSpecNode(baseType, isSigned, false, null, locFromToken(signToken));
      }
      return new AST.TypeSpecNode('int', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
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
    Parser.seq(
      Parser.alt(kw('struct'), kw('union')),
      pred(t => t.type === 'IDENTIFIER')
    ),
    ([kindToken, tagToken]) => {
      return new AST.TypeSpecNode(
        kindToken.value, true, false, null,
        locFromToken(kindToken), 0, false, null,
        tagToken.value, kindToken.value
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
    this.buildPrimaryExpr();
    this.buildUnaryExpr();
    this.buildPostfixExpr();
    this.buildMultiplicativeExpr();
    this.buildAdditiveExpr();
    this.buildShiftExpr();
    this.buildRelationalExpr();
    this.buildEqualityExpr();
    this.buildBitwiseAndExpr();
    this.buildBitwiseXorExpr();
    this.buildBitwiseOrExpr();
    this.buildLogicalAndExpr();
    this.buildLogicalOrExpr();
    this.buildConditionalExpr();
    this.buildAssignmentExpr();
    this.buildExpression();
    this.buildStatementList();
    this.buildWhileStmt();
    this.buildDoWhileStmt();
    this.buildForStmt();
    this.buildSwitchStmt();
    this.buildBreakContinueStmt();
    this.buildGotoLabelStmt();
    this.buildStructDecl();
    this.buildEnumDecl();
    this.buildTypedefDecl();
    this.buildStatement();
  }

  /**
   * Build primary expression rule (identifiers, literals, parenthesized expressions)
   */
  buildPrimaryExpr() {
    const identifierOrLiteral = map(
      Parser.alt(
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

    const parenExpr = Parser.seq(Parser.lit('('), lazy(() => this.ruleRefs.expression), Parser.lit(')'));

    const basePrimary = map(
      Parser.alt(parenExpr, identifierOrLiteral),
      (value) => {
        if (Array.isArray(value)) {
          return value[1];
        }
        return value;
      }
    );

    const derefExpr = map(
      Parser.seq(
        Parser.lit('*'),
        lazy(() => this.ruleRefs.primaryExpr)
      ),
      ([star, operand]) => {
        return new AST.UnaryOpNode('deref', operand, locFromToken(star));
      }
    );

    // sizeof(expr) or sizeof(type)
    // Note: typeSpecifier must be tried first, since expression (via Parser.many) can match zero tokens
    const sizeofExpr = map(
      Parser.seq(
        kw('sizeof'),
        Parser.lit('('),
        Parser.alt(
          lazy(() => this.ruleRefs.typeSpecifier),
          pred(t => t.type === 'IDENTIFIER'),
          lazy(() => this.ruleRefs.expression)
        ),
        Parser.lit(')')
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
      Parser.seq(
        kw('offsetof'),
        Parser.lit('('),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit(','),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit(')')
      ),
      ([kwToken, , typeToken, , fieldToken,]) => {
        return new AST.OffsetOfNode(typeToken.value, fieldToken.value, locFromToken(kwToken));
      }
    );

    // typeof(expr)
    const typeofExpr = map(
      Parser.seq(
        kw('typeof'),
        Parser.lit('('),
        lazy(() => this.ruleRefs.expression),
        Parser.lit(')')
      ),
      ([kwToken, , operand,]) => {
        return new AST.TypeOfNode(operand, locFromToken(kwToken));
      }
    );

    this.ruleRefs.primaryExpr = Parser.alt(
      sizeofExpr,
      offsetofExpr,
      typeofExpr,
      derefExpr,
      basePrimary
    );
  }

  /**
   * Build unary expression rule (prefix operators)
   */
  buildUnaryExpr() {
    const unaryPrefix = map(
      Parser.seq(
        Parser.some(pred(t => ['++', '--', '+', '-', '~', '!'].includes(t.type))),
        lazy(() => this.ruleRefs.unaryExpr)
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
      Parser.seq(
        pred(t => t.type === '&'),
        lazy(() => this.ruleRefs.unaryExpr)
      ),
      ([amp, operand]) => {
        return new AST.AddressOfNode(operand, locFromToken(amp));
      }
    );

    this.ruleRefs.unaryExpr = Parser.alt(
      unaryPrefix,
      addressOf,
      this.ruleRefs.primaryExpr
    );
  }

  /**
   * Build postfix expression rule (function calls, array subscripts, member access)
   */
  buildPostfixExpr() {
    const functionCall = map(
      Parser.seq(
        Parser.lit('('),
        Parser.opt(lazy(() => this.ruleRefs.expression)),
        Parser.lit(')')
      ),
      ([lparen, args]) => {
        return { kind: 'call', args: args || [] };
      }
    );

    const arraySubscript = map(
      Parser.seq(
        Parser.lit('['),
        lazy(() => this.ruleRefs.expression),
        Parser.lit(']')
      ),
      ([, index]) => {
        return { kind: 'index', index };
      }
    );

    const memberAccessDot = map(
      Parser.seq(
        Parser.lit('.'),
        pred(t => t.type === 'IDENTIFIER')
      ),
      ([, field]) => {
        return { kind: 'member', field: new AST.IdentifierNode(field.value, locFromToken(field)) };
      }
    );

    const memberAccessArrow = map(
      Parser.seq(
        Parser.lit('->'),
        pred(t => t.type === 'IDENTIFIER')
      ),
      ([, field]) => {
        return { kind: 'pointerMember', field: new AST.IdentifierNode(field.value, locFromToken(field)) };
      }
    );

    const postfixOp = Parser.alt(
      functionCall,
      arraySubscript,
      memberAccessDot,
      memberAccessArrow
    );

    this.ruleRefs.postfixExpr = map(
      Parser.seq(
        this.ruleRefs.unaryExpr,
        Parser.many(postfixOp)
      ),
      ([base, ops]) => {
        let node = base;
        for (const op of ops) {
          switch (op.kind) {
            case 'call':
              node = new AST.CallNode(node, op.args, locFromToken(node));
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
   */
  buildMultiplicativeExpr() {
    this.ruleRefs.multiplicativeExpr = map(
      Parser.seq(
        this.ruleRefs.postfixExpr,
        Parser.many(Parser.seq(
          pred(t => ['*', '/', '%'].includes(t.type)),
          lazy(() => this.ruleRefs.multiplicativeExpr)
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
   */
  buildAdditiveExpr() {
    this.ruleRefs.additiveExpr = map(
      Parser.seq(
        this.ruleRefs.multiplicativeExpr,
        Parser.many(Parser.seq(
          pred(t => ['+', '-'].includes(t.type)),
          lazy(() => this.ruleRefs.additiveExpr)
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
   */
  buildShiftExpr() {
    this.ruleRefs.shiftExpr = map(
      Parser.seq(
        this.ruleRefs.additiveExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '<<' || t.type === '>>'),
          lazy(() => this.ruleRefs.shiftExpr)
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
  buildRelationalExpr() {
    this.ruleRefs.relationalExpr = map(
      Parser.seq(
        this.ruleRefs.shiftExpr,
        Parser.many(Parser.seq(
          pred(t => ['<', '>', '<=', '>='].includes(t.type)),
          lazy(() => this.ruleRefs.relationalExpr)
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
   */
  buildEqualityExpr() {
    this.ruleRefs.equalityExpr = map(
      Parser.seq(
        this.ruleRefs.relationalExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '==' || t.type === '!='),
          lazy(() => this.ruleRefs.equalityExpr)
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
  buildBitwiseAndExpr() {
    this.ruleRefs.bitwiseAndExpr = map(
      Parser.seq(
        this.ruleRefs.equalityExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '&'),
          lazy(() => this.ruleRefs.bitwiseAndExpr)
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
  buildBitwiseXorExpr() {
    this.ruleRefs.bitwiseXorExpr = map(
      Parser.seq(
        this.ruleRefs.bitwiseAndExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '^'),
          lazy(() => this.ruleRefs.bitwiseXorExpr)
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
  buildBitwiseOrExpr() {
    this.ruleRefs.bitwiseOrExpr = map(
      Parser.seq(
        this.ruleRefs.bitwiseXorExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '|'),
          lazy(() => this.ruleRefs.bitwiseOrExpr)
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
  buildLogicalAndExpr() {
    this.ruleRefs.logicalAndExpr = map(
      Parser.seq(
        this.ruleRefs.bitwiseOrExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '&&'),
          lazy(() => this.ruleRefs.logicalAndExpr)
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
  buildLogicalOrExpr() {
    this.ruleRefs.logicalOrExpr = map(
      Parser.seq(
        this.ruleRefs.logicalAndExpr,
        Parser.many(Parser.seq(
          pred(t => t.type === '||'),
          lazy(() => this.ruleRefs.logicalOrExpr)
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
  buildConditionalExpr() {
    const conditionalBody = map(
      Parser.seq(
        Parser.lit('?'),
        lazy(() => this.ruleRefs.expression),
        Parser.lit(':'),
        lazy(() => this.ruleRefs.conditionalExpr)
      ),
      ([, trueBranch, , falseBranch]) => {
        return { trueBranch, falseBranch };
      }
    );

    this.ruleRefs.conditionalExpr = map(
      Parser.alt(
        Parser.seq(this.ruleRefs.logicalOrExpr, Parser.opt(conditionalBody)),
        this.ruleRefs.logicalAndExpr
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
  buildAssignmentExpr() {
    const lhsIdentifier = pred(t => t.type === 'IDENTIFIER');

    this.ruleRefs.assignmentExpr = map(
      Parser.seq(
        Parser.alt(this.ruleRefs.conditionalExpr, lhsIdentifier),
        Parser.opt(Parser.seq(
          pred(t => ['=', '+=', '-=', '*=', '/='].includes(t.type)),
          lazy(() => this.ruleRefs.expression)
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
  buildExpression() {
    this.ruleRefs.expression = map(
      Parser.many(
        Parser.seq(this.ruleRefs.assignmentExpr, Parser.opt(Parser.lit(',')))
      ),
      (items) => {
        if (items.length === 0) return null;
        if (items.length === 1) return items[0][0];
        return items.map(item => item[0]);
      }
    );

    // Single expression (non-array version for use in contexts expecting one expression)
    this.ruleRefs.singleExpression = map(this.ruleRefs.expression, (expr) => expr);
  }

  /**
   * Build while loop statement
   */
  buildWhileStmt() {
    this.ruleRefs.whileStmt = map(
      Parser.seq(
        kw('while'),
        Parser.lit('('),
        lazy(() => this.ruleRefs.conditionalExpr),
        Parser.lit(')'),
        lazy(() => this.ruleRefs.statement)
      ),
      ([keyword, , condition, , body]) => {
        return new AST.ControlFlowNode('while', condition, body, null, locFromToken(keyword));
      }
    );
  }

  /**
   * Build do-while loop statement
   */
  buildDoWhileStmt() {
    this.ruleRefs.doWhileStmt = map(
      Parser.seq(
        kw('do'),
        lazy(() => this.ruleRefs.statement),
        kw('while'),
        Parser.lit('('),
        lazy(() => this.ruleRefs.conditionalExpr),
        Parser.lit(')'),
        Parser.lit(';')
      ),
      ([doKw, body, , lparen, condition, , semi]) => {
        return new AST.ControlFlowNode('do_while', condition, body, null, locFromToken(doKw));
      }
    );
  }

  /**
   * Build for loop statement
   */
  buildForStmt() {
    const forInitDecl = map(
      Parser.seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        Parser.many(Parser.lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.many(Parser.seq(
          Parser.lit('['),
          Parser.opt(lazy(() => this.ruleRefs.expression)),
          Parser.lit(']')
        )),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.expression)))
      ),
      ([typeSpec, stars, name, arrayDims, init]) => {
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
          initValue, locFromToken(typeSpec));
      }
    );

    const forInitExpr = map(
      Parser.opt(lazy(() => this.ruleRefs.expression)),
      (expr) => {
        if (!expr) return null;
        return Array.isArray(expr) ? expr[0] : expr;
      }
    );

    this.ruleRefs.forStmt = map(
      Parser.seq(
        kw('for'),
        Parser.lit('('),
        Parser.alt(forInitDecl, forInitExpr),
        Parser.lit(';'),
        Parser.opt(lazy(() => this.ruleRefs.expression)),
        Parser.lit(';'),
        Parser.opt(lazy(() => this.ruleRefs.expression)),
        Parser.lit(')'),
        lazy(() => this.ruleRefs.statement)
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
  buildSwitchStmt() {
    const caseClause = map(
      Parser.seq(
        kw('case'),
        lazy(() => this.ruleRefs.conditionalExpr),
        Parser.lit(':'),
        Parser.many(lazy(() => this.ruleRefs.statement))
      ),
      ([, value, , statements]) => {
        return new AST.CaseClauseNode(value, statements, locFromToken(value));
      }
    );

    const defaultClause = map(
      Parser.seq(
        kw('default'),
        Parser.lit(':'),
        Parser.many(lazy(() => this.ruleRefs.statement))
      ),
      ([keyword, , statements]) => {
        return new AST.CaseClauseNode(null, statements, locFromToken(keyword));
      }
    );

    this.ruleRefs.switchStmt = map(
      Parser.seq(
        kw('switch'),
        Parser.lit('('),
        lazy(() => this.ruleRefs.conditionalExpr),
        Parser.lit(')'),
        Parser.lit('{'),
        Parser.many(Parser.alt(caseClause, defaultClause)),
        Parser.lit('}')
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
  buildBreakContinueStmt() {
    this.ruleRefs.breakStmt = map(
      Parser.seq(
        Parser.alt(kw('break'), kw('continue')),
        Parser.lit(';')
      ),
      ([keyword]) => {
        return new AST.JumpNode(keyword.value, locFromToken(keyword));
      }
    );
  }

  /**
   * Build goto statement and labeled statement
   */
  buildGotoLabelStmt() {
    this.ruleRefs.gotoStmt = map(
      Parser.seq(
        kw('goto'),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit(';')
      ),
      ([keyword, target]) => {
        return new AST.GotoNode(new AST.IdentifierNode(target.value, locFromToken(target)), locFromToken(keyword));
      }
    );

    this.ruleRefs.labelStmt = map(
      Parser.seq(
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit(':'),
        lazy(() => this.ruleRefs.statement)
      ),
      ([label, , body]) => {
        return new AST.LabelNode(new AST.IdentifierNode(label.value, locFromToken(label)), body, locFromToken(label));
      }
    );
  }

  /**
   * Build struct/union declaration
   */
  buildStructDecl() {
    const structField = map(
      Parser.seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        Parser.many(Parser.lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.expression))),
        Parser.lit(';')
      ),
      ([typeSpec, stars, name, init]) => {
        let initValue = null;
        if (init) {
          initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
        }
        const pointerDepth = stars.length;
        const fieldType = pointerDepth > 0
          ? new AST.TypeSpecNode(typeSpec.baseType, typeSpec.isSigned, typeSpec.isConst, typeSpec.bitWidth, typeSpec.location, pointerDepth)
          : typeSpec;
        return new AST.StructFieldNode(
          fieldType,
          new AST.IdentifierNode(name.value, locFromToken(name)),
          null, locFromToken(typeSpec));
      }
    );

    this.ruleRefs.structDecl = map(
      Parser.seq(
        Parser.alt(kw('struct'), kw('union')),
        Parser.opt(pred(t => t.type === 'IDENTIFIER')),
        Parser.lit('{'),
        Parser.many(structField),
        Parser.lit('}'),
        Parser.many(Parser.seq(
          pred(t => t.type === 'IDENTIFIER'),
          Parser.opt(Parser.lit('='))
        )),
        Parser.lit(';')
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
  buildEnumDecl() {
    const enumValue = map(
      Parser.seq(
        pred(t => t.type === 'IDENTIFIER'),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.conditionalExpr)))
      ),
      ([name, valueOpt]) => {
        const value = valueOpt ? (Array.isArray(valueOpt[1]) ? valueOpt[1][0] : valueOpt[1]) : null;
        return new AST.EnumValueNode(
          new AST.IdentifierNode(name.value, locFromToken(name)),
          value, locFromToken(name));
      }
    );

    this.ruleRefs.enumDecl = map(
      Parser.seq(
        kw('enum'),
        Parser.opt(pred(t => t.type === 'IDENTIFIER')),
        Parser.lit('{'),
        Parser.many(Parser.seq(enumValue, Parser.opt(Parser.lit(',')))),
        Parser.lit('}'),
        Parser.many(Parser.seq(
          pred(t => t.type === 'IDENTIFIER'),
          Parser.opt(Parser.lit('='))
        )),
        Parser.lit(';')
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
  buildTypedefDecl() {
    this.ruleRefs.typedefDecl = map(
      Parser.seq(
        kw('typedef'),
        lazy(() => this.ruleRefs.typeSpecifier),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit(';')
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
  buildStatementList() {
    this.ruleRefs.statementList = Parser.many(lazy(() => this.ruleRefs.statement));
  }

  /**
   * Build statement rule (compound, if, return, etc.)
   */
  buildStatement() {
    const compoundStmt = map(
      Parser.seq(
        Parser.lit('{'),
        this.ruleRefs.statementList,
        Parser.lit('}')
      ),
      ([lbrace, statements]) => {
        return new AST.CompoundNode(statements, locFromToken(lbrace));
      }
    );

    const ifStmt = map(
      Parser.seq(
        kw('if'),
        Parser.lit('('),
        lazy(() => this.ruleRefs.conditionalExpr),
        Parser.lit(')'),
        lazy(() => this.ruleRefs.statement),
        Parser.opt(Parser.seq(
          kw('else'),
          lazy(() => this.ruleRefs.statement)
        ))
      ),
      ([keyword, , condition, , body, elsePart]) => {
        const elseBody = elsePart ? elsePart[1] : null;
        return new AST.ControlFlowNode('if', condition, body, elseBody, locFromToken(keyword));
      }
    );

    const returnStmt = map(
      Parser.seq(
        kw('return'),
        Parser.opt(lazy(() => this.ruleRefs.expression)),
        Parser.lit(';')
      ),
      ([keyword, value]) => {
        const returnValue = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value;
        return new AST.ReturnNode(returnValue, locFromToken(keyword));
      }
    );

    const localDecl = map(
      Parser.seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        Parser.many(Parser.lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.many(Parser.seq(
          Parser.lit('['),
          Parser.opt(lazy(() => this.ruleRefs.expression)),
          Parser.lit(']')
        )),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.expression))),
        Parser.lit(';')
      ),
      ([typeSpec, stars, name, arrayDims, init]) => {
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
          initValue, locFromToken(typeSpec));
      }
    );

    const exprStmt = map(
      Parser.seq(
        lazy(() => this.ruleRefs.expression),
        Parser.lit(';')
      ),
      ([expression, semi]) => {
        const expr = Array.isArray(expression) ? expression[0] : expression;
        return new AST.ExprStmtNode(expr, locFromToken(semi));
      }
    );

    this.ruleRefs.statement = Parser.alt(
      compoundStmt,
      ifStmt,
      this.ruleRefs.whileStmt,
      this.ruleRefs.doWhileStmt,
      this.ruleRefs.forStmt,
      this.ruleRefs.switchStmt,
      this.ruleRefs.breakStmt,
      this.ruleRefs.gotoStmt,
      this.ruleRefs.labelStmt,
      returnStmt,
      localDecl,
      exprStmt
    );
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
   * Build a type specifier rule that includes typedef names and struct/union tags
   * @param {string[]} typedefNames - Typedef names to recognize as types
   * @param {string[]} structTags - Struct/union tag names to recognize
   * @returns {Object} Type specifier parser rule
   */
  buildExtendedTypeSpecifier(typedefNames, structTags) {
    const typedefNameParser = map(
      pred(t => t.type === 'IDENTIFIER' && typedefNames.includes(t.value)),
      (token) => {
        return { kind: 'typedef', token };
      }
    );

    const structTypeRef = buildStructTypeRef();

    const signedness = Parser.alt(kw('signed'), kw('unsigned'));
    const basicType = Parser.alt(
      kw('void'), kw('char'), kw('_Bool'),
      kw('short'), kw('int'), kw('long')
    );

    const withBoth = map(Parser.seq(signedness, basicType), ([s, t]) => ({ kind: 'keyword', signToken: s, typeToken: t }));
    const onlySign = map(signedness, (s) => ({ kind: 'keyword', signToken: s, typeToken: null }));
    const onlyType = map(basicType, (t) => ({ kind: 'keyword', signToken: null, typeToken: t }));

    return map(
      Parser.alt(
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
          return new AST.TypeSpecNode(value.token.value, true, false, null, locFromToken(value.token));
        }
        if (value.typeToken) {
          const typeKw = value.typeToken.value;
          let isSigned = undefined;
          if (value.signToken) {
            isSigned = value.signToken.value === 'signed';
          }
          return createTypeSpec(typeKw, isSigned, value.typeToken);
        } else if (value.signToken) {
          const isSigned = value.signToken.value === 'signed';
          const baseType = isSigned ? 'int' : 'unsigned';
          return new AST.TypeSpecNode(baseType, isSigned, false, null, locFromToken(value.signToken));
        }
        return new AST.TypeSpecNode('int', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
      }
    );
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
      this.ruleRefs.typeSpecifier = this.buildExtendedTypeSpecifier(typedefNames, structTags);
    }

    const defaultType = new AST.TypeSpecNode('int', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });

    const typedParam = map(
      Parser.seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        Parser.many(Parser.lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.many(Parser.seq(
          Parser.lit('['),
          Parser.opt(lazy(() => this.ruleRefs.expression)),
          Parser.lit(']')
        ))
      ),
      ([typeSpec, stars, name, arrayDims]) => {
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
          locFromToken(typeSpec)
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

    const singleParam = Parser.alt(typedParam, bareParam);

    const paramList = map(
      Parser.seq(
        singleParam,
        Parser.many(Parser.seq(Parser.lit(','), singleParam))
      ),
      ([firstParam, rest]) => {
        const params = [firstParam];
        for (const [, param] of rest) {
          params.push(param);
        }
        return params;
      }
    );

    const functionDef = map(
      Parser.seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit('('),
        Parser.opt(Parser.alt(paramList, voidParam)),
        Parser.lit(')'),
        this.ruleRefs.statement
      ),
      ([returnType, name, , params, , body]) => {
        let paramNodes = [];
        if (params && Array.isArray(params)) {
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
      Parser.seq(
        lazy(() => this.ruleRefs.typeSpecifier),
        Parser.many(Parser.lit('*')),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.many(Parser.seq(
          Parser.lit('['),
          Parser.opt(lazy(() => this.ruleRefs.expression)),
          Parser.lit(']')
        )),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.expression))),
        Parser.lit(';')
      ),
      ([typeSpec, stars, name, arrayDims, init]) => {
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
          initValue, locFromToken(typeSpec));
      }
    );

    const globalDecl = Parser.alt(
      this.ruleRefs.structDecl,
      this.ruleRefs.enumDecl,
      this.ruleRefs.typedefDecl,
      functionDef,
      variableDecl
    );
    const programParser = Parser.many(globalDecl);

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
