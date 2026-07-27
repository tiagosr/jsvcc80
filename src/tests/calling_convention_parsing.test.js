import { describe, it } from 'mocha';
import assert from 'assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import { Compiler } from '../../src/compiler.js';

describe('__attribute__ Parsing on Function Definitions', () => {
  it('should parse __attribute__((__cdecl__("name"))) on function definition', () => {
    const source = `int main() __attribute__((__cdecl__("myfunc"))) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    assert.strictEqual(ast.type, 'Compound');
    assert.strictEqual(ast.statements.length, 1);
    
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'main');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__cdecl__');
    assert.strictEqual(funcNode.attributes[0].args.value, 'myfunc');
  });

  it('should parse __attribute__((__fastcall__)) on function definition', () => {
    const source = `int fast_func() __attribute__((__fastcall__)) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fast_func');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__fastcall__');
    assert.strictEqual(funcNode.attributes[0].args, null);
  });

  it('should parse __attribute__((__callee__)) on function definition', () => {
    const source = `void callee_func() __attribute__((__callee__)) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'callee_func');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__callee__');
  });

  it('should parse __attribute__((__new_sdcc__)) on function definition', () => {
    const source = `int sdcc_func() __attribute__((__new_sdcc__)) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'sdcc_func');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__new_sdcc__');
  });

  it('should parse __cdecl__ with typed parameters', () => {
    const source = `int add(int a, int b) __attribute__((__cdecl__("add"))) { return a + b; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'add');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__cdecl__');
    assert.strictEqual(funcNode.attributes[0].args.value, 'add');
    assert.strictEqual(funcNode.parameters.length, 2);
  });

  it('should parse __fastcall__ with typed parameters', () => {
    const source = `int fast_add(int a) __attribute__((__fastcall__)) { return a + 1; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'fast_add');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__fastcall__');
    assert.strictEqual(funcNode.parameters.length, 1);
  });

  it('should parse __callee__ with void parameter', () => {
    const source = `void main(void) __attribute__((__callee__)) {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'main');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__callee__');
  });

  it('should parse __new_sdcc__ with multiple parameters', () => {
    const source = `int multi(int a, char b) __attribute__((__new_sdcc__)) { return a; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'multi');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__new_sdcc__');
    assert.strictEqual(funcNode.parameters.length, 2);
  });

  it('should parse multiple attributes on function definition', () => {
    const source = `int multi_attr() __attribute__((__cdecl__("func1"))) __attribute__((__fastcall__)) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'multi_attr');
    assert.strictEqual(funcNode.attributes.length, 2);
    assert.strictEqual(funcNode.attributes[0].name, '__cdecl__');
    assert.strictEqual(funcNode.attributes[0].args.value, 'func1');
    assert.strictEqual(funcNode.attributes[1].name, '__fastcall__');
  });

  it('should parse __attribute__ on pointer return type function', () => {
    const source = `int* get_ptr() __attribute__((__cdecl__("ptr_func"))) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'get_ptr');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__cdecl__');
    assert.strictEqual(funcNode.returnType.pointerDepth, 1);
  });

  it('should parse __attribute__ on const return type function', () => {
    const source = `const int const_main() __attribute__((__cdecl__("const_func"))) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'const_main');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__cdecl__');
    assert.strictEqual(funcNode.returnType.isConst, true);
  });

  it('should parse __attribute__ on volatile return type function', () => {
    const source = `volatile int vol_main() __attribute__((__fastcall__)) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'vol_main');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__fastcall__');
    assert.strictEqual(funcNode.returnType.isVolatile, true);
  });

  it('should parse __attribute__ with unsigned return type', () => {
    const source = `unsigned unsigned_main() __attribute__((__callee__)) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'unsigned_main');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__callee__');
    assert.strictEqual(funcNode.returnType.baseType, 'unsigned');
    assert.strictEqual(funcNode.returnType.isSigned, false);
  });

  it('should parse __attribute__ with long return type', () => {
    const source = `long long_main() __attribute__((__new_sdcc__)) { return 0; }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const funcNode = ast.statements[0];
    assert.strictEqual(funcNode.type, 'Function');
    assert.strictEqual(funcNode.name.name, 'long_main');
    assert.strictEqual(funcNode.attributes.length, 1);
    assert.strictEqual(funcNode.attributes[0].name, '__new_sdcc__');
    assert.strictEqual(funcNode.returnType.baseType, 'long');
  });
});

describe('__attribute__ Semantic Analysis', () => {
  it('should extract calling convention from __cdecl__ on function', () => {
    const source = `int main() __attribute__((__cdecl__("myfunc"))) { return 0; }`;
    const compiler = new Compiler();
    const preprocessed = compiler.preprocess(source);
    const tokens = compiler.tokenize(preprocessed);
    const ast = compiler.parse(tokens);
    const analyzed = compiler.analyze(ast);
    
    assert.ok(analyzed !== null);
    assert.ok(analyzed.meta);
    assert.ok(analyzed.meta.functionConventionMap);
    
    const conventions = analyzed.meta.functionConventionMap.get('main');
    assert.ok(conventions);
    assert.strictEqual(conventions.length, 1);
    assert.strictEqual(conventions[0].callingConvention, 'cdecl');
    assert.strictEqual(conventions[0].funcName, 'myfunc');
  });

  it('should extract calling convention from __fastcall__ on function', () => {
    const source = `int fast_func() __attribute__((__fastcall__)) { return 0; }`;
    const compiler = new Compiler();
    const preprocessed = compiler.preprocess(source);
    const tokens = compiler.tokenize(preprocessed);
    const ast = compiler.parse(tokens);
    const analyzed = compiler.analyze(ast);
    
    assert.ok(analyzed !== null);
    const conventions = analyzed.meta.functionConventionMap.get('fast_func');
    assert.ok(conventions);
    assert.strictEqual(conventions[0].callingConvention, 'fastcall');
  });

  it('should extract calling convention from __callee__ on function', () => {
    const source = `void callee_func() __attribute__((__callee__)) {}`;
    const compiler = new Compiler();
    const preprocessed = compiler.preprocess(source);
    const tokens = compiler.tokenize(preprocessed);
    const ast = compiler.parse(tokens);
    const analyzed = compiler.analyze(ast);
    
    assert.ok(analyzed !== null);
    const conventions = analyzed.meta.functionConventionMap.get('callee_func');
    assert.ok(conventions);
    assert.strictEqual(conventions[0].callingConvention, 'callee');
  });

  it('should extract calling convention from __new_sdcc__ on function', () => {
    const source = `int sdcc_func() __attribute__((__new_sdcc__)) { return 0; }`;
    const compiler = new Compiler();
    const preprocessed = compiler.preprocess(source);
    const tokens = compiler.tokenize(preprocessed);
    const ast = compiler.parse(tokens);
    const analyzed = compiler.analyze(ast);
    
    assert.ok(analyzed !== null);
    const conventions = analyzed.meta.functionConventionMap.get('sdcc_func');
    assert.ok(conventions);
    assert.strictEqual(conventions[0].callingConvention, 'new_sdcc');
  });

  it('should handle function with no attributes', () => {
    const source = `int main() { return 0; }`;
    const compiler = new Compiler();
    const preprocessed = compiler.preprocess(source);
    const tokens = compiler.tokenize(preprocessed);
    const ast = compiler.parse(tokens);
    const analyzed = compiler.analyze(ast);
    
    assert.ok(analyzed !== null);
    const conventions = analyzed.meta.functionConventionMap.get('main');
    assert.strictEqual(conventions, undefined);
  });

  it('should collect all symbols in symbolMap', () => {
    const source = `int main() __attribute__((__cdecl__("main"))) { return 0; }`;
    const compiler = new Compiler();
    const preprocessed = compiler.preprocess(source);
    const tokens = compiler.tokenize(preprocessed);
    const ast = compiler.parse(tokens);
    const analyzed = compiler.analyze(ast);
    
    assert.ok(analyzed !== null);
    const symbolMap = analyzed.meta.symbolMap;
    assert.ok(symbolMap.has('main'));
  });
});

describe('__attribute__ Ignored on Non-Function Declarations', () => {
  it('should parse struct definition without attributes', () => {
    const source = `struct S { int x; };`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.type, 'Struct');
    assert.strictEqual(structNode.fields.length, 1);
    assert.strictEqual(structNode.fields[0].name.name, 'x');
  });

  it('should parse variable declaration', () => {
    const source = `int x = 5;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    assert.strictEqual(ast.statements.length, 1);
  });

  it('should parse typedef without attributes', () => {
    const source = `typedef int myint;`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    assert.ok(ast !== null);
    assert.strictEqual(ast.statements.length, 1);
  });
});
