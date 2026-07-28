import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler, CompilerOptions } from '../compiler.js';

/**
 * Helper to compile source and return result
 */
function compile(source) {
  const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
  const compiler = new Compiler(options);
  return compiler.compileSource(source);
}

describe('Float Math Functions', () => {
  // ==================== fabsf ====================

  describe('fabsf - Absolute Value', () => {
    it('should compile fabsf with positive literal', () => {
      const result = compile(`
        float main() {
          float x = fabsf(3.14);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile fabsf with positive literal');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs call');
    });

    it('should compile fabsf with negative literal', () => {
      const result = compile(`
        float main() {
          float x = fabsf(-3.14);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile fabsf with negative literal');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs call');
    });

    it('should compile fabsf with zero', () => {
      const result = compile(`
        float main() {
          float x = fabsf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile fabsf with zero');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs call');
    });

    it('should compile fabsf with variable', () => {
      const result = compile(`
        float main() {
          float x = -5.5;
          float y = fabsf(x);
          return y;
        }
      `);
      assert.ok(result.success, 'should compile fabsf with variable');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs call');
    });

    it('should compile fabsf in conditional', () => {
      const result = compile(`
        int main() {
          float x = -5.0;
          float y = fabsf(x);
          if (y > 3.0) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile fabsf in conditional');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs');
      assert.ok(result.code.includes('_float_gt'), 'should have _float_gt');
    });

    it('should compile fabsf in expression', () => {
      const result = compile(`
        float main() {
          float x = -2.0;
          float y = fabsf(x) + 1.0;
          return y;
        }
      `);
      assert.ok(result.success, 'should compile fabsf in expression');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs');
      assert.ok(result.code.includes('_float_add'), 'should have _float_add');
    });
  });

  // ==================== floorf ====================

  describe('floorf - Round Toward Negative Infinity', () => {
    it('should compile floorf with positive non-integer', () => {
      const result = compile(`
        float main() {
          float x = floorf(3.7);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile floorf with positive non-integer');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor call');
    });

    it('should compile floorf with negative non-integer', () => {
      const result = compile(`
        float main() {
          float x = floorf(-3.7);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile floorf with negative non-integer');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor call');
    });

    it('should compile floorf with integer value', () => {
      const result = compile(`
        float main() {
          float x = floorf(3.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile floorf with integer value');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor call');
    });

    it('should compile floorf with zero', () => {
      const result = compile(`
        float main() {
          float x = floorf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile floorf with zero');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor call');
    });

    it('should compile floorf with variable', () => {
      const result = compile(`
        float main() {
          float x = 4.9;
          float y = floorf(x);
          return y;
        }
      `);
      assert.ok(result.success, 'should compile floorf with variable');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor call');
    });

    it('should compile floorf in while loop', () => {
      const result = compile(`
        float main() {
          float x = 0.0;
          while (x < 5.0) {
            x = floorf(x + 1.0);
          }
          return x;
        }
      `);
      assert.ok(result.success, 'should compile floorf in while loop');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor');
      assert.ok(result.code.includes('_float_lt'), 'should have _float_lt');
    });

    it('should compile floorf in compound statement', () => {
      const result = compile(`
        int main() {
          float a = 2.3;
          float b = 4.8;
          float c = floorf(a);
          float d = floorf(b);
          if (c < d) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile floorf in compound statement');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor');
      assert.ok(result.code.includes('_float_lt'), 'should have _float_lt');
    });
  });

  // ==================== ceilf ====================

  describe('ceilf - Round Toward Positive Infinity', () => {
    it('should compile ceilf with positive non-integer', () => {
      const result = compile(`
        float main() {
          float x = ceilf(3.2);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ceilf with positive non-integer');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil call');
    });

    it('should compile ceilf with negative non-integer', () => {
      const result = compile(`
        float main() {
          float x = ceilf(-3.2);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ceilf with negative non-integer');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil call');
    });

    it('should compile ceilf with integer value', () => {
      const result = compile(`
        float main() {
          float x = ceilf(3.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ceilf with integer value');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil call');
    });

    it('should compile ceilf with zero', () => {
      const result = compile(`
        float main() {
          float x = ceilf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ceilf with zero');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil call');
    });

    it('should compile ceilf with variable', () => {
      const result = compile(`
        float main() {
          float x = 7.1;
          float y = ceilf(x);
          return y;
        }
      `);
      assert.ok(result.success, 'should compile ceilf with variable');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil call');
    });

    it('should compile ceilf in conditional', () => {
      const result = compile(`
        int main() {
          float x = 2.1;
          float y = ceilf(x);
          if (y >= 3.0) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile ceilf in conditional');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil');
      assert.ok(result.code.includes('_float_ge'), 'should have _float_ge');
    });

    it('should compile ceilf mixed with int', () => {
      const result = compile(`
        float main() {
          float x = ceilf(2.5) + 1;
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ceilf mixed with int');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil');
    });
  });

  // ==================== modff ====================

  describe('modff - Split into Integer and Fractional Parts', () => {
    it('should compile modff with positive value', () => {
      const result = compile(`
        int main() {
          float f = 3.7;
          int i;
          float frac = modff(f, &i);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile modff with positive value');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf call');
    });

    it('should compile modff with negative value', () => {
      const result = compile(`
        int main() {
          float f = -3.7;
          int i;
          float frac = modff(f, &i);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile modff with negative value');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf call');
    });

    it('should compile modff with integer value', () => {
      const result = compile(`
        int main() {
          float f = 5.0;
          int i;
          float frac = modff(f, &i);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile modff with integer value');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf call');
    });

    it('should compile modff with zero', () => {
      const result = compile(`
        int main() {
          float f = 0.0;
          int i;
          float frac = modff(f, &i);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile modff with zero');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf call');
    });

    it('should compile modff with variable', () => {
      const result = compile(`
        int main() {
          float x = 9.3;
          int result_int;
          float result_frac = modff(x, &result_int);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile modff with variable');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf call');
    });

    it('should compile modff in expression with comparison', () => {
      const result = compile(`
        int main() {
          float f = 4.6;
          int i;
          float frac = modff(f, &i);
          if (frac > 0.5) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile modff with comparison');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf');
      assert.ok(result.code.includes('_float_gt'), 'should have _float_gt');
    });
  });

  // ==================== frexpf ====================

  describe('frexpf - Decompose into Mantissa and Exponent', () => {
    it('should compile frexpf with positive value', () => {
      const result = compile(`
        int main() {
          float f = 3.14;
          int exp;
          float mantissa = frexpf(f, &exp);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile frexpf with positive value');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf call');
    });

    it('should compile frexpf with zero', () => {
      const result = compile(`
        int main() {
          float f = 0.0;
          int exp;
          float mantissa = frexpf(f, &exp);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile frexpf with zero');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf call');
    });

    it('should compile frexpf with variable', () => {
      const result = compile(`
        int main() {
          float x = 100.0;
          int exponent;
          float m = frexpf(x, &exponent);
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile frexpf with variable');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf call');
    });

    it('should compile frexpf in expression', () => {
      const result = compile(`
        int main() {
          float f = 7.5;
          int e;
          float m = frexpf(f, &e);
          float result = m * 2.0;
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile frexpf in expression');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf');
      assert.ok(result.code.includes('_float_mul'), 'should have _float_mul');
    });

    it('should compile frexpf in conditional', () => {
      const result = compile(`
        int main() {
          float f = 0.5;
          int exp;
          float m = frexpf(f, &exp);
          if (m < 1.0) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile frexpf in conditional');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf');
      assert.ok(result.code.includes('_float_lt'), 'should have _float_lt');
    });
  });

  // ==================== ldexpf ====================

  describe('ldexpf - Multiply by 2^Exponent', () => {
    it('should compile ldexpf with positive exponent', () => {
      const result = compile(`
        float main() {
          float x = ldexpf(1.0, 3);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf with positive exponent');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf call');
    });

    it('should compile ldexpf with negative exponent', () => {
      const result = compile(`
        float main() {
          float x = ldexpf(1.0, -1);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf with negative exponent');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf call');
    });

    it('should compile ldexpf with zero exponent', () => {
      const result = compile(`
        float main() {
          float x = ldexpf(3.0, 0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf with zero exponent');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf call');
    });

    it('should compile ldexpf with variable mantissa', () => {
      const result = compile(`
        float main() {
          float m = 2.5;
          float x = ldexpf(m, 2);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf with variable mantissa');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf call');
    });

    it('should compile ldexpf with variable exponent', () => {
      const result = compile(`
        float main() {
          float m = 1.0;
          int e = 4;
          float x = ldexpf(m, e);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf with variable exponent');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf call');
    });

    it('should compile ldexpf in conditional', () => {
      const result = compile(`
        int main() {
          float x = ldexpf(1.0, 5);
          if (x > 30.0) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf in conditional');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf');
      assert.ok(result.code.includes('_float_gt'), 'should have _float_gt');
    });

    it('should compile ldexpf in loop', () => {
      const result = compile(`
        float main() {
          float sum = 0.0;
          int i = 0;
          while (i < 4) {
            sum = sum + ldexpf(1.0, i);
            i = i + 1;
          }
          return sum;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf in loop');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf');
      assert.ok(result.code.includes('_float_add'), 'should have _float_add');
    });
  });

  // ==================== Combined Tests ====================

  describe('Float Math Functions - Combined', () => {
    it('should compile multiple float math functions together', () => {
      const result = compile(`
        float main() {
          float a = -5.5;
          float b = fabsf(a);
          float c = floorf(b);
          float d = ceilf(c + 0.3);
          return d;
        }
      `);
      assert.ok(result.success, 'should compile multiple float math functions');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil');
    });

    it('should compile floorf and ceilf comparison', () => {
      const result = compile(`
        int main() {
          float x = 3.7;
          float f = floorf(x);
          float c = ceilf(x);
          if (f < c) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile floorf and ceilf comparison');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil');
      assert.ok(result.code.includes('_float_lt'), 'should have _float_lt');
    });

    it('should compile ldexpf and frexpf roundtrip', () => {
      const result = compile(`
        int main() {
          float f = 6.0;
          int e;
          float m = frexpf(f, &e);
          float r = ldexpf(m, e);
          if (r == f) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile ldexpf and frexpf roundtrip');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf');
      assert.ok(result.code.includes('_float_eq'), 'should have _float_eq');
    });

    it('should compile complete program with all float math functions', () => {
      const result = compile(`
        int main() {
          float a = -10.5;
          float b = fabsf(a);
          float c = floorf(b);
          float d = ceilf(b);
          float e = 7.3;
          int i;
          float frac = modff(e, &i);
          float m;
          int exp;
          m = frexpf(b, &exp);
          float r = ldexpf(m, exp);
          if (b > 0.0 && c < d && frac > 0.0) {
            return 1;
          }
          return 0;
        }
      `);
      assert.ok(result.success, 'should compile complete program with all float math functions');
      assert.ok(result.code.includes('_float_abs'), 'should have _float_abs');
      assert.ok(result.code.includes('_float_floor'), 'should have _float_floor');
      assert.ok(result.code.includes('_float_ceil'), 'should have _float_ceil');
      assert.ok(result.code.includes('_float_modf'), 'should have _float_modf');
      assert.ok(result.code.includes('_float_frexpf'), 'should have _float_frexpf');
      assert.ok(result.code.includes('_float_ldexpf'), 'should have _float_ldexpf');
      assert.ok(result.code.includes('_float_gt'), 'should have _float_gt');
      assert.ok(result.code.includes('_float_lt'), 'should have _float_lt');
    });
  });
});
