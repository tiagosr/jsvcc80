/**
 * Main Compiler class - orchestrates all compilation stages
 */
import { Lexer, PreprocessedSource } from './preprocessor/lexer.js';
import { Parser } from './parser/combinators.js';
import { globalRegistry } from './core/plugins.js';
import { ProgramIR } from './nanopass/il.js';
import { ParserError } from './core/errors.js';

/**
 * Compiler options and configuration
 */
export class CompilerOptions {
  /**
   * Creates compiler options with defaults
   * @param {Object} [options] - Override options
   */
  constructor(options = {}) {
    this.sourceFile = options.source || '<stdin>';
    this.optimizationLevel = options.opt || 'O0'; // O0-O3, Os, Oz
    this.targetArchitecture = options.arch || 'z80';
    this.debugInfo = !!options.debug;
    this.emitIR = !!options.emitIr;
    this.plugins = options.plugins || [];
  }

  /**
   * Gets optimization flags for the pass manager
   * @returns {Object} Optimization flag object
   */
  getOptimizationFlags() {
    const flags = {};

    switch (this.optimizationLevel) {
      case 'O0':
        flags.noOpt = true;
        break;
      case 'O1':
        flags.simplify = true;
        break;
      case 'O2':
        flags.simplify = true;
        flags.inline = true;
        break;
      case 'O3':
        flags.simplify = true;
        flags.inline = true;
        flags.loopUnroll = true;
        break;
      case 'Os':
        flags.sizeOpt = true;
        break;
      case 'Oz':
        flags.sizeOpt = true;
        flags.powerEfficient = true;
        break;
    }

    return flags;
  }
}

/**
 * Main Compiler class that orchestrates all stages
 */
export class Compiler {
  /**
   * Creates a new compiler instance
   * @param {CompilerOptions} [options] - Compilation options
   */
  constructor(options = null) {
    this.options = options || new CompilerOptions();
    this.preprocessor = new PreprocessedSource(this.options.sourceFile);
    this.lexer = null;
    this.parser = null;
    
    // Load registered plugins
    this.loadPlugins();
  }

  /**
   * Loads compiler plugins from registry and options
   */
  loadPlugins() {
    const passManager = PassManager.getInstance(this.options.getOptimizationFlags());
    
    // Load parser extensions
    for (const plugin of globalRegistry.getPlugins('parser')) {
      if (plugin.init) {
        plugin.init({ compiler: this, options: this.options });
      }
    }

    // Register optimization passes from plugins
    for (const pass of globalRegistry.getPlugins('optimization_pass')) {
      passManager.registerPass(pass);
    }
  }

  /**
   * Compiles source code string to Z80 assembly
   * @param {string} source - C source code
   * @returns {Object} Compilation result with code and diagnostics
   */
  compileSource(source) {
    const result = {
      success: false,
      code: '',
      warnings: [],
      errors: []
    };

    try {
      // Stage 1: Preprocessing
      const preprocessed = this.preprocess(source);
      
      // Stage 2: Lexing
      const tokens = this.tokenize(preprocessed);
      
      // Stage 3: Parsing
      const ast = this.parse(tokens);
      
      // Stage 4: Semantic analysis (placeholder)
      const analyzedAst = this.analyze(ast);
      
      // Stage 5: IR generation
      const ir = this.generateIR(analyzedAst);
      
      // Stage 6: Optimization passes
      const optimizedIr = this.optimize(ir);
      
      // Stage 7: Code generation
      result.code = this.generateCode(optimizedIr);

      if (this.options.emitIR) {
        result.ir = optimizedIr.toString();
      }

      result.success = true;
    } catch (error) {
      if (error.name && error.name.includes('Error')) {
        result.errors.push(error.message);
        if (error.location) {
          result.errors[result.errors.length - 1] += 
            ` at ${error.location.file || '<unknown>'}:${error.location.line}:${error.location.column}`;
        }
      } else {
        throw error;
      }
    }

    return result;
  }

  /**
   * Compiles from a file path
   * @param {string} filePath - Path to C source file
   * @returns {Object} Compilation result
   */
  async compileFile(filePath) {
    // In Node.js, we'd use fs module here
    const fs = await import('fs');
    const source = fs.readFileSync(filePath, 'utf-8');
    
    this.options.sourceFile = filePath;
    return this.compileSource(source);
  }

  /**
   * Preprocessing stage - handles #pragma and other directives
   * @param {string} source - Raw source code
   * @returns {string} Processed source
   */
  preprocess(source) {
    // For now, just return the source as-is
    // Full preprocessor would handle:
    // - #include
    // - #define / #undef
    // - #if / #ifdef / #ifndef / #else / #endif
    // - Macro expansion
    
    this.preprocessor = new PreprocessedSource(this.options.sourceFile);
    return source;
  }

  /**
   * Lexing stage - tokenizes the preprocessed source
   * @param {string} source - Preprocessed source code
   * @returns {Token[]} Array of tokens
   */
  tokenize(source) {
    this.lexer = new Lexer(source, this.preprocessor);
    return this.lexer.tokenize();
  }

  /**
   * Parsing stage - builds AST from tokens using PEG parser
   * @param {Token[]} tokens - Token array to parse
   * @returns {ASTNode} Parsed AST root node
   */
  async parse(tokens) {
    // Use the C grammar PEG parser
    const { CPegParser } = await import('./parser/cparser.js');
    this.parser = new CPegParser();
    
    try {
      return this.parser.parse(tokens);
    } catch (error) {
      if (error.name === 'ParserError') {
        throw error;
      }
      // Wrap other errors as parser errors
      throw new ParserError(error.message, tokens[0]?.location || null);
    }
  }

  /**
   * Semantic analysis stage - type checking and symbol resolution
   * @param {ASTNode} ast - AST to analyze
   * @returns {ASTNode} Analyzed AST
   */
  analyze(ast) {
    // Placeholder for semantic analysis pass
    return ast;
  }

  /**
   * IR generation stage - translates AST to intermediate representation
   * @param {ASTNode} ast - Analyzed AST
   * @returns {ProgramIR} Program intermediate representation
   */
  generateIR(ast) {
    // Placeholder for IR emission pass
    return new ProgramIR();
  }

  /**
   * Optimization stage - applies optimization passes to IR
   * @param {ProgramIR} ir - IR to optimize
   * @returns {ProgramIR} Optimized IR
   */
  optimize(ir) {
    const passManager = PassManager.getInstance(this.options.getOptimizationFlags());
    
    // Run all registered optimization passes
    for (const pass of passManager.getPasses()) {
      ir = pass.run(ir);
      
      if (!ir) {
        console.warn(`Optimization pass ${pass.getName()} returned null`);
        continue;
      }
    }

    return ir;
  }

  /**
   * Code generation stage - produces target assembly from IR
   * @param {ProgramIR} ir - Optimized IR
   * @returns {string} Generated Z80 assembly code
   */
  generateCode(ir) {
    const { Z80Codegen } = require('./backend/z80codegen.js');
    const codegen = new Z80Codegen({
      debugInfo: this.options.debugInfo,
      optimizeStack: true
    });

    return codegen.generate(ir);
  }
}

/**
 * Pass manager for organizing compilation passes (nanopass style)
 */
export class PassManager {
  /**
   * Gets singleton instance of pass manager
   * @param {Object} [flags] - Optimization flags
   * @returns {PassManager} Singleton instance
   */
  static getInstance(flags = {}) {
    if (!this._instance) {
      this._instance = new PassManager(flags);
    }
    return this._instance;
  }

  constructor(flags = {}) {
    this.flags = flags;
    /** @type {Array<object>} */
    this.passes = [];
    this.reset();
  }

  static _instance = null;

  /**
   * Resets pass state for a new compilation
   */
  reset() {
    this.currentPassIndex = 0;
    this.results = new Map();
  }

  /**
   * Registers an optimization pass
   * @param {object} pass - Pass object with run method
   */
  registerPass(pass) {
    if (!pass.getName || typeof pass.getName !== 'function') {
      console.warn('Invalid pass: missing getName()');
      return;
    }

    this.passes.push(pass);
  }

  /**
   * Gets all registered passes in order
   * @returns {object[]} Array of pass objects
   */
  getPasses() {
    // Filter passes based on optimization flags
    return this.passes.filter(pass => 
      !this.flags.noOpt || true // All passes run when no optimization
    );
  }

  /**
   * Gets current pass by index
   * @param {number} [index=0] - Pass index
   * @returns {object|null} Pass object or null if out of bounds
   */
  getCurrentPass(index = 0) {
    return this.passes[index] || null;
  }

  /**
   * Executes all passes on IR
   * @param {ProgramIR} ir - Input IR
   * @returns {ProgramIR} Output IR after all passes
   */
  execute(ir) {
    let current = ir;

    for (const pass of this.getPasses()) {
      try {
        const result = pass.run(current, { flags: this.flags });
        
        if (result !== undefined && result !== null) {
          current = result;
        }
      } catch (error) {
        console.error(`Pass ${pass.getName()} failed:`, error);
        throw error;
      }
    }

    return current;
  }
}
