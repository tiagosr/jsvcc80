# Graph Report - jsvcc80  (2026-07-25)

## Corpus Check
- 89 files · ~92,296 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1020 nodes · 1737 edges · 83 communities (40 shown, 43 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `695882d0`
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
- IndexedStoreInstruction
- Current Implementation Status
- IndexedLoadInstruction
- PreprocessedSource
- LabelNode
- function-pointers.js
- IntrinsicInstruction
- LoadAddrInstruction
- BinaryOpNode
- CaseClauseNode
- CompoundNode
- DerefNode
- EnumNode
- ExprStmtNode
- IndexNode
- JumpNode
- AnyParser
- LocationParser
- MapParser
- OptParser
- PredParser
- SomeParser
- ReturnNode
- StructFieldNode
- Simulator
- CPU
- Lexer
- MacroExpander
- IOHandler
- WatchManager
- DerefStoreInstruction

## God Nodes (most connected - your core abstractions)
1. `Z80Codegen` - 40 edges
2. `Simulator` - 34 edges
3. `CPU` - 33 edges
4. `LexerCore` - 24 edges
5. `PreprocessedSource` - 23 edges
6. `Compiler` - 22 edges
7. `PeepholeOptimizer` - 20 edges
8. `BlockRegisterAllocator` - 19 edges
9. `IrToObjectFile` - 18 edges
10. `Memory` - 17 edges

## Surprising Connections (you probably didn't know these)
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `buildForStmt()` --calls--> `mergeDeclaratorType()`  [EXTRACTED]
  src/parser/stmt-control.js → src/parser/type-system.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (83 total, 43 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.05
Nodes (21): AnnotatedDeclNode, CaseClauseNode, DeclNode, DerefNode, EnumNode, EnumValueNode, ExprStmtNode, FunctionPointerCallNode (+13 more)

### Community 1 - "Parser Combinators"
Cohesion: 0.05
Nodes (19): AltParser, any(), AnyParser, LazyParser, lit(), LitParser, LocationParser, many() (+11 more)

### Community 2 - "Parser Error Handling"
Cohesion: 0.22
Nodes (10): buildPostfixExpr(), locFromToken(), buildPrimaryExpr(), kw(), locFromToken(), buildUnaryExpr(), buildStatement(), buildStatementList() (+2 more)

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.14
Nodes (11): AllocStackInstruction, BinaryOpInstruction, CallIndirectInstruction, CallInstruction, JumpIfInstruction, JumpInstruction, LabelInstruction, LoadInstruction (+3 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 6 - "AST to IR Translation"
Cohesion: 0.20
Nodes (3): IntrinsicHandler, IntrinsicMap, TranslationState

### Community 7 - "CLI Entry & Compiler"
Cohesion: 0.10
Nodes (3): Compiler, CompilerOptions, PassManager

### Community 8 - "Z80 Code Generator"
Cohesion: 0.09
Nodes (6): Registers, Z80Codegen, compile(), compile(), compileToAssembly(), toIr()

### Community 11 - "Architecture Documentation"
Cohesion: 0.09
Nodes (25): AST to JSON, src/backend/z80codegen.js, src/compiler.js, End-to-End Pipeline, Extensibility Points, File Structure Rules, src/nanopass/ast_to_ir.js, src/nanopass/il.js (+17 more)

### Community 13 - "Package Configuration"
Cohesion: 0.10
Nodes (20): argparse, bin, vcc80, dependencies, argparse, description, keywords, license (+12 more)

### Community 16 - "Archive (Static Lib)"
Cohesion: 0.18
Nodes (8): Archive, ArchiveMember, createArchive(), deserializeArchive(), isArchive(), loadArchive(), saveArchive(), serializeArchive()

### Community 18 - "Object File & Relocations"
Cohesion: 0.25
Nodes (10): getCrt0Size(), resolveCrt0Relocations(), link(), LinkerOptions, ObjectRelocation, ObjectSymbol, RelocationType, SectionType (+2 more)

### Community 20 - "Object File Format"
Cohesion: 0.20
Nodes (10): decodeString(), isObjectFile(), RelocTypeMap, RelocTypeReverse, SectionTypeMap, SectionTypeReverse, SymbolTypeMap, SymbolTypeReverse (+2 more)

### Community 21 - "Binary Writer"
Cohesion: 0.32
Nodes (4): BinaryWriter, encodeString(), saveObjectFile(), serializeObjectFile()

### Community 22 - "Compiler Options & Loading"
Cohesion: 0.70
Nodes (4): buildBitwiseAndExpr(), buildBitwiseOrExpr(), buildBitwiseXorExpr(), locFromToken()

### Community 23 - "Binary Reader"
Cohesion: 0.33
Nodes (3): BinaryReader, deserializeObjectFile(), loadObjectFile()

### Community 24 - "Object Sections"
Cohesion: 0.47
Nodes (5): __dirname, __filename, main(), parseArgs(), processFile()

### Community 25 - "Object File Container"
Cohesion: 0.15
Nodes (3): createCrt0(), ObjectFile, ObjectSection

### Community 26 - "Symbol Table"
Cohesion: 0.08
Nodes (3): ConstantEvaluator, LexerCore, PreprocessedSource

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 28 - "DerefStoreInstruction"
Cohesion: 0.83
Nodes (3): buildLogicalAndExpr(), buildLogicalOrExpr(), locFromToken()

### Community 29 - "IR Instruction Base"
Cohesion: 0.18
Nodes (20): buildEnumDecl(), buildStructDecl(), buildTypedefDecl(), kw(), locFromToken(), buildBreakContinueStmt(), buildDoWhileStmt(), buildForStmt() (+12 more)

### Community 33 - "TypeSpecNode"
Cohesion: 0.17
Nodes (4): ASTNode, CastNode, FunctionNode, ParameterNode

### Community 34 - "CompoundNode"
Cohesion: 0.83
Nodes (3): buildEqualityExpr(), buildRelationalExpr(), locFromToken()

### Community 38 - "EnumValueNode"
Cohesion: 0.16
Nodes (8): CodegenError, CompilerError, LexerError, ParserError, SemanticError, makeLocation(), Keywords, TokenType

### Community 39 - "DerefLoadInstruction"
Cohesion: 0.11
Nodes (9): DerefLoadInstruction, DerefStoreInstruction, FreeStackInstruction, IndexedLoadInstruction, IndexedStoreInstruction, IntrinsicInstruction, LoadAddrInstruction, PushInstruction (+1 more)

### Community 42 - "WlaDxCodegen"
Cohesion: 0.22
Nodes (3): WlaDxCodegen, WlaDxSectionType, Z80Opcodes

### Community 45 - "Current Implementation Status"
Cohesion: 0.18
Nodes (9): Context scale issues, Software design issues, Tooling issues, 📔 Backlog (issues identified during implementation for later priorization), ✅ Completed, Current Implementation Status, 🔄 In Progress, 🔜 Next Steps (+1 more)

### Community 51 - "function-pointers.js"
Cohesion: 0.29
Nodes (9): arrayDimParser, basicFuncPointerPattern, buildExtendedTypeSpecifier(), buildFunctionPointerDeclarator(), buildParamList(), buildRecursiveFuncPointerParam(), FunctionPointerDeclaratorParser, kw() (+1 more)

### Community 53 - "LoadAddrInstruction"
Cohesion: 1.00
Nodes (3): compile(), parse(), translate()

### Community 60 - "IndexNode"
Cohesion: 0.32
Nodes (3): computeFieldOffsets(), computeStructSize(), TypeRegistry

### Community 81 - "Simulator"
Cohesion: 0.06
Nodes (3): Flags, Memory, Simulator

## Knowledge Gaps
- **51 isolated node(s):** `Software design issues`, `Context scale issues`, `Tooling issues`, `✅ Completed`, `🔄 In Progress` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ObjectFile` connect `Object File Container` to `Archive (Static Lib)`, `Object File & Relocations`, `Object File Format`, `CLI Entry & Compiler`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `EnumValueNode`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `Software design issues`, `Context scale issues`, `Tooling issues` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `Parser Combinators` be split into smaller, more focused modules?**
  _Cohesion score 0.04846938775510204 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Should `Plugin Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._