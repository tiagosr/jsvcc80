jsvcc80
=======

A fully-local agent orchestration/process experiment "disguised" as an effort to produce a working C compiler for the Z80 CPU.

The intention is to learn what are the processes that avoid "agent orchestration rot", where the process of prompting an implementation starts giving way to the degradation of software planning and architecture decisions (both on the model's and on the user/prompter's side). The threshold for this phenomenon seems more manageable (on both mental and financial terms) in the current crop of LLMs that can be run in a local setup, on either a 48GB Macbook Pro M4 or a 128GB AMD "Strix Halo" Ryzen AI MAX+.

I'm compiling findings about this process on FINDINGS.md.

## Current Implementation Status

### ✅ Completed
- Preprocessor/lexer with pragma support (`#pragma once`, `#pragma pack`)
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
- **Function pointers - Type system foundation** - Extended `TypeSpecNode` with `isFunctionPointer`, `functionReturnType`, and `functionParams` fields for representing function pointer types; Added `createFunctionPointerType()` helper to construct function pointer type specifications; Updated `getSize()` and `getElementSize()` to return 2 bytes for function pointers (16-bit Z80 addresses); Enhanced `typeString()` to format function pointers as `returnType (*)(paramTypes)`; Function pointers have `pointerDepth = 1` and `isFunctionPointer = true`; All type system operations properly handle function pointer types with correct size calculations; Comprehensive test suite covering function pointer type creation, size queries, string representations with various qualifiers (const/volatile), parameter lists, and edge cases
- **Function pointer declarator parsing** - Enhanced parser to support full function pointer declarators including array dimensions (`int (*fp[3])(int)`); Fixed parser issues causing test failures; Added proper handling for `(*name)(params)` pattern with optional array dimension in function pointer declarations; 7 out of 8 function pointer tests now passing
- **Nested function pointer parsing** - Fixed parsing of pointer-to-function-returning-function-pointer declarations (`int (*(*fp)(int))(int)`); Implemented custom `FunctionPointerDeclaratorParser` class with recursive nested parsing, lookahead for nested vs simple function pointers, and proper token value extraction; All 8 function pointer tests passing
- **Function pointer IR translation** - Implemented complete IR translation for function pointers: address-of function (`&func`) returns function pointer, storing function pointers to variables via `LOAD_ADDR` + `BINOP addr` pattern, loading function pointers from variables, calling through function pointers (both direct and through array elements `fp[i](args)`), function pointer parameters, and function pointer local variable declarations with initialization; Fixed parser bug where function pointer declaration names were not extracted correctly; 6 new IR translation tests + 13 existing type system tests passing
- **Z80 code generation for function pointers** - Added `CallIndirectInstruction` IR class for function pointer calls, updated `translateLoadFunctionPointer` to use `DerefLoadInstruction` for proper loading, implemented `generateCallIndirect` in Z80 codegen that loads function address from register and calls through it, added register allocator support for `CallIndirectInstruction`, updated IR translation to use `CallIndirectInstruction` instead of `CallInstruction` for function pointer calls, fixed old `generateCall` to only handle regular (non-pointer) function calls; 2 new end-to-end tests for Z80 code generation
- **Processor intrinsics** - `IntrinsicInstruction` IR class, intrinsic detection in `translateCall`, Z80 codegen for special opcodes and port access, 43 intrinsic tests
- **Block transfer intrinsics** - `IntrinsicMap` extended with `__ini`, `__outi`, `__inir`, `__otir`, `__ind`, `__outd`, `__indr`, `__otdr`; Z80 codegen for INI/OUTI/INIR/OTIR/IND/OUTD/INDR/OTDR block transfer instructions using B for count, C for port, HL for buffer; 19 new tests
- **Setjmp/Longjmp/Alloca intrinsics** - `IntrinsicMap` extended with `__setjmp`, `__longjmp`, `__alloca`; Z80 codegen for context save/restore (PC, SP, IX, HL, DE, BC, AF) for setjmp/longjmp, stack allocation for alloca; 12 new tests
- **C standard library - memory operations** - `memset`, `memcpy`, `memcmp`, `memmove`, `memchr` implemented as C source files in `src/core/stdlib/`; parser support for C-style casts `(type)expr`, postfix increment/decrement (`x++`, `x--`), brace-enclosed array initializers `{1, 2, 3}`, and `NULL` keyword; 10 new tests

### 🔄 In Progress
- Implement linker definitions to add entry point `crt0` to default compiled/linked output

### 🔜 Next Steps
1. Add character string operations to the C standard library (`sprintf`, `sscanf`, `strlen`, `strtoi`, etc.)
2. Add file stream abstractions to the C standard library (`FILE`, `putc`, `getc`, `fprintf`, `fscanf`, etc.)
3. Add file stream abstractions to the C standard library (`FILE`, `putc`, `getc`, `fprintf`, `fscanf`, etc.)
4. Implement symbol map compiling and exporting for debugging
5. Implement `unsigned:n` bit fields

#### 🧪 Test Results
- 682 passing tests

### 📔 Backlog (issues identified during implementation for later priorization)
- Fix `typedef unsigned int newType` parsing
- C standard library - character string operations (sprintf, sscanf, strlen, etc.)
- C standard library - file stream abstractions (FILE, putc, getc, etc.)
