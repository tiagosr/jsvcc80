import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Token line:column location tracking', () => {
  it('should track basic token locations in single-line source', () => {
    const source = 'int x = 42;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const intToken = tokens[0];
    assert.strictEqual(intToken.location.start.line, 1);
    assert.strictEqual(intToken.location.start.column, 0);
    assert.strictEqual(intToken.location.end.line, 1);
    assert.strictEqual(intToken.location.end.column, 3);

    const xToken = tokens[1];
    assert.strictEqual(xToken.location.start.line, 1);
    assert.strictEqual(xToken.location.start.column, 3);
    assert.strictEqual(xToken.location.end.line, 1);
    assert.strictEqual(xToken.location.end.column, 5);

    const eqToken = tokens[2];
    assert.strictEqual(eqToken.location.start.line, 1);
    assert.strictEqual(eqToken.location.start.column, 5);
    assert.strictEqual(eqToken.location.end.line, 1);
    assert.strictEqual(eqToken.location.end.column, 7);

    const numToken = tokens[3];
    assert.strictEqual(numToken.location.start.line, 1);
    assert.strictEqual(numToken.location.start.column, 7);
    assert.strictEqual(numToken.location.end.line, 1);
    assert.strictEqual(numToken.location.end.column, 10);

    const semicolonToken = tokens[4];
    assert.strictEqual(semicolonToken.location.start.line, 1);
    assert.strictEqual(semicolonToken.location.start.column, 10);
    assert.strictEqual(semicolonToken.location.end.line, 1);
    assert.strictEqual(semicolonToken.location.end.column, 11);
  });

  it('should track multi-line token locations', () => {
    const source = 'int x;\nchar y;\n';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const intToken = tokens[0];
    assert.strictEqual(intToken.location.start.line, 1);
    assert.strictEqual(intToken.location.start.column, 0);
    assert.strictEqual(intToken.location.end.line, 1);
    assert.strictEqual(intToken.location.end.column, 3);

    const xToken = tokens[1];
    assert.strictEqual(xToken.location.start.line, 1);
    assert.strictEqual(xToken.location.start.column, 3);
    assert.strictEqual(xToken.location.end.line, 1);
    assert.strictEqual(xToken.location.end.column, 5);

    const semicolonToken = tokens[2];
    assert.strictEqual(semicolonToken.location.start.line, 1);
    assert.strictEqual(semicolonToken.location.start.column, 5);
    assert.strictEqual(semicolonToken.location.end.line, 1);
    assert.strictEqual(semicolonToken.location.end.column, 6);

    const charToken = tokens[3];
    assert.strictEqual(charToken.location.start.line, 1);
    assert.strictEqual(charToken.location.start.column, 6);
    assert.strictEqual(charToken.location.end.line, 2);
    assert.strictEqual(charToken.location.end.column, 4);

    const yToken = tokens[4];
    assert.strictEqual(yToken.location.start.line, 2);
    assert.strictEqual(yToken.location.start.column, 4);
    assert.strictEqual(yToken.location.end.line, 2);
    assert.strictEqual(yToken.location.end.column, 6);
  });

  it('should track string literal location', () => {
    const source = '"hello";';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strToken = tokens[0];
    assert.strictEqual(strToken.location.start.line, 1);
    assert.strictEqual(strToken.location.start.column, 0);
    assert.strictEqual(strToken.location.end.line, 1);
    assert.strictEqual(strToken.location.end.column, 7);
    assert.strictEqual(strToken.type, TokenType.STRING);
    assert.strictEqual(strToken.value, 'hello');
  });

  it('should track integer literal location', () => {
    const source = '0xFF;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const numToken = tokens[0];
    assert.strictEqual(numToken.location.start.line, 1);
    assert.strictEqual(numToken.location.start.column, 0);
    assert.strictEqual(numToken.location.end.line, 1);
    assert.strictEqual(numToken.location.end.column, 4);
    assert.strictEqual(numToken.type, TokenType.INTEGER);
    assert.strictEqual(numToken.value, '0xFF');
  });

  it('should track identifier location', () => {
    const source = 'myVariable;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identToken = tokens[0];
    assert.strictEqual(identToken.location.start.line, 1);
    assert.strictEqual(identToken.location.start.column, 0);
    assert.strictEqual(identToken.location.end.line, 1);
    assert.strictEqual(identToken.location.end.column, 10);
    assert.strictEqual(identToken.type, TokenType.IDENTIFIER);
    assert.strictEqual(identToken.value, 'myVariable');
  });

  it('should track multi-character operator location', () => {
    const source = 'a == b;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const eqToken = tokens[1];
    assert.strictEqual(eqToken.location.start.line, 1);
    assert.strictEqual(eqToken.location.start.column, 1);
    assert.strictEqual(eqToken.location.end.line, 1);
    assert.strictEqual(eqToken.location.end.column, 4);
    assert.strictEqual(eqToken.type, '==');
    assert.strictEqual(eqToken.value, '==');
  });

  it('should track += operator location', () => {
    const source = 'x += 5;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const addEqToken = tokens[1];
    assert.strictEqual(addEqToken.location.start.line, 1);
    assert.strictEqual(addEqToken.location.start.column, 1);
    assert.strictEqual(addEqToken.location.end.line, 1);
    assert.strictEqual(addEqToken.location.end.column, 4);
    assert.strictEqual(addEqToken.type, '+=');
    assert.strictEqual(addEqToken.value, '+=');
  });

  it('should track function-like macro expanded tokens with proper location', () => {
    const source = '#define ADD(a,b) (a+b)\nint x = ADD(1,2);';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parenOpenToken = tokens.find(t => t.type === '(' && t.value === '(');
    assert.ok(parenOpenToken, 'Should have opening paren from macro expansion');
    assert.strictEqual(parenOpenToken.location.start.line, 1);
    assert.strictEqual(parenOpenToken.location.start.column, 0);
    assert.strictEqual(parenOpenToken.location.end.line, 1);
    assert.strictEqual(parenOpenToken.location.end.column, 1);

    const num1Token = tokens.find(t => t.type === TokenType.INTEGER && t.value === '1');
    assert.ok(num1Token, 'Should have integer token for 1');
    assert.strictEqual(num1Token.location.start.line, 2);
    assert.strictEqual(num1Token.location.start.column, 7);
    assert.strictEqual(num1Token.location.end.line, 2);
    assert.strictEqual(num1Token.location.end.column, 13);

    const num2Token = tokens.find(t => t.type === TokenType.INTEGER && t.value === '2');
    assert.ok(num2Token, 'Should have integer token for 2');
    assert.strictEqual(num2Token.location.start.line, 2);
    assert.strictEqual(num2Token.location.start.column, 7);
    assert.strictEqual(num2Token.location.end.line, 2);
    assert.strictEqual(num2Token.location.end.column, 15);
  });

  it('should track ## operator location from macro expansion', () => {
    const source = '#define JOIN(a,b) a##b\nint x = JOIN(foo,bar);';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const identToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'foobar');
    assert.ok(identToken, 'Should have joined identifier foobar');
    assert.strictEqual(identToken.location.start.line, 2);
    assert.strictEqual(identToken.location.start.column, 7);
    assert.strictEqual(identToken.location.end.line, 2);
    assert.strictEqual(identToken.location.end.column, 16);
  });

  it('should track stringification # operator location', () => {
    const source = '#define STR(x) #x\nchar* s = STR(hello);';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const strToken = tokens.find(t => t.type === TokenType.STRING && t.value === 'hello');
    assert.ok(strToken, 'Should have stringified token hello');
    assert.strictEqual(strToken.location.start.line, 1);
    assert.strictEqual(strToken.location.start.column, 1);
    assert.strictEqual(strToken.location.end.line, 1);
    assert.strictEqual(strToken.location.end.column, 2);
  });

  it('should track all tokens in a complex expression', () => {
    const source = 'a + b == c && d != e;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const aToken = tokens[0];
    assert.strictEqual(aToken.location.start.line, 1);
    assert.strictEqual(aToken.location.start.column, 0);
    assert.strictEqual(aToken.location.end.line, 1);
    assert.strictEqual(aToken.location.end.column, 1);

    const plusToken = tokens[1];
    assert.strictEqual(plusToken.location.start.line, 1);
    assert.strictEqual(plusToken.location.start.column, 1);
    assert.strictEqual(plusToken.location.end.line, 1);
    assert.strictEqual(plusToken.location.end.column, 3);

    const eqToken = tokens[2];
    assert.strictEqual(eqToken.location.start.line, 1);
    assert.strictEqual(eqToken.location.start.column, 3);
    assert.strictEqual(eqToken.location.end.line, 1);
    assert.strictEqual(eqToken.location.end.column, 5);

    const andToken = tokens[4];
    assert.strictEqual(andToken.location.start.line, 1);
    assert.strictEqual(andToken.location.start.column, 8);
    assert.strictEqual(andToken.location.end.line, 1);
    assert.strictEqual(andToken.location.end.column, 10);

    const neqToken = tokens[6];
    assert.strictEqual(neqToken.location.start.line, 1);
    assert.strictEqual(neqToken.location.start.column, 13);
    assert.strictEqual(neqToken.location.end.line, 1);
    assert.strictEqual(neqToken.location.end.column, 15);
  });

  it('should preserve location file field for macro-expanded tokens', () => {
    const source = '#define VAL 100\nint x = VAL;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const numToken = tokens.find(t => t.type === TokenType.INTEGER && t.value === '100');
    assert.ok(numToken, 'Should have expanded macro token');
    assert.strictEqual(numToken.location.file, '<input>');
  });
});
