/**
 * memmove - Copy memory region (handles overlapping)
 * 
 * Copies 'n' bytes from the memory area pointed to by 'src'
 * to the memory area pointed to by 'dest'. Unlike memcpy, this
 * function correctly handles overlapping memory regions.
 * 
 * @param dest Pointer to destination memory area
 * @param src Pointer to source memory area
 * @param n Number of bytes to copy
 * @return Pointer to destination 'dest'
 */
void *memmove(void *dest, const void *src, unsigned int n) {
    unsigned char *d = (unsigned char *)dest;
    const unsigned char *s = (const unsigned char *)src;
    unsigned int i;
    
    if (d <= s) {
        /* Forward copy when no overlap or dest before src */
        for (i = 0; i < n; i++) {
            d[i] = s[i];
        }
    } else {
        /* Backward copy when overlapping */
        for (i = n; i > 0; i--) {
            d[i - 1] = s[i - 1];
        }
    }
    
    return dest;
}
