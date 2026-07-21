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
 * C Grammar parser using PEG combinators with proper AST construction
 */
export class CPegParser {
  /**
   * Creates a new C grammar parser with all rules defined
   */
  constructor() {
    this.ruleRefs = {};
    
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

    this.ruleRefs.primaryExpr = map(
      Parser.alt(
        Parser.seq(Parser.lit('('), lazy(() => this.ruleRefs.expression), Parser.lit(')')),
        identifierOrLiteral
      ),
      (value) => {
        if (Array.isArray(value)) {
          return value[1];
        }
        return value;
      }
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
          node = new AST.UnaryOpNode(op.type, node, locFromToken(op));
        }
        return node;
      }
    );

    this.ruleRefs.unaryExpr = Parser.alt(
      unaryPrefix,
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
        Parser.many(pred(t => ['*', '/', '%'].includes(t.type)))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => ['+', '-'].includes(t.type)))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '<<' || t.type === '>>'))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => ['<', '>', '<=', '>='].includes(t.type)))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '==' || t.type === '!='))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '&'))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '^'))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '|'))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '&&'))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
        Parser.many(pred(t => t.type === '||'))
      ),
      ([left, ops]) => {
        let node = left;
        for (const op of ops) {
          node = new AST.BinaryOpNode(op.type, node, null, locFromToken(op));
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
          if (lhs.type === 'Identifier') {
            return new AST.BinaryOpNode(op.type, 
              new AST.IdentifierNode(lhs.value, locFromToken(lhs)), 
              rhs, locFromToken(op));
          }
          return new AST.BinaryOpNode(op.type, lhs, rhs, locFromToken(op));
        }
        if (lhs.type === 'Identifier') {
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
          this.ruleRefs.statement
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
        kw('int'),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.expression))),
        Parser.lit(';')
      ),
      ([keyword, name, init]) => {
        let initValue = null;
        if (init) {
          initValue = Array.isArray(init[1]) ? init[1][0] : init[1];
        }
        return new AST.DeclNode('var', 
          new AST.TypeSpecNode('int', true, false, null, locFromToken(keyword)),
          new AST.IdentifierNode(name.value, locFromToken(name)), 
          initValue, locFromToken(keyword));
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

    const intType = new AST.TypeSpecNode('int', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });

    const functionDef = map(
      Parser.seq(
        kw('int'),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.lit('('),
        Parser.opt(Parser.many(pred(t => t.type === 'IDENTIFIER'))),
        Parser.lit(')'),
        this.ruleRefs.statement
      ),
      ([keyword, name, , params, , body]) => {
        const paramNodes = (params || []).map(p => 
          new AST.ParameterNode(intType, p.value, locFromToken(p))
        );
        return new AST.FunctionNode(
          new AST.IdentifierNode(name.value, locFromToken(name)),
          intType,
          paramNodes,
          body,
          locFromToken(keyword)
        );
      }
    );

    const variableDecl = map(
      Parser.seq(
        kw('int'),
        pred(t => t.type === 'IDENTIFIER'),
        Parser.opt(Parser.seq(Parser.lit('='), lazy(() => this.ruleRefs.expression))),
        Parser.lit(';')
      ),
      ([keyword, name, init]) => {
        const initValue = init ? init[1] : null;
        return new AST.DeclNode('var', intType, 
          new AST.IdentifierNode(name.value, locFromToken(name)), 
          initValue, locFromToken(keyword));
      }
    );

    const globalDecl = Parser.alt(functionDef, variableDecl);
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
