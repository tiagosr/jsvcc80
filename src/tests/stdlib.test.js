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

  it('should compile strlen', () => {
    const source = `
      unsigned int strlen(const char *s) {
          unsigned int len = 0;
          while (s[len] != '\0') {
              len++;
          }
          return len;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile strcpy', () => {
    const source = `
      char *strcpy(char *dest, const char *src) {
          unsigned int i;
          for (i = 0; ; i++) {
              dest[i] = src[i];
              if (src[i] == '\0') {
                  break;
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

  it('should compile strncpy', () => {
    const source = `
      char *strncpy(char *dest, const char *src, unsigned int n) {
          unsigned int i;
          for (i = 0; i < n; i++) {
              dest[i] = src[i];
              if (src[i] == '\0') {
                  break;
              }
          }
          for (; i < n; i++) {
              dest[i] = '\0';
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

  it('should compile strcmp', () => {
    const source = `
      int strcmp(const char *s1, const char *s2) {
          unsigned int i;
          for (i = 0; ; i++) {
              if (s1[i] != s2[i]) {
                  return s1[i] - s2[i];
              }
              if (s1[i] == '\0') {
                  return 0;
              }
          }
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile strcat', () => {
    const source = `
      char *strcat(char *dest, const char *src) {
          unsigned int destLen = 0;
          unsigned int i;
          while (dest[destLen] != '\0') {
              destLen++;
          }
          for (i = 0; ; i++) {
              dest[destLen + i] = src[i];
              if (src[i] == '\0') {
                  break;
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

  it('should compile strchr', () => {
    const source = `
      char *strchr(const char *s, int c) {
          unsigned int i;
          char uc = (char)c;
          for (i = 0; ; i++) {
              if (s[i] == uc) {
                  return (char *)(s + i);
              }
              if (s[i] == '\0') {
                  return NULL;
              }
          }
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile strtoi', () => {
    const source = `
      int strtoi(const char *s) {
          int result = 0;
          int sign = 1;
          unsigned int i = 0;
          while (s[i] == ' ' || s[i] == '\t' || s[i] == '\n') {
              i++;
          }
          if (s[i] == '-') {
              sign = -1;
              i++;
          } else if (s[i] == '+') {
              i++;
          }
          while (s[i] >= '0' && s[i] <= '9') {
              result = result * 10 + (s[i] - '0');
              i++;
          }
          return result * sign;
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile atoi', () => {
    const source = `
      int atoi(const char *s) {
          return strtoi(s);
      }
    `;
    const options = new CompilerOptions({ source: 'test.c' });
    const compiler = new Compiler(options);
    const result = compiler.compileSource(source);

    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile a program using strlen', () => {
    const source = `
      unsigned int strlen(const char *s) {
          unsigned int len = 0;
          while (s[len] != '\0') {
              len++;
          }
          return len;
      }

      int main() {
          char *str = "hello";
          unsigned int len = strlen(str);
          return len;
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

  it('should compile a program using strcpy', () => {
    const source = `
      char *strcpy(char *dest, const char *src) {
          unsigned int i;
          for (i = 0; ; i++) {
              dest[i] = src[i];
              if (src[i] == '\0') {
                  break;
              }
          }
          return dest;
      }

      int main() {
          char src[6] = "hello";
          char dst[10];
          strcpy(dst, src);
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

  it('should compile a program using strncpy', () => {
    const source = `
      char *strncpy(char *dest, const char *src, unsigned int n) {
          unsigned int i;
          for (i = 0; i < n; i++) {
              dest[i] = src[i];
              if (src[i] == '\0') {
                  break;
              }
          }
          for (; i < n; i++) {
              dest[i] = '\0';
          }
          return dest;
      }

      int main() {
          char src[6] = "hello";
          char dst[10];
          strncpy(dst, src, 10);
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

  it('should compile a program using strcmp', () => {
    const source = `
      int strcmp(const char *s1, const char *s2) {
          unsigned int i;
          for (i = 0; ; i++) {
              if (s1[i] != s2[i]) {
                  return s1[i] - s2[i];
              }
              if (s1[i] == '\0') {
                  return 0;
              }
          }
      }

      int main() {
          char a[6] = "hello";
          char b[6] = "hello";
          char c[6] = "world";
          int r1 = strcmp(a, b);
          int r2 = strcmp(a, c);
          return r1 + (r2 < 0 ? 1 : 0);
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

  it('should compile a program using strcat', () => {
    const source = `
      char *strcat(char *dest, const char *src) {
          unsigned int destLen = 0;
          unsigned int i;
          while (dest[destLen] != '\0') {
              destLen++;
          }
          for (i = 0; ; i++) {
              dest[destLen + i] = src[i];
              if (src[i] == '\0') {
                  break;
              }
          }
          return dest;
      }

      int main() {
          char buf[20] = "hello";
          strcat(buf, " world");
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

  it('should compile a program using strchr', () => {
    const source = `
      char *strchr(const char *s, int c) {
          unsigned int i;
          char uc = (char)c;
          for (i = 0; ; i++) {
              if (s[i] == uc) {
                  return (char *)(s + i);
              }
              if (s[i] == '\0') {
                  return NULL;
              }
          }
      }

      int main() {
          char *str = "hello world";
          char *found = strchr(str, 'w');
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

  it('should compile a program using strtoi', () => {
    const source = `
      int strtoi(const char *s) {
          int result = 0;
          int sign = 1;
          unsigned int i = 0;
          while (s[i] == ' ' || s[i] == '\t' || s[i] == '\n') {
              i++;
          }
          if (s[i] == '-') {
              sign = -1;
              i++;
          } else if (s[i] == '+') {
              i++;
          }
          while (s[i] >= '0' && s[i] <= '9') {
              result = result * 10 + (s[i] - '0');
              i++;
          }
          return result * sign;
      }

      int main() {
          char *str = "42";
          int val = strtoi(str);
          return val;
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

  it('should compile a program using strtoi with negative', () => {
    const source = `
      int strtoi(const char *s) {
          int result = 0;
          int sign = 1;
          unsigned int i = 0;
          while (s[i] == ' ' || s[i] == '\t' || s[i] == '\n') {
              i++;
          }
          if (s[i] == '-') {
              sign = -1;
              i++;
          } else if (s[i] == '+') {
              i++;
          }
          while (s[i] >= '0' && s[i] <= '9') {
              result = result * 10 + (s[i] - '0');
              i++;
          }
          return result * sign;
      }

      int main() {
          char *str = "-17";
          int val = strtoi(str);
          return val;
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

  it('should compile a program using atoi', () => {
    const source = `
      int strtoi(const char *s) {
          int result = 0;
          int sign = 1;
          unsigned int i = 0;
          while (s[i] == ' ' || s[i] == '\t' || s[i] == '\n') {
              i++;
          }
          if (s[i] == '-') {
              sign = -1;
              i++;
          } else if (s[i] == '+') {
              i++;
          }
          while (s[i] >= '0' && s[i] <= '9') {
              result = result * 10 + (s[i] - '0');
              i++;
          }
          return result * sign;
      }

      int atoi(const char *s) {
          return strtoi(s);
      }

      int main() {
          char *str = "123";
          int val = atoi(str);
          return val;
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
