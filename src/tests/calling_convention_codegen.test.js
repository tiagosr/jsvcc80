import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler } from '../../src/compiler.js';

describe('Calling Convention - cdecl', () => {
  it('should generate stack push for single byte arg', () => {
    const source = `
void fn_byte(char arg) __attribute__((__cdecl__("fn_byte"))) {}
int main() { fn_byte(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_byte'));
    assert.ok(callLine);
    const pushLines = lines.filter(l => l.includes('push af'));
    assert.ok(pushLines.length > 0, 'cdecl passes byte arg on stack via push af');
  });

  it('should generate stack push for multiple args', () => {
    const source = `
void fn_multi(int a, int b) __attribute__((__cdecl__("fn_multi"))) {}
int main() { fn_multi(1, 2); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_multi'));
    assert.ok(callLine);
  });

  it('should have caller stack cleanup for args', () => {
    const source = `
void fn_arg(char x) __attribute__((__cdecl__("fn_arg"))) {}
int main() { fn_arg(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_arg'));
    assert.ok(callLine);
    const cleanupIdx = lines.indexOf(callLine);
    const afterCall = lines.slice(cleanupIdx + 1, cleanupIdx + 8);
    assert.ok(afterCall.some(l => l.includes('ld hl, sp')), 'cdecl caller clears stack with ld hl, sp');
  });
});

describe('Calling Convention - fastcall', () => {
  it('should pass single arg on registers', () => {
    const source = `
int fn_fast(int arg) __attribute__((__fastcall__)) { return arg; }
int main() { return fn_fast(42); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_fast'));
    assert.ok(callLine);
  });

  it('should fallback to cdecl for multiple args', () => {
    const source = `
int fn_fast_multi(int a, int b) __attribute__((__fastcall__)) { return a + b; }
int main() { return fn_fast_multi(1, 2); }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_fast_multi'));
    assert.ok(callLine);
  });
});

describe('Calling Convention - callee', () => {
  it('should have callee stack cleanup', () => {
    const source = `
void fn_callee(char arg) __attribute__((__callee__)) {}
int main() { fn_callee(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_callee'));
    assert.ok(callLine);
    const afterCall = lines.slice(lines.indexOf(callLine) + 1, lines.indexOf(callLine) + 10);
    assert.ok(!afterCall.some(l => l.includes('ld hl, sp')), 'callee convention cleanup happens in callee function');
  });
});

describe('Calling Convention - new_sdcc', () => {
  it('should pass single byte arg on A', () => {
    const source = `
void fn_sdcc_byte(char arg) __attribute__((__new_sdcc__)) {}
int main() { fn_sdcc_byte(1); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_sdcc_byte'));
    assert.ok(callLine);
  });

  it('should pass single word arg on HL', () => {
    const source = `
void fn_sdcc_word(int arg) __attribute__((__new_sdcc__)) {}
int main() { fn_sdcc_word(42); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_sdcc_word'));
    assert.ok(callLine);
  });

  it('should pass two byte args on A and L', () => {
    const source = `
void fn_sdcc_2byte(char a, char b) __attribute__((__new_sdcc__)) {}
int main() { fn_sdcc_2byte(1, 2); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_sdcc_2byte'));
    assert.ok(callLine);
  });

  it('should pass two word args on HL and DE', () => {
    const source = `
void fn_sdcc_2word(int a, int b) __attribute__((__new_sdcc__)) {}
int main() { fn_sdcc_2word(1, 2); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_sdcc_2word'));
    assert.ok(callLine);
  });

  it('should handle spillover to stack', () => {
    const source = `
void fn_sdcc_spill(int a, int b, int c) __attribute__((__new_sdcc__)) {}
int main() { fn_sdcc_spill(1, 2, 3); return 0; }
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    const lines = result.code.split('\n');
    const callLine = lines.find(l => l.includes('call fn_sdcc_spill'));
    assert.ok(callLine);
  });
});

describe('Calling Convention - end-to-end', () => {
  it('should compile program with mixed conventions', () => {
    const source = `
int add(int a, int b) __attribute__((__cdecl__("add"))) { return a + b; }
int fast_mul(int a) __attribute__((__fastcall__)) { return a * 2; }
void callee_fn(char x) __attribute__((__callee__)) {}
int sdcc_fn(int a, char b) __attribute__((__new_sdcc__)) { return a + b; }
int main() {
  int r1 = add(1, 2);
  int r2 = fast_mul(3);
  callee_fn(4);
  int r3 = sdcc_fn(5, 6);
  return r1 + r2 + r3;
}
`;
    const compiler = new Compiler();
    const result = compiler.compileSource(source);
    assert.ok(result.success);
    assert.ok(result.code.includes('call add'));
    assert.ok(result.code.includes('call fast_mul'));
    assert.ok(result.code.includes('call callee_fn'));
    assert.ok(result.code.includes('call sdcc_fn'));
  });
});
