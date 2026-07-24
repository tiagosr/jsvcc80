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
2. `src/preprocessor/lexer.js` - Tokenizer with define/undef/ifdef/else/endif support
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
- **Linker wired into compiler pipeline** - CLI flags `-c` for compile-only (object file output), `--format` for output format selection (assembly/wladx/binary), `--map` for link map generation, multi-file compilation with automatic linking
- **Static library (.a) support** - `src/linker/archive.js` with Archive/ArchiveMember classes, VCC80A binary format, serialization/deserialization, CLI handling of .a files, Compiler.loadArchive method, and 22 archive tests
- **const, volatile, and register qualifiers** - `TypeSpecNode` extended with `isVolatile` field (alongside existing `isConst`); `DeclNode` and `ParameterNode` extended with `storageClass` field for `register`; parser handles `const`, `volatile`, and `const volatile` type qualifiers before type keywords; `register` storage class specifier parsed for declarations and function parameters; qualifiers propagated through IR symbol table entries; `typeString()` includes qualifier prefixes; 29 new tests
- **Struct, union, sizeof, offsetof, typeof** - `SizeOfNode`, `OffsetOfNode`, `TypeOfNode` AST nodes; `TypeSpecNode` extended with `structType`/`structKind` for struct/union type references; struct/union tag collection and type registry with field offset computation; parser handles `sizeof(type)`, `sizeof(expr)`, `offsetof(Type, field)`, `typeof(expr)`, `struct Tag { ... }`, `union Tag { ... }`, struct variable declarations, member access with offset resolution; lexer `->` operator tokenized; 48 new tests
- **Pointers, arrays and character strings** - TypeSpecNode extended with `pointerDepth`, `isArray`, `arrayLength`; parser handles pointer/array declarators (`int *p`, `int arr[10]`), address-of operator (`&`), dereference (`*`), string literals emitted as global `.db` data; new IR instructions (`LoadAddrInstruction`, `DerefLoadInstruction`, `DerefStoreInstruction`, `IndexedLoadInstruction`, `IndexedStoreInstruction`); Z80 codegen for pointer operations and indexed memory access; 34 new tests
- **typedef and default types** - Parser supports `void`, `char`, `short`, `long`, `unsigned`, `signed`, `_Bool` as type specifiers with signedness modifiers; typedef names resolved via two-pass parsing; TypeSpecNode tracks type sizes; typedef aliases resolved in IR translation; 50 new tests
- **Binary object file format** - `src/linker/objectfile_loader.js` with VCC80O magic header, serialization/deserialization of sections, symbols, relocations, and CLI support for loading .o files
- **Processor intrinsics** - `IntrinsicInstruction` IR class, intrinsic detection in `translateCall`, Z80 codegen for special opcodes and port access, 43 intrinsic tests
- **Block transfer intrinsics** - `IntrinsicMap` extended with `__ini`, `__outi`, `__inir`, `__otir`, `__ind`, `__outd`, `__indr`, `__otdr`; Z80 codegen for INI/OUTI/INIR/OTIR/IND/OUTD/INDR/OTDR block transfer instructions using B for count, C for port, HL for buffer; 19 new tests
- **Preprocessor directives** - `#define`, `#undef`, `#ifdef`, `#ifndef`, `#else`, `#endif` implemented in lexer; `PreprocessedSource` extended with conditional compilation state machine (`conditionalStack`, `skipDepth`); `readDirective()` replaces `readPragma()` with generalized directive dispatcher; nested conditionals with skip depth tracking; 40 new tests
- **Include directive** - `#include "file"` and `#include <file>` implemented in lexer; `PreprocessedSource` extended with `includePaths` and `includedFiles` tracking for duplicate prevention; file resolution supports local directory, system include paths, and recursive inclusion; macros propagate across include boundaries; `-I` CLI flag for include directories; 15 new tests
- **#if/#elif/defined() preprocessor** - `#if` and `#elif` directives with full constant expression evaluation; recursive descent parser supports arithmetic (+, -, *, /, %), relational (<, >, <=, >=), equality (==, !=), bitwise (&, |, ^, ~), logical (&&, ||), unary (+, -, !, ~), shift (<<, >>), hex/octal literals, parenthesized expressions; `defined(MACRO)` and `defined MACRO` operators; undefined macros evaluate to 0 in expressions; macro values substituted in expressions; conditional stack frames track `branchTaken` for correct `#elif`/`#else` interaction; 40 new tests
- **Function-like macros with parameter substitution** - `#define MAX(a,b) ((a)>(b)?(a):(b))` function-like macro parsing with parameter list extraction; macro expansion during tokenization with object-like and function-like macro support; parameter substitution in replacement text; `#` (stringification) operator converts argument to string literal; `##` (token pasting) operator concatenates tokens; recursive macro expansion with rescan after substitution; infinite recursion guard prevents self-referencing macros; built-in macros `__FILE__` and `__LINE__` with proper line tracking; 39 new tests
- **Variadic function signatures** - Parser handles `func(...)` with ellipsis-only parameters; Parser handles `func(int a, int b, ...)` with named params followed by ellipsis; ParameterNode tracks `isVariadic` flag for ellipsis parameter; FunctionDefinitionNode computes `isVariadic` from parameters; Z80Codegen tracks variadic functions via currentFunctions Map; Variadic functions skip stack cleanup in CALL instruction (caller responsibility); IR excludes variadic param names from parameter list

#### 🧪 Test Results
- 631 passing tests

### 🔄 In Progress
- None

### 🔜 Next Steps
2. Implement function pointers as types, and extend the type system to support these
3. Implement linker definitions to add entry point `crt0` to default compiled/linked output
4. Implement minimal set of standard library functions (`setjmp`, `longjmp`, `alloca`, etc.)
5. Implement `unsigned:n` bit fields
6. Implement standard library functions (`printf`, `memset`, `memcpy`, etc.)
7. Implement symbol map exporting for debugging

### 📔 Backlog (issues identified during implementation for later priorization)
- Fix `typedef unsigned int newType` parsing

## Pre-commit Checklist
- Verify tests pass: `npm test`
- Check syntax: `node --check src/**/*.js`
- Ensure JSDoc comments on all exported functions
- No hardcoded paths - use relative imports from current file
- Update this file:
  - Add collected architecture notes
  - Move the current completed task from the "Next Steps" to the "Completed" list, with a short description of the features worked on
  - If any part of the current task can be taken on in the next iteration, move the task to the "In Progress" list
  - Update the "Test Results" count
  - If any part of the current task should be deferred to a later moment, add these parts to the "Backlog" list
  - If any debugging approach resulted in successful fixes after more than 5 other alternatives, add a short description of the approach to the "Debugging tips" list

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
