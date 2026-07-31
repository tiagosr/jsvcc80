import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #warning directive', () => {
  it('should emit warning text to stderr', () => {
    const source = `#warning this is a test warning
int x;`;
    const lexer = new Lexer(source);

    const originalWarn = console.warn;
    let captured = '';
    console.warn = (...args) => {
      captured = args.join(' ');
    };

    const tokens = lexer.tokenize();

    console.warn = originalWarn;

    assert.ok(captured.includes('this is a test warning'));
  });

  it('should continue compilation after warning', () => {
    const source = `#warning deprecated feature
int x;
int y;`;
    const lexer = new Lexer(source);

    const originalWarn = console.warn;
    console.warn = () => {};

    const tokens = lexer.tokenize();

    console.warn = originalWarn;

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'x');
    assert.strictEqual(identifiers[1].value, 'y');
  });

  it('should emit warning inside inactive conditional', () => {
    const source = `#ifdef NONEXISTENT_MACRO
#warning should still emit
int x;
#endif`;
    const lexer = new Lexer(source);

    const originalWarn = console.warn;
    let captured = '';
    console.warn = (...args) => {
      captured = args.join(' ');
    };

    const tokens = lexer.tokenize();

    console.warn = originalWarn;

    assert.ok(captured.includes('should still emit'));
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 0);
  });

  it('should handle multiple warnings', () => {
    const source = `#warning first warning
#warning second warning
int x;`;
    const lexer = new Lexer(source);

    const originalWarn = console.warn;
    let captured = [];
    console.warn = (...args) => {
      captured.push(args.join(' '));
    };

    const tokens = lexer.tokenize();

    console.warn = originalWarn;

    assert.strictEqual(captured.length, 2);
    assert.ok(captured[0].includes('first warning'));
    assert.ok(captured[1].includes('second warning'));
  });

  it('should handle warning with special characters in message', () => {
    const source = `#warning "special chars: <>&$!"
int x;`;
    const lexer = new Lexer(source);

    const originalWarn = console.warn;
    let captured = '';
    console.warn = (...args) => {
      captured = args.join(' ');
    };

    const tokens = lexer.tokenize();

    console.warn = originalWarn;

    assert.ok(captured.includes('special chars'));
  });
});
