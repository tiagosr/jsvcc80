import * as AST from '../ast/nodes.js';
import { Parser, seq, map, opt, many, lazy, lit, alt, pred } from './combinators.js';
import { mergeDeclaratorType } from './type-system.js';

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
 * Build struct/union declaration
 * @param {CPegParser} ctx 
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
 * @param {CPegParser} ctx 
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
 * @param {CPegParser} ctx 
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

export { buildStructDecl, buildEnumDecl, buildTypedefDecl };
