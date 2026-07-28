/**
 * Comprehensive tests for the ObjectFileViewer module.
 * Covers constructor, view, section headers, code disassembly, data dumps,
 * symbol tables, relocation tables, JSON serialization, and edge cases.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import {
  ObjectFileViewer,
  ObjectFileView,
  SectionView,
  viewObjectFile
} from '../../src/disassembler/objectfile_viewer.js';
import {
  ObjectFile,
  ObjectSection,
  ObjectSymbol,
  ObjectRelocation,
  SectionType,
  SymbolType,
  SymbolVisibility,
  RelocationType
} from '../../src/linker/objectfile.js';

describe('ObjectFileViewer - Constructor and Basic View', () => {
  it('should create ObjectFileViewer with default options', () => {
    const objectFile = new ObjectFile('test.c');
    const viewer = new ObjectFileViewer(objectFile);
    assert.strictEqual(viewer.baseAddress, 0x8000);
    assert.strictEqual(viewer.verbose, false);
    assert.strictEqual(viewer.sections, null);
  });

  it('should create ObjectFileViewer with custom base address', () => {
    const objectFile = new ObjectFile('test.c');
    const viewer = new ObjectFileViewer(objectFile, { baseAddress: 0x1000 });
    assert.strictEqual(viewer.baseAddress, 0x1000);
  });

  it('should create ObjectFileViewer with verbose mode', () => {
    const objectFile = new ObjectFile('test.c');
    const viewer = new ObjectFileViewer(objectFile, { verbose: true });
    assert.strictEqual(viewer.verbose, true);
  });

  it('should create ObjectFileViewer with section filter', () => {
    const objectFile = new ObjectFile('test.c');
    const viewer = new ObjectFileViewer(objectFile, { sections: ['.text.main'] });
    assert.deepStrictEqual(viewer.sections, ['.text.main']);
  });

  it('should view() return ObjectFileView', () => {
    const objectFile = new ObjectFile('test.c');
    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    assert.ok(view instanceof ObjectFileView);
    assert.strictEqual(view.fileName, 'test.c');
    assert.strictEqual(view.format, 'VCC80O');
    assert.strictEqual(view.architecture, 'Z80');
  });

  it('should viewObjectFile convenience function return ObjectFileView', () => {
    const objectFile = new ObjectFile('test.c');
    const view = viewObjectFile(objectFile);
    assert.ok(view instanceof ObjectFileView);
    assert.strictEqual(view.fileName, 'test.c');
  });
});

describe('ObjectFileViewer - Section Headers Formatting', () => {
  it('should include section headers in view output', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('; Section headers:'));
    assert.ok(output.includes('.text.main'));
    assert.ok(output.includes('code'));
  });

  it('should section headers show correct size', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x42);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('01'));
  });

  it('should section headers show correct address', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile, { baseAddress: 0x8000 });
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('$8000'));
  });

  it('should section headers show multiple sections with sequential addresses', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0x00);
    objectFile.addSection(textSection);

    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x00);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile, { baseAddress: 0x8000 });
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('$8000'));
    assert.ok(output.includes('$8001'));
  });
});

describe('ObjectFileViewer - Code Section Disassembly', () => {
  it('should disassemble code section with hex bytes', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('; Disassembly of section .text.main:'));
    assert.ok(output.includes('c9'));
    assert.ok(output.includes('RET'));
  });

  it('should disassemble code section with 16-bit operand', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0x01);
    textSection.appendByte(0x00);
    textSection.appendByte(0x80);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('01 00 80'));
    assert.ok(output.includes('LD BC,nn'));
  });

  it('should disassemble code section with symbol label', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    objectFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main', 0));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('main:'));
  });

  it('should disassemble multiple instructions in code section', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0x3E);
    textSection.appendByte(0x00);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('3e 00'));
    assert.ok(output.includes('LD A,n $00'));
    assert.ok(output.includes('c9'));
    assert.ok(output.includes('RET'));
  });

  it('should code section instructions have sequential addresses', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0x00);
    textSection.appendByte(0x00);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile, { baseAddress: 0x8000 });
    const view = viewer.view();
    const sectionView = view.sections.get('.text.main');
    assert.strictEqual(sectionView.instructions[0].address, 0x8000);
    assert.strictEqual(sectionView.instructions[1].address, 0x8001);
  });
});

describe('ObjectFileViewer - Data Section Hex Dump', () => {
  it('should format data section as hex dump', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x42);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('42'));
  });

  it('should data section hex dump include ASCII representation', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.msg', SectionType.DATA);
    const msg = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    dataSection.append(msg);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes("'Hello'"));
  });

  it('should data section non-printable bytes show as dots', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.raw', SectionType.DATA);
    dataSection.appendByte(0x00);
    dataSection.appendByte(0xFF);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes("'..'"));
  });

  it('should BSS section show .ds directive', () => {
    const objectFile = new ObjectFile('test.c');
    const bssSection = new ObjectSection('.bss.buffer', SectionType.BSS);
    bssSection.append(new Uint8Array(16));
    objectFile.addSection(bssSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('.ds 16'));
  });
});

describe('ObjectFileViewer - Symbol Table Formatting', () => {
  it('should include symbol table in view output', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    objectFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main', 0));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('; Symbol table:'));
    assert.ok(output.includes('main'));
  });

  it('should symbol table show correct type', () => {
    const objectFile = new ObjectFile('test.c');
    objectFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, null, 0));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('function'));
  });

  it('should symbol table show correct visibility', () => {
    const objectFile = new ObjectFile('test.c');
    objectFile.addSymbol(new ObjectSymbol('local_var', SymbolType.VARIABLE, SymbolVisibility.LOCAL, 0, null, 1));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('local'));
  });

  it('should symbol table show variable symbols', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x00);
    objectFile.addSection(dataSection);

    objectFile.addSymbol(new ObjectSymbol('counter', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.counter', 1));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('counter'));
    assert.ok(output.includes('variable'));
  });
});

describe('ObjectFileViewer - Relocation Table Formatting', () => {
  it('should include relocation table in view output', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xCD);
    textSection.appendByte(0x00);
    textSection.appendByte(0x00);
    objectFile.addSection(textSection);

    objectFile.addRelocation(new ObjectRelocation(1, 'handler', RelocationType.CALL, '.text.main'));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('; Relocations:'));
    assert.ok(output.includes('handler'));
  });

  it('should relocation table show correct type', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xCD);
    textSection.appendByte(0x00);
    textSection.appendByte(0x00);
    objectFile.addSection(textSection);

    objectFile.addRelocation(new ObjectRelocation(1, 'handler', RelocationType.CALL, '.text.main'));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('call'));
  });

  it('should relocation table show abs8 type', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0x3E);
    textSection.appendByte(0x00);
    objectFile.addSection(textSection);

    objectFile.addRelocation(new ObjectRelocation(1, 'value', RelocationType.ABS8, '.text.main'));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('abs8'));
  });
});

describe('ObjectFileViewer - Full Object File View', () => {
  it('should full view include all section types', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x42);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('.text.main'));
    assert.ok(output.includes('.data.counter'));
    assert.ok(output.includes('code'));
    assert.ok(output.includes('data'));
  });

  it('should full view include file header', () => {
    const objectFile = new ObjectFile('program.c');
    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('; Object file: program.c'));
    assert.ok(output.includes('; Format: VCC80O'));
    assert.ok(output.includes('; Architecture: Z80'));
  });

  it('should full view combine all sections in order', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x00);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();

    const textIdx = output.indexOf('.text.main');
    const dataIdx = output.indexOf('.data.counter');
    assert.ok(textIdx < dataIdx);
  });
});

describe('ObjectFileViewer - Single Section View', () => {
  it('should viewSection return SectionView', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const sectionView = viewer.viewSection('.text.main');
    assert.ok(sectionView instanceof SectionView);
    assert.strictEqual(sectionView.name, '.text.main');
    assert.strictEqual(sectionView.type, 'code');
  });

  it('should viewSection throw for nonexistent section', () => {
    const objectFile = new ObjectFile('test.c');
    const viewer = new ObjectFileViewer(objectFile);
    assert.throws(() => viewer.viewSection('.text.nonexistent'), /not found/);
  });

  it('should viewSection with section filter show only specified section', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const dataSection = new ObjectSection('.data.counter', SectionType.DATA);
    dataSection.appendByte(0x00);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile, { sections: ['.text.main'] });
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('.text.main'));
    assert.ok(!output.includes('.data.counter'));
  });
});

describe('ObjectFileViewer - JSON Serialization', () => {
  it('should ObjectFileView toJSON return correct structure', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const json = view.toJSON();
    assert.strictEqual(json.fileName, 'test.c');
    assert.strictEqual(json.format, 'VCC80O');
    assert.strictEqual(json.architecture, 'Z80');
    assert.ok(json.sections);
    assert.ok(json.sections['.text.main']);
  });

  it('should SectionView toJSON return correct structure', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const sectionView = view.sections.get('.text.main');
    const json = sectionView.toJSON();
    assert.strictEqual(json.name, '.text.main');
    assert.strictEqual(json.type, 'code');
    assert.strictEqual(json.baseAddress, 0x8000);
    assert.deepStrictEqual(json.dataBytes, [0xC9]);
  });

  it('should ObjectFileView toJSON include symbols', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    objectFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main', 0));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const json = view.toJSON();
    assert.strictEqual(json.symbols.length, 1);
    assert.strictEqual(json.symbols[0].name, 'main');
  });

  it('should ObjectFileView toJSON include relocations', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xCD);
    textSection.appendByte(0x00);
    textSection.appendByte(0x00);
    objectFile.addSection(textSection);

    objectFile.addRelocation(new ObjectRelocation(1, 'handler', RelocationType.CALL, '.text.main'));

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const json = view.toJSON();
    assert.strictEqual(json.relocations.length, 1);
    assert.strictEqual(json.relocations[0].symbolName, 'handler');
  });
});

describe('ObjectFileViewer - Edge Cases', () => {
  it('should handle empty object file', () => {
    const objectFile = new ObjectFile('empty.c');
    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('; Object file: empty.c'));
    assert.ok(output.includes('; Section headers:'));
  });

  it('should handle object file with no symbols', () => {
    const objectFile = new ObjectFile('nosym.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(!output.includes('; Symbol table:'));
  });

  it('should handle object file with no relocations', () => {
    const objectFile = new ObjectFile('noreloc.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(!output.includes('; Relocations:'));
  });

  it('should handle rodata section', () => {
    const objectFile = new ObjectFile('test.c');
    const rodataSection = new ObjectSection('.rodata.str', SectionType.RODATA);
    rodataSection.append(new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]));
    objectFile.addSection(rodataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const output = view.toString();
    assert.ok(output.includes('.rodata.str'));
    assert.ok(output.includes('rodata'));
  });

  it('should handle custom base address 0x0000', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile, { baseAddress: 0x0000 });
    const view = viewer.view();
    const sectionView = view.sections.get('.text.main');
    assert.strictEqual(sectionView.baseAddress, 0x0000);
  });

  it('should SectionView toString return hex dump lines for code', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0x3E);
    textSection.appendByte(0x00);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const sectionView = view.sections.get('.text.main');
    const output = sectionView.toString();
    assert.ok(output.includes('3e 00'));
    assert.ok(output.includes('c9'));
  });

  it('should SectionView toString return hex dump lines for data', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.val', SectionType.DATA);
    dataSection.appendByte(0x42);
    dataSection.appendByte(0x00);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const sectionView = view.sections.get('.data.val');
    const output = sectionView.toString();
    assert.ok(output.includes('42'));
    assert.ok(output.includes('00'));
  });

  it('should SectionView toJSON include hexDumpLines', () => {
    const objectFile = new ObjectFile('test.c');
    const textSection = new ObjectSection('.text.main', SectionType.CODE);
    textSection.appendByte(0xC9);
    objectFile.addSection(textSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const sectionView = view.sections.get('.text.main');
    const json = sectionView.toJSON();
    assert.ok(Array.isArray(json.hexDumpLines));
    assert.ok(json.hexDumpLines.length > 0);
  });

  it('should large data section split across multiple hex dump lines', () => {
    const objectFile = new ObjectFile('test.c');
    const dataSection = new ObjectSection('.data.big', SectionType.DATA);
    const bigData = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bigData[i] = i;
    dataSection.append(bigData);
    objectFile.addSection(dataSection);

    const viewer = new ObjectFileViewer(objectFile);
    const view = viewer.view();
    const sectionView = view.sections.get('.data.big');
    assert.strictEqual(sectionView.hexDumpLines.length, 2);
  });
});
