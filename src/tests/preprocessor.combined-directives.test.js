import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer, PreprocessedSource } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - Combined directives', () => {
  it('should combine #define and #ifdef', () => {
    const source = `#define FEATURE
#ifdef FEATURE
int enabled;
#endif
int main;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'enabled');
    assert.strictEqual(identifiers[1].value, 'main');
  });

  it('should combine #define, #ifdef, #else, #endif', () => {
    const source = `#define MODE1
#ifdef MODE1
int mode1;
#else
int mode2;
#endif
#ifdef MODE2
int mode2b;
#else
int fallback;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 2);
    assert.strictEqual(identifiers[0].value, 'mode1');
    assert.strictEqual(identifiers[1].value, 'fallback');
  });

  it('should handle #define inside conditional block', () => {
    const source = `#ifdef OUTER
int a;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    assert.strictEqual(tokens.length, 0);
  });

  it('should preserve #pragma functionality alongside new directives', () => {
    const source = `#pragma once
#define MY_MACRO
#ifdef MY_MACRO
int x;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should skip #define inside inactive conditional block', () => {
    const source = `#ifdef NOT_DEFINED
#define SHOULD_NOT_EXIST
int excluded;
#endif
#ifdef SHOULD_NOT_EXIST
int alsoExcluded;
#endif
int included;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'included');
    assert.strictEqual(lexer.preprocessor.isMacroDefined('SHOULD_NOT_EXIST'), false);
  });

  it('should handle header guard pattern', () => {
    const source = `#ifndef HEADER_H
#define HEADER_H
int guard_var;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'guard_var');
    assert.strictEqual(lexer.preprocessor.isMacroDefined('HEADER_H'), true);
  });
});

describe('Preprocessor - Edge cases', () => {
  it('should handle empty source', () => {
    const lexer = new Lexer('');
    const tokens = lexer.tokenize();
    assert.strictEqual(tokens.length, 0);
  });

  it('should handle directives with extra whitespace', () => {
    const source = `#define   SPACED_OUT   value
#ifdef   SPACED_OUT
int x;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'x');
  });

  it('should handle code after conditional block on same line structure', () => {
    const source = `#define X
#ifdef X
int a;
#endif
int b;
#ifdef Y
int c;
#endif
int d;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 3);
    assert.strictEqual(identifiers[0].value, 'a');
    assert.strictEqual(identifiers[1].value, 'b');
    assert.strictEqual(identifiers[2].value, 'd');
  });

  it('should handle comments inside conditional blocks', () => {
    const source = `#define X
#ifdef X
// this is a comment
int a;
#endif`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].value, 'a');
  });
});
