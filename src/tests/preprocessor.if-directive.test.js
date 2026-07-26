import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #if directive', () => {
  it('should include code when expression is true (non-zero)', () => {
    const source = `#if 1
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should exclude code when expression is false (zero)', () => {
    const source = `#if 0
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should evaluate arithmetic expressions', () => {
    const source = `#if 2 + 3 * 4
int result;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'result');
  });

  it('should evaluate comparison expressions', () => {
    const source = `#if 10 > 5
int gt;
#endif
#if 3 < 2
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'gt');
    assert.strictEqual(identifiers[1].value, 'other');
  });

  it('should evaluate logical operators', () => {
    const source = `#if 1 && 1
int and_true;
#endif
#if 1 && 0
int and_false;
#endif
#if 0 || 1
int or_true;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'and_true');
    assert.strictEqual(identifiers[1].value, 'or_true');
  });

  it('should handle parenthesized expressions', () => {
    const source = `#if (2 + 3) * (4 - 1)
int result;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'result');
  });

  it('should handle hexadecimal literals', () => {
    const source = `#if 0x10
int hex;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'hex');
  });

  it('should handle octal literals', () => {
    const source = `#if 077
int octal;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'octal');
  });

  it('should substitute macro values in expressions', () => {
    const source = `#define VERSION 42
#if VERSION > 10
int v;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
  });

  it('should treat undefined macros as 0 in expressions', () => {
    const source = `#if UNDEFINED_MACRO
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

  it('should handle bitwise operators', () => {
    const source = `#if 0xFF & 0xF0
int bitwise_and;
#endif
#if 0x0F | 0xF0
int bitwise_or;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'bitwise_and');
    assert.strictEqual(identifiers[1].value, 'bitwise_or');
  });

  it('should handle unary operators', () => {
    const source = `#if !0
int not_zero;
#endif
#if -5 + 10
int negation;
#endif
#if ~0
int bitwise_not;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 3);
  });

  it('should handle equality operators', () => {
    const source = `#if 5 == 5
int eq;
#endif
#if 5 != 3
int ne;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'eq');
    assert.strictEqual(identifiers[1].value, 'ne');
  });

  it('should handle relational operators <= and >=', () => {
    const source = `#if 5 <= 5
int le;
#endif
#if 10 >= 3
int ge;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
  });

  it('should handle shift operators', () => {
    const source = `#if 1 << 3
int shl;
#endif
#if 16 >> 2
int shr;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
  });

  it('should handle empty expression as false', () => {
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

  it('should handle division and modulo', () => {
    const source = `#if 10 / 3
int div;
#endif
#if 10 % 3
int mod;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
  });
});

describe('Preprocessor - defined operator', () => {
  it('should evaluate defined(MACRO) with parentheses form', () => {
    const source = `#define MYMACRO 1
#if defined(MYMACRO)
int defined;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'defined');
  });

  it('should evaluate defined MACRO with space form', () => {
    const source = `#define MYMACRO 1
#if defined MYMACRO
int defined;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'defined');
  });

  it('should return 0 for undefined macro with defined()', () => {
    const source = `#if defined(NONEXISTENT)
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

  it('should work with negation: !defined(MACRO)', () => {
    const source = `#if !defined(NONEXISTENT)
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should combine defined() with logical operators', () => {
    const source = `#define A 1
#if defined(A) && defined(B)
int both;
#else
int not_both;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'not_both');
  });

  it('should handle multiple defined() in one expression', () => {
    const source = `#define A 1
#define B 2
#if defined(A) || defined(B)
int either;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'either');
  });
});
