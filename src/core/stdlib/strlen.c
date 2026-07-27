/**
 * strlen - Compute the length of a string
 * 
 * Returns the number of bytes in the string pointed to by 's',
 * excluding the terminating null byte.
 * 
 * @param s Pointer to the null-terminated string
 * @return Length of the string in bytes
 */
unsigned int strlen(const char *s) {
    unsigned int len = 0;
    
    while (s[len] != '\0') {
        len++;
    }
    
    return len;
}
