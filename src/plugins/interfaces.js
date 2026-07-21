/**
 * Parser extension interface for extending the PEG parser
 */
export class ParserExtension {
  /**
   * Returns the name of this extension
   * @returns {string}
   */
  getName() {
    return 'ParserExtension';
  }

  /**
   * Called to initialize the extension
   * @param {Object} context - Extension context
   */
  init(context) {}

  /**
   * Returns additional parser rules to integrate
   * @returns {Object<string, Parser>} Map of rule names to parsers
   */
  getRules() {
    return {};
  }

  /**
   * Called after parsing completes for post-processing
   * @param {ASTNode} ast - Parsed AST
   * @returns {ASTNode|null} Modified AST or null to skip
   */
  onParseComplete(ast) {
    return ast;
  }
}

/**
 * Preprocessor extension interface
 */
export class PreprocessorExtension {
  getName() {
    return 'PreprocessorExtension';
  }

  /**
   * Registers additional pragma handlers
   * @param {PreprocessedSource} preprocessor - Preprocessor instance
   */
  registerPragmas(preprocessor) {}

  /**
   * Processes source before tokenization
   * @param {string} source - Source code
   * @returns {string} Modified source or null to skip
   */
  preprocess(source) {
    return source;
  }
}

/**
 * Semantic analysis pass interface (nanopass style)
 */
export class SemanticsPass {
  /**
   * Returns the name of this pass
   * @returns {string}
   */
  getName() {
    return 'SemanticsPass';
  }

  /**
   * Executes the semantic analysis pass on an AST node
   * @param {ASTNode} node - Node to analyze
   * @param {Object} context - Pass context (symbols, errors, etc.)
   * @returns {ASTNode|null} Processed node or null to skip
   */
  run(node, context) {
    return node;
  }

  /**
   * Returns any diagnostics/errors found during analysis
   * @returns {Array<{message: string, location: SourceLocation}>}
   */
  getDiagnostics() {
    return [];
  }
}

/**
 * IR generation pass interface (nanopass style)
 */
export class IREmissionPass {
  /**
   * Returns the name of this pass
   * @returns {string}
   */
  getName() {
    return 'IREmissionPass';
  }

  /**
   * Transforms an AST node to IR
   * @param {ASTNode} node - AST node to transform
   * @param {Object} context - Pass context
   * @returns {FunctionIR|null} Generated function IR or null for expressions
   */
  run(node, context) {
    return null;
  }

  /**
   * Transforms an expression to a list of instructions
   * @param {ASTNode} expr - Expression node
   * @param {Object} context - Pass context
   * @returns {Instruction[]} List of IL instructions
   */
  emitExpr(expr, context) {
    return [];
  }

  /**
   * Returns any diagnostics/errors found during emission
   * @returns {Array<{message: string, location: SourceLocation}>}
   */
  getDiagnostics() {
    return [];
  }
}

/**
 * Optimization pass interface (nanopass style)
 */
export class OptimizationPass {
  /**
   * Returns the name of this pass
   * @returns {string}
   */
  getName() {
    return 'OptimizationPass';
  }

  /**
   * Executes the optimization pass on IR
   * @param {FunctionIR|ProgramIR} ir - IR to optimize
   * @param {Object} context - Pass context (flags, options)
   * @returns {FunctionIR|ProgramIR} Optimized IR
   */
  run(ir, context) {
    return ir;
  }

  /**
   * Returns statistics about the optimization performed
   * @returns {Object} Statistics object
   */
  getStats() {
    return {};
  }
}

/**
 * Code generation pass interface (backend specific)
 */
export class CodegenPass {
  /**
   * Returns the name of this pass (e.g., 'z80')
   * @returns {string}
   */
  getName() {
    return 'CodegenPass';
  }

  /**
   * Generates target-specific code from IR
   * @param {FunctionIR|ProgramIR} ir - IR to generate code for
   * @param {Object} context - Code generation context
   * @returns {string} Generated assembly code as string
   */
  run(ir, context) {
    return '';
  }

  /**
   * Returns any diagnostics/errors found during codegen
   * @returns {Array<{message: string, location: SourceLocation}>}
   */
  getDiagnostics() {
    return [];
  }
}

/**
 * Attribute handler interface for __attribute__(...) directives
 */
export class AttributeHandler {
  /**
   * Returns the name of this attribute (e.g., 'packed', 'aligned')
   * @returns {string}
   */
  getName() {
    return 'AttributeHandler';
  }

  /**
   * Validates and processes an attribute annotation node
   * @param {AttributeNode} attr - Attribute node to handle
   * @param {ASTNode} target - Target node (declaration, type spec, etc.)
   * @param {Object} context - Processing context
   * @returns {{valid: boolean, metadata?: Object}} Validation result and optional metadata
   */
  handle(attr, target, context) {
    return { valid: false };
  }

  /**
   * Applies attribute effects during code generation
   * @param {*} ir - IR node being generated
   * @param {AttributeNode} attr - Original attribute node
   * @param {Object} metadata - Processed attribute metadata
   * @returns {Object|null} Modified context or null to skip
   */
  onCodegen(ir, attr, metadata) {
    return null;
  }
}

/**
 * Plugin loader for discovering and loading compiler plugins
 */
export class PluginLoader {
  /**
   * Loads a plugin from an ES module
   * @param {string} path - Module path or URL
   * @returns {Promise<object>} Loaded plugin object
   */
  async loadModule(path) {
    const mod = await import(path);
    
    // Look for plugin in various export names
    return (
      mod.default ||
      mod.Plugin ||
      mod.plugin ||
      mod
    );
  }

  /**
   * Loads all plugins from a directory
   * @param {string} dir - Directory path
   * @returns {Promise<object[]>} Array of loaded plugins
   */
  async loadDirectory(dir) {
    const plugins = [];
    
    try {
      // This would use fs module in Node.js to enumerate files
      console.log(`Loading plugins from ${dir}`);
      return plugins;
    } catch (error) {
      console.warn(`Could not scan plugin directory: ${error.message}`);
      return plugins;
    }
  }

  /**
   * Validates that an object is a valid plugin of the given type
   * @param {object} plugin - Plugin to validate
   * @param {string} expectedType - Expected base class name
   * @returns {boolean} True if valid
   */
  isValidPlugin(plugin, expectedType) {
    const className = plugin.getName ? plugin.getName().replace('Extension', '').replace('Pass', '') : '';
    
    // Simple validation based on required methods
    switch (expectedType) {
      case 'Parser':
        return typeof plugin.getName === 'function' && 
               typeof plugin.getRules === 'function';
      
      case 'SemanticsPass':
        return typeof plugin.getName === 'function' && 
               typeof plugin.run === 'function';
      
      case 'OptimizationPass':
        return typeof plugin.getName === 'function' && 
               typeof plugin.run === 'function';
      
      case 'AttributeHandler':
        return typeof plugin.getName === 'function' && 
               typeof plugin.handle === 'function';
      
      default:
        return true; // Permissive validation
    }
  }
}
