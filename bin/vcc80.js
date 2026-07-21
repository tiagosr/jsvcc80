#!/usr/bin/env node

/**
 * vcc80 - Z80 C Compiler CLI Entry Point
 * 
 * Usage: vcc80 [options] <source_file>
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parses command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    files: [],
    output: null,
    debug: false,
    emitIr: false,
    opt: 'O0',
    help: false,
    version: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-o':
        options.output = args[++i];
        break;
      
      case '--debug':
        options.debug = true;
        i++;
        break;

      case '--emit-ir':
        options.emitIr = true;
        i++;
        break;

      case '-O0':
      case '-O1':
      case '-O2':
      case '-O3':
      case '-Os':
      case '-Oz':
        options.opt = arg.slice(1);
        i++;
        break;

      case '-h':
      case '--help':
        options.help = true;
        i++;
        break;

      case '-v':
      case '--version':
        options.version = true;
        i++;
        break;

      default:
        if (!arg.startsWith('-')) {
          options.files.push(arg);
        }
        i++;
    }
  }

  return options;
}

/**
 * Prints help message
 */
function printHelp() {
  console.log(`vcc80 - Z80 C Compiler

Usage: vcc80 [options] <source_file>

Options:
  -o, --output <file>    Output file (default: stdout)
  -O0, -O1, -O2, -O3     Optimization level (default: O0)
  -Os                    Optimize for size
  -Oz                    Optimize for size and power
  --debug                Emit debug information
  --emit-ir              Output intermediate representation
  -h, --help             Show this help message
  -v, --version          Show version information

Examples:
  vcc80 program.c           # Compile to stdout
  vcc80 -O2 program.c       # Optimize level 2
  vcc80 -o output.z80 program.c  # Output to file
`);
}

/**
 * Prints version information
 */
function printVersion() {
  console.log('vcc80 Z80 C Compiler v0.1.0');
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  if (options.version) {
    printVersion();
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (options.files.length === 0) {
    console.error('Error: No source files specified');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Import compiler modules
  const { Compiler, CompilerOptions } = await import('../src/compiler.js');

  try {
    const results = [];

    for (const file of options.files) {
      console.error(`Compiling ${file}...`);
      
      let source;
      try {
        source = readFileSync(file, 'utf-8');
      } catch (error) {
        console.error(`Error reading ${file}: ${error.message}`);
        continue;
      }

      const compilerOptions = new CompilerOptions({
        source: file,
        opt: options.opt,
        debug: options.debug,
        emitIr: options.emitIr
      });

      const compiler = new Compiler(compilerOptions);
      const result = compiler.compileSource(source);

      results.push({ file, ...result });

      if (!result.success) {
        console.error(`Compilation failed for ${file}:`);
        for (const error of result.errors) {
          console.error(`  Error: ${error}`);
        }
        process.exit(1);
      }
    }

    // Output results
    const output = results[0].code;

    if (options.emitIr && results[0].ir) {
      console.error('--- IR Output ---');
      console.log(results[0].ir);
      console.error('--- End IR ---\n');
    }

    if (options.output) {
      writeFileSync(options.output, output);
      console.error(`Output written to ${options.output}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
