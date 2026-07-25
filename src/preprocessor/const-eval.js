import { PreprocessedSource } from './preprocessed-source.js';

/**
 * Evaluates constant expressions for #if/#elif preprocessor directives.
 * Uses a Pratt parser to evaluate integer expressions at preprocessor time.
 * Receives a PreprocessedSource reference for macro lookups.
 */
export class ConstantEvaluator {
  /**
   * Creates a new constant evaluator
   * @param {PreprocessedSource} preprocessor - The preprocessor for isMacroDefined/expandMacro
   */
  constructor(preprocessor) {
    this.preprocessor = preprocessor;
  }

  /**
   * Tokenizes a constant expression string for #if/#elif evaluation
   * @param {string} expr - Expression string
   * @returns {Object[]} Array of expression tokens
   */
  tokenizeConstantExpression(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.trim();
    let afterDefined = false;

    while (i < s.length) {
      if (/\s/.test(s[i])) { i++; continue; }

      if (/[0-9]/.test(s[i])) {
        let num = '';
        if (s[i] === '0' && i + 1 < s.length && /[xX]/.test(s[i + 1])) {
          num += s[i++];
          num += s[i++];
          while (i < s.length && /[0-9a-fA-F]/.test(s[i])) num += s[i++];
          tokens.push({ type: 'NUMBER', value: parseInt(num, 16) });
          continue;
        }
        if (s[i] === '0') {
          num += s[i++];
          while (i < s.length && /[0-7]/.test(s[i])) num += s[i++];
          tokens.push({ type: 'NUMBER', value: parseInt(num, 8) });
          continue;
        }
        while (i < s.length && /[0-9]/.test(s[i])) num += s[i++];
        tokens.push({ type: 'NUMBER', value: parseInt(num, 10) });
        continue;
      }

      if (/[a-zA-Z_]/.test(s[i])) {
        let ident = '';
        while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) ident += s[i++];
        if (ident.toLowerCase() === 'defined') {
          tokens.push({ type: 'DEFINED', value: 'defined' });
          afterDefined = true;
        } else if (afterDefined) {
          afterDefined = false;
          tokens.push({ type: 'IDENTIFIER', value: ident });
        } else {
          // Check user-defined macros first
          const macro = this.preprocessor.expandMacro(ident);
          if (macro) {
            const val = parseInt(macro.replacement, 10);
            tokens.push({ type: 'NUMBER', value: isNaN(val) ? 0 : val });
          } else {
            // Check built-in macros
            const builtin = this.preprocessor.getBuiltin(ident);
            if (builtin) {
              const val = parseInt(builtin(this.preprocessor.locationTracker?.line || 1), 10);
              tokens.push({ type: 'NUMBER', value: isNaN(val) ? 0 : val });
            } else {
              tokens.push({ type: 'NUMBER', value: 0 });
            }
          }
        }
        continue;
      }

      if (s[i] === '(') { tokens.push({ type: '(', value: '(' }); i++; continue; }
      if (s[i] === ')') { tokens.push({ type: ')', value: ')' }); i++; continue; }

      if (i + 1 < s.length) {
        const two = s[i] + s[i + 1];
        if (['&&', '||', '==', '!=', '<=', '>=', '<<', '>>'].includes(two)) {
          tokens.push({ type: two, value: two });
          i += 2;
          continue;
        }
      }

      if (['+', '-', '*', '/', '%', '<', '>', '&', '|', '^', '~', '!'].includes(s[i])) {
        tokens.push({ type: s[i], value: s[i] });
        i++;
        continue;
      }
    }

    return tokens;
  }

  /**
   * Evaluates a constant expression for #if/#elif directives
   * @param {string} expr - Expression string
   * @returns {number} Evaluated integer result
   */
  evaluate(expr) {
    const tokens = this.tokenizeConstantExpression(expr);
    if (tokens.length === 0) return 0;

    let pos = 0;

    const peek = () => pos < tokens.length ? tokens[pos] : null;
    const consume = () => tokens[pos++];

    const parseExpression = () => parseLogicalOr();

    const parseLogicalOr = () => {
      let left = parseLogicalAnd();
      while (peek() && peek().type === '||') {
        consume();
        const right = parseLogicalAnd();
        left = left || right ? 1 : 0;
      }
      return left;
    };

    const parseLogicalAnd = () => {
      let left = parseEquality();
      while (peek() && peek().type === '&&') {
        consume();
        const right = parseEquality();
        left = left && right ? 1 : 0;
      }
      return left;
    };

    const parseEquality = () => {
      let left = parseRelational();
      while (peek() && (peek().type === '==' || peek().type === '!=')) {
        const op = consume().type;
        const right = parseRelational();
        if (op === '==') left = left === right ? 1 : 0;
        else left = left !== right ? 1 : 0;
      }
      return left;
    };

    const parseRelational = () => {
      let left = parseAdditive();
      while (peek() && ['<', '>', '<=', '>='].includes(peek().type)) {
        const op = consume().type;
        const right = parseAdditive();
        switch (op) {
          case '<': left = left < right ? 1 : 0; break;
          case '>': left = left > right ? 1 : 0; break;
          case '<=': left = left <= right ? 1 : 0; break;
          case '>=': left = left >= right ? 1 : 0; break;
        }
      }
      return left;
    };

    const parseAdditive = () => {
      let left = parseMultiplicative();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = consume().type;
        const right = parseMultiplicative();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };

    const parseMultiplicative = () => {
      let left = parseUnary();
      while (peek() && (peek().type === '*' || peek().type === '/' || peek().type === '%')) {
        const op = consume().type;
        const right = parseUnary();
        if (op === '*') left = left * right;
        else if (op === '/') left = right !== 0 ? Math.trunc(left / right) : 0;
        else left = right !== 0 ? left % right : 0;
      }
      return left;
    };

    const parseUnary = () => {
      if (peek() && peek().type === '+') { consume(); return parseUnary(); }
      if (peek() && peek().type === '-') { consume(); return -parseUnary(); }
      if (peek() && peek().type === '~') { consume(); return ~parseUnary(); }
      if (peek() && peek().type === '!') { consume(); return parseUnary() ? 0 : 1; }
      return parseShift();
    };

    const parseShift = () => {
      let left = parsePrimary();
      while (peek() && (peek().type === '<<' || peek().type === '>>')) {
        const op = consume().type;
        const right = parsePrimary();
        left = op === '<<' ? (left << right) : (left >> right);
      }
      return left;
    };

    const parsePrimary = () => {
      const token = peek();
      if (!token) return 0;

      if (token.type === 'NUMBER') {
        consume();
        return token.value;
      }

      if (token.type === '(') {
        consume();
        const val = parseExpression();
        if (peek() && peek().type === ')') consume();
        return val;
      }

      if (token.type === 'DEFINED') {
        consume();
        if (peek() && peek().type === '(') {
          consume();
          const nameToken = consume();
          const name = typeof nameToken.value === 'string' ? nameToken.value : String(nameToken.value);
          const defined = this.preprocessor.isMacroDefined(name);
          if (peek() && peek().type === ')') consume();
          return defined ? 1 : 0;
        } else {
          const nameToken = consume();
          const name = typeof nameToken.value === 'string' ? nameToken.value : String(nameToken.value);
          return this.preprocessor.isMacroDefined(name) ? 1 : 0;
        }
      }

      return 0;
    };

    return parseExpression();
  }
}
