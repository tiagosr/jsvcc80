import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #elif directive', () => {
  it('should evaluate first matching elif branch', () => {
    const source = `#if 0
int excluded1;
#elif 1
int included;
#elif 1
int excluded2;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should skip all elif branches when if is true', () => {
    const source = `#if 1
int included;
#elif 1
int excluded;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should combine #elif with #else', () => {
    const source = `#if 0
int excluded1;
#elif 0
int excluded2;
#else
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should skip #else when elif branch matches', () => {
    const source = `#if 0
int excluded1;
#elif 1
int included;
#else
int excluded2;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should handle #elif with defined() operator', () => {
    const source = `#define B 2
#if defined(A)
int a_def;
#elif defined(B)
int b_def;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'b_def');
  });

  it('should throw error for #elif without matching #if', () => {
    const source = `#elif 1
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#elif without matching/);
  });

  it('should handle multiple elif branches', () => {
    const source = `#define MODE 2
#if MODE == 1
int mode1;
#elif MODE == 2
int mode2;
#elif MODE == 3
int mode3;
#else
int default_mode;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'mode2');
  });

  it('should handle elif with complex expressions', () => {
    const source = `#define X 5
#if X < 3
int small;
#elif X >= 3 && X < 10
int medium;
#elif X >= 10
int large;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'medium');
  });
});
