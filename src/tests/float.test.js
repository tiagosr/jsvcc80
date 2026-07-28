import { describe, it } from 'mocha';
import assert from 'assert';
import { Lexer, PreprocessedSource } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';
import { CPegParser } from '../parser/cparser.js';
import { Compiler, CompilerOptions } from '../compiler.js';

describe('Float Type Support', () => {
  describe('Float Literal Parsing', () => {
    it('should tokenize float literals with f suffix', () => {
      const lexer = new Lexer('3.14f');
      const tokens = lexer.tokenize();
      const floatToken = tokens.find(t => t.type === TokenType.FLOAT);
      assert.ok(floatToken, 'should have a FLOAT token');
      assert.strictEqual(floatToken.value, '3.14f');
    });

    it('should tokenize float literals without suffix', () => {
      const lexer = new Lexer('3.14');
      const tokens = lexer.tokenize();
      const floatToken = tokens.find(t => t.type === TokenType.FLOAT);
      assert.ok(floatToken, 'should have a FLOAT token');
      assert.strictEqual(floatToken.value, '3.14');
    });

    it('should tokenize float literals with exponent', () => {
      const lexer = new Lexer('1.5e10f');
      const tokens = lexer.tokenize();
      const floatToken = tokens.find(t => t.type === TokenType.FLOAT);
      assert.ok(floatToken, 'should have a FLOAT token');
      assert.strictEqual(floatToken.value, '1.5e10f');
    });

    it('should tokenize float literals starting with decimal', () => {
      const lexer = new Lexer('.5f');
      const tokens = lexer.tokenize();
      const floatToken = tokens.find(t => t.type === TokenType.FLOAT);
      assert.ok(floatToken, 'should have a FLOAT token');
      assert.strictEqual(floatToken.value, '.5f');
    });

    it('should distinguish float from integer literals', () => {
      const lexer = new Lexer('42 3.14');
      const tokens = lexer.tokenize();
      const intToken = tokens.find(t => t.type === TokenType.INTEGER);
      const floatToken = tokens.find(t => t.type === TokenType.FLOAT);
      assert.ok(intToken, 'should have an INTEGER token');
      assert.strictEqual(intToken.value, '42');
      assert.ok(floatToken, 'should have a FLOAT token');
      assert.strictEqual(floatToken.value, '3.14');
    });

    it('should tokenize negative float literals', () => {
      const lexer = new Lexer('-3.14f');
      const tokens = lexer.tokenize();
      const tokensTypes = tokens.map(t => t.type);
      assert.ok(tokensTypes.includes(TokenType.MINUS));
      assert.ok(tokensTypes.includes(TokenType.FLOAT));
    });
  });

  describe('Float Type Parsing', () => {
    it('should parse float type specifier', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float x;').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float declaration');
    });

    it('should parse float variable declaration', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float a;').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float declaration');
    });

    it('should parse float array declaration', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float arr[10];').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float array');
    });

    it('should parse float pointer declaration', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float *ptr;').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float pointer');
    });
  });

  describe('Float Expression Parsing', () => {
    it('should parse float arithmetic expressions', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float x = 1.0 + 2.0;').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float addition');
    });

    it('should parse float mixed expressions', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float x = 1.0 + 2;').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float + int');
    });

    it('should parse float comparison expressions', () => {
      const parser = new CPegParser();
      const tokens = new Lexer('float x = 1.0 < 2.0;').tokenize();
      const result = parser.parse(tokens);
      assert.ok(result, 'should parse float comparison');
    });
  });

  describe('Float IR Translation', () => {
    it('should translate float literals to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          return 3.14;
        }
      `);
      assert.ok(result.success, 'should compile float literal');
      assert.ok(result.code.length > 0, 'should generate code');
      assert.ok(result.code.includes('flt_'), 'should include float data label');
    });

    it('should translate float addition to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 1.0 + 2.0;
          return x;
        }
      `);
      assert.ok(result.success, 'should compile float addition');
      assert.ok(result.code.includes('_float_add'), 'should call _float_add');
    });

    it('should translate float subtraction to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 5.0 - 3.0;
          return x;
        }
      `);
      assert.ok(result.success, 'should compile float subtraction');
      assert.ok(result.code.includes('_float_sub'), 'should call _float_sub');
    });

    it('should translate float multiplication to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 2.0 * 3.0;
          return x;
        }
      `);
      assert.ok(result.success, 'should compile float multiplication');
      assert.ok(result.code.includes('_float_mul'), 'should call _float_mul');
    });

    it('should translate float division to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 6.0 / 2.0;
          return x;
        }
      `);
      assert.ok(result.success, 'should compile float division');
      assert.ok(result.code.includes('_float_div'), 'should call _float_div');
    });

    it('should translate float comparison to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        int main() {
          float x = 1.0;
          float y = 2.0;
          return x < y;
        }
      `);
      assert.ok(result.success, 'should compile float comparison');
      assert.ok(result.code.includes('_float_lt'), 'should call _float_lt');
    });

    it('should translate float equality to IR', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        int main() {
          float x = 1.0;
          float y = 1.0;
          return x == y;
        }
      `);
      assert.ok(result.success, 'should compile float equality');
      assert.ok(result.code.includes('_float_eq'), 'should call _float_eq');
    });
  });

  describe('Float Code Generation', () => {
    it('should generate float data section', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          return 1.5;
        }
      `);
      assert.ok(result.success);
      assert.ok(result.code.includes('flt_'), 'should have float data labels');
    });

    it('should generate float load instructions', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 1.0;
          return x;
        }
      `);
      assert.ok(result.success);
      assert.ok(result.code.includes('ld de, (hl)'), 'should load 4-byte float');
    });

    it('should generate float store instructions', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 1.0 + 2.0;
          return x;
        }
      `);
      assert.ok(result.success);
      assert.ok(result.code.includes('_float_add'), 'should call float add');
    });
  });

  describe('Float End-to-End', () => {
    it('should compile a complete float program', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float a = 3.14;
          float b = 2.71;
          float c = a + b;
          float d = c * 2.0;
          float e = d / 4.0;
          return e;
        }
      `);
      assert.ok(result.success, 'should compile complete float program');
      assert.ok(result.code.includes('_float_add'), 'should have float add');
      assert.ok(result.code.includes('_float_mul'), 'should have float mul');
      assert.ok(result.code.includes('_float_div'), 'should have float div');
      assert.ok(result.code.includes('flt_'), 'should have float data');
    });

    it('should compile float conditional', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        int main() {
          float x = 1.0;
          if (x < 2.0) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile float conditional');
      assert.ok(result.code.includes('_float_lt'), 'should have float lt comparison');
    });

    it('should compile float while loop', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 0.0;
          float sum = 0.0;
          while (x < 10.0) {
            sum = sum + x;
            x = x + 1.0;
          }
          return sum;
        }
      `);
      assert.ok(result.success, 'should compile float while loop');
      assert.ok(result.code.includes('_float_lt'), 'should have float lt');
      assert.ok(result.code.includes('_float_add'), 'should have float add');
    });

    it('should compile float with int mixed operations', () => {
      const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
      const compiler = new Compiler(options);
      const result = compiler.compileSource(`
        float main() {
          float x = 1.0 + 2;
          int y = 3;
          float z = x + y;
          return z;
        }
      `);
      assert.ok(result.success, 'should compile mixed float/int');
      assert.ok(result.code.includes('_float_add'), 'should have float add');
    });
  });
});
