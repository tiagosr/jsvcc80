import * as AST from '../ast/nodes.js';
import { ParserError } from '../core/errors.js';
import { Parser, alt, many, map, opt, pred, seq, lit } from './combinators.js';

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

export {
  TypeInfos,
  createTypeSpec,
  mergeDeclaratorType,
  createFunctionPointerType,
  buildTypeSpecifier,
  buildStructTypeRef,
  locFromToken,
};
