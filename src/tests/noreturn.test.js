import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import { Compiler } from '../../src/compiler.js';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';
import * as IL from '../../src/nanopass/il.js';

describe('_Noreturn Parsing', () => {
  it('should parse _Noreturn on void function definition', () => {
    const source = `_Noreturn void fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
    assert.strictEqual(ast.statements.length, 1);

    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.baseType, 'void');
  });

  it('should parse _Noreturn on int function definition', () => {
    const source = `_Noreturn int fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.baseType, 'int');
  });

  it('should parse _Noreturn before return type with char', () => {
    const source = `_Noreturn char fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.baseType, 'char');
  });

  it('should parse _Noreturn before return type with long', () => {
    const source = `_Noreturn long fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.baseType, 'long');
  });

  it('should parse _Noreturn before return type with unsigned', () => {
    const source = `_Noreturn unsigned fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.baseType, 'unsigned');
  });

  it('should parse _Noreturn on function with parameters', () => {
    const source = `_Noreturn void fn(int a, char b) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.parameters.length, 2);
  });

  it('should parse _Noreturn on function with void parameter', () => {
    const source = `_Noreturn void fn(void) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.parameters.length, 0);
  });

  it('should parse _Noreturn on function with body containing non-return statements', () => {
    const source = `_Noreturn int fn() { int x = 5; x = x + 1; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.ok(funcNode.body !== null);
  });

  it('should parse _Noreturn on function declaration without body', () => {
    const source = `_Noreturn void fn();`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.ok(funcNode.body !== null);
  });

  it('should parse _Noreturn on function with pointer return type', () => {
    const source = `_Noreturn int* fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.pointerDepth, 1);
  });

  it('should parse _Noreturn on function with const return type', () => {
    const source = `_Noreturn const int fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.isConst, true);
  });

  it('should parse _Noreturn on function with volatile return type', () => {
    const source = `_Noreturn volatile int fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fn');
    assert.strictEqual(funcNode.isNoreturn, true);
    assert.strictEqual(funcNode.returnType.isVolatile, true);
  });
});



describe('_Noreturn Semantic Errors', () => {
  it('should reject _Noreturn function with return statement', () => {
    const source = `_Noreturn void fn() { return; }`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(!result.success, 'should not compile successfully');
    assert.ok(result.errors.length > 0, 'should have errors');
    assert.ok(result.errors[0].includes('_Noreturn'), 'error should mention _Noreturn');
    assert.ok(result.errors[0].includes('return'), 'error should mention return');
  });
});

describe('_Noreturn IR Metadata', () => {
  it('should set isNoreturn in FunctionIR metadata', () => {
    const source = `_Noreturn void fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].name, 'fn');
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR metadata for int return', () => {
    const source = `_Noreturn int fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn for normal function as false', () => {
    const source = `void fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, false);
  });

  it('should include isNoreturn in FunctionIR toJSON', () => {
    const source = `_Noreturn void fn() {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    const json = ir.toJSON();
    assert.strictEqual(json.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR with parameters', () => {
    const source = `_Noreturn void fn(int a, char b) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
    assert.strictEqual(ir.functions[0].metadata.parameters.length, 2);
  });

  it('should set isNoreturn in FunctionIR with void parameter', () => {
    const source = `_Noreturn void fn(void) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR with compound body', () => {
    const source = `_Noreturn void fn() { int x = 5; x = x + 1; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
    assert.ok(ir.functions[0].getEntry());
  });

  it('should set isNoreturn in FunctionIR with if-else body', () => {
    const source = `_Noreturn void fn(int x) { if (x) { x = 1; } else { x = 2; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR with while loop body', () => {
    const source = `_Noreturn void fn() { while (1) { int x = 5; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR with for loop body', () => {
    const source = `_Noreturn void fn() { for (int i = 0; i < 10; i = i + 1) { int x = i; } }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR with do-while body', () => {
    const source = `_Noreturn void fn() { do { int x = 5; } while (1); }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });

  it('should set isNoreturn in FunctionIR with goto body', () => {
    const source = `_Noreturn void fn() { goto end; end: int x = 5; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.strictEqual(ir.functions.length, 1);
    assert.strictEqual(ir.functions[0].metadata.isNoreturn, true);
  });
});
