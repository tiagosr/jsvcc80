import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #if nested conditionals', () => {
  it('should handle nested #if blocks', () => {
    const source = `#if 1
#if 1
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
    const source = `#if 0
#if 1
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

  it('should mix #if, #ifdef, #elif in nested blocks', () => {
    const source = `#define OUTER 1
#if OUTER
#ifdef INNER
int inner;
#else
int no_inner;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'no_inner');
  });

  it('should handle deeply nested conditionals with elif', () => {
    const source = `#if 1
#if 0
int excluded1;
#elif 0
int excluded2;
#elif 1
int deep_included;
#else
int excluded3;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'deep_included');
  });

  it('should handle #if inside #ifdef', () => {
    const source = `#define X
#ifdef X
#if 1
int included;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });
});

describe('Preprocessor - #if edge cases', () => {
  it('should handle expression with only whitespace', () => {
    const source = `#if   
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle large numbers in expressions', () => {
    const source = `#if 2147483647 > 0
int large;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'large');
  });

  it('should handle operator precedence correctly', () => {
    const source = `#if 1 + 2 * 3 == 7
int precedence;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'precedence');
  });

  it('should skip #define inside inactive #if block', () => {
    const source = `#if 0
#define SHOULD_NOT_EXIST
#endif
#if defined(SHOULD_NOT_EXIST)
int excluded;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle #if with only defined() operator', () => {
    const source = `#define FEATURE
#if defined(FEATURE)
int has_feature;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'has_feature');
  });

  it('should handle #elif after #ifdef', () => {
    const source = `#define A 1
#ifdef NONEXISTENT
int excluded;
#elif defined(A)
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle #elif after #ifndef', () => {
    const source = `#define B 2
#ifndef NONEXISTENT
int first;
#elif defined(B)
int excluded;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'first');
  });
});
