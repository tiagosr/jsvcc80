#ifndef STDINT_H
#define STDINT_H

typedef unsigned char uint8_t;
typedef unsigned short uint16_t;
typedef unsigned int uint32_t;
typedef signed char int8_t;
typedef signed short int16_t;
typedef signed int int32_t;
typedef unsigned int size_t;
typedef signed int ptrdiff_t;
typedef unsigned int uintptr_t;
typedef signed int intptr_t;

#define NULL 0
#define EOF (-1)
#define SIZE_MAX 0xFFFF
#define INT_MAX 0x7FFF
#define INT_MIN (-0x7FFF - 1)
#define UINT_MAX 0xFFFF
#define CHAR_BIT 8

#endif
