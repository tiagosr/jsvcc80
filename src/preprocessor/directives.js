import { TokenType } from './tokenTypes.js';
import { LexerError } from '../core/errors.js';
import { PreprocessedSource } from './preprocessed-source.js';
import { readFileSync } from 'fs';

/**
 * Handles preprocessor directives: #define, #undef, #if, #ifdef,
 * #ifndef, #elif, #else, #endif, #pragma, #include.
 * Operates on a lexer instance passed in the constructor.
 */
export class DirectiveHandler {
  /**
   * Creates a new directive handler
   * @param {Object} lexer - The lexer instance to operate on
   */
  constructor(lexer) {
    this.lexer = lexer;
  }

  /**
   * Reads a preprocessor directive and returns processed result
   * @returns {Token|string|null} Token or special directive result
   */
  readDirective() {
    const startLine = this.lexer.line;
    const startColumn = this.lexer.column;

    // Skip # character
    this.lexer.advance();

    // Skip whitespace after #
    while (this.lexer.peek() && /\s/.test(this.lexer.peek())) {
      this.lexer.advance();
    }

    // Read directive keyword
    let keyword = '';
    while (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.lexer.peek())) {
      keyword += this.lexer.advance();
    }

    const location = {
      file: this.lexer.preprocessor.filename,
      start: { line: startLine, column: startColumn },
      end: { line: this.lexer.line, column: this.lexer.column }
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
    if (kw === 'embed') return this._handleEmbed(location);

    // Unknown directive - backtrack and emit POUND token
    this.lexer.pos = this.lexer.tokenStartPos;
    this.lexer.line = this.lexer.tokenStartLine;
    this.lexer.column = this.lexer.tokenStartColumn;
    return this.lexer.makeToken(TokenType.POUND, '#');
  }

  /**
   * Handles #embed directive for binary file inclusion
   * @param {Object} location - Source location
   * @returns {Object|null} Embed result or null
   */
  _handleEmbed(location) {
    if (this.lexer.preprocessor.skipDepth > 0 || !this.lexer.preprocessor.isEffectivelyActive()) {
      this.lexer._readLineContent();
      return null;
    }

    let lineContent = this.lexer._readLineContent();

    // Expand object-like macros in line content
    for (const [name, macro] of this.lexer.preprocessor.macros) {
      const regex = new RegExp(`\\b${macro.name}\\b`, 'g');
      lineContent = lineContent.replace(regex, macro.replacement);
    }

    let filename;
    let isSystem = false;

    const quoteMatch = lineContent.match(/^\s*"([^"]+)"\s*(.*)$/);
    const angleMatch = lineContent.match(/^\s*<([^>]+)>\s*(.*)$/);

    let attrString = '';
    if (quoteMatch) {
      filename = quoteMatch[1];
      attrString = quoteMatch[2] || '';
      isSystem = false;
    } else if (angleMatch) {
      filename = angleMatch[1];
      attrString = angleMatch[2] || '';
      isSystem = true;
    } else {
      throw new LexerError(`Invalid #embed directive: ${lineContent}`, location);
    }

    const currentDir = this.lexer._getParentDir(this.lexer.preprocessor.filename);
    const resolvedPath = this.lexer.preprocessor.resolveInclude(filename, isSystem, currentDir);

    if (!resolvedPath) {
      throw new LexerError(`Cannot open embed file: ${filename}`, location);
    }

    const attributes = this._parseEmbedAttributes(attrString);

    const fileData = readFileSync(resolvedPath);

    const offset = attributes.offset !== undefined ? attributes.offset : 0;
    const limit = attributes.limit !== undefined ? attributes.limit : fileData.length;

    if (offset > fileData.length) {
      throw new LexerError(`Embed offset (${offset}) exceeds file size (${fileData.length})`, location);
    }

    const start = offset;
    const end = Math.min(start + limit, fileData.length);
    let bytes = fileData.subarray(start, end);

    // Use if_empty substitute values when file is empty
    if (bytes.length === 0 && attributes.ifEmpty !== undefined) {
      return { type: 'embed', items: attributes.ifEmpty, prefix: attributes.prefix || '', suffix: attributes.suffix || '', location };
    }

    return { type: 'embed', bytes, prefix: attributes.prefix || '', suffix: attributes.suffix || '', location };
  }

  /**
    * Parses #embed attributes from the attribute string
     * @param {string} attrString - Attribute string after filename
     * @returns {{limit?: number, offset?: number, prefix?: string, suffix?: string, ifEmpty?: Array<{type: 'byte', value: number}|{type: 'comma'}>}}
    */
   _parseEmbedAttributes(attrString) {
     const result = { limit: undefined, offset: undefined, prefix: '', suffix: '', ifEmpty: undefined };

     const trimmed = attrString.trim();

     if (!trimmed) return result;

     let i = 0;

     while (i < trimmed.length) {
       i = this._skipWhitespace(trimmed, i);
       if (i >= trimmed.length || trimmed[i] === ')') {
         if (i < trimmed.length && trimmed[i] === ')') {
           return result;
         }
         break;
       }

       // Read attribute name
       let name = '';
       while (i < trimmed.length && /[a-zA-Z_]/.test(trimmed[i])) {
         name += trimmed[i++];
       }

       // Skip whitespace after name
       i = this._skipWhitespace(trimmed, i);

       // Expect '('
       if (i >= trimmed.length || trimmed[i] !== '(') {
         throw new LexerError(`Expected '(' after attribute name '${name}'`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + i } });
       }
       i++; // Skip '('

       // Find matching closing parenthesis for this attribute's value
       let valueDepth = 1;
       let valueStart = i;
       while (i < trimmed.length && valueDepth > 0) {
         if (trimmed[i] === '(') valueDepth++;
         else if (trimmed[i] === ')') valueDepth--;
         i++;
       }

       if (valueDepth !== 0) {
         throw new LexerError(`Unclosed parenthesis in attribute '${name}'`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + i } });
       }

       const value = trimmed.substring(valueStart, i - 1).trim();
       this._processEmbedAttribute(name, value, result);

       // Skip whitespace after attribute
       i = this._skipWhitespace(trimmed, i);

       // Check for end of attribute list
       if (i >= trimmed.length) {
         return result;
       }

       // Expect comma or closing parenthesis
       if (trimmed[i] === ')') {
         return result;
       }
       if (trimmed[i] === ',') {
         i++; // Skip comma
       }
     }

     throw new LexerError('Unclosed parenthesis in #embed attributes', { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + trimmed.length } });
   }

  /**
   * Skips whitespace in a string starting from given position
   * @param {string} str - String to skip whitespace in
   * @param {number} pos - Starting position
   * @returns {number} New position after whitespace
   */
  _skipWhitespace(str, pos) {
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }
    return pos;
  }

  /**
   * Processes a single #embed attribute
   * @param {string} name - Attribute name (e.g., "limit", "prefix")
   * @param {string} value - Attribute value (e.g., "100", "comma, separated")
   * @param {Object} result - Result object to populate
   */
  _processEmbedAttribute(name, value, result) {
    const lowerName = name.toLowerCase();

    if (lowerName === 'limit') {
      const match = value.match(/^(\d+)$/);
      if (!match) {
        throw new LexerError(`Invalid limit value: ${value}`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + name.length } });
      }
      result.limit = parseInt(match[1], 10);
      return;
    }

    if (lowerName === 'offset') {
      const match = value.match(/^(\d+)$/);
      if (!match) {
        throw new LexerError(`Invalid offset value: ${value}`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + name.length } });
      }
      result.offset = parseInt(match[1], 10);
      return;
    }

    if (lowerName === 'prefix') {
      result.prefix = value;
      return;
    }

    if (lowerName === 'suffix') {
      result.suffix = value;
      return;
    }

    if (lowerName === 'if_empty') {
      // Parse comma-separated values as substitute items (bytes or comma markers)
      const values = value.split(',').map(v => v.trim());
      const items = [];
      for (let i = 0; i < values.length; i++) {
        const lower = values[i].toLowerCase();
        if (lower === 'comma') {
          items.push({ type: 'comma' });
          continue;
        }
        const match = values[i].match(/^(\d+)$/);
        if (!match) {
          throw new LexerError(`Invalid if_empty value: ${values[i]}`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + name.length } });
        }
        const num = parseInt(match[1], 10);
        if (num < 0 || num > 255) {
          throw new LexerError(`if_empty value out of range (0-255): ${num}`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + name.length } });
        }
        items.push({ type: 'byte', value: num });
      }
      result.ifEmpty = items;
      return;
    }

    throw new LexerError(`Unknown #embed attribute: ${name}`, { file: this.lexer.preprocessor.filename, start: { line: this.lexer.line, column: this.lexer.column }, end: { line: this.lexer.line, column: this.lexer.column + name.length } });
  }

  /**
   * Handles #define directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleDefine(location) {
    const lineContent = this.lexer._readLineContent();

    if (this.lexer.preprocessor.skipDepth > 0 || !this.lexer.preprocessor.isEffectivelyActive()) return null;

    const parsed = this._parseDefineLine(lineContent, location);

    this.lexer.preprocessor.defineMacro(parsed.name, parsed.args, parsed.replacement);
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
    const lineContent = this.lexer._readLineContent();

    if (this.lexer.preprocessor.skipDepth > 0 || !this.lexer.preprocessor.isEffectivelyActive()) return null;

    const name = lineContent.trim();

    if (!name) {
      throw new LexerError('#undef requires a macro name', location);
    }

    this.lexer.preprocessor.undefineMacro(name);
    return null;
  }

  /**
   * Handles #if directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleIf(location) {
    const lineContent = this.lexer._readLineContent();

    if (this.lexer.preprocessor.skipDepth > 0) {
      this.lexer.preprocessor.conditionalStack.push({ active: false, branchTaken: false });
      this.lexer.preprocessor.skipDepth++;
      return null;
    }

    const result = this.lexer._evaluateConstantExpression(lineContent);
    const isActive = this.lexer.preprocessor.isEffectivelyActive() && result !== 0;

    this.lexer.preprocessor.conditionalStack.push({ active: isActive, branchTaken: isActive });
    return null;
  }

  /**
   * Handles #elif directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleElif(location) {
    if (this.lexer.preprocessor.skipDepth > 0) {
      return null;
    }

    if (this.lexer.preprocessor.conditionalStack.length === 0) {
      throw new LexerError('#elif without matching #if', location);
    }

    const top = this.lexer.preprocessor.conditionalStack[this.lexer.preprocessor.conditionalStack.length - 1];

    if (top.branchTaken) {
      top.active = false;
      return null;
    }

    const lineContent = this.lexer._readLineContent();
    const result = this.lexer._evaluateConstantExpression(lineContent);

    const parentActive = this.lexer.preprocessor.conditionalStack.length <= 1
      ? true
      : this.lexer.preprocessor.conditionalStack.slice(0, -1).every(f => f.active);

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
    const lineContent = this.lexer._readLineContent();

    if (this.lexer.preprocessor.skipDepth > 0) {
      this.lexer.preprocessor.skipDepth++;
      return null;
    }

    const name = lineContent.trim();

    if (!name) {
      throw new LexerError('#ifdef requires a macro name', location);
    }

    const isDefined = this.lexer.preprocessor.isMacroDefined(name);
    const isActive = this.lexer.preprocessor.isEffectivelyActive() && isDefined;

    this.lexer.preprocessor.conditionalStack.push({ active: isActive, branchTaken: isActive });
    return null;
  }

  /**
   * Handles #ifndef directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleIfndef(location) {
    const lineContent = this.lexer._readLineContent();

    if (this.lexer.preprocessor.skipDepth > 0) {
      this.lexer.preprocessor.skipDepth++;
      return null;
    }

    const name = lineContent.trim();

    if (!name) {
      throw new LexerError('#ifndef requires a macro name', location);
    }

    const isDefined = this.lexer.preprocessor.isMacroDefined(name);
    const isActive = this.lexer.preprocessor.isEffectivelyActive() && !isDefined;

    this.lexer.preprocessor.conditionalStack.push({ active: isActive, branchTaken: isActive });
    return null;
  }

  /**
   * Handles #else directive
   * @param {Object} location - Source location
   * @returns {null} No token emitted
   */
  _handleElse(location) {
    if (this.lexer.preprocessor.skipDepth > 0) {
      return null;
    }

    if (this.lexer.preprocessor.conditionalStack.length === 0) {
      throw new LexerError('#else without matching #if', location);
    }

    const top = this.lexer.preprocessor.conditionalStack[this.lexer.preprocessor.conditionalStack.length - 1];
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
    if (this.lexer.preprocessor.skipDepth > 0) {
      this.lexer.preprocessor.skipDepth--;
      return null;
    }

    if (this.lexer.preprocessor.conditionalStack.length === 0) {
      throw new LexerError('#endif without matching #if', location);
    }

    this.lexer.preprocessor.conditionalStack.pop();
    return null;
  }

  /**
   * Handles #pragma directive
   * @param {Object} location - Source location
   * @returns {Token|null} Pragma result or null
   */
  _handlePragma(location) {
    if (this.lexer.preprocessor.skipDepth > 0) return null;
    if (!this.lexer.preprocessor.isEffectivelyActive()) return null;

    const pragmaArgs = this.lexer._readLineContent();

    const parts = pragmaArgs.split(/\s+/);
    const pragmaName = parts[0] || '';
    const pragmaValue = parts.slice(1).join(' ') || '';

    const handler = this.lexer.preprocessor.getPragmaHandler(pragmaName);
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
    if (this.lexer.preprocessor.skipDepth > 0 || !this.lexer.preprocessor.isEffectivelyActive()) {
      this.lexer._readLineContent();
      return null;
    }

    const lineContent = this.lexer._readLineContent();

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

    const currentDir = this.lexer._getParentDir(this.lexer.preprocessor.filename);
    const resolvedPath = this.lexer.preprocessor.resolveInclude(filename, isSystem, currentDir);

    if (!resolvedPath) {
      throw new LexerError(`Cannot open include file: ${filename}`, location);
    }

    return { type: 'include', filePath: resolvedPath, location };
  }
}
