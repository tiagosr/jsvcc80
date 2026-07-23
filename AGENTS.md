# vcc80 - Z80 C Compiler Agent Instructions

## Project Overview
A C compiler for Z80 CPU implemented in ES2025 Node.js. Compiles C source to Z80 assembly via nanopass IR.

## Commands
- `npm start` or `node bin/vcc80.js <source.c>` - Compile to stdout
- `node bin/vcc80.js -o output.z80 program.c` - Output to file
- `npm test` - Run all tests (uses node:test runner)

## Architecture Patterns

### File Structure Rules
- **1-7 functions per file** - Spread implementation across multiple small files
- **JSDoc required** - All types and function signatures must be documented
- **ES modules only** - Use `import`/`export`, no CommonJS

### Core Modules (Read in Order)
1. `src/compiler.js` - Entry point, orchestrates all stages
2. `src/preprocessor/lexer.js` - Tokenizer with pragma support
3. `src/parser/combinators.js` - PEG parser framework (includes `lazy()` and `map()` combinators)
4. `src/parser/cparser.js` - C grammar PEG parser with AST construction
5. `src/nanopass/il.js` - Intermediate representation
6. `src/nanopass/ast_to_ir.js` - AST to IR translation pass
7. `src/nanopass/optimizations.js` - Z80 optimization passes (peephole, register allocation)
8. `src/nanopass/register_passes.js` - Optimization pass registration
9. `src/backend/z80codegen.js` - Z80 assembly generator

### Key Patterns

**Plugin System**: Extensible architecture via interfaces in `src/plugins/interfaces.js`. Register extensions using `globalRegistry.register(category, name, plugin)`.

**Nanopass Style**: Each compilation phase is a pass that transforms IR. Optimization passes defined as objects with `.run(ir)` method.

**AST to JSON**: All AST nodes have `.toJSON()` for inspectable output. Use this for debugging and analysis.

## Common Mistakes to Avoid

### Module Resolution
- Always use relative paths starting from current file location
- Test imports work: `node --check src/file.js` before running tests
- ES modules require `.js` extension in imports (even for .js files)

### Parser Combinators
- Prefer the wrapper calls for classes instead of using them directly: `Parser.lit()`, not via `new LitParser('INT')`
- Use `Parser.lazy()` to break circular dependencies in parser graphs, preferrably only once per loop
- Return parse results as `{success, value?, nextPos?, error?}` objects
- Collect errors at initial position only for meaningful diagnostics

### Z80 Code Generation
- Z80 has no 16-bit arithmetic - use repeated addition/subtraction for mul/div
- Stack grows downward: SP decrements on push
- All arithmetic operations work with accumulator (A) by default
- Use HL register pair for 16-bit addresses and values

### JSDoc Comments
```js
/**
 * Description of function behavior
 * @param {string} name - Parameter description
 * @returns {ReturnType} Return description
 */
function example(name) { ... }
```

## Testing Conventions
- Tests use `node:test` runner via `npm test`
- Test files in `src/tests/*.test.js` import from `../../src/...` (two levels up)
- Use `describe()` and `it()` for test organization
- All assertions must be strict (`assert.strictEqual`, not loose equality)

## Z80 Architecture Notes
- 8-bit accumulator (A), general registers B, C, D, E, H, L
- HL pair used as 16-bit address register
- IX/IY optional index registers
- SP for stack operations
- Memory addresses: `(addr)` syntax in assembly output

## Debugging Tips
- Use `--emit-ir` flag to see intermediate representation before codegen
- AST nodes serialize to JSON via `.toJSON()` method for inspection
- Check token types with `tokens.map(t => t.type)`
- Location tracking provides `{file, line, column}` on all errors

## Extensibility Points
1. **Parser extensions**: Add rules in `src/parser/combinators.js` style
2. **Optimization passes**: Implement `.run(ir)` interface from `src/plugins/interfaces.js`
3. **Attributes**: Handle `__attribute__(...)` via AttributeHandler pattern
4. **Backends**: Copy z80codegen.js structure for new target architectures

## Current Implementation Status

### ✅ Completed
- **Pointers, arrays and character strings** - TypeSpecNode extended with `pointerDepth`, `isArray`, `arrayLength`; parser handles pointer/array declarators (`int *p`, `int arr[10]`), address-of operator (`&`), dereference (`*`), string literals emitted as global `.db` data; new IR instructions (`LoadAddrInstruction`, `DerefLoadInstruction`, `DerefStoreInstruction`, `IndexedLoadInstruction`, `IndexedStoreInstruction`); Z80 codegen for pointer operations and indexed memory access; 34 new tests
- **typedef and default types** - Parser supports `void`, `char`, `short`, `long`, `unsigned`, `signed`, `_Bool` as type specifiers with signedness modifiers; typedef names resolved via two-pass parsing; TypeSpecNode tracks type sizes; typedef aliases resolved in IR translation; 50 new tests
- **Binary object file format** - `src/linker/objectfile_loader.js` with VCC80O magic header, serialization/deserialization of sections, symbols, relocations, and CLI support for loading .o files
- **Processor intrinsics** - `IntrinsicInstruction` IR class, intrinsic detection in `translateCall`, Z80 codegen for special opcodes and port access, 43 intrinsic tests
- 396 passing tests
- Preprocessor/lexer with pragma support (#pragma once, #pragma pack)
- PEG parser combinator framework (seq, alt, many, some, opt, lit, any, pred, lazy, map)
- AST node definitions for full C syntax
- Nanopass IR with instruction classes and symbol tables
- Z80 code generator backend (LOAD, STORE, binary ops, jumps, calls)
- Plugin architecture interfaces
- C grammar PEG parser with proper forward reference handling via `lazy()`
- AST construction via `map()` combinator - all parsed results converted to proper AST nodes
- AST → IR translation pass (`src/nanopass/ast_to_ir.js`) - functions, declarations, expressions, control flow
- AST → IR translation extended - binary ops with temp register tracking, function calls with argument pushing, while/do-while/for loops, switch/case, break/continue, goto/labels, assignment expressions, conditional (ternary) expressions
- C grammar parser binary expression rules fixed - proper right operand parsing with correct precedence levels
- C grammar parser operator mapping - relational (< > <= >=) to (lt gt le ge), equality (== !=) to (eq ne), bitwise (& | ^) to (and or xor), logical (&& ||) to (land lor), unary (- ~ !) to (neg not lognot)
- C grammar parser extended with while/do-while/for loops, switch/case, goto/break/continue, struct/union/enum/typedef
- Z80 optimization passes - peephole optimizer (dead code elimination, constant folding, redundant move/jump elimination, stack op merging) and register allocator (physical Z80 register assignment with spilling)
- Optimization pass registration via global registry
- **End-to-end pipeline wired** - `compiler.js` integrates lexer → parser → AST → IR → optimization → codegen
- **Binary operator mapping** - C operators (+, -, *, /, %, <<, >>) mapped to IR opcodes (add, sub, mul, div, mod, shl, shr)
- **Comparison codegen** - Z80 comparison operations (lt, gt, le, ge, eq, ne) generate proper cp/jp sequences
- **Register allocator cross-block** - Fixed virtual register tracking across basic block boundaries
- Parser extended for typed function parameters (int a, int b) with void support
- **Object file format** - `src/linker/objectfile.js` with ObjectFile, ObjectSection, ObjectSymbol, ObjectRelocation classes and IrToObjectFile converter
- **WLA DX code generator** - `src/linker/wladxcodegen.js` generates WLA DX-compatible Z80 assembly with section directives, DB/DW/DS data, and relocation support
- **Linker** - `src/linker/linker.js` combines object files, resolves symbols/relocations, generates binary/WLA DX output and link maps
- **Z80 codegen quality improvements** - Proper stack frame management using IX as frame pointer, basic block label emission, fixed comparison logic (le/ge flags), valid Z80 stack alloc/free instructions, complete division/mod/shl/shr implementation, copy propagation optimization, fixed constant folding with correct IR op names
- 268 passing tests
- **Linker wired into compiler pipeline** - CLI flags `-c` for compile-only (object file output), `--format` for output format selection (assembly/wladx/binary), `--map` for link map generation, multi-file compilation with automatic linking
- **Static library (.a) support** - `src/linker/archive.js` with Archive/ArchiveMember classes, VCC80A binary format, serialization/deserialization, CLI handling of .a files, Compiler.loadArchive method, and 22 archive tests

### 🔄 In Progress
- None

### 🔜 Next Steps
1. Implement `struct`, `union`, `typeof()`, `sizeof()` and `offsetof()`, and extend the type system to support those
2. Implement `const`, `volatile` and `register`, and extend the type system to support these
3. Implement block transfer intrinsics (`INI`, `OUTI`, `INIR`, `OTIR`, `IND`, `OUTD`, `INDR`, `OTDR`)
4. Implement interrupt/NMI semantics, hooking them up to `__attribute__((interrupt("IRQ")))` and `__attribute__((interrupt("nmi")))`, along with the `RETI` and `RETN` opcodes
5. Implement pointer to pointer, array of arrays and extend the type system to support these
6. Implement `#define`, `#undef`, `#ifdef`, `#ifndef`, `#else`, `#endif` in the preprocessor (first without parameters)
7. Implement `#include "..."` and `#include <...>` in the preprocessor
8. Implement `#if`, `#elif`, expressions and `defined(...)` in the preprocessor
9. Implement `#define` with parameters and parameter substitution
10. Implement variadic function signatures
11. Implement function pointers as types, and extend the type system to support these
12. Implement linker definitions to add entry point `crt0` to default compiled/linked output
13. Implement minimal set of standard library functions (`setjmp`, `longjmp`, `alloca`, etc.)
14. Implement `unsigned:n` bit fields
15. Implement standard library functions (`printf`, `memset`, `memcpy`, etc.)
16. Implement `__FILENAME__` and `__LINE__` in the preprocessor
17. Implement symbol map exporting for debugging

## Pre-commit Checklist
- Verify tests pass: `npm test`
- Check syntax: `node --check src/**/*.js`
- Ensure JSDoc comments on all exported functions
- No hardcoded paths - use relative imports from current file
- Update this file with architecture notes, completed/in-progress/next-steps lists and pre-commit checklists

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
