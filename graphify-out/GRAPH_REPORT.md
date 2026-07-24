# Graph Report - jsvcc80  (2026-07-24)

## Corpus Check
- 61 files · ~74,455 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 837 nodes · 1605 edges · 62 communities (28 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf75308f`
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
- IR Functions & Program
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
- ExprStmtNode
- GotoNode
- wladxcodegen.js
- WlaDxCodegen
- IndexedLoadInstruction
- IndexedStoreInstruction
- Current Implementation Status
- PreprocessedSource
- LabelNode
- AnyParser
- LocationParser
- MapParser
- OptParser
- PredParser
- SomeParser
- DerefLoadInstruction
- DerefStoreInstruction
- IndexedLoadInstruction
- IntrinsicInstruction
- LoadAddrInstruction

## God Nodes (most connected - your core abstractions)
1. `AstToIr` - 59 edges
2. `Lexer` - 54 edges
3. `Z80Codegen` - 38 edges
4. `PreprocessedSource` - 22 edges
5. `Compiler` - 22 edges
6. `PeepholeOptimizer` - 20 edges
7. `IrToObjectFile` - 18 edges
8. `WlaDxCodegen` - 18 edges
9. `BlockRegisterAllocator` - 18 edges
10. `deserializeObjectFile()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `buildExtendedTypeSpecifier()` --calls--> `buildStructTypeRef()`  [EXTRACTED]
  src/parser/function-pointers.js → src/parser/type-system.js
- `buildExtendedTypeSpecifier()` --calls--> `createTypeSpec()`  [EXTRACTED]
  src/parser/function-pointers.js → src/parser/type-system.js
- `buildRecursiveFuncPointerParam()` --calls--> `createFunctionPointerType()`  [EXTRACTED]
  src/parser/function-pointers.js → src/parser/type-system.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (62 total, 34 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.03
Nodes (39): AddressOfNode, AnnotatedDeclNode, AttributeNode, BinaryOpNode, CallNode, CaseClauseNode, CompoundNode, ControlFlowNode (+31 more)

### Community 2 - "Parser Error Handling"
Cohesion: 0.11
Nodes (13): computeFieldOffsets(), computeStructSize(), IntrinsicMap, CPegParser, buildStatement(), buildStatementList(), kw(), locFromToken() (+5 more)

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.11
Nodes (16): AllocStackInstruction, BasicBlock, BinaryOpInstruction, CallInstruction, FreeStackInstruction, IndexedStoreInstruction, Instruction, JumpIfInstruction (+8 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 7 - "CLI Entry & Compiler"
Cohesion: 0.09
Nodes (8): __dirname, __filename, main(), parseArgs(), processFile(), Compiler, CompilerOptions, PassManager

### Community 8 - "Z80 Code Generator"
Cohesion: 0.10
Nodes (4): Registers, Z80Codegen, compile(), compileToAssembly()

### Community 11 - "Architecture Documentation"
Cohesion: 0.09
Nodes (25): AST to JSON, src/backend/z80codegen.js, src/compiler.js, End-to-End Pipeline, Extensibility Points, File Structure Rules, src/nanopass/ast_to_ir.js, src/nanopass/il.js (+17 more)

### Community 13 - "Package Configuration"
Cohesion: 0.10
Nodes (20): argparse, bin, vcc80, dependencies, argparse, description, keywords, license (+12 more)

### Community 14 - "Linker Core"
Cohesion: 0.15
Nodes (3): link(), LinkedSection, Linker

### Community 16 - "Archive (Static Lib)"
Cohesion: 0.15
Nodes (8): Archive, ArchiveMember, createArchive(), deserializeArchive(), isArchive(), loadArchive(), saveArchive(), serializeArchive()

### Community 18 - "Object File & Relocations"
Cohesion: 0.14
Nodes (9): LinkerOptions, LinkResult, ResolvedSymbol, ObjectRelocation, ObjectSymbol, RelocationType, SectionType, SymbolType (+1 more)

### Community 19 - "IR Functions & Program"
Cohesion: 0.50
Nodes (3): Context scale issues, Software design issues, Tooling issues

### Community 20 - "Object File Format"
Cohesion: 0.18
Nodes (11): decodeString(), isObjectFile(), RelocTypeMap, RelocTypeReverse, saveObjectFile(), SectionTypeMap, SectionTypeReverse, SymbolTypeMap (+3 more)

### Community 21 - "Binary Writer"
Cohesion: 0.36
Nodes (3): BinaryWriter, encodeString(), serializeObjectFile()

### Community 22 - "Compiler Options & Loading"
Cohesion: 0.70
Nodes (4): buildBitwiseAndExpr(), buildBitwiseOrExpr(), buildBitwiseXorExpr(), locFromToken()

### Community 23 - "Binary Reader"
Cohesion: 0.33
Nodes (3): BinaryReader, deserializeObjectFile(), loadObjectFile()

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 28 - "DerefStoreInstruction"
Cohesion: 0.83
Nodes (3): buildLogicalAndExpr(), buildLogicalOrExpr(), locFromToken()

### Community 29 - "IR Instruction Base"
Cohesion: 0.14
Nodes (29): buildEnumDecl(), buildStructDecl(), buildTypedefDecl(), kw(), locFromToken(), arrayDimParser, basicFuncPointerPattern, buildExtendedTypeSpecifier() (+21 more)

### Community 30 - "Link Result"
Cohesion: 0.83
Nodes (3): buildPrimaryExpr(), kw(), locFromToken()

### Community 33 - "TypeSpecNode"
Cohesion: 0.22
Nodes (3): ASTNode, FunctionNode, ParameterNode

### Community 34 - "CompoundNode"
Cohesion: 0.83
Nodes (3): buildEqualityExpr(), buildRelationalExpr(), locFromToken()

### Community 36 - "LoadAddrInstruction"
Cohesion: 0.22
Nodes (3): AltParser, LazyParser, SeqParser

### Community 45 - "Current Implementation Status"
Cohesion: 0.29
Nodes (6): 📔 Backlog (issues identified during implementation for later priorization), ✅ Completed, Current Implementation Status, 🔄 In Progress, 🔜 Next Steps, 🧪 Test Results

### Community 47 - "PreprocessedSource"
Cohesion: 0.11
Nodes (3): PreprocessedSource, Keywords, TokenType

## Knowledge Gaps
- **51 isolated node(s):** `🧪 Test Results`, `🔄 In Progress`, `🔜 Next Steps`, `📔 Backlog (issues identified during implementation for later priorization)`, `IntrinsicMap` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AstToIr` connect `AST to IR Translation` to `Z80 Code Generator`, `Parser Error Handling`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `Lexer` connect `Lexer & C Parser` to `AST Node Definitions`, `Parser Error Handling`, `PreprocessedSource`, `CLI Entry & Compiler`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `AST Node Definitions`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `🧪 Test Results`, `🔄 In Progress`, `🔜 Next Steps` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.033793711431090216 - nodes in this community are weakly interconnected._
- **Should `Parser Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.11491935483870967 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.11219512195121951 - nodes in this community are weakly interconnected._