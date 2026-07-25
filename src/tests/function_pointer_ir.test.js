import { describe, it } from 'mocha';
import assert from 'assert';
import { AstToIr } from '../../src/nanopass/ast_to_ir.js';
import * as AST from '../../src/ast/nodes.js';
import { CPegParser } from '../../src/parser/cparser.js';
import { Lexer } from '../../src/preprocessor/lexer.js';

describe('Function Pointer - IR Translation', () => {
  it('should translate address-of function to function pointer', () => {
    const source = `
      void myfunc() {}
      int main() {
        void (*fp)(void) = &myfunc;
        return 0;
      }
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    const translator = new AstToIr();
    const program = translator.translate(ast);
    
    assert.ok(program);
    assert.strictEqual(program.functions.length, 2);
    
    // Check that main function has function pointer store
    const mainFunc = program.getFunction('main');
    assert.ok(mainFunc);
    
    let foundLoadAddr = false;
    let foundAddrBinop = false;
    for (const block of mainFunc.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD_ADDR') {
          foundLoadAddr = true;
        }
        if (instr.opcode === 'BINOP' && instr.operands[1] === 'addr') {
          foundAddrBinop = true;
        }
      }
    }
    assert.ok(foundLoadAddr, 'Should generate LOAD_ADDR for function address');
    assert.ok(foundAddrBinop, 'Should generate BINOP addr for function pointer storage');
  });

  it('should translate function pointer call through pointer', () => {
    const source = `
      int myfunc(int x) { return x + 1; }
      int main() {
        int (*fp)(int) = myfunc;
        return fp(5);
      }
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    const translator = new AstToIr();
    const program = translator.translate(ast);
    
    assert.ok(program);
    
    // Check that main function has function pointer call
    const mainFunc = program.getFunction('main');
    assert.ok(mainFunc);
    
    let foundCallIndirect = false;
    for (const block of mainFunc.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'CALL_INDIRECT') {
          foundCallIndirect = true;
        }
      }
    }
    assert.ok(foundCallIndirect, 'Should generate CALL_INDIRECT instruction for function pointer call');
  });

  it('should translate storing function pointer to variable', () => {
    const source = `
      int helper(int x) { return x; }
      int main() {
        int (*fp)(int);
        fp = helper;
        return 0;
      }
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    const translator = new AstToIr();
    const program = translator.translate(ast);
    
    assert.ok(program);
    
    const mainFunc = program.getFunction('main');
    assert.ok(mainFunc);
    
    // Check for function pointer store pattern
    let foundFuncPtrStore = false;
    for (const block of mainFunc.blocks) {
      for (const instr of block.instructions) {
        // Look for LOAD_ADDR followed by BINOP addr (function pointer store pattern)
        if (instr.opcode === 'LOAD_ADDR' && instr.operands[0] === 'fp_addr') {
          foundFuncPtrStore = true;
        }
      }
    }
    assert.ok(foundFuncPtrStore, 'Should generate function pointer store pattern');
  });

  it('should translate loading function pointer from variable', () => {
    const source = `
      int helper(int x) { return x; }
      int main() {
        int (*fp)(int) = helper;
        return fp(10);
      }
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    const translator = new AstToIr();
    const program = translator.translate(ast);
    
    assert.ok(program);
    
    const mainFunc = program.getFunction('main');
    assert.ok(mainFunc);
    
    // Check that function pointer is properly loaded
    let foundLoadFuncPtr = false;
    for (const block of mainFunc.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD_ADDR' && instr.operands[1] === 'fp') {
          foundLoadFuncPtr = true;
        }
      }
    }
    assert.ok(foundLoadFuncPtr, 'Should load function pointer address from variable');
  });

  it('should handle function pointer parameter', () => {
    const source = `
      int helper(int x) { return x; }
      int caller(int (*fp)(int), int x) {
        return fp(x);
      }
      int main() {
        return caller(helper, 42);
      }
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    const translator = new AstToIr();
    const program = translator.translate(ast);
    
    assert.ok(program);
    assert.strictEqual(program.functions.length, 3);
    
    // Check caller function has function pointer parameter
    const callerFunc = program.getFunction('caller');
    assert.ok(callerFunc);
    assert.ok(callerFunc.metadata.parameters.includes('fp'));
  });

  it('should translate function pointer array element access', () => {
    const source = `
      int func1(int x) { return x; }
      int func2(int x) { return x + 1; }
      int main() {
        int (*fp[2])(int);
        fp[0] = func1;
        fp[1] = func2;
        return fp[0](5) + fp[1](10);
      }
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    
    const translator = new AstToIr();
    const program = translator.translate(ast);
    
    assert.ok(program);
    
    const mainFunc = program.getFunction('main');
    assert.ok(mainFunc);
    
    // Check that we have function pointer operations
    let hasFuncPtrOps = false;
    for (const block of mainFunc.blocks) {
      for (const instr of block.instructions) {
        if (instr.opcode === 'LOAD_ADDR' || (instr.opcode === 'CALL' && typeof instr.operands[0] === 'string')) {
          hasFuncPtrOps = true;
        }
      }
    }
    assert.ok(hasFuncPtrOps, 'Should have function pointer operations');
  });
});
