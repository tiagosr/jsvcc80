import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - Nested conditionals', () => {
  it('should handle nested #ifdef blocks', () => {
    const source = `#define OUTER
#define INNER
#ifdef OUTER
#ifdef INNER
int nested;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'nested');
  });

  it('should exclude nested block when outer is false', () => {
    const source = `#define INNER
#ifdef OUTER
#ifdef INNER
int excluded;
#endif
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should exclude nested block when inner is false', () => {
    const source = `#define OUTER
#ifdef OUTER
#ifdef NOT_DEFINED
int excluded;
#endif
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should handle nested conditionals with #else', () => {
    const source = `#define A
#ifdef A
#ifndef B
int included;
#else
int excluded1;
#endif
#else
int excluded2;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle deeply nested conditionals', () => {
    const source = `#define L1
#define L2
#define L3
#ifdef L1
#ifdef L2
#ifdef L3
int deep;
#endif
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'deep');
  });

  it('should handle mixed ifdef/ifndef nesting', () => {
    const source = `#define A
#ifndef B
#ifdef A
int result;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'result');
  });
});
