/**
 * Token types for the C lexer
 */
export const TokenType = {
  // Literals
  INTEGER: 'INTEGER',
  FLOAT: 'FLOAT',
  STRING: 'STRING',
  CHAR: 'CHAR',

  // Identifiers and keywords
  IDENTIFIER: 'IDENTIFIER',
  KEYWORD: 'KEYWORD',

  // Operators
  PLUS: '+',
  MINUS: '-',
  STAR: '*',
  SLASH: '/',
  PERCENT: '%',
  AMPERSAND: '&',
  PIPE: '|',
  CARET: '^',
  TILDE: '~',
  NOT: '!',

  // Comparison operators
  EQ: '==',
  NE: '!=',
  LT: '<',
  GT: '>',
  LE: '<=',
  GE: '>=',

  // Assignment operators
  ASSIGN: '=',
  ADD_ASSIGN: '+=',
  SUB_ASSIGN: '-=',
  MUL_ASSIGN: '*=',
  DIV_ASSIGN: '/=',
  MOD_ASSIGN: '%=',
  AND_ASSIGN: '&=',
  OR_ASSIGN: '|=',
  XOR_ASSIGN: '^=',
  SHL_ASSIGN: '<<=',
  SHR_ASSIGN: '>>=',

  // Bitwise shifts
  SHL: '<<',
  SHR: '>>',

  // Delimiters
  LPAREN: '(',
  RPAREN: ')',
  LBRACKET: '[',
  RBRACKET: ']',
  LBRACE: '{',
  RBRACE: '}',
  COMMA: ',',
  SEMICOLON: ';',
  COLON: ':',

  // Special operators
  DOT: '.',
  ARROW: '->',
  INC: '++',
  DEC: '--',
  QUESTION: '?',
  COLON_COLON: '::',
  ELLIPSIS: '...',

  // Preprocessor directives
  POUND: '#',

  // End of file
  EOF: 'EOF',

  // Whitespace (skipped but tracked)
  WHITESPACE: 'WHITESPACE'
};

/**
 * C language keywords
 */
export const Keywords = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'inline', 'int', 'long', 'nullptr', 'offsetof', 'register', 'restrict', 'return', 'short',
  'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'typeof', 'union',
  'unsigned', 'void', 'volatile', 'while', '_Bool', 'bool', '_Complex', '_Imaginary',
  'NULL', 'true', 'false'
]);

/**
 * Represents a lexer token
 * @typedef {Object} Token
 * @property {string} type - Token type from TokenType
 * @property {string} value - Token value
 * @property {SourceLocation} location - Source location
 */
