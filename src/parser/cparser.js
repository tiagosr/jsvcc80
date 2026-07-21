import { ParserError } from '../core/errors.js';
import { 
  withLocation, LitParser, SeqParser, AltParser, ManyParser, SomeParser, OptParser, 
  Parser 
} from './combinators.js';
import * as AST from '../ast/nodes.js';

// Helper to create predicate parsers using the static method
const pred = (predicate) => Parser.pred(predicate);

/**
 * C Grammar parser using PEG combinators
 */
export class CPegParser {
  /**
   * Creates a new C grammar parser with all rules defined
   */
  constructor() {
    // Predefine rule references for recursive structures
    this.ruleRefs = {};
    
    // Define primary expressions first (they're the base of expression hierarchy)
    const identifierOrLiteral = new AltParser(
      pred(t => t.type === 'IDENTIFIER'),
      pred(t => t.type === 'INTEGER' || t.type === 'STRING')
    );

    this.ruleRefs.primaryExpr = new AltParser(
      // Function call: name(args)
      new SeqParser(
        identifierOrLiteral,
        new LitParser('LPAREN'),
        new OptParser(this.buildExpressionList()),
        new LitParser('RPAREN')
      ),
      // Array subscript: arr[index]
      new SeqParser(
        identifierOrLiteral,
        new LitParser('LBRACKET'),
        pred(t => t.type === 'INTEGER'),
        new LitParser('RBRACKET')
      ),
      // Member access: obj.field or obj->field  
      new AltParser(
        new SeqParser(identifierOrLiteral, new LitParser('DOT'), identifierOrLiteral),
        new SeqParser(identifierOrLiteral, new LitParser('ARROW'), identifierOrLiteral)
      ),
      // Unary operators: ++x, --x, +x, -x, ~x, !x
      new SeqParser(new SomeParser(pred(t => ['++', '--', '+', '-', '~', '!'].includes(t.type))), identifierOrLiteral),
      // Parenthesized expression
      new SeqParser(new LitParser('LPAREN'), this.ruleRefs.expression, new LitParser('RPAREN')),
      // Simple identifiers and literals
      identifierOrLiteral
    );

    // Build complete expression chain with precedence levels
    this.ruleRefs.multiplicativeExpr = this.buildPrecedenceChain(
      this.ruleRefs.primaryExpr, 
      ['*', '/', '%'],
      (left, op) => ({ type: 'BinaryOp', op, left, right: null })
    );

    this.ruleRefs.additiveExpr = this.buildPrecedenceChain(
      this.ruleRefs.multiplicativeExpr,
      ['+', '-'],
      (left, op) => ({ type: 'BinaryOp', op, left, right: null })
    );

    this.ruleRefs.relationalExpr = this.buildPrecedenceChain(
      this.ruleRefs.additiveExpr,
      ['<', '>', '<=', '>='],
      (left, op) => ({ type: 'BinaryOp', op, left, right: null })
    );

    this.ruleRefs.equalityExpr = this.buildPrecedenceChain(
      this.ruleRefs.relationalExpr,
      ['==', '!='],
      (left, op) => ({ type: 'BinaryOp', op, left, right: null })
    );

    this.ruleRefs.logicalAndExpr = this.buildPrecedenceChain(
      this.ruleRefs.equalityExpr,
      ['&&'],
      (left, op) => ({ type: 'BinaryOp', op, left, right: null })
    );

    this.ruleRefs.logicalOrExpr = this.buildPrecedenceChain(
      this.ruleRefs.logicalAndExpr,
      ['||'],
      (left, op) => ({ type: 'BinaryOp', op, left, right: null })
    );

    // Conditional expression: cond ? true : false
    const conditionalBody = new SeqParser(
      new LitParser('QUESTION'),
      pred(t => t.type === 'INTEGER' || t.type === 'IDENTIFIER'),
      new LitParser('COLON'),
      this.ruleRefs.logicalOrExpr
    );

    this.ruleRefs.conditionalExpr = new AltParser(
      new SeqParser(this.ruleRefs.logicalOrExpr, new OptParser(conditionalBody)),
      this.ruleRefs.logicalAndExpr
    );

    // Assignment expression: var = expr or compound assignments
    const assignmentOps = ['=', '+=', '-=', '*=', '/='];
    
    this.ruleRefs.assignmentExpr = new SeqParser(
      new AltParser(this.ruleRefs.conditionalExpr, identifierOrLiteral),
      new OptParser(new SeqParser(pred(t => assignmentOps.includes(t.type))), pred(t => t.type === "INTEGER" || t.type === "IDENTIFIER"))
    );

    // Full expression (with comma operator support)
    this.ruleRefs.expression = new ManyParser(
      new SeqParser(this.ruleRefs.assignmentExpr, OptParser(new LitParser('COMMA')))
    );

    // Statements
    const compoundStmt = new SeqParser(new LitParser('LBRACE'), 
                                    new OptParser(this.buildStatementList()), 
                                    new LitParser('RBRACE'));

    const ifStmt = new SeqParser(
      new LitParser('IF'),
      new LitParser('LPAREN'),
      this.ruleRefs.conditionalExpr,
      new LitParser('RPAREN'),
      pred(t => t.type === 'LBRACE' || t.type === 'RETURN' || t.type === 'IDENTIFIER'), // simplified body check
      new OptParser(new SeqParser(new LitParser('ELSE'), pred(t => t.type === 'LBRACE')))
    );

    const returnStmt = new SeqParser(new LitParser('RETURN'), 
                                  new OptParser(pred(t => t.type === 'INTEGER')), 
                                  new LitParser('SEMICOLON'));

    this.ruleRefs.statement = new AltParser(
      compoundStmt,
      ifStmt,
      returnStmt
    );

    // Function definition: type name (params) { body }
    const paramList = new SeqParser(pred(t => t.type === 'INT'), 
                                 pred(t => t.type === 'IDENTIFIER'));
    
    this.ruleRefs.functionDef = new SeqParser(
      pred(t => t.type === 'INT'), // simplified type check
      pred(t => t.type === 'IDENTIFIER'),
      new LitParser('LPAREN'),
      new OptParser(new SeqParser(paramList, new ManyParser(new LitParser('COMMA')))),
      new LitParser('RPAREN'),
      new LitParser('LBRACE'),
      new OptParser(this.buildStatementList()),
      new LitParser('RBRACE')
    );

    // Variable declaration: type name = init;
    this.ruleRefs.variableDecl = new SeqParser(
      pred(t => t.type === 'INT'),
      pred(t => t.type === 'IDENTIFIER'),
      new OptParser(new SeqParser(new LitParser('ASSIGN'), pred(t => t.type === 'INTEGER'))),
      new LitParser('SEMICOLON')
    );

    // Global declarations: sequence of functions and variables
    this.ruleRefs.globalDecl = new AltParser(this.ruleRefs.functionDef, this.ruleRefs.variableDecl);

    // Complete program
    this.ruleRefs.program = new ManyParser(this.ruleRefs.globalDecl);
  }

  /**
   * Builds an expression list parser (comma-separated)
   * @returns {SeqParser} Expression list parser
   */
  buildExpressionList() {
    return new SeqParser(
      pred(t => t.type === 'INTEGER' || t.type === 'IDENTIFIER'),
      new ManyParser(new SeqParser(new LitParser('COMMA'), 
                          pred(t => t.type === "INTEGER" || t.type === "IDENTIFIER")))
    );
  }

  /**
   * Builds a precedence chain parser for operators
   * @param {object} base - Base expression parser
   * @param {string[]} ops - Operator types to match
   * @returns {SeqParser} Precedence chain parser
   */
  buildPrecedenceChain(base, ops) {
    const opParser = pred(t => ops.includes(t.type));
    
    return new SeqParser(
      base,
      new ManyParser(new SeqParser(opParser, 
                          pred(t => t.type === "INTEGER" || t.type === "IDENTIFIER")))
    );
  }

  /**
   * Builds a statement list parser (statements in sequence)
   * @returns {SeqParser} Statement list parser
   */
  buildStatementList() {
    return new ManyParser(pred( 
      ['LBRACE', 'IF', 'RETURN', 'WHILE', 'FOR'].includes(t.type) || t.type === 'IDENTIFIER'
    ));
  }

  /**
   * Parses a token stream into an AST
   * @param {Token[]} tokens - Token array to parse
   * @returns {ASTNode|null} Parsed AST or null on failure
   */
  parse(tokens) {
    // Check if parsing is possible at all
    if (tokens.length === 0 || tokens[0].type === 'EOF') {
      return new AST.CompoundNode([], 
        { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    }

    const result = this.ruleRefs.program.parse(tokens, 0);
    
    if (!result.success) {
      throw new ParserError(result.error || 'Failed to parse program', 
        tokens[0]?.location || { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    }

    return result.value;
  }
}
