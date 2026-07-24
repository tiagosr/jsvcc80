/**
 * memcpy - Copy memory region
 * 
 * Copies 'n' bytes from the memory area pointed to by 'src'
 * to the memory area pointed to by 'dest'. The memory areas
 * must not overlap.
 * 
 * @param dest Pointer to destination memory area
 * @param src Pointer to source memory area
 * @param n Number of bytes to copy
 * @return Pointer to destination 'dest'
 */
void *memcpy(void *dest, const void *src, unsigned int n) {
    unsigned char *d = (unsigned char *)dest;
    const unsigned char *s = (const unsigned char *)src;
    unsigned int i;
    
    for (i = 0; i < n; i++) {
        d[i] = s[i];
    }
    
    return dest;
}
