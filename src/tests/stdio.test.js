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
    assert.strictEqual(fileDef.size, 12, 'FILE struct should be 12 bytes');
  });

  it('should have correct FILE struct field offsets', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fieldOffsets.get('buffer'), 6, 'buffer offset should be 6');
    assert.strictEqual(fileDef.fieldOffsets.get('bufSize'), 8, 'bufSize offset should be 8');
    assert.strictEqual(fileDef.fieldOffsets.get('bufPos'), 10, 'bufPos offset should be 10');
    assert.strictEqual(fileDef.fieldOffsets.get('flags'), 1, 'flags offset should be 1');
  });

  it('should have correct FILE struct field count', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fields.length, 7, 'FILE struct should have 7 fields');
  });

  it('should have correct FILE struct field names', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    const fieldNames = fileDef.fields.map(f => f.name.name);
    assert.deepStrictEqual(fieldNames, ['streamType', 'flags', 'port', 'device', 'buffer', 'bufSize', 'bufPos']);
  });
});

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

describe('Stdio Intrinsics - AST to IR', () => {
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

describe('Stdio Intrinsics - Z80 Codegen', () => {
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

describe('OS Abstraction - FILE Struct Fields', () => {
  it('should register FILE struct with streamType field', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fields[0].name.name, 'streamType', 'first field should be streamType');
  });

  it('should register FILE struct with port field', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fields[2].name.name, 'port', 'port field should be at offset 2');
  });

  it('should register FILE struct with device field', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fields[3].name.name, 'device', 'device field should be at offset 4');
  });

  it('should have correct FILE struct size (12 bytes)', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.size, 12, 'FILE struct should be 12 bytes');
  });

  it('should have correct FILE struct field count (7 fields)', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fields.length, 7, 'FILE struct should have 7 fields');
  });

  it('should have correct FILE struct field names', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    const fieldNames = fileDef.fields.map(f => f.name.name);
    assert.deepStrictEqual(fieldNames, ['streamType', 'flags', 'port', 'device', 'buffer', 'bufSize', 'bufPos']);
  });

  it('should have correct FILE struct field offsets', () => {
    const registry = new TypeRegistry();
    const fileDef = registry.structRegistry.get('FILE');
    assert.strictEqual(fileDef.fieldOffsets.get('streamType'), 0, 'streamType offset should be 0');
    assert.strictEqual(fileDef.fieldOffsets.get('flags'), 1, 'flags offset should be 1');
    assert.strictEqual(fileDef.fieldOffsets.get('port'), 2, 'port offset should be 2');
    assert.strictEqual(fileDef.fieldOffsets.get('device'), 4, 'device offset should be 4');
    assert.strictEqual(fileDef.fieldOffsets.get('buffer'), 6, 'buffer offset should be 6');
    assert.strictEqual(fileDef.fieldOffsets.get('bufSize'), 8, 'bufSize offset should be 8');
    assert.strictEqual(fileDef.fieldOffsets.get('bufPos'), 10, 'bufPos offset should be 10');
  });
});

describe('OS Abstraction - Serial Intrinsics', () => {
  it('should have __serial_open in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__serial_open'], '__serial_open should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__serial_open'].argCount, 1, '__serial_open should have 1 arg');
    assert.strictEqual(IntrinsicMap['__serial_open'].opcode, 'SERIAL_OPEN');
  });

  it('should have __serial_close in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__serial_close'], '__serial_close should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__serial_close'].argCount, 1, '__serial_close should have 1 arg');
    assert.strictEqual(IntrinsicMap['__serial_close'].opcode, 'SERIAL_CLOSE');
  });

  it('should have __serial_read in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__serial_read'], '__serial_read should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__serial_read'].argCount, 1, '__serial_read should have 1 arg');
    assert.strictEqual(IntrinsicMap['__serial_read'].opcode, 'SERIAL_READ');
  });

  it('should have __serial_write in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__serial_write'], '__serial_write should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__serial_write'].argCount, 2, '__serial_write should have 2 args');
    assert.strictEqual(IntrinsicMap['__serial_write'].opcode, 'SERIAL_WRITE');
  });

  it('should have __serial_available in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__serial_available'], '__serial_available should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__serial_available'].argCount, 1, '__serial_available should have 1 arg');
    assert.strictEqual(IntrinsicMap['__serial_available'].opcode, 'SERIAL_AVAILABLE');
  });

  it('should have __terminal_open in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__terminal_open'], '__terminal_open should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__terminal_open'].argCount, 0, '__terminal_open should have 0 args');
    assert.strictEqual(IntrinsicMap['__terminal_open'].opcode, 'TERMINAL_OPEN');
  });

  it('should have __terminal_close in IntrinsicMap', () => {
    assert.ok(IntrinsicMap['__terminal_close'], '__terminal_close should be in IntrinsicMap');
    assert.strictEqual(IntrinsicMap['__terminal_close'].argCount, 1, '__terminal_close should have 1 arg');
    assert.strictEqual(IntrinsicMap['__terminal_close'].opcode, 'TERMINAL_CLOSE');
  });

  it('should translate __serial_open(port) to SERIAL_OPEN intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *serial = __serial_open(0x60);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'SERIAL_OPEN');
    assert.ok(instr !== null, 'SERIAL_OPEN intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'SERIAL_OPEN should have port operand');
  });

  it('should translate __serial_close(stream) to SERIAL_CLOSE intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *serial;
        __serial_close(serial);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'SERIAL_CLOSE');
    assert.ok(instr !== null, 'SERIAL_CLOSE intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'SERIAL_CLOSE should have file pointer operand');
  });

  it('should translate __serial_read(stream) to SERIAL_READ intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *serial;
        int c = __serial_read(serial);
        return c;
      }
    `);
    const instr = findIntrinsic(ir, 'SERIAL_READ');
    assert.ok(instr !== null, 'SERIAL_READ intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'SERIAL_READ should have file pointer operand');
  });

  it('should translate __serial_write(char, stream) to SERIAL_WRITE intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *serial;
        __serial_write(65, serial);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'SERIAL_WRITE');
    assert.ok(instr !== null, 'SERIAL_WRITE intrinsic should be present');
    assert.strictEqual(instr.operands.length, 3, 'SERIAL_WRITE should have char and file pointer operands');
  });

  it('should translate __serial_available(stream) to SERIAL_AVAILABLE intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *serial;
        int avail = __serial_available(serial);
        return avail;
      }
    `);
    const instr = findIntrinsic(ir, 'SERIAL_AVAILABLE');
    assert.ok(instr !== null, 'SERIAL_AVAILABLE intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'SERIAL_AVAILABLE should have file pointer operand');
  });

  it('should translate __terminal_open to TERMINAL_OPEN intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *term = __terminal_open();
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'TERMINAL_OPEN');
    assert.ok(instr !== null, 'TERMINAL_OPEN intrinsic should be present');
  });

  it('should translate __terminal_close(stream) to TERMINAL_CLOSE intrinsic', () => {
    const ir = compile(`
      int main() {
        FILE *term;
        __terminal_close(term);
        return 0;
      }
    `);
    const instr = findIntrinsic(ir, 'TERMINAL_CLOSE');
    assert.ok(instr !== null, 'TERMINAL_CLOSE intrinsic should be present');
    assert.strictEqual(instr.operands.length, 2, 'TERMINAL_CLOSE should have file pointer operand');
  });

  it('should compile serial read/write loop', () => {
    const ir = compile(`
      int main() {
        FILE *serial = __serial_open(0x60);
        int c;
        while ((c = __serial_read(serial)) != 255) {
          __serial_write(c, serial);
        }
        __serial_close(serial);
        return 0;
      }
    `);
    const serialOpenInstr = findIntrinsic(ir, 'SERIAL_OPEN');
    const serialReadInstr = findIntrinsic(ir, 'SERIAL_READ');
    const serialWriteInstr = findIntrinsic(ir, 'SERIAL_WRITE');
    const serialCloseInstr = findIntrinsic(ir, 'SERIAL_CLOSE');
    assert.ok(serialOpenInstr !== null, 'SERIAL_OPEN should be present');
    assert.ok(serialReadInstr !== null, 'SERIAL_READ should be present');
    assert.ok(serialWriteInstr !== null, 'SERIAL_WRITE should be present');
    assert.ok(serialCloseInstr !== null, 'SERIAL_CLOSE should be present');
  });

  it('should compile serial available check', () => {
    const ir = compile(`
      int main() {
        FILE *serial = __serial_open(0x60);
        while (!__serial_available(serial)) {
          // wait
        }
        __serial_close(serial);
        return 0;
      }
    `);
    const serialOpenInstr = findIntrinsic(ir, 'SERIAL_OPEN');
    const serialAvailableInstr = findIntrinsic(ir, 'SERIAL_AVAILABLE');
    const serialCloseInstr = findIntrinsic(ir, 'SERIAL_CLOSE');
    assert.ok(serialOpenInstr !== null, 'SERIAL_OPEN should be present');
    assert.ok(serialAvailableInstr !== null, 'SERIAL_AVAILABLE should be present');
    assert.ok(serialCloseInstr !== null, 'SERIAL_CLOSE should be present');
  });
});

describe('OS Abstraction - Z80 Codegen', () => {
  it('should generate serial_open sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *serial = __serial_open(0x60);
        return 0;
      }
    `);
    assert.ok(asm.includes('call serial_open'), 'Assembly should call serial_open');
    assert.ok(asm.includes('ld (hl), 1'), 'Assembly should set streamType=1');
  });

  it('should generate serial_close sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *serial;
        __serial_close(serial);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('xor a'), 'Assembly should return 0');
  });

  it('should generate serial_read sequence with IN instruction', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *serial;
        int c = __serial_read(serial);
        return c;
      }
    `);
    assert.ok(asm.includes('in a, (c)'), 'Assembly should use IN port instruction');
  });

  it('should generate serial_write sequence with OUT instruction', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *serial;
        __serial_write(65, serial);
        return 0;
      }
    `);
    assert.ok(asm.includes('out (c), a'), 'Assembly should use OUT port instruction');
  });

  it('should generate serial_available sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *serial;
        int avail = __serial_available(serial);
        return avail;
      }
    `);
    assert.ok(asm.includes('in a, (c)'), 'Assembly should peek at port');
    assert.ok(asm.includes('ld a, 1'), 'Assembly should return 1 for available');
  });

  it('should generate terminal_open sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *term = __terminal_open();
        return 0;
      }
    `);
    assert.ok(asm.includes('call terminal_open'), 'Assembly should call terminal_open');
    assert.ok(asm.includes('ld (hl), 2'), 'Assembly should set streamType=2');
  });

  it('should generate terminal_close sequence', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *term;
        __terminal_close(term);
        return 0;
      }
    `);
    assert.ok(asm.includes('ld hl,'), 'Assembly should load file pointer');
    assert.ok(asm.includes('xor a'), 'Assembly should return 0');
  });

  it('should compile complete serial communication program', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *serial = __serial_open(0x60);
        __serial_write(65, serial);
        int c = __serial_read(serial);
        __serial_close(serial);
        return c;
      }
    `);
    assert.ok(asm.includes('call serial_open'), 'Assembly should contain serial_open');
    assert.ok(asm.includes('out (c), a'), 'Assembly should contain serial_write');
    assert.ok(asm.includes('in a, (c)'), 'Assembly should contain serial_read');
    assert.ok(asm.includes('call serial_close') || asm.includes('ld (hl), 0'), 'Assembly should contain serial_close');
  });

  it('should compile terminal echo program', () => {
    const asm = compileToAssembly(`
      int main() {
        FILE *term = __terminal_open();
        __serial_write(65, term);
        __terminal_close(term);
        return 0;
      }
    `);
    assert.ok(asm.includes('call terminal_open'), 'Assembly should contain terminal_open');
    assert.ok(asm.includes('out (c), a'), 'Assembly should contain write');
  });
});

describe('OS Abstraction - IR Serialization', () => {
  it('should serialize SERIAL_OPEN IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_OPEN', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['SERIAL_OPEN', 't0']);
  });

  it('should serialize SERIAL_CLOSE IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_CLOSE', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['SERIAL_CLOSE', 't0']);
  });

  it('should serialize SERIAL_READ IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_READ', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['SERIAL_READ', 't0']);
  });

  it('should serialize SERIAL_WRITE IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_WRITE', ['t0', 't1']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['SERIAL_WRITE', 't0', 't1']);
  });

  it('should serialize SERIAL_AVAILABLE IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_AVAILABLE', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['SERIAL_AVAILABLE', 't0']);
  });

  it('should serialize TERMINAL_OPEN IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('TERMINAL_OPEN', []);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['TERMINAL_OPEN']);
  });

  it('should serialize TERMINAL_CLOSE IntrinsicInstruction to JSON', () => {
    const instr = new IL.IntrinsicInstruction('TERMINAL_CLOSE', ['t0']);
    const json = instr.toJSON();
    assert.strictEqual(json.opcode, 'INTRINSIC');
    assert.deepStrictEqual(json.operands, ['TERMINAL_CLOSE', 't0']);
  });

  it('should have correct string representation for SERIAL_OPEN', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_OPEN', ['t0']);
    assert.strictEqual(instr.toString(), 'INTRINSIC SERIAL_OPEN, t0');
  });

  it('should have correct string representation for SERIAL_WRITE', () => {
    const instr = new IL.IntrinsicInstruction('SERIAL_WRITE', ['t0', 't1']);
    assert.strictEqual(instr.toString(), 'INTRINSIC SERIAL_WRITE, t0, t1');
  });
});
