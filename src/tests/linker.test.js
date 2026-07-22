import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation,
  IrToObjectFile, SymbolType, SymbolVisibility, SectionType, RelocationType
} from '../../src/linker/objectfile.js';
import { WlaDxCodegen, WlaDxSectionType } from '../../src/linker/wladxcodegen.js';
import { Linker, LinkerOptions, link } from '../../src/linker/linker.js';
import {
  FunctionIR, BasicBlock, ProgramIR,
  LoadInstruction, StoreInstruction, BinaryOpInstruction,
  CallInstruction, ReturnInstruction, JumpInstruction, JumpIfInstruction,
  PushInstruction, PopInstruction, UnaryOpInstruction
} from '../../src/nanopass/il.js';

describe('ObjectSection', () => {
  it('should create empty section', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    assert.strictEqual(section.name, '.text');
    assert.strictEqual(section.type, SectionType.CODE);
    assert.strictEqual(section.size(), 0);
  });

  it('should append bytes', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    assert.strictEqual(section.size(), 2);
    assert.strictEqual(section.contents[0], 0x3E);
    assert.strictEqual(section.contents[1], 0x42);
  });

  it('should append word in little-endian', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendWord(0x1234);
    assert.strictEqual(section.size(), 2);
    assert.strictEqual(section.contents[0], 0x34);
    assert.strictEqual(section.contents[1], 0x12);
  });

  it('should append data buffer', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.append(new Uint8Array([0x01, 0x02, 0x03]));
    assert.strictEqual(section.size(), 3);
  });

  it('should add relocation', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    const reloc = new ObjectRelocation(0, 'main', RelocationType.CALL, '.text');
    section.addRelocation(reloc);
    assert.strictEqual(section.relocations.length, 1);
  });

  it('should serialize to JSON', () => {
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    const json = section.toJSON();
    assert.strictEqual(json.name, '.text');
    assert.strictEqual(json.type, SectionType.CODE);
    assert.strictEqual(json.size, 1);
  });
});

describe('ObjectSymbol', () => {
  it('should create function symbol', () => {
    const symbol = new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main');
    assert.strictEqual(symbol.name, 'main');
    assert.strictEqual(symbol.type, SymbolType.FUNCTION);
    assert.strictEqual(symbol.visibility, SymbolVisibility.GLOBAL);
  });

  it('should create variable symbol', () => {
    const symbol = new ObjectSymbol('globalVar', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data.globalVar');
    assert.strictEqual(symbol.type, SymbolType.VARIABLE);
    assert.strictEqual(symbol.section, '.data.globalVar');
  });

  it('should serialize to JSON', () => {
    const symbol = new ObjectSymbol('test', SymbolType.FUNCTION, SymbolVisibility.LOCAL, 5, '.text.test');
    const json = symbol.toJSON();
    assert.strictEqual(json.name, 'test');
    assert.strictEqual(json.value, 5);
  });
});

describe('ObjectRelocation', () => {
  it('should create relocation entry', () => {
    const reloc = new ObjectRelocation(2, 'helper', RelocationType.CALL, '.text', 0);
    assert.strictEqual(reloc.offset, 2);
    assert.strictEqual(reloc.symbolName, 'helper');
    assert.strictEqual(reloc.type, RelocationType.CALL);
  });

  it('should serialize to JSON', () => {
    const reloc = new ObjectRelocation(0, 'main', RelocationType.ABS8, '.text', 1);
    const json = reloc.toJSON();
    assert.strictEqual(json.addend, 1);
  });
});

describe('ObjectFile', () => {
  it('should create object file', () => {
    const objFile = new ObjectFile('test.o');
    assert.strictEqual(objFile.name, 'test.o');
    assert.strictEqual(objFile.sections.length, 0);
    assert.strictEqual(objFile.symbols.length, 0);
  });

  it('should add section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    assert.strictEqual(objFile.sections.length, 1);
  });

  it('should add symbol', () => {
    const objFile = new ObjectFile('test.o');
    const symbol = new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text');
    objFile.addSymbol(symbol);
    assert.strictEqual(objFile.symbols.length, 1);
  });

  it('should get section by name', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    assert.strictEqual(objFile.getSection('.text'), section);
    assert.strictEqual(objFile.getSection('.data'), null);
  });

  it('should get symbol by name', () => {
    const objFile = new ObjectFile('test.o');
    const symbol = new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text');
    objFile.addSymbol(symbol);
    assert.strictEqual(objFile.getSymbol('main'), symbol);
    assert.strictEqual(objFile.getSymbol('other'), null);
  });

  it('should add relocation to section', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    objFile.addSection(section);
    const reloc = new ObjectRelocation(0, 'main', RelocationType.CALL, '.text');
    objFile.addRelocation(reloc);
    assert.strictEqual(section.relocations.length, 1);
  });

  it('should serialize to JSON', () => {
    const objFile = new ObjectFile('test.o');
    objFile.addSection(new ObjectSection('.text', SectionType.CODE));
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    const json = objFile.toJSON();
    assert.strictEqual(json.name, 'test.o');
    assert.strictEqual(json.sections.length, 1);
    assert.strictEqual(json.symbols.length, 1);
  });
});

describe('IrToObjectFile', () => {
  it('should convert simple function', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.strictEqual(objFile.name, 'test.c');
    assert.ok(objFile.sections.length > 0);
    assert.ok(objFile.symbols.length > 0);
  });

  it('should convert function with call', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new CallInstruction('helper', []));
    block.add(new ReturnInstruction());
    func.addBlock(block);

    const helper = new FunctionIR('helper');
    const helperBlock = new BasicBlock('entry');
    helperBlock.add(new LoadInstruction('a', 1));
    helperBlock.add(new ReturnInstruction('a'));
    helper.addBlock(helperBlock);

    const program = new ProgramIR([func, helper], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.strictEqual(objFile.symbols.length, 2);
    assert.ok(objFile.getSymbol('main') !== null);
    assert.ok(objFile.getSymbol('helper') !== null);
  });

  it('should convert global variables', () => {
    const program = new ProgramIR([], [
      { name: 'counter', type: 'data', value: 0, size: 1 },
      { name: 'buffer', type: 'bss', value: undefined, size: 64 }
    ]);

    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.getSymbol('counter') !== null);
    assert.ok(objFile.getSymbol('buffer') !== null);
  });

  it('should generate relocations for calls', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new CallInstruction('external_func', []));
    block.add(new ReturnInstruction());
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.relocations.length > 0);
  });

  it('should convert binary operations', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 10));
    block.add(new BinaryOpInstruction('a', 'add', 'a', 5));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.sections.length > 0);
    assert.ok(objFile.sections[0].size() > 0);
  });

  it('should convert jump instructions', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new JumpInstruction('loop_end'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.relocations.length > 0);
  });

  it('should convert push/pop instructions', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new PushInstruction('a'));
    block.add(new PopInstruction('b'));
    block.add(new ReturnInstruction());
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.sections[0].size() >= 2);
  });

  it('should convert unary operations', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new UnaryOpInstruction('a', 'neg', 'a'));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);
    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    assert.ok(objFile.sections[0].size() > 0);
  });
});

describe('WlaDxCodegen', () => {
  it('should generate WLA DX header', () => {
    const codegen = new WlaDxCodegen();
    const output = codegen.generate([]);
    assert.ok(output.includes('OPTION ROMSIZE'));
    assert.ok(output.includes('OPTION RAMSIZE'));
  });

  it('should generate section directives', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x00);
    objFile.addSection(section);

    const codegen = new WlaDxCodegen();
    const output = codegen.generate([objFile]);
    assert.ok(output.includes('SECTION'));
  });

  it('should generate DB directives for bytes', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0x3E);
    section.appendByte(0x42);
    objFile.addSection(section);

    const codegen = new WlaDxCodegen();
    const output = codegen.generate([objFile]);
    assert.ok(output.includes('DB'));
  });

  it('should skip comment header when disabled', () => {
    const codegen = new WlaDxCodegen({ commentHeader: false });
    const output = codegen.generate([]);
    assert.ok(!output.includes('Generated by vcc80'));
  });

  it('should generate from config', () => {
    const codegen = new WlaDxCodegen();
    const output = codegen.generateFromConfig({
      sectionName: 'Code',
      sectionType: 'code',
      bytes: new Uint8Array([0x3E, 0x42, 0xC9]),
      labels: [{ name: 'START' }],
      data: []
    });

    assert.ok(output.includes('SECTION'));
    assert.ok(output.includes('START:'));
    assert.ok(output.includes('DB'));
  });

  it('should generate project with multiple files', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text', SectionType.CODE);
    section1.appendByte(0xC9);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.data', SectionType.DATA);
    section2.appendByte(0x00);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('globalVar', SymbolType.VARIABLE, SymbolVisibility.GLOBAL, 0, '.data'));

    const codegen = new WlaDxCodegen();
    const output = codegen.generateProject({
      files: [objFile1, objFile2],
      entryPoint: 'main'
    });

    assert.ok(output.includes('main:'));
    assert.ok(output.includes('SECTION'));
  });

  it('should format values correctly', () => {
    const codegen = new WlaDxCodegen();
    assert.strictEqual(codegen.formatValue(255), '$FF');
    assert.strictEqual(codegen.formatValue(0), '$0');
    assert.strictEqual(codegen.formatValue('label'), 'label');
  });
});

describe('Linker', () => {
  it('should link single object file', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.strictEqual(result.success, true);
    assert.ok(result.sections.length > 0);
    assert.ok(result.symbols.length > 0);
  });

  it('should link multiple object files', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text.main', SectionType.CODE);
    section1.appendByte(0xC9);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.main'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.text.helper', SectionType.CODE);
    section2.appendByte(0x3E);
    section2.appendByte(0x01);
    section2.appendByte(0xC9);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text.helper'));

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    const result = linker.link();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.symbols.length, 2);
  });

  it('should detect duplicate global symbols', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text', SectionType.CODE);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.text', SectionType.CODE);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    const result = linker.link();

    assert.ok(result.errors.length > 0);
  });

  it('should resolve weak symbols', () => {
    const objFile1 = new ObjectFile('a.o');
    const section1 = new ObjectSection('.text', SectionType.CODE);
    objFile1.addSection(section1);
    objFile1.addSymbol(new ObjectSymbol('weak_func', SymbolType.FUNCTION, SymbolVisibility.WEAK, 0, '.text'));

    const objFile2 = new ObjectFile('b.o');
    const section2 = new ObjectSection('.text', SectionType.CODE);
    objFile2.addSection(section2);
    objFile2.addSymbol(new ObjectSymbol('weak_func', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile1);
    linker.addObjectFile(objFile2);
    const result = linker.link();

    assert.strictEqual(result.success, true);
  });

  it('should generate WLA DX output', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();
    const output = linker.generateWlaDx();

    assert.ok(output.includes('SECTION'));
    assert.ok(output.includes('OPTION'));
  });

  it('should generate binary output', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();
    const binary = linker.generateBinary();

    assert.ok(binary.length > 0);
  });

  it('should generate map file', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    linker.link();
    const map = linker.generateMap();

    assert.ok(map.includes('Link Map'));
    assert.ok(map.includes('Sections:'));
    assert.ok(map.includes('Symbols:'));
  });

  it('should resolve relocations', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addSymbol(new ObjectSymbol('helper', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'helper', 'call', '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.strictEqual(result.success, true);
  });

  it('should warn on unresolved externals', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'undefined_func', 'call', '.text'));

    const linker = new Linker(new LinkerOptions({ resolveExternals: true }));
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.ok(result.warnings.length > 0);
  });

  it('should error on undefined symbols', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xCD);
    section.appendWord(0x0000);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));
    objFile.addRelocation(new ObjectRelocation(1, 'undefined_func', 'call', '.text'));

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.ok(result.errors.length > 0);
  });
});

describe('link convenience function', () => {
  it('should link array of object files', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const result = link([objFile]);
    assert.strictEqual(result.success, true);
  });

  it('should accept linker options', () => {
    const objFile = new ObjectFile('test.o');
    const section = new ObjectSection('.text', SectionType.CODE);
    section.appendByte(0xC9);
    objFile.addSection(section);
    objFile.addSymbol(new ObjectSymbol('main', SymbolType.FUNCTION, SymbolVisibility.GLOBAL, 0, '.text'));

    const result = link([objFile], new LinkerOptions({ baseAddress: 0x10000 }));
    assert.strictEqual(result.success, true);
  });
});

describe('WlaDxSectionType', () => {
  it('should map code to ROM', () => {
    assert.strictEqual(WlaDxSectionType.code, 'ROM');
  });

  it('should map data to WRAM', () => {
    assert.strictEqual(WlaDxSectionType.data, 'WRAM');
  });

  it('should map bss to WRAM', () => {
    assert.strictEqual(WlaDxSectionType.bss, 'WRAM');
  });

  it('should map rodata to ROM', () => {
    assert.strictEqual(WlaDxSectionType.rodata, 'ROM');
  });
});

describe('LinkerOptions', () => {
  it('should have default values', () => {
    const options = new LinkerOptions();
    assert.strictEqual(options.entryPoint, 'main');
    assert.strictEqual(options.outputFormat, 'wladx');
    assert.strictEqual(options.baseAddress, 0x8000);
  });

  it('should accept custom values', () => {
    const options = new LinkerOptions({
      entryPoint: 'custom_entry',
      baseAddress: 0x10000,
      outputFormat: 'binary'
    });
    assert.strictEqual(options.entryPoint, 'custom_entry');
    assert.strictEqual(options.baseAddress, 0x10000);
    assert.strictEqual(options.outputFormat, 'binary');
  });
});

describe('End-to-end: IR to WLA DX', () => {
  it('should compile IR through linker to WLA DX output', () => {
    const func = new FunctionIR('main');
    const block = new BasicBlock('entry');
    block.add(new LoadInstruction('a', 42));
    block.add(new ReturnInstruction('a'));
    func.addBlock(block);

    const program = new ProgramIR([func], []);

    const converter = new IrToObjectFile('test.c');
    const objFile = converter.convert(program);

    const linker = new Linker();
    linker.addObjectFile(objFile);
    const result = linker.link();

    assert.strictEqual(result.success, true);

    const output = linker.generateWlaDx();
    assert.ok(output.includes('SECTION'));
    assert.ok(output.includes('OPTION'));
  });
});
