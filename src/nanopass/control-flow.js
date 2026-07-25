import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

/**
 * Translates control flow statements (if/while/do-while/for/switch) to IR basic blocks.
 */
export class ControlFlowTranslator {
  /**
   * Creates a new control flow translator
   * @param {Object} context - TranslationContext
   * @param {Object} statementTranslator - StatementTranslator instance
   * @param {Object} expressionTranslator - ExpressionTranslator instance
   */
  constructor(context, statementTranslator, expressionTranslator) {
    this.context = context;
    this.statementTranslator = statementTranslator;
    this.expressionTranslator = expressionTranslator;
  }

  /**
   * Dispatch by control flow kind
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
    return [new IL.BasicBlock(this.context.state.label('block'), [])];
  }

  /**
   * Translate an if statement
   * @param {AST.ControlFlowNode} ifNode - If statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateIf(ifNode) {
    const condResult = this.expressionTranslator.translateExpression(ifNode.condition);
    const elseLabel = this.context.state.label('else');
    const endLabel = this.context.state.label('endif');

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, elseLabel));

    const thenBlocks = this.statementTranslator.translateStatement(ifNode.body);

    if (ifNode.elseBody) {
      thenBlocks.push(new IL.BasicBlock(this.context.state.label('jmp'), [
        new IL.JumpInstruction(endLabel)
      ]));
      thenBlocks.push(new IL.BasicBlock(elseLabel, []));
      thenBlocks.push(...this.statementTranslator.translateStatement(ifNode.elseBody));
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
    const breakLabel = this.context.state.label('break');
    const continueLabel = this.context.state.label('cond');
    const prevBreak = this.context.state.loopBreakLabel;
    const prevContinue = this.context.state.loopContinueLabel;

    this.context.state.pushLoop(breakLabel, continueLabel);

    const blocks = [];
    blocks.push(new IL.BasicBlock(continueLabel, []));
    const condResult = this.expressionTranslator.translateExpression(whileNode.condition);
    blocks.push(...condResult.blocks);

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, breakLabel));

    const bodyBlocks = this.statementTranslator.translateStatement(whileNode.body);
    blocks.push(...bodyBlocks);
    blocks.push(new IL.BasicBlock(this.context.state.label('loop'), [
      new IL.JumpInstruction(continueLabel)
    ]));
    blocks.push(new IL.BasicBlock(breakLabel, []));

    this.context.state.popLoop(prevBreak, prevContinue);

    return blocks;
  }

  /**
   * Translate a do-while loop
   * @param {AST.ControlFlowNode} doNode - Do-while loop
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateDoWhile(doNode) {
    const breakLabel = this.context.state.label('break');
    const continueLabel = this.context.state.label('body');
    const condLabel = this.context.state.label('cond');
    const prevBreak = this.context.state.loopBreakLabel;
    const prevContinue = this.context.state.loopContinueLabel;

    this.context.state.pushLoop(breakLabel, continueLabel);

    const blocks = [];
    blocks.push(new IL.BasicBlock(continueLabel, []));
    const bodyBlocks = this.statementTranslator.translateStatement(doNode.body);
    blocks.push(...bodyBlocks);
    blocks.push(new IL.BasicBlock(this.context.state.label('loop'), [
      new IL.JumpInstruction(condLabel)
    ]));

    blocks.push(new IL.BasicBlock(condLabel, []));
    const condResult = this.expressionTranslator.translateExpression(doNode.condition);
    blocks.push(...condResult.blocks);

    const testBlock = condResult.blocks[condResult.blocks.length - 1];
    testBlock.add(new IL.JumpIfInstruction('ne', condResult.result, continueLabel));
    blocks.push(new IL.BasicBlock(breakLabel, []));

    this.context.state.popLoop(prevBreak, prevContinue);

    return blocks;
  }

  /**
   * Translate a for loop
   * @param {AST.ControlFlowNode} forNode - For loop
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateFor(forNode) {
    const breakLabel = this.context.state.label('break');
    const continueLabel = this.context.state.label('inc');
    const condLabel = this.context.state.label('cond');
    const bodyLabel = this.context.state.label('body');
    const prevBreak = this.context.state.loopBreakLabel;
    const prevContinue = this.context.state.loopContinueLabel;

    this.context.state.pushLoop(breakLabel, continueLabel);

    const blocks = [];

    if (forNode.init) {
      if (forNode.init instanceof AST.DeclNode) {
        blocks.push(...this.statementTranslator.translateDeclStmt(forNode.init));
      } else {
        const initResult = this.expressionTranslator.translateExpression(forNode.init);
        blocks.push(...initResult.blocks);
      }
    }

    blocks.push(new IL.BasicBlock(condLabel, []));
    if (forNode.condition) {
      const condResult = this.expressionTranslator.translateExpression(forNode.condition);
      blocks.push(...condResult.blocks);
      const testBlock = condResult.blocks[condResult.blocks.length - 1];
      testBlock.add(new IL.JumpIfInstruction('eq', condResult.result, breakLabel));
    }

    blocks.push(new IL.BasicBlock(bodyLabel, []));
    const bodyBlocks = this.statementTranslator.translateStatement(forNode.body);
    blocks.push(...bodyBlocks);

    blocks.push(new IL.BasicBlock(continueLabel, []));
    if (forNode.increment) {
      const incResult = this.expressionTranslator.translateExpression(forNode.increment);
      blocks.push(...incResult.blocks);
    }
    blocks.push(new IL.BasicBlock(this.context.state.label('loop'), [
      new IL.JumpInstruction(condLabel)
    ]));
    blocks.push(new IL.BasicBlock(breakLabel, []));

    this.context.state.popLoop(prevBreak, prevContinue);

    return blocks;
  }

  /**
   * Translate a switch statement
   * @param {AST.SwitchNode} switchNode - Switch statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateSwitch(switchNode) {
    const endLabel = this.context.state.label('endswitch');
    const prevBreak = this.context.state.loopBreakLabel;
    this.context.state.pushLoop(endLabel, endLabel);

    const blocks = [];
    const condResult = this.expressionTranslator.translateExpression(switchNode.expression);
    blocks.push(...condResult.blocks);
    const switchValue = condResult.result;

    const caseLabels = [];
    for (const clause of switchNode.cases) {
      caseLabels.push(this.context.state.label('case'));
    }

    if (switchNode.defaultClause) {
      caseLabels.push(this.context.state.label('default'));
    }

    const defaultLabel = caseLabels[caseLabels.length - 1] || endLabel;

    for (let i = 0; i < switchNode.cases.length; i++) {
      const clause = switchNode.cases[i];
      const caseLabel = caseLabels[i];

      const cmpBlock = new IL.BasicBlock(this.context.state.label('cmp'));
      const temp = this.context.state.temp();
      cmpBlock.add(new IL.LoadInstruction(temp, clause.value));
      cmpBlock.add(new IL.BinaryOpInstruction(temp, 'eq', switchValue, temp));
      cmpBlock.add(new IL.JumpIfInstruction('ne', temp, caseLabels[i + 1] || defaultLabel));
      blocks.push(cmpBlock);

      blocks.push(new IL.BasicBlock(caseLabel, []));
      for (const stmt of clause.statements) {
        blocks.push(...this.statementTranslator.translateStatement(stmt));
      }
    }

    if (switchNode.defaultClause) {
      blocks.push(new IL.BasicBlock(defaultLabel, []));
      blocks.push(...this.statementTranslator.translateStatement(switchNode.defaultClause));
    }

    blocks.push(new IL.BasicBlock(endLabel, []));
    this.context.state.popLoop(prevBreak, null);

    return blocks;
  }

  /**
   * Translate a break or continue statement
   * @param {AST.JumpNode} jumpNode - Jump statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateJump(jumpNode) {
    const block = new IL.BasicBlock(this.context.state.label('jump'));
    if (jumpNode.kind === 'break' && this.context.state.loopBreakLabel) {
      block.add(new IL.JumpInstruction(this.context.state.loopBreakLabel));
    } else if (jumpNode.kind === 'continue' && this.context.state.loopContinueLabel) {
      block.add(new IL.JumpInstruction(this.context.state.loopContinueLabel));
    }
    return [block];
  }

  /**
   * Translate a goto statement
   * @param {AST.GotoNode} gotoNode - Goto statement
   * @returns {IL.BasicBlock[]} Basic blocks
   */
  translateGoto(gotoNode) {
    const block = new IL.BasicBlock(this.context.state.label('goto'));
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
    blocks.push(...this.statementTranslator.translateStatement(labelNode.body));
    return blocks;
  }
}
