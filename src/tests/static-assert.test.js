import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler, CompilerOptions } from '../../src/compiler.js';

describe('static_assert - Passing (expression evaluates to non-zero)', () => {
  it('should pass static_assert(1, "fail") - literal 1 is true', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(0xFF, "fail") - hex literal is true', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(0xFF, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(true, "fail") - bool true is true', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(true, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 + 1, "fail") - arithmetic', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 + 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 + 1 == 2, "fail") - comparison', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 + 1 == 2, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 << 3 == 8, "fail") - shift', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 << 3 == 8, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(sizeof(int) == 2, "fail") - sizeof int', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(sizeof(int) == 2, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(sizeof(char) == 1, "fail") - sizeof char', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(sizeof(char) == 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 || 0, "fail") - logical or', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 || 0, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 && 1, "fail") - logical and', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 && 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(!0, "fail") - unary not', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(!0, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(-1, "fail") - unary minus', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(-1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 == 1, "fail") - equality', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 == 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 != 2, "fail") - inequality', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 != 2, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 < 2, "fail") - less than', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 < 2, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(2 > 1, "fail") - greater than', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(2 > 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 <= 1, "fail") - less or equal', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 <= 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(2 >= 2, "fail") - greater or equal', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(2 >= 2, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 & 1, "fail") - bitwise and', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 & 1, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 | 0, "fail") - bitwise or', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 | 0, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(1 ^ 0, "fail") - bitwise xor', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 ^ 0, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });
});

describe('static_assert - Failing (expression evaluates to 0)', () => {
  it('should fail static_assert(0, "fail") - literal 0 is false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(0, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(false, "fail") - bool false is false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(false, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(nullptr, "fail") - nullptr is 0', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(nullptr, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 + 1 == 3, "fail") - false comparison', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 + 1 == 3, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 << 3 == 7, "fail") - false shift comparison', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 << 3 == 7, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(sizeof(int) == 4, "fail") - false sizeof', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(sizeof(int) == 4, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(0 || 0, "fail") - logical or false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(0 || 0, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(0 && 1, "fail") - logical and false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(0 && 1, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(!1, "fail") - unary not false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(!1, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 == 2, "fail") - equality false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 == 2, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 != 1, "fail") - inequality false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 != 1, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(2 < 1, "fail") - less than false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(2 < 1, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 > 2, "fail") - greater than false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 > 2, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(2 <= 1, "fail") - less or equal false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(2 <= 1, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 >= 2, "fail") - greater or equal false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 >= 2, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 & 0, "fail") - bitwise and false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 & 0, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(0 | 0, "fail") - bitwise or false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(0 | 0, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });

  it('should fail static_assert(1 ^ 1, "fail") - bitwise xor false', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(1 ^ 1, "fail"); return 0; }');
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('fail')));
  });
});

describe('static_assert - Complex expressions', () => {
  it('should pass static_assert((1 + 2) * 3 == 9, "fail") - nested arithmetic', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert((1 + 2) * 3 == 9, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(sizeof(int) + sizeof(char) == 3, "fail") - sizeof arithmetic', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(sizeof(int) + sizeof(char) == 3, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should pass static_assert(0xFF + 1 == 256, "fail") - hex arithmetic', () => {
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile('int main() { static_assert(0xFF + 1 == 256, "fail"); return 0; }');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });
});

describe('static_assert - Multiple assertions', () => {
  it('should pass multiple static_assert in same file', () => {
    const source = `
      int main() {
        static_assert(1, "first");
        static_assert(2, "second");
        static_assert(3, "third");
        return 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should fail when second static_assert fails in same file', () => {
    const source = `
      int main() {
        static_assert(1, "first");
        static_assert(0, "second");
        return 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);
    assert.strictEqual(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('second')));
  });
});

describe('static_assert - In function body', () => {
  it('should pass static_assert inside int main() function body', () => {
    const source = 'int main() { static_assert(1, "x"); return 0; }';
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileToObjectFile(source);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });
});
