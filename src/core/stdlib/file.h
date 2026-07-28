#ifndef FILE_H
#define FILE_H

typedef struct FILE {
    char streamType;
    char flags;
    int read;
    int write;
    int close;
    int eof;
    int error;
    int available;
    int flush;
} FILE;

#define STREAM_FILESYSTEM 0
#define STREAM_SERIAL 1
#define STREAM_TERMINAL 2

#endif
