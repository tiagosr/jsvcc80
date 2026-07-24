import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, many, lazy, lit, alt, pred } from './combinators.js';
import { createFunctionPointerType, createTypeSpec, buildStructTypeRef } from './type-system.js';

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
 * Parse parameter list for function pointer: (type1, type2, ...)
 * @param {CPegParser} ctx 
 */
function buildParamList(ctx) {
  const paramType = map(
    seq(
      lazy(() => ctx.ruleRefs.typeSpecifier),
      opt(pred(t => t.type === 'IDENTIFIER'))
    ),
    ([typeSpec, nameOpt]) => {
      return new AST.ParameterNode(typeSpec, nameOpt ? nameOpt.value : null, locFromToken(typeSpec));
    }
  );

  const paramListParser = map(
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
  
  // Store in ruleRefs for use by FunctionPointerDeclaratorParser
  ctx.ruleRefs.paramList = paramListParser;
  return paramListParser;
}

/**
 * Basic function pointer pattern: (*name) - used by both declarator and recursive param
 */
const basicFuncPointerPattern = map(
  seq(
    opt(many(lit('*'))),
    pred(t => t.type === 'IDENTIFIER')
  ),
  ([stars, name]) => {
    return { kind: 'innerFp', stars: stars || [], name: name.value };
  }
);

/**
 * Array dimension: [3]
 */
const arrayDimParser = map(
  seq(
    lit('['),
    pred(t => t.type === 'INTEGER'),
    lit(']')
  ),
  ([, dimToken]) => {
    return parseInt(dimToken.value, 10);
  }
);

/**
 * Custom parser for function pointer declarators with nested support
 * Handles: (*name)(params) and (*(*innerName)(innerParams))(outerParams)
 */
class FunctionPointerDeclaratorParser extends Parser {
  constructor(ctx) {
    super();
    this.ctx = ctx;
  }

  parse(tokens, pos) {
    // Match opening '('
    const openParenResult = lit('(').parse(tokens, pos);
    if (!openParenResult.success) {
      return openParenResult;
    }
    
    // Match optional '*' tokens
    const starsResult = opt(many(lit('*'))).parse(tokens, openParenResult.nextPos);
    const outerStars = starsResult.value || [];
    let currentPos = starsResult.nextPos;
    
    // Check what comes next to determine nested vs simple
    const nextToken = tokens[currentPos];
    
    if (nextToken && nextToken.type === '(') {
      // NESTED function pointer: parse inner declarator recursively
      const innerResult = this.ctx.ruleRefs.funcPointerDeclarator.parse(tokens, currentPos);
      if (!innerResult.success) {
        return { success: false, error: 'Failed to parse nested function pointer', nextPos: currentPos };
      }
      
      const inner = innerResult.value;
      // Combine outer stars with inner stars; name comes from inner
      const combinedStars = outerStars.concat(inner.stars || []);
      
      // Parse optional array dimension
      const arrayDimResult = arrayDimParser.parse(tokens, innerResult.nextPos);
      let finalPos = innerResult.nextPos;
      let arrayDim = null;
      if (arrayDimResult.success) {
        arrayDim = arrayDimResult.value;
        finalPos = arrayDimResult.nextPos;
      }
      
      // Parse closing ')'
      const rparenResult = lit(')').parse(tokens, finalPos);
      if (!rparenResult.success) {
        return { success: false, error: 'Expected ")" in function pointer declarator', nextPos: finalPos };
      }
      finalPos = rparenResult.nextPos;
      
      // Parse parameter list
      const paramsResult = lazy(() => this.ctx.ruleRefs.paramList).parse(tokens, finalPos);
      if (!paramsResult.success) {
        return { success: false, error: 'Failed to parse function pointer parameters', nextPos: finalPos };
      }
      
      return {
        success: true,
        value: { kind: 'funcPointer', stars: combinedStars, name: inner.name, arrayDim: arrayDim, params: paramsResult.value },
        nextPos: paramsResult.nextPos
      };
    } else {
      // SIMPLE function pointer: match identifier
      const nameResult = pred(t => t.type === 'IDENTIFIER').parse(tokens, currentPos);
      if (!nameResult.success) {
        return { success: false, error: 'Expected identifier in function pointer declarator', nextPos: currentPos };
      }
      
      // Parse optional array dimension
      const arrayDimResult = arrayDimParser.parse(tokens, nameResult.nextPos);
      let finalPos = nameResult.nextPos;
      let arrayDim = null;
      if (arrayDimResult.success) {
        arrayDim = arrayDimResult.value;
        finalPos = arrayDimResult.nextPos;
      }
      
      // Parse closing ')'
      const rparenResult = lit(')').parse(tokens, finalPos);
      if (!rparenResult.success) {
        return { success: false, error: 'Expected ")" in function pointer declarator', nextPos: finalPos };
      }
      finalPos = rparenResult.nextPos;
      
      // Parse parameter list
      const paramsResult = lazy(() => this.ctx.ruleRefs.paramList).parse(tokens, finalPos);
      if (!paramsResult.success) {
        return { success: false, error: 'Failed to parse function pointer parameters', nextPos: finalPos };
      }
      
      return {
        success: true,
        value: { kind: 'funcPointer', stars: outerStars, name: nameResult.value.value, arrayDim: arrayDim, params: paramsResult.value },
        nextPos: paramsResult.nextPos
      };
    }
  }
}

/**
 * Build function pointer declarator parser rule
 * Recognizes: (*name)(params) or (*)(params) for function pointers
 * Also handles nested function pointers: (*(*innerName)(innerParams))(outerParams)
 * @param {CPegParser} ctx 
 */
function buildFunctionPointerDeclarator(ctx) {
  // Set up paramList first (stores in ctx.ruleRefs.paramList)
  buildParamList(ctx);
  
  const funcPointerDeclarator = new FunctionPointerDeclaratorParser(ctx);
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

/**
 * Helper to build recursive function pointer parameter for nested cases
 * This handles cases where a function parameter is itself a function pointer returning another function pointer
 * @param {CPegParser} ctx 
 */
function buildRecursiveFuncPointerParam(ctx) {
  const paramList = buildParamList(ctx);
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

export { buildFunctionPointerDeclarator, buildExtendedTypeSpecifier, buildRecursiveFuncPointerParam };
