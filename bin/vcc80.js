#!/usr/bin/env node

/**
 * vcc80 - Z80 C Compiler CLI Entry Point
 * 
 * Usage: vcc80 [options] <source_file>
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ArgumentParser } from 'argparse';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parses command-line arguments using argparse
 */
function parseArgs() {
  const parser = new ArgumentParser({
    prog: 'vcc80',
    description: 'vcc80 - Z80 C Compiler'
  });

  parser.add_argument('-o', '--output', {
    help: 'Output file (default: stdout)'
  });

  parser.add_argument('-c', {
    action: 'store_true',
    dest: 'compileOnly',
    help: 'Compile only (produce object file, no linking)'
  });

  parser.add_argument('--format', {
    default: 'assembly',
    help: 'Output format: assembly, wladx, binary (default: assembly)'
  });

  parser.add_argument('--map', {
    action: 'store_true',
    help: 'Generate link map'
  });

  parser.add_argument('-O', {
    default: 'O0',
    dest: 'opt',
    help: 'Optimization level (O0, O1, O2, O3, Os, Oz)'
  });

  parser.add_argument('--debug', {
    action: 'store_true',
    help: 'Emit debug information'
  });

  parser.add_argument('--emit-ir', {
    action: 'store_true',
    dest: 'emitIr',
    help: 'Output intermediate representation'
  });

  parser.add_argument('-v', '--version', {
    action: 'version',
    version: 'vcc80 Z80 C Compiler v0.1.0',
    help: 'Show version information'
  });

  parser.add_argument('files', {
    nargs: '*',
    help: 'Source file(s) to compile'
  });

  const parsed = parser.parse_args();

  return {
    files: parsed.files,
    output: parsed.output,
    debug: parsed.debug,
    emitIr: parsed.emitIr,
    opt: parsed.opt,
    help: false,
    version: false,
    compileOnly: parsed.compileOnly,
    map: parsed.map,
    format: parsed.format
  };
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

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
