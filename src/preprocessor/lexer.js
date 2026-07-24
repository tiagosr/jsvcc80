import { TokenType, Keywords } from './tokenTypes.js';
import { LexerError } from '../core/errors.js';
import { PositionTracker } from '../core/location.js';
import { readFileSync, statSync } from 'fs';

/**
 * Preprocessed source with macro definitions and pragma handlers
 */
export class PreprocessedSource {
  /**
   * Creates a new preprocessor instance
   * @param {string} filename - Source filename
   * @param {Object} [options] - Preprocessor options
   * @param {string[]} [options.includePaths] - System include directory paths
   */
  constructor(filename = '<input>', options = {}) {
    this.filename = filename;
    this.macros = new Map();
    this.builtins = new Map();
    this.pragmaHandlers = new Map();
    this.locationTracker = new PositionTracker(filename);
    this.conditionalStack = [];
    this.skipDepth = 0;
    this.includePaths = options.includePaths || [];
    this.includedFiles = new Set();

    // Register built-in macros
    this._registerBuiltins();
    // Register default pragma handlers
    this._registerDefaultPragmas();
  }

  /**
   * Registers built-in macros (__FILE__, __LINE__, etc.)
   * @private
   */
  _registerBuiltins() {
    this.builtins.set('__file__', () => `"${this.filename}"`);
    this.builtins.set('__line__', (line) => String(line || 1));
  }

  /**
   * Checks if a name is a built-in macro
   * @param {string} name - Macro name
   * @returns {Function|undefined} Builtin handler or undefined
   */
  getBuiltin(name) {
    return this.builtins.get(name.toLowerCase());
  }

  /**
   * Registers a custom pragma handler
   * @param {string} name - Pragama name (without 'pragma' keyword)
   * @param {Function} handler - Handler function(token, context) => void or Promise<void>
   */
  registerPragma(name, handler) {
    this.pragmaHandlers.set(name.toLowerCase(), handler);
  }

  /**
   * Registers default pragmas (once, pack, etc.)
   * @private
   */
  _registerDefaultPragmas() {
    // #pragma once - include guard
    this.registerPragma('once', () => {
      return { type: 'pragma_once' };
    });

    // #pragma pack(n) - structure packing alignment
    this.registerPragma('pack', (token, context) => {
      const value = parseInt(token.value, 10);
      if (isNaN(value)) {
        throw new LexerError('Invalid pack value', token.location);
      }
      return { type: 'pragma_pack', value };
    });

    // #pragma pack(push, n) / pop
    this.registerPragma('pack_push', () => ({ type: 'pragma_pack_push' }));
    this.registerPragma('pack_pop', () => ({ type: 'pragma_pack_pop' }));
  }

  /**
   * Defines a macro
   * @param {string} name - Macro name
   * @param {string[]} args - Parameter names (null for object-like macros)
   * @param {string} replacement - Replacement text
   */
  defineMacro(name, args, replacement) {
    this.macros.set(name.toLowerCase(), { name, args, replacement });
  }

  /**
   * Undefines a macro
   * @param {string} name - Macro name
   */
  undefineMacro(name) {
    this.macros.delete(name.toLowerCase());
  }

  /**
   * Checks if a macro is defined (user-defined or built-in)
   * @param {string} name - Macro name
   * @returns {boolean} True if macro is defined
   */
  isMacroDefined(name) {
    const lower = name.toLowerCase();
    return this.macros.has(lower) || this.builtins.has(lower);
  }

  /**
   * Expands a macro if defined
   * @param {string} name - Macro name to expand
   * @returns {Object|null} Expansion result or null
   */
  expandMacro(name) {
    const macro = this.macros.get(name.toLowerCase());
    return macro || null;
  }

  /**
   * Gets pragma handler for a directive
   * @param {string} name - Pragama name
   * @returns {Function|undefined} Handler function or undefined
   */
  getPragmaHandler(name) {
    return this.pragmaHandlers.get(name.toLowerCase());
  }

  /**
   * Checks if current position is in an active conditional block
   * @returns {boolean} True if all enclosing conditionals are active
   */
  isEffectivelyActive() {
    return this.conditionalStack.every(frame => frame.active);
  }

  /**
   * Gets current source location
   * @returns {SourceLocation}
   */
  getLocation() {
    const end = this.locationTracker.getPosition();
    return {
      file: this.filename,
      start: this.startPos || end,
      end
    };
  }

  /**
   * Sets the starting position for location tracking
   * @param {Position} pos - Starting position
   */
  setStartPos(pos) {
    this.startPos = pos;
  }

  /**
   * Checks if a file has already been included
   * @param {string} filePath - Absolute file path
   * @returns {boolean} True if file was already included
   */
  isFileIncluded(filePath) {
    return this.includedFiles.has(filePath);
  }

  /**
   * Marks a file as included
   * @param {string} filePath - Absolute file path
   */
  markFileIncluded(filePath) {
    this.includedFiles.add(filePath);
  }

  /**
   * Resolves an include filename to an absolute path
   * @param {string} filename - Include filename
   * @param {boolean} isSystem - True for #include <file>, false for #include "file"
   * @param {string} [currentDir] - Directory of the including file
   * @returns {string|null} Absolute path or null if not found
   */
  resolveInclude(filename, isSystem, currentDir = null) {
    const paths = [];

    if (!isSystem && currentDir) {
      paths.push(currentDir);
    }

    for (const p of this.includePaths) {
      paths.push(p);
    }

    if (!isSystem) {
      paths.push('.');
    }

    for (const dir of paths) {
      const fullPath = this._joinPath(dir, filename);
      if (this._fileExists(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Joins two path components in a platform-independent way
   * @param {string} dir - Directory path
   * @param {string} file - Filename
   * @returns {string} Joined path
   */
  _joinPath(dir, file) {
    if (dir === '.') return file;
    const sep = dir.endsWith('/') ? '' : '/';
    return `${dir}${sep}${file}`;
  }

  /**
   * Checks if a file exists at the given path
   * @param {string} path - File path to check
   * @returns {boolean} True if file exists
   */
  _fileExists(path) {
    try {
      const stats = statSync(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}

/**
 * C Lexer with preprocessor support
 */
export class Lexer {
  /**
   * Creates a new lexer instance
   * @param {string} source - Source code to tokenize
   * @param {PreprocessedSource} [preprocessor] - Optional preprocessor for pragma handling
   */
  constructor(source, preprocessor = null) {
    this.source = source;
    this.preprocessor = preprocessor || new PreprocessedSource();
    this.pos = 0;
    this.line = 1;
    this.column = 0;

    // Track start position for each token
    this.tokenStartLine = 1;
    this.tokenStartColumn = 0;

    // Buffer for macro expansion (tokens from expanded macros)
    this.tokenBuffer = [];

    // Track macros currently being expanded to prevent infinite recursion
    this.expandingMacros = new Set();
  }

  /**
   * Gets current character
   * @returns {string} Current character or empty string
   */
  peek() {
    if (this.pos >= this.source.length) return '';
    return this.source[this.pos];
  }

  /**
   * Peeks at the next character without advancing
   * @param {number} [offset=1] - Number of characters ahead to peek
   * @returns {string} Character or empty string
   */
  peekNext(offset = 1) {
    const nextPos = this.pos + offset;
    if (nextPos >= this.source.length) return '';
    return this.source[nextPos];
  }

  /**
   * Advances the lexer position
   * @returns {string} The character that was at current position
   */
  advance() {
    const ch = this.peek();
    if (ch === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }
    this.pos++;
    return ch;
  }

  /**
   * Skips whitespace characters
   */
  skipWhitespace() {
    while (this.peek() && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  /**
   * Skips a single-line comment //
   */
  skipSingleLineComment() {
    this.advance(); // Skip /
    this.advance(); // Skip second /
    while (this.peek() && this.peek() !== '\n') {
      this.advance();
    }
  }

  /**
   * Skip block comment tokens
   */
  skipMultiLineComment() {
    this.advance(); // Skip /
    this.advance(); // Skip *
    while (this.peek()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // Skip *
        this.advance(); // Skip /
        return;
      }
      this.advance();
    }
    throw new LexerError('Unterminated comment', this._makeLocation());
  }

  /**
   * Creates a location object for the current token start position
   * @returns {SourceLocation}
   */
  _makeLocation() {
    const end = { line: this.line, column: this.column };
    return {
      file: this.preprocessor.filename,
      start: { line: this.tokenStartLine, column: this.tokenStartColumn },
      end
    };
  }

  /**
   * Creates a token object
   * @param {string} type - Token type
   * @param {string} value - Token value
   * @returns {Token}
   */
  makeToken(type, value) {
    return {
      type,
      value,
      location: this._makeLocation()
    };
  }

  /**
   * Reads a string literal
   * @returns {Token|string|null} Token or escape sequence indicator
   */
  readString() {
    const quote = this.advance(); // Skip opening quote
    let value = '';
    
    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        const escaped = this._readEscapeSequence();
        if (escaped === 'newline') {
          continue; // Skip line continuations in strings
        }
        value += escaped;
      } else {
        value += this.advance();
      }
    }

    if (!this.peek()) {
      throw new LexerError('Unterminated string literal', this._makeLocation());
    }

    this.advance(); // Skip closing quote
    
    return this.makeToken(TokenType.STRING, value);
  }

  /**
   * Reads an escape sequence from a string
   * @returns {string} Character or 'newline' for line continuation
   */
  _readEscapeSequence() {
    this.advance(); // Skip backslash
    
    const ch = this.peek();
    if (ch === '\n') return 'newline';
    
    switch (ch) {
      case 'n': this.advance(); return '\n';
      case 't': this.advance(); return '\t';
      case 'r': this.advance(); return '\r';
      case '\\': this.advance(); return '\\';
      case '"': this.advance(); return '"';
      case '\'': this.advance(); return '\'';
      case 'x':
        return this._readHexEscape();
      default:
        this.advance(); // Skip unknown escape, keep character
        return ch;
    }
  }

  /**
   * Reads a hexadecimal escape sequence \xNN
   * @returns {string} Character represented by hex value
   */
  _readHexEscape() {
    this.advance(); // Skip 'x'
    
    let hex = '';
    const maxChars = this.peekNext(2) === '"' ? 1 : 2;
    
    for (let i = 0; i < maxChars && /[0-9a-fA-F]/.test(this.peek()); i++) {
      hex += this.advance();
    }

    if (!hex) return '?';
    
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  }

  /**
   * Reads an integer literal
   * @returns {Token} Integer token
   */
  readInteger() {
    let value = '';
    let isHex = false;
    
    // Check for hex prefix
    if (this.peek() === '0' && this.peekNext(1) && 
        /[xX]/.test(this.peekNext(1))) {
      isHex = true;
      value += this.advance(); // 0
      this.advance(); // x or X
      
      while (/[0-9a-fA-F]/.test(this.peek())) {
        value += this.advance();
      }
    } else {
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }

      // Check for suffixes
      if (/^[uUlL]{1,2}$/i.test(this.peekNext() + this.peekNext(2))) {
        const suffix = (this.peekNext() || '') + (this.peekNext(2) || '');
        value += suffix;
        this.advance();
        if (/^[uUlL]$/i.test(suffix)) this.advance();
      }
    }

    return this.makeToken(TokenType.INTEGER, value);
  }

  /**
   * Reads an identifier or keyword, expanding macros if applicable
   * @returns {Token|Token[]} Single token or array of tokens from macro expansion
   */
  readIdentifier() {
    let value = '';

    while (/[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.advance();
    }

    // Keywords are never macros
    if (Keywords.has(value)) {
      return this.makeToken(TokenType.KEYWORD, value);
    }

    // Check for built-in macros first
    const builtin = this.preprocessor.getBuiltin(value);
    if (builtin) {
      const lineNum = this.invocationLine || this.line;
      const replacement = builtin(lineNum);
      const tokens = this._rescan(replacement, value, this.invocationLine || this.line);
      if (tokens.length > 1) {
        this.tokenBuffer.unshift(...tokens.slice(1).reverse());
      }
      return tokens.length > 0 ? tokens[0] : this.makeToken(TokenType.IDENTIFIER, value);
    }

    // Check if this identifier is a user-defined macro
    const macro = this.preprocessor.expandMacro(value);
    if (macro) {
      const expanded = this._expandMacro(value, macro);
      if (expanded) {
        return expanded;
      }
    }

    return this.makeToken(TokenType.IDENTIFIER, value);
  }

  /**
   * Expands a macro, handling both object-like and function-like macros
   * @param {string} name - Macro name as written in source
   * @param {Object} macro - Macro definition
   * @returns {Token|null} First expanded token, or null if recursion guard prevents expansion
   */
  _expandMacro(name, macro) {
    // Recursion guard: prevent infinite expansion
    if (this.expandingMacros.has(name.toLowerCase())) {
      return null;
    }

    // Capture invocation context for built-in macros
    const invocationLine = this.invocationLine || this.line;

    if (macro.args !== null) {
      // Function-like macro - check if followed by '('
      const savedPos = this.pos;
      const savedLine = this.line;
      const savedColumn = this.column;

      // Skip whitespace
      this.skipWhitespace();

      if (this.peek() === '(') {
        // It's a function-like macro invocation
        this.advance(); // consume '('

        // Parse arguments by collecting tokens until matching ')'
        const argTokens = this._parseMacroArgs();

        if (!argTokens) {
          // Parsing failed, backtrack
          this.pos = savedPos;
          this.line = savedLine;
          this.column = savedColumn;
          return null;
        }

        // Convert argument token lists to raw text for stringification
        const argTexts = argTokens.map(tokens => this._tokensToRawText(tokens));

        // Expand argument tokens (macros within arguments)
        const expandedArgs = argTokens.map(tokens => this._expandArgTokens(tokens, invocationLine));

        // Substitute parameters in replacement text using token-level substitution
        const resultTokens = this._substituteParamsTokens(macro.replacement, macro.args, expandedArgs, argTexts, invocationLine);

        // Push remaining tokens to buffer (all but the first)
        if (resultTokens.length > 1) {
          this.tokenBuffer.unshift(...resultTokens.slice(1).reverse());
        }

        return resultTokens.length > 0 ? resultTokens[0] : null;
      } else {
        // Not followed by '(' - treat as regular identifier (not a function call)
        this.pos = savedPos;
        this.line = savedLine;
        this.column = savedColumn;
        return null;
      }
    }

    // Object-like macro
    this.expandingMacros.add(name.toLowerCase());
    const tokens = this._rescan(macro.replacement, macro.name, invocationLine);
    this.expandingMacros.delete(name.toLowerCase());

    // Push remaining tokens to buffer
    if (tokens.length > 1) {
      this.tokenBuffer.unshift(...tokens.slice(1).reverse());
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
        const macro = this.preprocessor.expandMacro(token.value);
        if (macro && !this.expandingMacros.has(token.value.toLowerCase())) {
          if (macro.args !== null) {
            // Function-like macro in argument - don't expand here, let rescan handle it
            expanded.push(token);
          } else {
            // Object-like macro - expand
            this.expandingMacros.add(token.value.toLowerCase());
            const subTokens = this._rescan(macro.replacement, token.value, invocationLine);
            this.expandingMacros.delete(token.value.toLowerCase());
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
    const rawTokens = this._tokenizeReplacement(replacement);
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
        const builtin = this.preprocessor.getBuiltin(token.value);
        if (builtin) {
          const lineNum = invocationLine || this.line;
          const replacement = builtin(lineNum);
          const expanded = this._rescan(replacement, token.value, invocationLine || this.line);
          result.push(...expanded);
          i++;
          continue;
        }

        // Check for user-defined macros
        const macro = this.preprocessor.expandMacro(token.value);
        if (macro && !this.expandingMacros.has(token.value.toLowerCase())) {
          if (macro.args !== null) {
            // Function-like macro - check if followed by '('
            if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.LPAREN) {
              // Collect tokens for arguments until matching ')'
              i++; // Skip identifier
              i++; // Skip '('
              const argTokens = this._collectArgsFromTokens(tokens, i);
              if (argTokens.tokens && argTokens.closeIdx !== -1) {
                i = argTokens.closeIdx + 1; // Move past ')'
                const argTexts = argTokens.tokens.map(t => this._tokensToRawText(t));
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
          this.expandingMacros.add(token.value.toLowerCase());
          const expanded = this._rescan(macro.replacement, token.value, invocationLine);
          this.expandingMacros.delete(token.value.toLowerCase());
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
   * Tokenizes replacement text (simple tokenizer for macro replacement)
   * @param {string} text - Replacement text
   * @returns {Token[]} Tokens
   */
  _tokenizeReplacement(text) {
    const tokens = [];
    let i = 0;

    while (i < text.length) {
      // Skip whitespace but track it
      if (/\s/.test(text[i])) {
        let ws = '';
        while (i < text.length && /\s/.test(text[i])) ws += text[i++];
        continue; // Skip whitespace tokens
      }

      // ## operator
      if (text[i] === '#' && i + 1 < text.length && text[i + 1] === '#') {
        tokens.push({ type: '##', value: '##', location: null, _noSpaceBefore: false });
        i += 2;
        continue;
      }

      // # operator (stringification) - only standalone, not followed by another #
      if (text[i] === '#') {
        tokens.push({ type: '#', value: '#', location: null, _noSpaceBefore: false });
        i++;
        continue;
      }

      // String literal
      if (text[i] === '"' || text[i] === '\'') {
        const quote = text[i++];
        let value = '';
        while (i < text.length && text[i] !== quote) {
          if (text[i] === '\\' && i + 1 < text.length) {
            i++;
            value += text[i++];
          } else {
            value += text[i++];
          }
        }
        if (i < text.length) i++; // Skip closing quote
        tokens.push({ type: TokenType.STRING, value, location: null, _noSpaceBefore: false });
        continue;
      }

      // Number
      if (/[0-9]/.test(text[i])) {
        let num = '';
        while (i < text.length && /[0-9a-fA-FxX]/.test(text[i])) num += text[i++];
        tokens.push({ type: TokenType.INTEGER, value: num, location: null, _noSpaceBefore: false });
        continue;
      }

      // Identifier
      if (/[a-zA-Z_]/.test(text[i])) {
        let ident = '';
        while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) ident += text[i++];
        tokens.push({ type: TokenType.IDENTIFIER, value: ident, location: null, _noSpaceBefore: false });
        continue;
      }

      // Two-character operators
      if (i + 1 < text.length) {
        const two = text[i] + text[i + 1];
        if (['==', '!=', '<=', '>=', '<<', '>>', '&&', '||', '->', '+=', '-=', '*=', '/=', '%='].includes(two)) {
          tokens.push({ type: two, value: two, location: null, _noSpaceBefore: false });
          i += 2;
          continue;
        }
      }

      // Single character
      tokens.push({ type: text[i], value: text[i], location: null, _noSpaceBefore: false });
      i++;
    }

    return tokens;
  }

  /**
   * Converts tokens to raw text preserving original spacing (no extra spaces)
   * Used for stringification where original argument text is needed
   * @param {Token[]} tokens
   * @returns {string}
   */
  _tokensToRawText(tokens) {
    return tokens.map(t => t.value).join(' ');
  }

  /**
   * Converts tokens to text for rescanning, preserving no-space for function-like macro calls
   * @param {Token[]} tokens
   * @returns {string}
   */
  _tokensToTextForRescan(tokens) {
    if (tokens.length === 0) return '';

    let text = '';
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const noSpace = token._noSpaceBefore === true;

      // Check if previous token was a function-like macro name
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const prevIsFuncMacro = prevToken && prevToken.type === TokenType.IDENTIFIER
        && this.preprocessor.expandMacro(prevToken.value);
      const currentIsLParen = token.type === TokenType.LPAREN;

      // No space if: explicit flag, or ( after function-like macro
      if (noSpace || (prevIsFuncMacro && currentIsLParen)) {
        text += token.value;
      } else if (text) {
        text += ' ' + token.value;
      } else {
        text += token.value;
      }
    }

    return text;
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
      this.skipWhitespace();
      const ch = this.peek();

      if (!ch) return null; // EOF - unterminated

      if (ch === ')') {
        if (depth === 0) {
          this.advance(); // consume ')'
          if (currentArg.length) args.push(currentArg);
          return args;
        }
        depth--;
      } else if (ch === ',') {
        if (depth === 0) {
          this.advance(); // consume ','
          args.push(currentArg);
          currentArg = [];
          continue;
        }
      } else if (ch === '(') {
        depth++;
      }

      const token = this._readSingleToken();
      if (!token) return null;

      if (Array.isArray(token)) {
        currentArg.push(...token);
      } else {
        currentArg.push(token);
      }
    }
  }

  /**
   * Reads a single token without macro expansion
   * @returns {Token|null} Token or null on EOF
   */
  _readSingleToken() {
    this.skipWhitespace();

    const ch = this.peek();
    if (!ch) return null;

    // Save position
    const savedPos = this.pos;
    const savedLine = this.line;
    const savedColumn = this.column;

    // String literal
    if (ch === '"' || ch === '\'') {
      return this.readString();
    }

    // Integer literal
    if (/^[0-9]/.test(ch)) {
      return this.readInteger();
    }

    // Identifier or keyword (no macro expansion)
    if (/^[a-zA-Z_]/.test(ch)) {
      let value = '';
      while (/[a-zA-Z0-9_]/.test(this.peek())) {
        value += this.advance();
      }
      const type = Keywords.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
      return this.makeToken(type, value);
    }

    // Two-character operators
    const twoChar = ch + this.peekNext(1);
    if (twoChar === '//' || twoChar === '/*') {
      if (twoChar === '//') {
        this.skipSingleLineComment();
        return this._readSingleToken();
      } else {
        this.skipMultiLineComment();
        return this._readSingleToken();
      }
    }

    const twoOps = [
      '==', '!=', '<=', '>=', '<<', '>>', '&&', '||', '->',
      '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
      '<<=', '>>='
    ];

    // Three-character operators (ellipsis for variadic functions)
    const threeChar = ch + this.peekNext(1) + this.peekNext(2);
    if (threeChar === '...') {
      this.advance();
      this.advance();
      this.advance();
      return this.makeToken('ELLIPSIS', '...');
    }

    if (twoChar === '::') {
      this.advance();
      this.advance();
      return this.makeToken(TokenType.COLON_COLON, '::');
    }

    for (const op of twoOps) {
      if (op === twoChar) {
        this.advance();
        this.advance();
        return this.makeToken(op, op);
      }
    }

    const singleTokens = {
      '+': TokenType.PLUS, '-': TokenType.MINUS, '*': TokenType.STAR,
      '/': TokenType.SLASH, '%': TokenType.PERCENT, '&': TokenType.AMPERSAND,
      '|': TokenType.PIPE, '^': TokenType.CARET, '~': TokenType.TILDE,
      '!': TokenType.NOT, '=': TokenType.ASSIGN, '?': TokenType.QUESTION,
      '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
      '{': TokenType.LBRACE, '}': TokenType.RBRACE,
      ',': TokenType.COMMA, ';': TokenType.SEMICOLON,
      ':': TokenType.COLON, '.': TokenType.DOT, '>': TokenType.GT, '<': TokenType.LT
    };

    if (singleTokens[ch]) {
      this.advance();
      return this.makeToken(singleTokens[ch], ch);
    }

    // Unknown character - just consume it
    this.advance();
    return this.makeToken(TokenType.IDENTIFIER, ch);
  }

  /**
   * Converts an array of tokens back to text for stringification
   * @param {Token[]} tokens - Token array
   * @returns {string} Raw text representation
   */
  _tokensToText(tokens) {
    return tokens.map(t => t.value).join(' ');
  }

  /**
   * Substitutes parameters in replacement text, handling # and ## operators
   * @param {string} replacement - Raw replacement text
   * @param {string[]} params - Parameter names
   * @param {Token[][]} argTokens - Argument token arrays
   * @param {string[]} argTexts - Raw argument text for stringification
   * @returns {string} Substituted text for rescanning
   */
  _substituteParams(replacement, params, argTokens, argTexts) {
    // Tokenize the replacement text to handle # and ## operators
    const result = this._processReplacement(replacement, params, argTokens, argTexts);
    return result;
  }

  /**
   * Processes replacement text, handling # (stringify) and ## (paste) operators
   * @param {string} replacement - Raw replacement text
   * @param {string[]} params - Parameter names
   * @param {Token[][]} argTokens - Argument token arrays
   * @param {string[]} argTexts - Raw argument text for stringification
   * @returns {string} Processed text ready for rescanning
   */
  _processReplacement(replacement, params, argTokens, argTexts) {
    let result = '';
    let i = 0;

    while (i < replacement.length) {
      // Check for ## token pasting operator
      if (i + 1 < replacement.length && replacement[i] === '#' && replacement[i + 1] === '#') {
        // Token pasting - find what's before and after ##
        const before = result.trimEnd();
        i += 2; // Skip ##

        // Skip whitespace after ##
        while (i < replacement.length && /\s/.test(replacement[i])) i++;

        // Find what comes after ##
        let afterParam = null;
        let afterLiteral = '';
        for (const [idx, param] of params.entries()) {
          if (replacement.substring(i).startsWith(param)) {
            // Make sure it's a complete identifier match
            const endPos = i + param.length;
            if (endPos >= replacement.length || !/[a-zA-Z0-9_]/.test(replacement[endPos])) {
              afterParam = idx;
              i += param.length;
              break;
            }
          }
        }

        if (afterParam !== null) {
          // Paste with argument
          const argExpanded = this._tokensToText(argTokens[afterParam]);
          result = before + argExpanded;
        } else {
          // Read literal text after ##
          let literal = '';
          while (i < replacement.length && !/[a-zA-Z0-9_]/.test(replacement[i])) {
            literal += replacement[i++];
          }
          let afterIdent = '';
          while (i < replacement.length && /[a-zA-Z0-9_]/.test(replacement[i])) {
            afterIdent += replacement[i++];
          }
          // Check if afterIdent is a parameter
          const afterIdx = params.indexOf(afterIdent);
          if (afterIdx !== -1) {
            result = before + this._tokensToText(argTokens[afterIdx]);
          } else {
            result = before + afterIdent;
          }
        }

        // Skip whitespace after substitution
        while (i < replacement.length && /\s/.test(replacement[i])) i++;
        continue;
      }

      // Check for # stringification operator
      if (replacement[i] === '#') {
        i++; // Skip #

        // Skip whitespace after #
        while (i < replacement.length && /\s/.test(replacement[i])) i++;

        // Find the parameter name
        let paramName = '';
        while (i < replacement.length && /[a-zA-Z0-9_]/.test(replacement[i])) {
          paramName += replacement[i++];
        }

        const paramIdx = params.indexOf(paramName);
        if (paramIdx !== -1) {
          // Stringify the argument
          result += '"' + argTexts[paramIdx] + '"';
        } else {
          result += '#' + paramName;
        }

        // Skip whitespace after substitution
        while (i < replacement.length && /\s/.test(replacement[i])) i++;
        continue;
      }

      // Check for parameter substitution
      let foundParam = false;
      for (const [idx, param] of params.entries()) {
        if (replacement.substring(i).startsWith(param)) {
          const endPos = i + param.length;
          // Ensure complete identifier match
          if (endPos >= replacement.length || !/[a-zA-Z0-9_]/.test(replacement[endPos])) {
            // Check if preceded by # or ## (handled above) or followed by ##
            const beforeTrimmed = result.trimEnd();
            const lastChars = beforeTrimmed.slice(-2);
            if (lastChars === '##') {
              // Paste with previous - remove ## and paste
              result = beforeTrimmed.slice(0, -2) + this._tokensToText(argTokens[idx]);
            } else {
              // Normal substitution - expand arg tokens as text
              result += this._tokensToText(argTokens[idx]);
            }
            i = endPos;
            foundParam = true;
            break;
          }
        }
      }

      if (foundParam) continue;

      result += replacement[i++];
    }

    return result;
  }

  /**
   * Rescans text as tokens, expanding macros recursively
   * @param {string} text - Text to tokenize
   * @param {string} [currentMacro] - Name of macro being expanded (for recursion guard)
   * @param {number} [invocationLine] - Line number at macro invocation point
   * @returns {Token[]} Array of tokens
   */
  _rescan(text, currentMacro, invocationLine) {
    if (!text || !text.trim()) return [];

    // Save lexer state
    const savedSource = this.source;
    const savedPos = this.pos;
    const savedLine = this.line;
    const savedColumn = this.column;
    const savedTokenStartLine = this.tokenStartLine;
    const savedTokenStartColumn = this.tokenStartColumn;
    const savedBuffer = this.tokenBuffer;
    const savedInvocationLine = this.invocationLine;

    // Set up for rescanning with temp buffer
    this.source = text + '\n';
    this.pos = 0;
    this.line = 1;
    this.column = 0;
    this.tokenStartLine = 1;
    this.tokenStartColumn = 0;
    this.tokenBuffer = [];
    this.invocationLine = invocationLine || this.line;

    // Guard against infinite recursion
    if (currentMacro) {
      this.expandingMacros.add(currentMacro.toLowerCase());
    }

    const tokens = [];
    try {
      while (true) {
        this.skipWhitespace();
        if (this.pos >= this.source.length) break;

        const token = this.nextToken();
        if (!token || token.type === TokenType.EOF) break;

        tokens.push(token);
      }

      // Drain any remaining tokens from the temp buffer
      while (this.tokenBuffer.length > 0) {
        tokens.push(this.tokenBuffer.pop());
      }
    } finally {
      // Restore lexer state
      this.source = savedSource;
      this.pos = savedPos;
      this.line = savedLine;
      this.column = savedColumn;
      this.tokenStartLine = savedTokenStartLine;
      this.tokenStartColumn = savedTokenStartColumn;
      this.tokenBuffer = savedBuffer;
      this.invocationLine = savedInvocationLine;

      if (currentMacro) {
        this.expandingMacros.delete(currentMacro.toLowerCase());
      }
    }

    return tokens;
  }

  /**
   * Reads a preprocessor directive and returns processed result
   * @returns {Token|string|null} Token or special directive result
   */
  readDirective() {
    const startLine = this.line;
    const startColumn = this.column;
    
    // Skip # character
    this.advance();
    
    // Skip whitespace after #
    while (this.peek() && /\s/.test(this.peek())) {
      this.advance();
    }

    // Read directive keyword
    let keyword = '';
    while (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.peek())) {
      keyword += this.advance();
    }

    const location = {
      file: this.preprocessor.filename,
      start: { line: startLine, column: startColumn },
      end: { line: this.line, column: this.column }
    };

    const kw = keyword.toLowerCase();

    // Handle known directives
    if (kw === 'define') return this._handleDefine(location);
    if (kw === 'undef') return this._handleUndef(location);
    if (kw === 'if') return this._handleIf(location);
    if (kw === 'ifdef') return this._handleIfdef(location);
    if (kw === 'ifndef') return this._handleIfndef(location);
    if (kw === 'elif') return this._handleElif(location);
    if (kw === 'else') return this._handleElse(location);
    if (kw === 'endif') return this._handleEndif(location);
    if (kw === 'pragma') return this._handlePragma(location);
    if (kw === 'include') return this._handleInclude(location);

    // Unknown directive - backtrack and emit POUND token
    this.pos = this.tokenStartPos;
    this.line = this.tokenStartLine;
    this.column = this.tokenStartColumn;
    return this.makeToken(TokenType.POUND, '#');
  }

  /**
   * Reads remaining content on current line
   * @returns {string} Line content trimmed
   */
  _readLineContent() {
    let content = '';
    while (this.peek() && this.peek() !== '\n') {
      content += this.advance();
    }
    return content.trim();
  }

  /**
   * Handles #define directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleDefine(location) {
    const lineContent = this._readLineContent();

    if (this.preprocessor.skipDepth > 0 || !this.preprocessor.isEffectivelyActive()) return null;

    const parsed = this._parseDefineLine(lineContent, location);

    this.preprocessor.defineMacro(parsed.name, parsed.args, parsed.replacement);
    return null;
  }

  /**
   * Parses a #define line into name, args, and replacement
   * @param {string} lineContent - Line content after #define
   * @param {Object} location - Source location
   * @returns {{name: string, args: string[]|null, replacement: string}}
   */
  _parseDefineLine(lineContent, location) {
    const trimmed = lineContent.trim();

    if (!trimmed) {
      throw new LexerError('#define requires a macro name', location);
    }

    // Find the macro name
    let name = '';
    let i = 0;
    while (i < trimmed.length && /[a-zA-Z0-9_]/.test(trimmed[i])) {
      name += trimmed[i++];
    }

    if (!name) {
      throw new LexerError('#define requires a macro name', location);
    }

    // Skip whitespace after name
    while (i < trimmed.length && /\s/.test(trimmed[i])) {
      i++;
    }

    // Check for function-like macro: name immediately followed by '('
    if (i < trimmed.length && trimmed[i] === '(') {
      // Function-like macro - parse parameter list
      const { params, closeParenPos } = this._parseMacroParams(trimmed, i, location);
      // Skip whitespace after closing paren
      let j = closeParenPos + 1;
      while (j < trimmed.length && /\s/.test(trimmed[j])) {
        j++;
      }
      const replacement = trimmed.substring(j);
      return { name, args: params, replacement };
    }

    // Object-like macro
    const replacement = trimmed.substring(i);
    return { name, args: null, replacement };
  }

  /**
   * Parses the parameter list of a function-like macro
   * @param {string} text - Full line content
   * @param {number} openParenPos - Position of opening '('
   * @param {Object} location - Source location
   * @returns {{params: string[], closeParenPos: number}}
   */
  _parseMacroParams(text, openParenPos, location) {
    const params = [];
    let i = openParenPos + 1; // Skip '('
    let current = '';
    let depth = 0;

    while (i < text.length) {
      const ch = text[i];
      if (ch === '(') {
        depth++;
        current += ch;
        i++;
      } else if (ch === ')') {
        if (depth === 0) {
          // End of parameter list
          if (current.trim()) {
            params.push(current.trim());
          }
          return { params, closeParenPos: i };
        }
        depth--;
        current += ch;
        i++;
      } else if (ch === ',' && depth === 0) {
        if (current.trim()) {
          params.push(current.trim());
        }
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }

    throw new LexerError('Unclosed parenthesis in macro definition', location);
  }

  /**
   * Handles #undef directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleUndef(location) {
    const lineContent = this._readLineContent();
    
    if (this.preprocessor.skipDepth > 0 || !this.preprocessor.isEffectivelyActive()) return null;
    
    const name = lineContent.trim();
    
    if (!name) {
      throw new LexerError('#undef requires a macro name', location);
    }
    
    this.preprocessor.undefineMacro(name);
    return null;
  }

  /**
   * Tokenizes a constant expression string for #if/#elif evaluation
   * @param {string} expr - Expression string
   * @returns {Object[]} Array of expression tokens
   */
  _tokenizeConstantExpression(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.trim();
    let afterDefined = false;
    
    while (i < s.length) {
      if (/\s/.test(s[i])) { i++; continue; }
      
      if (/[0-9]/.test(s[i])) {
        let num = '';
        if (s[i] === '0' && i + 1 < s.length && /[xX]/.test(s[i + 1])) {
          num += s[i++];
          num += s[i++];
          while (i < s.length && /[0-9a-fA-F]/.test(s[i])) num += s[i++];
          tokens.push({ type: 'NUMBER', value: parseInt(num, 16) });
          continue;
        }
        if (s[i] === '0') {
          num += s[i++];
          while (i < s.length && /[0-7]/.test(s[i])) num += s[i++];
          tokens.push({ type: 'NUMBER', value: parseInt(num, 8) });
          continue;
        }
        while (i < s.length && /[0-9]/.test(s[i])) num += s[i++];
        tokens.push({ type: 'NUMBER', value: parseInt(num, 10) });
        continue;
      }
      
      if (/[a-zA-Z_]/.test(s[i])) {
        let ident = '';
        while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) ident += s[i++];
        if (ident.toLowerCase() === 'defined') {
          tokens.push({ type: 'DEFINED', value: 'defined' });
          afterDefined = true;
        } else if (afterDefined) {
          afterDefined = false;
          tokens.push({ type: 'IDENTIFIER', value: ident });
        } else {
          // Check user-defined macros first
          const macro = this.preprocessor.expandMacro(ident);
          if (macro) {
            const val = parseInt(macro.replacement, 10);
            tokens.push({ type: 'NUMBER', value: isNaN(val) ? 0 : val });
          } else {
            // Check built-in macros
            const builtin = this.preprocessor.getBuiltin(ident);
            if (builtin) {
              const val = parseInt(builtin(this.line || 1), 10);
              tokens.push({ type: 'NUMBER', value: isNaN(val) ? 0 : val });
            } else {
              tokens.push({ type: 'NUMBER', value: 0 });
            }
          }
        }
        continue;
      }
      
      if (s[i] === '(') { tokens.push({ type: '(', value: '(' }); i++; continue; }
      if (s[i] === ')') { tokens.push({ type: ')', value: ')' }); i++; continue; }
      
      if (i + 1 < s.length) {
        const two = s[i] + s[i + 1];
        if (['&&', '||', '==', '!=', '<=', '>=', '<<', '>>'].includes(two)) {
          tokens.push({ type: two, value: two });
          i += 2;
          continue;
        }
      }
      
      if (['+', '-', '*', '/', '%', '<', '>', '&', '|', '^', '~', '!'].includes(s[i])) {
        tokens.push({ type: s[i], value: s[i] });
        i++;
        continue;
      }
    }
    
    return tokens;
  }

  /**
   * Evaluates a constant expression for #if/#elif directives
   * @param {string} expr - Expression string
   * @returns {number} Evaluated integer result
   */
  _evaluateConstantExpression(expr) {
    const tokens = this._tokenizeConstantExpression(expr);
    if (tokens.length === 0) return 0;
    
    let pos = 0;
    
    const peek = () => pos < tokens.length ? tokens[pos] : null;
    const consume = () => tokens[pos++];
    
    const parseExpression = () => parseLogicalOr();
    
    const parseLogicalOr = () => {
      let left = parseLogicalAnd();
      while (peek() && peek().type === '||') {
        consume();
        const right = parseLogicalAnd();
        left = left || right ? 1 : 0;
      }
      return left;
    };
    
    const parseLogicalAnd = () => {
      let left = parseEquality();
      while (peek() && peek().type === '&&') {
        consume();
        const right = parseEquality();
        left = left && right ? 1 : 0;
      }
      return left;
    };
    
    const parseEquality = () => {
      let left = parseRelational();
      while (peek() && (peek().type === '==' || peek().type === '!=')) {
        const op = consume().type;
        const right = parseRelational();
        if (op === '==') left = left === right ? 1 : 0;
        else left = left !== right ? 1 : 0;
      }
      return left;
    };
    
    const parseRelational = () => {
      let left = parseAdditive();
      while (peek() && ['<', '>', '<=', '>='].includes(peek().type)) {
        const op = consume().type;
        const right = parseAdditive();
        switch (op) {
          case '<': left = left < right ? 1 : 0; break;
          case '>': left = left > right ? 1 : 0; break;
          case '<=': left = left <= right ? 1 : 0; break;
          case '>=': left = left >= right ? 1 : 0; break;
        }
      }
      return left;
    };
    
    const parseAdditive = () => {
      let left = parseMultiplicative();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = consume().type;
        const right = parseMultiplicative();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };
    
    const parseMultiplicative = () => {
      let left = parseUnary();
      while (peek() && (peek().type === '*' || peek().type === '/' || peek().type === '%')) {
        const op = consume().type;
        const right = parseUnary();
        if (op === '*') left = left * right;
        else if (op === '/') left = right !== 0 ? Math.trunc(left / right) : 0;
        else left = right !== 0 ? left % right : 0;
      }
      return left;
    };
    
    const parseUnary = () => {
      if (peek() && peek().type === '+') { consume(); return parseUnary(); }
      if (peek() && peek().type === '-') { consume(); return -parseUnary(); }
      if (peek() && peek().type === '~') { consume(); return ~parseUnary(); }
      if (peek() && peek().type === '!') { consume(); return parseUnary() ? 0 : 1; }
      return parseShift();
    };
    
    const parseShift = () => {
      let left = parsePrimary();
      while (peek() && (peek().type === '<<' || peek().type === '>>')) {
        const op = consume().type;
        const right = parsePrimary();
        left = op === '<<' ? (left << right) : (left >> right);
      }
      return left;
    };
    
    const parsePrimary = () => {
      const token = peek();
      if (!token) return 0;
      
      if (token.type === 'NUMBER') {
        consume();
        return token.value;
      }
      
      if (token.type === '(') {
        consume();
        const val = parseExpression();
        if (peek() && peek().type === ')') consume();
        return val;
      }
      
      if (token.type === 'DEFINED') {
        consume();
        if (peek() && peek().type === '(') {
          consume();
          const nameToken = consume();
          const name = typeof nameToken.value === 'string' ? nameToken.value : String(nameToken.value);
          const defined = this.preprocessor.isMacroDefined(name);
          if (peek() && peek().type === ')') consume();
          return defined ? 1 : 0;
        } else {
          const nameToken = consume();
          const name = typeof nameToken.value === 'string' ? nameToken.value : String(nameToken.value);
          return this.preprocessor.isMacroDefined(name) ? 1 : 0;
        }
      }
      
      return 0;
    };
    
    return parseExpression();
  }

  /**
   * Handles #if directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleIf(location) {
    const lineContent = this._readLineContent();
    
    if (this.preprocessor.skipDepth > 0) {
      this.preprocessor.conditionalStack.push({ active: false, branchTaken: false });
      this.preprocessor.skipDepth++;
      return null;
    }
    
    const result = this._evaluateConstantExpression(lineContent);
    const isActive = this.preprocessor.isEffectivelyActive() && result !== 0;
    
    this.preprocessor.conditionalStack.push({ active: isActive, branchTaken: isActive });
    return null;
  }

  /**
   * Handles #elif directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleElif(location) {
    if (this.preprocessor.skipDepth > 0) {
      return null;
    }
    
    if (this.preprocessor.conditionalStack.length === 0) {
      throw new LexerError('#elif without matching #if', location);
    }
    
    const top = this.preprocessor.conditionalStack[this.preprocessor.conditionalStack.length - 1];
    
    if (top.branchTaken) {
      top.active = false;
      return null;
    }
    
    const lineContent = this._readLineContent();
    const result = this._evaluateConstantExpression(lineContent);
    
    const parentActive = this.preprocessor.conditionalStack.length <= 1
      ? true
      : this.preprocessor.conditionalStack.slice(0, -1).every(f => f.active);
    
    const isActive = parentActive && result !== 0;
    top.active = isActive;
    top.branchTaken = isActive || top.branchTaken;
    return null;
  }

  /**
   * Handles #ifdef directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleIfdef(location) {
    const lineContent = this._readLineContent();
    
    if (this.preprocessor.skipDepth > 0) {
      this.preprocessor.skipDepth++;
      return null;
    }
    
    const name = lineContent.trim();
    
    if (!name) {
      throw new LexerError('#ifdef requires a macro name', location);
    }
    
    const isDefined = this.preprocessor.isMacroDefined(name);
    const isActive = this.preprocessor.isEffectivelyActive() && isDefined;
    
    this.preprocessor.conditionalStack.push({ active: isActive, branchTaken: isActive });
    return null;
  }

  /**
   * Handles #ifndef directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleIfndef(location) {
    const lineContent = this._readLineContent();
    
    if (this.preprocessor.skipDepth > 0) {
      this.preprocessor.skipDepth++;
      return null;
    }
    
    const name = lineContent.trim();
    
    if (!name) {
      throw new LexerError('#ifndef requires a macro name', location);
    }
    
    const isDefined = this.preprocessor.isMacroDefined(name);
    const isActive = this.preprocessor.isEffectivelyActive() && !isDefined;
    
    this.preprocessor.conditionalStack.push({ active: isActive, branchTaken: isActive });
    return null;
  }

  /**
   * Handles #else directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleElse(location) {
    if (this.preprocessor.skipDepth > 0) {
      return null;
    }
    
    if (this.preprocessor.conditionalStack.length === 0) {
      throw new LexerError('#else without matching #if', location);
    }
    
    const top = this.preprocessor.conditionalStack[this.preprocessor.conditionalStack.length - 1];
    top.active = !top.branchTaken;
    top.branchTaken = true;
    return null;
  }

  /**
   * Handles #endif directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleEndif(location) {
    if (this.preprocessor.skipDepth > 0) {
      this.preprocessor.skipDepth--;
      return null;
    }
    
    if (this.preprocessor.conditionalStack.length === 0) {
      throw new LexerError('#endif without matching #if', location);
    }
    
    this.preprocessor.conditionalStack.pop();
    return null;
  }

  /**
   * Handles #pragma directive
   * @param {Object} location - Source location
   * @returns {Token|null} Pragmac result or null
   */
  _handlePragma(location) {
    if (this.preprocessor.skipDepth > 0) return null;
    if (!this.preprocessor.isEffectivelyActive()) return null;
    
    const pragmaArgs = this._readLineContent();
    
    const parts = pragmaArgs.split(/\s+/);
    const pragmaName = parts[0] || '';
    const pragmaValue = parts.slice(1).join(' ') || '';
    
    const handler = this.preprocessor.getPragmaHandler(pragmaName);
    if (handler) {
      try {
        const result = handler({ value: pragmaValue, location }, { location });
        return result;
      } catch (error) {
        throw new LexerError(error.message || 'Pragma error', location);
      }
    }

    return null;
  }

  /**
   * Handles #include directive
   * @param {Object} location - Source location
   * @returns {Object|null} Include token marker or null
   */
  _handleInclude(location) {
    if (this.preprocessor.skipDepth > 0 || !this.preprocessor.isEffectivelyActive()) {
      this._readLineContent();
      return null;
    }

    const lineContent = this._readLineContent();
    
    let filename;
    let isSystem = false;
    
    const quoteMatch = lineContent.match(/^\s*"([^"]+)"\s*$/);
    const angleMatch = lineContent.match(/^\s*<([^>]+)>\s*$/);
    
    if (quoteMatch) {
      filename = quoteMatch[1];
      isSystem = false;
    } else if (angleMatch) {
      filename = angleMatch[1];
      isSystem = true;
    } else {
      throw new LexerError(`Invalid #include directive: ${lineContent}`, location);
    }

    const currentDir = this._getParentDir(this.preprocessor.filename);
    const resolvedPath = this.preprocessor.resolveInclude(filename, isSystem, currentDir);
    
    if (!resolvedPath) {
      throw new LexerError(`Cannot open include file: ${filename}`, location);
    }

    return { type: 'include', filePath: resolvedPath, location };
  }

  /**
   * Gets the parent directory of a file path
   * @param {string} filePath - File path
   * @returns {string|null} Parent directory or null
   */
  _getParentDir(filePath) {
    if (!filePath || filePath === '<input>') return null;
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    if (lastSlash === -1) return '.';
    return filePath.substring(0, lastSlash);
  }

  /**
   * Main tokenization loop - gets next token
   * @returns {Token} Next token in the source
   */
  nextToken() {
    // Check token buffer first (from macro expansion)
    if (this.tokenBuffer.length > 0) {
      return this.tokenBuffer.pop();
    }

    // Save position for backtracking if needed
    this.tokenStartPos = this.pos;
    this.tokenStartLine = this.line;
    this.tokenStartColumn = this.column;

    this.skipWhitespace();

    const ch = this.peek();

    // Handle EOF
    if (!ch) {
      return this.makeToken(TokenType.EOF, '');
    }

    // Handle preprocessor directive
    if (this.column === 0 && ch === '#') {
      const result = this.readDirective();
      if (result === null) {
        return this.nextToken();
      }
      return result;
    }

    // Skip lines in inactive conditional blocks
    if (!this.preprocessor.isEffectivelyActive()) {
      this._skipLine();
      return this.nextToken();
    }

    // String literal
    if (ch === '"' || ch === '\'') {
      return this.readString();
    }

    // Integer literal
    if (/^[0-9]/.test(ch)) {
      return this.readInteger();
    }

    // Identifier or keyword
    if (/^[a-zA-Z_]/.test(ch)) {
      const result = this.readIdentifier();
      if (Array.isArray(result)) {
        // Macro expanded to multiple tokens - push all but first to buffer
        if (result.length > 1) {
          this.tokenBuffer.unshift(...result.slice(1).reverse());
        }
        return result.length > 0 ? result[0] : this.nextToken();
      }
      return result;
    }

    // Two-character operators
    const twoChar = ch + this.peekNext(1);
    if (twoChar === '//' || twoChar === '/*') {
      if (twoChar === '//') {
        this.skipSingleLineComment();
        return this.nextToken();
      } else {
        this.skipMultiLineComment();
        return this.nextToken();
      }
    }

    // Two-character operators and assignment variants
    const twoOps = [
      '==', '!=', '<=', '>=', '<<', '>>', '&&', '||', '->',
      '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
      '<<=', '>>='
    ];

    if (twoChar === '::') {
      this.advance();
      this.advance();
      return this.makeToken(TokenType.COLON_COLON, '::');
    }

    for (const op of twoOps) {
      if (op === twoChar) {
        this.advance();
        this.advance();
        return this.makeToken(op, op);
      }
    }

    // Three-character operators (ellipsis for variadic functions)
    const threeChar = ch + this.peekNext(1) + this.peekNext(2);
    if (threeChar === '...') {
      this.advance();
      this.advance();
      this.advance();
      return this.makeToken('ELLIPSIS', '...');
    }

    // Single character tokens
    const singleTokens = {
      '+': TokenType.PLUS, '-': TokenType.MINUS, '*': TokenType.STAR,
      '/': TokenType.SLASH, '%': TokenType.PERCENT, '&': TokenType.AMPERSAND,
      '|': TokenType.PIPE, '^': TokenType.CARET, '~': TokenType.TILDE,
      '!': TokenType.NOT, '=': TokenType.ASSIGN, '?': TokenType.QUESTION,
      '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
      '{': TokenType.LBRACE, '}': TokenType.RBRACE,
      ',': TokenType.COMMA, ';': TokenType.SEMICOLON,
      ':': TokenType.COLON, '.': TokenType.DOT, '>': TokenType.GT, '<': TokenType.LT
    };

    if (singleTokens[ch]) {
      this.advance();
      return this.makeToken(singleTokens[ch], ch);
    }

    throw new LexerError(`Unexpected character: ${ch}`, this._makeLocation());
  }

  /**
   * Skips the rest of the current line
   */
  _skipLine() {
    while (this.peek() && this.peek() !== '\n') {
      this.advance();
    }
  }

  /**
   * Tokenizes the entire source into an array of tokens
   * @returns {Token[]} Array of all tokens
   */
  tokenize() {
    const tokens = [];

    while (true) {
      const token = this.nextToken();

      // Handle null returns (recursion guard in macro expansion)
      if (!token) continue;

      if (token.type === TokenType.EOF) {
        break;
      }

      // Skip directive results that are not regular tokens
      if (typeof token !== 'object' || !token.type) {
        continue;
      }

      // Handle include directive
      if (token.type === 'include') {
        const includedTokens = this._tokenizeIncludedFile(token.filePath);
        tokens.push(...includedTokens);
        continue;
      }

      tokens.push(token);
    }

    return tokens;
  }

  /**
   * Tokenizes an included file
   * @param {string} filePath - Absolute path to included file
   * @returns {Token[]} Tokens from the included file
   */
  _tokenizeIncludedFile(filePath) {
    if (this.preprocessor.isFileIncluded(filePath)) {
      return [];
    }

    this.preprocessor.markFileIncluded(filePath);

    const source = readFileSync(filePath, 'utf-8');

    const includePreprocessor = new PreprocessedSource(filePath, {
      includePaths: this.preprocessor.includePaths
    });
    includePreprocessor.macros = this.preprocessor.macros;
    includePreprocessor.includedFiles = this.preprocessor.includedFiles;

    const includeLexer = new Lexer(source, includePreprocessor);
    return includeLexer.tokenize();
  }
}
