import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

/**
 * Counter for generating unique string literal labels
 */
let stringLiteralCounter = 0;

/**
 * Compute the size of a struct/union given its fields
 * For struct: sum of all field sizes
 * For union: max of all field sizes
 * @param {AST.StructFieldNode[]} fields - Struct/union fields
 * @param {string} kind - 'struct' or 'union'
 * @param {Map} structRegistry - Struct type registry for nested type lookups
 * @returns {number} Total size in bytes
 */
function computeStructSize(fields, kind, structRegistry) {
  if (fields.length === 0) return 0;
  
  const fieldSizes = fields.map(field => {
    const resolvedType = field.type;
    if (resolvedType.structKind && resolvedType.structType && structRegistry) {
      const structDef = structRegistry.get(resolvedType.structType);
      if (structDef) return structDef.size;
    }
    return resolvedType.getSize(structRegistry);
  });
  
  if (kind === 'union') {
    return Math.max(...fieldSizes);
  }
  return fieldSizes.reduce((a, b) => a + b, 0);
}

/**
 * Compute field offsets for a struct/union
 * @param {AST.StructFieldNode[]} fields - Struct/union fields
 * @param {string} kind - 'struct' or 'union'
 * @param {Map} structRegistry - Struct type registry for nested type lookups
 * @returns {Map} Map from field name to byte offset
 */
function computeFieldOffsets(fields, kind, structRegistry) {
  const offsets = new Map();
  let currentOffset = 0;
  
  for (const field of fields) {
    const fieldName = field.name ? field.name.name : null;
    if (fieldName) {
      offsets.set(fieldName, currentOffset);
    }
    const fieldSize = field.type.getSize(structRegistry);
    if (kind === 'struct') {
      currentOffset += fieldSize;
    }
  }
  
  return offsets;
}

/**
 * Map of intrinsic function names to their IR opcode and argument count.
 * Zero-argument intrinsics have argCount 0.
 * Intrinsics with arguments evaluate their argument expressions first.
 */
const IntrinsicMap = {
  '__nop': { opcode: 'NOP', argCount: 0 },
  '__halt': { opcode: 'HALT', argCount: 0 },
  '__di': { opcode: 'DI', argCount: 0 },
  '__ei': { opcode: 'EI', argCount: 0 },
  '__exx': { opcode: 'EXX', argCount: 0 },
  '__ex_af_af': { opcode: 'EX_AF_AF', argCount: 0 },
  '__ex_de_hl': { opcode: 'EX_DE_HL', argCount: 0 },
  '__im0': { opcode: 'IM', argCount: 0, argValue: 0 },
  '__im1': { opcode: 'IM', argCount: 0, argValue: 1 },
  '__im2': { opcode: 'IM', argCount: 0, argValue: 2 },
  '__reti': { opcode: 'RETI', argCount: 0 },
  '__retn': { opcode: 'RETN', argCount: 0 },
  '__rld': { opcode: 'RLD', argCount: 0 },
  '__rrd': { opcode: 'RRD', argCount: 0 },
  '__ld_a_r': { opcode: 'LD_A_R', argCount: 0 },
  '__ld_r_a': { opcode: 'LD_R_A', argCount: 0 },
  '__in': { opcode: 'IN', argCount: 1 },
  '__in16': { opcode: 'IN16', argCount: 1 },
  '__out': { opcode: 'OUT', argCount: 2 },
  '__out16': { opcode: 'OUT16', argCount: 2 },
  '__ini': { opcode: 'INI', argCount: 1 },
  '__outi': { opcode: 'OUTI', argCount: 1 },
  '__inir': { opcode: 'INIR', argCount: 2 },
  '__otir': { opcode: 'OTIR', argCount: 2 },
  '__ind': { opcode: 'IND', argCount: 1 },
  '__outd': { opcode: 'OUTD', argCount: 1 },
  '__indr': { opcode: 'INDR', argCount: 2 },
  '__otdr': { opcode: 'OTDR', argCount: 2 },
  '__setjmp': { opcode: 'SETJMP', argCount: 1 },
  '__longjmp': { opcode: 'LONGJMP', argCount: 2 },
  '__alloca': { opcode: 'ALLOCA', argCount: 1 },
};

/**
 * Translates AST nodes to nanopass IR instructions
 */
export class AstToIr {
  /**
   * Creates a new AST-to-IR translator
   */
  constructor() {
    this.symbolTable = new IL.SymbolTable();
    this.nextLabel = 0;
    this.nextTemp = 0;
    this.currentFunction = null;
    this.loopBreakLabel = null;
    this.loopContinueLabel = null;
    this.typedefs = new Map();
    this.structRegistry = new Map();
    this.stringData = [];
    this.stringCounter = 0;
  }

  /**
   * Generates a unique label name
   * @param {string} prefix - Label prefix
   * @returns {string} Unique label
   */
  label(prefix) {
    return `${prefix}_${this.nextLabel++}`;
  }

  /**
   * Generates a unique temporary register name
   * @returns {string} Temporary register
   */
  temp() {
    return `t${this.nextTemp++}`;
  }

  /**
   * Translate a complete AST to ProgramIR
   * @param {AST.CompoundNode} ast - Root AST node
   * @returns {IL.ProgramIR} Translated program
   */
  translate(ast) {
    const program = new IL.ProgramIR();
    const globals = [];

    // First pass: collect typedefs
    for (const node of ast.statements) {
      if (node instanceof AST.DeclNode && node.kind === 'typedef') {
        this.registerTypedef(node);
      }
    }

    // Second pass: collect struct/union definitions
    for (const node of ast.statements) {
      if (node instanceof AST.StructNode) {
        this.registerStruct(node);
      }
    }

    for (const node of ast.statements) {
      if (node instanceof AST.FunctionNode) {
        const funcIr = this.translateFunction(node);
        program.addFunction(funcIr);
      } else if (node instanceof AST.DeclNode && node.kind !== 'typedef') {
        globals.push(this.translateDecl(node));
      }
    }

    for (const node of ast.statements) {
      if (node instanceof AST.FunctionNode) {
        this.collectStringLiterals(node);
      }
    }

    globals.push(...this.stringData);
    program.globals = globals;
    return program;
  }

  /**
   * Recursively collect string literals from function bodies
   * @param {AST.FunctionNode} func - Function node
   */
  collectStringLiterals(func) {
    this.visitNodeForStrings(func.body);
  }

  /**
   * Visit AST nodes to find string literals and emit them as global data
   * @param {AST.ASTNode} node - Node to visit
   */
  visitNodeForStrings(node) {
    if (!node) return;
    if (node instanceof AST.LiteralNode && node.type === 'string') {
      this.emitStringData(node.value);
      return;
    }
    const childKeys = Object.keys(node).filter(k =>
      typeof node[k] === 'object' && node[k] !== null && !Array.isArray(node[k]) && node[k] instanceof AST.ASTNode
    );
    for (const key of childKeys) {
      this.visitNodeForStrings(node[key]);
    }
  }

  /**
   * Emit string literal data as global
   * @param {string} value - String value
   * @returns {string} Label name for the string data
   */
  emitStringData(value) {
    const label = `str_${this.stringCounter++}`;
    const bytes = [];
    for (let i = 0; i < value.length; i++) {
      bytes.push(value.charCodeAt(i));
    }
    bytes.push(0);
    this.stringData.push({
      name: label,
      type: 'string',
      bytes
    });
    return label;
  }

  /**
   * Register a typedef name as an alias for a type
   * @param {AST.DeclNode} decl - Typedef declaration node
   */
  registerTypedef(decl) {
    const typeName = decl.name.name;
    const aliasedType = decl.type;
    this.typedefs.set(typeName, aliasedType);
    this.symbolTable.define(typeName, {
      name: typeName,
      kind: 'type',
      type: aliasedType.baseType,
      typeSpec: aliasedType
    });
  }

  /**
   * Register a struct/union definition in the type registry
   * @param {AST.StructNode} structNode - Struct/union definition node
   */
  registerStruct(structNode) {
    if (!structNode.name) return;
    const structName = structNode.name.name;
    const size = computeStructSize(structNode.fields, structNode.kind, this.structRegistry);
    const fieldOffsets = computeFieldOffsets(structNode.fields, structNode.kind, this.structRegistry);
    
    this.structRegistry.set(structName, {
      name: structName,
      kind: structNode.kind,
      fields: structNode.fields,
      size,
      fieldOffsets
    });
    
    this.symbolTable.define(structName, {
      name: structName,
      kind: 'type',
      type: structNode.kind,
      size
    });
  }

  /**
   * Resolve a type spec to its actual type (follows typedef aliases)
   * @param {AST.TypeSpecNode} typeSpec - Type specification to resolve
   * @returns {AST.TypeSpecNode} Resolved type specification
   */
  resolveType(typeSpec) {
    let current = typeSpec;
    let depth = 0;
    const maxDepth = 10;
    while (this.typedefs.has(current.baseType) && depth < maxDepth) {
      current = this.typedefs.get(current.baseType);
      depth++;
    }
    return current;
  }

  /**
   * Translate a function definition
   * @param {AST.FunctionNode} func - Function AST node
   * @returns {IL.FunctionIR} IR function
   */
  translateFunction(func) {
    this.currentFunction = func.name.name;
    this.symbolTable = new IL.SymbolTable();
    this.loopBreakLabel = null;
    this.loopContinueLabel = null;

    const resolvedReturn = this.resolveType(func.returnType);

    for (const param of func.parameters) {
      if (param.name) {
        const resolvedParam = this.resolveType(param.type);
        const paramSymbol = {
          name: param.name,
          kind: 'variable',
          type: resolvedParam.baseType,
          offset: 0
        };
        // Track function pointer parameters
        if (resolvedParam.isFunctionPointer) {
          paramSymbol.isFunctionPointer = true;
          paramSymbol.functionReturnType = resolvedParam.functionReturnType;
          paramSymbol.functionParams = resolvedParam.functionParams;
        }
        this.symbolTable.define(param.name, paramSymbol);
      }
    }

    const blocks = this.translateStatement(func.body);
    const funcIr = new IL.FunctionIR(
      func.name.name,
      blocks,
      {
        returnType: resolvedReturn.baseType,
        parameters: func.parameters.filter(p => p.name && !p.isVariadic).map(p => p.name),
        isVariadic: func.isVariadic
      }
    );

    return funcIr;
  }

  /**
   * Translate a statement to basic blocks
   * @param {AST.ASTNode} stmt - Statement AST node
   * @returns {IL.BasicBlock[]} Array of basic blocks
   */
  translateStatement(stmt) {
    if (stmt instanceof AST.CompoundNode) {
      return this.translateCompound(stmt);
    }
    if (stmt instanceof AST.ReturnNode) {
      return this.translateReturn(stmt);
    }
    if (stmt instanceof AST.ControlFlowNode) {
      return this.translateControlFlow(stmt);
    }
    if (stmt instanceof AST.SwitchNode) {
      return this.translateSwitch(stmt);
    }
    if (stmt instanceof AST.JumpNode) {
      return this.translateJump(stmt);
    }
    if (stmt instanceof AST.GotoNode) {
      return this.translateGoto(stmt);
    }
    if (stmt instanceof AST.LabelNode) {
      return this.translateLabel(stmt);
    }
    if (stmt instanceof AST.ExprStmtNode) {
      return this.translateExprStmt(stmt);
    }
    if (stmt instanceof AST.DeclNode) {
      return this.translateDeclStmt(stmt);
    }

    return [new IL.BasicBlock(this.label('block'), [])];
  }

  /**
   * Translate a compound statement (block)
   * @param {AST.CompoundNode} compound - Compound statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateCompound(compound) {
    const blocks = [];
    for (const stmt of compound.statements) {
      const stmtBlocks = this.translateStatement(stmt);
      blocks.push(...stmtBlocks);
    }
    return blocks.length ? blocks : [new IL.BasicBlock(this.label('block'), [])];
  }

  /**
   * Translate a return statement
   * @param {AST.ReturnNode} ret - Return statement
   * @returns {IL.BasicBlock[]} Basic block with return instruction
   */
  translateReturn(ret) {
    if (ret.value) {
      const result = this.translateExpression(ret.value);
      const lastBlock = result.blocks[result.blocks.length - 1];
      lastBlock.add(new IL.ReturnInstruction(result.result));
      return result.blocks;
    } else {
      const block = new IL.BasicBlock(this.label('ret'));
      block.add(new IL.ReturnInstruction(null));
      return [block];
    }
  }

  /**
   * Translate control flow (if/while/for/do-while)
   * @param {AST.ControlFlowNode} control - Control flow node
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateControlFlow(control) {
    if (control.kind === 'if') {
      return this.translateIf(control);
    }
    if (control.kind === 'while') {
      return this.translateWhile(control);
    }
    if (control.kind === 'do_while') {
      return this.translateDoWhile(control);
    }
    if (control.kind === 'for') {
      return this.translateFor(control);
    }
    return [new IL.BasicBlock(this.label('block'), [])];
  }

  /**
   * Translate an if statement
   * @param {AST.ControlFlowNode} ifNode - If statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateIf(ifNode) {
    const condResult = this.translateExpression(ifNode.condition);
    const elseLabel = this.label('else');
    const endLabel = this.label('endif');

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, elseLabel));

    const thenBlocks = this.translateStatement(ifNode.body);

    if (ifNode.elseBody) {
      thenBlocks.push(new IL.BasicBlock(this.label('jmp'), [
        new IL.JumpInstruction(endLabel)
      ]));
      thenBlocks.push(new IL.BasicBlock(elseLabel, []));
      thenBlocks.push(...this.translateStatement(ifNode.elseBody));
      thenBlocks.push(new IL.BasicBlock(endLabel, []));
    } else {
      thenBlocks.push(new IL.BasicBlock(elseLabel, []));
    }

    return [...condResult.blocks, ...thenBlocks];
  }

  /**
   * Translate a while loop
   * @param {AST.ControlFlowNode} whileNode - While loop
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateWhile(whileNode) {
    const breakLabel = this.label('break');
    const continueLabel = this.label('cond');
    const prevBreak = this.loopBreakLabel;
    const prevContinue = this.loopContinueLabel;

    this.loopBreakLabel = breakLabel;
    this.loopContinueLabel = continueLabel;

    const blocks = [];
    blocks.push(new IL.BasicBlock(continueLabel, []));
    const condResult = this.translateExpression(whileNode.condition);
    blocks.push(...condResult.blocks);

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, breakLabel));

    const bodyBlocks = this.translateStatement(whileNode.body);
    blocks.push(...bodyBlocks);
    blocks.push(new IL.BasicBlock(this.label('loop'), [
      new IL.JumpInstruction(continueLabel)
    ]));
    blocks.push(new IL.BasicBlock(breakLabel, []));

    this.loopBreakLabel = prevBreak;
    this.loopContinueLabel = prevContinue;

    return blocks;
  }

  /**
   * Translate a do-while loop
   * @param {AST.ControlFlowNode} doNode - Do-while loop
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateDoWhile(doNode) {
    const breakLabel = this.label('break');
    const continueLabel = this.label('body');
    const condLabel = this.label('cond');
    const prevBreak = this.loopBreakLabel;
    const prevContinue = this.loopContinueLabel;

    this.loopBreakLabel = breakLabel;
    this.loopContinueLabel = continueLabel;

    const blocks = [];
    blocks.push(new IL.BasicBlock(continueLabel, []));
    const bodyBlocks = this.translateStatement(doNode.body);
    blocks.push(...bodyBlocks);
    blocks.push(new IL.BasicBlock(this.label('loop'), [
      new IL.JumpInstruction(condLabel)
    ]));

    blocks.push(new IL.BasicBlock(condLabel, []));
    const condResult = this.translateExpression(doNode.condition);
    blocks.push(...condResult.blocks);

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('ne', condResult.result, continueLabel));
    blocks.push(new IL.BasicBlock(breakLabel, []));

    this.loopBreakLabel = prevBreak;
    this.loopContinueLabel = prevContinue;

    return blocks;
  }

  /**
   * Translate a for loop
   * @param {AST.ControlFlowNode} forNode - For loop
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateFor(forNode) {
    const breakLabel = this.label('break');
    const continueLabel = this.label('inc');
    const condLabel = this.label('cond');
    const bodyLabel = this.label('body');
    const prevBreak = this.loopBreakLabel;
    const prevContinue = this.loopContinueLabel;

    this.loopBreakLabel = breakLabel;
    this.loopContinueLabel = continueLabel;

    const blocks = [];

    if (forNode.init) {
      if (forNode.init instanceof AST.DeclNode) {
        blocks.push(...this.translateDeclStmt(forNode.init));
      } else {
        const initResult = this.translateExpression(forNode.init);
        blocks.push(...initResult.blocks);
      }
    }

    blocks.push(new IL.BasicBlock(condLabel, []));
    if (forNode.condition) {
      const condResult = this.translateExpression(forNode.condition);
      blocks.push(...condResult.blocks);
      const testBlock = condResult.blocks[condResult.blocks.length - 1];
      testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, breakLabel));
    }

    blocks.push(new IL.BasicBlock(bodyLabel, []));
    const bodyBlocks = this.translateStatement(forNode.body);
    blocks.push(...bodyBlocks);

    blocks.push(new IL.BasicBlock(continueLabel, []));
    if (forNode.increment) {
      const incResult = this.translateExpression(forNode.increment);
      blocks.push(...incResult.blocks);
    }
    blocks.push(new IL.BasicBlock(this.label('loop'), [
      new IL.JumpInstruction(condLabel)
    ]));
    blocks.push(new IL.BasicBlock(breakLabel, []));

    this.loopBreakLabel = prevBreak;
    this.loopContinueLabel = prevContinue;

    return blocks;
  }

  /**
   * Translate a switch statement
   * @param {AST.SwitchNode} switchNode - Switch statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateSwitch(switchNode) {
    const endLabel = this.label('endswitch');
    const prevBreak = this.loopBreakLabel;
    this.loopBreakLabel = endLabel;
    this.loopContinueLabel = endLabel;

    const blocks = [];
    const condResult = this.translateExpression(switchNode.expression);
    blocks.push(...condResult.blocks);
    const switchValue = condResult.result;

    const caseLabels = [];
    for (const clause of switchNode.cases) {
      caseLabels.push(this.label('case'));
    }

    if (switchNode.defaultClause) {
      caseLabels.push(this.label('default'));
    }

    const defaultLabel = caseLabels[caseLabels.length - 1] || endLabel;

    for (let i = 0; i < switchNode.cases.length; i++) {
      const clause = switchNode.cases[i];
      const caseLabel = caseLabels[i];

      const cmpBlock = new IL.BasicBlock(this.label('cmp'));
      const temp = this.temp();
      cmpBlock.add(new IL.LoadInstruction(temp, clause.value));
      cmpBlock.add(new IL.BinaryOpInstruction(temp, 'eq', switchValue, temp));
      cmpBlock.add(new IL.JumpIfInstruction('ne', temp, caseLabels[i + 1] || defaultLabel));
      blocks.push(cmpBlock);

      blocks.push(new IL.BasicBlock(caseLabel, []));
      for (const stmt of clause.statements) {
        blocks.push(...this.translateStatement(stmt));
      }
    }

    if (switchNode.defaultClause) {
      blocks.push(new IL.BasicBlock(defaultLabel, []));
      blocks.push(...this.translateStatement(switchNode.defaultClause));
    }

    blocks.push(new IL.BasicBlock(endLabel, []));
    this.loopBreakLabel = prevBreak;
    this.loopContinueLabel = null;

    return blocks;
  }

  /**
   * Translate a break or continue statement
   * @param {AST.JumpNode} jumpNode - Jump statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateJump(jumpNode) {
    const block = new IL.BasicBlock(this.label('jump'));
    if (jumpNode.kind === 'break' && this.loopBreakLabel) {
      block.add(new IL.JumpInstruction(this.loopBreakLabel));
    } else if (jumpNode.kind === 'continue' && this.loopContinueLabel) {
      block.add(new IL.JumpInstruction(this.loopContinueLabel));
    }
    return [block];
  }

  /**
   * Translate a goto statement
   * @param {AST.GotoNode} gotoNode - Goto statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateGoto(gotoNode) {
    const block = new IL.BasicBlock(this.label('goto'));
    block.add(new IL.JumpInstruction(gotoNode.target.name));
    return [block];
  }

  /**
   * Translate a labeled statement
   * @param {AST.LabelNode} labelNode - Labeled statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateLabel(labelNode) {
    const blocks = [];
    blocks.push(new IL.BasicBlock(labelNode.label.name, []));
    blocks.push(...this.translateStatement(labelNode.body));
    return blocks;
  }

  /**
   * Translate an expression statement
   * @param {AST.ExprStmtNode} exprStmt - Expression statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateExprStmt(exprStmt) {
    const result = this.translateExpression(exprStmt.expression);
    return result.blocks;
  }

  /**
   * Translate a declaration statement
   * @param {AST.DeclNode} decl - Declaration
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateDeclStmt(decl) {
    const blocks = [];
    const resolved = this.resolveType(decl.type);
    const typeInfo = decl.type;
    let size = typeInfo.getSize(this.structRegistry);
    
    // Handle struct/union type
    let isStruct = false;
    if (typeInfo.structKind && typeInfo.structType) {
      const structDef = this.structRegistry.get(typeInfo.structType);
      if (structDef) {
        size = structDef.size;
        isStruct = true;
      }
    }
    
    const isFuncPtr = resolved.isFunctionPointer;
    
    this.symbolTable.define(decl.name.name, {
      name: decl.name.name,
      kind: 'variable',
      type: isStruct ? typeInfo.structKind : resolved.baseType,
      offset: 0,
      size: size,
      pointerDepth: typeInfo.pointerDepth,
      isArray: typeInfo.isArray,
      arrayLength: typeInfo.arrayLength,
      elemSize: typeInfo.getElementSize(this.structRegistry),
      structType: typeInfo.structType || null,
      structKind: typeInfo.structKind || null,
      isConst: typeInfo.isConst || false,
      isVolatile: typeInfo.isVolatile || false,
      storageClass: decl.storageClass || null,
      isFunctionPointer: isFuncPtr,
      functionReturnType: isFuncPtr ? resolved.functionReturnType : null,
      functionParams: isFuncPtr ? resolved.functionParams : null
    });

    if (decl.init) {
      const result = this.translateExpression(decl.init);
      blocks.push(...result.blocks);
      if (isFuncPtr) {
        // For function pointer initialization, store the address properly
        const initBlock = blocks[blocks.length - 1];
        initBlock.add(new IL.LoadAddrInstruction('fp_addr', decl.name.name));
        initBlock.add(new IL.BinaryOpInstruction('fp_addr', 'addr', 'fp_addr', result.result));
      } else {
        blocks[blocks.length - 1].add(
          new IL.StoreInstruction(decl.name.name, result.result)
        );
      }
    } else if (typeInfo.isArray) {
      blocks.push(new IL.BasicBlock(this.label('alloc'), [
        new IL.AllocStackInstruction(size)
      ]));
    } else if (isStruct || size > 2) {
      blocks.push(new IL.BasicBlock(this.label('alloc'), [
        new IL.AllocStackInstruction(size)
      ]));
    }

    return blocks;
  }

  /**
   * Translate a declaration to global IR
   * @param {AST.DeclNode} decl - Declaration
   * @returns {Object} Global variable IR
   */
  translateDecl(decl) {
    const resolved = this.resolveType(decl.type);
    
    // Handle function pointer declarations specially
    if (resolved.isFunctionPointer) {
      return {
        name: decl.name.name,
        type: {
          baseType: 'function_pointer',
          isFunctionPointer: true,
          functionReturnType: resolved.functionReturnType.baseType,
          functionParams: resolved.functionParams.map(p => p.type),
          getSize: () => 2
        },
        initial: null
      };
    }
    
    return {
      name: decl.name.name,
      type: resolved.baseType,
      initial: decl.init ? this.translateExpressionValue(decl.init) : null
    };
  }

  /**
   * Translate an expression to IR instructions
   * Returns an object with `blocks` (array of BasicBlock) and `result` (the temp register holding the result)
   * @param {AST.ASTNode|Object} expr - Expression AST node or parser result
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateExpression(expr) {
    // Handle array results from comma-separated expression parser
    if (Array.isArray(expr)) {
      let lastResult = null;
      const allBlocks = [];
      for (const item of expr) {
        if (item !== null) {
          const result = this.translateExpression(item);
          allBlocks.push(...result.blocks);
          lastResult = result.result;
        }
      }
      return { blocks: allBlocks, result: lastResult || this.temp() };
    }

    // Handle Conditional expression from parser
    if (expr && typeof expr === 'object' && expr.type === 'Conditional') {
      return this.translateConditional(expr);
    }
    if (expr instanceof AST.LiteralNode) {
      if (expr.type === 'string') {
        const label = this.emitStringData(expr.value);
        const temp = this.temp();
        const block = new IL.BasicBlock(this.label('str'));
        block.add(new IL.LoadAddrInstruction(temp, label));
        return { blocks: [block], result: temp };
      }
      const temp = this.temp();
      const block = new IL.BasicBlock(this.label('lit'));
      block.add(new IL.LoadInstruction(temp, expr.value));
      return { blocks: [block], result: temp };
    }

    if (expr instanceof AST.IdentifierNode) {
      const sym = this.symbolTable.lookup(expr.name);
      // Check if this identifier is a function - return its address (function pointer)
      if (sym && sym.kind === 'function') {
        const temp = this.temp();
        const block = new IL.BasicBlock(this.label('func_addr'));
        block.add(new IL.LoadAddrInstruction(temp, expr.name));
        return { blocks: [block], result: temp };
      }
      // Check if this is a function pointer variable - load its stored address
      if (sym && (sym.isFunctionPointer || sym.type === 'function_pointer')) {
        return this.translateLoadFunctionPointer(expr.name);
      }
      const temp = this.temp();
      const block = new IL.BasicBlock(this.label('ident'));
      block.add(new IL.LoadInstruction(temp, expr.name));
      return { blocks: [block], result: temp };
    }

    if (expr instanceof AST.BinaryOpNode) {
      return this.translateBinaryOp(expr);
    }

    if (expr instanceof AST.UnaryOpNode) {
      if (expr.op === 'deref') {
        return this.translateDeref({ operand: expr.operand });
      }
      return this.translateUnaryOp(expr);
    }

    if (expr instanceof AST.CallNode) {
      // Check if callee is a function pointer and use special handling
      const calleeName = expr.callee?.name || (typeof expr.callee === 'string' ? expr.callee : null);
      if (calleeName && this.symbolTable) {
        const sym = this.symbolTable.lookup(calleeName);
        if (sym && (sym.type === 'function_pointer' || sym.isFunctionPointer)) {
          return this.translateFuncPtrCallForRegularNode(expr);
        }
      }
      // Check if callee is an IndexNode (array element call like fp[0]())
      if (expr.callee instanceof AST.IndexNode) {
        return this.translateFuncPtrCallForIndexCall(expr);
      }
      return this.translateCall(expr);
    }

    if (expr instanceof AST.FunctionPointerCallNode) {
      return this.translateFuncPtrCall(expr);
    }

    if (expr instanceof AST.IndexNode) {
      return this.translateIndex(expr);
    }

    if (expr instanceof AST.MemberNode) {
      return this.translateMember(expr);
    }

    if (expr instanceof AST.AddressOfNode) {
      return this.translateAddressOf(expr);
    }

    if (expr instanceof AST.DerefNode) {
      return this.translateDeref(expr);
    }

    if (expr instanceof AST.PointerMemberNode) {
      return this.translatePointerMember(expr);
    }

    if (expr instanceof AST.SizeOfNode) {
      return this.translateSizeOf(expr);
    }

    if (expr instanceof AST.OffsetOfNode) {
      return this.translateOffsetOf(expr);
    }

    if (expr instanceof AST.TypeOfNode) {
      return this.translateTypeOf(expr);
    }

    if (expr instanceof AST.CastNode) {
      return this.translateCast(expr);
    }

    const temp = this.temp();
    const block = new IL.BasicBlock(this.label('expr'));
    block.add(new IL.LoadInstruction(temp, 'unknown'));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate a binary operation expression
   * @param {AST.BinaryOpNode} binOp - Binary operation
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateBinaryOp(binOp) {
    if (binOp.op === '=') {
      return this.translateAssignment(binOp);
    }

    const opMapping = {
      '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod',
      '<<': 'shl', '>>': 'shr'
    };
    const mappedOp = opMapping[binOp.op] || binOp.op;

    const leftResult = this.translateExpression(binOp.left);
    const rightResult = this.translateExpression(binOp.right);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('binop'));
    block.add(new IL.BinaryOpInstruction(dest, mappedOp, leftResult.result, rightResult.result));
    return {
      blocks: [...leftResult.blocks, ...rightResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate an assignment expression
   * @param {AST.BinaryOpNode} assign - Assignment expression (op is '=')
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateAssignment(assign) {
    const rightResult = this.translateExpression(assign.right);
    const block = new IL.BasicBlock(this.label('assign'));

    let target;
    let isFuncPtrTarget = false;
    if (assign.left instanceof AST.IdentifierNode) {
      target = assign.left.name;
      // Check if target is a function pointer variable
      const targetSym = this.symbolTable.lookup(target);
      if (targetSym && (targetSym.isFunctionPointer || targetSym.type === 'function_pointer')) {
        isFuncPtrTarget = true;
      }
    } else {
      const leftResult = this.translateExpression(assign.left);
      block.add(new IL.BinaryOpInstruction('addr', 'addr', leftResult.result, 'sp'));
      block.add(new IL.StoreInstruction('mem', rightResult.result));
      return {
        blocks: [...leftResult.blocks, ...rightResult.blocks, block],
        result: rightResult.result
      };
    }

    // Handle function pointer assignment: store the address
    if (isFuncPtrTarget) {
      // Store the function address to the function pointer variable
      // Load the address of the target variable, then store the pointer value there
      block.add(new IL.LoadAddrInstruction('fp_addr', target));
      block.add(new IL.BinaryOpInstruction('fp_addr', 'addr', 'fp_addr', rightResult.result));
    } else {
      block.add(new IL.StoreInstruction(target, rightResult.result));
    }
    return {
      blocks: [...rightResult.blocks, block],
      result: rightResult.result
    };
  }

  /**
   * Translate a unary operation expression
   * @param {AST.UnaryOpNode} unaryOp - Unary operation
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateUnaryOp(unaryOp) {
    // Handle postfix increment/decrement (inc/dec)
    if (unaryOp.op === 'inc' || unaryOp.op === 'dec') {
      return this.translateIncDec(unaryOp);
    }
    const operandResult = this.translateExpression(unaryOp.operand);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('unop'));
    block.add(new IL.UnaryOpInstruction(dest, unaryOp.op, operandResult.result));
    return {
      blocks: [...operandResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate postfix increment/decrement (inc/dec)
   * @param {AST.UnaryOpNode} unaryOp - Increment/decrement operation
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateIncDec(unaryOp) {
    const operandResult = this.translateExpression(unaryOp.operand);
    const originalTemp = operandResult.result;
    const dest = this.temp();
    const blocks = [...operandResult.blocks];
    
    // Get the variable name from the operand (should be an identifier)
    let varName = null;
    const operand = unaryOp.operand;
    if (operand instanceof AST.IdentifierNode) {
      varName = operand.name;
    }
    
    if (varName) {
      // For postfix inc/dec: load original value, modify, store back
      const addSubOp = unaryOp.op === 'inc' ? 'add' : 'sub';
      const modifiedTemp = this.temp();
      const storeBlock = new IL.BasicBlock(this.label('incdec'));
      
      // Calculate modified value: original + 1 or original - 1
      storeBlock.add(new IL.BinaryOpInstruction(modifiedTemp, addSubOp, originalTemp, 1));
      
      // Store back to variable
      storeBlock.add(new IL.StoreInstruction(varName, modifiedTemp));
      
      // Return original value
      return {
        blocks: [...blocks, storeBlock],
        result: originalTemp
      };
    } else {
      // For expressions (like *(p++)): just return the operand
      return operandResult;
    }
  }

  /**
   * Translate a function call expression
   * @param {AST.CallNode} call - Function call
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateCall(call) {
    const blocks = [];
    const callTarget = call.callee.name || call.callee;
    const args = Array.isArray(call.args) ? call.args : [];

    if (IntrinsicMap[callTarget]) {
      return this.translateIntrinsic(callTarget, args, blocks);
    }

    for (const arg of args) {
      const argResult = this.translateExpression(arg);
      blocks.push(...argResult.blocks);
      blocks.push(new IL.BasicBlock(this.label('arg'), [
        new IL.PushInstruction(argResult.result)
      ]));
    }

    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('call'));
    const pushedRegs = [];
    for (let i = 0; i < args.length; i++) {
      pushedRegs.push(`arg${i}`);
    }
    block.add(new IL.CallInstruction(callTarget, pushedRegs));
    block.add(new IL.LoadInstruction(dest, 'ret_val'));
    return { blocks: [...blocks, block], result: dest };
  }

  /**
   * Translate a call through a function pointer
   * @param {AST.FunctionPointerCallNode} fpCall - Function pointer call
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateFuncPtrCall(fpCall) {
    const blocks = [];
    const args = Array.isArray(fpCall.args) ? fpCall.args : [];

    const pointerResult = this.translateExpression(fpCall.pointer);
    blocks.push(...pointerResult.blocks);

    for (const arg of args) {
      const argResult = this.translateExpression(arg);
      blocks.push(...argResult.blocks);
      blocks.push(new IL.BasicBlock(this.label('arg'), [
        new IL.PushInstruction(argResult.result)
      ]));
    }

    const dest = this.temp();
    const pushedRegs = [];
    for (let i = 0; i < args.length; i++) {
      pushedRegs.push(`arg${i}`);
    }
    const block = new IL.BasicBlock(this.label('funcptrcall'));
    block.add(new IL.CallIndirectInstruction(pointerResult.result, pushedRegs));
    block.add(new IL.LoadInstruction(dest, 'ret_val'));
    return { blocks: [...blocks, block], result: dest };
  }

  /**
   * Translate an intrinsic function call to IR
   * @param {string} name - Intrinsic function name
   * @param {AST.ASTNode[]} args - Argument AST nodes
   * @param {IL.BasicBlock[]} blocks - Blocks array to push to
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  /**
   * Translate a regular call node that is actually a function pointer call
   */
  translateFuncPtrCallForRegularNode(call) {
    return this.translateFuncPtrCall({
      ...call,
      callee: { name: call.callee.name || call.callee }
    });
  }

  /**
   * Translate a call through a function pointer array element (fp[i](args))
   * Handles calls like fp[0](5) where fp is an array of function pointers
   * @param {AST.CallNode} call - Call node with IndexNode callee
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateFuncPtrCallForIndexCall(call) {
    const blocks = [];
    const args = Array.isArray(call.args) ? call.args : [];

    // Translate the index expression (e.g., fp[0]) to get the function pointer address
    const indexResult = this.translateExpression(call.callee);
    blocks.push(...indexResult.blocks);

    // Translate arguments
    for (const arg of args) {
      const argResult = this.translateExpression(arg);
      blocks.push(...argResult.blocks);
      blocks.push(new IL.BasicBlock(this.label('arg'), [
        new IL.PushInstruction(argResult.result)
      ]));
    }

    // Generate the call through the function pointer
    const dest = this.temp();
    const pushedRegs = [];
    for (let i = 0; i < args.length; i++) {
      pushedRegs.push(`arg${i}`);
    }
    const block = new IL.BasicBlock(this.label('funcptrcall'));
    block.add(new IL.CallIndirectInstruction(indexResult.result, pushedRegs));
    block.add(new IL.LoadInstruction(dest, 'ret_val'));
    return { blocks: [...blocks, block], result: dest };
  }

  translateIntrinsic(name, args, blocks) {
    const intrinsic = IntrinsicMap[name];
    const translatedArgs = [];

    for (let i = 0; i < intrinsic.argCount; i++) {
      const argResult = this.translateExpression(args[i]);
      blocks.push(...argResult.blocks);
      translatedArgs.push(argResult.result);
    }

    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('intrinsic'));

    const opcodeArgs = [];
    if (intrinsic.argValue !== undefined) {
      opcodeArgs.push(intrinsic.argValue);
    }
    opcodeArgs.push(...translatedArgs);

    block.add(new IL.IntrinsicInstruction(intrinsic.opcode, opcodeArgs));
    return { blocks: [...blocks, block], result: dest };
  }

  /**
   * Returns the IntrinsicMap for external access
   * @returns {Object} The intrinsic map
   */
  static getIntrinsicMap() {
    return IntrinsicMap;
  }

  /**
   * Translate an array index expression
   * @param {AST.IndexNode} index - Index expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateIndex(index) {
    const baseResult = this.translateExpression(index.base);
    const idxResult = this.translateExpression(index.index);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('index'));
    const elemSize = this.inferElementSize(index.base);
    block.add(new IL.IndexedLoadInstruction(dest, baseResult.result, idxResult.result, elemSize));
    return {
      blocks: [...baseResult.blocks, ...idxResult.blocks, block],
      result: dest
    };
  }

  /**
   * Infer element size from an expression's type
   * @param {AST.ASTNode} expr - Expression to infer type from
   * @returns {number} Element size in bytes
   */
  inferElementSize(expr) {
    if (expr instanceof AST.IdentifierNode) {
      const sym = this.symbolTable.lookup(expr.name);
      if (sym) {
        if (sym.structType) {
          const structDef = this.structRegistry.get(sym.structType);
          if (structDef) {
            return structDef.size;
          }
        }
        return sym.elemSize || 1;
      }
    }
    return 1;
  }

  /**
   * Translate a member access expression
   * @param {AST.MemberNode} member - Member access
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateMember(member) {
    const objResult = this.translateExpression(member.object);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('member'));
    
    // Look up the object's type to find struct definition
    let structDef = null;
    let fieldOffset = 0;
    const fieldName = member.field.name;
    
    if (member.object instanceof AST.IdentifierNode) {
      const sym = this.symbolTable.lookup(member.object.name);
      if (sym && sym.structType) {
        structDef = this.structRegistry.get(sym.structType);
        if (structDef) {
          fieldOffset = structDef.fieldOffsets.get(fieldName) || 0;
        }
      }
    }
    
    if (fieldOffset === 0) {
      block.add(new IL.BinaryOpInstruction(dest, 'member', objResult.result, fieldName));
    } else {
      // Load base address, add offset, dereference
      const addrTemp = this.temp();
      block.add(new IL.BinaryOpInstruction(addrTemp, 'add', objResult.result, fieldOffset));
      block.add(new IL.DerefLoadInstruction(dest, addrTemp));
    }
    
    return {
      blocks: [...objResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate an address-of expression (&expr)
   * @param {AST.AddressOfNode} addr - Address-of expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateAddressOf(addr) {
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('addr'));
    if (addr.operand instanceof AST.IdentifierNode) {
      // Check if this is the address of a function (returns function pointer)
      const sym = this.symbolTable.lookup(addr.operand.name);
      if (sym && sym.kind === 'function') {
        // Get the address of a function - this IS a function pointer value
        block.add(new IL.LoadAddrInstruction(dest, addr.operand.name));
        return { blocks: [block], result: dest };
      }
      // Regular variable - get its address
      block.add(new IL.LoadAddrInstruction(dest, addr.operand.name));
    } else if (addr.operand instanceof AST.IndexNode) {
      const baseResult = this.translateExpression(addr.operand.base);
      const idxResult = this.translateExpression(addr.operand.index);
      const elemSize = this.inferElementSize(addr.operand.base);
      const addrTemp = this.temp();
      block.add(new IL.BinaryOpInstruction(addrTemp, 'add', baseResult.result, idxResult.result));
      block.add(new IL.LoadAddrInstruction(dest, addrTemp));
      return {
        blocks: [...baseResult.blocks, ...idxResult.blocks, block],
        result: dest
      };
    } else {
      const operandResult = this.translateExpression(addr.operand);
      block.add(new IL.LoadAddrInstruction(dest, operandResult.result));
      return {
        blocks: [...operandResult.blocks, block],
        result: dest
      };
    }
    return { blocks: [block], result: dest };
  }

  /**
   * Check if a symbol refers to a function
   * @param {string} name - Symbol name
   * @returns {boolean} True if symbol is a function
   */
  isFunctionSymbol(name) {
    const sym = this.symbolTable.lookup(name);
    return sym && sym.kind === 'function';
  }

  /**
   * Check if a symbol is a function pointer type
   * @param {string} name - Symbol name
   * @returns {boolean} True if symbol is a function pointer
   */
  isFunctionPointerSymbol(name) {
    const sym = this.symbolTable.lookup(name);
    return sym && (sym.isFunctionPointer || sym.type === 'function_pointer');
  }

  /**
   * Translate loading a function pointer value from a variable
   * Used when reading from a function pointer variable
   * @param {string} varName - Variable name holding the function pointer
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateLoadFunctionPointer(varName) {
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('load_func_ptr'));
    // Load the function address stored in the function pointer variable
    // First get the address of the variable, then dereference to get the stored address
    block.add(new IL.LoadAddrInstruction('fp_addr', varName));
    block.add(new IL.DerefLoadInstruction(dest, 'fp_addr'));
    return { blocks: [block], result: dest };
  }

  /**
   * Translate storing a function pointer value to a variable
   * Used when assigning a function address to a function pointer variable
   * @param {string} varName - Variable name to store the function pointer
   * @param {string} address - Register holding the function address
   * @returns {IL.BasicBlock[]} Blocks with store instruction
   */
  translateStoreFunctionPointer(varName, address) {
    const block = new IL.BasicBlock(this.label('store_func_ptr'));
    // Store the address to the function pointer variable
    block.add(new IL.LoadAddrInstruction('addr_temp', varName));
    block.add(new IL.BinaryOpInstruction('addr_temp', 'addr', 'addr_temp', address));
    return [block];
  }

  /**
   * Translate a dereference expression (*expr)
   * @param {AST.DerefNode} deref - Dereference expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateDeref(deref) {
    const ptrResult = this.translateExpression(deref.operand);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('deref'));
    block.add(new IL.DerefLoadInstruction(dest, ptrResult.result));
    return {
      blocks: [...ptrResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate a pointer member access expression (ptr->field)
   * @param {AST.PointerMemberNode} pmem - Pointer member access
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translatePointerMember(pmem) {
    const ptrResult = this.translateExpression(pmem.object);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('pmem'));
    
    let structDef = null;
    let fieldOffset = 0;
    const fieldName = pmem.field.name;
    
    if (pmem.object instanceof AST.IdentifierNode) {
      const sym = this.symbolTable.lookup(pmem.object.name);
      if (sym && sym.structType) {
        structDef = this.structRegistry.get(sym.structType);
        if (structDef) {
          fieldOffset = structDef.fieldOffsets.get(fieldName) || 0;
        }
      }
    }
    
    if (fieldOffset === 0) {
      block.add(new IL.BinaryOpInstruction(dest, 'pmember', ptrResult.result, fieldName));
    } else {
      const addrTemp = this.temp();
      block.add(new IL.BinaryOpInstruction(addrTemp, 'add', ptrResult.result, fieldOffset));
      block.add(new IL.DerefLoadInstruction(dest, addrTemp));
    }
    
    return {
      blocks: [...ptrResult.blocks, block],
      result: dest
    };
  }

  /**
   * Translate a conditional (ternary) expression
   * @param {Object} cond - Conditional expression from parser
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateConditional(cond) {
    const dest = this.temp();
    const trueLabel = this.label('true');
    const falseLabel = this.label('false');
    const endLabel = this.label('endcond');

    const condResult = this.translateExpression(cond.condition);
    const blocks = [...condResult.blocks];

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, falseLabel));

    const trueResult = this.translateExpression(cond.trueBranch);
    blocks.push(...trueResult.blocks);
    blocks[blocks.length - 1].add(new IL.StoreInstruction(dest, trueResult.result));
    blocks.push(new IL.BasicBlock(this.label('jmp'), [
      new IL.JumpInstruction(endLabel)
    ]));

    blocks.push(new IL.BasicBlock(falseLabel, []));
    const falseResult = this.translateExpression(cond.falseBranch);
    blocks.push(...falseResult.blocks);
    blocks[blocks.length - 1].add(new IL.StoreInstruction(dest, falseResult.result));

    blocks.push(new IL.BasicBlock(endLabel, []));
    blocks[blocks.length - 1].add(new IL.LoadInstruction(dest, dest));

    return { blocks, result: dest };
  }

  /**
   * Translate expression to a simple value (for initializers)
   * @param {AST.ASTNode} expr - Expression AST node
   * @returns {*} Value
   */
  translateExpressionValue(expr) {
    if (expr instanceof AST.LiteralNode) {
      return expr.value;
    }
    return null;
  }

  /**
   * Translate a sizeof expression (compile-time constant)
   * @param {AST.SizeOfNode} sizeOf - Sizeof expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateSizeOf(sizeOf) {
    let size;
    const operand = sizeOf.operand;
    
    if (operand instanceof AST.TypeSpecNode) {
      size = operand.getSize(this.structRegistry);
    } else if (operand instanceof AST.IdentifierNode) {
      // Could be a struct type name or a variable name
      if (this.structRegistry.has(operand.name)) {
        size = this.structRegistry.get(operand.name).size;
      } else {
        const sym = this.symbolTable.lookup(operand.name);
        if (sym) {
          size = sym.size || sym.elemSize || 2;
        } else {
          const resolved = this.resolveType(new AST.TypeSpecNode(operand.name, true, false, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }));
          size = resolved.getSize(this.structRegistry);
        }
      }
    } else if (typeof operand === 'string') {
      if (this.structRegistry.has(operand)) {
        size = this.structRegistry.get(operand).size;
      } else {
        const resolved = this.resolveType(new AST.TypeSpecNode(operand, true, false, false, null, { file: '<input>', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }));
        size = resolved.getSize(this.structRegistry);
      }
    } else {
      const operandResult = this.translateExpression(operand);
      const sym = this.lookupSymbolFromExpr(operand);
      if (sym) {
        size = sym.size || sym.elemSize || 2;
      } else {
        size = 2;
      }
      return {
        blocks: operandResult.blocks,
        result: this.createConstBlock(size, operandResult.result)
      };
    }
    
    const temp = this.temp();
    const block = new IL.BasicBlock(this.label('sizeof'));
    block.add(new IL.LoadInstruction(temp, size));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate an offsetof expression (compile-time constant)
   * @param {AST.OffsetOfNode} offsetOf - Offsetof expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateOffsetOf(offsetOf) {
    const structDef = this.structRegistry.get(offsetOf.typeName);
    let offset = 0;
    
    if (structDef) {
      const fieldOffset = structDef.fieldOffsets.get(offsetOf.fieldName);
      if (fieldOffset !== undefined) {
        offset = fieldOffset;
      }
    }
    
    const temp = this.temp();
    const block = new IL.BasicBlock(this.label('offsetof'));
    block.add(new IL.LoadInstruction(temp, offset));
    return { blocks: [block], result: temp };
  }

  /**
   * Translate a typeof expression (returns size of the expression's type)
   * @param {AST.TypeOfNode} typeof - Typeof expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateTypeOf(typeofExpr) {
    const operandResult = this.translateExpression(typeofExpr.operand);
    const sym = this.lookupSymbolFromExpr(typeofExpr.operand);
    let size = 2;
    
    if (sym) {
      size = sym.size || sym.elemSize || 2;
    }
    
    const temp = this.temp();
    const block = new IL.BasicBlock(this.label('typeof'));
    block.add(new IL.LoadInstruction(temp, size));
    return {
      blocks: [...operandResult.blocks, block],
      result: temp
    };
  }

  /**
   * Translate a C-style cast expression
   * @param {AST.CastNode} cast - Cast expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateCast(cast) {
    // Cast to pointer type: just evaluate the operand (pointer arithmetic handles the cast)
    // Cast to integer type: no explicit IR instruction needed, the value is preserved
    // The type information is used by the codegen to emit proper instructions
    const operandResult = this.translateExpression(cast.operand);
    return {
      blocks: operandResult.blocks,
      result: operandResult.result
    };
  }

  /**
   * Look up a symbol from an expression (for sizeof/typeof resolution)
   * @param {AST.ASTNode} expr - Expression to look up
   * @returns {Object|null} Symbol info or null
   */
  lookupSymbolFromExpr(expr) {
    if (expr instanceof AST.IdentifierNode) {
      return this.symbolTable.lookup(expr.name) || null;
    }
    return null;
  }

  /**
   * Create a basic block that loads a constant value
   * @param {number} value - Constant value to load
   * @param {string} resultReg - Result register name
   * @returns {string} Result register name
   */
  createConstBlock(value, resultReg) {
    const block = new IL.BasicBlock(this.label('const'));
    block.add(new IL.LoadInstruction(resultReg, value));
    return resultReg;
  }
}
