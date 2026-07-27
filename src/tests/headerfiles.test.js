import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Compiler, CompilerOptions } from '../../src/compiler.js';

const stdlibDir = join(import.meta.dirname, '..', 'core', 'stdlib');

const headers = ['stdint.h', 'stdlib.h', 'stdio.h', 'file.h'];

function compile(source) {
  const compiler = new Compiler(new CompilerOptions({
    source: '<test>',
    includePaths: [stdlibDir]
  }));
  return compiler.compileSource(source);
}

describe('Header File Existence', () => {
  it('should have stdint.h on disk', () => {
    assert.strictEqual(existsSync(join(stdlibDir, 'stdint.h')), true);
  });

  it('should have stdlib.h on disk', () => {
    assert.strictEqual(existsSync(join(stdlibDir, 'stdlib.h')), true);
  });

  it('should have stdio.h on disk', () => {
    assert.strictEqual(existsSync(join(stdlibDir, 'stdio.h')), true);
  });

  it('should have file.h on disk', () => {
    assert.strictEqual(existsSync(join(stdlibDir, 'file.h')), true);
  });

  it('should have all header files', () => {
    for (const h of headers) {
      assert.strictEqual(existsSync(join(stdlibDir, h)), true, `${h} should exist`);
    }
  });
});

describe('stdint.h Include', () => {
  it('should compile with typedefs uint8_t uint16_t uint32_t', () => {
    const result = compile(`
      int main() {
        uint8_t x = 42;
        uint16_t y = 1000;
        uint32_t z = 65535;
        return x + y + z;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with typedefs int8_t int16_t int32_t', () => {
    const result = compile(`
      int main() {
        int8_t x = -1;
        int16_t y = -1000;
        int32_t z = -65535;
        return x + y + z;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with typedefs size_t ptrdiff_t uintptr_t intptr_t', () => {
    const result = compile(`
      int main() {
        size_t s = 100;
        ptrdiff_t p = -50;
        uintptr_t u = 0xFFFF;
        intptr_t i = -1;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('stdint.h Constants', () => {
  it('should compile with NULL constant', () => {
    const result = compile(`
      int main() {
        int x = NULL;
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with EOF constant', () => {
    const result = compile(`
      int main() {
        int x = EOF;
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with SIZE_MAX constant', () => {
    const result = compile(`
      int main() {
        unsigned int x = SIZE_MAX;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with INT_MAX and INT_MIN constants', () => {
    const result = compile(`
      int main() {
        int x = INT_MAX;
        int y = INT_MIN;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with UINT_MAX and CHAR_BIT constants', () => {
    const result = compile(`
      int main() {
        unsigned int x = UINT_MAX;
        int y = CHAR_BIT;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('stdlib.h Include', () => {
  it('should compile with memset declaration', () => {
    const result = compile(`
      int main() {
        char buf[10];
        memset(buf, 0, 10);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with memcpy declaration', () => {
    const result = compile(`
      int main() {
        char dest[10];
        char src[10];
        memcpy(dest, src, 10);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with memmove declaration', () => {
    const result = compile(`
      int main() {
        char buf[10];
        memmove(buf, buf, 5);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with memcmp declaration', () => {
    const result = compile(`
      int main() {
        char a[10];
        char b[10];
        int c = memcmp(a, b, 10);
        return c;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with memchr declaration', () => {
    const result = compile(`
      int main() {
        char buf[10];
        void *p = memchr(buf, 'A', 10);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with atoi declaration', () => {
    const result = compile(`
      int main() {
        char *s = "42";
        int x = atoi(s);
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with strtoi declaration', () => {
    const result = compile(`
      int main() {
        char *s = "100";
        int x = strtoi(s);
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('stdio.h Include', () => {
  it('should compile with __fputc declaration', () => {
    const result = compile(`
      int main() {
        FILE stream;
        __fputc(65, &stream);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __fgetc declaration', () => {
    const result = compile(`
      int main() {
        FILE stream;
        int c = __fgetc(&stream);
        return c;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __feof declaration', () => {
    const result = compile(`
      int main() {
        FILE stream;
        int eof = __feof(&stream);
        return eof;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __ferror declaration', () => {
    const result = compile(`
      int main() {
        FILE stream;
        int err = __ferror(&stream);
        return err;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __fopen declaration', () => {
    const result = compile(`
      int main() {
        FILE *f = __fopen("test.txt", "r");
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __fclose declaration', () => {
    const result = compile(`
      int main() {
        FILE *f;
        __fclose(f);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __serial_open declaration', () => {
    const result = compile(`
      int main() {
        FILE *serial = __serial_open(0x60);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __serial_close declaration', () => {
    const result = compile(`
      int main() {
        FILE *serial;
        __serial_close(serial);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __serial_read declaration', () => {
    const result = compile(`
      int main() {
        FILE *serial;
        int c = __serial_read(serial);
        return c;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __serial_write declaration', () => {
    const result = compile(`
      int main() {
        FILE *serial;
        __serial_write(65, serial);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __serial_available declaration', () => {
    const result = compile(`
      int main() {
        FILE *serial;
        int avail = __serial_available(serial);
        return avail;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __terminal_open declaration', () => {
    const result = compile(`
      int main() {
        FILE *term = __terminal_open();
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with __terminal_close declaration', () => {
    const result = compile(`
      int main() {
        FILE *term;
        __terminal_close(term);
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('file.h Include', () => {
  it('should compile with FILE struct typedef', () => {
    const result = compile(`
      int main() {
        FILE f;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with FILE pointer', () => {
    const result = compile(`
      int main() {
        FILE *f;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('file.h Struct Fields', () => {
  it('should compile accessing streamType field', () => {
    const result = compile(`
      int main() {
        FILE f;
        char t = f.streamType;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile accessing flags field', () => {
    const result = compile(`
      int main() {
        FILE f;
        char fl = f.flags;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile accessing port field', () => {
    const result = compile(`
      int main() {
        FILE f;
        int p = f.port;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile accessing device field', () => {
    const result = compile(`
      int main() {
        FILE f;
        int d = f.device;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile accessing buffer field', () => {
    const result = compile(`
      int main() {
        FILE f;
        char b = f.buffer;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile accessing bufSize field', () => {
    const result = compile(`
      int main() {
        FILE f;
        int s = f.bufSize;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile accessing bufPos field', () => {
    const result = compile(`
      int main() {
        FILE f;
        int p = f.bufPos;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile writing to streamType field', () => {
    const result = compile(`
      int main() {
        FILE f;
        f.streamType = 1;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('file.h Stream Constants', () => {
  it('should compile with STREAM_FILESYSTEM constant', () => {
    const result = compile(`
      int main() {
        int t = STREAM_FILESYSTEM;
        return t;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with STREAM_SERIAL constant', () => {
    const result = compile(`
      int main() {
        int t = STREAM_SERIAL;
        return t;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile with STREAM_TERMINAL constant', () => {
    const result = compile(`
      int main() {
        int t = STREAM_TERMINAL;
        return t;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('stdio.h Includes file.h', () => {
  it('should compile stdio.h without duplicate FILE definition errors', () => {
    const result = compile(`
#include <stdio.h>
int main() {
  FILE *f = __fopen("test", "r");
  return 0;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });
});

describe('stdlib.h Includes stdint.h', () => {
  it('should compile stdlib.h without errors from implicit stdint.h', () => {
    const result = compile(`
#include <stdlib.h>
int main() {
  char buf[10];
  memset(buf, 0, 10);
  int x = atoi("42");
  return x;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });
});

describe('Multiple Header Includes', () => {
  it('should compile all 4 headers together', () => {
    const result = compile(`
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <file.h>
int main() {
  uint8_t x = 42;
  char buf[10];
  memset(buf, 0, 10);
  FILE f;
  f.streamType = STREAM_FILESYSTEM;
  int c = atoi("100");
  return x + c;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });
});

describe('pragma once', () => {
  it('should work with #pragma once in headers', () => {
    const result = compile(`
#pragma once
int main() {
  return 0;
}
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should include header twice without errors when it has #pragma once', () => {
    const result = compile(`
#include <stdint.h>
#include <stdint.h>
int main() {
  uint8_t x = 42;
  return x;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });
});

describe('Nested Include Guards', () => {
  it('should include stdio.h twice without errors (nested includes)', () => {
    const result = compile(`
#include <stdio.h>
#include <stdio.h>
int main() {
  FILE stream;
  __fputc(65, &stream);
  return 0;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });

  it('should include all headers twice without errors', () => {
    const result = compile(`
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <file.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <file.h>
int main() {
  uint8_t x = 42;
  FILE f;
  f.streamType = STREAM_SERIAL;
  return x;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });

  it('should include stdlib.h which includes stdint.h twice without errors', () => {
    const result = compile(`
#include <stdlib.h>
#include <stdlib.h>
int main() {
  char buf[10];
  memset(buf, 0, 10);
  return 0;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });

  it('should include stdio.h which includes file.h twice without errors', () => {
    const result = compile(`
#include <stdio.h>
#include <stdio.h>
int main() {
  FILE *f = __fopen("test", "r");
  __fclose(f);
  return 0;
}
    `);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.code.length > 0);
  });
});
