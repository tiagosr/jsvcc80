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

describe('Struct and Union - Parser', () => {
  it('should parse struct definition with multiple fields', () => {
    const source = `struct Point { int x; int y; };`;
    const ast = parse(source);
    assert.strictEqual(ast.statements.length, 1);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.type, 'Struct');
    assert.strictEqual(structNode.kind, 'struct');
    assert.strictEqual(structNode.name.name, 'Point');
    assert.strictEqual(structNode.fields.length, 2);
    assert.strictEqual(structNode.fields[0].name.name, 'x');
    assert.strictEqual(structNode.fields[1].name.name, 'y');
  });

  it('should parse union definition', () => {
    const source = `union Data { int i; char c; };`;
    const ast = parse(source);
    const unionNode = ast.statements[0];
    assert.strictEqual(unionNode.kind, 'union');
    assert.strictEqual(unionNode.name.name, 'Data');
    assert.strictEqual(unionNode.fields.length, 2);
  });

  it('should parse struct with char field', () => {
    const source = `struct S { char c; int x; };`;
    const ast = parse(source);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.fields[0].type.baseType, 'char');
    assert.strictEqual(structNode.fields[1].type.baseType, 'int');
  });

  it('should parse struct variable declaration', () => {
    const source = `struct Point { int x; int y; }; struct Point p;`;
    const ast = parse(source);
    assert.strictEqual(ast.statements.length, 2);
    const decl = ast.statements[1];
    assert.strictEqual(decl.type.structKind, 'struct');
    assert.strictEqual(decl.type.structType, 'Point');
  });

  it('should parse union variable declaration', () => {
    const source = `union Data { int i; char c; }; union Data d;`;
    const ast = parse(source);
    assert.strictEqual(ast.statements.length, 2);
    const decl = ast.statements[1];
    assert.strictEqual(decl.type.structKind, 'union');
    assert.strictEqual(decl.type.structType, 'Data');
  });

  it('should parse struct with unsigned and long fields', () => {
    const source = `struct S { unsigned u; long l; };`;
    const ast = parse(source);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.fields[0].type.baseType, 'unsigned');
    assert.strictEqual(structNode.fields[1].type.baseType, 'long');
  });

  it('should parse struct in function body', () => {
    const source = `struct Point { int x; int y; }; int main() { struct Point p; return 0; }`;
    const ast = parse(source);
    assert.strictEqual(ast.statements.length, 2);
    const func = ast.statements[1];
    assert.strictEqual(func.type, 'Function');
  });

  it('should parse nested struct access', () => {
    const source = `struct Inner { int x; }; struct Outer { struct Inner inner; int y; };`;
    const ast = parse(source);
    assert.strictEqual(ast.statements.length, 2);
  });
});

describe('sizeof - Parser', () => {
  it('should parse sizeof with expression', () => {
    const source = `int main() { int x = sizeof(a); return x; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should parse sizeof with type', () => {
    const source = `int main() { int x = sizeof(int); return x; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should parse sizeof in expression', () => {
    const source = `int main() { int x = sizeof(int) + 1; return x; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should produce SizeOfNode in AST', () => {
    const source = `int main() { int x = sizeof(int); return x; }`;
    const ast = parse(source);
    const func = ast.statements[0];
    // The sizeof should be inside the declaration's init expression
    const decl = func.body.statements[0];
    assert.ok(decl.init instanceof AST.SizeOfNode);
  });
});

describe('offsetof - Parser', () => {
  it('should parse offsetof expression', () => {
    const source = `struct S { int x; int y; }; int main() { int o = offsetof(S, y); return o; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should produce OffsetOfNode in AST', () => {
    const source = `struct S { int x; int y; }; int main() { int o = offsetof(S, y); return o; }`;
    const ast = parse(source);
    const func = ast.statements[1];
    const decl = func.body.statements[0];
    assert.ok(decl.init instanceof AST.OffsetOfNode);
    assert.strictEqual(decl.init.typeName, 'S');
    assert.strictEqual(decl.init.fieldName, 'y');
  });
});

describe('typeof - Parser', () => {
  it('should parse typeof expression', () => {
    const source = `int main() { int x = typeof(a); return x; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should produce TypeOfNode in AST', () => {
    const source = `int main() { int a; int x = typeof(a); return x; }`;
    const ast = parse(source);
    const func = ast.statements[0];
    const decl = func.body.statements[1];
    assert.ok(decl.init instanceof AST.TypeOfNode);
  });
});

describe('Struct and Union - IR Translation', () => {
  it('should register struct in type registry', () => {
    const source = `struct Point { int x; int y; }; int main() { return 0; }`;
    const ast = parse(source);
    const ir = toIr(ast);
    assert.ok(ir !== null);
  });

  it('should register union in type registry', () => {
    const source = `union Data { int i; char c; }; int main() { return 0; }`;
    const ast = parse(source);
    const ir = toIr(ast);
    assert.ok(ir !== null);
  });

  it('should compute struct size correctly', () => {
    const translator = new AstToIr();
    const source = `struct Point { int x; int y; }; int main() { return 0; }`;
    const ast = parse(source);
    translator.translate(ast);
    const structDef = translator.structRegistry.get('Point');
    assert.ok(structDef !== undefined);
    assert.strictEqual(structDef.size, 4); // 2 ints * 2 bytes each
    assert.strictEqual(structDef.kind, 'struct');
  });

  it('should compute union size correctly (max field size)', () => {
    const translator = new AstToIr();
    const source = `union Data { int i; char c; }; int main() { return 0; }`;
    const ast = parse(source);
    translator.translate(ast);
    const unionDef = translator.structRegistry.get('Data');
    assert.ok(unionDef !== undefined);
    assert.strictEqual(unionDef.size, 2); // max(int=2, char=1) = 2
    assert.strictEqual(unionDef.kind, 'union');
  });

  it('should compute field offsets for struct', () => {
    const translator = new AstToIr();
    const source = `struct S { char a; int b; char c; }; int main() { return 0; }`;
    const ast = parse(source);
    translator.translate(ast);
    const structDef = translator.structRegistry.get('S');
    assert.strictEqual(structDef.fieldOffsets.get('a'), 0);
    assert.strictEqual(structDef.fieldOffsets.get('b'), 1);
    assert.strictEqual(structDef.fieldOffsets.get('c'), 3);
  });

  it('should compute field offsets for union (all zero)', () => {
    const translator = new AstToIr();
    const source = `union U { char a; int b; }; int main() { return 0; }`;
    const ast = parse(source);
    translator.translate(ast);
    const unionDef = translator.structRegistry.get('U');
    assert.strictEqual(unionDef.fieldOffsets.get('a'), 0);
    assert.strictEqual(unionDef.fieldOffsets.get('b'), 0);
  });

  it('should translate struct variable declaration', () => {
    const source = `struct Point { int x; int y; }; int main() { struct Point p; return 0; }`;
    const ast = parse(source);
    const ir = toIr(ast);
    assert.ok(ir !== null);
    assert.ok(ir.functions.length > 0);
  });

  it('should allocate stack space for struct variable', () => {
    const translator = new AstToIr();
    const source = `struct Point { int x; int y; }; int main() { struct Point p; return 0; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    assert.ok(func !== null);
    // Should have an AllocStackInstruction for the struct
    let hasAlloc = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'ALLOC_STACK') {
          hasAlloc = true;
          assert.strictEqual(instr.operands[0], 4); // 2 ints * 2 bytes
        }
      }
    }
    assert.strictEqual(hasAlloc, true);
  });

  it('should handle struct with long field', () => {
    const translator = new AstToIr();
    const source = `struct S { long l; int i; }; int main() { return 0; }`;
    const ast = parse(source);
    translator.translate(ast);
    const structDef = translator.structRegistry.get('S');
    assert.strictEqual(structDef.size, 6); // 4 (long) + 2 (int)
  });
});

describe('sizeof - IR Translation', () => {
  it('should resolve sizeof(int) to 2', () => {
    const translator = new AstToIr();
    const source = `int main() { int x = sizeof(int); return x; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    assert.ok(func !== null);
    // The sizeof should produce a LOAD instruction with value 2
    let foundLoad = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD' && instr.operands[1] === 2) {
          foundLoad = true;
        }
      }
    }
    assert.strictEqual(foundLoad, true);
  });

  it('should resolve sizeof(char) to 1', () => {
    const translator = new AstToIr();
    const source = `int main() { int x = sizeof(char); return x; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    let foundLoad = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD' && instr.operands[1] === 1) {
          foundLoad = true;
        }
      }
    }
    assert.strictEqual(foundLoad, true);
  });

  it('should resolve sizeof(long) to 4', () => {
    const translator = new AstToIr();
    const source = `int main() { int x = sizeof(long); return x; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    let foundLoad = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD' && instr.operands[1] === 4) {
          foundLoad = true;
        }
      }
    }
    assert.strictEqual(foundLoad, true);
  });

  it('should resolve sizeof(struct) to computed size', () => {
    const translator = new AstToIr();
    const source = `struct S { int a; int b; int c; }; int main() { int x = sizeof(S); return x; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    let foundLoad = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD' && instr.operands[1] === 6) {
          foundLoad = true;
        }
      }
    }
    assert.strictEqual(foundLoad, true);
  });
});

describe('offsetof - IR Translation', () => {
  it('should resolve offsetof to correct byte offset', () => {
    const translator = new AstToIr();
    const source = `struct S { char a; int b; char c; }; int main() { int o = offsetof(S, b); return o; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    let foundLoad = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD' && instr.operands[1] === 1) {
          foundLoad = true;
        }
      }
    }
    assert.strictEqual(foundLoad, true);
  });

  it('should resolve offsetof first field to 0', () => {
    const translator = new AstToIr();
    const source = `struct S { int a; int b; }; int main() { int o = offsetof(S, a); return o; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    let foundLoad = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD' && instr.operands[1] === 0) {
          foundLoad = true;
        }
      }
    }
    assert.strictEqual(foundLoad, true);
  });
});

describe('typeof - IR Translation', () => {
  it('should resolve typeof variable to its size', () => {
    const translator = new AstToIr();
    const source = `int main() { int a; int x = typeof(a); return x; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    assert.ok(func !== null);
  });
});

describe('Struct member access - IR Translation', () => {
  it('should translate struct member access with offset', () => {
    const translator = new AstToIr();
    const source = `struct Point { int x; int y; }; int main() { struct Point p; int v = p.y; return v; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    assert.ok(func !== null);
  });

  it('should translate struct member assignment', () => {
    const translator = new AstToIr();
    const source = `struct Point { int x; int y; }; int main() { struct Point p; p.x = 10; return 0; }`;
    const ast = parse(source);
    const ir = translator.translate(ast);
    const func = ir.getFunction('main');
    assert.ok(func !== null);
  });
});

describe('Struct - End-to-End Compilation', () => {
  it('should compile struct program to assembly', () => {
    const source = `struct Point { int x; int y; }; int main() { struct Point p; return 0; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile union program to assembly', () => {
    const source = `union Data { int i; char c; }; int main() { union Data d; return 0; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile sizeof expression to assembly', () => {
    const source = `int main() { int x = sizeof(int); return x; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile offsetof expression to assembly', () => {
    const source = `struct S { int x; int y; }; int main() { int o = offsetof(S, y); return o; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile typeof expression to assembly', () => {
    const source = `int main() { int a; int x = typeof(a); return x; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile struct with member access to assembly', () => {
    const source = `struct Point { int x; int y; }; int main() { struct Point p; p.x = 10; return p.x; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile struct with pointer member access', () => {
    const source = `struct Point { int x; int y; }; int main() { struct Point p; struct Point *ptr; ptr = &p; int v = ptr->x; return v; }`;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('TypeSpecNode - Struct types', () => {
  it('should create TypeSpecNode for struct type', () => {
    const typeSpec = new AST.TypeSpecNode(
      'struct', true, false, false, null,
      { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
      0, false, null,
      'Point', 'struct'
    );
    assert.strictEqual(typeSpec.structKind, 'struct');
    assert.strictEqual(typeSpec.structType, 'Point');
  });

  it('should create TypeSpecNode for union type', () => {
    const typeSpec = new AST.TypeSpecNode(
      'union', true, false, false, null,
      { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
      0, false, null,
      'Data', 'union'
    );
    assert.strictEqual(typeSpec.structKind, 'union');
    assert.strictEqual(typeSpec.structType, 'Data');
  });

  it('should return correct type string for struct', () => {
    const typeSpec = new AST.TypeSpecNode(
      'struct', true, false, false, null,
      { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
      0, false, null,
      'Point', 'struct'
    );
    assert.strictEqual(typeSpec.typeString(), 'struct Point');
  });

  it('should return correct type string for union', () => {
    const typeSpec = new AST.TypeSpecNode(
      'union', true, false, false, null,
      { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
      0, false, null,
      'Data', 'union'
    );
    assert.strictEqual(typeSpec.typeString(), 'union Data');
  });
});

describe('Struct - Complex scenarios', () => {
  it('should handle multiple struct definitions', () => {
    const source = `struct Point { int x; int y; }; struct Size { int w; int h; }; struct Rect { struct Point p; struct Size s; }; int main() { return 0; }`;
    const ast = parse(source);
    assert.strictEqual(ast.statements.length, 4);
  });

  it('should handle struct with pointer field', () => {
    const source = `struct Node { int value; struct Node *next; };`;
    const ast = parse(source);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.fields.length, 2);
  });

  it('should handle sizeof in arithmetic expression', () => {
    const source = `int main() { int x = sizeof(int) * 2 + sizeof(char); return x; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should handle struct array declaration', () => {
    const source = `struct Point { int x; int y; }; int main() { struct Point points; return 0; }`;
    const ast = parse(source);
    assert.ok(ast !== null);
  });

  it('should handle struct with all basic types', () => {
    const source = `struct Mixed { char c; short s; int i; long l; unsigned u; _Bool b; }; int main() { return 0; }`;
    const ast = parse(source);
    const structNode = ast.statements[0];
    assert.strictEqual(structNode.fields.length, 6);
  });
});
