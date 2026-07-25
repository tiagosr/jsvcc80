import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler, CompilerOptions } from '../../src/compiler.js';

describe('Standard Library - Memory Operations', () => {
  it('should compile memset', () => {
    const source = `
      void *memset(void *s, int c, unsigned int n) {
          unsigned char *p = (unsigned char *)s;
          unsigned int i;
          for (i = 0; i < n; i++) {
              p[i] = (unsigned char)c;
          }
          return s;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
    assert.ok(result.code.includes('ld'));
  });

  it('should compile memcpy', () => {
    const source = `
      void *memcpy(void *dest, const void *src, unsigned int n) {
          unsigned char *d = (unsigned char *)dest;
          const unsigned char *s = (const unsigned char *)src;
          unsigned int i;
          for (i = 0; i < n; i++) {
              d[i] = s[i];
          }
          return dest;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile memcmp', () => {
    const source = `
      int memcmp(const void *s1, const void *s2, unsigned int n) {
          const unsigned char *p1 = (const unsigned char *)s1;
          const unsigned char *p2 = (const unsigned char *)s2;
          unsigned int i;
          for (i = 0; i < n; i++) {
              if (p1[i] != p2[i]) {
                  return p1[i] - p2[i];
              }
          }
          return 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile memmove', () => {
    const source = `
      void *memmove(void *dest, const void *src, unsigned int n) {
          unsigned char *d = (unsigned char *)dest;
          const unsigned char *s = (const unsigned char *)src;
          unsigned int i;
          if (d <= s) {
              for (i = 0; i < n; i++) {
                  d[i] = s[i];
              }
          } else {
              for (i = n; i > 0; i--) {
                  d[i - 1] = s[i - 1];
              }
          }
          return dest;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile memchr', () => {
    const source = `
      void *memchr(const void *s, int c, unsigned int n) {
          const unsigned char *p = (const unsigned char *)s;
          unsigned char uc = (unsigned char)c;
          unsigned int i;
          for (i = 0; i < n; i++) {
              if (p[i] == uc) {
                  return (void *)(p + i);
              }
          }
          return NULL;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile a program using memset', () => {
    const source = `
      void *memset(void *s, int c, unsigned int n) {
          unsigned char *p = (unsigned char *)s;
          unsigned int i;
          for (i = 0; i < n; i++) {
              p[i] = (unsigned char)c;
          }
          return s;
      }

      int main() {
          char buf[10];
          memset(buf, 0, 10);
          return 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });

  it('should compile a program using memcpy', () => {
    const source = `
      void *memcpy(void *dest, const void *src, unsigned int n) {
          unsigned char *d = (unsigned char *)dest;
          const unsigned char *s = (const unsigned char *)src;
          unsigned int i;
          for (i = 0; i < n; i++) {
              d[i] = s[i];
          }
          return dest;
      }

      int main() {
          char src[5] = {1, 2, 3, 4, 5};
          char dst[5];
          memcpy(dst, src, 5);
          return 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });

  it('should compile a program using memcmp', () => {
    const source = `
      int memcmp(const void *s1, const void *s2, unsigned int n) {
          const unsigned char *p1 = (const unsigned char *)s1;
          const unsigned char *p2 = (const unsigned char *)s2;
          unsigned int i;
          for (i = 0; i < n; i++) {
              if (p1[i] != p2[i]) {
                  return p1[i] - p2[i];
              }
          }
          return 0;
      }

      int main() {
          char a[3] = {1, 2, 3};
          char b[3] = {1, 2, 3};
          int result = memcmp(a, b, 3);
          return result;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });

  it('should compile a program using memmove', () => {
    const source = `
      void *memmove(void *dest, const void *src, unsigned int n) {
          unsigned char *d = (unsigned char *)dest;
          const unsigned char *s = (const unsigned char *)src;
          unsigned int i;
          if (d <= s) {
              for (i = 0; i < n; i++) {
                  d[i] = s[i];
              }
          } else {
              for (i = n; i > 0; i--) {
                  d[i - 1] = s[i - 1];
              }
          }
          return dest;
      }

      int main() {
          char buf[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
          memmove(buf + 3, buf, 5);
          return 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });

  it('should compile a program using memchr', () => {
    const source = `
      void *memchr(const void *s, int c, unsigned int n) {
          const unsigned char *p = (const unsigned char *)s;
          unsigned char uc = (unsigned char)c;
          unsigned int i;
          for (i = 0; i < n; i++) {
              if (p[i] == uc) {
                  return (void *)(p + i);
              }
          }
          return NULL;
      }

      int main() {
          char buf[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
          void *found = memchr(buf, 5, 10);
          return found ? 1 : 0;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c', outputFormat: 'wladx' });
    const compiler = new Compiler(options);
    const compileResult = compiler.compileToObjectFile(source);
    assert.strictEqual(compileResult.success, true);

    const linkResult = compiler.link([compileResult]);
    assert.strictEqual(linkResult.success, true);
    assert.ok(linkResult.output.length > 0);
  });
});
