import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

/**
 * Collects string literals from function bodies and emits them as global data.
 */
export class StringLiteralCollector {
  /**
   * Creates a new string literal collector
   */
  constructor() {
    /** @type {Array<{name: string, type: string, bytes: number[]}>} */
    this.stringData = [];
    this.stringCounter = 0;
  }

  /**
   * Recursively collect string literals from function bodies
   * @param {AST.FunctionNode} func - Function node
   */
  collectStringLiterals(func) {
    this.visitNodeForStrings(func.body);
  }

  /**
   * Visit AST nodes to find string literals and emit them as global data
   * @param {AST.ASTNode} node - Node to visit
   */
  visitNodeForStrings(node) {
    if (!node) return;
    if (node instanceof AST.LiteralNode && node.type === 'string') {
      this.emitStringData(node.value);
      return;
    }
    const childKeys = Object.keys(node).filter(k =>
      typeof node[k] === 'object' && node[k] !== null && !Array.isArray(node[k]) && node[k] instanceof AST.ASTNode
    );
    for (const key of childKeys) {
      this.visitNodeForStrings(node[key]);
    }
  }

  /**
   * Emit string literal data as global
   * @param {string} value - String value
   * @returns {string} Label name for the string data
   */
  emitStringData(value) {
    const label = `str_${this.stringCounter++}`;
    const bytes = [];
    for (let i = 0; i < value.length; i++) {
      bytes.push(value.charCodeAt(i));
    }
    bytes.push(0);
    this.stringData.push({
      name: label,
      type: 'string',
      bytes
    });
    return label;
  }
}
