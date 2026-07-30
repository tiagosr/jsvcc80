import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

/**
 * Translates AST statement nodes to IR basic blocks.
 * Handles compound statements, returns, expressions, and declarations.
 */
export class StatementTranslator {
  /**
   * Creates a new statement translator
   * @param {Object} context - TranslationContext
   * @param {Object} expressionTranslator - ExpressionTranslator instance
   * @param {Object} [controlFlowTranslator] - ControlFlowTranslator instance (optional, for nested calls)
   * @param {Object} [callMemoryTranslator] - CallAndMemoryTranslator instance (optional, for nested calls)
   */
  constructor(context, expressionTranslator, controlFlowTranslator = null, callMemoryTranslator = null) {
    this.context = context;
    this.expressionTranslator = expressionTranslator;
    this.controlFlowTranslator = controlFlowTranslator;
    this.callMemoryTranslator = callMemoryTranslator;
  }

  /**
   * Dispatch by AST node type to appropriate handler
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
      return this.controlFlowTranslator.translateControlFlow(stmt);
    }
    if (stmt instanceof AST.SwitchNode) {
      return this.controlFlowTranslator.translateSwitch(stmt);
    }
    if (stmt instanceof AST.JumpNode) {
      return this.controlFlowTranslator.translateJump(stmt);
    }
    if (stmt instanceof AST.GotoNode) {
      return this.controlFlowTranslator.translateGoto(stmt);
    }
    if (stmt instanceof AST.LabelNode) {
      return this.controlFlowTranslator.translateLabel(stmt);
    }
    if (stmt instanceof AST.ExprStmtNode) {
      return this.translateExprStmt(stmt);
    }
    if (stmt instanceof AST.DeclNode) {
      return this.translateDeclStmt(stmt);
    }

    return [new IL.BasicBlock(this.context.state.label('block'), [])];
  }

  /**
    * Translate a compound statement (block)
    * @param {AST.CompoundNode} compound - Compound statement
    * @returns {IL.BasicBlock[]} Basic blocks
    */
   translateCompound(compound) {
     this.context.state.pushScope();
     const blocks = [];
     for (const stmt of compound.statements) {
       const stmtBlocks = this.translateStatement(stmt);
       blocks.push(...stmtBlocks);
     }
     this.context.state.popScope();
     return blocks.length ? blocks : [new IL.BasicBlock(this.context.state.label('block'), [])];
   }

  /**
   * Translate a return statement
   * @param {AST.ReturnNode} ret - Return statement
   * @returns {IL.BasicBlock[]} Basic block with return instruction
   */
  translateReturn(ret) {
    if (ret.value) {
      const result = this.expressionTranslator.translateExpression(ret.value);
      const lastBlock = result.blocks[result.blocks.length - 1];
      lastBlock.add(new IL.ReturnInstruction(result.result));
      return result.blocks;
    } else {
      const block = new IL.BasicBlock(this.context.state.label('ret'));
      block.add(new IL.ReturnInstruction(null));
      return [block];
    }
  }

  /**
   * Translate an expression statement
   * @param {AST.ExprStmtNode} exprStmt - Expression statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateExprStmt(exprStmt) {
    const result = this.expressionTranslator.translateExpression(exprStmt.expression);
    return result.blocks;
  }

  /**
   * Translate a local variable declaration statement
   * @param {AST.DeclNode} decl - Declaration
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateDeclStmt(decl) {
    const blocks = [];
    const resolved = this.context.typeRegistry.resolveType(decl.type);
    const typeInfo = decl.type;
    let size = typeInfo.getSize(this.context.typeRegistry.structRegistry);

    let isStruct = false;
    if (typeInfo.structKind && typeInfo.structType) {
      const structDef = this.context.typeRegistry.structRegistry.get(typeInfo.structType);
      if (structDef) {
        size = structDef.size;
        isStruct = true;
      }
    }

    const isFuncPtr = resolved.isFunctionPointer;

    this.context.state.symbolTable.define(decl.name.name, {
      name: decl.name.name,
      kind: 'variable',
      type: isStruct ? typeInfo.structKind : resolved.baseType,
      offset: 0,
      size: size,
      pointerDepth: typeInfo.pointerDepth,
      isArray: typeInfo.isArray,
      arrayLength: typeInfo.arrayLength,
      elemSize: typeInfo.getElementSize(this.context.typeRegistry.structRegistry),
      structType: resolved.structType || null,
      structKind: resolved.structKind || null,
      isConst: typeInfo.isConst || false,
      isVolatile: typeInfo.isVolatile || false,
      storageClass: decl.storageClass || null,
      isFunctionPointer: isFuncPtr,
      functionReturnType: isFuncPtr ? resolved.functionReturnType : null,
      functionParams: isFuncPtr ? resolved.functionParams : null
    });

    if (decl.init) {
      if (decl.init instanceof AST.InitializerNode) {
        const elemSize = typeInfo.getElementSize(this.context.typeRegistry.structRegistry);
        const initResult = this.expressionTranslator.translateInitializer(decl.init, decl.name.name, elemSize);
        blocks.push(...initResult.blocks);
      } else {
        const result = this.expressionTranslator.translateExpression(decl.init);
        blocks.push(...result.blocks);
        if (isFuncPtr) {
          const initBlock = blocks[blocks.length - 1];
          initBlock.add(new IL.LoadAddrInstruction('fp_addr', decl.name.name));
          initBlock.add(new IL.BinaryOpInstruction('fp_addr', 'addr', 'fp_addr', result.result));
        } else {
          const storeSize = resolved.baseType === 'float' ? 4 : (size || 1);
          blocks[blocks.length - 1].add(
            new IL.StoreInstruction(decl.name.name, result.result, storeSize)
          );
        }
      }
    } else if (typeInfo.isArray) {
      blocks.push(new IL.BasicBlock(this.context.state.label('alloc'), [
        new IL.AllocStackInstruction(size)
      ]));
    } else if (isStruct || size > 2) {
      blocks.push(new IL.BasicBlock(this.context.state.label('alloc'), [
        new IL.AllocStackInstruction(size)
      ]));
    }

    return blocks;
  }
}
