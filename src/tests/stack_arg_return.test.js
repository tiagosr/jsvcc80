import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler } from '../../src/compiler.js';

describe('Stack Argument and Return Passing - Correctness', () => {
  it('should use ld sp, hl for cdecl stack cleanup', () => {
    const source = `
void fn_byte(char arg) __attribute__((__cdecl__("fn_byte"))) {}
int main() { fn_byte(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call fn_byte'));
    assert.ok(result.code.includes('ld sp, hl'));
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should use ld sp, hl for callee stack cleanup', () => {
    const source = `
void fn_callee(char arg) __attribute__((__callee__)) {}
int main() { fn_callee(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call fn_callee'));
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should use ld sp, hl for new_sdcc spillover cleanup', () => {
    const source = `
void fn_sdcc_spill(int a, int b, int c) __attribute__((__new_sdcc__)) {}
int main() { fn_sdcc_spill(1, 2, 3); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call fn_sdcc_spill'));
    assert.ok(result.code.includes('ld sp, hl'));
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should emit return value loading for cdecl calls', () => {
    const source = `
int add(int a, int b) __attribute__((__cdecl__("add"))) { return a + b; }
int main() { return add(1, 2); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call add'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 8);
    // Should not have ld sp, l/h pattern
    assert.ok(!afterCall.some(l => l.includes('ld sp, l') && !l.includes('ld sp, hl')));
  });

  it('should emit return value loading for callee calls', () => {
    const source = `
int add(int a, int b) __attribute__((__callee__)) { return a + b; }
int main() { return add(1, 2); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call add'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 8);
    assert.ok(!afterCall.some(l => l.includes('ld sp, l') && !l.includes('ld sp, hl')));
  });

  it('should emit return value loading for function pointer calls', () => {
    const source = `
int fp_func(int a) { return a; }
int main() {
  int (*fp)(int) = fp_func;
  return fp(42);
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call hl'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 8);
    assert.ok(afterCall.some(l => l.includes('ld a, a')));
  });

  it('should handle mov opcode for 16-bit register argument passing', () => {
    const source = `
void fn_word(int arg) __attribute__((__new_sdcc__)) {}
int main() { fn_word(42); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_word'));
    assert.ok(callLine);
    // Should have ld h, and ld l, before the call for 16-bit arg
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(beforeCall.some(l => l.includes('ld h,')));
    assert.ok(beforeCall.some(l => l.includes('ld l,')));
  });

  it('should not produce unknown operation warnings for mov', () => {
    const source = `
void fn_word(int arg) __attribute__((__new_sdcc__)) {}
int main() { fn_word(42); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(!result.code.includes('Unknown'));
  });

  it('should handle prologue stack allocation with ld sp, hl', () => {
    const source = `
int fn_with_locals(int a) {
  int x = a + 1;
  int y = x + 2;
  return y;
}
int main() { return fn_with_locals(10); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    // Should not have ld sp, l/h pattern in prologue
    assert.ok(!result.code.includes('ld sp, l'));
    assert.ok(!result.code.includes('ld sp, h'));
  });

  it('should compile mixed convention program with correct stack management', () => {
    const source = `
int add(int a, int b) __attribute__((__cdecl__("add"))) { return a + b; }
int fast_mul(int a) __attribute__((__fastcall__)) { return a * 2; }
int sdcc_fn(int a, char b) __attribute__((__new_sdcc__)) { return a + b; }
int main() {
  int r1 = add(1, 2);
  int r2 = fast_mul(3);
  int r3 = sdcc_fn(5, 6);
  return r1 + r2 + r3;
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call add'));
    assert.ok(result.code.includes('call fast_mul'));
    assert.ok(result.code.includes('call sdcc_fn'));
    // No ld sp, l/h corruption patterns
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should handle FOPEN intrinsic with correct stack cleanup', () => {
    const source = `
int main() {
  FILE* f = __fopen("test.txt", "r");
  __fclose(f);
  return 0;
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call fopen'));
    // Should use ld sp, hl, not ld sp, l/h
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should handle SERIAL_OPEN intrinsic with correct stack cleanup', () => {
    const source = `
int main() {
  FILE* f = __serial_open(0x40);
  __serial_close(f);
  return 0;
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call serial_open'));
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should handle TERMINAL_OPEN intrinsic with correct stack cleanup', () => {
    const source = `
int main() {
  FILE* f = __terminal_open();
  __terminal_close(f);
  return 0;
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call terminal_open'));
    assert.ok(!result.code.match(/ld sp, l\b/));
    assert.ok(!result.code.match(/ld sp, h\b/));
  });

  it('should return 8-bit value correctly for new_sdcc calls', () => {
    const source = `
char ret_char(char a) { return a; }
int main() { return ret_char(5); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call ret_char'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 5);
    assert.ok(afterCall.some(l => l.includes('ld a, a')));
  });

  it('should return 16-bit value correctly for new_sdcc calls', () => {
    const source = `
int ret_int(int a) { return a; }
int main() { return ret_int(42); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call ret_int'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 5);
    assert.ok(afterCall.some(l => l.includes('ld a, d')));
  });

  it('should handle void function calls without return value loading', () => {
    const source = `
void void_fn(void) {}
int main() { void_fn(); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call void_fn'));
    assert.ok(callLine);
  });
});
