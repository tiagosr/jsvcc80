# vcc80 - Z80 C Compiler Agent Instructions

## Project Overview
A C compiler for Z80 CPU implemented in ES2025 Node.js. Compiles C source to Z80 assembly via nanopass IR.

## Commands
- `npm start` or `node bin/vcc80.js <source.c>` - Compile to stdout
- `node bin/vcc80.js -o output.z80 program.c` - Output to file
- `npm test` - Run all tests (uses node:test runner)

## Architecture Patterns

### File Structure Rules
- **1-7 functions per file** - Spread implementation across multiple small files, and modularization is strongly encouraged
- **Small files strongly preferred** - Individual implementation files should be under 300 lines, or under 10000 tokens each
- **Avoid Megazord classes** - Classes should preferrably keep single responsibilities; prefer functional composition over method aggregation; prefer free functions and context/state object passing over monolithic classes; adopt patterns that decrease the contact surface of classes
- **JSDoc required** - All types and function signatures must be documented
- **Prefer arrow functions** - If free functions are single-line, convert to arrow functions
- **ES modules only** - Use `import`/`export`, no CommonJS
- **Binary instruction streams in tests commented with mnemonics** - No "opaque" byte streams without their intention being clear; group instruction bytes together for proper readability

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
- Tests use `mocha` runner via `npm test`
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

## Pre-commit Checklist
- Verify tests pass: `npm test`
- Check syntax: `node --check src/**/*.js`
- Ensure JSDoc comments on all exported functions
- No hardcoded paths - use relative imports from current file
- Update README.md:
  - Move the current completed task from the "Next Steps" to the "Completed" list, with a short description of the features worked on
  - If any part of the current task can be taken on in the next iteration, move the task to the "In Progress" list
  - Update the "Test Results" count
  - If any part of the current task should be deferred to a later moment, add these parts to the "Backlog" list

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
