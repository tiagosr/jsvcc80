import { TokenType, Keywords } from './tokenTypes.js';
import { LexerError } from '../core/errors.js';
import { PositionTracker } from '../core/location.js';

/**
 * Preprocessed source with macro definitions and pragma handlers
 */
export class PreprocessedSource {
  /**
   * Creates a new preprocessor instance
   * @param {string} filename - Source filename
   */
  constructor(filename = '<input>') {
    this.filename = filename;
    this.macros = new Map();
    this.pragmaHandlers = new Map();
    this.locationTracker = new PositionTracker(filename);
    
    // Register default pragma handlers
    this._registerDefaultPragmas();
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
   * Reads an identifier or keyword
   * @returns {Token} Identifier or keyword token
   */
  readIdentifier() {
    let value = '';
    
    while (/[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.advance();
    }

    const type = Keywords.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
    
    return this.makeToken(type, value);
  }

  /**
   * Reads a pragma directive and returns processed result
   * @returns {Token|string|null} Token or special pragma result
   */
  readPragma() {
    const startLine = this.line;
    const startColumn = this.column;
    
    // Skip # character
    this.advance();
    
    // Skip whitespace after #
    while (this.peek() && /\s/.test(this.peek())) {
      this.advance();
    }

    // Read pragma keyword
    let keyword = '';
    while (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.peek()) || this.peek() === ' ') {
      if (this.peek() !== ' ') {
        keyword += this.advance();
      } else {
        this.advance();
      }
    }

    const location = {
      file: this.preprocessor.filename,
      start: { line: startLine, column: startColumn },
      end: { line: this.line, column: this.column }
    };

    if (keyword.toLowerCase() !== 'pragma') {
      // Not a pragma directive, return the # token
      this.pos = this.tokenStartPos;
      this.line = this.tokenStartLine;
      this.column = this.tokenStartColumn;
      return this.makeToken(TokenType.POUND, '#');
    }

    // Get remaining line content for pragma arguments
    const pragmaContent = this._readPragmaArguments();
    
    const handler = this.preprocessor.getPragmaHandler(keyword);
    if (handler) {
      try {
        const result = handler(this.makeToken(TokenType.IDENTIFIER, keyword), { location });
        return result; // Return special pragma result instead of token
      } catch (error) {
        throw new LexerError(error.message || 'Pragma error', location);
      }
    }

    return this.makeToken(TokenType.KEYWORD, `#pragma ${keyword}`);
  }

  /**
   * Reads arguments after #pragma keyword
   * @returns {string} Arguments string
   */
  _readPragmaArguments() {
    let args = '';
    while (this.peek() && this.peek() !== '\n') {
      args += this.advance();
    }
    return args.trim();
  }

  /**
   * Main tokenization loop - gets next token
   * @returns {Token} Next token in the source
   */
  nextToken() {
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
      return this.readPragma();
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
      return this.readIdentifier();
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
      '==', '!=', '<=', '>=', '<<', '>>', '&&', '||', 
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
   * Tokenizes the entire source into an array of tokens
   * @returns {Token[]} Array of all tokens
   */
  tokenize() {
    const tokens = [];
    
    while (true) {
      const token = this.nextToken();
      
      if (token.type === TokenType.EOF) {
        break;
      }

      // Skip pragma results that are not regular tokens
      if (typeof token !== 'object' || !token.type) {
        continue;
      }

      tokens.push(token);
    }

    return tokens;
  }
}
