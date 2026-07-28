import * as AST from '../ast/nodes.js';
import * as IL from './il.js';
import { TypeRegistry } from './type-registry.js';
import { StringLiteralCollector, FloatLiteralCollector } from './string-literals.js';
import { TranslationState } from './state.js';
import { StatementTranslator } from './statement-translator.js';
import { ControlFlowTranslator } from './control-flow.js';
import { ExpressionTranslator } from './expression-translator.js';
import { CallAndMemoryTranslator } from './call-memory.js';
import { TypeQueryHandler } from './type-queries.js';

/**
 * Extracts calling convention from function attributes
 * @param {AST.AttributeNode[]} attributes - Attribute nodes
 * @returns {string} Calling convention or default
 */
function extractCallingConventionFromAttributes(attributes) {
  if (!attributes || attributes.length === 0) {
    return IL.CALLING_CONVENTION_DEFAULT;
  }
  for (const attr of attributes) {
    if (attr.name === 'cdecl' || attr.name === '__cdecl__') {
      return IL.CALLING_CONVENTION_CDECL;
    }
    if (attr.name === 'fastcall' || attr.name === '__fastcall__') {
      return IL.CALLING_CONVENTION_FASTCALL;
    }
    if (attr.name === 'callee' || attr.name === '__callee__') {
      return IL.CALLING_CONVENTION_CALLEE;
    }
    if (attr.name === 'new_sdcc' || attr.name === '__new_sdcc__') {
      return IL.CALLING_CONVENTION_NEW_Sdcc;
    }
  }
  return IL.CALLING_CONVENTION_DEFAULT;
}

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
    this.floatCollector = new FloatLiteralCollector();
    this.state = new TranslationState();
    this.functionRegistry = new Map();

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
      if (node instanceof AST.DeclNode && node.kind === 'typedef' && node.structNode) {
        this.typeRegistry.registerStruct(node.structNode);
      }
    }

    // Third pass: translate functions and globals
    for (const node of ast.statements) {
      if (node instanceof AST.FunctionNode) {
        const funcIr = this.translateFunction(node, node.attributes);
        program.addFunction(funcIr);
      } else if (node instanceof AST.AnnotatedDeclNode && node.declaration instanceof AST.FunctionNode) {
        const funcIr = this.translateFunction(node.declaration, node.attributes);
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

    // Collect float literals from functions
    for (const node of ast.statements) {
      if (node instanceof AST.FunctionNode) {
        this.floatCollector.collectFloatLiterals(node);
      }
    }

    globals.push(...this.stringCollector.stringData, ...this.floatCollector.floatData);
    program.globals = globals;
    return program;
  }

  /**
    * Translate a function definition
    * @param {AST.FunctionNode} func - Function AST node
    * @param {AST.AttributeNode[]} [attributes] - Optional attributes for calling convention
    * @returns {IL.FunctionIR} IR function
    */
   translateFunction(func, attributes) {
     this.state.resetForFunction(func.name.name);

     const resolvedReturn = this.typeRegistry.resolveType(func.returnType);
     const callingConvention = extractCallingConventionFromAttributes(attributes);

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
      const paramTypes = func.parameters.filter(p => p.name && !p.isVariadic).map(p => {
        const resolved = this.typeRegistry.resolveType(p.type);
        return { name: p.name, size: resolved.getSize(), baseType: resolved.baseType };
      });
      const funcIr = new IL.FunctionIR(
        func.name.name,
        blocks,
        {
          returnType: resolvedReturn.baseType,
          parameters: func.parameters.filter(p => p.name && !p.isVariadic).map(p => p.name),
          paramTypes,
          isVariadic: func.isVariadic,
          line: func.name.location?.line || 0,
          sourceFile: func.name.location?.file || null
        },
        callingConvention
      );

      this.functionRegistry.set(func.name.name, {
        callingConvention,
        paramTypes
      });

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
        size: 2,
        initial: null,
        line: decl.name.location?.line || 0,
        sourceFile: decl.name.location?.file || null
      };
    }

    return {
      name: decl.name.name,
      type: resolved.baseType,
      size: resolved.getSize(this.typeRegistry.structRegistry),
      initial: decl.init ? this.expressionTranslator.translateExpressionValue(decl.init) : null,
      line: decl.name.location?.line || 0,
      sourceFile: decl.name.location?.file || null
    };
   }

  /**
    * Looks up a function's calling convention from the function registry
    * @param {string} funcName - Function name
    * @returns {string} Calling convention or default
    */
    getFunctionCallingConvention(funcName) {
      const info = this.functionRegistry.get(funcName);
      return info?.callingConvention || IL.CALLING_CONVENTION_DEFAULT;
    }

    getFunctionParamTypes(funcName) {
      const info = this.functionRegistry.get(funcName);
      return info?.paramTypes || [];
    }
}
