/**
 * memcmp - Compare memory regions
 * 
 * Compares the first 'n' bytes of the memory areas pointed to
 * by 's1' and 's2'. Returns:
 *   < 0 if s1 < s2
 *   0 if s1 == s2
 *   > 0 if s1 > s2
 * 
 * @param s1 Pointer to first memory area
 * @param s2 Pointer to second memory area
 * @param n Number of bytes to compare
 * @return Comparison result
 */
int memcmp(const void *s1, const void *s2, unsigned int n) {
    const unsigned char *p1 = (const unsigned char *)s1;
    const unsigned char *p2 = (const unsigned char *)s2;
    unsigned int i;
    
    for (i = 0; i < n; i++) {
        if (p1[i] != p2[i]) {
            return p1[i] - p2[i];
        }
    }
    
    return 0;
}
