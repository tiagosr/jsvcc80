import { TokenType, Keywords } from './tokenTypes.js';
import { PreprocessedSource as _PreprocessedSource } from './preprocessed-source.js';
import { LexerCore } from './lexer-core.js';
import { MacroExpander } from './macro-expansion.js';
import { DirectiveHandler } from './directives.js';
import { ConstantEvaluator } from './const-eval.js';
import { readFileSync } from 'fs';

export { _PreprocessedSource as PreprocessedSource };

/**
 * C Lexer with preprocessor support.
 * Composes LexerCore (shared state) with MacroExpander, DirectiveHandler,
 * and ConstantEvaluator sub-handlers.
 */
export class Lexer extends LexerCore {
  /**
   * Creates a new lexer instance
   * @param {string} source - Source code to tokenize
   * @param {PreprocessedSource} [preprocessor] - Optional preprocessor for pragma handling
   */
  constructor(source, preprocessor = null) {
    super(source, preprocessor || new _PreprocessedSource());
    this._macroExpander = new MacroExpander(this);
    this._directiveHandler = new DirectiveHandler(this);
    this._constEvaluator = new ConstantEvaluator(this.preprocessor);
  }

  /**
   * Expands a macro, delegating to the macro expander
   * @param {string} name - Macro name as written in source
   * @param {Object} macro - Macro definition
   * @returns {Token|null} First expanded token, or null if recursion guard prevents expansion
   */
  _expandMacro(name, macro) {
    return this._macroExpander.expandMacro(name, macro);
  }

  /**
   * Expands macros within argument tokens
   * @param {Token[]} tokens - Argument tokens
   * @param {number} invocationLine - Line number for built-in macros
   * @returns {Token[]} Expanded tokens
   */
  _expandArgTokens(tokens, invocationLine) {
    return this._macroExpander._expandArgTokens(tokens, invocationLine);
  }

  /**
   * Tokenizes replacement text and substitutes parameters at token level
   * @param {string} replacement - Raw replacement text
   * @param {string[]} params - Parameter names
   * @param {Token[][]} expandedArgs - Expanded argument token arrays
   * @param {string[]} argTexts - Raw argument text for stringification
   * @param {number} invocationLine - Line number for built-in macros
   * @returns {Token[]} Resulting tokens after substitution
   */
  _substituteParamsTokens(replacement, params, expandedArgs, argTexts, invocationLine) {
    return this._macroExpander._substituteParamsTokens(replacement, params, expandedArgs, argTexts, invocationLine);
  }

  /**
   * Expands macros within a token array directly
   * @param {Token[]} tokens - Token array
   * @param {number} invocationLine - Line number for built-in macros
   * @returns {Token[]} Expanded tokens
   */
  _expandTokensMacros(tokens, invocationLine) {
    return this._macroExpander._expandTokensMacros(tokens, invocationLine);
  }

  /**
   * Collects argument token groups from a token array
   * @param {Token[]} tokens - Token array
   * @param {number} startIdx - Index after '('
   * @returns {{tokens: Token[][], closeIdx: number}}
   */
  _collectArgsFromTokens(tokens, startIdx) {
    return this._macroExpander._collectArgsFromTokens(tokens, startIdx);
  }

  /**
   * Parses macro arguments, collecting tokens until matching ')'
   * @returns {Token[][]|null} Array of argument token lists, or null on failure
   */
  _parseMacroArgs() {
    return this._macroExpander._parseMacroArgs();
  }

  /**
   * Reads a preprocessor directive and returns processed result
   * @returns {Token|string|null} Token or special directive result
   */
  readDirective() {
    return this._directiveHandler.readDirective();
  }

  /**
   * Evaluates a constant expression for #if/#elif directives
   * @param {string} expr - Expression string
   * @returns {number} Evaluated integer result
   */
  _evaluateConstantExpression(expr) {
    return this._constEvaluator.evaluate(expr);
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

    // Float literal - check if digit sequence is followed by decimal point and digit
    if (/^[0-9]/.test(ch)) {
      let pos = this.pos + 1;
      let hasDot = false;
      while (pos < this.source.length && /[0-9]/.test(this.source[pos])) {
        pos++;
      }
      if (pos < this.source.length && this.source[pos] === '.' && pos + 1 < this.source.length && /[0-9]/.test(this.source[pos + 1])) {
        return this.readFloat();
      }
    }

    if (ch === '.' && this.peekNext(1) && /[0-9]/.test(this.peekNext(1))) {
      return this.readFloat();
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

    // Three-character operators (compound shifts and ellipsis)
    const threeChar = ch + this.peekNext(1) + this.peekNext(2);
    if (threeChar === '<<=' || threeChar === '>>=') {
      this.advance();
      this.advance();
      this.advance();
      return this.makeToken(threeChar, threeChar);
    }
    if (threeChar === '...') {
      this.advance();
      this.advance();
      this.advance();
      return this.makeToken('ELLIPSIS', '...');
    }

    // Two-character operators and assignment variants
    const twoOps = [
      '++', '--',
      '==', '!=', '<=', '>=', '<<', '>>', '&&', '||', '->',
      '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='
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

      // Handle embed directive
      if (token.type === 'embed') {
        const embedTokens = this._tokenizeEmbedResult(token);
        tokens.push(...embedTokens);
        continue;
      }

      // Skip pragma directive results
      if (token.type === 'pragma_once' || token.type === 'pragma_pack' || token.type === 'pragma_pack_push' || token.type === 'pragma_pack_pop') {
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

    const includePreprocessor = new _PreprocessedSource(filePath, {
      includePaths: this.preprocessor.includePaths
    });
    includePreprocessor.macros = this.preprocessor.macros;
    includePreprocessor.includedFiles = this.preprocessor.includedFiles;

    const includeLexer = new Lexer(source, includePreprocessor);
    return includeLexer.tokenize();
  }

  /**
   * Tokenizes an embed directive result into INTEGER tokens
   * @param {Object} embedResult - Embed result with bytes, prefix, suffix, location
   * @returns {Token[]} Array of tokens from the embed
   */
  _tokenizeEmbedResult(embedResult) {
    const tokens = [];
    const location = embedResult.location;

    // Tokenize prefix
    if (embedResult.prefix) {
      tokens.push(...this._tokenizeString(embedResult.prefix, location));
    }

    // Tokenize items (if_empty substitute) or bytes (normal embed)
    if (embedResult.items) {
      for (const item of embedResult.items) {
        if (item.type === 'byte') {
          tokens.push(this.makeToken(TokenType.INTEGER, String(item.value), location));
        } else if (item.type === 'comma') {
          tokens.push(this.makeToken(TokenType.COMMA, ',', location));
        }
      }
    } else if (embedResult.bytes) {
      for (let i = 0; i < embedResult.bytes.length; i++) {
        tokens.push(this.makeToken(TokenType.INTEGER, String(embedResult.bytes[i]), location));
      }
    }

    // Tokenize suffix
    if (embedResult.suffix) {
      tokens.push(...this._tokenizeString(embedResult.suffix, location));
    }

    return tokens;
  }

  /**
   * Tokenizes a string into lexer tokens
   * @param {string} str - String to tokenize
   * @param {Object} location - Source location
   * @returns {Token[]} Array of tokens
   */
  _tokenizeString(str, location) {
    const tokens = [];
    let i = 0;

    while (i < str.length) {
      const ch = str[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (/^[0-9]/.test(ch)) {
        let num = '';
        while (i < str.length && /^[0-9]/.test(str[i])) {
          num += str[i++];
        }
        tokens.push(this.makeToken(TokenType.INTEGER, num, location));
        continue;
      }

      if (ch === ',') {
        tokens.push(this.makeToken(TokenType.COMMA, ',', location));
        i++;
        continue;
      }

      if (/^[a-zA-Z_]/.test(ch)) {
        let ident = '';
        while (i < str.length && /^[a-zA-Z0-9_]/.test(str[i])) {
          ident += str[i++];
        }
        const type = Keywords.has(ident) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        tokens.push(this.makeToken(type, ident, location));
        continue;
      }

      if (ch === '(' || ch === ')' || ch === '[' || ch === ']') {
        tokens.push(this.makeToken(ch, ch, location));
        i++;
        continue;
      }

      const twoChar = ch + (str[i + 1] || '');
      const twoOps = ['++', '--', '==', '!=', '<=', '>=', '<<', '>>', '&&', '||', '->', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
      if (twoOps.includes(twoChar)) {
        tokens.push(this.makeToken(twoChar, twoChar, location));
        i += 2;
        continue;
      }

      tokens.push(this.makeToken(ch, ch, location));
      i++;
    }

    return tokens;
  }
}
