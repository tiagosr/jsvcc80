import { describe, it } from 'mocha';
import assert from 'assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import * as AST from '../../src/ast/nodes.js';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';
import { Compiler, CompilerOptions } from '../../src/compiler.js';

/**
 * Helper to parse source code
 */
function parse(source) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new CPegParser();
  return parser.parse(tokens);
}

/**
 * Helper to translate AST to IR
 */
function toIr(ast) {
  const translator = new AstToIr();
  return translator.translate(ast);
}

describe('Parser - unsigned:n type specifiers', () => {
  it('should parse unsigned:8', () => {
    const ast = parse('unsigned:8 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, 8);
  });

  it('should parse unsigned:16', () => {
    const ast = parse('unsigned:16 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, 16);
  });

  it('should parse unsigned:32', () => {
    const ast = parse('unsigned:32 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, 32);
  });

  it('should parse unsigned:1', () => {
    const ast = parse('unsigned:1 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, 1);
  });

  it('should parse unsigned:24', () => {
    const ast = parse('unsigned:24 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, 24);
  });

  it('should parse const unsigned:8', () => {
    const ast = parse('const unsigned:8 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.bitWidth, 8);
  });

  it('should parse volatile unsigned:8', () => {
    const ast = parse('volatile unsigned:8 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.isVolatile, true);
    assert.strictEqual(decl.type.bitWidth, 8);
  });

  it('should parse const volatile unsigned:8', () => {
    const ast = parse('const volatile unsigned:8 x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'unsigned');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isVolatile, true);
    assert.strictEqual(decl.type.bitWidth, 8);
  });

  it('should still parse unsigned int (no regression)', () => {
    const ast = parse('unsigned int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'int');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, null);
  });

  it('should still parse unsigned char (no regression)', () => {
    const ast = parse('unsigned char x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'char');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, null);
  });

  it('should still parse unsigned long (no regression)', () => {
    const ast = parse('unsigned long x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.baseType, 'long');
    assert.strictEqual(decl.type.isSigned, false);
    assert.strictEqual(decl.type.bitWidth, null);
  });
});

describe('TypeSpecNode - unsigned:n size', () => {
  it('should return size 1 for bitWidth=1', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 1, null);
    assert.strictEqual(type.getSize(), 1);
  });

  it('should return size 1 for bitWidth=8', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 8, null);
    assert.strictEqual(type.getSize(), 1);
  });

  it('should return size 2 for bitWidth=16', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 16, null);
    assert.strictEqual(type.getSize(), 2);
  });

  it('should return size 3 for bitWidth=24', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 24, null);
    assert.strictEqual(type.getSize(), 3);
  });

  it('should return size 4 for bitWidth=32', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 32, null);
    assert.strictEqual(type.getSize(), 4);
  });

  it('should return same size from getElementSize', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 16, null);
    assert.strictEqual(type.getElementSize(), 2);
  });

  it('should return same size from getElementSize for bitWidth=24', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 24, null);
    assert.strictEqual(type.getElementSize(), 3);
  });
});

describe('TypeSpecNode - unsigned:n typeString', () => {
  it('should return "unsigned:8"', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 8, null);
    assert.strictEqual(type.typeString(), 'unsigned:8');
  });

  it('should return "const unsigned:8"', () => {
    const type = new AST.TypeSpecNode('unsigned', false, true, false, 8, null);
    assert.strictEqual(type.typeString(), 'const unsigned:8');
  });

  it('should return "volatile unsigned:16"', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, true, 16, null);
    assert.strictEqual(type.typeString(), 'volatile unsigned:16');
  });

  it('should return "const volatile unsigned:1"', () => {
    const type = new AST.TypeSpecNode('unsigned', false, true, true, 1, null);
    assert.strictEqual(type.typeString(), 'const volatile unsigned:1');
  });

  it('should return pointer size 2 overriding bitWidth', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 8, null, 1);
    assert.strictEqual(type.getSize(), 2);
  });

  it('should return element size for bitWidth array (bitWidth takes precedence)', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 8, null, 0, true, 5);
    assert.strictEqual(type.getSize(), 1);
  });

  it('should return element size for bitWidth 16 array (bitWidth takes precedence)', () => {
    const type = new AST.TypeSpecNode('unsigned', false, false, false, 16, null, 0, true, 3);
    assert.strictEqual(type.getSize(), 2);
  });
});

describe('IR Translation - unsigned:n globals', () => {
  it('should translate unsigned:8 global with size=1', () => {
    const source = 'unsigned:8 x;';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.globals.length, 1);
    assert.strictEqual(ir.globals[0].name, 'x');
    assert.strictEqual(ir.globals[0].size, 1);
  });

  it('should translate unsigned:16 global with size=2', () => {
    const source = 'unsigned:16 x;';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.globals.length, 1);
    assert.strictEqual(ir.globals[0].name, 'x');
    assert.strictEqual(ir.globals[0].size, 2);
  });

  it('should translate unsigned:32 global with size=4', () => {
    const source = 'unsigned:32 x;';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.globals.length, 1);
    assert.strictEqual(ir.globals[0].name, 'x');
    assert.strictEqual(ir.globals[0].size, 4);
  });

  it('should translate unsigned:24 global with size=3', () => {
    const source = 'unsigned:24 x;';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.globals.length, 1);
    assert.strictEqual(ir.globals[0].name, 'x');
    assert.strictEqual(ir.globals[0].size, 3);
  });
});

describe('IR Translation - unsigned:n function parameters', () => {
  it('should translate unsigned:8 parameter with size=1', () => {
    const source = 'void foo(unsigned:8 a) {}';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.functions.length, 1);
    const func = ir.getFunction('foo');
    assert.ok(func !== null);
    assert.strictEqual(func.metadata.paramTypes.length, 1);
    assert.strictEqual(func.metadata.paramTypes[0].size, 1);
  });

  it('should translate unsigned:16 parameter with size=2', () => {
    const source = 'void foo(unsigned:16 a) {}';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.functions.length, 1);
    const func = ir.getFunction('foo');
    assert.ok(func !== null);
    assert.strictEqual(func.metadata.paramTypes.length, 1);
    assert.strictEqual(func.metadata.paramTypes[0].size, 2);
  });

  it('should translate multiple unsigned:n parameters', () => {
    const source = 'void foo(unsigned:8 a, unsigned:16 b) {}';
    const ast = parse(source);
    const ir = toIr(ast);
    assert.strictEqual(ir.functions.length, 1);
    const func = ir.getFunction('foo');
    assert.ok(func !== null);
    assert.strictEqual(func.metadata.paramTypes.length, 2);
    assert.strictEqual(func.metadata.paramTypes[0].size, 1);
    assert.strictEqual(func.metadata.paramTypes[1].size, 2);
  });
});

describe('End-to-End - unsigned:n compilation', () => {
  it('should compile unsigned:8 global to object file with symbol size=1', () => {
    const source = 'unsigned:8 x;';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.objectFile !== null);
    const sym = result.objectFile.getSymbol('x');
    assert.ok(sym !== null);
    assert.strictEqual(sym.size, 1);
  });

  it('should compile unsigned:16 global to object file with symbol size=2', () => {
    const source = 'unsigned:16 x;';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.objectFile !== null);
    const sym = result.objectFile.getSymbol('x');
    assert.ok(sym !== null);
    assert.strictEqual(sym.size, 2);
  });

  it('should compile unsigned:32 global to object file with symbol size=4', () => {
    const source = 'unsigned:32 x;';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.objectFile !== null);
    const sym = result.objectFile.getSymbol('x');
    assert.ok(sym !== null);
    assert.strictEqual(sym.size, 4);
  });

  it('should compile unsigned:8 function to assembly', () => {
    const source = 'unsigned:8 foo(unsigned:8 a) { return a; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile unsigned:16 function to assembly', () => {
    const source = 'unsigned:16 foo(unsigned:16 a) { return a; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile unsigned:1 function to assembly', () => {
    const source = 'unsigned:1 foo(unsigned:1 a) { return a; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile unsigned:24 function to assembly', () => {
    const source = 'unsigned:24 foo(unsigned:24 a) { return a; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile const unsigned:8 global to assembly', () => {
    const source = 'const unsigned:8 x = 5;';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile volatile unsigned:8 global to assembly', () => {
    const source = 'volatile unsigned:8 x;';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile mixed unsigned:n and int types', () => {
    const source = 'unsigned:8 a; int b; unsigned:16 c;';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});
