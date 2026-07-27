#ifndef STDIO_H
#define STDIO_H

#include <file.h>

int __fputc(int c, FILE *stream);
int __fgetc(FILE *stream);
int __feof(FILE *stream);
int __ferror(FILE *stream);
FILE *__fopen(const char *filename, const char *mode);
int __fclose(FILE *stream);

FILE *__serial_open(int port);
int __serial_close(FILE *stream);
int __serial_read(FILE *stream);
int __serial_write(FILE *stream, int c);
int __serial_available(FILE *stream);

FILE *__terminal_open();
int __terminal_close(FILE *stream);

#endif
