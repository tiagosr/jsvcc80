# Graph Report - jsvcc80  (2026-07-27)

## Corpus Check
- 142 files · ~143,355 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1255 nodes · 2679 edges · 93 communities (46 shown, 47 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `adf63466`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AST Node Definitions
- Parser Combinators
- Parser Error Handling
- Z80 Codegen & IR Base
- Plugin Interfaces
- Core Error Types
- AST to IR Translation
- CLI Entry & Compiler
- Z80 Code Generator
- Lexer & C Parser
- Plugin Registry
- Architecture Documentation
- Register Allocator
- Package Configuration
- Linker Core
- WLA DX Codegen
- Archive (Static Lib)
- IR to Object File
- Object File & Relocations
- BinaryOpNode
- Object File Format
- Binary Writer
- Compiler Options & Loading
- Binary Reader
- Object Sections
- Object File Container
- Symbol Table
- Linker Features Docs
- DerefStoreInstruction
- IR Instruction Base
- Link Result
- Resolved Symbol
- PluginRegistry
- TypeSpecNode
- CompoundNode
- ControlFlowNode
- LoadAddrInstruction
- EnumNode
- EnumValueNode
- DerefLoadInstruction
- GotoNode
- wladxcodegen.js
- WlaDxCodegen
- IndexedLoadInstruction
- objectfile_loader.js
- Current Implementation Status
- IndexedLoadInstruction
- PreprocessedSource
- MemberNode
- ._executeOpcode
- LoadAddrInstruction
- BinaryOpNode
- CaseClauseNode
- CompoundNode
- ExprStmtNode
- IndexNode
- AnyParser
- ConstantEvaluator
- serializeObjectFile
- PluginRegistry
- LinkResult
- Memory
- LinkResult
- IntrinsicHandler
- IREmissionPass
- CALLING_CONVENTION_DEFAULT
- ConstantEvaluator
- Simulator
- CPU
- wladxcodegen.js
- AnyParser
- PredParser
- FunctionPointerDeclaratorParser
- IOHandler
- WatchManager
- simulator.cpu.test.js
- LoadAddrInstruction
- preprocessor.test.js

## God Nodes (most connected - your core abstractions)
1. `Z80Codegen` - 50 edges
2. `Simulator` - 41 edges
3. `seq()` - 40 edges
4. `map()` - 39 edges
5. `lazy()` - 39 edges
6. `pred()` - 37 edges
7. `Lexer` - 35 edges
8. `CPU` - 34 edges
9. `many()` - 31 edges
10. `lit()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `atoi()` --calls--> `strtoi()`  [INFERRED]
  src/core/stdlib/atoi.c → src/core/stdlib/strtoi.c
- `buildExtendedTypeSpecifier()` --calls--> `buildStructTypeRef()`  [EXTRACTED]
  src/parser/function-pointers.js → src/parser/type-system.js
- `buildExtendedTypeSpecifier()` --calls--> `createTypeSpec()`  [EXTRACTED]
  src/parser/function-pointers.js → src/parser/type-system.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (93 total, 47 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.03
Nodes (33): AnnotatedDeclNode, AttributeNode, BinaryOpNode, CallNode, CaseClauseNode, CompoundNode, ControlFlowNode, DeclNode (+25 more)

### Community 1 - "Parser Combinators"
Cohesion: 0.12
Nodes (4): BasicBlock, FunctionIR, getFunctionCallingConvention(), ProgramIR

### Community 2 - "Parser Error Handling"
Cohesion: 0.18
Nodes (6): BinaryDisassembler, BinaryDisassembly, bytesToHex(), disassembleBinary(), disassembleBinaryFromFile(), resolveSymbolForAddress()

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.07
Nodes (20): AllocStackInstruction, BinaryOpInstruction, CallIndirectInstruction, CallInstruction, DerefLoadInstruction, DerefStoreInstruction, FreeStackInstruction, IndexedLoadInstruction (+12 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.07
Nodes (7): AttributeHandler, CodegenPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 6 - "AST to IR Translation"
Cohesion: 0.06
Nodes (7): globalRegistry, PluginRegistry, PeepholeOptimizer, CalleeAttributeHandler, CdeclAttributeHandler, FastcallAttributeHandler, NewSdccAttributeHandler

### Community 8 - "Z80 Code Generator"
Cohesion: 0.06
Nodes (7): Z80Codegen, IntrinsicHandler, IntrinsicMap, computeFieldOffsets(), computeStructSize(), TypeRegistry, compileToAssembly()

### Community 9 - "Lexer & C Parser"
Cohesion: 0.22
Nodes (6): buildSymbolMapFromSections(), formatDataSection(), formatInstruction(), formatSectionHeader(), ObjectFileDisassembly, SectionDisassembly

### Community 10 - "Plugin Registry"
Cohesion: 0.21
Nodes (9): disassemble(), disassembleToLines(), RegisterNames, Z80CBOpcodeTable, Z80DDOpcodeTable, Z80EDOpcodeTable, Z80FDOpcodeTable, Z80Instruction (+1 more)

### Community 11 - "Architecture Documentation"
Cohesion: 0.09
Nodes (25): AST to JSON, src/backend/z80codegen.js, src/compiler.js, End-to-End Pipeline, Extensibility Points, File Structure Rules, src/nanopass/ast_to_ir.js, src/nanopass/il.js (+17 more)

### Community 13 - "Package Configuration"
Cohesion: 0.07
Nodes (26): argparse, mocha, nyc, bin, vcc80, dependencies, argparse, description (+18 more)

### Community 14 - "Linker Core"
Cohesion: 0.13
Nodes (11): ResolvedSymbol, bytesToHex(), createLinkMapFromLinker(), LinkMap, MapRelocation, MapRelocationType, MapSection, MapSectionType (+3 more)

### Community 16 - "Archive (Static Lib)"
Cohesion: 0.18
Nodes (8): Archive, ArchiveMember, createArchive(), deserializeArchive(), isArchive(), loadArchive(), saveArchive(), serializeArchive()

### Community 18 - "Object File & Relocations"
Cohesion: 0.23
Nodes (10): getCrt0Size(), resolveCrt0Relocations(), link(), LinkerOptions, ObjectRelocation, ObjectSymbol, RelocationType, SectionType (+2 more)

### Community 20 - "Object File Format"
Cohesion: 0.20
Nodes (9): `CB`-prefixed instructions (bit operations), `ED`-prefixed instructions (extended), Flags effect legend, Implicit uses, Instruction set, `IX`/`IY`-indexed instructions (`0xDD`/`0xFD`), Registers, Unprefixed instructions (`0x00`–`0xFF`) (+1 more)

### Community 22 - "Compiler Options & Loading"
Cohesion: 0.47
Nodes (5): __dirname, __filename, main(), parseArgs(), processFile()

### Community 23 - "Binary Reader"
Cohesion: 0.14
Nodes (14): BinaryReader, decodeString(), deserializeObjectFile(), isObjectFile(), loadObjectFile(), RelocTypeMap, RelocTypeReverse, saveObjectFile() (+6 more)

### Community 24 - "Object Sections"
Cohesion: 0.32
Nodes (4): buildSymbolMap(), disassembleObjectFile(), disassembleSection(), ObjectFileDisassembler

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 28 - "DerefStoreInstruction"
Cohesion: 0.22
Nodes (3): AltParser, LazyParser, SeqParser

### Community 29 - "IR Instruction Base"
Cohesion: 0.09
Nodes (76): AddressOfNode, DerefNode, FunctionPointerCallNode, OffsetOfNode, SizeOfNode, TypeOfNode, alt(), any() (+68 more)

### Community 32 - "PluginRegistry"
Cohesion: 0.40
Nodes (4): New SDCC 4.2.0 Z80 function call ABI, z88dk/Old SDCC Z80 `callee` function call ABI, z88dk/Old SDCC Z80 `fastcall` function call ABI, z88dk/Old SDCC Z80 function call ABI

### Community 33 - "TypeSpecNode"
Cohesion: 0.17
Nodes (4): ASTNode, CastNode, FunctionNode, ParameterNode

### Community 38 - "EnumValueNode"
Cohesion: 0.29
Nodes (3): LexerError, ParserError, Keywords

### Community 40 - "GotoNode"
Cohesion: 0.50
Nodes (3): Context scale issues, Software design issues, Tooling issues

### Community 42 - "WlaDxCodegen"
Cohesion: 0.14
Nodes (3): createCrt0(), ObjectFile, ObjectSection

### Community 43 - "IndexedLoadInstruction"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 44 - "objectfile_loader.js"
Cohesion: 0.43
Nodes (3): compile(), parse(), translate()

### Community 45 - "Current Implementation Status"
Cohesion: 0.22
Nodes (7): ✅ Completed, 🧪 Test Results, 📔 Backlog (issues identified during implementation for later priorization), ✅ Completed, Current Implementation Status, 🔄 In Progress, 🔜 Next Steps

### Community 55 - "CaseClauseNode"
Cohesion: 0.15
Nodes (7): AstToIr, CPegParser, compile(), compile(), compile(), compileToAssembly(), parse()

### Community 65 - "serializeObjectFile"
Cohesion: 0.36
Nodes (3): BinaryWriter, encodeString(), serializeObjectFile()

## Knowledge Gaps
- **74 isolated node(s):** `🧪 Test Results`, `✅ Completed`, `✅ Completed`, `🔄 In Progress`, `🔜 Next Steps` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Z80Codegen` connect `Z80 Code Generator` to `AST Node Definitions`, `objectfile_loader.js`, `EnumValueNode`, `CaseClauseNode`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Linker` connect `WLA DX Codegen` to `Object File & Relocations`, `EnumValueNode`, `Linker Core`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `🧪 Test Results`, `✅ Completed`, `✅ Completed` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `Parser Combinators` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.0730804810360777 - nodes in this community are weakly interconnected._
- **Should `Plugin Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._