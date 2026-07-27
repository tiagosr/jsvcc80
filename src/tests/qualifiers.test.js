import { describe, it } from 'mocha';
import assert from 'assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import * as AST from '../../src/ast/nodes.js';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';

describe('Type Qualifiers - const', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    return parser.parse(tokens);
  }

  it('should parse const int declaration', () => {
    const ast = parse('const int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isVolatile, false);
    assert.strictEqual(decl.name.name, 'x');
  });

  it('should parse const char declaration', () => {
    const ast = parse('const char c;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.baseType, 'char');
  });

  it('should parse const with pointer declaration', () => {
    const ast = parse('const int *p;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.pointerDepth, 1);
  });

  it('should parse const in local declaration', () => {
    const ast = parse('int main() { const int x = 5; }');
    const func = ast.statements[0];
    const decl = func.body.statements[0];
    assert.strictEqual(decl.type.isConst, true);
  });

  it('should parse const with unsigned type', () => {
    const ast = parse('const unsigned int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isSigned, false);
  });
});

describe('Type Qualifiers - volatile', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    return parser.parse(tokens);
  }

  it('should parse volatile int declaration', () => {
    const ast = parse('volatile int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isVolatile, true);
    assert.strictEqual(decl.type.isConst, false);
  });

  it('should parse volatile char declaration', () => {
    const ast = parse('volatile char c;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isVolatile, true);
    assert.strictEqual(decl.type.baseType, 'char');
  });

  it('should parse volatile with pointer declaration', () => {
    const ast = parse('volatile int *p;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isVolatile, true);
    assert.strictEqual(decl.type.pointerDepth, 1);
  });

  it('should parse volatile in local declaration', () => {
    const ast = parse('int main() { volatile int x = 0; }');
    const func = ast.statements[0];
    const decl = func.body.statements[0];
    assert.strictEqual(decl.type.isVolatile, true);
  });
});

describe('Type Qualifiers - const volatile', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    return parser.parse(tokens);
  }

  it('should parse const volatile int declaration', () => {
    const ast = parse('const volatile int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isVolatile, true);
  });

  it('should parse volatile const int declaration', () => {
    const ast = parse('volatile const int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isVolatile, true);
  });

  it('should parse const volatile with unsigned', () => {
    const ast = parse('const volatile unsigned int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isVolatile, true);
    assert.strictEqual(decl.type.isSigned, false);
  });
});

describe('Storage Class - register', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    return parser.parse(tokens);
  }

  it('should parse register int declaration', () => {
    const ast = parse('register int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
    assert.strictEqual(decl.name.name, 'x');
  });

  it('should parse register in local declaration', () => {
    const ast = parse('int main() { register int i = 0; }');
    const func = ast.statements[0];
    const decl = func.body.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
  });

  it('should parse register with const qualifier', () => {
    const ast = parse('register const int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
    assert.strictEqual(decl.type.isConst, true);
  });

  it('should parse register with char type', () => {
    const ast = parse('register char c;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
    assert.strictEqual(decl.type.baseType, 'char');
  });

  it('should parse register with volatile qualifier', () => {
    const ast = parse('register volatile int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
    assert.strictEqual(decl.type.isVolatile, true);
  });

  it('should parse register pointer declaration', () => {
    const ast = parse('register int *p;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
    assert.strictEqual(decl.type.pointerDepth, 1);
  });
});

describe('Type Qualifiers - typeString', () => {
  it('should include const in typeString', () => {
    const type = new AST.TypeSpecNode('int', true, true, false, null, null);
    assert.strictEqual(type.typeString(), 'const int');
  });

  it('should include volatile in typeString', () => {
    const type = new AST.TypeSpecNode('int', true, false, true, null, null);
    assert.strictEqual(type.typeString(), 'volatile int');
  });

  it('should include const volatile in typeString', () => {
    const type = new AST.TypeSpecNode('int', true, true, true, null, null);
    assert.strictEqual(type.typeString(), 'const volatile int');
  });

  it('should include qualifiers with pointer depth', () => {
    const type = new AST.TypeSpecNode('int', true, true, false, null, null, 1);
    assert.strictEqual(type.typeString(), 'const int*');
  });
});

describe('Type Qualifiers - IR Translation', () => {
  it('should translate const variable to IR with qualifier', () => {
    const source = 'int main() { const int x = 5; return x; }';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.ok(ir.functions.length > 0);
    const func = ir.functions[0];
    assert.strictEqual(func.name, 'main');
    let foundStore = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'STORE' && instr.operands[0] === 'x') {
          foundStore = true;
        }
      }
    }
    assert.ok(foundStore, 'should store const variable x');
  });

  it('should translate volatile variable to IR with qualifier', () => {
    const source = 'int main() { volatile int x = 0; return x; }';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.ok(ir.functions.length > 0);
    const func = ir.functions[0];
    assert.strictEqual(func.name, 'main');
    let foundStore = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'STORE' && instr.operands[0] === 'x') {
          foundStore = true;
        }
      }
    }
    assert.ok(foundStore, 'should store volatile variable x');
  });

  it('should translate register variable to IR with storage class', () => {
    const source = 'int main() { register int i = 0; return i; }';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);

    const translator = new AstToIr();
    const ir = translator.translate(ast);

    assert.ok(ir.functions.length > 0);
    const func = ir.functions[0];
    assert.strictEqual(func.name, 'main');
    let foundStore = false;
    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'STORE' && instr.operands[0] === 'i') {
          foundStore = true;
        }
      }
    }
    assert.ok(foundStore, 'should store register variable i');
  });
});

describe('Type Qualifiers - Combined', () => {
  function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    return parser.parse(tokens);
  }

  it('should parse register const volatile int', () => {
    const ast = parse('register const volatile int x;');
    const decl = ast.statements[0];
    assert.strictEqual(decl.storageClass, 'register');
    assert.strictEqual(decl.type.isConst, true);
    assert.strictEqual(decl.type.isVolatile, true);
  });

  it('should parse const in function parameter', () => {
    const ast = parse('void foo(const int x) {}');
    const func = ast.statements[0];
    assert.strictEqual(func.parameters[0].type.isConst, true);
  });

  it('should parse volatile in function parameter', () => {
    const ast = parse('void foo(volatile int x) {}');
    const func = ast.statements[0];
    assert.strictEqual(func.parameters[0].type.isVolatile, true);
  });

  it('should parse register in function parameter', () => {
    const ast = parse('void foo(register int x) {}');
    const func = ast.statements[0];
    assert.strictEqual(func.parameters[0].storageClass, 'register');
  });
});
