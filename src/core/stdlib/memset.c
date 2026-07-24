/**
 * memset - Fill a memory region with a byte value
 * 
 * Sets the first 'n' bytes of the memory area pointed to by 's'
 * to the specified value 'c' (interpreted as an unsigned char).
 * 
 * @param s Pointer to the memory area
 * @param c Value to set (truncated to unsigned char)
 * @param n Number of bytes to set
 * @return Pointer to the memory area 's'
 */
void *memset(void *s, int c, unsigned int n) {
    unsigned char *p = (unsigned char *)s;
    unsigned int i;
    
    for (i = 0; i < n; i++) {
        p[i] = (unsigned char)c;
    }
    
    return s;
}
