# Graph Report - jsvcc80  (2026-07-31)

## Corpus Check
- 165 files · ~175,926 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1381 nodes · 2601 edges · 123 communities (65 shown, 58 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82f16f8d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AST Node Definitions
- Parser Combinators
- Parser Error Handling
- Z80 Codegen & IR Base
- Plugin Interfaces
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
- stmt-local.js
- ControlFlowNode
- LoadAddrInstruction
- EnumNode
- MacroExpander
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
- FINDINGS.md
- BinaryOpNode
- CaseClauseNode
- CompoundNode
- compiler.js
- Instruction
- AnyParser
- ConstantEvaluator
- serializeObjectFile
- LinkResult
- LinkResult
- Memory
- PredParser
- ResolvedSymbol
- IntrinsicHandler
- bitfields.test.js
- Simulator
- CPU
- StringLiteralCollector
- ConstantEvaluator
- CALLING_CONVENTION_DEFAULT
- IOHandler
- WatchManager
- simulator.cpu.test.js
- PositionTracker
- expr-assign.js
- expr-postfix.js
- AddressOfNode
- LinkResult
- ManyParser
- PreprocNode
- SizeOfNode
- StructNode
- PreprocessedSource
- CallNode
- cparser.js
- CompoundNode
- ControlFlowNode
- DerefNode
- TypeRegistry
- function-pointers.js
- IdentifierNode
- pointers.test.js
- JumpNode
- ConstantEvaluator
- embed.test.js
- SwitchNode
- ReturnNode

## God Nodes (most connected - your core abstractions)
1. `Z80Codegen` - 50 edges
2. `Simulator` - 48 edges
3. `Lexer` - 35 edges
4. `CPU` - 33 edges
5. `map()` - 28 edges
6. `seq()` - 28 edges
7. `lazy()` - 26 edges
8. `LexerCore` - 24 edges
9. `BlockRegisterAllocator` - 24 edges
10. `PreprocessedSource` - 24 edges

## Surprising Connections (you probably didn't know these)
- `buildForStmt()` --calls--> `mergeDeclaratorType()`  [EXTRACTED]
  src/parser/stmt-control.js → src/parser/type-system.js
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `atoi()` --calls--> `strtoi()`  [INFERRED]
  src/core/stdlib/atoi.c → src/core/stdlib/strtoi.c
- `buildAdditiveExpr()` --calls--> `map()`  [EXTRACTED]
  src/parser/expr-add.js → src/parser/combinators.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (123 total, 58 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.05
Nodes (19): AnnotatedDeclNode, CaseClauseNode, DerefNode, EnumNode, EnumValueNode, ExprStmtNode, FunctionPointerCallNode, GotoNode (+11 more)

### Community 1 - "Parser Combinators"
Cohesion: 0.12
Nodes (4): BasicBlock, FunctionIR, getFunctionCallingConvention(), ProgramIR

### Community 2 - "Parser Error Handling"
Cohesion: 0.18
Nodes (6): BinaryDisassembler, BinaryDisassembly, bytesToHex(), disassembleBinary(), disassembleBinaryFromFile(), resolveSymbolForAddress()

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.12
Nodes (12): AllocStackInstruction, BinaryOpInstruction, CallInstruction, JumpIfInstruction, JumpInstruction, LabelInstruction, LoadInstruction, PopInstruction (+4 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 8 - "Z80 Code Generator"
Cohesion: 0.07
Nodes (6): Z80Codegen, computeFieldOffsets(), computeStructSize(), TypeRegistry, compile(), compileToAssembly()

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
Cohesion: 0.14
Nodes (10): bytesToHex(), createLinkMapFromLinker(), LinkMap, MapRelocation, MapRelocationType, MapSection, MapSectionType, MapSymbol (+2 more)

### Community 16 - "Archive (Static Lib)"
Cohesion: 0.18
Nodes (8): Archive, ArchiveMember, createArchive(), deserializeArchive(), isArchive(), loadArchive(), saveArchive(), serializeArchive()

### Community 18 - "Object File & Relocations"
Cohesion: 0.20
Nodes (12): getCrt0Size(), resolveCrt0Relocations(), link(), LinkerOptions, ObjectRelocation, ObjectSymbol, RelocationType, SectionType (+4 more)

### Community 19 - "BinaryOpNode"
Cohesion: 0.83
Nodes (3): buildPrimaryExpr(), kw(), locFromToken()

### Community 20 - "Object File Format"
Cohesion: 0.20
Nodes (9): `CB`-prefixed instructions (bit operations), `ED`-prefixed instructions (extended), Flags effect legend, Implicit uses, Instruction set, `IX`/`IY`-indexed instructions (`0xDD`/`0xFD`), Registers, Unprefixed instructions (`0x00`–`0xFF`) (+1 more)

### Community 22 - "Compiler Options & Loading"
Cohesion: 0.17
Nodes (15): buildSymbolMap(), formatCodeSection(), formatDataSection(), formatHex(), formatHex2(), formatRelocationTable(), formatRelocationTableFromView(), formatSectionHeaders() (+7 more)

### Community 23 - "Binary Reader"
Cohesion: 0.15
Nodes (13): BinaryReader, decodeString(), deserializeObjectFile(), isObjectFile(), loadObjectFile(), RelocTypeMap, RelocTypeReverse, SectionTypeMap (+5 more)

### Community 24 - "Object Sections"
Cohesion: 0.32
Nodes (4): buildSymbolMap(), disassembleObjectFile(), disassembleSection(), ObjectFileDisassembler

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 28 - "DerefStoreInstruction"
Cohesion: 0.10
Nodes (3): Compiler, CompilerOptions, PassManager

### Community 29 - "IR Instruction Base"
Cohesion: 0.12
Nodes (42): alt(), AltParser, any(), lazy(), LazyParser, lit(), LocationParser, many() (+34 more)

### Community 31 - "Resolved Symbol"
Cohesion: 0.47
Nodes (5): __dirname, __filename, main(), parseArgs(), processFile()

### Community 32 - "PluginRegistry"
Cohesion: 0.40
Nodes (4): New SDCC 4.2.0 Z80 function call ABI, z88dk/Old SDCC Z80 `callee` function call ABI, z88dk/Old SDCC Z80 `fastcall` function call ABI, z88dk/Old SDCC Z80 function call ABI

### Community 33 - "TypeSpecNode"
Cohesion: 0.17
Nodes (4): ASTNode, CastNode, FunctionNode, ParameterNode

### Community 34 - "stmt-local.js"
Cohesion: 0.60
Nodes (3): buildStatement(), kw(), locFromToken()

### Community 40 - "GotoNode"
Cohesion: 0.08
Nodes (11): CodegenError, CompilerError, LexerError, ParserError, SemanticError, AnyParser, LitParser, ManyParser (+3 more)

### Community 42 - "WlaDxCodegen"
Cohesion: 0.15
Nodes (3): createCrt0(), ObjectFile, ObjectSection

### Community 43 - "IndexedLoadInstruction"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 44 - "objectfile_loader.js"
Cohesion: 0.09
Nodes (6): globalRegistry, PluginRegistry, CalleeAttributeHandler, CdeclAttributeHandler, FastcallAttributeHandler, NewSdccAttributeHandler

### Community 45 - "Current Implementation Status"
Cohesion: 0.22
Nodes (7): ✅ Completed, 🧪 Test Results, 📔 Backlog (issues identified during implementation for later priorization), ✅ Completed, Current Implementation Status, 🔄 In Progress, 🔜 Next Steps

### Community 53 - "FINDINGS.md"
Cohesion: 0.40
Nodes (4): Context scale issues, Philosophical findings, Software design issues, Tooling issues

### Community 62 - "AnyParser"
Cohesion: 0.17
Nodes (7): Registers, AstToIr, compile(), compileToAssembly(), compile(), parse(), translate()

### Community 65 - "serializeObjectFile"
Cohesion: 0.32
Nodes (4): BinaryWriter, encodeString(), saveObjectFile(), serializeObjectFile()

### Community 70 - "ResolvedSymbol"
Cohesion: 0.73
Nodes (5): buildEnumDecl(), buildStructDecl(), buildTypedefDecl(), kw(), locFromToken()

### Community 81 - "Simulator"
Cohesion: 0.06
Nodes (3): BreakpointManager, CallTracker, Simulator

### Community 102 - "ManyParser"
Cohesion: 0.08
Nodes (9): CallIndirectInstruction, DerefLoadInstruction, DerefStoreInstruction, FreeStackInstruction, IndexedLoadInstruction, IndexedStoreInstruction, Instruction, IntrinsicInstruction (+1 more)

### Community 110 - "cparser.js"
Cohesion: 0.19
Nodes (10): CPegParser, buildStructTypeRef(), buildTypeSpecifier(), createFunctionPointerType(), createTypeSpec(), kw(), locFromToken(), mergeDeclaratorType() (+2 more)

### Community 115 - "function-pointers.js"
Cohesion: 0.29
Nodes (9): arrayDimParser, basicFuncPointerPattern, buildExtendedTypeSpecifier(), buildFunctionPointerDeclarator(), buildParamList(), buildRecursiveFuncPointerParam(), FunctionPointerDeclaratorParser, kw() (+1 more)

## Knowledge Gaps
- **78 isolated node(s):** `TypeInfos`, `🧪 Test Results`, `✅ Completed`, `basicFuncPointerPattern`, `arrayDimParser` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Z80Codegen` connect `Z80 Code Generator` to `GotoNode`, `cparser.js`, `AnyParser`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `BlockRegisterAllocator` connect `Register Allocator` to `CompoundNode`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `DirectiveHandler` connect `IR to Object File` to `CaseClauseNode`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `TypeInfos`, `🧪 Test Results`, `✅ Completed` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Parser Combinators` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.11965811965811966 - nodes in this community are weakly interconnected._