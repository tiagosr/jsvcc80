/**
 * vcc80 - Z80 C Compiler
 * 
 * Main export module providing access to all compiler components
 */

// Core utilities
export { CompilerError, LexerError, ParserError, SemanticError, CodegenError } from './core/errors.js';
export { PositionTracker, makeLocation } from './core/location.js';
export { PluginRegistry, globalRegistry } from './core/plugins.js';

// Preprocessor and lexer
export { TokenType, Keywords } from './preprocessor/tokenTypes.js';
export { Lexer, PreprocessedSource } from './preprocessor/lexer.js';

// Parser
export { 
  Parser, AltParser, SeqParser, ManyParser, SomeParser, 
  OptParser, LitParser, AnyParser, PredParser, withLocation 
} from './parser/combinators.js';

// AST nodes
export {
  // Base
  ASTNode,
  // Expressions
  BinaryOpNode, UnaryOpNode, LiteralNode, IdentifierNode,
  CallNode, IndexNode, MemberNode, PointerMemberNode,
  // Statements and declarations
  DeclNode, ControlFlowNode, SwitchNode, CaseClauseNode,
  ReturnNode, JumpNode, LabelNode, GotoNode, CompoundNode, ExprStmtNode,
  // Types
  TypeSpecNode, ParameterNode, FunctionNode,
  // Structs and unions
  StructNode, StructFieldNode,
  // Enums
  EnumNode, EnumValueNode,
  // Preprocessor directives (preserved)
  PreprocNode, PragmacNode,
  // Extensions
  InlineAsmNode, AttributeNode, AnnotatedDeclNode
} from './ast/nodes.js';

// Intermediate representation
export {
  Instruction, LoadInstruction, StoreInstruction, BinaryOpInstruction,
  UnaryOpInstruction, CallInstruction, ReturnInstruction, JumpIfInstruction,
  JumpInstruction, LabelInstruction, AllocStackInstruction, FreeStackInstruction,
  PushInstruction, PopInstruction,
  BasicBlock, FunctionIR, ProgramIR, SymbolTable, Symbol
} from './nanopass/il.js';

// Code generation backends
export { Z80Codegen, Registers } from './backend/z80codegen.js';

// Compiler orchestration
export { Compiler, CompilerOptions, PassManager } from './compiler.js';

// Plugin interfaces (for extensibility)
export { 
  ParserExtension, PreprocessorExtension, SemanticsPass, IREmissionPass,
  OptimizationPass, CodegenPass, AttributeHandler, PluginLoader 
} from './plugins/interfaces.js';

// Version information
const packageJson = await import('../package.json', { assert: { type: 'json' } });
export const VERSION = packageJson.default.version;
