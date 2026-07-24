# Graph Report - jsvcc80  (2026-07-24)

## Corpus Check
- 60 files · ~72,864 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 831 nodes · 1674 edges · 83 communities (21 shown, 62 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a75e57f0`
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
- LiteralNode
- MemberNode
- OffsetOfNode
- PointerMemberNode
- PreprocNode
- SizeOfNode
- StructFieldNode
- StructNode
- SwitchNode
- TypeOfNode
- UnaryOpNode
- BasicBlock
- Instruction
- AnyParser
- LocationParser
- MapParser
- OptParser
- PredParser
- SomeParser
- CallNode
- CompoundNode
- DerefNode
- ExprStmtNode
- GotoNode
- InlineAsmNode
- JumpNode
- PragmacNode
- ReturnNode
- DerefLoadInstruction
- DerefStoreInstruction
- IndexedLoadInstruction
- IndexedStoreInstruction
- IntrinsicInstruction
- LoadAddrInstruction

## God Nodes (most connected - your core abstractions)
1. `Lexer` - 54 edges
2. `AstToIr` - 53 edges
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

## Communities (83 total, 62 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.17
Nodes (7): Registers, CodegenError, CompilerError, LexerError, ParserError, SemanticError, makeLocation()

### Community 2 - "Parser Error Handling"
Cohesion: 0.14
Nodes (6): AddressOfNode, BinaryOpNode, CaseClauseNode, ControlFlowNode, EnumValueNode, UnaryOpNode

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.15
Nodes (13): AllocStackInstruction, BinaryOpInstruction, CallInstruction, FreeStackInstruction, JumpIfInstruction, JumpInstruction, LabelInstruction, LoadInstruction (+5 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.08
Nodes (6): AttributeHandler, CodegenPass, OptimizationPass, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 6 - "AST to IR Translation"
Cohesion: 0.09
Nodes (10): AstToIr, computeFieldOffsets(), computeStructSize(), IntrinsicMap, compile(), compileToAssembly(), compile(), parse() (+2 more)

### Community 7 - "CLI Entry & Compiler"
Cohesion: 0.09
Nodes (8): __dirname, __filename, main(), parseArgs(), processFile(), Compiler, CompilerOptions, PassManager

### Community 9 - "Lexer & C Parser"
Cohesion: 0.10
Nodes (4): Lexer, Keywords, TokenType, compile()

### Community 11 - "Architecture Documentation"
Cohesion: 0.09
Nodes (25): AST to JSON, src/backend/z80codegen.js, src/compiler.js, End-to-End Pipeline, Extensibility Points, File Structure Rules, src/nanopass/ast_to_ir.js, src/nanopass/il.js (+17 more)

### Community 13 - "Package Configuration"
Cohesion: 0.10
Nodes (20): argparse, bin, vcc80, dependencies, argparse, description, keywords, license (+12 more)

### Community 16 - "Archive (Static Lib)"
Cohesion: 0.15
Nodes (8): Archive, ArchiveMember, createArchive(), deserializeArchive(), isArchive(), loadArchive(), saveArchive(), serializeArchive()

### Community 18 - "Object File & Relocations"
Cohesion: 0.21
Nodes (10): link(), LinkerOptions, ObjectRelocation, ObjectSymbol, RelocationType, SectionType, SymbolType, SymbolVisibility (+2 more)

### Community 19 - "IR Functions & Program"
Cohesion: 0.50
Nodes (3): Context scale issues, Software design issues, Tooling issues

### Community 20 - "Object File Format"
Cohesion: 0.20
Nodes (10): decodeString(), isObjectFile(), RelocTypeMap, RelocTypeReverse, SectionTypeMap, SectionTypeReverse, SymbolTypeMap, SymbolTypeReverse (+2 more)

### Community 21 - "Binary Writer"
Cohesion: 0.32
Nodes (4): BinaryWriter, encodeString(), saveObjectFile(), serializeObjectFile()

### Community 23 - "Binary Reader"
Cohesion: 0.33
Nodes (3): BinaryReader, deserializeObjectFile(), loadObjectFile()

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 29 - "IR Instruction Base"
Cohesion: 0.06
Nodes (61): CPegParser, buildEnumDecl(), buildStructDecl(), buildTypedefDecl(), kw(), locFromToken(), buildAdditiveExpr(), locFromToken() (+53 more)

### Community 33 - "TypeSpecNode"
Cohesion: 0.22
Nodes (3): ASTNode, FunctionNode, ParameterNode

### Community 36 - "LoadAddrInstruction"
Cohesion: 0.22
Nodes (3): AltParser, LazyParser, SeqParser

### Community 45 - "Current Implementation Status"
Cohesion: 0.29
Nodes (6): 📔 Backlog (issues identified during implementation for later priorization), ✅ Completed, Current Implementation Status, 🔄 In Progress, 🔜 Next Steps, 🧪 Test Results

## Knowledge Gaps
- **51 isolated node(s):** `basicFuncPointerPattern`, `arrayDimParser`, `TypeInfos`, `Software design issues`, `Context scale issues` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lexer` connect `Lexer & C Parser` to `AST Node Definitions`, `CLI Entry & Compiler`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `AstToIr` connect `AST to IR Translation` to `Lexer & C Parser`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `AST Node Definitions`, `AST to IR Translation`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `basicFuncPointerPattern`, `arrayDimParser`, `TypeInfos` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Parser Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.1471264367816092 - nodes in this community are weakly interconnected._
- **Should `Plugin Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._