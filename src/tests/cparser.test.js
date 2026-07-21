import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import * as AST from '../../src/ast/nodes.js';

describe('C PEG Parser', () => {
  it('should parse empty input', () => {
    const parser = new CPegParser();
    const lexer = new Lexer('');
    const tokens = lexer.tokenize();
    
    const ast = parser.parse(tokens);
    assert.ok(ast !== null);
  });

  it('should parse a simple function definition', () => {
    const source = `int main() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse a function with return statement', () => {
    const source = `int main() { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse integer literal', () => {
    const source = `int x;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse variable declaration with assignment', () => {
    const source = `int x = 42;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse arithmetic expressions', () => {
    const source = `int x = a + b * c;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse if statement', () => {
    const source = `int main() { if (x) {} }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should throw error on invalid syntax', () => {
    // This should fail to parse - incomplete statement
    const source = `int main() {`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    
    let threw = false;
    try {
      parser.parse(tokens);
    } catch (error) {
      threw = true;
      assert.strictEqual(error.name, 'ParserError');
    }
    
    assert.strictEqual(threw, true);
  });

  it('should track source locations', () => {
    const source = `int main() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast.location, 'AST should have location');
  });

  it('should produce AST nodes with correct types', () => {
    const source = `int main() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast instanceof AST.CompoundNode || 
              ast.type === 'Compound' ||
              Array.isArray(ast));
  });
});
