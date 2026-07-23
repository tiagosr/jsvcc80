# Graph Report - jsvcc80  (2026-07-23)

## Corpus Check
- 38 files · ~53,056 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 716 nodes · 1529 edges · 58 communities (21 shown, 37 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `16e7b318`
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
- AST Node Base
- IR Instruction Base
- Link Result
- Resolved Symbol
- PluginRegistry
- TypeSpecNode
- CompoundNode
- ControlFlowNode
- DeclNode
- EnumNode
- EnumValueNode
- ExprStmtNode
- GotoNode
- IdentifierNode
- InlineAsmNode
- LabelNode
- ParameterNode
- PragmacNode
- StructNode
- IndexNode
- JumpNode
- MemberNode
- PointerMemberNode
- PreprocNode
- ReturnNode
- SizeOfNode
- StructFieldNode
- SwitchNode
- TypeOfNode
- UnaryOpNode

## God Nodes (most connected - your core abstractions)
1. `AstToIr` - 51 edges
2. `CPegParser` - 40 edges
3. `Z80Codegen` - 38 edges
4. `locFromToken()` - 30 edges
5. `Lexer` - 26 edges
6. `pred()` - 25 edges
7. `Compiler` - 21 edges
8. `PeepholeOptimizer` - 20 edges
9. `IrToObjectFile` - 19 edges
10. `WlaDxCodegen` - 18 edges

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

## Communities (58 total, 37 thin omitted)

### Community 0 - "AST Node Definitions"
Cohesion: 0.13
Nodes (7): AddressOfNode, AnnotatedDeclNode, BinaryOpNode, IdentifierNode, LiteralNode, OffsetOfNode, PragmacNode

### Community 1 - "Parser Combinators"
Cohesion: 0.20
Nodes (6): buildStructTypeRef(), CPegParser, kw(), locFromToken(), mergeDeclaratorType(), pred()

### Community 2 - "Parser Error Handling"
Cohesion: 0.05
Nodes (13): AltParser, AnyParser, LazyParser, LitParser, LocationParser, ManyParser, MapParser, OptParser (+5 more)

### Community 3 - "Z80 Codegen & IR Base"
Cohesion: 0.05
Nodes (31): Registers, CodegenError, CompilerError, LexerError, ParserError, SemanticError, makeLocation(), AllocStackInstruction (+23 more)

### Community 4 - "Plugin Interfaces"
Cohesion: 0.06
Nodes (8): AttributeHandler, CodegenPass, IREmissionPass, OptimizationPass, ParserExtension, PluginLoader, PreprocessorExtension, SemanticsPass

### Community 5 - "Core Error Types"
Cohesion: 0.33
Nodes (4): buildTypeSpecifier(), createTypeSpec(), TypeInfos, toIr()

### Community 6 - "AST to IR Translation"
Cohesion: 0.13
Nodes (4): AstToIr, computeFieldOffsets(), computeStructSize(), IntrinsicMap

### Community 7 - "CLI Entry & Compiler"
Cohesion: 0.12
Nodes (7): __dirname, __filename, main(), parseArgs(), processFile(), Compiler, PassManager

### Community 8 - "Z80 Code Generator"
Cohesion: 0.12
Nodes (4): Z80Codegen, compile(), parse(), translate()

### Community 9 - "Lexer & C Parser"
Cohesion: 0.11
Nodes (8): Lexer, PreprocessedSource, Keywords, TokenType, compile(), compile(), compileToAssembly(), parse()

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
Cohesion: 0.21
Nodes (7): ResolvedSymbol, ObjectRelocation, ObjectSymbol, RelocationType, SectionType, SymbolType, SymbolVisibility

### Community 20 - "Object File Format"
Cohesion: 0.20
Nodes (10): decodeString(), isObjectFile(), RelocTypeMap, RelocTypeReverse, SectionTypeMap, SectionTypeReverse, SymbolTypeMap, SymbolTypeReverse (+2 more)

### Community 21 - "Binary Writer"
Cohesion: 0.36
Nodes (3): BinaryWriter, encodeString(), serializeObjectFile()

### Community 22 - "Compiler Options & Loading"
Cohesion: 0.21
Nodes (4): CompilerOptions, globalRegistry, LinkerOptions, saveObjectFile()

### Community 23 - "Binary Reader"
Cohesion: 0.33
Nodes (3): BinaryReader, deserializeObjectFile(), loadObjectFile()

### Community 27 - "Linker Features Docs"
Cohesion: 0.50
Nodes (4): Linker, Binary Object File Format, Static Library Support, WLA DX Code Generator

## Knowledge Gaps
- **42 isolated node(s):** `IntrinsicMap`, `TypeInfos`, `__filename`, `__dirname`, `name` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AstToIr` connect `AST to IR Translation` to `Z80 Code Generator`, `Lexer & C Parser`, `Core Error Types`, `Compiler Options & Loading`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `Z80Codegen` connect `Z80 Code Generator` to `Lexer & C Parser`, `Z80 Codegen & IR Base`, `Compiler Options & Loading`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `CPegParser` connect `Parser Combinators` to `Z80 Code Generator`, `Lexer & C Parser`, `Core Error Types`, `Compiler Options & Loading`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `IntrinsicMap`, `TypeInfos`, `__filename` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AST Node Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Parser Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.050170068027210885 - nodes in this community are weakly interconnected._
- **Should `Z80 Codegen & IR Base` be split into smaller, more focused modules?**
  _Cohesion score 0.0522466039707419 - nodes in this community are weakly interconnected._