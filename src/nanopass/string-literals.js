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

/**
 * Collects float literals from function bodies and emits them as global data.
 * Float literals are stored as 4-byte IEEE 754 single-precision values.
 */
export class FloatLiteralCollector {
  /**
   * Creates a new float literal collector
   */
  constructor() {
    /** @type {Array<{name: string, type: string, bytes: number[]}>} */
    this.floatData = [];
    this.floatCounter = 0;
  }

  /**
   * Recursively collect float literals from function bodies
   * @param {AST.FunctionNode} func - Function node
   */
  collectFloatLiterals(func) {
    this.visitNodeForFloats(func.body);
  }

  /**
   * Visit AST nodes to find float literals and emit them as global data
   * @param {AST.ASTNode} node - Node to visit
   */
  visitNodeForFloats(node) {
    if (!node) return;
    if (node instanceof AST.LiteralNode && node.type === 'float') {
      this.emitFloatData(node.value);
      return;
    }
    const childKeys = Object.keys(node).filter(k =>
      typeof node[k] === 'object' && node[k] !== null && !Array.isArray(node[k]) && node[k] instanceof AST.ASTNode
    );
    for (const key of childKeys) {
      this.visitNodeForFloats(node[key]);
    }
  }

  /**
   * Emit float literal data as global (IEEE 754 single-precision, little-endian)
   * @param {number} value - Float value
   * @returns {string} Label name for the float data
   */
  emitFloatData(value) {
    const label = `flt_${this.floatCounter++}`;
    const bytes = this.numberToIEEE754(value);
    this.floatData.push({
      name: label,
      type: 'float',
      bytes
    });
    return label;
  }

  /**
   * Convert a JavaScript number to 4 IEEE 754 single-precision bytes (little-endian)
   * @param {number} value - Number to convert
   * @returns {number[]} 4 bytes representing the IEEE 754 single-precision value
   */
  numberToIEEE754(value) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value, true);
    return [view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)];
  }
}
