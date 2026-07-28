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

/* Internal float functions */
void _float_abs(float* result, float* a);
int _float_floor(float* result, float* a);
int _float_ceil(float* result, float* a);
void _float_modf(float* result, float* frac, float* a);
void _float_frexpf(float* mantissa, float* a, int exponent);
void _float_ldexpf(float* result, float* a, int exponent);

#endif
