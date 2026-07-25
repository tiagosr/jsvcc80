import * as AST from '../ast/nodes.js';
import * as IL from './il.js';
import { TypeRegistry } from './type-registry.js';
import { StringLiteralCollector } from './string-literals.js';
import { TranslationState } from './state.js';
import { TranslationContext } from './translation-context.js';
import { StatementTranslator } from './statement-translator.js';
import { ControlFlowTranslator } from './control-flow.js';
import { ExpressionTranslator } from './expression-translator.js';
import { CallAndMemoryTranslator } from './call-memory.js';
import { TypeQueryHandler } from './type-queries.js';
import { IntrinsicMap } from './intrinsics.js';

/**
 * Public entry point for AST-to-IR translation.
 * Thin wrapper that composes all sub-modules.
 */
export class AstToIr {
  /**
   * Creates a new AST-to-IR translator
   */
  constructor() {
    this._context = new TranslationContext();
  }

  /**
   * Symbol table for direct access (backward compatibility)
   * @returns {IL.SymbolTable} Symbol table
   */
  get symbolTable() {
    return this._context.state.symbolTable;
  }

  /**
   * Type registry struct registry for direct access (backward compatibility)
   * @returns {Map} Struct registry
   */
  get structRegistry() {
    return this._context.typeRegistry.structRegistry;
  }

  /**
   * Translate a complete AST to ProgramIR
   * @param {AST.CompoundNode} ast - Root AST node
   * @returns {IL.ProgramIR} Translated program
   */
  translate(ast) {
    return this._context.translate(ast);
  }

  /**
   * Returns the IntrinsicMap for external access
   * @returns {Object} The intrinsic map
   */
  static getIntrinsicMap() {
    return IntrinsicMap;
  }
}
