#ifndef FILE_H
#define FILE_H

typedef struct FILE {
    char streamType;
    char flags;
    int port;
    int device;
    char buffer;
    int bufSize;
    int bufPos;
} FILE;

#define STREAM_FILESYSTEM 0
#define STREAM_SERIAL 1
#define STREAM_TERMINAL 2

#endif
