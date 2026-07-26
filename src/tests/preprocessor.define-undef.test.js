import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #define directive', () => {
  it('should define a macro via #define', () => {
    const source = `#define MAX_SIZE
int x;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('MAX_SIZE'), true);
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should define a macro with replacement value', () => {
    const source = `#define BUFFER_SIZE 1024
int y;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('BUFFER_SIZE'), true);
    const macro = lexer.preprocessor.expandMacro('BUFFER_SIZE');
    assert.strictEqual(macro.replacement, '1024');
  });

  it('should handle multiple #define directives', () => {
    const source = `#define A 1
#define B 2
#define C 3
int z;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('A'), true);
    assert.strictEqual(lexer.preprocessor.isMacroDefined('B'), true);
    assert.strictEqual(lexer.preprocessor.isMacroDefined('C'), true);
  });

  it('should redefine an existing macro', () => {
    const source = `#define VALUE 10
#define VALUE 20
int a;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    const macro = lexer.preprocessor.expandMacro('VALUE');
    assert.strictEqual(macro.replacement, '20');
  });

  it('should define macro with multi-word replacement', () => {
    const source = `#define MY_MACRO some_value here
int b;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    const macro = lexer.preprocessor.expandMacro('MY_MACRO');
    assert.strictEqual(macro.replacement, 'some_value here');
  });

  it('should throw error for #define without name', () => {
    const source = `#define
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#define requires a macro name/);
  });
});

describe('Preprocessor - #undef directive', () => {
  it('should undefine a macro via #undef', () => {
    const source = `#define REMOVE_ME
#undef REMOVE_ME
int x;`;
    const lexer = new Lexer(source);
    lexer.tokenize();
    
    assert.strictEqual(lexer.preprocessor.isMacroDefined('REMOVE_ME'), false);
  });

  it('should handle #undef on non-existent macro', () => {
    const source = `#undef NONEXISTENT
int y;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'y');
  });

  it('should throw error for #undef without name', () => {
    const source = `#undef
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#undef requires a macro name/);
  });
});
