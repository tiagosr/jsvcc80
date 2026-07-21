import { ParserError } from '../core/errors.js';

/**
 * Represents a parsing result
 * @typedef {Object} ParseResult
 * @property {boolean} success - Whether the parse succeeded
 * @property {*} value - Parsed value if successful
 * @property {string} [error] - Error message if failed
 */

/**
 * Parser combinator base class
 */
export class Parser {
  /**
   * Parses input at current position
   * @param {Token[]} tokens - Token array to parse
   * @param {number} pos - Current token position
   * @returns {ParseResult} Parse result
   */
  parse(tokens, pos) {
    throw new Error('Method must be implemented');
  }

  /**
   * Creates a choice parser (try alternatives in order)
   * @param {...Parser} parsers - Parsers to try
   * @returns {Parser} Choice parser
   */
  static alt(...parsers) {
    return new AltParser(parsers);
  }

  /**
   * Creates a sequence parser (match all in order)
   * @param {...Parser} parsers - Parsers to match sequentially
   * @returns {Parser} Sequence parser
   */
  static seq(...parsers) {
    return new SeqParser(parsers);
  }

  /**
   * Matches zero or more repetitions
   * @param {Parser} inner - Parser to repeat
   * @returns {Parser} Repetition parser
   */
  static many(inner) {
    return new ManyParser(inner);
  }

  /**
   * Matches one or more repetitions
   * @param {Parser} inner - Parser to repeat
   * @returns {Parser} Repetition parser
   */
  static some(inner) {
    return new SomeParser(inner);
  }

  /**
   * Matches zero or one (optional)
   * @param {Parser} inner - Parser to make optional
   * @returns {Parser} Optional parser
   */
  static opt(inner) {
    return new OptParser(inner);
  }

  /**
   * Matches a literal token value
   * @param {string} type - Token type to match
   * @param {string} [value] - Expected token value (optional)
   * @returns {Parser} Literal parser
   */
  static lit(type, value = null) {
    return new LitParser(type, value);
  }

  /**
   * Matches any token of specified types
   * @param {...string} types - Token types to match
   * @returns {Parser} Any parser
   */
  static any(...types) {
    return new AnyParser(types);
  }

  /**
   * Matches when the next tokens satisfy a condition
   * @param {Function} predicate - Function(token, pos) => boolean
   * @returns {Parser} Predicate parser
   */
  static pred(predicate) {
    return new PredParser(predicate);
  }
}

/**
 * Parser that tries alternatives in order
 */
export class AltParser extends Parser {
  constructor(parsers) {
    super();
    this.parsers = parsers;
  }

  parse(tokens, pos) {
    const errors = [];
    
    for (const parser of this.parsers) {
      const result = parser.parse(tokens, pos);
      
      if (result.success) {
        return result;
      }
      
      if (result.error && pos === 0) {
        // Only track initial position errors
        errors.push(result.error);
      }
    }

    return {
      success: false,
      error: errors.join(' or ') || 'No alternative matched'
    };
  }
}

/**
 * Parser that matches sequence of parsers
 */
export class SeqParser extends Parser {
  constructor(parsers) {
    super();
    this.parsers = parsers;
  }

  parse(tokens, pos) {
    let currentPos = pos;
    const values = [];

    for (const parser of this.parsers) {
      const result = parser.parse(tokens, currentPos);
      
      if (!result.success) {
        return {
          success: false,
          error: `At position ${currentPos}: ${result.error}`
        };
      }

      values.push(result.value);
      currentPos = result.nextPos;
    }

    return {
      success: true,
      value: values.length === 1 ? values[0] : values,
      nextPos: currentPos
    };
  }
}

/**
 * Parser for zero or more repetitions
 */
export class ManyParser extends Parser {
  constructor(inner) {
    super();
    this.inner = inner;
  }

  parse(tokens, pos) {
    let currentPos = pos;
    const values = [];

    while (true) {
      const result = this.inner.parse(tokens, currentPos);
      
      if (!result.success) {
        break;
      }

      values.push(result.value);
      currentPos = result.nextPos;
    }

    return {
      success: true,
      value: values,
      nextPos: currentPos
    };
  }
}

/**
 * Parser for one or more repetitions
 */
export class SomeParser extends Parser {
  constructor(inner) {
    super();
    this.inner = inner;
  }

  parse(tokens, pos) {
    const firstResult = this.inner.parse(tokens, pos);
    
    if (!firstResult.success) {
      return { success: false, error: 'Expected at least one match' };
    }

    let currentPos = firstResult.nextPos;
    const values = [firstResult.value];

    while (true) {
      const result = this.inner.parse(tokens, currentPos);
      
      if (!result.success) {
        break;
      }

      values.push(result.value);
      currentPos = result.nextPos;
    }

    return {
      success: true,
      value: values.length === 1 ? values[0] : values,
      nextPos: currentPos
    };
  }
}

/**
 * Parser for optional (zero or one) matches
 */
export class OptParser extends Parser {
  constructor(inner) {
    super();
    this.inner = inner;
  }

  parse(tokens, pos) {
    const result = this.inner.parse(tokens, pos);
    
    if (result.success) {
      return { success: true, value: result.value, nextPos: result.nextPos };
    }

    return { success: true, value: null, nextPos: pos };
  }
}

/**
 * Parser for literal token matching
 */
export class LitParser extends Parser {
  constructor(type, value = null) {
    super();
    this.type = type;
    this.value = value;
  }

  parse(tokens, pos) {
    const token = tokens[pos];
    
    if (!token || token.type !== this.type) {
      return {
        success: false,
        error: `Expected ${this.type}, got ${token ? token.type : 'EOF'}`
      };
    }

    if (this.value !== null && token.value !== this.value) {
      return {
        success: false,
        error: `Expected "${this.value}", got "${token.value}"`
      };
    }

    return {
      success: true,
      value: token,
      nextPos: pos + 1
    };
  }
}

/**
 * Parser for matching any of several token types
 */
export class AnyParser extends Parser {
  constructor(types) {
    super();
    this.types = new Set(types);
  }

  parse(tokens, pos) {
    const token = tokens[pos];
    
    if (!token || !this.types.has(token.type)) {
      return {
        success: false,
        error: `Expected one of ${[...this.types].join(', ')}, got ${token ? token.type : 'EOF'}`
      };
    }

    return {
      success: true,
      value: token,
      nextPos: pos + 1
    };
  }
}

/**
 * Parser that matches based on a predicate function
 */
export class PredParser extends Parser {
  constructor(predicate) {
    super();
    this.predicate = predicate;
  }

  parse(tokens, pos) {
    const token = tokens[pos];
    
    if (!token || !this.predicate(token)) {
      return {
        success: false,
        error: 'Predicate check failed'
      };
    }

    return {
      success: true,
      value: token,
      nextPos: pos + 1
    };
  }
}

/**
 * Parser wrapper that captures location information
 */
class LocationParser extends Parser {
  constructor(inner) {
    super();
    this.inner = inner;
  }

  parse(tokens, pos) {
    const startPos = pos;
    const result = this.inner.parse(tokens, pos);
    
    if (result.success && tokens[startPos] && tokens[result.nextPos - 1]) {
      // Attach location information to parsed value
      result.value.location = {
        file: tokens[startPos].location.file,
        start: tokens[startPos].location.start,
        end: tokens[result.nextPos - 1].location.end
      };
    }

    return result;
  }
}

/**
 * Parser that maps a transform function over the inner parser's result.
 */
class MapParser extends Parser {
  /**
   * @param {Parser} inner - Parser whose result will be transformed
   * @param {Function} fn - Transform function(value) => newValue
   */
  constructor(inner, fn) {
    super();
    this.inner = inner;
    this.fn = fn;
  }

  parse(tokens, pos) {
    const result = this.inner.parse(tokens, pos);
    if (result.success) {
      result.value = this.fn(result.value);
    }
    return result;
  }
}

/**
 * Maps a function over a parser's result.
 * @param {Parser} parser - Parser to wrap
 * @param {Function} fn - Transform function(value) => newValue
 * @returns {Parser} Mapped parser
 */
export function map(parser, fn) {
  return new MapParser(parser, fn);
}

/**
 * Parser that lazily resolves its inner parser at parse time.
 * Used to break circular dependencies between grammar rules.
 */
class LazyParser extends Parser {
  /**
   * @param {Function} resolver - Function that returns the inner parser
   */
  constructor(resolver) {
    super();
    this.resolver = resolver;
    this._inner = null;
  }

  parse(tokens, pos) {
    if (!this._inner) {
      this._inner = this.resolver();
    }
    return this._inner.parse(tokens, pos);
  }
}

/**
 * Creates a lazy parser that resolves its inner parser at parse time.
 * Use this to break circular dependencies between grammar rules.
 * @param {Function} resolver - Function returning the parser to resolve
 * @returns {Parser} Lazy parser
 */
export function lazy(resolver) {
  return new LazyParser(resolver);
}

/**
 * Wraps a parser to capture location information on all results
 */
export function withLocation(inner) {
  return new LocationParser(inner);
}
