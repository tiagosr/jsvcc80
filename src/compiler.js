/**
 * Main Compiler class - orchestrates all compilation stages
 */
import { readFileSync, writeFileSync } from 'fs';
import { Lexer, PreprocessedSource } from './preprocessor/lexer.js';
import { CPegParser } from './parser/cparser.js';
import { globalRegistry } from './core/plugins.js';
import { ProgramIR } from './nanopass/il.js';
import { ParserError } from './core/errors.js';
import { AstToIr } from './nanopass/ast_to_ir.js';
import { Z80Codegen } from './backend/z80codegen.js';
import { IrToObjectFile } from './linker/objectfile.js';
import { Linker, LinkerOptions } from './linker/linker.js';
import { loadObjectFile, saveObjectFile } from './linker/objectfile_loader.js';
import { loadArchive, Archive } from './linker/archive.js';
import './nanopass/register_passes.js';

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
    this.optimizationLevel = options.opt || 'O0';
    this.targetArchitecture = options.arch || 'z80';
    this.debugInfo = !!options.debug;
    this.emitIR = !!options.emitIr;
    this.plugins = options.plugins || [];
    this.compileOnly = !!options.compileOnly;
    this.outputFormat = options.outputFormat || 'assembly';
    this.linkerOptions = options.linkerOptions || {};
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
 * Pass manager for organizing compilation passes (nanopass style)
 */
export class PassManager {
  /**
   * Gets singleton instance of pass manager
   * @param {Object} [flags] - Optimization flags
   * @returns {PassManager} Singleton instance
   */
  static getInstance(flags = {}) {
    if (!PassManager._instance) {
      PassManager._instance = new PassManager(flags);
    }
    return PassManager._instance;
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
    return this.passes.filter(pass =>
      !this.flags.noOpt || true
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
    this.passManager = null;

    // Load registered plugins
    this.loadPlugins();
  }

  /**
   * Loads compiler plugins from registry and options
   */
  loadPlugins() {
    this.passManager = PassManager.getInstance(this.options.getOptimizationFlags());

    // Load parser extensions
    for (const plugin of globalRegistry.getPlugins('parser')) {
      if (plugin.init) {
        plugin.init({ compiler: this, options: this.options });
      }
    }

    // Register optimization passes from plugins
    for (const pass of globalRegistry.getPlugins('optimization_pass')) {
      this.passManager.registerPass(pass);
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
  compileFile(filePath) {
    const source = readFileSync(filePath, 'utf-8');

    this.options.sourceFile = filePath;
    return this.compileSource(source);
  }

  /**
   * Preprocessing stage - handles #pragma and other directives
   * @param {string} source - Raw source code
   * @returns {string} Processed source
   */
  preprocess(source) {
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
  parse(tokens) {
    this.parser = new CPegParser();

    try {
      return this.parser.parse(tokens);
    } catch (error) {
      if (error.name === 'ParserError') {
        throw error;
      }
      throw new ParserError(error.message, tokens[0]?.location || null);
    }
  }

  /**
   * Semantic analysis stage - type checking and symbol resolution
   * @param {ASTNode} ast - AST to analyze
   * @returns {ASTNode} Analyzed AST
   */
  analyze(ast) {
    return ast;
  }

  /**
   * IR generation stage - translates AST to intermediate representation
   * @param {ASTNode} ast - Analyzed AST
   * @returns {ProgramIR} Program intermediate representation
   */
  generateIR(ast) {
    const translator = new AstToIr();
    return translator.translate(ast);
  }

  /**
   * Optimization stage - applies optimization passes to IR
   * @param {ProgramIR} ir - IR to optimize
   * @returns {ProgramIR} Optimized IR
   */
  optimize(ir) {
    let current = ir;
    for (const pass of this.passManager.getPasses()) {
      const result = pass.run(current);

      if (result == null) {
        console.warn(`Optimization pass ${pass.getName()} returned null`);
        continue;
      }

      current = result;
    }

    return current;
  }

  /**
   * Code generation stage - produces target assembly from IR
   * @param {ProgramIR} ir - Optimized IR
   * @returns {string} Generated Z80 assembly code
   */
  generateCode(ir) {
    const codegen = new Z80Codegen({
      debugInfo: this.options.debugInfo,
      optimizeStack: true
    });

    return codegen.generate(ir);
  }

  /**
   * Compiles source code to an object file
   * @param {string} source - C source code
   * @returns {Object} Compilation result with object file
   */
  compileToObjectFile(source) {
    const result = {
      success: false,
      objectFile: null,
      warnings: [],
      errors: []
    };

    try {
      const preprocessed = this.preprocess(source);
      const tokens = this.tokenize(preprocessed);
      const ast = this.parse(tokens);
      const analyzedAst = this.analyze(ast);
      const ir = this.generateIR(analyzedAst);
      const optimizedIr = this.optimize(ir);

      const converter = new IrToObjectFile(this.options.sourceFile);
      result.objectFile = converter.convert(optimizedIr);
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
   * Compiles a file to an object file
   * @param {string} filePath - Path to C source file
   * @returns {Object} Compilation result with object file
   */
  compileFileToObject(filePath) {
    const source = readFileSync(filePath, 'utf-8');
    this.options.sourceFile = filePath;
    return this.compileToObjectFile(source);
  }

  /**
   * Writes an object file to disk in binary format
   * @param {Object} compileResult - Result from compileToObjectFile
   * @param {string} outputPath - Output file path
   */
  writeObjectFile(compileResult, outputPath) {
    if (!compileResult.success || !compileResult.objectFile) {
      throw new Error('Cannot write object file: compilation failed');
    }
    saveObjectFile(compileResult.objectFile, outputPath);
  }

  /**
   * Loads a pre-compiled object file from disk
   * @param {string} filePath - Path to .o file
   * @returns {Object} Result object with objectFile
   */
  loadObjectFile(filePath) {
    const result = {
      success: false,
      objectFile: null,
      warnings: [],
      errors: []
    };

    try {
      result.objectFile = loadObjectFile(filePath);
      result.success = true;
    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Loads a static library archive from disk
   * @param {string} filePath - Path to .a file
   * @returns {Object} Result object with archive and objectFiles
   */
  loadArchive(filePath) {
    const result = {
      success: false,
      archive: null,
      objectFiles: [],
      warnings: [],
      errors: []
    };

    try {
      const archive = loadArchive(filePath);
      result.archive = archive;
      result.objectFiles = archive.getObjectFiles();
      result.success = true;
    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Links compiled object files together
   * @param {Object[]} compileResults - Array of compilation results with object files
   * @returns {Object} Link result with output
   */
  link(compileResults) {
    const result = {
      success: false,
      output: '',
      binary: null,
      map: '',
      warnings: [],
      errors: []
    };

    try {
      const linker = new Linker(new LinkerOptions(this.options.linkerOptions));

      for (const compileResult of compileResults) {
        if (compileResult.objectFile) {
          linker.addObjectFile(compileResult.objectFile);
        }
      }

      const linkResult = linker.link();

      if (!linkResult.success) {
        result.errors = linkResult.errors;
        result.warnings = linkResult.warnings;
        return result;
      }

      result.warnings = linkResult.warnings;
      result.map = linker.generateMap();

      if (this.options.outputFormat === 'binary') {
        result.binary = linker.generateBinary();
      } else {
        result.output = linker.generateWlaDx();
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Writes linked output to disk
   * @param {Object} linkResult - Result from link()
   * @param {string} outputPath - Output file path
   */
  writeLinkOutput(linkResult, outputPath) {
    if (!linkResult.success) {
      throw new Error('Cannot write output: linking failed');
    }

    if (this.options.outputFormat === 'binary' && linkResult.binary) {
      writeFileSync(outputPath, Buffer.from(linkResult.binary));
    } else {
      writeFileSync(outputPath, linkResult.output);
    }
  }
}
