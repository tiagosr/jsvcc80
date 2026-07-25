import * as AST from '../ast/nodes.js';
import * as IL from './il.js';
import { TypeRegistry } from './type-registry.js';
import { StringLiteralCollector } from './string-literals.js';
import { TranslationState } from './state.js';
import { StatementTranslator } from './statement-translator.js';
import { ControlFlowTranslator } from './control-flow.js';
import { ExpressionTranslator } from './expression-translator.js';
import { CallAndMemoryTranslator } from './call-memory.js';
import { TypeQueryHandler } from './type-queries.js';

/**
 * Composes all sub-handlers for AST-to-IR translation orchestration.
 * Manages the three-pass approach: collect typedefs, collect structs, translate.
 */
export class TranslationContext {
  /**
   * Creates a new translation context
   */
  constructor() {
    this.typeRegistry = new TypeRegistry();
    this.stringCollector = new StringLiteralCollector();
    this.state = new TranslationState();

    this.expressionTranslator = null;
    this.statementTranslator = null;
    this.controlFlowTranslator = null;
    this.callMemoryTranslator = null;
    this.typeQueryHandler = null;
  }

  /**
   * Initialize translator dependencies (called lazily)
   */
  _initTranslators() {
    if (this.expressionTranslator) return;

    this.expressionTranslator = new ExpressionTranslator(this);
    // Create control flow translator first (it needs statementTranslator for nested statements)
    // but statementTranslator needs controlFlowTranslator for nested control flow
    // We use a circular dependency resolution: create controlFlowTranslator with a placeholder,
    // then create statementTranslator with controlFlowTranslator, then update controlFlowTranslator
    const stmtTranslator = new StatementTranslator(this, this.expressionTranslator);
    const ctrlFlowTranslator = new ControlFlowTranslator(this, stmtTranslator, this.expressionTranslator);
    // Now set the controlFlowTranslator on stmtTranslator
    stmtTranslator.controlFlowTranslator = ctrlFlowTranslator;
    // Also handle SwitchNode, JumpNode, GotoNode, LabelNode through controlFlowTranslator
    this.controlFlowTranslator = ctrlFlowTranslator;
    this.callMemoryTranslator = new CallAndMemoryTranslator(this, this.expressionTranslator);
    this.typeQueryHandler = new TypeQueryHandler(this);
    this.statementTranslator = stmtTranslator;
  }

  /**
   * Translate a complete AST to ProgramIR
   * @param {AST.CompoundNode} ast - Root AST node
   * @returns {IL.ProgramIR} Translated program
   */
  translate(ast) {
    this._initTranslators();

    const program = new IL.ProgramIR();
    const globals = [];

    // First pass: collect typedefs
    for (const node of ast.statements) {
      if (node instanceof AST.DeclNode && node.kind === 'typedef') {
        this.typeRegistry.registerTypedef(node);
      }
    }

    // Second pass: collect struct/union definitions
    for (const node of ast.statements) {
      if (node instanceof AST.StructNode) {
        this.typeRegistry.registerStruct(node);
      }
    }

    // Third pass: translate functions and globals
    for (const node of ast.statements) {
      if (node instanceof AST.FunctionNode) {
        const funcIr = this.translateFunction(node);
        program.addFunction(funcIr);
      } else if (node instanceof AST.DeclNode && node.kind !== 'typedef') {
        globals.push(this.translateDecl(node));
      }
    }

    // Collect string literals from functions
    for (const node of ast.statements) {
      if (node instanceof AST.FunctionNode) {
        this.stringCollector.collectStringLiterals(node);
      }
    }

    globals.push(...this.stringCollector.stringData);
    program.globals = globals;
    return program;
  }

  /**
   * Translate a function definition
   * @param {AST.FunctionNode} func - Function AST node
   * @returns {IL.FunctionIR} IR function
   */
  translateFunction(func) {
    this.state.resetForFunction(func.name.name);

    const resolvedReturn = this.typeRegistry.resolveType(func.returnType);

    for (const param of func.parameters) {
      if (param.name) {
        const resolvedParam = this.typeRegistry.resolveType(param.type);
        const paramSymbol = {
          name: param.name,
          kind: 'variable',
          type: resolvedParam.baseType,
          offset: 0
        };
        // Track function pointer parameters
        if (resolvedParam.isFunctionPointer) {
          paramSymbol.isFunctionPointer = true;
          paramSymbol.functionReturnType = resolvedParam.functionReturnType;
          paramSymbol.functionParams = resolvedParam.functionParams;
        }
        this.state.symbolTable.define(param.name, paramSymbol);
      }
    }

    const blocks = this.statementTranslator.translateStatement(func.body);
    const funcIr = new IL.FunctionIR(
      func.name.name,
      blocks,
      {
        returnType: resolvedReturn.baseType,
        parameters: func.parameters.filter(p => p.name && !p.isVariadic).map(p => p.name),
        isVariadic: func.isVariadic
      }
    );

    return funcIr;
  }

  /**
   * Translate a global variable declaration
   * @param {AST.DeclNode} decl - Declaration
   * @returns {Object} Global variable IR
   */
  translateDecl(decl) {
    const resolved = this.typeRegistry.resolveType(decl.type);

    // Handle function pointer declarations specially
    if (resolved.isFunctionPointer) {
      return {
        name: decl.name.name,
        type: {
          baseType: 'function_pointer',
          isFunctionPointer: true,
          functionReturnType: resolved.functionReturnType.baseType,
          functionParams: resolved.functionParams.map(p => p.type),
          getSize: () => 2
        },
        initial: null
      };
    }

    return {
      name: decl.name.name,
      type: resolved.baseType,
      initial: decl.init ? this.expressionTranslator.translateExpressionValue(decl.init) : null
    };
  }
}
