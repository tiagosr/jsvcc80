import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler, CompilerOptions } from '../../src/compiler.js';
import { ObjectFile } from '../../src/linker/objectfile.js';

describe('Compiler - Object File Compilation', () => {
  it('should compile source to object file', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { return 0; }');

    assert.strictEqual(result.success, true);
    assert.ok(result.objectFile instanceof ObjectFile);
    assert.strictEqual(result.objectFile.name, 'test.c');
  });

  it('should produce object file with function symbol', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { return 42; }');

    assert.strictEqual(result.success, true);
    const symbol = result.objectFile.getSymbol('main');
    assert.ok(symbol !== null);
    assert.strictEqual(symbol.name, 'main');
  });

  it('should produce object file with code section', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { return 42; }');

    assert.strictEqual(result.success, true);
    assert.ok(result.objectFile.sections.length > 0);
  });

  it('should handle compilation errors', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('invalid syntax !!!');

    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
  });

  it('should compile multiple functions', () => {
    const source = `
      int helper() { return 1; }
      int main() { return helper(); }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.objectFile.getSymbol('main') !== null);
    assert.ok(result.objectFile.getSymbol('helper') !== null);
  });
});

describe('Compiler - Linking', () => {
  it('should link single object file', () => {
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile('int main() { return 0; }');

    const linkResult = compiler.link([compileResult]);

    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });

  it('should link multiple object files', () => {
    const options1 = new CompilerOptions({ source: 'a.c', outputFormat: 'wladx' });
    const compiler1 = new Compiler(options1);
    const result1 = compiler1.compileToObjectFile('int helper() { return 1; }');

    const options2 = new CompilerOptions({ source: 'b.c', outputFormat: 'wladx' });
    const compiler2 = new Compiler(options2);
    const result2 = compiler2.compileToObjectFile('int main() { return helper(); }');

    const linkerCompiler = new Compiler(new CompilerOptions({ outputFormat: 'wladx' }));
    const linkResult = linkerCompiler.link([result1, result2]);

    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.includes('SECTION'));
  });

  it('should generate link map', () => {
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile('int main() { return 0; }');

    const linkResult = compiler.link([compileResult]);

    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.map.includes('Link Map'));
    assert.ok(linkResult.map.includes('Sections:'));
    assert.ok(linkResult.map.includes('Symbols:'));
  });

  it('should produce binary output when format is binary', () => {
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'binary' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile('int main() { return 0; }');

    const linkResult = compiler.link([compileResult]);

    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.binary instanceof Uint8Array);
  });

  it('should link with all symbols resolved', () => {
    const source1 = 'int helper() { return 1; }';
    const source2 = 'int main() { return helper(); }';

    const opt1 = new CompilerOptions({ source: 'a.c', outputFormat: 'wladx' });
    const c1 = new Compiler(opt1);
    const r1 = c1.compileToObjectFile(source1);

    const opt2 = new CompilerOptions({ source: 'b.c', outputFormat: 'wladx' });
    const c2 = new Compiler(opt2);
    const r2 = c2.compileToObjectFile(source2);

    const linkerCompiler = new Compiler(new CompilerOptions({ outputFormat: 'wladx' }));
    const linkResult = linkerCompiler.link([r1, r2]);

    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });
});

describe('Compiler - End-to-End Pipeline', () => {
  it('should compile simple program to assembly', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource('int main() { return 42; }');

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile program through object file and linker to WLA DX', () => {
    const source = 'int main() { return 42; }';
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);

    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.includes('SECTION'));
    assert.ok(linkResult.output.includes('OPTION'));
  });

  it('should compile program through object file and linker to binary', () => {
    const source = 'int main() { return 42; }';
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'binary' });
    const compiler = new Compiler(options);

    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.binary.length > 0);
  });

  it('should handle global variables in object file', () => {
    const source = 'int globalVar = 10; int main() { return globalVar; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);

    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);
  });

  it('should handle control flow in object file', () => {
    const source = 'int main() { int x = 0; if (x) { x = 1; } return x; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);

    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);
  });
});

describe('CompilerOptions', () => {
  it('should have correct defaults', () => {
    const options = new CompilerOptions();
    assert.strictEqual(options.sourceFile, '<stdin>');
    assert.strictEqual(options.optimizationLevel, 'O0');
    assert.strictEqual(options.compileOnly, false);
    assert.strictEqual(options.outputFormat, 'assembly');
  });

  it('should accept compileOnly option', () => {
    const options = new CompilerOptions({ compileOnly: true });
    assert.strictEqual(options.compileOnly, true);
  });

  it('should accept outputFormat option', () => {
    const options = new CompilerOptions({ outputFormat: 'binary' });
    assert.strictEqual(options.outputFormat, 'binary');
  });

  it('should accept linkerOptions', () => {
    const options = new CompilerOptions({
      linkerOptions: { baseAddress: 0x10000 }
    });
    assert.deepStrictEqual(options.linkerOptions, { baseAddress: 0x10000 });
  });
});
