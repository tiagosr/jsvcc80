/**
 * crt0 - Z80 C Runtime Startup Code Generator
 * 
 * Generates the initial startup code that runs before main():
 * - Initialize stack pointer
 * - Zero BSS section
 * - Call main()
 * - Halt/loop after main returns
 */

import {
  ObjectFile,
  ObjectSection,
  ObjectSymbol,
  ObjectRelocation,
  SymbolType,
  SymbolVisibility,
  SectionType,
  RelocationType
} from './objectfile.js';

export { SymbolType, SymbolVisibility, SectionType, RelocationType };

/**
 * Default stack top address for Z80 systems
 */
export const DEFAULT_STACK_TOP = 0xFFFF;

/**
 * Creates a crt0 (C Runtime 0) object file with startup code.
 * 
 * The generated crt0:
 * 1. Initializes the stack pointer to the top of RAM
 * 2. Zeros the BSS section (uninitialized global variables)
 * 3. Calls the user's main() function
 * 4. Halts and loops after main returns
 * 
 * @param {Object} [options] - crt0 configuration
 * @param {number} [options.stackTop] - Stack pointer top address (default: 0xFFFF)
 * @param {string} [options.entryPoint] - Name of the entry point function (default: 'main')
 * @param {number} [options.bssStartSymbol] - BSS start symbol name (default: '_bss_start')
 * @param {number} [options.bssEndSymbol] - BSS end symbol name (default: '_bss_end')
 * @returns {ObjectFile} Object file containing crt0 startup code
 */
export function createCrt0(options = {}) {
  const stackTop = options.stackTop ?? DEFAULT_STACK_TOP;
  const entryPoint = options.entryPoint || 'main';
  const bssStartSymbol = options.bssStartSymbol || '_bss_start';
  const bssEndSymbol = options.bssEndSymbol || '_bss_end';

  const crt0 = new ObjectFile('crt0');

  const codeSection = new ObjectSection('.crt0', SectionType.CODE);
  crt0.addSection(codeSection);

  // --- crt0: Initialize stack pointer ---
  // ld sp, $nnnn  (3 bytes)
  codeSection.appendByte(0x31); // ld sp, #
  codeSection.appendByte(stackTop & 0xFF); // low byte
  codeSection.appendByte((stackTop >> 8) & 0xFF); // high byte

  // --- Initialize BSS to zero ---
  // ld hl, _bss_start  (4 bytes)
  codeSection.appendByte(0x21); // ld hl, #
  codeSection.appendByte(0x00); // placeholder for bss_start low
  codeSection.appendByte(0x00); // placeholder for bss_start high
  const bssStartRelocOffset = codeSection.size() - 2;
  crt0.addRelocation(new ObjectRelocation(
    bssStartRelocOffset,
    bssStartSymbol,
    'abs16',
    codeSection.name
  ));

  // ld de, _bss_start  (4 bytes)
  codeSection.appendByte(0x11); // ld de, #
  codeSection.appendByte(0x00); // placeholder for bss_start low
  codeSection.appendByte(0x00); // placeholder for bss_start high
  const bssStartCopyRelocOffset = codeSection.size() - 2;
  crt0.addRelocation(new ObjectRelocation(
    bssStartCopyRelocOffset,
    bssStartSymbol,
    'abs16',
    codeSection.name
  ));

  // ld bc, (_bss_end - _bss_start)  (4 bytes)
  // We emit a call to get the size at link time, but for simplicity
  // we'll use a placeholder and let the linker resolve it.
  // Actually, we can compute the size at link time using symbols.
  // For now, we'll emit a call that loads bc with the BSS size.
  // The simplest approach: ld bc, #size where size = _bss_end - _bss_start
  // Since this is computed at link time, we use a placeholder and a special relocation.
  codeSection.appendByte(0x01); // ld bc, #
  codeSection.appendByte(0x00); // placeholder
  codeSection.appendByte(0x00); // placeholder
  const bssSizeRelocOffset = codeSection.size() - 2;
  crt0.addRelocation(new ObjectRelocation(
    bssSizeRelocOffset,
    '_bss_size',
    'abs16',
    codeSection.name
  ));

  // --- Zero loop: _zero_bss_loop ---
  const zeroLoopLabel = codeSection.size();

  // ld (hl), a  (1 byte)
  codeSection.appendByte(0x77);

  // inc hl  (1 byte)
  codeSection.appendByte(0x23);

  // dec bc  (1 byte)
  codeSection.appendByte(0x0B);

  // ld a, b  (1 byte)
  codeSection.appendByte(0x40);

  // or c  (1 byte)
  codeSection.appendByte(0xB7);

  // jr nz, _zero_bss_loop  (2 bytes, relative offset)
  codeSection.appendByte(0x20); // jr nz, #
  const jrOffset = zeroLoopLabel - codeSection.size();
  codeSection.appendByte(((jrOffset + 256) & 0xFF));

  // --- Call main() ---
  // call main  (3 bytes)
  codeSection.appendByte(0xCD); // call #
  codeSection.appendByte(0x00); // placeholder for main low
  codeSection.appendByte(0x00); // placeholder for main high
  const mainCallRelocOffset = codeSection.size() - 2;
  crt0.addRelocation(new ObjectRelocation(
    mainCallRelocOffset,
    entryPoint,
    'call',
    codeSection.name
  ));

  // --- After main returns: halt and loop ---
  // halt  (1 byte)
  codeSection.appendByte(0x76);

  // jp crt0  (3 bytes) - loop back to restart
  codeSection.appendByte(0xC3); // jp #
  codeSection.appendByte(0x00); // placeholder for crt0 low
  codeSection.appendByte(0x00); // placeholder for crt0 high
  const crt0JumpRelocOffset = codeSection.size() - 2;
  crt0.addRelocation(new ObjectRelocation(
    crt0JumpRelocOffset,
    'crt0',
    'jp',
    codeSection.name
  ));

  // --- Symbols ---
  crt0.addSymbol(new ObjectSymbol(
    'crt0',
    SymbolType.FUNCTION,
    SymbolVisibility.GLOBAL,
    0,
    codeSection.name
  ));

  crt0.addSymbol(new ObjectSymbol(
    bssStartSymbol,
    SymbolType.ABSOLUTE,
    SymbolVisibility.LOCAL,
    0,
    null
  ));

  crt0.addSymbol(new ObjectSymbol(
    bssEndSymbol,
    SymbolType.ABSOLUTE,
    SymbolVisibility.LOCAL,
    0,
    null
  ));

  crt0.addSymbol(new ObjectSymbol(
    '_bss_size',
    SymbolType.ABSOLUTE,
    SymbolVisibility.LOCAL,
    0,
    null
  ));

  return crt0;
}

/**
 * Resolves crt0 relocations with known addresses.
 * 
 * This is called by the linker after section addresses are assigned.
 * It resolves the special crt0 relocations (_bss_start, _bss_end, _bss_size,
 * main call, crt0 jump) using the resolved symbol addresses.
 * 
 * @param {ObjectFile} crt0 - The crt0 object file
 * @param {Map<string, number>} symbolAddresses - Map of symbol name to final address
 * @param {number} crt0Address - Final address of the crt0 section
 */
export function resolveCrt0Relocations(crt0, symbolAddresses, crt0Address) {
  const codeSection = crt0.getSection('.crt0');
  if (!codeSection) return;

  const contents = codeSection.contents;
  const crt0Offset = crt0Address;

  // Only resolve BSS-related placeholders if there's actual BSS content
  const bssSize = symbolAddresses.get('_bss_size');
  const hasBss = bssSize !== undefined && bssSize > 0;

  if (hasBss) {
    // Resolve _bss_start references (ld hl, _bss_start and ld de, _bss_start)
    const bssStartSym = symbolAddresses.get('_bss_start');
    if (bssStartSym !== undefined) {
      // First placeholder: ld hl, _bss_start (offset 1-2)
      contents[1] = bssStartSym & 0xFF;
      contents[2] = (bssStartSym >> 8) & 0xFF;

      // Second placeholder: ld de, _bss_start (offset 6-7)
      contents[6] = bssStartSym & 0xFF;
      contents[7] = (bssStartSym >> 8) & 0xFF;
    }

    // Resolve _bss_size (ld bc, _bss_size at offset 11-12)
    contents[11] = bssSize & 0xFF;
    contents[12] = (bssSize >> 8) & 0xFF;
  }

  // Resolve call main (offset 20-21)
  const mainSym = symbolAddresses.get('main');
  if (mainSym !== undefined) {
    contents[20] = mainSym & 0xFF;
    contents[21] = (mainSym >> 8) & 0xFF;
  }

  // Resolve jp crt0 (offset 24-25)
  contents[24] = crt0Offset & 0xFF;
  contents[25] = (crt0Offset >> 8) & 0xFF;
}

/**
 * Gets the size of the generated crt0 code in bytes.
 * 
 * @returns {number} Size of crt0 code (25 bytes)
 */
export function getCrt0Size() {
  return 26;
}
