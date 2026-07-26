import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - Stringification (# operator)', () => {
  it('should stringify macro argument', () => {
    const source = `#define STR(x) #x
const char *s = STR(hello world);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings.length, 1);
    assert.strictEqual(strings[0].value, 'hello world');
  });

  it('should stringify numeric argument', () => {
    const source = `#define STR(x) #x
const char *s = STR(42);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings[0].value, '42');
  });

  it('should stringify expression argument', () => {
    const source = `#define STR(x) #x
const char *s = STR(a + b);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings[0].value, 'a + b');
  });

  it('should handle multiple stringified args', () => {
    const source = `#define PAIR(x, y) #x " " #y
const char *s = PAIR(foo, bar);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strings = tokens.filter(t => t.type === TokenType.STRING);
    assert.strictEqual(strings.length, 3); // "foo", " ", "bar"
  });
});

describe('Preprocessor - Token pasting (## operator)', () => {
  it('should paste macro argument with literal', () => {
    const source = `#define VAR(n) x##n
int VAR(1) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'x1'), 'Should paste x and 1 into x1');
  });

  it('should paste two macro arguments', () => {
    const source = `#define JOIN(a, b) a##b
int JOIN(foo, bar) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'foobar'), 'Should paste two args');
  });

  it('should paste literal with macro argument', () => {
    const source = `#define PREFIX(n) prefix_##n
int PREFIX(val) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'prefix_val'), 'Should paste prefix_ and val');
  });

  it('should handle multiple pasting in one macro', () => {
    const source = `#define TAG(a, b) a##_##b
int TAG(foo, bar) = 0;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'foo_bar'), 'Should paste foo, _, bar');
  });
});
