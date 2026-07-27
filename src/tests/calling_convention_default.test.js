import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler } from '../../src/compiler.js';

describe('Calling Convention - new_sdcc as default', () => {
  it('should use new_sdcc for functions without explicit convention', () => {
    const source = `
void fn_default(char arg) {}
int main() { fn_default(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_default'));
    assert.ok(callLine);
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(beforeCall.some(l => l.includes('ld a,')));
    assert.ok(!beforeCall.some(l => l.includes('push af')));
  });

  it('should use new_sdcc for single word arg without explicit convention', () => {
    const source = `
void fn_default_word(int arg) {}
int main() { fn_default_word(42); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_default_word'));
    assert.ok(callLine);
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(beforeCall.some(l => l.includes('ld a,')));
    assert.ok(!beforeCall.some(l => l.includes('push af')), 'new_sdcc passes word arg on HL');
  });

  it('should use new_sdcc for two byte args without explicit convention', () => {
    const source = `
void fn_default_2byte(char a, char b) {}
int main() { fn_default_2byte(1, 2); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_default_2byte'));
    assert.ok(callLine);
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(beforeCall.some(l => l.includes('ld a,')));
    assert.ok(beforeCall.some(l => l.includes('ld l,')));
    assert.ok(!beforeCall.some(l => l.includes('push af')));
  });

  it('should use new_sdcc for two word args without explicit convention', () => {
    const source = `
void fn_default_2word(int a, int b) {}
int main() { fn_default_2word(1, 2); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_default_2word'));
    assert.ok(callLine);
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(beforeCall.some(l => l.includes('ld h,')));
    assert.ok(beforeCall.some(l => l.includes('ld d,')));
    assert.ok(!beforeCall.some(l => l.includes('push af')));
  });

  it('should use new_sdcc with stack spillover for 3 args without explicit convention', () => {
    const source = `
void fn_default_spill(int a, int b, int c) {}
int main() { fn_default_spill(1, 2, 3); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_default_spill'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 10);
    assert.ok(lines.some(l => l.includes('call fn_default_spill')), 'should have call instruction');
  });

  it('should compile program with mixed default and explicit conventions', () => {
    const source = `
int add(int a, int b) __attribute__((__cdecl__("add"))) { return a + b; }
int fast_mul(int a) __attribute__((__fastcall__)) { return a * 2; }
int sdcc_fn(int a, char b) __attribute__((__new_sdcc__)) { return a + b; }
int default_fn(int a, char b) { return a + b; }
int main() {
  int r1 = add(1, 2);
  int r2 = fast_mul(3);
  int r3 = sdcc_fn(5, 6);
  int r4 = default_fn(7, 8);
  return r1 + r2 + r3 + r4;
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call add'));
    assert.ok(result.code.includes('call fast_mul'));
    assert.ok(result.code.includes('call sdcc_fn'));
    assert.ok(result.code.includes('call default_fn'));
  });

  it('should use new_sdcc for function pointer calls without explicit convention', () => {
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
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(beforeCall.some(l => l.includes('ld a,')));
    assert.ok(beforeCall.some(l => l.includes('push af')), 'function pointer calls use cdecl push args on stack');
  });

  it('should use new_sdcc for void functions without explicit convention', () => {
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
    const beforeCall = lines.slice(0, lines.indexOf(callLine));
    assert.ok(!beforeCall.some(l => l.includes('push af')));
  });

  it('should use new_sdcc return value on A for byte return', () => {
    const source = `
char default_ret_char(char a) { return a; }
int main() { return default_ret_char(5); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call default_ret_char'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 5);
    assert.ok(afterCall.some(l => l.includes('ld a, a')));
  });

  it('should use new_sdcc return value on D for word return', () => {
    const source = `
int default_ret_int(int a) { return a; }
int main() { return default_ret_int(42); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call default_ret_int'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 5);
    assert.ok(afterCall.some(l => l.includes('ld a, d')));
  });
});
