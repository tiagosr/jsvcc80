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
    version: false,
    compileOnly: false,
    map: false,
    format: 'assembly'
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-o':
        options.output = args[++i];
        i++;
        break;
      
      case '-c':
        options.compileOnly = true;
        i++;
        break;

      case '--debug':
        options.debug = true;
        i++;
        break;

      case '--emit-ir':
        options.emitIr = true;
        i++;
        break;

      case '--map':
        options.map = true;
        i++;
        break;

      case '--format':
        options.format = args[++i];
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

Usage: vcc80 [options] <source_file> [source_file...]

Options:
  -o, --output <file>    Output file (default: stdout)
  -c                     Compile only (produce object file, no linking)
  --format <format>      Output format: assembly, wladx, binary (default: assembly)
  --map                  Generate link map
  -O0, -O1, -O2, -O3     Optimization level (default: O0)
  -Os                    Optimize for size
  -Oz                    Optimize for size and power
  --debug                Emit debug information
  --emit-ir              Output intermediate representation
  -h, --help             Show this help message
  -v, --version          Show version information

Examples:
  vcc80 program.c                    # Compile to stdout
  vcc80 -O2 program.c                # Optimize level 2
  vcc80 -o output.z80 program.c      # Output to file
  vcc80 -c -o prog.o program.c       # Compile to object file
  vcc80 -o output.z80 a.c b.c        # Compile and link multiple files
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
        emitIr: options.emitIr,
        compileOnly: options.compileOnly,
        outputFormat: options.format
      });

      const compiler = new Compiler(compilerOptions);

      if (options.compileOnly) {
        const result = compiler.compileToObjectFile(source);
        results.push({ file, objectFile: result.objectFile, success: result.success, errors: result.errors });

        if (!result.success) {
          console.error(`Compilation failed for ${file}:`);
          for (const error of result.errors) {
            console.error(`  Error: ${error}`);
          }
          process.exit(1);
        }

        const outPath = options.output || file.replace(/\.c$/, '.o');
        compiler.writeObjectFile(result, outPath);
        console.error(`Object file written to ${outPath}`);
      } else {
        const result = compiler.compileSource(source);
        results.push({ file, code: result.code, ir: result.ir, success: result.success, errors: result.errors });

        if (!result.success) {
          console.error(`Compilation failed for ${file}:`);
          for (const error of result.errors) {
            console.error(`  Error: ${error}`);
          }
          process.exit(1);
        }
      }
    }

    if (options.compileOnly) {
      return;
    }

    if (options.files.length > 1) {
      const objResults = [];
      for (const file of options.files) {
        const compilerOptions = new CompilerOptions({
          source: file,
          opt: options.opt,
          debug: options.debug,
          outputFormat: options.format
        });
        const compiler = new Compiler(compilerOptions);
        const source = readFileSync(file, 'utf-8');
        const objResult = compiler.compileToObjectFile(source);
        objResults.push(objResult);
      }

      const compilerOptions = new CompilerOptions({
        source: options.files[0],
        opt: options.opt,
        outputFormat: options.format
      });
      const linkerCompiler = new Compiler(compilerOptions);
      const linkResult = linkerCompiler.link(objResults);

      if (!linkResult.success) {
        console.error('Linking failed:');
        for (const error of linkResult.errors) {
          console.error(`  Error: ${error}`);
        }
        process.exit(1);
      }

      if (options.map) {
        console.error('--- Link Map ---');
        console.error(linkResult.map);
        console.error('--- End Map ---');
      }

      if (options.output) {
        linkerCompiler.writeLinkOutput(linkResult, options.output);
        console.error(`Output written to ${options.output}`);
      } else {
        console.log(linkResult.output);
      }
    } else {
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
