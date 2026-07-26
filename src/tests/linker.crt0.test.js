import { describe, it } from 'mocha';
import assert from 'assert';
import {
  SymbolType, SymbolVisibility
} from '../../src/linker/objectfile.js';
import { createCrt0, getCrt0Size, resolveCrt0Relocations, DEFAULT_STACK_TOP } from '../../src/linker/crt0.js';

describe('Crt0 - Z80 Startup Code', () => {
  it('should create crt0 object file', () => {
    const crt0 = createCrt0();

    assert.ok(crt0);
    assert.strictEqual(crt0.name, 'crt0');
    assert.strictEqual(crt0.sections.length, 1);
    assert.strictEqual(crt0.sections[0].name, '.crt0');
  });

  it('should generate correct crt0 size (26 bytes)', () => {
    const crt0 = createCrt0();

    assert.strictEqual(getCrt0Size(), 26);
    assert.strictEqual(crt0.sections[0].size(), 26);
  });

  it('should set stack pointer to 0xFFFF by default', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // ld sp, $FFFF = 0x31, 0xFF, 0xFF
    assert.strictEqual(section.contents[0], 0x31);
    assert.strictEqual(section.contents[1], 0xFF);
    assert.strictEqual(section.contents[2], 0xFF);
  });

  it('should accept custom stack top address', () => {
    const crt0 = createCrt0({ stackTop: 0x9988 });
    const section = crt0.sections[0];

    // ld sp, $9988 = 0x31, 0x88, 0x99
    assert.strictEqual(section.contents[0], 0x31);
    assert.strictEqual(section.contents[1], 0x88);
    assert.strictEqual(section.contents[2], 0x99);
  });

  it('should generate ld hl, _bss_start with relocation', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // ld hl, # = 0x21, low, high
    assert.strictEqual(section.contents[3], 0x21);
    assert.strictEqual(section.relocations.length, 5);
    assert.strictEqual(section.relocations[0].symbolName, '_bss_start');
    assert.strictEqual(section.relocations[0].type, 'abs16');
  });

  it('should generate ld de, _bss_start with relocation', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // ld de, # = 0x11, low, high
    assert.strictEqual(section.contents[6], 0x11);
    assert.strictEqual(section.relocations[1].symbolName, '_bss_start');
  });

  it('should generate ld bc, _bss_size with relocation', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // ld bc, # = 0x01 at offset 9, low=10, high=11
    assert.strictEqual(section.contents[9], 0x01);
    assert.strictEqual(section.relocations[2].symbolName, '_bss_size');
  });

  it('should generate zero loop with relative jump', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // Zero loop starts at offset 12:
    // ld (hl), a = 0x77 at offset 12
    assert.strictEqual(section.contents[12], 0x77);
    // inc hl = 0x23 at offset 13
    assert.strictEqual(section.contents[13], 0x23);
    // dec bc = 0x0B at offset 14
    assert.strictEqual(section.contents[14], 0x0B);
    // ld a, b = 0x40 at offset 15
    assert.strictEqual(section.contents[15], 0x40);
    // or c = 0xB7 at offset 16
    assert.strictEqual(section.contents[16], 0xB7);
    // jr nz, # = 0x20, offset at offset 17-18
    assert.strictEqual(section.contents[17], 0x20);
  });

  it('should generate call main with relocation', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // call # = 0xCD at offset 19, low=20, high=21
    assert.strictEqual(section.contents[19], 0xCD);
    assert.strictEqual(section.relocations[3].symbolName, 'main');
    assert.strictEqual(section.relocations[3].type, 'call');
  });

  it('should generate halt after main returns', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // halt = 0x76 at offset 22
    assert.strictEqual(section.contents[22], 0x76);
  });

  it('should generate jp crt0 loop with relocation', () => {
    const crt0 = createCrt0();
    const section = crt0.sections[0];

    // jp # = 0xC3 at offset 23, low=24, high=25
    assert.strictEqual(section.contents[23], 0xC3);
    assert.strictEqual(section.relocations[4].type, 'jp');
  });

  it('should create proper symbols', () => {
    const crt0 = createCrt0();

    const symbolNames = crt0.symbols.map(s => s.name);
    assert.ok(symbolNames.includes('crt0'));
    assert.ok(symbolNames.includes('_bss_start'));
    assert.ok(symbolNames.includes('_bss_end'));
    assert.ok(symbolNames.includes('_bss_size'));
    assert.strictEqual(crt0.symbols.length, 4);
  });

  it('should use custom entry point name', () => {
    const crt0 = createCrt0({ entryPoint: 'start' });
    const section = crt0.sections[0];

    // call # relocation should reference 'start'
    assert.strictEqual(section.relocations[3].symbolName, 'start');
  });

  it('should create crt0 symbols with correct types', () => {
    const crt0 = createCrt0();

    const crt0Symbol = crt0.symbols.find(s => s.name === 'crt0');
    assert.strictEqual(crt0Symbol.type, SymbolType.FUNCTION);
    assert.strictEqual(crt0Symbol.visibility, SymbolVisibility.GLOBAL);

    const bssStartSymbol = crt0.symbols.find(s => s.name === '_bss_start');
    assert.strictEqual(bssStartSymbol.type, SymbolType.ABSOLUTE);
    assert.strictEqual(bssStartSymbol.visibility, SymbolVisibility.LOCAL);
  });
});
