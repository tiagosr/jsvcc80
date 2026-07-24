# Graph Report - jsvcc80  (2026-07-24)

## Corpus Check
- 43 files · ~71,416 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 791 nodes · 1780 edges · 60 communities (21 shown, 39 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51cd6964`
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

## God Nodes (most connected - your core abstractions)
1. `Lexer` - 54 edges
2. `AstToIr` - 53 edges
3. `Z80Codegen` - 38 edges
4. `seq()` - 34 edges
5. `map()` - 33 edges
6. `locFromToken()` - 32 edges
7. `lazy()` - 30 edges
8. `pred()` - 27 edges
9. `many()` - 24 edges
10. `PreprocessedSource` - 22 edges

## Surprising Connections (you probably didn't know these)
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `buildAdditiveExpr()` --calls--> `map()`  [EXTRACTED]
  src/parser/cparser.js → src/parser/combinators.js
- `buildAssignmentExpr()` --calls--> `map()`  [EXTRACTED]
  src/parser/cparser.js → src/parser/combinators.js
- `buildBitwiseAndExpr()` --calls--> `map()`  [EXTRACTED]
  src/parser/cparser.js → src/parser/combinators.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (60 total, 39 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.08
Nodes (15): CallNode, CompoundNode, EnumValueNode, GotoNode, JumpNode, PragmacNode, ReturnNode, Registers (+7 more)

### Community 1 - "Parser Combinators"
Cohesion: 0.18
Nodes (51): alt(), any(), lazy(), lit(), LocationParser, many(), map(), MapParser (+43 more)

### Community 2 - "Parser Error Handling"
Cohesion: 0.25
Nodes (3): DerefNode, ExprStmtNode, InlineAsmNode

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.07
Nodes (21): AllocStackInstruction, BasicBlock, BinaryOpInstruction, CallInstruction, DerefLoadInstruction, DerefStoreInstruction, FreeStackInstruction, IndexedLoadInstruction (+13 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

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

### Community 26 - "Symbol Table"
Cohesion: 0.05
Nodes (10): AltParser, AnyParser, LazyParser, LitParser, ManyParser, OptParser, Parser, PredParser (+2 more)

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 33 - "TypeSpecNode"
Cohesion: 0.22
Nodes (3): ASTNode, FunctionNode, ParameterNode

### Community 45 - "Current Implementation Status"
Cohesion: 0.29
Nodes (6): 📔 Backlog (issues identified during implementation for later priorization), ✅ Completed, Current Implementation Status, 🔄 In Progress, 🔜 Next Steps, 🧪 Test Results

## Knowledge Gaps
- **49 isolated node(s):** `Software design issues`, `Context scale issues`, `Tooling issues`, `🧪 Test Results`, `🔄 In Progress` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lexer` connect `Lexer & C Parser` to `AST Node Definitions`, `CLI Entry & Compiler`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `AstToIr` connect `AST to IR Translation` to `Lexer & C Parser`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `AST Node Definitions`, `AST to IR Translation`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `Software design issues`, `Context scale issues`, `Tooling issues` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.07661290322580645 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.07346938775510205 - nodes in this community are weakly interconnected._
- **Should `Plugin Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._