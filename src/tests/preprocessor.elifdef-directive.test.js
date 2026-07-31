import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #elifdef directive', () => {
  it('should include code when macro is defined in elifdef branch', () => {
    const source = `#define FOO 1
#ifdef FOO
int excluded;
#elifdef BAR
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'excluded');
  });

  it('should include code when macro is not defined in elifdef branch', () => {
    const source = `#define BAR 2
#ifdef FOO
int excluded;
#elifdef BAR
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should throw error for #elifdef without matching #if', () => {
    const source = `#elifdef BAR
int x;`;
    const lexer = new Lexer(source);

    assert.throws(() => lexer.tokenize(), /#elifdef without matching/);
  });

  it('should skip elifdef when previous branch already taken', () => {
    const source = `#define FOO 1
#define BAR 2
#ifdef FOO
int first;
#elifdef BAR
int second;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'first');
  });

  it('should work with nested conditionals', () => {
    const source = `#define BAR 2
#ifdef FOO
int excluded1;
#elifdef BAR
int included;
#ifdef EXTRA
int excluded2;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });
});

describe('Preprocessor - #elifndef directive', () => {
  it('should include code when macro is NOT defined in elifndef branch', () => {
    const source = `#define FOO 1
#ifdef FOO
int excluded;
#elifndef BAR
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'excluded');
  });

  it('should include code when macro is not defined in elifndef branch', () => {
    const source = `#define FOO 1
#undef FOO
#ifdef FOO
int excluded;
#elifndef BAR
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'excluded1');
  });

  it('should exclude code when macro is defined in elifndef branch', () => {
    const source = `#define FOO 1
#define BAR 2
#ifdef FOO
int excluded1;
#elifndef BAR
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

  it('should throw error for #elifndef without matching #if', () => {
    const source = `#elifndef BAR
int x;`;
    const lexer = new Lexer(source);

    assert.throws(() => lexer.tokenize(), /#elifndef without matching/);
  });

  it('should skip elifndef when previous branch already taken', () => {
    const source = `#define FOO 1
#define BAR 2
#ifdef FOO
int first;
#elifndef BAR
int second;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'first');
  });

  it('should work with nested conditionals', () => {
    const source = `#define FOO 1
#undef FOO
#ifdef FOO
int excluded1;
#elifndef BAR
int included;
#ifdef EXTRA
int excluded2;
#endif
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });
});
