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

  // While loop tests
  it('should parse while loop', () => {
    const source = `int main() { while (x) { x = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
  });

  it('should parse nested while loop', () => {
    const source = `int main() { while (x) { while (y) { y = 0; } } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  // Do-while loop tests
  it('should parse do-while loop', () => {
    const source = `int main() { do { x = 0; } while (x); }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
  });

  // For loop tests
  it('should parse for loop with init expression', () => {
    const source = `int main() { for (x = 0; x < 10; x = x + 1) { x = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse for loop with variable declaration', () => {
    const source = `int main() { for (int i = 0; i < 10; i = i + 1) { i = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse for loop with empty fields', () => {
    const source = `int main() { for (;;) { x = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  // Switch/case tests
  it('should parse switch statement with cases', () => {
    const source = `int main() { switch (x) { case 1: x = 1; case 2: x = 2; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse switch statement with default', () => {
    const source = `int main() { switch (x) { case 1: x = 1; default: x = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  // Break/continue tests
  it('should parse break statement', () => {
    const source = `int main() { while (1) { break; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse continue statement', () => {
    const source = `int main() { while (1) { continue; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  // Goto/label tests
  it('should parse goto statement', () => {
    const source = `int main() { goto end; end: x = 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse labeled statement', () => {
    const source = `int main() { mylabel: x = 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  // Struct tests
  it('should parse struct definition', () => {
    const source = `struct Point { int x; int y; };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  it('should parse struct with name', () => {
    const source = `struct Point { int x; int y; };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
  });

  it('should parse union definition', () => {
    const source = `union Data { int x; };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  // Enum tests
  it('should parse enum definition', () => {
    const source = `enum Color { RED, GREEN, BLUE };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  it('should parse enum with assigned values', () => {
    const source = `enum Color { RED = 1, GREEN = 2, BLUE = 3 };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  it('should parse enum with name', () => {
    const source = `enum Color { RED, GREEN };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  // Typedef tests
  it('should parse typedef', () => {
    const source = `typedef int myint;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  // Complex combined tests
  it('should parse function with while loop and break', () => {
    const source = `int main() { int x; while (x) { if (x) { break; } x = x + 1; } return x; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  it('should parse multiple global declarations including struct and enum', () => {
    const source = `struct Point { int x; int y; }; enum Color { RED, GREEN }; int main() { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
  });

  it('should parse for loop with break inside', () => {
    const source = `int main() { for (int i = 0; i; i = i + 1) { if (i) { break; } } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
  });

  it('should parse do-while with continue', () => {
    const source = `int main() { do { if (x) { continue; } x = 0; } while (x); }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });

  it('should parse switch with multiple statements per case', () => {
    const source = `int main() { switch (x) { case 1: x = 1; y = 2; default: x = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
  });
});
