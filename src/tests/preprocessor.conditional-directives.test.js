import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #ifdef directive', () => {
  it('should include code when macro is defined', () => {
    const source = `#define ENABLED
#ifdef ENABLED
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should exclude code when macro is not defined', () => {
    const source = `#ifdef NOT_DEFINED
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should handle multiple #ifdef blocks', () => {
    const source = `#define FIRST
#ifdef FIRST
int a;
#endif
#ifdef SECOND
int b;
#endif
int c;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'a');
    assert.strictEqual(identifiers[1].value, 'c');
  });

  it('should throw error for #ifdef without macro name', () => {
    const source = `#ifdef
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#ifdef requires a macro name/);
  });
});

describe('Preprocessor - #ifndef directive', () => {
  it('should include code when macro is NOT defined', () => {
    const source = `#ifndef UNDEFINED_VAR
int included;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should exclude code when macro IS defined', () => {
    const source = `#define DEFINED_VAR
#ifndef DEFINED_VAR
int excluded;
#endif
int other;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'other');
  });

  it('should throw error for #ifndef without macro name', () => {
    const source = `#ifndef
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#ifndef requires a macro name/);
  });
});

describe('Preprocessor - #else directive', () => {
  it('should include else branch when ifdef is false', () => {
    const source = `#ifdef NOT_DEFINED
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

  it('should include if branch when ifdef is true', () => {
    const source = `#define DEFINED
#ifdef DEFINED
int included;
#else
int excluded;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
  });

  it('should work with #ifndef and #else', () => {
    const source = `#define DEFINED
#ifndef DEFINED
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

  it('should throw error for #else without matching ifdef', () => {
    const source = `#else
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#else without matching/);
  });
});

describe('Preprocessor - #endif directive', () => {
  it('should properly close conditional blocks', () => {
    const source = `#define X
#ifdef X
int a;
#endif
int b;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'a');
    assert.strictEqual(identifiers[1].value, 'b');
  });

  it('should throw error for #endif without matching ifdef', () => {
    const source = `#endif
int x;`;
    const lexer = new Lexer(source);
    
    assert.throws(() => lexer.tokenize(), /#endif without matching/);
  });
});
