import { PositionTracker } from '../core/location.js';
import { LexerError } from '../core/errors.js';
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

    this._registerBuiltins();
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
   * @param {string} name - Pragma name (without 'pragma' keyword)
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
    this.registerPragma('once', () => {
      return { type: 'pragma_once' };
    });

    this.registerPragma('pack', (token, context) => {
      const value = parseInt(token.value, 10);
      if (isNaN(value)) {
        throw new LexerError('Invalid pack value', token.location);
      }
      return { type: 'pragma_pack', value };
    });

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
   * @param {string} name - Pragma name
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
