/**
 * memchr - Search memory for a byte value
 * 
 * Finds the first occurrence of 'c' (interpreted as an unsigned char)
 * in the memory area pointed to by 's'. The search includes exactly
 * 'n' bytes.
 * 
 * @param s Pointer to memory area to search
 * @param c Value to search for
 * @param n Number of bytes to search
 * @return Pointer to the found byte, or NULL if not found
 */
void *memchr(const void *s, int c, unsigned int n) {
    const unsigned char *p = (const unsigned char *)s;
    unsigned char uc = (unsigned char)c;
    unsigned int i;
    
    for (i = 0; i < n; i++) {
        if (p[i] == uc) {
            return (void *)(p + i);
        }
    }
    
    return NULL;
}
