import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as AST from '../../src/ast/nodes.js';

describe('Function Pointers - Type System', () => {
  it('TypeSpecNode should track function pointer type', () => {
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    const params = [new AST.ParameterNode(new AST.TypeSpecNode('int', true), 'a')];
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,  // isFunctionPointer
      returnType,
      params
    );
    
    assert.strictEqual(funcPtrType.isFunctionPointer, true);
    assert.strictEqual(funcPtrType.pointerDepth, 1);
    assert.strictEqual(funcPtrType.getSize(), 2);
  });

  it('TypeSpecNode function pointer typeString should format correctly', () => {
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    const paramType = new AST.TypeSpecNode('char', true, false, false);
    const params = [new AST.ParameterNode(paramType, 'c')];
    
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      params
    );
    
    const typeStr = funcPtrType.typeString();
    assert.ok(typeStr.includes('(*)'));
    assert.ok(typeStr.includes('('));
  });

  it('TypeSpecNode void function pointer typeString', () => {
    const returnType = new AST.TypeSpecNode('void', true, false, false);
    
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      []
    );
    
    const typeStr = funcPtrType.typeString();
    assert.ok(typeStr.includes('(*)'));
  });

  it('Element size for function pointers should be 2 bytes', () => {
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      []
    );
    
    assert.strictEqual(funcPtrType.getElementSize(), 2);
  });

  it('Function pointer type should have isFunctionPointer flag', () => {
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      null,
      []
    );
    
    assert.strictEqual(funcPtrType.isFunctionPointer, true);
  });

  it('Regular pointer should not have isFunctionPointer flag', () => {
    const ptrType = new AST.TypeSpecNode(
      'int',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      false,
      null,
      []
    );
    
    assert.strictEqual(ptrType.isFunctionPointer, false);
  });

  it('Function pointer with multiple parameters', () => {
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    const params = [
      new AST.ParameterNode(new AST.TypeSpecNode('int', true), 'a'),
      new AST.ParameterNode(new AST.TypeSpecNode('char', true), 'b')
    ];
    
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      params
    );
    
    assert.strictEqual(funcPtrType.functionParams.length, 2);
    assert.strictEqual(funcPtrType.getSize(), 2);
  });

  it('Function pointer typeString with parameters', () => {
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    const param1 = new AST.ParameterNode(new AST.TypeSpecNode('int', true), 'x');
    const param2 = new AST.ParameterNode(new AST.TypeSpecNode('char', true), 'y');
    
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      [param1, param2]
    );
    
    const typeStr = funcPtrType.typeString();
    assert.ok(typeStr.includes('int'));
    assert.ok(typeStr.includes('char'));
  });

  it('Function pointer with no parameters', () => {
    const returnType = new AST.TypeSpecNode('void', true, false, false);
    
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      []
    );
    
    const typeStr = funcPtrType.typeString();
    assert.ok(typeStr.includes('(*)'));
  });

  it('Function pointer should have correct getSize behavior', () => {
    // Function pointers are always 2 bytes (16-bit addresses) regardless of signature
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    
    const funcPtrType1 = new AST.TypeSpecNode(
      'function', true, false, false, null, null, 1, false, null, null, null, true,
      returnType, []
    );
    
    const funcPtrType2 = new AST.TypeSpecNode(
      'function', true, false, false, null, null, 1, false, null, null, null, true,
      returnType, [new AST.ParameterNode(new AST.TypeSpecNode('int'), 'a')]
    );
    
    const funcPtrType3 = new AST.TypeSpecNode(
      'function', true, false, false, null, null, 1, false, null, null, null, true,
      returnType, [
        new AST.ParameterNode(new AST.TypeSpecNode('int'), 'a'),
        new AST.ParameterNode(new AST.TypeSpecNode('char'), 'b')
      ]
    );
    
    assert.strictEqual(funcPtrType1.getSize(), 2);
    assert.strictEqual(funcPtrType2.getSize(), 2);
    assert.strictEqual(funcPtrType3.getSize(), 2);
  });

  it('Function pointer getElementSize should return 2', () => {
    const returnType = new AST.TypeSpecNode('int', true, false, false);
    
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      returnType,
      []
    );
    
    assert.strictEqual(funcPtrType.getElementSize(), 2);
  });

  it('Function pointer typeString with const qualifier', () => {
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      true,  // isConst
      false,
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      null,
      []
    );
    
    const typeStr = funcPtrType.typeString();
    assert.ok(typeStr.startsWith('const'));
  });

  it('Function pointer typeString with volatile qualifier', () => {
    const funcPtrType = new AST.TypeSpecNode(
      'function',
      true,
      false,
      true,  // isVolatile
      null,
      null,
      1,
      false,
      null,
      null,
      null,
      true,
      null,
      []
    );
    
    const typeStr = funcPtrType.typeString();
    assert.ok(typeStr.startsWith('volatile'));
  });
});
