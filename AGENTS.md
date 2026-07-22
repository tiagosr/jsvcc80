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
- 149 passing tests

### 🔄 In Progress
- None

### 🔜 Next Steps
1. Build object file assembler/linker - support WLA DX-compatible assembly output
2. Extend parser for typed function parameters (int a, int b)
3. Improve Z80 codegen quality (eliminate redundant instructions, proper stack frame management)

## Pre-commit Checklist
- Verify tests pass: `npm test`
- Check syntax: `node --check src/**/*.js`
- Ensure JSDoc comments on all exported functions
- No hardcoded paths - use relative imports from current file
- Update this file with architecture notes, completed/in-progress/next-steps lists and pre-commit checklists
