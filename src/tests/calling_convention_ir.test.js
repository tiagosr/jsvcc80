import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as IL from '../../src/nanopass/il.js';

describe('Calling Convention IR', () => {
  describe('Calling convention constants', () => {
    it('cdecl constant should be "cdecl"', () => {
      assert.strictEqual(IL.CALLING_CONVENTION_CDECL, 'cdecl');
    });

    it('fastcall constant should be "fastcall"', () => {
      assert.strictEqual(IL.CALLING_CONVENTION_FASTCALL, 'fastcall');
    });

    it('callee constant should be "callee"', () => {
      assert.strictEqual(IL.CALLING_CONVENTION_CALLEE, 'callee');
    });

    it('new_sdcc constant should be "new_sdcc"', () => {
      assert.strictEqual(IL.CALLING_CONVENTION_NEW_Sdcc, 'new_sdcc');
    });

    it('default constant should equal new_sdcc', () => {
      assert.strictEqual(IL.CALLING_CONVENTION_DEFAULT, IL.CALLING_CONVENTION_NEW_Sdcc);
    });
  });

  describe('FunctionIR callingConvention', () => {
    it('FunctionIR should have callingConvention field', () => {
      const funcIr = new IL.FunctionIR('test_func', [], {}, IL.CALLING_CONVENTION_CDECL);
      assert.strictEqual(funcIr.callingConvention, 'cdecl');
    });

    it('FunctionIR should default to new_sdcc when no convention specified', () => {
      const funcIr = new IL.FunctionIR('test_func', []);
      assert.strictEqual(funcIr.callingConvention, IL.CALLING_CONVENTION_NEW_Sdcc);
    });

    it('FunctionIR should support fastcall convention', () => {
      const funcIr = new IL.FunctionIR('fast_func', [], {}, IL.CALLING_CONVENTION_FASTCALL);
      assert.strictEqual(funcIr.callingConvention, 'fastcall');
    });

    it('FunctionIR should support callee convention', () => {
      const funcIr = new IL.FunctionIR('callee_func', [], {}, IL.CALLING_CONVENTION_CALLEE);
      assert.strictEqual(funcIr.callingConvention, 'callee');
    });

    it('FunctionIR should support new_sdcc convention', () => {
      const funcIr = new IL.FunctionIR('sdcc_func', [], {}, IL.CALLING_CONVENTION_NEW_Sdcc);
      assert.strictEqual(funcIr.callingConvention, 'new_sdcc');
    });

    it('FunctionIR toJSON should include callingConvention', () => {
      const funcIr = new IL.FunctionIR('test_func', [], {}, IL.CALLING_CONVENTION_FASTCALL);
      const json = funcIr.toJSON();
      assert.strictEqual(json.callingConvention, 'fastcall');
    });

    it('FunctionIR metadata should not contain callingConvention', () => {
      const funcIr = new IL.FunctionIR('test_func', [], { returnType: 'int' }, IL.CALLING_CONVENTION_CDECL);
      assert.strictEqual(funcIr.metadata.returnType, 'int');
      assert.strictEqual(funcIr.metadata.callingConvention, undefined);
    });
  });

  describe('CallInstruction callingConvention', () => {
    it('CallInstruction should have callingConvention field', () => {
      const callInstr = new IL.CallInstruction('test_func', ['arg0', 'arg1'], IL.CALLING_CONVENTION_CDECL);
      assert.strictEqual(callInstr.callingConvention, 'cdecl');
    });

    it('CallInstruction should default to new_sdcc when no convention specified', () => {
      const callInstr = new IL.CallInstruction('test_func', ['arg0']);
      assert.strictEqual(callInstr.callingConvention, IL.CALLING_CONVENTION_NEW_Sdcc);
    });

    it('CallInstruction should support fastcall convention', () => {
      const callInstr = new IL.CallInstruction('fast_func', ['arg0'], IL.CALLING_CONVENTION_FASTCALL);
      assert.strictEqual(callInstr.callingConvention, 'fastcall');
    });

    it('CallInstruction should support callee convention', () => {
      const callInstr = new IL.CallInstruction('callee_func', ['arg0'], IL.CALLING_CONVENTION_CALLEE);
      assert.strictEqual(callInstr.callingConvention, 'callee');
    });

    it('CallInstruction should support new_sdcc convention', () => {
      const callInstr = new IL.CallInstruction('sdcc_func', ['arg0'], IL.CALLING_CONVENTION_NEW_Sdcc);
      assert.strictEqual(callInstr.callingConvention, 'new_sdcc');
    });

    it('CallInstruction with no args should still have callingConvention', () => {
      const callInstr = new IL.CallInstruction('void_func', [], IL.CALLING_CONVENTION_FASTCALL);
      assert.strictEqual(callInstr.callingConvention, 'fastcall');
    });
  });

  describe('CallIndirectInstruction callingConvention', () => {
    it('CallIndirectInstruction should have callingConvention field', () => {
      const callInstr = new IL.CallIndirectInstruction('fp_var', ['arg0', 'arg1'], IL.CALLING_CONVENTION_CDECL);
      assert.strictEqual(callInstr.callingConvention, 'cdecl');
    });

    it('CallIndirectInstruction should default to new_sdcc when no convention specified', () => {
      const callInstr = new IL.CallIndirectInstruction('fp_var', ['arg0']);
      assert.strictEqual(callInstr.callingConvention, IL.CALLING_CONVENTION_NEW_Sdcc);
    });

    it('CallIndirectInstruction should support fastcall convention', () => {
      const callInstr = new IL.CallIndirectInstruction('fp_var', ['arg0'], IL.CALLING_CONVENTION_FASTCALL);
      assert.strictEqual(callInstr.callingConvention, 'fastcall');
    });

    it('CallIndirectInstruction should support callee convention', () => {
      const callInstr = new IL.CallIndirectInstruction('fp_var', ['arg0'], IL.CALLING_CONVENTION_CALLEE);
      assert.strictEqual(callInstr.callingConvention, 'callee');
    });

    it('CallIndirectInstruction should support new_sdcc convention', () => {
      const callInstr = new IL.CallIndirectInstruction('fp_var', ['arg0'], IL.CALLING_CONVENTION_NEW_Sdcc);
      assert.strictEqual(callInstr.callingConvention, 'new_sdcc');
    });

    it('CallIndirectInstruction with no args should still have callingConvention', () => {
      const callInstr = new IL.CallIndirectInstruction('fp_var', [], IL.CALLING_CONVENTION_FASTCALL);
      assert.strictEqual(callInstr.callingConvention, 'fastcall');
    });
  });

  describe('getFunctionCallingConvention helper', () => {
    it('should return function convention from program', () => {
      const funcIr = new IL.FunctionIR('test_func', [], {}, IL.CALLING_CONVENTION_FASTCALL);
      const program = new IL.ProgramIR([funcIr]);
      assert.strictEqual(IL.getFunctionCallingConvention(program, 'test_func'), 'fastcall');
    });

    it('should return new_sdcc when function not found', () => {
      const program = new IL.ProgramIR([]);
      assert.strictEqual(IL.getFunctionCallingConvention(program, 'nonexistent'), IL.CALLING_CONVENTION_NEW_Sdcc);
    });

    it('should return cdecl for function with cdecl convention', () => {
      const funcIr = new IL.FunctionIR('cdecl_func', [], {}, IL.CALLING_CONVENTION_CDECL);
      const program = new IL.ProgramIR([funcIr]);
      assert.strictEqual(IL.getFunctionCallingConvention(program, 'cdecl_func'), 'cdecl');
    });

    it('should return callee for function with callee convention', () => {
      const funcIr = new IL.FunctionIR('callee_func', [], {}, IL.CALLING_CONVENTION_CALLEE);
      const program = new IL.ProgramIR([funcIr]);
      assert.strictEqual(IL.getFunctionCallingConvention(program, 'callee_func'), 'callee');
    });
  });
});
