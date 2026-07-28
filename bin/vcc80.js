#!/usr/bin/env node

/**
 * vcc80 - Z80 C Compiler CLI Entry Point
 * 
 * Usage: vcc80 [options] <source_file>
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, extname } from 'path';
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

  parser.add_argument('--map-format', {
    default: 'text',
    choices: ['text', 'json'],
    help: 'Link map format: text, json (default: text)'
  });

  parser.add_argument('--map', {
    dest: 'mapFile',
    help: 'Output link map to file (default: stdout/stderr)'
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

  parser.add_argument('-I', {
    action: 'append',
    dest: 'includePaths',
    default: [],
    help: 'Add directory to include search path'
  });

  parser.add_argument('--no-crt0', {
    action: 'store_false',
    dest: 'enableCrt0',
    help: 'Disable crt0 startup code generation'
  });

  parser.add_argument('--stack-top', {
    dest: 'stackTop',
    help: 'Stack pointer top address (default: 0xFFFF)'
  });

  parser.add_argument('--disassemble', {
    action: 'store_true',
    dest: 'disassemble',
    help: 'Disassemble object file or binary'
  });

  parser.add_argument('--view', {
    action: 'store_true',
    dest: 'view',
    help: 'View object file with objdump-like output (sections, symbols, relocations, disassembly)'
  });

  parser.add_argument('--base', {
    dest: 'baseAddress',
    help: 'Base address for disassembly/view (default: $0000 for binary, $8000 for object)'
  });

  parser.add_argument('-v', '--verbose', {
    action: 'store_true',
    dest: 'verbose',
    help: 'Verbose output (relocation annotations, hex bytes alongside disassembly)'
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

  const stackTop = parsed.stackTop
    ? (parsed.stackTop.startsWith('$') ? parseInt(parsed.stackTop, 16) : parseInt(parsed.stackTop, 10))
    : null;

  const baseAddress = parsed.baseAddress
    ? (parsed.baseAddress.startsWith('$') ? parseInt(parsed.baseAddress, 16) : parseInt(parsed.baseAddress, 10))
    : null;

  return {
    files: parsed.files,
    output: parsed.output,
    debug: parsed.debug,
    emitIr: parsed.emitIr,
    opt: parsed.opt,
    help: false,
    version: false,
    compileOnly: parsed.compileOnly,
    mapFormat: parsed.map_format,
    mapFile: parsed.mapFile,
    format: parsed.format,
    enableCrt0: parsed.enableCrt0,
    stackTop: stackTop,
    disassemble: parsed.disassemble,
    view: parsed.view,
    baseAddress: baseAddress,
    verbose: parsed.verbose
  };
}

/**
 * Processes a single file: compiles .c files, loads .o files, expands .a archives
 * @param {string} file - Input file path
 * @param {Compiler} compiler - Compiler instance
 * @param {Object} options - CLI options
 * @returns {Object[]} Array of compilation/load results
 */
function processFile(file, compiler, options) {
  const ext = extname(file);

  if (ext === '.a') {
    console.error(`Loading archive ${file}...`);
    const result = compiler.loadArchive(file);
    if (!result.success) {
      return [{ success: false, objectFile: null, errors: result.errors }];
    }
    return result.objectFiles.map(of => ({
      success: true,
      objectFile: of,
      warnings: [],
      errors: []
    }));
  }

  if (ext === '.o') {
    console.error(`Loading ${file}...`);
    return [compiler.loadObjectFile(file)];
  }

  console.error(`Compiling ${file}...`);

  let source;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (error) {
    return [{ success: false, objectFile: null, errors: [`Error reading ${file}: ${error.message}`] }];
  }

  return [compiler.compileToObjectFile(source)];
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

  const hasObjectFiles = options.files.some(f => extname(f) === '.o');
  const hasSourceFiles = options.files.some(f => extname(f) === '.c');
  const hasArchiveFiles = options.files.some(f => extname(f) === '.a');

  // If only a single .c file and no compile-only flag, do direct compilation
  const singleSourceCompile = hasSourceFiles && !hasObjectFiles && !hasArchiveFiles && options.files.length === 1 && !options.compileOnly;

  // Import compiler modules
  const { Compiler, CompilerOptions } = await import('../src/compiler.js');

  try {
      if (options.view) {
        const file = options.files[0];
        const ext = extname(file);

        if (ext === '.o') {
          const { loadObjectFile } = await import('../src/linker/objectfile_loader.js');
          const { viewObjectFile } = await import('../src/disassembler/objectfile_viewer.js');
          const objectFile = loadObjectFile(file);
          const result = viewObjectFile(objectFile, {
            baseAddress: options.baseAddress ?? 0x8000,
            verbose: options.verbose ?? false
          });
          if (options.output) {
            writeFileSync(options.output, result.toString());
            console.error(`Output written to ${options.output}`);
          } else {
            console.log(result.toString());
          }
        } else if (ext === '.bin') {
          const { disassembleBinaryFromFile } = await import('../src/disassembler/binary_disassembler.js');
          const result = disassembleBinaryFromFile(file, {
            baseAddress: options.baseAddress ?? 0x0000,
            verbose: options.verbose ?? false
          });
          if (options.output) {
            writeFileSync(options.output, result.toString());
            console.error(`Output written to ${options.output}`);
          } else {
            console.log(result.toString());
          }
        } else {
          console.error('Error: --view requires a .o or .bin file');
          process.exit(1);
        }
        return;
      }

      if (options.disassemble) {
      const file = options.files[0];
      const ext = extname(file);

      if (ext === '.o') {
        const { loadObjectFile } = await import('../src/linker/objectfile_loader.js');
        const { disassembleObjectFile } = await import('../src/disassembler/objectfile_disassembler.js');
        const data = readFileSync(file);
        const objectFile = loadObjectFile(file);
        const result = disassembleObjectFile(objectFile, {
          baseAddress: options.baseAddress ?? 0x8000,
          verbose: false
        });
        if (options.output) {
          writeFileSync(options.output, result.toString());
          console.error(`Output written to ${options.output}`);
        } else {
          console.log(result.toString());
        }
      } else if (ext === '.bin') {
        const { disassembleBinaryFromFile } = await import('../src/disassembler/binary_disassembler.js');
        const result = disassembleBinaryFromFile(file, {
          baseAddress: options.baseAddress ?? 0x0000,
          verbose: false
        });
        if (options.output) {
          writeFileSync(options.output, result.toString());
          console.error(`Output written to ${options.output}`);
        } else {
          console.log(result.toString());
        }
      } else {
        console.error('Error: --disassemble requires a .o or .bin file');
        process.exit(1);
      }
      return;
    }

    if (singleSourceCompile) {
      const file = options.files[0];
      const source = readFileSync(file, 'utf-8');

      const compilerOptions = new CompilerOptions({
        source: file,
        opt: options.opt,
        debug: options.debug,
        emitIr: options.emitIr,
        compileOnly: options.compileOnly,
        outputFormat: options.format,
        includePaths: options.includePaths,
        linkerOptions: {
          enableCrt0: options.enableCrt0,
          stackTop: options.stackTop,
          entryPoint: 'main',
          inputFiles: options.files
        }
      });

      const compiler = new Compiler(compilerOptions);
      const result = compiler.compileSource(source);

      if (!result.success) {
        console.error(`Compilation failed for ${file}:`);
        for (const error of result.errors) {
          console.error(`  Error: ${error}`);
        }
        process.exit(1);
      }

      const output = result.code;

      if (options.emitIr && result.ir) {
        console.error('--- IR Output ---');
        console.log(result.ir);
        console.error('--- End IR ---\n');
      }

      if (options.output) {
        writeFileSync(options.output, output);
        console.error(`Output written to ${options.output}`);
      } else {
        console.log(output);
      }

      return;
    }

    const objResults = [];

    for (const file of options.files) {
      const compilerOptions = new CompilerOptions({
        source: file,
        opt: options.opt,
        debug: options.debug,
        outputFormat: options.format,
        includePaths: options.includePaths
      });

      const compiler = new Compiler(compilerOptions);
      const results = processFile(file, compiler, options);

      for (const result of results) {
        if (!result.success) {
          console.error(`Failed for ${file}:`);
          for (const error of result.errors) {
            console.error(`  Error: ${error}`);
          }
          process.exit(1);
        }

        if (options.compileOnly) {
          const outPath = options.output || file.replace(/\.[^.]+$/, '.o');
          compiler.writeObjectFile(result, outPath);
          console.error(`Object file written to ${outPath}`);
        } else {
          objResults.push(result);
        }
      }
    }

    if (options.compileOnly) {
      return;
    }

    const compilerOptions = new CompilerOptions({
      source: options.files[0],
      opt: options.opt,
      outputFormat: options.format,
      includePaths: options.includePaths,
      linkerOptions: {
        enableCrt0: options.enableCrt0,
        stackTop: options.stackTop,
        entryPoint: 'main',
        inputFiles: options.files
      }
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

    if (options.mapFile) {
      const mapContent = options.mapFormat === 'json' ? linkResult.jsonMap : linkResult.map;
      writeFileSync(options.mapFile, mapContent);
      console.error(`Link map written to ${options.mapFile}`);
    } else if (options.mapFormat === 'json') {
      console.error('--- Link Map (JSON) ---');
      console.error(linkResult.jsonMap);
      console.error('--- End Map ---');
    } else if (options.mapFormat === 'text') {
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
