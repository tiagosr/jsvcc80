#ifndef STDLIB_H
#define STDLIB_H

#include <stdint.h>

void *memset(void *s, int c, unsigned int n);
void *memcpy(void *dest, const void *src, unsigned int n);
void *memmove(void *dest, const void *src, unsigned int n);
int memcmp(const void *s1, const void *s2, unsigned int n);
void *memchr(const void *s, int c, unsigned int n);

int atoi(const char *s);
int strtoi(const char *s);

#endif
