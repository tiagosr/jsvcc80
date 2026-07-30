import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';
import { Z80Codegen } from '../../src/backend/z80codegen.js';
import { TranslationContext } from '../../src/nanopass/translation-context.js';

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

function getGlobalData(assembly) {
  const match = assembly.match(/; Global Data Section\n([\s\S]*?)(?=\n\n; Function:)/);
  return match ? match[1].trim() : '';
}

function getFunctionBody(assembly, funcName) {
  const lines = assembly.split('\n');
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === `; Function: ${funcName}`) start = i + 1;
    if (i > start && lines[i] === `; Function:` && end === -1) end = i;
  }
  if (end === -1) end = lines.length;
  if (start === -1) return '';
  return lines.slice(start, end).join('\n').trim();
}

describe('array initializer lists - parser', () => {
  it('should parse global int array with literal initializers', () => {
    const lexer = new Lexer('int arr[3] = {1, 2, 3}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.kind, 'var');
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 3);
    assert.strictEqual(decl.init.elements[0].value, 1);
    assert.strictEqual(decl.init.elements[1].value, 2);
    assert.strictEqual(decl.init.elements[2].value, 3);
  });

  it('should parse global char array with literal initializers', () => {
    const lexer = new Lexer('char str[4] = {65, 66, 67, 0}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 4);
    assert.strictEqual(decl.init.elements[0].value, 65);
    assert.strictEqual(decl.init.elements[3].value, 0);
  });

  it('should parse local int array with literal initializers', () => {
    const lexer = new Lexer('int main() { int arr[3] = {10, 20, 30}; return arr[0]; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const func = ast.statements[0];
    const decl = func.body.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 3);
    assert.strictEqual(decl.init.elements[0].value, 10);
  });

  it('should parse array with expression initializers', () => {
    const lexer = new Lexer('int main() { int a = 1; int b = 2; int arr[2] = {a + b, a - b}; return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const func = ast.statements[0];
    const decl = func.body.statements[2];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 2);
    assert.strictEqual(decl.init.elements[0].type, 'BinaryOp');
    assert.strictEqual(decl.init.elements[1].type, 'BinaryOp');
  });

  it('should parse partial initialization', () => {
    const lexer = new Lexer('int arr[5] = {1, 2}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 2);
  });

  it('should parse single element initializer', () => {
    const lexer = new Lexer('int arr[3] = {42}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 1);
    assert.strictEqual(decl.init.elements[0].value, 42);
  });

  it('should parse empty initializer', () => {
    const lexer = new Lexer('int arr[3] = {}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 0);
  });

  it('should parse nested initializer for struct', () => {
    const lexer = new Lexer('struct Point { int x; int y; }; struct Point p = {1, 2}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[1];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 2);
  });

  it('should parse long array initializer', () => {
    const lexer = new Lexer('long arr[2] = {1000, 2000}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 2);
    assert.strictEqual(decl.type.baseType, 'long');
  });

  it('should parse float array initializer', () => {
    const lexer = new Lexer('float arr[2] = {1.5, 2.5}; int main() { return 0; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 2);
    assert.strictEqual(decl.init.elements[0].type, 'float');
    assert.strictEqual(decl.init.elements[0].value, 1.5);
  });

  it('should parse large array initializer', () => {
    const lexer = new Lexer('int arr[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}; int main() { return arr[9]; }');
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const decl = ast.statements[0];
    assert.strictEqual(decl.init.type, 'Initializer');
    assert.strictEqual(decl.init.elements.length, 10);
    assert.strictEqual(decl.init.elements[9].value, 9);
  });
});

describe('array initializer lists - global codegen', () => {
  it('should emit .dw for int array initializer', () => {
    const assembly = compile('int arr[3] = {1, 2, 3}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('arr: .dw 1, 2, 3'));
  });

  it('should emit .db for char array initializer', () => {
    const assembly = compile('char str[4] = {65, 66, 67, 0}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('str: .db 65, 66, 67, 0'));
  });

  it('should emit .dw for partial global initializer', () => {
    const assembly = compile('int arr[5] = {1, 2}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('arr: .dw 1, 2'));
  });

  it('should emit .dw for single element global initializer', () => {
    const assembly = compile('int arr[3] = {42}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('arr: .dw 42'));
  });

  it('should emit .dw for empty global initializer', () => {
    const assembly = compile('int arr[3] = {}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('arr: .dw'));
  });

  it('should emit .dd for long array initializer', () => {
    const assembly = compile('long arr[2] = {1000, 2000}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('arr: .dd 1000, 2000'));
  });

  it('should emit .dw for large array initializer', () => {
    const assembly = compile('int arr[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}; int main() { return 0; }');
    const globalData = getGlobalData(assembly);
    assert.ok(globalData.includes('arr: .dw 0, 1, 2, 3, 4, 5, 6, 7, 8, 9'));
  });
});

describe('array initializer lists - local codegen', () => {
  it('should store each element for local int array', () => {
    const assembly = compile('int main() { int arr[3] = {1, 2, 3}; return arr[0]; }');
    const body = getFunctionBody(assembly, 'main');
    assert.ok(body.includes('ld hl, 1'));
    assert.ok(body.includes('ld (arr), hl'));
    assert.ok(body.includes('ld hl, 2'));
    assert.ok(body.includes('ld hl, 3'));
  });

  it('should store each element for local char array', () => {
    const assembly = compile('int main() { char str[3] = {65, 66, 67}; return str[0]; }');
    const body = getFunctionBody(assembly, 'main');
    assert.ok(body.includes('ld hl, 65'));
    assert.ok(body.includes('ld (str), hl'));
  });

  it('should handle expression initializers locally', () => {
    const assembly = compile('int main() { int a = 10; int b = 20; int arr[2] = {a + b, a - b}; return arr[0]; }');
    const body = getFunctionBody(assembly, 'main');
    assert.ok(body.includes('add'));
    assert.ok(body.includes('sub'));
    assert.ok(body.includes('ld (arr), hl'));
  });

  it('should handle partial local initialization', () => {
    const assembly = compile('int main() { int arr[5] = {1, 2}; return 0; }');
    const body = getFunctionBody(assembly, 'main');
    assert.ok(body.includes('ld hl, 1'));
    assert.ok(body.includes('ld hl, 2'));
    assert.ok(body.includes('ld (arr), hl'));
  });
});
