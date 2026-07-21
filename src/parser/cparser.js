import { ParserError } from '../core/errors.js';
import * as AST from '../ast/nodes.js';
import { 
  Parser, LitParser, SeqParser, AltParser, ManyParser, SomeParser, OptParser, PredParser 
} from './combinators.js';

/**
 * Helper function to create predicate parsers using Parser static method
 */
const pred = (predicate) => Parser.pred(predicate);

/**
 * C Grammar parser using PEG combinators with proper AST construction
 */
export class CPegParser {
  /**
   * Creates a new C grammar parser with all rules defined
   */
  constructor() {
    this.ruleRefs = {};
    
    // Build all parser rules in dependency order
    this.buildPrimaryExpr();
    this.buildUnaryExpr();
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
    this.buildStatement();
  }

  /**
   * Build primary expression rule (identifiers, literals, function calls, etc.)
   */
  buildPrimaryExpr() {
    // Helper: identifier or literal
    const identifierOrLiteral = new AltParser(
      pred(t => t.type === 'IDENTIFIER'),
      pred(t => t.type === 'INTEGER' || t.type === 'STRING')
    );

    // Function call: name(args)
    const functionCall = new SeqParser(
      identifierOrLiteral,
      new LitParser('LPAREN'),
      new OptParser(this.ruleRefs.expression),
      new LitParser('RPAREN')
    );

    // Array subscript: arr[index]
    const arraySubscript = new SeqParser(
      identifierOrLiteral,
      new LitParser('LBRACKET'),
      this.ruleRefs.expression,
      new LitParser('RBRACKET')
    );

    // Member access: obj.field or obj->field  
    const memberAccessDot = new SeqParser(
      this.ruleRefs.unaryExpr,
      new LitParser('DOT'),
      pred(t => t.type === 'IDENTIFIER')
    );

    const memberAccessArrow = new SeqParser(
      this.ruleRefs.unaryExpr,
      new LitParser('ARROW'),
      pred(t => t.type === 'IDENTIFIER')
    );

    // Unary operators: ++x, --x, +x, -x, ~x, !x
    const unaryPrefix = new SeqParser(
      new SomeParser(pred(t => ['++', '--', '+', '-', '~', '!'].includes(t.type))),
      identifierOrLiteral
    );

    this.ruleRefs.primaryExpr = new AltParser(
      functionCall,
      arraySubscript,
      memberAccessDot,
      memberAccessArrow,
      unaryPrefix,
      // Parenthesized expression (recursive)
      new SeqParser(new LitParser('LPAREN'), this.ruleRefs.expression, new LitParser('RPAREN')),
      identifierOrLiteral
    );
  }

  /**
   * Build unary expression rule
   */
  buildUnaryExpr() {
    // Unary expressions are primarily primary expressions with optional prefix operators
    // Prefix operators handled in primaryExpr, so this just references it
    this.ruleRefs.unaryExpr = this.ruleRefs.primaryExpr;
  }

  /**
   * Build multiplicative expression rule (* / %)
   */
  buildMultiplicativeExpr() {
    this.ruleRefs.multiplicativeExpr = new SeqParser(
      this.ruleRefs.unaryExpr,
      new ManyParser(pred(t => ['*', '/', '%'].includes(t.type)))
    );
  }

  /**
   * Build additive expression rule (+ -)
   */
  buildAdditiveExpr() {
    this.ruleRefs.additiveExpr = new SeqParser(
      this.ruleRefs.multiplicativeExpr,
      new ManyParser(pred(t => ['+', '-'].includes(t.type)))
    );
  }

  /**
   * Build shift expression rule (<< >>)
   */
  buildShiftExpr() {
    this.ruleRefs.shiftExpr = new SeqParser(
      this.ruleRefs.additiveExpr,
      new ManyParser(pred(t => t.type === 'SHL' || t.type === 'SHR'))
    );
  }

  /**
   * Build relational expression rule (< > <= >=)
   */
  buildRelationalExpr() {
    this.ruleRefs.relationalExpr = new SeqParser(
      this.ruleRefs.shiftExpr,
      new ManyParser(pred(t => ['<', '>', '<=', '>='].includes(t.type)))
    );
  }

  /**
   * Build equality expression rule (== !=)
   */
  buildEqualityExpr() {
    this.ruleRefs.equalityExpr = new SeqParser(
      this.ruleRefs.relationalExpr,
      new ManyParser(pred(t => t.type === 'EQ' || t.type === 'NE'))
    );
  }

  /**
   * Build bitwise AND expression rule (&)
   */
  buildBitwiseAndExpr() {
    this.ruleRefs.bitwiseAndExpr = new SeqParser(
      this.ruleRefs.equalityExpr,
      new ManyParser(pred(t => t.type === 'AMPERSAND'))
    );
  }

  /**
   * Build bitwise XOR expression rule (^)
   */
  buildBitwiseXorExpr() {
    this.ruleRefs.bitwiseXorExpr = new SeqParser(
      this.ruleRefs.bitwiseAndExpr,
      new ManyParser(pred(t => t.type === 'CARET'))
    );
  }

  /**
   * Build bitwise OR expression rule (|)
   */
  buildBitwiseOrExpr() {
    this.ruleRefs.bitwiseOrExpr = new SeqParser(
      this.ruleRefs.bitwiseXorExpr,
      new ManyParser(pred(t => t.type === 'PIPE'))
    );
  }

  /**
   * Build logical AND expression rule (&&)
   */
  buildLogicalAndExpr() {
    this.ruleRefs.logicalAndExpr = new SeqParser(
      this.ruleRefs.bitwiseOrExpr,
      new ManyParser(pred(t => t.type === 'AND'))
    );
  }

  /**
   * Build logical OR expression rule (||)
   */
  buildLogicalOrExpr() {
    this.ruleRefs.logicalOrExpr = new SeqParser(
      this.ruleRefs.logicalAndExpr,
      new ManyParser(pred(t => t.type === 'OR'))
    );
  }

  /**
   * Build conditional expression rule (cond ? true : false)
   */
  buildConditionalExpr() {
    // Conditional body: ? expr : expr
    const conditionalBody = new SeqParser(
      new LitParser('QUESTION'),
      this.ruleRefs.expression,
      new LitParser('COLON'),
      this.ruleRefs.conditionalExpr  // Recursive for chaining
    );

    this.ruleRefs.conditionalExpr = new AltParser(
      new SeqParser(this.ruleRefs.logicalOrExpr, new OptParser(conditionalBody)),
      this.ruleRefs.logicalAndExpr
    );
  }

  /**
   * Build assignment expression rule (var = expr)
   */
  buildAssignmentExpr() {
    // Simple identifier for LHS of assignment
    const lhsIdentifier = pred(t => t.type === 'IDENTIFIER');

    this.ruleRefs.assignmentExpr = new SeqParser(
      new AltParser(this.ruleRefs.conditionalExpr, lhsIdentifier),
      new OptParser(new SeqParser(
        pred(t => ['=', '+=', '-=', '*=', '/='].includes(t.type)),
        this.ruleRefs.expression
      ))
    );
  }

  /**
   * Build full expression rule (comma operator)
   */
  buildExpression() {
    // Expression can be comma-separated sequence of assignments
    this.ruleRefs.expression = new ManyParser(
      new SeqParser(this.ruleRefs.assignmentExpr, new OptParser(new LitParser('COMMA')))
    );
  }

  /**
   * Build statement rule (compound, if, return, etc.)
   */
  buildStatement() {
    // Compound statement: { statements }
    const compoundStmt = new SeqParser(
      new LitParser('LBRACE'),
      new OptParser(this.buildStatementList()),
      new LitParser('RBRACE')
    );

    // If statement
    const ifStmt = new SeqParser(
      pred(t => t.type === 'IF'),
      new LitParser('LPAREN'),
      this.ruleRefs.conditionalExpr,
      new LitParser('RPAREN'),
      this.ruleRefs.statement,
      new OptParser(new SeqParser(
        new LitParser('ELSE'),
        this.ruleRefs.statement
      ))
    );

    // Return statement
    const returnStmt = new SeqParser(
      pred(t => t.type === 'RETURN'),
      new OptParser(this.ruleRefs.expression),
      new LitParser('SEMICOLON')
    );

    // Expression statement: expr;
    const exprStmt = new SeqParser(
      this.ruleRefs.expression,
      new LitParser('SEMICOLON')
    );

    this.ruleRefs.statement = new AltParser(
      compoundStmt,
      ifStmt,
      returnStmt,
      exprStmt
    );
  }

  /**
   * Build statement list (sequence of statements)
   */
  buildStatementList() {
    this.ruleRefs.statementList = new ManyParser(this.ruleRefs.statement);
  }

  /**
   * Parse a token stream into an AST
   * @param {Token[]} tokens - Token array to parse
   * @returns {ASTNode|null} Parsed AST or null on failure
   */
  parse(tokens) {
    // Check if parsing is possible at all
    if (tokens.length === 0 || tokens[0].type === 'EOF') {
        return new AST.CompoundNode([], 
            { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    }

    // Build simple program parser using imported classes
    const functionDef = new SeqParser(
        pred(t => t.type === 'INT'),
        pred(t => t.type === 'IDENTIFIER'),
        new LitParser('LPAREN'),
        new OptParser(new ManyParser(pred(t => t.type === 'IDENTIFIER'))),
        new LitParser('RPAREN'),
        this.ruleRefs.statement
    );

    const variableDecl = new SeqParser(
        pred(t => t.type === 'INT'),
        pred(t => t.type === 'IDENTIFIER'),
        new OptParser(new SeqParser(new LitParser('ASSIGN'), this.ruleRefs.expression)),
        new LitParser('SEMICOLON')
    );

    const globalDecl = new AltParser([functionDef, variableDecl]);
    const programParser = new ManyParser(globalDecl);
    
    const result = programParser.parse(tokens, 0);
    
    if (!result.success) {
        throw new ParserError(result.error || 'Failed to parse program', 
            tokens[0]?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    }

    if (Array.isArray(result.value)) {
        return new AST.CompoundNode(result.value, 
            { file: '<input>', start: tokens[0].location.start, end: tokens[tokens.length-1].location.end });
    }

    return result.value;
}
}
