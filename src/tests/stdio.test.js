import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer } from '../preprocessor/lexer.js';
import { CPegParser } from '../parser/cparser.js';
import { AstToIr } from '../nanopass/ast_to_ir.js';
import * as IL from '../nanopass/il.js';
import { Z80Codegen } from '../backend/z80codegen.js';
import { TypeRegistry } from '../nanopass/type-registry.js';

describe('Stdio Intrinsics - FILE Struct Type', () => {
  it('should register FILE struct in type registry', () => {
    const registry = new TypeRegistry();
    assert.ok(registry.structRegistry.has('FILE'), 'FILE struct should be registered');
  });

  it('should have correct FILE struct size', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.size, 8, 'FILE struct should be 8 bytes');
  });

  it('should have correct FILE struct field offsets', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fieldOffsets.get('buffer'), 0, 'buffer offset should be 0');
    assert.strictEqual(fileDef.fieldOffsets.get('bufSize'), 2, 'bufSize offset should be 2');
    assert.strictEqual(fileDef.fieldOffsets.get('bufPos'), 4, 'bufPos offset should be 4');
    assert.strictEqual(fileDef.fieldOffsets.get('flags'), 6, 'flags offset should be 6');
  });

  it('should have correct FILE struct field count', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fields.length, 4, 'FILE struct should have 4 fields');
  });

  it('should have correct FILE struct field names', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    const fieldNames = fileDef.fields.map(f => f.name.name);
    assert.deepStrictEqual(fieldNames, ['buffer', 'bufSize', 'bufPos', 'flags']);
  });
});

describe('Stdio Intrinsics - AST to IR', () => {
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

  it('should translate __fputc(char, stream) to FPUTC intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        __fputc(65, &stream);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'FPUTC');
    assert.ok(instr !== null, 'FPUTC intrinsic should be present');
    assert.strictEqual(instr.operands.length, 3, 'FPUTC should have char and file pointer operands');
  });

  it('should translate __fgetc(stream) to FGETC intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        int c = __fgetc(&stream);
        return c;
      }
    `);
    const instr = findIntrinsic(ir, 'FGETC');
    assert.ok(instr !== null, 'FGETC intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'FGETC should have file pointer operand');
  });

  it('should translate __feof(stream) to FEOF intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        int eof = __feof(&stream);
        return eof;
      }
    `);
    const instr = findIntrinsic(ir, 'FEOF');
    assert.ok(instr !== null, 'FEOF intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'FEOF should have file pointer operand');
  });

  it('should translate __ferror(stream) to FERROR intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        int err = __ferror(&stream);
        return err;
      }
    `);
    const instr = findIntrinsic(ir, 'FERROR');
    assert.ok(instr !== null, 'FERROR intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'FERROR should have file pointer operand');
  });

  it('should translate __fopen(name, mode) to FOPEN intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *stream = __fopen("test.txt", "r");
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'FOPEN');
    assert.ok(instr !== null, 'FOPEN intrinsic should be present');
    assert.strictEqual(instr.operands.length, 3, 'FOPEN should have name and mode pointer operands');
  });

  it('should translate __fclose(stream) to FCLOSE intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *stream;
        __fclose(stream);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'FCLOSE');
    assert.ok(instr !== null, 'FCLOSE intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'FCLOSE should have file pointer operand');
  });

  it('should handle __fputc with variable char argument', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        int c = 65;
        __fputc(c, &stream);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'FPUTC');
    assert.ok(instr !== null, 'FPUTC with variable char should be present');
  });

  it('should handle __fgetc with pointer variable', () => {
    const ir = compile(`
      int main() {
        FILE *stream;
        int c = __fgetc(stream);
        return c;
      }
    `);
    const instr = findIntrinsic(ir, 'FGETC');
    assert.ok(instr !== null, 'FGETC with pointer variable should be present');
  });

  it('should handle __feof with pointer variable', () => {
    const ir = compile(`
      int main() {
        FILE *stream;
        int eof = __feof(stream);
        return eof;
      }
    `);
    const instr = findIntrinsic(ir, 'FEOF');
    assert.ok(instr !== null, 'FEOF with pointer variable should be present');
  });

  it('should handle __ferror with pointer variable', () => {
    const ir = compile(`
      int main() {
        FILE *stream;
        int err = __ferror(stream);
        return err;
      }
    `);
    const instr = findIntrinsic(ir, 'FERROR');
    assert.ok(instr !== null, 'FERROR with pointer variable should be present');
  });

  it('should handle __fopen with string literals', () => {
    const ir = compile(`
      int main() {
        FILE *stream = __fopen("hello", "w");
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'FOPEN');
    assert.ok(instr !== null, 'FOPEN with string literals should be present');
  });

  it('should handle __fclose with pointer from __fopen', () => {
    const ir = compile(`
      int main() {
        FILE *stream = __fopen("test", "r");
        __fclose(stream);
        return 0;
      }
    `);
    const fopenInstr = findIntrinsic(ir, 'FOPEN');
    const fcloseInstr = findIntrinsic(ir, 'FCLOSE');
    assert.ok(fopenInstr !== null, 'FOPEN should be present');
    assert.ok(fcloseInstr !== null, 'FCLOSE should be present');
  });

  it('should compile a loop using __fgetc', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        int c;
        while ((c = __fgetc(&stream)) != 0) {
          __fputc(c, &stream);
        }
        return 0;
      }
    `);
    const fgetcInstr = findIntrinsic(ir, 'FGETC');
    const fputcInstr = findIntrinsic(ir, 'FPUTC');
    assert.ok(fgetcInstr !== null, 'FGETC in loop should be present');
    assert.ok(fputcInstr !== null, 'FPUTC in loop should be present');
  });

  it('should compile feof check in loop', () => {
    const ir = compile(`
      int main() {
        FILE stream;
        while (!__feof(&stream)) {
          __fputc(__fgetc(&stream), &stream);
        }
        return 0;
      }
    `);
    const feofInstr = findIntrinsic(ir, 'FEOF');
    const fgetcInstr = findIntrinsic(ir, 'FGETC');
    const fputcInstr = findIntrinsic(ir, 'FPUTC');
    assert.ok(feofInstr !== null, 'FEOF in loop should be present');
    assert.ok(fgetcInstr !== null, 'FGETC in loop should be present');
    assert.ok(fputcInstr !== null, 'FPUTC in loop should be present');
  });
});

describe('Stdio Intrinsics - Z80 Codegen', () => {
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

  it('should generate fputc write sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        __fputc(65, &stream);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('ld (hl),'), 'Assembly should store character to buffer');
    assert.ok(asm.includes('inc'), 'Assembly should increment buffer position');
  });

  it('should generate fgetc read sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        int c = __fgetc(&stream);
        return c;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('ld a, (hl)'), 'Assembly should read character from buffer');
    assert.ok(asm.includes('inc'), 'Assembly should increment buffer position');
  });

  it('should generate feof flag check sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        int eof = __feof(&stream);
        return eof;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('and'), 'Assembly should check EOF flag bit');
    assert.ok(asm.includes('ld a, 1'), 'Assembly should return 1 for EOF');
  });

  it('should generate ferror flag check sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        int err = __ferror(&stream);
        return err;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('and'), 'Assembly should check error flag bit');
    assert.ok(asm.includes('ld a, 1'), 'Assembly should return 1 for error');
  });

  it('should generate fopen allocation sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *stream = __fopen("test.txt", "r");
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load filename pointer');
    assert.ok(asm.includes('push'), 'Assembly should allocate on stack');
    assert.ok(asm.includes('ld sp,'), 'Assembly should adjust stack pointer');
  });

  it('should generate fclose zero sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *stream;
        __fclose(stream);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('ld (hl), 0'), 'Assembly should zero fields');
    assert.ok(asm.includes('xor a'), 'Assembly should return 0');
  });

  it('should generate valid Z80 assembly for fputc', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        __fputc(65, &stream);
        return 0;
      }
    `);
    const lines = asm.split('\n');
    let hasFputcCode = false;
    for (const line of lines) {
      if (line.includes('FPUTC') || line.includes('fputc')) {
        hasFputcCode = true;
        break;
      }
    }
    assert.ok(hasFputcCode || asm.includes('ld hl,'), 'Assembly should contain fputc-related code');
  });

  it('should generate valid Z80 assembly for fgetc', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        int c = __fgetc(&stream);
        return c;
      }
    `);
    assert.ok(asm.includes('ld a, (hl)'), 'Assembly should read from memory');
  });

  it('should handle fputc in expression context', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        int result = __fputc(65, &stream);
        return result;
      }
    `);
    assert.ok(asm.includes('ld a,'), 'Assembly should load return value');
  });

  it('should handle fgetc return value assignment', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE stream;
        int c = __fgetc(&stream);
        return c;
      }
    `);
    assert.ok(asm.includes('ld a, (hl)'), 'Assembly should read character into A');
  });

  it('should compile a complete file copy program', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE src;
        FILE dst;
        int c;
        while (!__feof(&src)) {
          c = __fgetc(&src);
          __fputc(c, &dst);
        }
        return 0;
      }
    `);
    assert.ok(asm.includes('and #1'), 'Assembly should contain feof flag check');
    assert.ok(asm.includes('ld a, (hl)'), 'Assembly should contain fgetc read');
    assert.ok(asm.includes('ld (hl), a'), 'Assembly should contain fputc write');
  });

  it('should compile fopen/fclose pair', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *f = __fopen("data", "r");
        __fclose(f);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should contain file operations');
  });
});

describe('Stdio Intrinsics - IR Serialization', () => {
  it('should serialize FPUTC IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('FPUTC', ['t0', 't1']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['FPUTC', 't0', 't1']);
  });

  it('should serialize FGETC IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('FGETC', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['FGETC', 't0']);
  });

  it('should serialize FEOF IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('FEOF', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['FEOF', 't0']);
  });

  it('should serialize FERROR IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('FERROR', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['FERROR', 't0']);
  });

  it('should serialize FOPEN IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('FOPEN', ['t0', 't1']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['FOPEN', 't0', 't1']);
  });

  it('should serialize FCLOSE IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('FCLOSE', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['FCLOSE', 't0']);
  });

  it('should have correct string representation for FPUTC', () => {
    const instr = new IL.IntrinsicInstruction('FPUTC', ['t0', 't1']);
    assert.strictEqual(instr.toString(), 'INTRINSIC FPUTC, t0, t1');
  });

  it('should have correct string representation for FGETC', () => {
    const instr = new IL.IntrinsicInstruction('FGETC', ['t0']);
    assert.strictEqual(instr.toString(), 'INTRINSIC FGETC, t0');
  });
});

import { IntrinsicMap, IntrinsicHandler } from '../nanopass/intrinsics.js';

describe('Stdio Intrinsics - IntrinsicMap', () => {
  it('should have all stdio intrinsics in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__fputc'], '__fputc should be in IntrinsicMap');
    assert.ok(IntrinsicMap['__fgetc'], '__fgetc should be in IntrinsicMap');
    assert.ok(IntrinsicMap['__feof'], '__feof should be in IntrinsicMap');
    assert.ok(IntrinsicMap['__ferror'], '__ferror should be in IntrinsicMap');
    assert.ok(IntrinsicMap['__fopen'], '__fopen should be in IntrinsicMap');
    assert.ok(IntrinsicMap['__fclose'], '__fclose should be in IntrinsicMap');
  });

  it('should have correct argCount for each stdio intrinsic', () => {
    assert.strictEqual(IntrinsicMap['__fputc'].argCount, 2, '__fputc should have 2 args');
    assert.strictEqual(IntrinsicMap['__fgetc'].argCount, 1, '__fgetc should have 1 arg');
    assert.strictEqual(IntrinsicMap['__feof'].argCount, 1, '__feof should have 1 arg');
    assert.strictEqual(IntrinsicMap['__ferror'].argCount, 1, '__ferror should have 1 arg');
    assert.strictEqual(IntrinsicMap['__fopen'].argCount, 2, '__fopen should have 2 args');
    assert.strictEqual(IntrinsicMap['__fclose'].argCount, 1, '__fclose should have 1 arg');
  });

  it('should have correct opcodes for each stdio intrinsic', () => {
    assert.strictEqual(IntrinsicMap['__fputc'].opcode, 'FPUTC');
    assert.strictEqual(IntrinsicMap['__fgetc'].opcode, 'FGETC');
    assert.strictEqual(IntrinsicMap['__feof'].opcode, 'FEOF');
    assert.strictEqual(IntrinsicMap['__ferror'].opcode, 'FERROR');
    assert.strictEqual(IntrinsicMap['__fopen'].opcode, 'FOPEN');
    assert.strictEqual(IntrinsicMap['__fclose'].opcode, 'FCLOSE');
  });

  it('should return IntrinsicMap from getIntrinsicMap', () => {
    const map = IntrinsicHandler.getIntrinsicMap();
    assert.ok(map['__fputc'], '__fputc should be accessible via getIntrinsicMap');
    assert.ok(map['__fopen'], '__fopen should be accessible via getIntrinsicMap');
  });
});
