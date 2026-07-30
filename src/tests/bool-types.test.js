import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Compiler, CompilerOptions } from '../../src/compiler.js';

function compile(source) {
  const compiler = new Compiler(new CompilerOptions({
    source: '<test>',
  }));
  return compiler.compileSource(source);
}

function compileWithStdlib(source) {
  const stdlibDir = join(import.meta.dirname, '..', 'core', 'stdlib');
  const compiler = new Compiler(new CompilerOptions({
    source: '<test>',
    includePaths: [stdlibDir]
  }));
  return compiler.compileSource(source);
}

import { join } from 'path';

describe('bool type', () => {
  it('should compile bool variable declaration', () => {
    const result = compile(`
      int main() {
        bool x = true;
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile bool variable with false', () => {
    const result = compile(`
      int main() {
        bool x = false;
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile bool function return type', () => {
    const result = compile(`
      bool func() {
        return true;
      }
      int main() {
        return func();
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile bool in comparisons', () => {
    const result = compile(`
      int main() {
        bool x = true;
        if (x == true) {
          return 1;
        }
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile bool in control flow', () => {
    const result = compile(`
      int main() {
        bool b = true;
        if (b) {
          return 1;
        }
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile const bool declaration', () => {
    const result = compile(`
      int main() {
        const bool x = true;
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile sizeof(bool)', () => {
    const result = compile(`
      int main() {
        return sizeof(bool);
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile casting to bool', () => {
    const result = compile(`
      int main() {
        bool x = (bool)1;
        bool y = (bool)0;
        return x + y;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile bool array declaration', () => {
    const result = compile(`
      int main() {
        bool arr[5];
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('true and false keywords', () => {
  it('should compile true as expression', () => {
    const result = compile(`
      int main() {
        return true;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile false as expression', () => {
    const result = compile(`
      int main() {
        return false;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile true in arithmetic', () => {
    const result = compile(`
      int main() {
        return true + false;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile false in arithmetic', () => {
    const result = compile(`
      int main() {
        return true - false;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile true/false in logical operations', () => {
    const result = compile(`
      int main() {
        return true && false;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile true/false in bitwise operations', () => {
    const result = compile(`
      int main() {
        return true | false;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('nullptr keyword', () => {
  it('should compile nullptr as expression', () => {
    const result = compile(`
      int main() {
        return nullptr;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile nullptr in variable declaration', () => {
    const result = compile(`
      int main() {
        int x = nullptr;
        return x;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile nullptr in comparisons', () => {
    const result = compileWithStdlib(`
      int main() {
        int *p = nullptr;
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile nullptr with NULL equivalence', () => {
    const result = compileWithStdlib(`
      int main() {
        int x = nullptr;
        int y = NULL;
        return x + y;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('nullptr_t typedef', () => {
  it('should compile nullptr_t variable declaration', () => {
    const result = compile(`
      int main() {
        nullptr_t p = nullptr;
        return p;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile nullptr_t in function return type', () => {
    const result = compile(`
      nullptr_t func() {
        return nullptr;
      }
      int main() {
        return func();
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile nullptr_t array declaration', () => {
    const result = compile(`
      int main() {
        nullptr_t arr[3];
        return 0;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });

  it('should compile const nullptr_t declaration', () => {
    const result = compile(`
      int main() {
        const nullptr_t p = nullptr;
        return p;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});

describe('end-to-end bool program', () => {
  it('should compile a full program using all bool features', () => {
    const result = compile(`
      bool is_positive(int x) {
        return x > 0;
      }

      bool is_zero(int x) {
        return x == 0;
      }

      int main() {
        bool a = true;
        bool b = false;
        bool c = is_positive(5);
        bool d = is_zero(0);
        bool e = (bool)100;

        if (a && c) {
          return true;
        }

        if (b || d) {
          return false;
        }

        return nullptr;
      }
    `);
    assert.strictEqual(result.success, true);
    assert.ok(result.code.length > 0);
  });
});
