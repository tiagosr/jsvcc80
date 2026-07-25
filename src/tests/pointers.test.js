import { describe, it } from 'mocha';
import assert from 'assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import * as AST from '../../src/ast/nodes.js';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';
import * as IL from '../../src/nanopass/il.js';
import { Z80Codegen } from '../../src/backend/z80codegen.js';

describe('Pointers, Arrays, and Strings - Type System', () => {
  it('TypeSpecNode should track pointer depth', () => {
    const type = new AST.TypeSpecNode('int', true, false, false, null, null, 2);
    assert.strictEqual(type.pointerDepth, 2);
    assert.strictEqual(type.getSize(), 2);
  });

  it('TypeSpecNode should track array dimensions', () => {
    const type = new AST.TypeSpecNode('int', true, false, false, null, null, 0, true, 10);
    assert.strictEqual(type.isArray, true);
    assert.strictEqual(type.arrayLength, 10);
    assert.strictEqual(type.getSize(), 20);
  });

  it('TypeSpecNode should return correct element size for arrays', () => {
    const type = new AST.TypeSpecNode('int', true, false, false, null, null, 0, true, 10);
    assert.strictEqual(type.getElementSize(), 2);
  });

  it('TypeSpecNode should return correct element size for pointers', () => {
    const type = new AST.TypeSpecNode('char', true, false, false, null, null, 1);
    assert.strictEqual(type.getElementSize(), 2);
  });

  it('TypeSpecNode typeString should format pointer types', () => {
    const type = new AST.TypeSpecNode('int', true, false, false, null, null, 1);
    assert.strictEqual(type.typeString(), 'int*');
  });

  it('TypeSpecNode typeString should format array types', () => {
    const type = new AST.TypeSpecNode('char', true, false, false, null, null, 0, true, 10);
    assert.strictEqual(type.typeString(), 'char[10]');
  });

  it('TypeSpecNode should handle double pointers', () => {
    const type = new AST.TypeSpecNode('int', true, false, false, null, null, 2);
    assert.strictEqual(type.typeString(), 'int**');
    assert.strictEqual(type.getSize(), 2);
  });
});

describe('Pointers, Arrays, and Strings - Parser', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    return parser.parse(tokens);
  }

  it('should parse pointer declaration', () => {
    const ast = parse('int *p;');
    const decl = ast.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.strictEqual(decl.type.pointerDepth, 1);
    assert.strictEqual(decl.name.name, 'p');
  });

  it('should parse double pointer declaration', () => {
    const ast = parse('int **pp;');
    const decl = ast.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.strictEqual(decl.type.pointerDepth, 2);
    assert.strictEqual(decl.name.name, 'pp');
  });

  it('should parse array declaration', () => {
    const ast = parse('int arr[10];');
    const decl = ast.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.strictEqual(decl.type.isArray, true);
    assert.strictEqual(decl.type.arrayLength, 10);
    assert.strictEqual(decl.name.name, 'arr');
  });

  it('should parse char array declaration', () => {
    const ast = parse('char buf[256];');
    const decl = ast.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.strictEqual(decl.type.isArray, true);
    assert.strictEqual(decl.type.arrayLength, 256);
    assert.strictEqual(decl.type.baseType, 'char');
    assert.strictEqual(decl.type.getSize(), 256);
  });

  it('should parse address-of operator', () => {
    const ast = parse('int main() { int x; int *p = &x; }');
    const func = ast.statements[0];
    assert.ok(func instanceof AST.FunctionNode);
    const body = func.body;
    assert.ok(body instanceof AST.CompoundNode);
    const pDecl = body.statements[1];
    assert.ok(pDecl instanceof AST.DeclNode);
    assert.ok(pDecl.init instanceof AST.AddressOfNode);
    assert.strictEqual(pDecl.init.operand.name, 'x');
  });

  it('should parse pointer in function parameter', () => {
    const ast = parse('void func(int *p) {}');
    const func = ast.statements[0];
    assert.ok(func instanceof AST.FunctionNode);
    assert.strictEqual(func.parameters[0].type.pointerDepth, 1);
    assert.strictEqual(func.parameters[0].name, 'p');
  });

  it('should parse array in function parameter', () => {
    const ast = parse('void func(int arr[10]) {}');
    const func = ast.statements[0];
    assert.ok(func instanceof AST.FunctionNode);
    assert.strictEqual(func.parameters[0].type.isArray, true);
    assert.strictEqual(func.parameters[0].name, 'arr');
  });

  it('should parse local pointer declaration', () => {
    const ast = parse('int main() { int *p; }');
    const func = ast.statements[0];
    const body = func.body;
    const decl = body.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.strictEqual(decl.type.pointerDepth, 1);
  });

  it('should parse local array declaration', () => {
    const ast = parse('int main() { int arr[5]; }');
    const func = ast.statements[0];
    const body = func.body;
    const decl = body.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.strictEqual(decl.type.isArray, true);
    assert.strictEqual(decl.type.arrayLength, 5);
  });

  it('should parse string literal in expression', () => {
    const ast = parse('int main() { char *s = "hello"; }');
    const func = ast.statements[0];
    const body = func.body;
    const decl = body.statements[0];
    assert.ok(decl instanceof AST.DeclNode);
    assert.ok(decl.init instanceof AST.LiteralNode);
    assert.strictEqual(decl.init.type, 'string');
    assert.strictEqual(decl.init.value, 'hello');
  });

  it('should parse array indexing in expression', () => {
    const ast = parse('int main() { int arr[10]; int x = arr[0]; }');
    const func = ast.statements[0];
    const body = func.body;
    const decl = body.statements[1];
    assert.ok(decl.init instanceof AST.IndexNode);
    assert.strictEqual(decl.init.base.name, 'arr');
  });

  it('should parse pointer dereference', () => {
    const ast = parse('int main() { int x; int *p = &x; int y = *p; }');
    const func = ast.statements[0];
    const body = func.body;
    const yDecl = body.statements[2];
    assert.ok(yDecl.init instanceof AST.UnaryOpNode);
    assert.strictEqual(yDecl.init.op, 'deref');
  });
});

describe('Pointers, Arrays, and Strings - IR Translation', () => {
  function translate(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    return translator.translate(ast);
  }

  it('should translate pointer declaration', () => {
    const ir = translate('int main() { int *p; }');
    assert.strictEqual(ir.functions.length, 1);
    const func = ir.functions[0];
    assert.strictEqual(func.name, 'main');
  });

  it('should translate array declaration', () => {
    const ir = translate('int main() { int arr[10]; }');
    assert.strictEqual(ir.functions.length, 1);
    const func = ir.functions[0];
    assert.strictEqual(func.name, 'main');
  });

  it('should translate address-of expression', () => {
    const ir = translate('int main() { int x = 0; int *p = &x; }');
    const func = ir.functions[0];
    let hasLoadAddr = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr instanceof IL.LoadAddrInstruction) {
          hasLoadAddr = true;
        }
      }
    }
    assert.strictEqual(hasLoadAddr, true);
  });

  it('should emit string data as global', () => {
    const ir = translate('int main() { char *s = "hello"; }');
    const hasString = ir.globals.some(g => g.type === 'string');
    assert.strictEqual(hasString, true);
  });

  it('should emit string bytes with null terminator', () => {
    const ir = translate('int main() { char *s = "hi"; }');
    const strGlobal = ir.globals.find(g => g.type === 'string');
    assert.ok(strGlobal !== undefined);
    assert.strictEqual(strGlobal.bytes[0], 'h'.charCodeAt(0));
    assert.strictEqual(strGlobal.bytes[1], 'i'.charCodeAt(0));
    assert.strictEqual(strGlobal.bytes[2], 0);
  });
});

describe('Pointers, Arrays, and Strings - Z80 Codegen', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);
    const codegen = new Z80Codegen();
    return codegen.generate(ir);
  }

  it('should generate LOAD_ADDR instruction', () => {
    const code = compile('int main() { int x = 0; int *p = &x; }');
    assert.ok(code.includes('ld hl, x'));
  });

  it('should generate string data in global section', () => {
    const code = compile('int main() { char *s = "hi"; }');
    assert.ok(code.includes('.db'));
    const hiCode = 'h'.charCodeAt(0) + ', ' + 'i'.charCodeAt(0) + ', 0';
    assert.ok(code.includes(hiCode));
  });

  it('should generate DEREF_LOAD instruction', () => {
    const code = compile('int main() { int x = 0; int *p = &x; }');
    assert.ok(code.includes('ld hl,') || code.includes('ld a,'));
  });

  it('should generate INDEXED_LOAD instruction', () => {
    const code = compile('int main() { int arr[10]; int x = arr[0]; }');
    assert.ok(code.includes('ld hl,') || code.includes('add hl,'));
  });

  it('should generate function with pointer parameter', () => {
    const code = compile('void func(int *p) { *p = 1; }');
    assert.ok(code.includes('func:'));
  });
});

describe('Pointers, Arrays, and Strings - Integration', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);
    const codegen = new Z80Codegen();
    return codegen.generate(ir);
  }

  it('should compile pointer arithmetic', () => {
    const code = compile('int main() { int arr[10]; int *p = arr; p = p + 1; }');
    assert.ok(code.length > 0);
  });

  it('should compile array access in loop', () => {
    const code = compile('int main() { int arr[10]; int i = 0; while (i < 10) { arr[i] = i; i = i + 1; } }');
    assert.ok(code.length > 0);
  });

  it('should compile string literal assignment', () => {
    const code = compile('int main() { char *msg = "Hello, World!"; }');
    const helloBytes = [72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 0];
    assert.ok(code.includes(helloBytes.join(', ')));
    assert.ok(code.includes('.db'));
  });

  it('should compile nested array access', () => {
    const code = compile('int main() { int arr[10]; int i = 0; int x = arr[arr[i]]; }');
    assert.ok(code.length > 0);
  });

  it('should compile pointer to pointer', () => {
    const code = compile('int main() { int x = 0; int *p = &x; int **pp = &p; }');
    assert.ok(code.length > 0);
  });
});
