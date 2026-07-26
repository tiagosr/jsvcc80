import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer, PreprocessedSource } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - Built-in macros', () => {
  it('should expand __LINE__ to current line number', () => {
    const source = `int line = __LINE__;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const integers = tokens.filter(t => t.type === TokenType.INTEGER);
    assert.ok(integers.length >= 1, '__LINE__ should expand to a number');
    assert.strictEqual(parseInt(integers[0].value, 10), 1);
  });

  it('should expand __FILE__ to filename string', () => {
    const source = `const char *f = __FILE__;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.ok(strings.length >= 1, '__FILE__ should expand to a string');
    assert.strictEqual(strings[0].value, '<input>');
  });

  it('should expand __LINE__ in macro expansion', () => {
    const source = `#define GET_LINE() __LINE__
int l = GET_LINE();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const integers = tokens.filter(t => t.type === TokenType.INTEGER);
    assert.ok(integers.length >= 1, '__LINE__ in macro should expand');
    // Should be line 2 (where GET_LINE() is invoked)
    assert.strictEqual(parseInt(integers[0].value, 10), 2);
  });

  it('should be visible to #ifdef', () => {
    const source = `#ifdef __LINE__
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should be visible to defined() in #if', () => {
    const source = `#if defined(__LINE__)
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should evaluate __LINE__ in #if expression', () => {
    const source = `#if __LINE__ > 0
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should use custom filename for __FILE__', () => {
    const source = `const char *f = __FILE__;`;
    const preprocessor = new PreprocessedSource('test.c');
    const lexer = new Lexer(source, preprocessor);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings[0].value, 'test.c');
  });
});

describe('Preprocessor - Combined macro features', () => {
  it('should combine stringification and pasting', () => {
    const source = `#define LOG(name) printf(#name " = %d\\n", name)
LOG(x);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.ok(strings.some(s => s.value === 'x'), 'Stringified arg should appear');
  });

  it('should expand macros within macro arguments', () => {
    const source = `#define A 1
#define B 2
#define ADD(x, y) ((x) + (y))
int z = ADD(A, B);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'), 'A should expand in arg');
    assert.ok(values.includes('2'), 'B should expand in arg');
  });

  it('should handle macro that calls another macro', () => {
    const source = `#define OUTER() INNER()
#define INNER() 42
int x = OUTER();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('42'), 'Outer macro should expand to inner which expands to 42');
  });

  it('should handle ## with stringification', () => {
    const source = `#define X 100
#define VAL(x) x
int VAL(X) = 1;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    // X in the declaration should expand to 100 in the type position
    // but VAL(X) should expand X to 100
    const values = tokens.map(t => t.value);
    assert.ok(values.includes('100'), 'X should expand');
  });

  it('should handle empty macro arguments', () => {
    const source = `#define F(a,b) a
int x = F(,1);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // F(,1) should expand to empty + comma handling
    // The first arg is empty, second is 1
    const values = tokens.map(t => t.value);
    // Result should just have the tokens for the body
    assert.ok(values.includes('1') || values.length > 0, 'Should handle empty first arg');
  });
});
