/**
 * strncpy - Copy a string with maximum length
 * 
 * Copies at most 'n' bytes from the string pointed to by 'src'
 * to the memory area pointed to by 'dest'. If 'src' is shorter
 * than 'n' bytes, the remaining bytes in 'dest' are filled with
 * null bytes. Returns 'dest'.
 * 
 * @param dest Pointer to destination memory area
 * @param src Pointer to source string
 * @param n Maximum number of bytes to copy
 * @return Pointer to destination 'dest'
 */
char *strncpy(char *dest, const char *src, unsigned int n) {
    unsigned int i;
    
    for (i = 0; i < n; i++) {
        dest[i] = src[i];
        if (src[i] == '\0') {
            break;
        }
    }
    
    for (; i < n; i++) {
        dest[i] = '\0';
    }
    
    return dest;
}
