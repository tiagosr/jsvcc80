# Graph Report - .  (2026-07-23)

## Corpus Check
- Corpus is ~44,999 words - fits in a single context window. You may not need a graph.

## Summary
- 664 nodes · 1531 edges · 32 communities (19 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

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
- AST Node Base
- IR Instruction Base
- Link Result
- Resolved Symbol

## God Nodes (most connected - your core abstractions)
1. `CPegParser` - 37 edges
2. `AstToIr` - 36 edges
3. `Z80Codegen` - 32 edges
4. `locFromToken()` - 29 edges
5. `lazy()` - 28 edges
6. `pred()` - 25 edges
7. `Lexer` - 25 edges
8. `Compiler` - 21 edges
9. `PeepholeOptimizer` - 20 edges
10. `IrToObjectFile` - 19 edges

## Surprising Connections (you probably didn't know these)
- `serializeArchive()` --calls--> `serializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `deserializeArchive()` --calls--> `deserializeObjectFile()`  [EXTRACTED]
  src/linker/archive.js → src/linker/objectfile_loader.js
- `buildTypeSpecifier()` --calls--> `map()`  [EXTRACTED]
  src/parser/cparser.js → src/parser/combinators.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compilation Pipeline Stages** — agents_preprocessor_lexer, agents_parser_cparser, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_backend_z80codegen [INFERRED]
- **Core Modules Read Order** — agents_compiler_entry, agents_preprocessor_lexer, agents_parser_combinators, agents_parser_cparser, agents_nanopass_il, agents_nanopass_ast_to_ir, agents_nanopass_optimizations, agents_nanopass_register_passes, agents_backend_z80codegen [INFERRED]

## Communities (32 total, 13 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.05
Nodes (31): AnnotatedDeclNode, AttributeNode, BinaryOpNode, CallNode, CaseClauseNode, CompoundNode, ControlFlowNode, DeclNode (+23 more)

### Community 1 - "Parser Combinators"
Cohesion: 0.23
Nodes (8): lazy(), Parser, buildTypeSpecifier(), CPegParser, createTypeSpec(), kw(), locFromToken(), pred()

### Community 2 - "Parser Error Handling"
Cohesion: 0.07
Nodes (15): ParserError, AltParser, AnyParser, LazyParser, LitParser, LocationParser, ManyParser, map() (+7 more)

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.14
Nodes (15): AllocStackInstruction, BasicBlock, BinaryOpInstruction, CallInstruction, FreeStackInstruction, IntrinsicInstruction, JumpIfInstruction, JumpInstruction (+7 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 5 - "Core Error Types"
Cohesion: 0.08
Nodes (9): CodegenError, CompilerError, LexerError, SemanticError, makeLocation(), PositionTracker, PreprocessedSource, Keywords (+1 more)

### Community 7 - "CLI Entry & Compiler"
Cohesion: 0.12
Nodes (7): __dirname, __filename, main(), parseArgs(), processFile(), Compiler, PassManager

### Community 9 - "Lexer & C Parser"
Cohesion: 0.20
Nodes (5): IntrinsicMap, Lexer, compile(), compile(), compileToAssembly()

### Community 10 - "Plugin Registry"
Cohesion: 0.11
Nodes (3): globalRegistry, PluginRegistry, PeepholeOptimizer

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
Cohesion: 0.28
Nodes (6): ObjectRelocation, ObjectSymbol, RelocationType, SectionType, SymbolType, SymbolVisibility

### Community 20 - "Object File Format"
Cohesion: 0.20
Nodes (10): decodeString(), isObjectFile(), RelocTypeMap, RelocTypeReverse, SectionTypeMap, SectionTypeReverse, SymbolTypeMap, SymbolTypeReverse (+2 more)

### Community 21 - "Binary Writer"
Cohesion: 0.36
Nodes (3): BinaryWriter, encodeString(), serializeObjectFile()

### Community 22 - "Compiler Options & Loading"
Cohesion: 0.22
Nodes (4): CompilerOptions, LinkerOptions, loadObjectFile(), saveObjectFile()

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

## Knowledge Gaps
- **42 isolated node(s):** `__filename`, `__dirname`, `name`, `version`, `description` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AstToIr` connect `AST to IR Translation` to `Lexer & C Parser`, `Compiler Options & Loading`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `AST Node Definitions`, `Lexer & C Parser`, `Z80 Codegen & IR Base`, `Compiler Options & Loading`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `CPegParser` connect `Parser Combinators` to `AST Node Definitions`, `Lexer & C Parser`, `Parser Error Handling`, `Compiler Options & Loading`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `name` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.04519230769230769 - nodes in this community are weakly interconnected._
- **Should `Parser Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.06968641114982578 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.14366998577524892 - nodes in this community are weakly interconnected._