import { TokenType, Keywords } from './tokenTypes.js';
import { PreprocessedSource } from './preprocessed-source.js';
import { LexerError } from '../core/errors.js';

/**
 * Core lexer state and character-level operations
 * Provides base functionality for character access, token creation,
 * and literal reading without macro/directive/constant logic.
 */
export class LexerCore {
  /**
   * Creates a new lexer core instance
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

    // Invocation line for built-in macros during macro expansion
    this.invocationLine = null;

    // Position to restore on backtracking (for unknown directives)
    this.tokenStartPos = 0;
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
   * Reads a float literal
   * @returns {Token} Float token
   */
  readFloat() {
    let value = '';

    // Read integer part (may be empty for .NNN format)
    while (/[0-9]/.test(this.peek())) {
      value += this.advance();
    }

    // Read decimal point and fractional part
    if (this.peek() === '.') {
      value += this.advance();
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    // Read exponent part
    if (this.peek() && /[eE]/.test(this.peek())) {
      value += this.advance();
      if (this.peek() && /[+-]/.test(this.peek())) {
        value += this.advance();
      }
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    // Read optional f/F suffix
    if (this.peek() && /[fF]/.test(this.peek())) {
      value += this.advance();
    }

    return this.makeToken(TokenType.FLOAT, value);
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

    // Float literal
    if (/^[0-9]/.test(ch) && this.peekNext(1) === '.') {
      return this.readFloat();
    }

    if (ch === '.' && this.peekNext(1) && /[0-9]/.test(this.peekNext(1))) {
      return this.readFloat();
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
      '++', '--',
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
   * Skips the rest of the current line
   */
  _skipLine() {
    while (this.peek() && this.peek() !== '\n') {
      this.advance();
    }
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
}
