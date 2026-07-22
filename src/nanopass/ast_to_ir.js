import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

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

    for (const node of ast.statements) {
      if (node instanceof AST.DeclNode && node.kind === 'typedef') {
        this.registerTypedef(node);
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

    program.globals = globals;
    return program;
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
        this.symbolTable.define(param.name, {
          name: param.name,
          kind: 'variable',
          type: resolvedParam.baseType,
          offset: 0
        });
      }
    }

    const blocks = this.translateStatement(func.body);
    const funcIr = new IL.FunctionIR(
      func.name.name,
      blocks,
      {
        returnType: resolvedReturn.baseType,
        parameters: func.parameters.map(p => p.name)
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
    this.symbolTable.define(decl.name.name, {
      name: decl.name.name,
      kind: 'variable',
      type: resolved.baseType,
      offset: 0
    });

    if (decl.init) {
      const result = this.translateExpression(decl.init);
      blocks.push(...result.blocks);
      blocks[blocks.length - 1].add(
        new IL.StoreInstruction(decl.name.name, result.result)
      );
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
      const temp = this.temp();
      const block = new IL.BasicBlock(this.label('lit'));
      block.add(new IL.LoadInstruction(temp, expr.value));
      return { blocks: [block], result: temp };
    }

    if (expr instanceof AST.IdentifierNode) {
      const temp = this.temp();
      const block = new IL.BasicBlock(this.label('ident'));
      block.add(new IL.LoadInstruction(temp, expr.name));
      return { blocks: [block], result: temp };
    }

    if (expr instanceof AST.BinaryOpNode) {
      return this.translateBinaryOp(expr);
    }

    if (expr instanceof AST.UnaryOpNode) {
      return this.translateUnaryOp(expr);
    }

    if (expr instanceof AST.CallNode) {
      return this.translateCall(expr);
    }

    if (expr instanceof AST.IndexNode) {
      return this.translateIndex(expr);
    }

    if (expr instanceof AST.MemberNode) {
      return this.translateMember(expr);
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
    if (assign.left instanceof AST.IdentifierNode) {
      target = assign.left.name;
    } else {
      const leftResult = this.translateExpression(assign.left);
      block.add(new IL.BinaryOpInstruction('addr', 'addr', leftResult.result, 'sp'));
      block.add(new IL.StoreInstruction('mem', rightResult.result));
      return {
        blocks: [...leftResult.blocks, ...rightResult.blocks, block],
        result: rightResult.result
      };
    }

    block.add(new IL.StoreInstruction(target, rightResult.result));
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
   * Translate an intrinsic function call to IR
   * @param {string} name - Intrinsic function name
   * @param {AST.ASTNode[]} args - Argument AST nodes
   * @param {IL.BasicBlock[]} blocks - Blocks array to push to
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
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
   * Translate an array index expression
   * @param {AST.IndexNode} index - Index expression
   * @returns {{blocks: IL.BasicBlock[], result: string}} Blocks and result register
   */
  translateIndex(index) {
    const baseResult = this.translateExpression(index.base);
    const idxResult = this.translateExpression(index.index);
    const dest = this.temp();
    const block = new IL.BasicBlock(this.label('index'));
    block.add(new IL.BinaryOpInstruction(dest, 'index', baseResult.result, idxResult.result));
    return {
      blocks: [...baseResult.blocks, ...idxResult.blocks, block],
      result: dest
    };
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
    block.add(new IL.BinaryOpInstruction(dest, 'member', objResult.result, member.field.name));
    return {
      blocks: [...objResult.blocks, block],
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
}
