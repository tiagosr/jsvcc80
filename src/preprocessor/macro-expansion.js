import { TokenType } from './tokenTypes.js';

/**
 * Handles macro expansion: argument parsing, parameter substitution,
 * token-level # and ## operators, and recursive macro expansion.
 * Operates on a lexer instance passed in the constructor.
 */
export class MacroExpander {
  /**
   * Creates a new macro expander
   * @param {Object} lexer - The lexer instance to operate on
   */
  constructor(lexer) {
    this.lexer = lexer;
  }

  /**
   * Expands a macro, handling both object-like and function-like macros
   * @param {string} name - Macro name as written in source
   * @param {Object} macro - Macro definition
   * @returns {Token|null} First expanded token, or null if recursion guard prevents expansion
   */
  expandMacro(name, macro) {
    // Recursion guard: prevent infinite expansion
    if (this.lexer.expandingMacros.has(name.toLowerCase())) {
      return null;
    }

    // Capture invocation context for built-in macros
    const invocationLine = this.lexer.invocationLine || this.lexer.line;

    if (macro.args !== null) {
      // Function-like macro - check if followed by '('
      const savedPos = this.lexer.pos;
      const savedLine = this.lexer.line;
      const savedColumn = this.lexer.column;

      // Skip whitespace
      this.lexer.skipWhitespace();

      if (this.lexer.peek() === '(') {
        // It's a function-like macro invocation
        this.lexer.advance(); // consume '('

        // Parse arguments by collecting tokens until matching ')'
        const argTokens = this._parseMacroArgs();

        if (!argTokens) {
          // Parsing failed, backtrack
          this.lexer.pos = savedPos;
          this.lexer.line = savedLine;
          this.lexer.column = savedColumn;
          return null;
        }

        // Convert argument token lists to raw text for stringification
        const argTexts = argTokens.map(tokens => this.lexer._tokensToRawText(tokens));

        // Expand argument tokens (macros within arguments)
        const expandedArgs = argTokens.map(tokens => this._expandArgTokens(tokens, invocationLine));

        // Substitute parameters in replacement text using token-level substitution
        const resultTokens = this._substituteParamsTokens(macro.replacement, macro.args, expandedArgs, argTexts, invocationLine);

        // Push remaining tokens to buffer (all but the first)
        if (resultTokens.length > 1) {
          this.lexer.tokenBuffer.unshift(...resultTokens.slice(1).reverse());
        }

        return resultTokens.length > 0 ? resultTokens[0] : null;
      } else {
        // Not followed by '(' - treat as regular identifier (not a function call)
        this.lexer.pos = savedPos;
        this.lexer.line = savedLine;
        this.lexer.column = savedColumn;
        return null;
      }
    }

    // Object-like macro
    this.lexer.expandingMacros.add(name.toLowerCase());
    const tokens = this.lexer._rescan(macro.replacement, macro.name, invocationLine);
    this.lexer.expandingMacros.delete(name.toLowerCase());

    // Push remaining tokens to buffer
    if (tokens.length > 1) {
      this.lexer.tokenBuffer.unshift(...tokens.slice(1).reverse());
    }

    return tokens.length > 0 ? tokens[0] : null;
  }

  /**
   * Expands macros within argument tokens
   * @param {Token[]} tokens - Argument tokens
   * @param {number} invocationLine - Line number for built-in macros
   * @returns {Token[]} Expanded tokens
   */
  _expandArgTokens(tokens, invocationLine) {
    const expanded = [];
    for (const token of tokens) {
      if (token.type === TokenType.IDENTIFIER) {
        // Check for macro expansion
        const macro = this.lexer.preprocessor.expandMacro(token.value);
        if (macro && !this.lexer.expandingMacros.has(token.value.toLowerCase())) {
          if (macro.args !== null) {
            // Function-like macro in argument - don't expand here, let rescan handle it
            expanded.push(token);
          } else {
            // Object-like macro - expand
            this.lexer.expandingMacros.add(token.value.toLowerCase());
            const subTokens = this.lexer._rescan(macro.replacement, token.value, invocationLine);
            this.lexer.expandingMacros.delete(token.value.toLowerCase());
            expanded.push(...subTokens);
          }
        } else {
          expanded.push(token);
        }
      } else {
        expanded.push(token);
      }
    }
    return expanded;
  }

  /**
   * Tokenizes replacement text and substitutes parameters at token level
   * Handles # (stringify) and ## (paste) operators
   * @param {string} replacement - Raw replacement text
   * @param {string[]} params - Parameter names
   * @param {Token[][]} expandedArgs - Expanded argument token arrays
   * @param {string[]} argTexts - Raw argument text for stringification
   * @param {number} invocationLine - Line number for built-in macros
   * @returns {Token[]} Resulting tokens after substitution
   */
  _substituteParamsTokens(replacement, params, expandedArgs, argTexts, invocationLine) {
    // Tokenize the replacement text
    const rawTokens = this.lexer._tokenizeReplacement(replacement);
    if (rawTokens.length === 0) return [];

    // Process tokens for # and ## operators, and parameter substitution
    const result = [];
    let i = 0;

    while (i < rawTokens.length) {
      const token = rawTokens[i];

      // Check for ## (token pasting)
      if (token.type === '##') {
        const leftTokens = result.slice();
        result.length = 0;

        i++; // Skip ##
        while (i < rawTokens.length && rawTokens[i].type === 'WHITESPACE') i++;

        if (i < rawTokens.length) {
          const rightToken = rawTokens[i];
          const rightIdx = params.indexOf(rightToken.value);
          const rightTokens = rightIdx !== -1 ? expandedArgs[rightIdx] : [rightToken];

          if (leftTokens.length > 0 && rightTokens.length > 0) {
            const leftVal = leftTokens[leftTokens.length - 1].value;
            const rightVal = rightTokens[0].value;
            const pastedToken = { type: TokenType.IDENTIFIER, value: leftVal + rightVal, location: leftTokens[leftTokens.length - 1].location };
            result.push(...leftTokens.slice(0, -1), pastedToken, ...rightTokens.slice(1));
          } else if (rightTokens.length > 0) {
            result.push(...rightTokens);
          }
        }
        i++;
        continue;
      }

      // Check for # (stringification)
      if (token.type === '#') {
        i++; // Skip #
        while (i < rawTokens.length && rawTokens[i].type === 'WHITESPACE') i++;

        if (i < rawTokens.length) {
          const nextToken = rawTokens[i];
          const paramIdx = params.indexOf(nextToken.value);
          if (paramIdx !== -1) {
            result.push({ type: TokenType.STRING, value: argTexts[paramIdx], location: nextToken.location });
          }
        }
        i++;
        continue;
      }

      // Check for parameter substitution
      const paramIdx = params.indexOf(token.value);
      if (paramIdx !== -1) {
        if (i + 1 < rawTokens.length && rawTokens[i + 1].type === '##') {
          i++; i++; // Skip param and ##
          while (i < rawTokens.length && rawTokens[i].type === 'WHITESPACE') i++;

          if (i < rawTokens.length) {
            const rightToken = rawTokens[i];
            const rightIdx = params.indexOf(rightToken.value);
            const rightTokens = rightIdx !== -1 ? expandedArgs[rightIdx] : [rightToken];
            const leftTokens = expandedArgs[paramIdx];

            if (leftTokens.length > 0 && rightTokens.length > 0) {
              const pastedToken = { type: TokenType.IDENTIFIER, value: leftTokens[leftTokens.length - 1].value + rightTokens[0].value, location: leftTokens[leftTokens.length - 1].location };
              result.push(...leftTokens.slice(0, -1), pastedToken, ...rightTokens.slice(1));
            } else if (leftTokens.length > 0) {
              result.push(...leftTokens);
            }
          }
          i++;
          continue;
        }

        // Normal substitution - insert expanded argument tokens
        result.push(...expandedArgs[paramIdx]);
        i++;
        continue;
      }

      result.push(token);
      i++;
    }

    // Expand macros within the result tokens directly (no text conversion)
    return this._expandTokensMacros(result, invocationLine);
  }

  /**
   * Expands macros within a token array directly (no text conversion)
   * Handles object-like macros and function-like macros
   * @param {Token[]} tokens - Token array
   * @param {number} invocationLine - Line number for built-in macros
   * @returns {Token[]} Expanded tokens
   */
  _expandTokensMacros(tokens, invocationLine) {
    const result = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === TokenType.IDENTIFIER) {
        // Check for built-in macros
        const builtin = this.lexer.preprocessor.getBuiltin(token.value);
        if (builtin) {
          const lineNum = invocationLine || this.lexer.line;
          const replacement = builtin(lineNum);
          const expanded = this.lexer._rescan(replacement, token.value, invocationLine || this.lexer.line);
          result.push(...expanded);
          i++;
          continue;
        }

        // Check for user-defined macros
        const macro = this.lexer.preprocessor.expandMacro(token.value);
        if (macro && !this.lexer.expandingMacros.has(token.value.toLowerCase())) {
          if (macro.args !== null) {
            // Function-like macro - check if followed by '('
            if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.LPAREN) {
              // Collect tokens for arguments until matching ')'
              i++; // Skip identifier
              i++; // Skip '('
              const argTokens = this._collectArgsFromTokens(tokens, i);
              if (argTokens.tokens && argTokens.closeIdx !== -1) {
                i = argTokens.closeIdx + 1; // Move past ')'
                const argTexts = argTokens.tokens.map(t => this.lexer._tokensToRawText(t));
                const expandedArgs = argTokens.tokens.map(t => this._expandArgTokens(t, invocationLine));

                // Recursively substitute
                const subResult = this._substituteParamsTokens(macro.replacement, macro.args, expandedArgs, argTexts, invocationLine);
                result.push(...subResult);
              } else {
                // Failed to parse args, just emit the identifier
                result.push(token);
                i++;
              }
              continue;
            }
            // Not followed by '(' - emit as-is
            result.push(token);
            i++;
            continue;
          }

          // Object-like macro - expand
          this.lexer.expandingMacros.add(token.value.toLowerCase());
          const expanded = this.lexer._rescan(macro.replacement, token.value, invocationLine);
          this.lexer.expandingMacros.delete(token.value.toLowerCase());
          result.push(...expanded);
          i++;
          continue;
        }

        result.push(token);
        i++;
      } else {
        result.push(token);
        i++;
      }
    }

    return result;
  }

  /**
   * Collects argument token groups from a token array starting after '('
   * @param {Token[]} tokens - Token array
   * @param {number} startIdx - Index after '('
   * @returns {{tokens: Token[][], closeIdx: number}}
   */
  _collectArgsFromTokens(tokens, startIdx) {
    const args = [];
    let currentArg = [];
    let depth = 0;
    let i = startIdx;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === TokenType.LPAREN) {
        depth++;
        currentArg.push(token);
        i++;
      } else if (token.type === TokenType.RPAREN) {
        if (depth === 0) {
          if (currentArg.length) args.push(currentArg);
          return { tokens: args, closeIdx: i };
        }
        depth--;
        currentArg.push(token);
        i++;
      } else if (token.type === TokenType.COMMA && depth === 0) {
        args.push(currentArg);
        currentArg = [];
        i++;
      } else {
        currentArg.push(token);
        i++;
      }
    }

    return { tokens: null, closeIdx: -1 }; // Unterminated
  }

  /**
   * Parses macro arguments, collecting tokens until matching ')'
   * Handles nested parentheses
   * @returns {Token[][]|null} Array of argument token lists, or null on failure
   */
  _parseMacroArgs() {
    const args = [];
    let currentArg = [];
    let depth = 0;

    while (true) {
      this.lexer.skipWhitespace();
      const ch = this.lexer.peek();

      if (!ch) return null; // EOF - unterminated

      if (ch === ')') {
        if (depth === 0) {
          this.lexer.advance(); // consume ')'
          if (currentArg.length) args.push(currentArg);
          return args;
        }
        depth--;
      } else if (ch === ',') {
        if (depth === 0) {
          this.lexer.advance(); // consume ','
          args.push(currentArg);
          currentArg = [];
          continue;
        }
      } else if (ch === '(') {
        depth++;
      }

      const token = this.lexer._readSingleToken();
      if (!token) return null;

      if (Array.isArray(token)) {
        currentArg.push(...token);
      } else {
        currentArg.push(token);
      }
    }
  }
}
