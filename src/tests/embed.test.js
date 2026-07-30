import { describe, it, beforeEach, afterEach } from 'mocha';
import assert from 'assert';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Lexer, PreprocessedSource } from '../preprocessor/lexer.js';
import { TokenType } from '../preprocessor/tokenTypes.js';

describe('Preprocessor - #embed directive', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `vcc80-embed-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir) {
      try { rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  function writeTestFile(filename, content) {
    const p = join(testDir, filename);
    writeFileSync(p, content, 'utf-8');
    return p;
  }

  function writeBinaryFile(filename, bytes) {
    const p = join(testDir, filename);
    writeFileSync(p, bytes);
    return p;
  }

  function tokenize(source) {
    const lexer = new Lexer(source);
    return lexer.tokenize();
  }

  function tokenizeWithPaths(source, includePaths) {
    const preprocessor = new PreprocessedSource('<input>', { includePaths });
    const lexer = new Lexer(source, preprocessor);
    return lexer.tokenize();
  }

  describe('basic embed', () => {
    it('should embed a binary file as comma-separated integers', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      writeBinaryFile('data.bin', bytes);

      const source = `#embed "${writeBinaryFile('data.bin', bytes)}"
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 5);
      assert.strictEqual(integers[0].value, '1');
      assert.strictEqual(integers[1].value, '2');
      assert.strictEqual(integers[2].value, '3');
      assert.strictEqual(integers[3].value, '4');
      assert.strictEqual(integers[4].value, '5');
    });

    it('should embed with angle brackets when path is in includePaths', () => {
      writeBinaryFile('data.bin', new Uint8Array([10, 20, 30]));

      const source = `#embed <data.bin>
int x;`;

      const tokens = tokenizeWithPaths(source, [testDir]);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
      assert.strictEqual(integers[0].value, '10');
      assert.strictEqual(integers[1].value, '20');
      assert.strictEqual(integers[2].value, '30');
    });
  });

  describe('limit attribute', () => {
    it('should limit embedded bytes to specified count', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(5))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 5);
      assert.strictEqual(integers[0].value, '1');
      assert.strictEqual(integers[1].value, '2');
      assert.strictEqual(integers[2].value, '3');
      assert.strictEqual(integers[3].value, '4');
      assert.strictEqual(integers[4].value, '5');
    });

    it('should handle limit larger than file size', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(100))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
    });

    it('should handle limit(0) producing no bytes', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(0))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 0);
    });
  });

  describe('offset attribute', () => {
    it('should skip specified number of bytes from start', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

      const source = `#embed "${join(testDir, 'data.bin')}" (offset(3))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 7);
      assert.strictEqual(integers[0].value, '4');
      assert.strictEqual(integers[1].value, '5');
      assert.strictEqual(integers[2].value, '6');
      assert.strictEqual(integers[3].value, '7');
      assert.strictEqual(integers[4].value, '8');
      assert.strictEqual(integers[5].value, '9');
      assert.strictEqual(integers[6].value, '10');
    });

    it('should handle offset equal to file size', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (offset(3))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 0);
    });
  });

  describe('limit and offset combination', () => {
    it('should apply both offset and limit correctly', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(3), offset(5))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
      assert.strictEqual(integers[0].value, '6');
      assert.strictEqual(integers[1].value, '7');
      assert.strictEqual(integers[2].value, '8');
    });

    it('should handle limit and offset in reverse order', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

      const source = `#embed "${join(testDir, 'data.bin')}" (offset(5), limit(3))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
      assert.strictEqual(integers[0].value, '6');
      assert.strictEqual(integers[1].value, '7');
      assert.strictEqual(integers[2].value, '8');
    });
  });

  describe('prefix attribute', () => {
    it('should prepend prefix content before byte values', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (prefix(comma,))
int x;`;

      const tokens = tokenize(source);
      const commas = tokens.filter(t => t.type === TokenType.COMMA);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(commas.length, 1);
      assert.strictEqual(commas[0].value, ',');
      assert.strictEqual(integers.length, 3);
    });

    it('should prepend numeric prefix before byte values', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (prefix(0,))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 4);
      assert.strictEqual(integers[0].value, '0');
      assert.strictEqual(integers[1].value, '1');
      assert.strictEqual(integers[2].value, '2');
      assert.strictEqual(integers[3].value, '3');
    });
  });

  describe('suffix attribute', () => {
    it('should append suffix content after byte values', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (suffix(comma,))
int x;`;

      const tokens = tokenize(source);
      const commas = tokens.filter(t => t.type === TokenType.COMMA);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
      assert.strictEqual(commas.length, 1);
      assert.strictEqual(commas[0].value, ',');
    });

    it('should append numeric suffix after byte values', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (suffix(0,))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 4);
      assert.strictEqual(integers[0].value, '1');
      assert.strictEqual(integers[1].value, '2');
      assert.strictEqual(integers[2].value, '3');
      assert.strictEqual(integers[3].value, '0');
    });
  });

  describe('prefix and suffix combination', () => {
    it('should apply both prefix and suffix correctly', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (prefix(0, comma, suffix(4,))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);
      const commas = tokens.filter(t => t.type === TokenType.COMMA);

      assert.strictEqual(integers.length, 5);
      assert.strictEqual(integers[0].value, '0');
      assert.strictEqual(integers[1].value, '4');
      assert.strictEqual(integers[2].value, '1');
      assert.strictEqual(integers[3].value, '2');
      assert.strictEqual(integers[4].value, '3');
      assert.strictEqual(commas.length, 3);
    });

    it('should work with all attributes combined', () => {
      writeBinaryFile('data.bin', new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(4), offset(2), prefix(0, comma, suffix(9,))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);
      const commas = tokens.filter(t => t.type === TokenType.COMMA);

      assert.strictEqual(integers.length, 6);
      assert.strictEqual(integers[0].value, '0');
      assert.strictEqual(integers[1].value, '9');
      assert.strictEqual(integers[2].value, '2');
      assert.strictEqual(integers[3].value, '3');
      assert.strictEqual(integers[4].value, '4');
      assert.strictEqual(integers[5].value, '5');
      assert.strictEqual(commas.length, 3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty binary file', () => {
      writeBinaryFile('data.bin', new Uint8Array([]));

      const source = `#embed "${join(testDir, 'data.bin')}"
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 0);
    });

    it('should handle empty binary file with prefix', () => {
      writeBinaryFile('data.bin', new Uint8Array([]));

      const source = `#embed "${join(testDir, 'data.bin')}" (prefix(0, comma,))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);
      const commas = tokens.filter(t => t.type === TokenType.COMMA);

      assert.strictEqual(integers.length, 1);
      assert.strictEqual(integers[0].value, '0');
      assert.strictEqual(commas.length, 2);
    });

    it('should handle single byte file', () => {
      writeBinaryFile('data.bin', new Uint8Array([255]));

      const source = `#embed "${join(testDir, 'data.bin')}"
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 1);
      assert.strictEqual(integers[0].value, '255');
    });

    it('should handle 256 byte file (full byte range)', () => {
      const bytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) bytes[i] = i;
      writeBinaryFile('data.bin', bytes);

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(5))
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 5);
      assert.strictEqual(integers[0].value, '0');
      assert.strictEqual(integers[1].value, '1');
      assert.strictEqual(integers[2].value, '2');
      assert.strictEqual(integers[3].value, '3');
      assert.strictEqual(integers[4].value, '4');
    });
  });

  describe('error cases', () => {
    it('should error on non-existent embed file', () => {
      const source = `#embed "${join(testDir, 'nonexistent.bin')}"
int x;`;

      assert.throws(() => tokenize(source), /Cannot open embed file/);
    });

    it('should error on offset exceeding file size', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (offset(10))
int x;`;

      assert.throws(() => tokenize(source), /Embed offset.*exceeds file size/);
    });

    it('should error on invalid attribute syntax', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limitabc)
int x;`;

      assert.throws(() => tokenize(source), /Expected '\('/);
    });

    it('should error on missing closing parenthesis', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}" (limit(5
int x;`;

      assert.throws(() => tokenize(source), /Unclosed parenthesis/);
    });

    it('should error on invalid embed directive format', () => {
      const source = `#embed no_quotes_or_angles
int x;`;

      assert.throws(() => tokenize(source), /Invalid #embed directive/);
    });
  });

  describe('conditional blocks', () => {
    it('should skip embed in inactive #if block', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#if 0
#embed "${join(testDir, 'data.bin')}"
#endif
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 0);
    });

    it('should process embed in active #if block', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#if 1
#embed "${join(testDir, 'data.bin')}"
#endif
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
    });

    it('should skip embed in inactive #ifdef block', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#undef NONEXISTENT_MACRO
#ifdef NONEXISTENT_MACRO
#embed "${join(testDir, 'data.bin')}"
#endif
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 0);
    });
  });

  describe('location tracking', () => {
    it('should preserve source location on embed tokens', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#embed "${join(testDir, 'data.bin')}"
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      for (const integer of integers) {
        assert.ok(integer.location);
        assert.strictEqual(integer.location.file, '<input>');
      }
    });
  });

  describe('multiple embed directives', () => {
    it('should handle multiple embed directives in sequence', () => {
      writeBinaryFile('data1.bin', new Uint8Array([1, 2]));
      writeBinaryFile('data2.bin', new Uint8Array([3, 4]));

      const source = `#embed "${join(testDir, 'data1.bin')}"
#embed "${join(testDir, 'data2.bin')}"
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 4);
      assert.strictEqual(integers[0].value, '1');
      assert.strictEqual(integers[1].value, '2');
      assert.strictEqual(integers[2].value, '3');
      assert.strictEqual(integers[3].value, '4');
    });
  });

  describe('macro interaction', () => {
    it('should expand macros before processing embed', () => {
      writeBinaryFile('data.bin', new Uint8Array([1, 2, 3]));

      const source = `#define PATH "${join(testDir, 'data.bin')}"
#embed PATH
int x;`;

      const tokens = tokenize(source);
      const integers = tokens.filter(t => t.type === TokenType.INTEGER);

      assert.strictEqual(integers.length, 3);
    });
  });
});
