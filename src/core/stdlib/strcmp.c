/**
 * strcmp - Compare two strings
 * 
 * Compares the null-terminated string pointed to by 's1'
 * with the null-terminated string pointed to by 's2'.
 * Returns zero if the strings are identical, a negative
 * value if s1 is less than s2, or a positive value if
 * s1 is greater than s2.
 * 
 * @param s1 Pointer to first string
 * @param s2 Pointer to second string
 * @return Comparison result (0 if equal, negative if s1 < s2, positive if s1 > s2)
 */
int strcmp(const char *s1, const char *s2) {
    unsigned int i;
    
    for (i = 0; ; i++) {
        if (s1[i] != s2[i]) {
            return s1[i] - s2[i];
        }
        if (s1[i] == '\0') {
            return 0;
        }
    }
}
