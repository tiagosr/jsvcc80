/**
 * Error class for compiler errors with location information
 * @extends Error
 */
export class CompilerError extends Error {
  /**
   * Creates a new CompilerError
   * @param {string} message - Error message
   * @param {Object} location - Source location {file, line, column}
   */
  constructor(message, location = null) {
    super(message);
    this.name = 'CompilerError';
    this.location = location;
  }

  toString() {
    if (this.location) {
      const pos = `${this.location.file || '[unknown]'}:${this.location.line}:${this.location.column}`;
      return `${this.name} at ${pos}: ${this.message}`;
    }
    return `${this.name}: ${this.message}`;
  }
}

/**
 * Error class for lexer errors
 */
export class LexerError extends CompilerError {
  constructor(message, location) {
    super(message, location);
    this.name = 'LexerError';
  }
}

/**
 * Error class for parser errors
 */
export class ParserError extends CompilerError {
  constructor(message, location) {
    super(message, location);
    this.name = 'ParserError';
  }
}

/**
 * Error class for semantic analysis errors
 */
export class SemanticError extends CompilerError {
  constructor(message, location) {
    super(message, location);
    this.name = 'SemanticError';
  }
}

/**
 * Error class for code generation errors
 */
export class CodegenError extends CompilerError {
  constructor(message, location) {
    super(message, location);
    this.name = 'CodegenError';
  }
}
