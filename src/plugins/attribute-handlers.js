/**
 * Attribute handler for __cdecl__ calling convention
 */
export class CdeclAttributeHandler {
  /**
   * Name of this attribute
   */
  name = '__cdecl__';

  /**
   * Returns the name of this attribute
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Validates and processes a __cdecl__ attribute
   * @param {AttributeNode} attr - Attribute node to handle
   * @param {ASTNode} target - Target node (declaration, type spec, etc.)
   * @param {Object} context - Processing context
   * @returns {{valid: boolean, metadata?: Object}} Validation result and optional metadata
   */
  handle(attr, target, context) {
    const name = attr.name;
    if (name !== '__cdecl__') {
      return { valid: false };
    }
    const funcName = attr.args ? attr.args.value : null;
    return {
      valid: true,
      metadata: {
        callingConvention: 'cdecl',
        funcName: funcName,
        paramsViaStack: true,
        callerClearsStack: true
      }
    };
  }

  /**
   * Applies attribute effects during code generation
   * @param {*} ir - IR node being generated
   * @param {AttributeNode} attr - Original attribute node
   * @param {Object} metadata - Processed attribute metadata
   * @returns {Object|null} Modified context or null to skip
   */
  onCodegen(ir, attr, metadata) {
    return null;
  }
}

/**
 * Attribute handler for __fastcall__ calling convention
 */
export class FastcallAttributeHandler {
  /**
   * Name of this attribute
   */
  name = '__fastcall__';

  /**
   * Returns the name of this attribute
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Validates and processes a __fastcall__ attribute
   * @param {AttributeNode} attr - Attribute node to handle
   * @param {ASTNode} target - Target node (declaration, type spec, etc.)
   * @param {Object} context - Processing context
   * @returns {{valid: boolean, metadata?: Object}} Validation result and optional metadata
   */
  handle(attr, target, context) {
    const name = attr.name;
    if (name !== '__fastcall__') {
      return { valid: false };
    }
    return {
      valid: true,
      metadata: {
        callingConvention: 'fastcall',
        singleArgOnRegisters: true,
        returnOnRegisters: true
      }
    };
  }

  /**
   * Applies attribute effects during code generation
   * @param {*} ir - IR node being generated
   * @param {AttributeNode} attr - Original attribute node
   * @param {Object} metadata - Processed attribute metadata
   * @returns {Object|null} Modified context or null to skip
   */
  onCodegen(ir, attr, metadata) {
    return null;
  }
}

/**
 * Attribute handler for __callee__ calling convention
 */
export class CalleeAttributeHandler {
  /**
   * Name of this attribute
   */
  name = '__callee__';

  /**
   * Returns the name of this attribute
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Validates and processes a __callee__ attribute
   * @param {AttributeNode} attr - Attribute node to handle
   * @param {ASTNode} target - Target node (declaration, type spec, etc.)
   * @param {Object} context - Processing context
   * @returns {{valid: boolean, metadata?: Object}} Validation result and optional metadata
   */
  handle(attr, target, context) {
    const name = attr.name;
    if (name !== '__callee__') {
      return { valid: false };
    }
    return {
      valid: true,
      metadata: {
        callingConvention: 'callee',
        paramsViaStack: true,
        calleeClearsStack: true
      }
    };
  }

  /**
   * Applies attribute effects during code generation
   * @param {*} ir - IR node being generated
   * @param {AttributeNode} attr - Original attribute node
   * @param {Object} metadata - Processed attribute metadata
   * @returns {Object|null} Modified context or null to skip
   */
  onCodegen(ir, attr, metadata) {
    return null;
  }
}

/**
 * Attribute handler for __new_sdcc__ calling convention
 */
export class NewSdccAttributeHandler {
  /**
   * Name of this attribute
   */
  name = '__new_sdcc__';

  /**
   * Returns the name of this attribute
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Validates and processes a __new_sdcc__ attribute
   * @param {AttributeNode} attr - Attribute node to handle
   * @param {ASTNode} target - Target node (declaration, type spec, etc.)
   * @param {Object} context - Processing context
   * @returns {{valid: boolean, metadata?: Object}} Validation result and optional metadata
   */
  handle(attr, target, context) {
    const name = attr.name;
    if (name !== '__new_sdcc__') {
      return { valid: false };
    }
    return {
      valid: true,
      metadata: {
        callingConvention: 'new_sdcc',
        upToTwoRegs: true,
        spilloverOnStack: true
      }
    };
  }

  /**
   * Applies attribute effects during code generation
   * @param {*} ir - IR node being generated
   * @param {AttributeNode} attr - Original attribute node
   * @param {Object} metadata - Processed attribute metadata
   * @returns {Object|null} Modified context or null to skip
   */
  onCodegen(ir, attr, metadata) {
    return null;
  }
}
