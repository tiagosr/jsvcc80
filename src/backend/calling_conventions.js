/**
 * Calling convention code generation for Z80
 * Implements cdecl, fastcall, callee, and new_sdcc ABIs
 */
import * as IL from '../nanopass/il.js';

/**
 * Generates a cdecl function call
 * All parameters passed via stack, right-to-left order. Caller clears stack.
 * Return values: byte on L, word on HL, dword: high on DE, low on HL
 * @param {string[]} args - Argument register names
 * @param {string} funcName - Function label
 * @param {Object[]} paramTypes - Parameter type info with size field
 * @returns {string[]} Z80 assembly code lines
 */
export function generateCdeclCall(args, funcName, paramTypes = []) {
  const codeLines = [];

  // Push arguments onto stack (right-to-left)
  for (const arg of args.reverse()) {
    codeLines.push(`  ld a, ${arg}`);
    codeLines.push('  push af');
  }

  // Perform the call
  codeLines.push(`  call ${funcName}`);

  // Caller clears stack (each argument = 2 bytes)
  if (args.length > 0) {
    const bytes = args.length * 2;
    codeLines.push(`  ld hl, sp`);
    codeLines.push(`  ld de, ${bytes}`);
    codeLines.push('  add hl, de');
    codeLines.push('  ld sp, l');
    codeLines.push('  ld sp, h');
  }

  // Return value on L (byte) or HL (word)
  codeLines.push('  ld a, l');

  return codeLines;
}

/**
 * Generates a fastcall function call
 * Single argument and return value on registers.
 * byte: on L, word: on HL, dword: high on DE, low on HL
 * @param {string[]} args - Argument register names
 * @param {string} funcName - Function label
 * @param {Object[]} paramTypes - Parameter type info with size field
 * @returns {string[]} Z80 assembly code lines
 */
export function generateFastcallCall(args, funcName, paramTypes = []) {
  const codeLines = [];

  if (args.length === 1) {
    const arg = args[0];
    const argSize = paramTypes[0]?.size || 1;

    if (argSize === 2) {
      // 16-bit argument: value should be on HL
      // arg is a register holding the low byte, need to get high byte
      codeLines.push(`  ld h, ${arg}`);
      codeLines.push('  ld l, 0');
    } else {
      // 8-bit argument: value on L
      codeLines.push(`  ld l, ${arg}`);
    }

    codeLines.push(`  call ${funcName}`);

    // Return value on L (byte) or HL (word)
    codeLines.push('  ld a, l');
  } else {
    // Multiple args: fallback to cdecl
    return generateCdeclCall(args, funcName, paramTypes);
  }

  return codeLines;
}

/**
 * Generates a callee-clears-stack function call
 * All parameters passed via stack, right-to-left order. Callee clears stack.
 * Return values: byte on L, word on HL, dword: high on DE, low on HL
 * @param {string[]} args - Argument register names
 * @param {string} funcName - Function label
 * @param {Object[]} paramTypes - Parameter type info with size field
 * @returns {string[]} Z80 assembly code lines
 */
export function generateCalleeCall(args, funcName, paramTypes = []) {
  const codeLines = [];

  // Push arguments onto stack (right-to-left)
  for (const arg of args.reverse()) {
    codeLines.push(`  ld a, ${arg}`);
    codeLines.push('  push af');
  }

  // Perform the call
  codeLines.push(`  call ${funcName}`);

  // Callee clears stack
  if (args.length > 0) {
    const bytes = args.length * 2;
    codeLines.push(`  ld hl, sp`);
    codeLines.push(`  ld de, ${bytes}`);
    codeLines.push('  add hl, de');
    codeLines.push('  ld sp, l');
    codeLines.push('  ld sp, h');
  }

  // Return value on L (byte) or HL (word)
  codeLines.push('  ld a, l');

  return codeLines;
}

/**
 * Generates a new_sdcc function call
 * Up to two byte or word arguments in registers, spillover in stack.
 * Single byte: arg => A. Single word: arg => HL.
 * Two byte: arg1 => A, arg2 => L. Two word: arg1 => HL, arg2 => DE.
 * Mixed byte then word: arg1 => L, arg2 => DE.
 * Mixed word then byte: arg1 => HL, arg2 => E.
 * Return: byte on A, word on DE, dword on HL:DE
 * @param {string[]} args - Argument register names (left-to-right order)
 * @param {string} funcName - Function label
 * @param {Object[]} paramTypes - Parameter type info with size field
 * @returns {string[]} Z80 assembly code lines
 */
export function generateNewSdccCall(args, funcName, paramTypes = []) {
  const codeLines = [];

  // Determine register assignment based on arg types (left-to-right)
  const argTypes = paramTypes.map(p => p?.size || 1);

  if (args.length === 0) {
    codeLines.push(`  call ${funcName}`);
    codeLines.push('  ld a, l');
    return codeLines;
  }

  if (args.length === 1) {
    const argSize = argTypes[0] || 1;
    const arg = args[0];

    if (argSize === 2) {
      // 16-bit argument on HL
      codeLines.push(`  ld h, ${arg}`);
      codeLines.push('  ld l, 0');
    } else {
      // 8-bit argument on A
      codeLines.push(`  ld a, ${arg}`);
    }

    codeLines.push(`  call ${funcName}`);

    // Return value on A (byte) or DE (word)
    if (argSize === 2) {
      codeLines.push('  ld a, d');
    } else {
      codeLines.push('  ld a, a');
    }

    return codeLines;
  }

  if (args.length === 2) {
    const size1 = argTypes[0] || 1;
    const size2 = argTypes[1] || 1;
    const arg1 = args[0];
    const arg2 = args[1];

    if (size1 === 1 && size2 === 1) {
      // Two byte arguments: arg1 => A, arg2 => L
      codeLines.push(`  ld a, ${arg1}`);
      codeLines.push(`  ld l, ${arg2}`);
    } else if (size1 === 2 && size2 === 2) {
      // Two word arguments: arg1 => HL, arg2 => DE
      codeLines.push(`  ld h, ${arg1}`);
      codeLines.push('  ld l, 0');
      codeLines.push(`  ld d, ${arg2}`);
      codeLines.push('  ld e, 0');
    } else if (size1 === 1 && size2 === 2) {
      // Mixed byte then word: arg1 => L, arg2 => DE
      codeLines.push(`  ld l, ${arg1}`);
      codeLines.push(`  ld d, ${arg2}`);
      codeLines.push('  ld e, 0');
    } else if (size1 === 2 && size2 === 1) {
      // Mixed word then byte: arg1 => HL, arg2 => E
      codeLines.push(`  ld h, ${arg1}`);
      codeLines.push('  ld l, 0');
      codeLines.push(`  ld e, ${arg2}`);
    }

    codeLines.push(`  call ${funcName}`);

    // Return value on A (byte) or DE (word) or HL:DE (dword)
    if (size1 === 2 && size2 === 2) {
      codeLines.push('  ld a, d');
    } else {
      codeLines.push('  ld a, a');
    }

    return codeLines;
  }

  // More than 2 args: first 2 in registers, rest on stack
  const firstArg = args[0];
  const secondArg = args[1];
  const size1 = argTypes[0] || 1;
  const size2 = argTypes[1] || 1;
  const remainingArgs = args.slice(2).reverse();

  if (size1 === 1 && size2 === 1) {
    codeLines.push(`  ld a, ${firstArg}`);
    codeLines.push(`  ld l, ${secondArg}`);
  } else if (size1 === 2 && size2 === 2) {
    codeLines.push(`  ld h, ${firstArg}`);
    codeLines.push('  ld l, 0');
    codeLines.push(`  ld d, ${secondArg}`);
    codeLines.push('  ld e, 0');
  } else if (size1 === 1 && size2 === 2) {
    codeLines.push(`  ld l, ${firstArg}`);
    codeLines.push(`  ld d, ${secondArg}`);
    codeLines.push('  ld e, 0');
  } else if (size1 === 2 && size2 === 1) {
    codeLines.push(`  ld h, ${firstArg}`);
    codeLines.push('  ld l, 0');
    codeLines.push(`  ld e, ${secondArg}`);
  }

  // Push remaining args on stack (right-to-left)
  for (const arg of remainingArgs) {
    codeLines.push(`  ld a, ${arg}`);
    codeLines.push('  push af');
  }

  codeLines.push(`  call ${funcName}`);

  // Caller clears remaining stack args
  if (remainingArgs.length > 0) {
    const bytes = remainingArgs.length * 2;
    codeLines.push(`  ld hl, sp`);
    codeLines.push(`  ld de, ${bytes}`);
    codeLines.push('  add hl, de');
    codeLines.push('  ld sp, l');
    codeLines.push('  ld sp, h');
  }

  // Return value on A (byte) or DE (word)
  if (size1 === 2 && size2 === 2) {
    codeLines.push('  ld a, d');
  } else {
    codeLines.push('  ld a, a');
  }

  return codeLines;
}
