import * as IL from './il.js';

/**
 * Pure state holder for the AST-to-IR translation process.
 * Manages symbol tables, label/temp counters, and loop context.
 */
export class TranslationState {
  /**
   * Creates a new translation state
   */
  constructor() {
    /** @type {IL.SymbolTable} */
    this.symbolTable = new IL.SymbolTable();
    /** @type {number} */
    this.nextLabel = 0;
    /** @type {number} */
    this.nextTemp = 0;
    /** @type {string|null} */
    this.currentFunction = null;
    /** @type {string|null} */
    this.loopBreakLabel = null;
    /** @type {string|null} */
    this.loopContinueLabel = null;
  }

  /**
   * Generates a unique label name
   * @param {string} prefix - Label prefix
   * @returns {string} Unique label
   */
  label(prefix) {
    return `${prefix}_${this.nextLabel++}`;
  }

  /**
   * Generates a unique temporary register name
   * @returns {string} Temporary register
   */
  temp() {
    return `t${this.nextTemp++}`;
  }

  /**
    * Resets state for a new function translation
    * @param {string} name - Function name
    */
   resetForFunction(name) {
     this.currentFunction = name;
     this.symbolTable = new IL.SymbolTable();
     this.nextLabel = 0;
     this.nextTemp = 0;
     this.loopBreakLabel = null;
     this.loopContinueLabel = null;
   }

  /**
    * Push a new symbol table scope
    * @returns {IL.SymbolTable} New child scope
    */
   pushScope() {
     this.symbolTable = this.symbolTable.pushScope();
   }

  /**
    * Pop the current symbol table scope, restoring parent
    */
   popScope() {
     this.symbolTable = this.symbolTable.popScope();
   }

  /**
   * Push new loop context (for nested loops)
   * @param {string} breakLabel - Break target label
   * @param {string} continueLabel - Continue target label
   */
  pushLoop(breakLabel, continueLabel) {
    this.loopBreakLabel = breakLabel;
    this.loopContinueLabel = continueLabel;
  }

  /**
   * Pop loop context, restoring outer loop labels
   * @param {string} prevBreak - Previous break label
   * @param {string} prevContinue - Previous continue label
   */
  popLoop(prevBreak, prevContinue) {
    this.loopBreakLabel = prevBreak;
    this.loopContinueLabel = prevContinue;
  }
}
