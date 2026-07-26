import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - Macro expansion', () => {
  it('should expand object-like macros in source', () => {
    const source = `#define BUFFER_SIZE 1024
int x = BUFFER_SIZE;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1024'), 'Macro should be expanded to 1024');
    assert.ok(!values.includes('BUFFER_SIZE'), 'Macro name should not appear in output');
  });

  it('should expand macros in expressions', () => {
    const source = `#define A 10
#define B 20
int x = A + B;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('10'), 'A should expand to 10');
    assert.ok(values.includes('20'), 'B should expand to 20');
  });

  it('should expand macros recursively', () => {
    const source = `#define A B
#define B 42
int x = A;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('42'), 'A should expand to B then to 42');
    assert.ok(!values.includes('A'), 'A should not appear in output');
    assert.ok(!values.includes('B'), 'B should not appear in output');
  });

  it('should guard against infinite recursion', () => {
    const source = `#define A A
int x = A;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // Should not hang or throw - the macro should just not expand
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'A'), 'Self-referencing macro should not expand');
  });

  it('should expand multi-token macros', () => {
    const source = `#define INIT int x = 0
INIT`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should not expand macro when not followed by whitespace', () => {
    const source = `#define MAX 100
int MAXVAL = MAX;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // MAXVAL contains MAX as prefix but should not expand
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'MAXVAL'));
  });

  it('should expand macro after undef', () => {
    const source = `#define X 1
#undef X
#define X 2
int x = X;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('2'), 'X should expand to 2 after redefinition');
    assert.ok(!values.includes('1'), 'Old value should not appear');
  });
});

describe('Preprocessor - Function-like macros', () => {
  it('should define function-like macro', () => {
    const source = `#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x;`;
    const lexer = new Lexer(source);
    lexer.tokenize();

    const macro = lexer.preprocessor.expandMacro('MAX');
    assert.ok(macro !== null);
    assert.ok(macro.args !== null);
    assert.deepStrictEqual(macro.args, ['a', 'b']);
  });

  it('should expand function-like macro with arguments', () => {
    const source = `#define ADD(a, b) ((a) + (b))
int x = ADD(1, 2);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'), 'First arg should appear');
    assert.ok(values.includes('2'), 'Second arg should appear');
    assert.ok(values.includes('+'), 'Operator should appear');
    assert.ok(!values.includes('ADD'), 'Macro name should not appear');
  });

  it('should expand function-like macro with single argument', () => {
    const source = `#define SQUARE(x) ((x) * (x))
int y = SQUARE(5);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.strictEqual(values.filter(v => v === '5').length, 2, 'Arg should appear twice');
    assert.ok(values.includes('*'), 'Operator should appear');
  });

  it('should expand function-like macro with no arguments', () => {
    const source = `#define NOW() 12345
int t = NOW();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('12345'), 'Replacement should appear');
    assert.ok(!values.includes('NOW'), 'Macro name should not appear');
  });

  it('should expand function-like macro with complex arguments', () => {
    const source = `#define ADD(a, b) ((a) + (b))
int x = ADD(1+2, 3*4);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'), 'Arg tokens should appear');
    assert.ok(values.includes('+'), 'Operators should appear');
    assert.ok(values.includes('3'), 'All arg tokens should appear');
  });

  it('should expand function-like macro with nested calls', () => {
    const source = `#define ADD(a, b) ((a) + (b))
int x = ADD(1, ADD(2, 3));`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.filter(v => v === '+').length >= 2, 'Both ADD calls should expand');
  });

  it('should NOT expand function-like macro when not called', () => {
    const source = `#define FOO(x) 42
int FOO = 1;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'FOO'), 'FOO without parens should remain as identifier');
  });

  it('should handle function-like macro with parentheses in replacement', () => {
    const source = `#define CALL(f, x) f(x)
int y = CALL(foo, 1);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'foo'), 'Arg should be substituted');
  });

  it('should handle function-like macro with no whitespace after name', () => {
    const source = `#define MUL(a,b)(a)*(b)
int x = MUL(3,4);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('3'));
    assert.ok(values.includes('4'));
    assert.ok(values.includes('*'));
  });

  it('should handle function-like macro with whitespace in param list', () => {
    const source = `#define F(  a  ,  b  ) a+b
int x = F(1, 2);`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const values = tokens.map(t => t.value);
    assert.ok(values.includes('1'));
    assert.ok(values.includes('2'));
  });

  it('should expand function-like macro with zero arguments as literal', () => {
    const source = `#define EMPTY()
EMPTY();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // EMPTY() should expand to nothing, but the trailing ; should remain
    const semicolons = tokens.filter(t => t.type === ';');
    assert.strictEqual(semicolons.length, 1, 'Semicolon should remain');
  });

  it('should handle function-like macro with nested parentheses in args', () => {
    const source = `#define F(x) (x)
int y = F(g(1, 2));`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.ok(identifiers.some(t => t.value === 'g'), 'Nested call arg should be preserved');
  });
});
