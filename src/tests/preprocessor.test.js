import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Lexer, PreprocessedSource } from '../../src/preprocessor/lexer.js';
import { TokenType } from '../../src/preprocessor/tokenTypes.js';

describe('Lexer - Basic Tests', () => {
  it('should tokenize simple integers', () => {
    const lexer = new Lexer('42');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.INTEGER);
    assert.strictEqual(tokens[0].value, '42');
  });

  it('should tokenize hexadecimal integers', () => {
    const lexer = new Lexer('0xFF');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.INTEGER);
    // Value normalized to lowercase hex without 'x' prefix in token value
    assert.ok(tokens[0].value === '0FF' || tokens[0].value === '0xFF');
  });

  it('should tokenize identifiers and keywords', () => {
    const lexer = new Lexer('int main() { return 0; }');
    const tokens = lexer.tokenize();
    
    const types = tokens.map(t => t.type);
    assert.ok(types.includes(TokenType.KEYWORD)); // int, return
    assert.ok(types.includes(TokenType.IDENTIFIER)); // main
    assert.ok(types.includes(TokenType.LPAREN));
  });

  it('should tokenize string literals', () => {
    const lexer = new Lexer('"hello world"');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.STRING);
    assert.strictEqual(tokens[0].value, 'hello world');
  });

  it('should handle escape sequences in strings', () => {
    const lexer = new Lexer('"line1\\nline2"');
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens[0].type, TokenType.STRING);
    assert.ok(tokens[0].value.includes('\n'));
  });

  it('should tokenize operators', () => {
    const lexer = new Lexer('+ - * / == != < > <= >=');
    const tokens = lexer.tokenize();
    
    const types = tokens.map(t => t.type);
    assert.ok(types.includes(TokenType.PLUS));
    assert.ok(types.includes(TokenType.EQ));
    assert.ok(types.includes(TokenType.NE));
  });

  it('should skip comments', () => {
    const lexer = new Lexer('// comment\nint x; /* block */');
    const tokens = lexer.tokenize();
    
    const hasCommentTokens = tokens.some(t => 
      t.type === TokenType.IDENTIFIER && t.value.includes('comment')
    );
    assert.strictEqual(hasCommentTokens, false);
  });

  it('should track source locations', () => {
    const source = `int x = 42;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    for (const token of tokens) {
      assert.ok(token.location, 'Token should have location');
      assert.ok(token.location.start.line > 0, 'Line number should be valid');
    }
  });
});

describe('PreprocessedSource', () => {
  it('should register and retrieve pragma handlers', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.registerPragma('custom', (token) => ({ type: 'custom_pragma' }));
    
    assert.ok(preprocessor.getPragmaHandler('custom') !== undefined);
  });

  it('should define and lookup macros', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('PI', null, '3.14159');
    
    const macro = preprocessor.expandMacro('pi');
    assert.ok(macro !== null);
    assert.strictEqual(macro.replacement, '3.14159');
  });

  it('should be case-insensitive for macros', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('TEST', null, 'value');
    
    assert.ok(preprocessor.expandMacro('test') !== null);
    assert.ok(preprocessor.expandMacro('TEST') !== null);
  });

  it('should undefine macros', () => {
    const preprocessor = new PreprocessedSource();
    
    preprocessor.defineMacro('X', null, '1');
    preprocessor.undefineMacro('x');
    
    assert.strictEqual(preprocessor.expandMacro('x'), null);
  });
});
