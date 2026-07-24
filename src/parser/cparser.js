import { ParserError } from '../core/errors.js';
import * as AST from '../ast/nodes.js';
import { TokenType } from '../preprocessor/tokenTypes.js';
import { Parser, many, map, opt, lit, lazy, pred, alt, seq } from './combinators.js';

// Type system
import {
  createTypeSpec,
  mergeDeclaratorType,
  createFunctionPointerType,
  buildTypeSpecifier,
  buildStructTypeRef,
  locFromToken,
} from './type-system.js';

// Expressions (in precedence order)
import { buildPrimaryExpr } from './expr-primary.js';
import { buildUnaryExpr } from './expr-unary.js';
import { buildPostfixExpr } from './expr-postfix.js';
import { buildMultiplicativeExpr } from './expr-mul.js';
import { buildAdditiveExpr } from './expr-add.js';
import { buildShiftExpr } from './expr-shift.js';
import { buildRelationalExpr, buildEqualityExpr } from './expr-rel.js';
import { buildBitwiseAndExpr, buildBitwiseXorExpr, buildBitwiseOrExpr } from './expr-bitwise.js';
import { buildLogicalAndExpr, buildLogicalOrExpr } from './expr-logical.js';
import { buildConditionalExpr } from './expr-ternary.js';
import { buildAssignmentExpr } from './expr-assign.js';
import { buildExpression } from './expr-comma.js';

// Statements
import { buildStatementList, buildStatement } from './stmt-local.js';
import {
  buildWhileStmt,
  buildDoWhileStmt,
  buildForStmt,
  buildSwitchStmt,
  buildBreakContinueStmt,
  buildGotoLabelStmt,
} from './stmt-control.js';

// Declarations
import { buildStructDecl, buildEnumDecl, buildTypedefDecl } from './decl-global.js';

// Function pointers
import {
  buildFunctionPointerDeclarator,
  buildExtendedTypeSpecifier,
  buildRecursiveFuncPointerParam,
} from './function-pointers.js';

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

    const kw = (keyword) => pred(t => t.type === 'KEYWORD' && t.value === keyword);
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
        // fpDecl.name is already a string (extracted by funcPointerDeclarator)
        const name = fpDecl.name || null;
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
