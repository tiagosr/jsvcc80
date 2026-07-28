#ifndef FLOAT_H
#define FLOAT_H

/* float.h - IEEE 754 single-precision float constants and declarations */

/* Minimum positive normalized float */
float FLT_MIN;

/* Maximum float */
float FLT_MAX;

/* Machine epsilon: difference between 1.0 and the next representable float */
float FLT_EPSILON;

/* NaN */
float NAN;

/* Positive infinity */
float INFINITY;

/* Negative infinity */
float NEG_INFINITY;

/* Float arithmetic operations */
void _float_add(float* result, float* a, float* b);
void _float_sub(float* result, float* a, float* b);
void _float_mul(float* result, float* a, float* b);
void _float_div(float* result, float* a, float* b);
void _float_mod(float* result, float* a, float* b);

/* Float special value checks */
int _float_isnan(float* x);
int _float_isinf(float* x);

/* Float comparison operations */
int _float_eq(float* a, float* b);
int _float_ne(float* a, float* b);
int _float_lt(float* a, float* b);
int _float_gt(float* a, float* b);
int _float_le(float* a, float* b);
int _float_ge(float* a, float* b);

/* Float unary operations */
void _float_neg(float* result, float* a);
void _float_abs(float* result, float* a);

/* Float rounding operations */
int _float_ceil(float* result, float* a);
int _float_floor(float* result, float* a);

/* Float absolute value */
float fabsf(float x);

/* Float rounding - round toward negative infinity */
float floorf(float x);

/* Float rounding - round toward positive infinity */
float ceilf(float x);

/* Float decomposition - split into integer and fractional parts */
float modff(float x, float* iptr);

/* Float exponent decomposition - normalize to mantissa*2^exponent */
float frexpf(float x, int* exponent);

/* Float scaling - multiply by 2^exponent */
float ldexpf(float x, int exponent);

/* Trigonometric functions */
float sinf(float x);
float cosf(float x);
float tanf(float x);
float cotf(float x);
float asinf(float x);
float acosf(float x);
float atanf(float x);
float atan2f(float y, float x);

/* Exponential and power functions */
float sqrtf(float x);
float expf(float x);
float powf(float base, float exponent);
float logf(float x);
float log10f(float x);

/* Internal float functions */
void _float_abs(float* result, float* a);
int _float_floor(float* result, float* a);
int _float_ceil(float* result, float* a);
void _float_modf(float* result, float* frac, float* a);
void _float_frexpf(float* mantissa, float* a, int exponent);
void _float_ldexpf(float* result, float* a, int exponent);
void _float_sinf(float* result, float* a);
void _float_cosf(float* result, float* a);
void _float_tanf(float* result, float* a);
void _float_cotf(float* result, float* a);
void _float_asinf(float* result, float* a);
void _float_acosf(float* result, float* a);
void _float_atanf(float* result, float* a);
void _float_atan2f(float* result, float* y, float* x);
void _float_sqrtf(float* result, float* a);
void _float_expf(float* result, float* a);
void _float_powf(float* result, float* base, float* exponent);
void _float_logf(float* result, float* a);
void _float_log10f(float* result, float* a);

#endif
