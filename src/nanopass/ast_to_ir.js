import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

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
      if (node instanceof AST.FunctionNode) {
        const funcIr = this.translateFunction(node);
        program.addFunction(funcIr);
      } else if (node instanceof AST.DeclNode) {
        globals.push(this.translateDecl(node));
      }
    }

    program.globals = globals;
    return program;
  }

  /**
   * Translate a function definition
   * @param {AST.FunctionNode} func - Function AST node
   * @returns {IL.FunctionIR} IR function
   */
  translateFunction(func) {
    this.currentFunction = func.name.name;
    this.symbolTable = new IL.SymbolTable();

    for (const param of func.parameters) {
      if (param.name) {
        this.symbolTable.define(param.name, {
          name: param.name,
          kind: 'variable',
          type: param.type.baseType,
          offset: 0
        });
      }
    }

    const blocks = this.translateStatement(func.body);
    const funcIr = new IL.FunctionIR(
      func.name.name,
      blocks,
      {
        returnType: func.returnType.baseType,
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
      const exprBlocks = this.translateExpression(ret.value);
      const lastBlock = exprBlocks[exprBlocks.length - 1];
      const lastInstr = lastBlock.instructions[lastBlock.instructions.length - 1];
      
      if (lastInstr && lastInstr.opcode === 'LOAD') {
        const srcReg = lastInstr.operands[0];
        lastBlock.add(new IL.ReturnInstruction(srcReg));
      } else {
        lastBlock.add(new IL.ReturnInstruction(null));
      }
      
      return exprBlocks;
    } else {
      const block = new IL.BasicBlock(this.label('ret'));
      block.add(new IL.ReturnInstruction(null));
      return [block];
    }
  }

  /**
   * Translate control flow (if/while/for)
   * @param {AST.ControlFlowNode} control - Control flow node
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateControlFlow(control) {
    if (control.kind === 'if') {
      return this.translateIf(control);
    }
    return [new IL.BasicBlock(this.label('block'), [])];
  }

  /**
   * Translate an if statement
   * @param {AST.ControlFlowNode} ifNode - If statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateIf(ifNode) {
    const condBlocks = this.translateExpression(ifNode.condition);
    const elseLabel = this.label('else');
    const endLabel = this.label('endif');

    const testBlock = condBlocks[condBlocks.length - 1];
    const temp = this.temp();

    testBlock.add(new IL.LoadInstruction(temp, 'condition'));
    testBlock.add(new IL.JumpIfInstruction('eq', temp, elseLabel));

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

    return [...condBlocks, ...thenBlocks];
  }

  /**
   * Translate an expression statement
   * @param {AST.ExprStmtNode} exprStmt - Expression statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateExprStmt(exprStmt) {
    return this.translateExpression(exprStmt.expression);
  }

  /**
   * Translate a declaration statement
   * @param {AST.DeclNode} decl - Declaration
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateDeclStmt(decl) {
    const blocks = [];
    this.symbolTable.define(decl.name.name, {
      name: decl.name.name,
      kind: 'variable',
      type: decl.type.baseType,
      offset: 0
    });

    if (decl.init) {
      const initBlocks = this.translateExpression(decl.init);
      blocks.push(...initBlocks);
      const lastBlock = blocks[blocks.length - 1];
      const lastInstr = lastBlock.instructions[lastBlock.instructions.length - 1];
      if (lastInstr && lastInstr.opcode === 'LOAD') {
        const srcReg = lastInstr.operands[0];
        lastBlock.add(new IL.StoreInstruction(decl.name.name, srcReg));
      }
    }

    return blocks;
  }

  /**
   * Translate a declaration to global IR
   * @param {AST.DeclNode} decl - Declaration
   * @returns {Object} Global variable IR
   */
  translateDecl(decl) {
    return {
      name: decl.name.name,
      type: decl.type.baseType,
      initial: decl.init ? this.translateExpressionValue(decl.init) : null
    };
  }

  /**
   * Translate an expression to IR instructions
   * @param {AST.ASTNode} expr - Expression AST node
   * @returns {IL.BasicBlock[]} Basic blocks with instructions
   */
  translateExpression(expr) {
    const block = new IL.BasicBlock(this.label('expr'));

    if (expr instanceof AST.LiteralNode) {
      block.add(new IL.LoadInstruction(this.temp(), expr.value));
    } else if (expr instanceof AST.IdentifierNode) {
      const temp = this.temp();
      block.add(new IL.LoadInstruction(temp, expr.name));
    } else if (expr instanceof AST.BinaryOpNode) {
      const leftBlocks = this.translateExpression(expr.left);
      const rightBlocks = this.translateExpression(expr.right);
      const dest = this.temp();
      block.add(new IL.BinaryOpInstruction(dest, expr.op, 'left', 'right'));
      return [...leftBlocks, ...rightBlocks, block];
    } else if (expr instanceof AST.UnaryOpNode) {
      const operandBlocks = this.translateExpression(expr.operand);
      const dest = this.temp();
      block.add(new IL.UnaryOpInstruction(dest, expr.op, 'operand'));
      return [...operandBlocks, block];
    } else if (expr instanceof AST.CallNode) {
      const calleeBlocks = this.translateExpression(expr.callee);
      block.add(new IL.CallInstruction(expr.callee.name, []));
      return [...calleeBlocks, block];
    }

    return [block];
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
