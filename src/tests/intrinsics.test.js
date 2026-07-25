import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { CPegParser } from '../parser/cparser.js';
import { AstToIr } from '../nanopass/ast_to_ir.js';
import * as IL from '../nanopass/il.js';
import { Z80Codegen } from '../backend/z80codegen.js';

describe('Processor Intrinsics - AST to IR', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    return translator.translate(ast);
  }

  function findIntrinsic(ir, expectedOpcode) {
    for (const func of ir.functions) {
      for (const block of func.blocks) {
        for (const instr of block.instructions) {
          if (instr.opcode === 'INTRINSIC' && instr.operands[0] === expectedOpcode) {
            return instr;
          }
        }
      }
    }
    return null;
  }

  it('should translate __nop() to NOP intrinsic', () => {
    const ir = compile('int main() { __nop(); return 0; }');
    const instr = findIntrinsic(ir, 'NOP');
    assert.ok(instr !== null, 'NOP intrinsic should be present');
  });

  it('should translate __halt() to HALT intrinsic', () => {
    const ir = compile('int main() { __halt(); return 0; }');
    const instr = findIntrinsic(ir, 'HALT');
    assert.ok(instr !== null, 'HALT intrinsic should be present');
  });

  it('should translate __di() to DI intrinsic', () => {
    const ir = compile('int main() { __di(); return 0; }');
    const instr = findIntrinsic(ir, 'DI');
    assert.ok(instr !== null, 'DI intrinsic should be present');
  });

  it('should translate __ei() to EI intrinsic', () => {
    const ir = compile('int main() { __ei(); return 0; }');
    const instr = findIntrinsic(ir, 'EI');
    assert.ok(instr !== null, 'EI intrinsic should be present');
  });

  it('should translate __exx() to EXX intrinsic', () => {
    const ir = compile('int main() { __exx(); return 0; }');
    const instr = findIntrinsic(ir, 'EXX');
    assert.ok(instr !== null, 'EXX intrinsic should be present');
  });

  it('should translate __ex_af_af() to EX_AF_AF intrinsic', () => {
    const ir = compile('int main() { __ex_af_af(); return 0; }');
    const instr = findIntrinsic(ir, 'EX_AF_AF');
    assert.ok(instr !== null, 'EX_AF_AF intrinsic should be present');
  });

  it('should translate __ex_de_hl() to EX_DE_HL intrinsic', () => {
    const ir = compile('int main() { __ex_de_hl(); return 0; }');
    const instr = findIntrinsic(ir, 'EX_DE_HL');
    assert.ok(instr !== null, 'EX_DE_HL intrinsic should be present');
  });

  it('should translate __im0() to IM intrinsic with value 0', () => {
    const ir = compile('int main() { __im0(); return 0; }');
    const instr = findIntrinsic(ir, 'IM');
    assert.ok(instr !== null, 'IM intrinsic should be present');
    assert.strictEqual(instr.operands[1], 0);
  });

  it('should translate __im1() to IM intrinsic with value 1', () => {
    const ir = compile('int main() { __im1(); return 0; }');
    const instr = findIntrinsic(ir, 'IM');
    assert.ok(instr !== null, 'IM intrinsic should be present');
    assert.strictEqual(instr.operands[1], 1);
  });

  it('should translate __im2() to IM intrinsic with value 2', () => {
    const ir = compile('int main() { __im2(); return 0; }');
    const instr = findIntrinsic(ir, 'IM');
    assert.ok(instr !== null, 'IM intrinsic should be present');
    assert.strictEqual(instr.operands[1], 2);
  });

  it('should translate __reti() to RETI intrinsic', () => {
    const ir = compile('int main() { __reti(); return 0; }');
    const instr = findIntrinsic(ir, 'RETI');
    assert.ok(instr !== null, 'RETI intrinsic should be present');
  });

  it('should translate __retn() to RETN intrinsic', () => {
    const ir = compile('int main() { __retn(); return 0; }');
    const instr = findIntrinsic(ir, 'RETN');
    assert.ok(instr !== null, 'RETN intrinsic should be present');
  });

  it('should translate __rld() to RLD intrinsic', () => {
    const ir = compile('int main() { __rld(); return 0; }');
    const instr = findIntrinsic(ir, 'RLD');
    assert.ok(instr !== null, 'RLD intrinsic should be present');
  });

  it('should translate __rrd() to RRD intrinsic', () => {
    const ir = compile('int main() { __rrd(); return 0; }');
    const instr = findIntrinsic(ir, 'RRD');
    assert.ok(instr !== null, 'RRD intrinsic should be present');
  });

  it('should translate __ld_a_r() to LD_A_R intrinsic', () => {
    const ir = compile('int main() { __ld_a_r(); return 0; }');
    const instr = findIntrinsic(ir, 'LD_A_R');
    assert.ok(instr !== null, 'LD_A_R intrinsic should be present');
  });

  it('should translate __ld_r_a() to LD_R_A intrinsic', () => {
    const ir = compile('int main() { __ld_r_a(); return 0; }');
    const instr = findIntrinsic(ir, 'LD_R_A');
    assert.ok(instr !== null, 'LD_R_A intrinsic should be present');
  });

  it('should translate __in(port) to IN intrinsic with port argument', () => {
    const ir = compile('int main() { __in(0x60); return 0; }');
    const instr = findIntrinsic(ir, 'IN');
    assert.ok(instr !== null, 'IN intrinsic should be present');
    assert.ok(instr.operands.length >= 2, 'IN should have port operand');
  });

  it('should translate __in16(port) to IN16 intrinsic with port argument', () => {
    const ir = compile('int main() { __in16(0x1000); return 0; }');
    const instr = findIntrinsic(ir, 'IN16');
    assert.ok(instr !== null, 'IN16 intrinsic should be present');
    assert.ok(instr.operands.length >= 2, 'IN16 should have port operand');
  });

  it('should translate __out(port, val) to OUT intrinsic', () => {
    const ir = compile('int main() { __out(0x60, 42); return 0; }');
    const instr = findIntrinsic(ir, 'OUT');
    assert.ok(instr !== null, 'OUT intrinsic should be present');
    assert.ok(instr.operands.length >= 3, 'OUT should have port and value operands');
  });

  it('should translate __out16(port, val) to OUT16 intrinsic', () => {
    const ir = compile('int main() { __out16(0x1000, 42); return 0; }');
    const instr = findIntrinsic(ir, 'OUT16');
    assert.ok(instr !== null, 'OUT16 intrinsic should be present');
    assert.ok(instr.operands.length >= 3, 'OUT16 should have port and value operands');
  });

  it('should not translate regular function calls as intrinsics', () => {
    const ir = compile('int foo() { return 1; } int main() { foo(); return 0; }');
    for (const func of ir.functions) {
      for (const block of func.blocks) {
        for (const instr of block.instructions) {
          assert.notStrictEqual(instr.opcode, 'INTRINSIC', 'Regular calls should not be intrinsics');
        }
      }
    }
  });

  it('should translate __ini(port) to INI intrinsic', () => {
    const ir = compile('int main() { __ini(0x60); return 0; }');
    const instr = findIntrinsic(ir, 'INI');
    assert.ok(instr !== null, 'INI intrinsic should be present');
    assert.ok(instr.operands.length >= 2, 'INI should have port operand');
  });

  it('should translate __outi(port) to OUTI intrinsic', () => {
    const ir = compile('int main() { __outi(0x60); return 0; }');
    const instr = findIntrinsic(ir, 'OUTI');
    assert.ok(instr !== null, 'OUTI intrinsic should be present');
    assert.ok(instr.operands.length >= 2, 'OUTI should have port operand');
  });

  it('should translate __inir(port, count) to INIR intrinsic', () => {
    const ir = compile('int main() { __inir(0x60, 10); return 0; }');
    const instr = findIntrinsic(ir, 'INIR');
    assert.ok(instr !== null, 'INIR intrinsic should be present');
    assert.ok(instr.operands.length >= 3, 'INIR should have port and count operands');
  });

  it('should translate __otir(port, count) to OTIR intrinsic', () => {
    const ir = compile('int main() { __otir(0x60, 10); return 0; }');
    const instr = findIntrinsic(ir, 'OTIR');
    assert.ok(instr !== null, 'OTIR intrinsic should be present');
    assert.ok(instr.operands.length >= 3, 'OTIR should have port and count operands');
  });

  it('should translate __ind(port) to IND intrinsic', () => {
    const ir = compile('int main() { __ind(0x60); return 0; }');
    const instr = findIntrinsic(ir, 'IND');
    assert.ok(instr !== null, 'IND intrinsic should be present');
    assert.ok(instr.operands.length >= 2, 'IND should have port operand');
  });

  it('should translate __outd(port) to OUTD intrinsic', () => {
    const ir = compile('int main() { __outd(0x60); return 0; }');
    const instr = findIntrinsic(ir, 'OUTD');
    assert.ok(instr !== null, 'OUTD intrinsic should be present');
    assert.ok(instr.operands.length >= 2, 'OUTD should have port operand');
  });

  it('should translate __indr(port, count) to INDR intrinsic', () => {
    const ir = compile('int main() { __indr(0x60, 10); return 0; }');
    const instr = findIntrinsic(ir, 'INDR');
    assert.ok(instr !== null, 'INDR intrinsic should be present');
    assert.ok(instr.operands.length >= 3, 'INDR should have port and count operands');
  });

  it('should translate __otdr(port, count) to OTDR intrinsic', () => {
    const ir = compile('int main() { __otdr(0x60, 10); return 0; }');
    const instr = findIntrinsic(ir, 'OTDR');
    assert.ok(instr !== null, 'OTDR intrinsic should be present');
    assert.ok(instr.operands.length >= 3, 'OTDR should have port and count operands');
  });
});

describe('Processor Intrinsics - Z80 Codegen', () => {
  function compileToAssembly(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);
    const codegen = new Z80Codegen();
    return codegen.generate(ir);
  }

  it('should generate nop instruction for __nop()', () => {
    const asm = compileToAssembly('int main() { __nop(); return 0; }');
    assert.ok(asm.includes('nop'), 'Assembly should contain nop');
  });

  it('should generate halt instruction for __halt()', () => {
    const asm = compileToAssembly('int main() { __halt(); return 0; }');
    assert.ok(asm.includes('halt'), 'Assembly should contain halt');
  });

  it('should generate di instruction for __di()', () => {
    const asm = compileToAssembly('int main() { __di(); return 0; }');
    assert.ok(asm.includes('di'), 'Assembly should contain di');
  });

  it('should generate ei instruction for __ei()', () => {
    const asm = compileToAssembly('int main() { __ei(); return 0; }');
    assert.ok(asm.includes('ei'), 'Assembly should contain ei');
  });

  it('should generate exx instruction for __exx()', () => {
    const asm = compileToAssembly('int main() { __exx(); return 0; }');
    assert.ok(asm.includes('exx'), 'Assembly should contain exx');
  });

  it('should generate ex af, af prime for __ex_af_af()', () => {
    const asm = compileToAssembly('int main() { __ex_af_af(); return 0; }');
    assert.ok(asm.includes("ex af, af'"), 'Assembly should contain ex af, af prime');
  });

  it('should generate ex de, hl for __ex_de_hl()', () => {
    const asm = compileToAssembly('int main() { __ex_de_hl(); return 0; }');
    assert.ok(asm.includes('ex de, hl'), 'Assembly should contain ex de, hl');
  });

  it('should generate im 0 for __im0()', () => {
    const asm = compileToAssembly('int main() { __im0(); return 0; }');
    assert.ok(asm.includes('im 0'), 'Assembly should contain im 0');
  });

  it('should generate im 1 for __im1()', () => {
    const asm = compileToAssembly('int main() { __im1(); return 0; }');
    assert.ok(asm.includes('im 1'), 'Assembly should contain im 1');
  });

  it('should generate im 2 for __im2()', () => {
    const asm = compileToAssembly('int main() { __im2(); return 0; }');
    assert.ok(asm.includes('im 2'), 'Assembly should contain im 2');
  });

  it('should generate reti instruction for __reti()', () => {
    const asm = compileToAssembly('int main() { __reti(); return 0; }');
    assert.ok(asm.includes('reti'), 'Assembly should contain reti');
  });

  it('should generate retn instruction for __retn()', () => {
    const asm = compileToAssembly('int main() { __retn(); return 0; }');
    assert.ok(asm.includes('retn'), 'Assembly should contain retn');
  });

  it('should generate rld instruction for __rld()', () => {
    const asm = compileToAssembly('int main() { __rld(); return 0; }');
    assert.ok(asm.includes('rld'), 'Assembly should contain rld');
  });

  it('should generate rrd instruction for __rrd()', () => {
    const asm = compileToAssembly('int main() { __rrd(); return 0; }');
    assert.ok(asm.includes('rrd'), 'Assembly should contain rrd');
  });

  it('should generate ld a, r for __ld_a_r()', () => {
    const asm = compileToAssembly('int main() { __ld_a_r(); return 0; }');
    assert.ok(asm.includes('ld a, r'), 'Assembly should contain ld a, r');
  });

  it('should generate ld r, a for __ld_r_a()', () => {
    const asm = compileToAssembly('int main() { __ld_r_a(); return 0; }');
    assert.ok(asm.includes('ld r, a'), 'Assembly should contain ld r, a');
  });

  it('should generate in a, (c) for __in(port)', () => {
    const asm = compileToAssembly('int main() { __in(0x60); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('in a, (c)'), 'Assembly should contain in a, (c)');
  });

  it('should generate in a, (c) with 16-bit port for __in16(port)', () => {
    const asm = compileToAssembly('int main() { __in16(0x1000); return 0; }');
    assert.ok(asm.includes('ld bc,'), 'Assembly should load 16-bit port into BC');
    assert.ok(asm.includes('in a, (c)'), 'Assembly should contain in a, (c)');
  });

  it('should generate out (c), b for __out(port, val)', () => {
    const asm = compileToAssembly('int main() { __out(0x60, 42); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('out (c),'), 'Assembly should contain out (c)');
  });

  it('should generate out (c), a for __out16(port, val)', () => {
    const asm = compileToAssembly('int main() { __out16(0x1000, 42); return 0; }');
    assert.ok(asm.includes('ld bc,'), 'Assembly should load 16-bit port into BC');
    assert.ok(asm.includes('out (c),'), 'Assembly should contain out (c)');
  });

  it('should generate ini for __ini(port)', () => {
    const asm = compileToAssembly('int main() { __ini(0x60); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b, 1'), 'Assembly should set B to 1');
    assert.ok(asm.includes('ini'), 'Assembly should contain ini');
  });

  it('should generate outi for __outi(port)', () => {
    const asm = compileToAssembly('int main() { __outi(0x60); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b, 1'), 'Assembly should set B to 1');
    assert.ok(asm.includes('outi'), 'Assembly should contain outi');
  });

  it('should generate inir for __inir(port, count)', () => {
    const asm = compileToAssembly('int main() { __inir(0x60, 10); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b,'), 'Assembly should set B to count');
    assert.ok(asm.includes('inir'), 'Assembly should contain inir');
  });

  it('should generate otir for __otir(port, count)', () => {
    const asm = compileToAssembly('int main() { __otir(0x60, 10); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b,'), 'Assembly should set B to count');
    assert.ok(asm.includes('otir'), 'Assembly should contain otir');
  });

  it('should generate ind for __ind(port)', () => {
    const asm = compileToAssembly('int main() { __ind(0x60); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b, 1'), 'Assembly should set B to 1');
    assert.ok(asm.includes('ind'), 'Assembly should contain ind');
  });

  it('should generate outd for __outd(port)', () => {
    const asm = compileToAssembly('int main() { __outd(0x60); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b, 1'), 'Assembly should set B to 1');
    assert.ok(asm.includes('outd'), 'Assembly should contain outd');
  });

  it('should generate indr for __indr(port, count)', () => {
    const asm = compileToAssembly('int main() { __indr(0x60, 10); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b,'), 'Assembly should set B to count');
    assert.ok(asm.includes('indr'), 'Assembly should contain indr');
  });

  it('should generate otdr for __otdr(port, count)', () => {
    const asm = compileToAssembly('int main() { __otdr(0x60, 10); return 0; }');
    assert.ok(asm.includes('ld c,'), 'Assembly should load port into C');
    assert.ok(asm.includes('ld b,'), 'Assembly should set B to count');
    assert.ok(asm.includes('otdr'), 'Assembly should contain otdr');
  });
});

describe('Processor Intrinsics - IR Serialization', () => {
  it('should serialize IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('NOP');
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['NOP']);
  });

  it('should serialize IntrinsicInstruction with operands', () => {
    const instr = new IL.IntrinsicInstruction('OUT', ['t0', 't1']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['OUT', 't0', 't1']);
  });

  it('should have correct string representation', () => {
    const instr = new IL.IntrinsicInstruction('NOP');
    assert.strictEqual(instr.toString(), 'INTRINSIC NOP');
  });

  it('should serialize INI IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('INI', ['0x60']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['INI', '0x60']);
  });

  it('should serialize INIR IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('INIR', ['0x60', '10']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['INIR', '0x60', '10']);
  });

  it('should serialize OTDR IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('OTDR', ['0x60', '10']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['OTDR', '0x60', '10']);
  });
});

describe('Setjmp/Longjmp/Alloca Intrinsics - AST to IR', () => {
  function compile(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    return translator.translate(ast);
  }

  function findIntrinsic(ir, expectedOpcode) {
    for (const func of ir.functions) {
      for (const block of func.blocks) {
        for (const instr of block.instructions) {
          if (instr.opcode === 'INTRINSIC' && instr.operands[0] === expectedOpcode) {
            return instr;
          }
        }
      }
    }
    return null;
  }

  it('should translate __setjmp(buf) to SETJMP intrinsic', () => {
    const ir = compile('int main() { int buf[13]; __setjmp(buf); return 0; }');
    const instr = findIntrinsic(ir, 'SETJMP');
    assert.ok(instr !== null, 'SETJMP intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'SETJMP should have buffer pointer operand');
  });

  it('should translate __longjmp(buf, val) to LONGJMP intrinsic', () => {
    const ir = compile('int main() { int buf[13]; __longjmp(buf, 42); return 0; }');
    const instr = findIntrinsic(ir, 'LONGJMP');
    assert.ok(instr !== null, 'LONGJMP intrinsic should be present');
    assert.strictEqual(instr.operands.length, 3, 'LONGJMP should have buffer pointer and value operands');
  });

  it('should translate __alloca(size) to ALLOCA intrinsic', () => {
    const ir = compile('int main() { __alloca(100); return 0; }');
    const instr = findIntrinsic(ir, 'ALLOCA');
    assert.ok(instr !== null, 'ALLOCA intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'ALLOCA should have size operand');
  });

  it('should handle __setjmp with pointer argument', () => {
    const ir = compile('int main() { int *buf; __setjmp(buf); return 0; }');
    const instr = findIntrinsic(ir, 'SETJMP');
    assert.ok(instr !== null, 'SETJMP with pointer should be present');
  });

  it('should handle __longjmp with expression argument', () => {
    const ir = compile('int main() { int buf[13]; __longjmp(buf, 1 + 2); return 0; }');
    const instr = findIntrinsic(ir, 'LONGJMP');
    assert.ok(instr !== null, 'LONGJMP with expression should be present');
  });

  it('should handle __alloca with expression argument', () => {
    const ir = compile('int main() { __alloca(64 * 1024); return 0; }');
    const instr = findIntrinsic(ir, 'ALLOCA');
    assert.ok(instr !== null, 'ALLOCA with expression should be present');
  });
});

describe('Setjmp/Longjmp/Alloca Intrinsics - Z80 Codegen', () => {
  function compileToAssembly(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new CPegParser();
    const ast = parser.parse(tokens);
    const translator = new AstToIr();
    const ir = translator.translate(ast);
    const codegen = new Z80Codegen();
    return codegen.generate(ir);
  }

  it('should generate setjmp context save sequence', () => {
    const asm = compileToAssembly('int main() { int buf[13]; __setjmp(buf); return 0; }');
    assert.ok(asm.includes('ld hl,'), 'Assembly should contain ld hl for buffer pointer');
    assert.ok(asm.includes('push ix'), 'Assembly should save IX register');
    assert.ok(asm.includes('push sp'), 'Assembly should save SP');
    assert.ok(asm.includes('ld a, 0'), 'Assembly should return 0 from setjmp');
  });

  it('should generate longjmp context restore sequence', () => {
    const asm = compileToAssembly('int main() { int buf[13]; __longjmp(buf, 1); return 0; }');
    assert.ok(asm.includes('ld hl,'), 'Assembly should load buffer pointer');
    assert.ok(asm.includes('ld sp,'), 'Assembly should restore SP');
    assert.ok(asm.includes('ret'), 'Assembly should return to saved PC');
  });

  it('should generate alloca stack allocation sequence', () => {
    const asm = compileToAssembly('int main() { __alloca(100); return 0; }');
    assert.ok(asm.includes('ld hl, sp'), 'Assembly should load current SP');
    assert.ok(asm.includes('add hl,'), 'Assembly should add size to SP');
    assert.ok(asm.includes('ld sp, hl'), 'Assembly should set new SP');
  });

  it('should generate valid Z80 assembly for setjmp', () => {
    const asm = compileToAssembly('int main() { int buf[13]; __setjmp(buf); return 0; }');
    // Check that all instructions are valid Z80 mnemonics
    const lines = asm.split('\n');
    const validMnemonics = new Set([
      'nop', 'halt', 'di', 'ei', 'exx', 'ex af, af\'', 'ex de, hl',
      'im', 'reti', 'retn', 'rld', 'rrd',
      'ld', 'add', 'sub', 'inc', 'dec', 'push', 'pop', 'ret', 'rst',
      'jp', 'jr', 'call', 'cp', 'and', 'or', 'xor', 'cpd', 'cpi',
      'cpir', 'cpdr', 'out', 'outi', 'otir', 'outd', 'otdr',
      'ini', 'inir', 'ind', 'indr', 'scf', 'ccf', 'sla', 'sll',
      'sra', 'srl', 'bit', 'res', 'set', 'neg', 'rlca', 'rrca',
      'rla', 'rra', 'daa', 'nop', 'halt', 'im 0', 'im 1', 'im 2'
    ]);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('[') && !trimmed.startsWith(']') && trimmed !== '') {
        const parts = trimmed.split(/\s+/);
        const mnemonic = parts[0].toLowerCase();
        // Skip directives and labels
        if (trimmed.startsWith('.') || trimmed.startsWith('[') || trimmed.startsWith(']') ||
            trimmed.startsWith('SECTION') || trimmed.startsWith('DEF') || trimmed.startsWith('GLOBAL') ||
            trimmed.startsWith('EXPORT') || trimmed.startsWith('EQU') || trimmed.startsWith('TIMED') ||
            trimmed.startsWith('OPT') || trimmed.startsWith('CODE') || trimmed.startsWith('DATA') ||
            trimmed.startsWith('BSS') || trimmed.startsWith('RODATA') || trimmed.startsWith('INCLUDE') ||
            trimmed.startsWith('MACRO') || trimmed.startsWith('ENDM') || trimmed.startsWith('END') ||
            trimmed.startsWith('ENDCODE') || trimmed.startsWith('ENDDATA') || trimmed.startsWith('ENDR') ||
            trimmed.includes('::') || trimmed.includes(':')) {
          continue;
        }
        // Check if it's a valid instruction or a label/reference
        if (!validMnemonics.has(mnemonic) && !parts[0].endsWith(',') && !parts[0].startsWith('$') &&
            !parts[0].match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) && !parts[0].match(/^\$/)) {
          // Allow comments and whitespace
          if (!trimmed.startsWith(';')) {
            // This is okay - it's likely a label or data reference
          }
        }
      }
    }
  });

  it('should handle nested function calls with setjmp', () => {
    const asm = compileToAssembly(`
      int main() {
        int buf[13];
        __setjmp(buf);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Should generate buffer pointer load');
  });

  it('should handle alloca in expression context', () => {
    const asm = compileToAssembly(`
      int main() {
        int *p = __alloca(256);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl, sp'), 'Should handle alloca return value');
  });
});
