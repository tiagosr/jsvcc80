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

  // Typed function parameter tests
  it('should parse function with single typed parameter', () => {
    const source = `int foo(int a) { return a; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.parameters.length, 1);
    assert.strictEqual(funcNode.parameters[0].name, 'a');
  });

  it('should parse function with multiple typed parameters', () => {
    const source = `int add(int a, int b) { return a + b; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.parameters.length, 2);
    assert.strictEqual(funcNode.parameters[0].name, 'a');
    assert.strictEqual(funcNode.parameters[1].name, 'b');
  });

  it('should parse function with void parameter', () => {
    const source = `int main(void) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.parameters.length, 0);
  });

  it('should parse function with three typed parameters', () => {
    const source = `int sum(int a, int b, int c) { return a + b + c; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.parameters.length, 3);
    assert.strictEqual(funcNode.parameters[0].name, 'a');
    assert.strictEqual(funcNode.parameters[1].name, 'b');
    assert.strictEqual(funcNode.parameters[2].name, 'c');
  });

  it('should parse function with bare identifier parameters (backward compat)', () => {
    const source = `int foo(a, b) { return a + b; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.parameters.length, 2);
    assert.strictEqual(funcNode.parameters[0].name, 'a');
    assert.strictEqual(funcNode.parameters[1].name, 'b');
  });

  it('should parse parameter types as TypeSpec nodes', () => {
    const source = `int foo(int x) { return x; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    const funcNode = ast.statements[0];
    const param = funcNode.parameters[0];
    assert.strictEqual(param.type.type, 'TypeSpec');
    assert.strictEqual(param.type.baseType, 'int');
  });

  // Type specifier tests - basic types
  it('should parse void return type', () => {
    const source = `void foo() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.returnType.baseType, 'void');
  });

  it('should parse char type', () => {
    const source = `char c;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'char');
    assert.strictEqual(decl.name.name, 'c');
  });

  it('should parse _Bool type', () => {
    const source = `_Bool flag;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, '_Bool');
    assert.strictEqual(decl.name.name, 'flag');
  });

  it('should parse short type', () => {
    const source = `short s;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'short');
  });

  it('should parse long type', () => {
    const source = `long l;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'long');
  });

  it('should parse unsigned type', () => {
    const source = `unsigned u;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
  });

  it('should parse signed type', () => {
    const source = `signed s;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'int');
    assert.strictEqual(decl.type.isSigned, true);
  });

  // Signedness modifier tests
  it('should parse unsigned char', () => {
    const source = `unsigned char uc;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'char');
    assert.strictEqual(decl.type.isSigned, false);
  });

  it('should parse signed char', () => {
    const source = `signed char sc;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'char');
    assert.strictEqual(decl.type.isSigned, true);
  });

  it('should parse unsigned short', () => {
    const source = `unsigned short us;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'short');
    assert.strictEqual(decl.type.isSigned, false);
  });

  it('should parse unsigned int', () => {
    const source = `unsigned int ui;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'int');
    assert.strictEqual(decl.type.isSigned, false);
  });

  it('should parse unsigned long', () => {
    const source = `unsigned long ul;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'long');
    assert.strictEqual(decl.type.isSigned, false);
  });

  it('should parse signed long', () => {
    const source = `signed long sl;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'long');
    assert.strictEqual(decl.type.isSigned, true);
  });

  // Typedef tests
  it('should parse typedef for char', () => {
    const source = `typedef char byte;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.kind, 'typedef');
    assert.strictEqual(decl.type.baseType, 'char');
    assert.strictEqual(decl.name.name, 'byte');
  });

  it('should parse typedef for unsigned int', () => {
    const source = `typedef unsigned int uint;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.kind, 'typedef');
    assert.strictEqual(decl.type.baseType, 'int');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.name.name, 'uint');
  });

  it('should parse typedef for long', () => {
    const source = `typedef long int64;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.kind, 'typedef');
    assert.strictEqual(decl.type.baseType, 'long');
    assert.strictEqual(decl.name.name, 'int64');
  });

  it('should use typedef name as type in variable declaration', () => {
    const source = `typedef int myint; myint x = 5;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.strictEqual(ast.statements.length, 2);
    const decl = ast.statements[1];
    assert.strictEqual(decl.kind, 'var');
    assert.strictEqual(decl.name.name, 'x');
  });

  it('should use typedef name as function return type', () => {
    const source = `typedef int result; result compute() { return 42; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const funcNode = ast.statements[1];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'compute');
  });

  it('should use typedef name as parameter type', () => {
    const source = `typedef int num; void foo(num a) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const funcNode = ast.statements[1];
    assert.strictEqual(funcNode.parameters.length, 1);
    assert.strictEqual(funcNode.parameters[0].name, 'a');
  });

  it('should use typedef name in for loop declaration', () => {
    const source = `typedef int idx; int main() { for (idx i = 0; i < 10; i = i + 1) { i = 0; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast !== null);
  });

  it('should use typedef name in local declaration', () => {
    const source = `typedef char byte; int main() { byte b = 10; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.ok(ast !== null);
  });

  it('should handle multiple typedefs', () => {
    const source = `typedef int myint; typedef char mychar; myint x; mychar c;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    assert.strictEqual(ast.statements.length, 4);
  });

  // TypeSpecNode size tests
  it('should report correct size for char type', () => {
    const typeSpec = new AST.TypeSpecNode('char', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 1);
  });

  it('should report correct size for int type', () => {
    const typeSpec = new AST.TypeSpecNode('int', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 2);
  });

  it('should report correct size for short type', () => {
    const typeSpec = new AST.TypeSpecNode('short', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 2);
  });

  it('should report correct size for long type', () => {
    const typeSpec = new AST.TypeSpecNode('long', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 4);
  });

  it('should report correct size for void type', () => {
    const typeSpec = new AST.TypeSpecNode('void', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 0);
  });

  it('should report correct size for _Bool type', () => {
    const typeSpec = new AST.TypeSpecNode('_Bool', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 1);
  });

  it('should report correct size for unsigned type', () => {
    const typeSpec = new AST.TypeSpecNode('unsigned', false, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 2);
  });

  it('should default to size 2 for unknown type', () => {
    const typeSpec = new AST.TypeSpecNode('unknown', true, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } });
    assert.strictEqual(typeSpec.getSize(), 2);
  });

  // Function with non-int return type
  it('should parse function with char return type', () => {
    const source = `char getChar() { return 'a'; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.returnType.baseType, 'char');
  });

  it('should parse function with long return type', () => {
    const source = `long getValue() { return 100; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.returnType.baseType, 'long');
  });

  // Struct field with different types
  it('should parse struct with char field', () => {
    const source = `struct S { char c; int x; };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.fields[0].type.baseType, 'char');
    assert.strictEqual(structNode.fields[1].type.baseType, 'int');
  });

  it('should parse struct with unsigned field', () => {
    const source = `struct S { unsigned u; long l; };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.fields[0].type.baseType, 'unsigned');
    assert.strictEqual(structNode.fields[1].type.baseType, 'long');
  });
});
