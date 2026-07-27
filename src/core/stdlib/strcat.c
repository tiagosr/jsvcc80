/**
 * strcat - Concatenate two strings
 * 
 * Appends the null-terminated string pointed to by 'src'
 * to the end of the null-terminated string pointed to by 'dest'.
 * The strings must not overlap. Returns 'dest'.
 * 
 * @param dest Pointer to destination string (must have sufficient space)
 * @param src Pointer to source string to append
 * @return Pointer to destination 'dest'
 */
char *strcat(char *dest, const char *src) {
    unsigned int destLen = 0;
    unsigned int i;
    
    while (dest[destLen] != '\0') {
        destLen++;
    }
    
    for (i = 0; ; i++) {
        dest[destLen + i] = src[i];
        if (src[i] == '\0') {
            break;
        }
    }
    
    return dest;
}
