/**
 * strchr - Find the first occurrence of a character in a string
 * 
 * Finds the first occurrence of the character 'c' (interpreted
 * as a char, including the terminating null byte) in the
 * null-terminated string pointed to by 's'.
 * 
 * @param s Pointer to the null-terminated string
 * @param c Character to search for
 * @return Pointer to the found character, or NULL if not found
 */
char *strchr(const char *s, int c) {
    unsigned int i;
    char uc = (char)c;
    
    for (i = 0; ; i++) {
        if (s[i] == uc) {
            return (char *)(s + i);
        }
        if (s[i] == '\0') {
            return NULL;
        }
    }
}
