/**
 * strtoi - Convert string to signed integer
 * 
 * Interprets the content of the null-terminated string pointed
 * to by 's' as a signed decimal integer. Skips leading whitespace
 * characters, detects an optional sign, and converts the subsequent
 * digit characters. Non-digit characters stop the conversion.
 * 
 * @param s Pointer to the null-terminated string
 * @return Signed integer value parsed from the string
 */
int strtoi(const char *s) {
    int result = 0;
    int sign = 1;
    unsigned int i = 0;
    
    while (s[i] == ' ' || s[i] == '\t' || s[i] == '\n') {
        i++;
    }
    
    if (s[i] == '-') {
        sign = -1;
        i++;
    } else if (s[i] == '+') {
        i++;
    }
    
    while (s[i] >= '0' && s[i] <= '9') {
        result = result * 10 + (s[i] - '0');
        i++;
    }
    
    return result * sign;
}
