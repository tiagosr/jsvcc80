/**
 * Represents a position in the source code
 * @typedef {Object} Position
 * @property {number} line - Line number (1-indexed)
 * @property {number} column - Column number (0-indexed)
 */

/**
 * Represents a source location range
 * @typedef {Object} SourceLocation
 * @property {Position} start - Start position
 * @property {Position} end - End position
 * @property {string} [file] - Optional filename
 */

/**
 * Tracks position in source code
 */
export class PositionTracker {
  /**
   * Creates a new PositionTracker
   * @param {string} filename - Source filename
   */
  constructor(filename = '<input>') {
    this.filename = filename;
    this.line = 1;
    this.column = 0;
  }

  /**
   * Advances position by one character
   */
  advance() {
    if (this.char === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }
  }

  /**
   * Gets current position
   * @returns {Position}
   */
  getPosition() {
    return { line: this.line, column: this.column };
  }

  /**
   * Creates a source location from start to current position
   * @param {Position} startPos - Start position
   * @returns {SourceLocation}
   */
  makeLocation(startPos) {
    return {
      file: this.filename,
      start: startPos,
      end: this.getPosition()
    };
  }

  /**
   * Sets the current position
   * @param {Position} pos - Position to set
   */
  setPosition(pos) {
    this.line = pos.line;
    this.column = pos.column;
  }

  get char() {
    return this._char || '';
  }

  set char(value) {
    this._char = value;
  }
}

/**
 * Creates a source location object
 * @param {Position} start - Start position
 * @param {Position} end - End position
 * @param {string} [file] - Optional filename
 * @returns {SourceLocation}
 */
export function makeLocation(start, end, file = null) {
  return { file: file || undefined, start, end };
}
