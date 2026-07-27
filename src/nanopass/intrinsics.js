import * as IL from './il.js';

/**
 * Map of intrinsic function names to their IR opcode and argument count.
 * Zero-argument intrinsics have argCount 0.
 * Intrinsics with arguments evaluate their argument expressions first.
 */
const IntrinsicMap = {
  '__nop': { opcode: 'NOP', argCount: 0 },
  '__halt': { opcode: 'HALT', argCount: 0 },
  '__di': { opcode: 'DI', argCount: 0 },
  '__ei': { opcode: 'EI', argCount: 0 },
  '__exx': { opcode: 'EXX', argCount: 0 },
  '__ex_af_af': { opcode: 'EX_AF_AF', argCount: 0 },
  '__ex_de_hl': { opcode: 'EX_DE_HL', argCount: 0 },
  '__im0': { opcode: 'IM', argCount: 0, argValue: 0 },
  '__im1': { opcode: 'IM', argCount: 0, argValue: 1 },
  '__im2': { opcode: 'IM', argCount: 0, argValue: 2 },
  '__reti': { opcode: 'RETI', argCount: 0 },
  '__retn': { opcode: 'RETN', argCount: 0 },
  '__rld': { opcode: 'RLD', argCount: 0 },
  '__rrd': { opcode: 'RRD', argCount: 0 },
  '__ld_a_r': { opcode: 'LD_A_R', argCount: 0 },
  '__ld_r_a': { opcode: 'LD_R_A', argCount: 0 },
  '__in': { opcode: 'IN', argCount: 1 },
  '__in16': { opcode: 'IN16', argCount: 1 },
  '__out': { opcode: 'OUT', argCount: 2 },
  '__out16': { opcode: 'OUT16', argCount: 2 },
  '__ini': { opcode: 'INI', argCount: 1 },
  '__outi': { opcode: 'OUTI', argCount: 1 },
  '__inir': { opcode: 'INIR', argCount: 2 },
  '__otir': { opcode: 'OTIR', argCount: 2 },
  '__ind': { opcode: 'IND', argCount: 1 },
  '__outd': { opcode: 'OUTD', argCount: 1 },
  '__indr': { opcode: 'INDR', argCount: 2 },
  '__otdr': { opcode: 'OTDR', argCount: 2 },
  '__setjmp': { opcode: 'SETJMP', argCount: 1 },
  '__longjmp': { opcode: 'LONGJMP', argCount: 2 },
  '__alloca': { opcode: 'ALLOCA', argCount: 1 },
  '__fputc': { opcode: 'FPUTC', argCount: 2 },
  '__fgetc': { opcode: 'FGETC', argCount: 1 },
  '__feof': { opcode: 'FEOF', argCount: 1 },
  '__ferror': { opcode: 'FERROR', argCount: 1 },
  '__fopen': { opcode: 'FOPEN', argCount: 2 },
  '__fclose': { opcode: 'FCLOSE', argCount: 1 },
  '__serial_open': { opcode: 'SERIAL_OPEN', argCount: 1 },
  '__serial_close': { opcode: 'SERIAL_CLOSE', argCount: 1 },
  '__serial_read': { opcode: 'SERIAL_READ', argCount: 1 },
  '__serial_write': { opcode: 'SERIAL_WRITE', argCount: 2 },
  '__serial_available': { opcode: 'SERIAL_AVAILABLE', argCount: 1 },
  '__terminal_open': { opcode: 'TERMINAL_OPEN', argCount: 0 },
  '__terminal_close': { opcode: 'TERMINAL_CLOSE', argCount: 1 },
};

/**
 * Handler for translating intrinsic function calls to IR instructions.
 */
export class IntrinsicHandler {
  /**
   * Returns the intrinsic map for external access
   * @returns {Object} The intrinsic map
   */
  static getIntrinsicMap() {
    return IntrinsicMap;
  }

  /**
   * Translates an intrinsic function call to IR
   * @param {string} name - Intrinsic function name
   * @param {AST.ASTNode[]} args - Argument AST nodes
   * @param {IL.BasicBlock[]} blocks - Blocks array to push to
   * @param {function} translateExpression - Expression translator function
   * @param {function} label - Label generator function
   * @param {function} temp - Temp generator function
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  static translateIntrinsic(name, args, blocks, translateExpression, label, temp) {
    const intrinsic = IntrinsicMap[name];
    const translatedArgs = [];

    for (let i = 0; i < intrinsic.argCount; i++) {
      const argResult = translateExpression(args[i]);
      blocks.push(...argResult.blocks);
      translatedArgs.push(argResult.result);
    }

    const dest = temp();
    const block = new IL.BasicBlock(label('intrinsic'));

    const opcodeArgs = [];
    if (intrinsic.argValue !== undefined) {
      opcodeArgs.push(intrinsic.argValue);
    }
    opcodeArgs.push(...translatedArgs);

    block.add(new IL.IntrinsicInstruction(intrinsic.opcode, opcodeArgs));
    return { blocks: [...blocks, block], result: dest };
  }
}

export { IntrinsicMap };
