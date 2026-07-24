# Graph Report - jsvcc80  (2026-07-23)

## Corpus Check
- 39 files · ~62,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 742 nodes · 1508 edges · 44 communities (19 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c70a4e9`
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
- IndexedLoadInstruction
- IndexedStoreInstruction
- PreprocessedSource

## God Nodes (most connected - your core abstractions)
1. `AstToIr` - 51 edges
2. `CPegParser` - 39 edges
3. `Lexer` - 38 edges
4. `Z80Codegen` - 36 edges
5. `locFromToken()` - 30 edges
6. `pred()` - 25 edges
7. `Compiler` - 22 edges
8. `PreprocessedSource` - 20 edges
9. `PeepholeOptimizer` - 20 edges
10. `IrToObjectFile` - 18 edges

## Surprising Connections (you probably didn't know these)
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (44 total, 25 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.04
Nodes (39): AddressOfNode, AnnotatedDeclNode, ASTNode, AttributeNode, BinaryOpNode, CallNode, CaseClauseNode, CompoundNode (+31 more)

### Community 1 - "Parser Combinators"
Cohesion: 0.13
Nodes (12): buildStructTypeRef(), buildTypeSpecifier(), CPegParser, createTypeSpec(), kw(), locFromToken(), mergeDeclaratorType(), pred() (+4 more)

### Community 2 - "Parser Error Handling"
Cohesion: 0.20
Nodes (3): LocationParser, MapParser, withLocation()

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.12
Nodes (15): AllocStackInstruction, BasicBlock, BinaryOpInstruction, CallInstruction, FreeStackInstruction, Instruction, JumpIfInstruction, JumpInstruction (+7 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 6 - "AST to IR Translation"
Cohesion: 0.11
Nodes (6): AstToIr, computeFieldOffsets(), computeStructSize(), IntrinsicMap, compile(), toIr()

### Community 7 - "CLI Entry & Compiler"
Cohesion: 0.09
Nodes (8): __dirname, __filename, main(), parseArgs(), processFile(), Compiler, CompilerOptions, PassManager

### Community 11 - "Architecture Documentation"
Cohesion: 0.09
Nodes (25): AST to JSON, src/backend/z80codegen.js, src/compiler.js, End-to-End Pipeline, Extensibility Points, File Structure Rules, src/nanopass/ast_to_ir.js, src/nanopass/il.js (+17 more)

### Community 13 - "Package Configuration"
Cohesion: 0.10
Nodes (20): argparse, bin, vcc80, dependencies, argparse, description, keywords, license (+12 more)

### Community 14 - "Linker Core"
Cohesion: 0.15
Nodes (3): link(), LinkedSection, Linker

### Community 15 - "WLA DX Codegen"
Cohesion: 0.22
Nodes (3): WlaDxCodegen, WlaDxSectionType, Z80Opcodes

### Community 16 - "Archive (Static Lib)"
Cohesion: 0.15
Nodes (8): Archive, ArchiveMember, createArchive(), deserializeArchive(), isArchive(), loadArchive(), saveArchive(), serializeArchive()

### Community 18 - "Object File & Relocations"
Cohesion: 0.14
Nodes (9): LinkerOptions, LinkResult, ResolvedSymbol, ObjectRelocation, ObjectSymbol, RelocationType, SectionType, SymbolType (+1 more)

### Community 19 - "IR Functions & Program"
Cohesion: 0.17
Nodes (5): CodegenError, CompilerError, LexerError, ParserError, SemanticError

### Community 20 - "Object File Format"
Cohesion: 0.18
Nodes (11): decodeString(), isObjectFile(), RelocTypeMap, RelocTypeReverse, saveObjectFile(), SectionTypeMap, SectionTypeReverse, SymbolTypeMap (+3 more)

### Community 21 - "Binary Writer"
Cohesion: 0.36
Nodes (3): BinaryWriter, encodeString(), serializeObjectFile()

### Community 23 - "Binary Reader"
Cohesion: 0.33
Nodes (3): BinaryReader, deserializeObjectFile(), loadObjectFile()

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

### Community 29 - "IR Instruction Base"
Cohesion: 0.22
Nodes (3): AltParser, LazyParser, SeqParser

## Knowledge Gaps
- **42 isolated node(s):** `__filename`, `__dirname`, `IntrinsicMap`, `TypeInfos`, `name` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AstToIr` connect `AST to IR Translation` to `Parser Combinators`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `Lexer` connect `Lexer & C Parser` to `AST Node Definitions`, `Parser Combinators`, `PreprocessedSource`, `CLI Entry & Compiler`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `AST Node Definitions`, `AST to IR Translation`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `IntrinsicMap` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.035493827160493825 - nodes in this community are weakly interconnected._
- **Should `Parser Combinators` be split into smaller, more focused modules?**
  _Cohesion score 0.12784313725490196 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.1214574898785425 - nodes in this community are weakly interconnected._