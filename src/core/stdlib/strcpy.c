/**
 * strcpy - Copy a string
 * 
 * Copies the null-terminated string pointed to by 'src'
 * to the memory area pointed to by 'dest'. The strings
 * must not overlap. Returns 'dest'.
 * 
 * @param dest Pointer to destination memory area
 * @param src Pointer to null-terminated source string
 * @return Pointer to destination 'dest'
 */
char *strcpy(char *dest, const char *src) {
    unsigned int i;
    
    for (i = 0; ; i++) {
        dest[i] = src[i];
        if (src[i] == '\0') {
            break;
        }
    }
    
    return dest;
}
