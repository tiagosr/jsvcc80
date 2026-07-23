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
    this.conditionalStack = [];
    this.skipDepth = 0;
    
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
   * Checks if a macro is defined
   * @param {string} name - Macro name
   * @returns {boolean} True if macro is defined
   */
  isMacroDefined(name) {
    return this.macros.has(name.toLowerCase());
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
    if (kw === 'ifdef') return this._handleIfdef(location);
    if (kw === 'ifndef') return this._handleIfndef(location);
    if (kw === 'else') return this._handleElse(location);
    if (kw === 'endif') return this._handleEndif(location);
    if (kw === 'pragma') return this._handlePragma(location);

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
    
    const parts = lineContent.split(/\s+/);
    
    if (parts.length < 1 || !parts[0]) {
      throw new LexerError('#define requires a macro name', location);
    }

    const name = parts[0];
    const replacement = parts.slice(1).join(' ') || '';
    
    this.preprocessor.defineMacro(name, null, replacement);
    return null;
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
    
    this.preprocessor.conditionalStack.push({ active: isActive, evaluated: false });
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
    
    this.preprocessor.conditionalStack.push({ active: isActive, evaluated: false });
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
      throw new LexerError('#else without matching #ifdef/#ifndef', location);
    }
    
    const top = this.preprocessor.conditionalStack[this.preprocessor.conditionalStack.length - 1];
    top.active = !top.active;
    top.evaluated = true;
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
      throw new LexerError('#endif without matching #ifdef/#ifndef', location);
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
      
      if (token.type === TokenType.EOF) {
        break;
      }

      // Skip directive results that are not regular tokens
      if (typeof token !== 'object' || !token.type) {
        continue;
      }

      tokens.push(token);
    }

    return tokens;
  }
}
