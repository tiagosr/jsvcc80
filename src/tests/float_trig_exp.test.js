import { describe, it } from 'mocha';
import assert from 'assert';
import { Compiler, CompilerOptions } from '../compiler.js';

function compile(source) {
  const options = new CompilerOptions({ source: 'test.c', includePaths: ['src/core/stdlib'] });
  const compiler = new Compiler(options);
  return compiler.compileSource(source);
}

describe('Float Trigonometric Functions', () => {
  describe('sinf - Sine', () => {
    it('should compile sinf with literal', () => {
      const result = compile(`
        float main() {
          float x = sinf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sinf');
      assert.ok(result.code.includes('_float_sinf'), 'should have _float_sinf call');
    });

    it('should compile sinf with variable', () => {
      const result = compile(`
        float main() {
          float angle = 3.14;
          float x = sinf(angle);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sinf with variable');
      assert.ok(result.code.includes('_float_sinf'), 'should have _float_sinf call');
    });

    it('should compile sinf in expression', () => {
      const result = compile(`
        float main() {
          float x = sinf(1.0) + cosf(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sinf+cosf');
      assert.ok(result.code.includes('_float_sinf'), 'should have sinf');
      assert.ok(result.code.includes('_float_cosf'), 'should have cosf');
    });
  });

  describe('cosf - Cosine', () => {
    it('should compile cosf with literal', () => {
      const result = compile(`
        float main() {
          float x = cosf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile cosf');
      assert.ok(result.code.includes('_float_cosf'), 'should have _float_cosf call');
    });

    it('should compile cosf with variable', () => {
      const result = compile(`
        float main() {
          float angle = 1.57;
          float x = cosf(angle);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile cosf with variable');
      assert.ok(result.code.includes('_float_cosf'), 'should have _float_cosf call');
    });
  });

  describe('tanf - Tangent', () => {
    it('should compile tanf with literal', () => {
      const result = compile(`
        float main() {
          float x = tanf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile tanf');
      assert.ok(result.code.includes('_float_tanf'), 'should have _float_tanf call');
    });

    it('should compile tanf with variable', () => {
      const result = compile(`
        float main() {
          float angle = 0.5;
          float x = tanf(angle);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile tanf with variable');
      assert.ok(result.code.includes('_float_tanf'), 'should have _float_tanf call');
    });
  });

  describe('cotf - Cotangent', () => {
    it('should compile cotf with literal', () => {
      const result = compile(`
        float main() {
          float x = cotf(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile cotf');
      assert.ok(result.code.includes('_float_cotf'), 'should have _float_cotf call');
    });

    it('should compile cotf with variable', () => {
      const result = compile(`
        float main() {
          float angle = 0.785;
          float x = cotf(angle);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile cotf with variable');
      assert.ok(result.code.includes('_float_cotf'), 'should have _float_cotf call');
    });
  });

  describe('asinf - Arcsine', () => {
    it('should compile asinf with literal', () => {
      const result = compile(`
        float main() {
          float x = asinf(0.5);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile asinf');
      assert.ok(result.code.includes('_float_asinf'), 'should have _float_asinf call');
    });

    it('should compile asinf with variable', () => {
      const result = compile(`
        float main() {
          float val = 0.0;
          float x = asinf(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile asinf with variable');
      assert.ok(result.code.includes('_float_asinf'), 'should have _float_asinf call');
    });

    it('should compile asinf with 1.0', () => {
      const result = compile(`
        float main() {
          float x = asinf(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile asinf(1.0)');
      assert.ok(result.code.includes('_float_asinf'), 'should have _float_asinf call');
    });
  });

  describe('acosf - Arccosine', () => {
    it('should compile acosf with literal', () => {
      const result = compile(`
        float main() {
          float x = acosf(0.5);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile acosf');
      assert.ok(result.code.includes('_float_acosf'), 'should have _float_acosf call');
    });

    it('should compile acosf with variable', () => {
      const result = compile(`
        float main() {
          float val = 0.0;
          float x = acosf(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile acosf with variable');
      assert.ok(result.code.includes('_float_acosf'), 'should have _float_acosf call');
    });

    it('should compile acosf with 1.0', () => {
      const result = compile(`
        float main() {
          float x = acosf(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile acosf(1.0)');
      assert.ok(result.code.includes('_float_acosf'), 'should have _float_acosf call');
    });
  });

  describe('atanf - Arctangent', () => {
    it('should compile atanf with literal', () => {
      const result = compile(`
        float main() {
          float x = atanf(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile atanf');
      assert.ok(result.code.includes('_float_atanf'), 'should have _float_atanf call');
    });

    it('should compile atanf with variable', () => {
      const result = compile(`
        float main() {
          float val = 0.5;
          float x = atanf(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile atanf with variable');
      assert.ok(result.code.includes('_float_atanf'), 'should have _float_atanf call');
    });

    it('should compile atanf with 0.0', () => {
      const result = compile(`
        float main() {
          float x = atanf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile atanf(0.0)');
      assert.ok(result.code.includes('_float_atanf'), 'should have _float_atanf call');
    });
  });

  describe('atan2f - Arctangent two arguments', () => {
    it('should compile atan2f with literals', () => {
      const result = compile(`
        float main() {
          float x = atan2f(1.0, 1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile atan2f');
      assert.ok(result.code.includes('_float_atan2f'), 'should have _float_atan2f call');
    });

    it('should compile atan2f with variables', () => {
      const result = compile(`
        float main() {
          float y = 3.0;
          float x = 4.0;
          float angle = atan2f(y, x);
          return angle;
        }
      `);
      assert.ok(result.success, 'should compile atan2f with variables');
      assert.ok(result.code.includes('_float_atan2f'), 'should have _float_atan2f call');
    });

    it('should compile atan2f with y=0', () => {
      const result = compile(`
        float main() {
          float x = atan2f(0.0, 1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile atan2f(0,1)');
      assert.ok(result.code.includes('_float_atan2f'), 'should have _float_atan2f call');
    });
  });
});

describe('Float Exponential Functions', () => {
  describe('sqrtf - Square root', () => {
    it('should compile sqrtf with literal', () => {
      const result = compile(`
        float main() {
          float x = sqrtf(4.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sqrtf');
      assert.ok(result.code.includes('_float_sqrtf'), 'should have _float_sqrtf call');
    });

    it('should compile sqrtf with variable', () => {
      const result = compile(`
        float main() {
          float val = 9.0;
          float x = sqrtf(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sqrtf with variable');
      assert.ok(result.code.includes('_float_sqrtf'), 'should have _float_sqrtf call');
    });

    it('should compile sqrtf with 0.0', () => {
      const result = compile(`
        float main() {
          float x = sqrtf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sqrtf(0.0)');
      assert.ok(result.code.includes('_float_sqrtf'), 'should have _float_sqrtf call');
    });

    it('should compile sqrtf in expression', () => {
      const result = compile(`
        float main() {
          float x = sqrtf(16.0) + 2.0;
          return x;
        }
      `);
      assert.ok(result.success, 'should compile sqrtf in expression');
      assert.ok(result.code.includes('_float_sqrtf'), 'should have sqrtf');
      assert.ok(result.code.includes('_float_add'), 'should have float add');
    });
  });

  describe('expf - Exponential', () => {
    it('should compile expf with literal', () => {
      const result = compile(`
        float main() {
          float x = expf(0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile expf');
      assert.ok(result.code.includes('_float_expf'), 'should have _float_expf call');
    });

    it('should compile expf with variable', () => {
      const result = compile(`
        float main() {
          float val = 1.0;
          float x = expf(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile expf with variable');
      assert.ok(result.code.includes('_float_expf'), 'should have _float_expf call');
    });
  });

  describe('powf - Power', () => {
    it('should compile powf with literals', () => {
      const result = compile(`
        float main() {
          float x = powf(2.0, 3.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile powf');
      assert.ok(result.code.includes('_float_powf'), 'should have _float_powf call');
    });

    it('should compile powf with variables', () => {
      const result = compile(`
        float main() {
          float base = 5.0;
          float exp = 2.0;
          float x = powf(base, exp);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile powf with variables');
      assert.ok(result.code.includes('_float_powf'), 'should have _float_powf call');
    });

    it('should compile powf with exponent 0', () => {
      const result = compile(`
        float main() {
          float x = powf(3.0, 0.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile powf(x,0)');
      assert.ok(result.code.includes('_float_powf'), 'should have _float_powf call');
    });
  });

  describe('logf - Natural logarithm', () => {
    it('should compile logf with literal', () => {
      const result = compile(`
        float main() {
          float x = logf(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile logf');
      assert.ok(result.code.includes('_float_logf'), 'should have _float_logf call');
    });

    it('should compile logf with variable', () => {
      const result = compile(`
        float main() {
          float val = 2.718;
          float x = logf(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile logf with variable');
      assert.ok(result.code.includes('_float_logf'), 'should have _float_logf call');
    });
  });

  describe('log10f - Base-10 logarithm', () => {
    it('should compile log10f with literal', () => {
      const result = compile(`
        float main() {
          float x = log10f(1.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile log10f');
      assert.ok(result.code.includes('_float_log10f'), 'should have _float_log10f call');
    });

    it('should compile log10f with variable', () => {
      const result = compile(`
        float main() {
          float val = 100.0;
          float x = log10f(val);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile log10f with variable');
      assert.ok(result.code.includes('_float_log10f'), 'should have _float_log10f call');
    });

    it('should compile log10f with 10.0', () => {
      const result = compile(`
        float main() {
          float x = log10f(10.0);
          return x;
        }
      `);
      assert.ok(result.success, 'should compile log10f(10.0)');
      assert.ok(result.code.includes('_float_log10f'), 'should have _float_log10f call');
    });
  });

  describe('Combined trig and exponential', () => {
    it('should compile sinf and sqrtf together', () => {
      const result = compile(`
        float main() {
          float x = sqrtf(sinf(1.0) * sinf(1.0) + cosf(1.0) * cosf(1.0));
          return x;
        }
      `);
      assert.ok(result.success, 'should compile combined trig+exp');
      assert.ok(result.code.includes('_float_sinf'), 'should have sinf');
      assert.ok(result.code.includes('_float_cosf'), 'should have cosf');
      assert.ok(result.code.includes('_float_sqrtf'), 'should have sqrtf');
    });

    it('should compile atan2f with sqrtf', () => {
      const result = compile(`
        float main() {
          float y = 3.0;
          float x = 4.0;
          float angle = atan2f(y, sqrtf(x * x));
          return angle;
        }
      `);
      assert.ok(result.success, 'should compile atan2f+sqrtf');
      assert.ok(result.code.includes('_float_atan2f'), 'should have atan2f');
      assert.ok(result.code.includes('_float_sqrtf'), 'should have sqrtf');
    });

    it('should compile expf and logf together', () => {
      const result = compile(`
        float main() {
          float x = logf(expf(1.0));
          return x;
        }
      `);
      assert.ok(result.success, 'should compile expf+logf');
      assert.ok(result.code.includes('_float_expf'), 'should have expf');
      assert.ok(result.code.includes('_float_logf'), 'should have logf');
    });
  });
});
