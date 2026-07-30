/**
 * Base class for all AST nodes
 */
export class ASTNode {
  /**
   * Creates an AST node
   * @param {string} type - Node type identifier
   * @param {SourceLocation} location - Source location
   * @param {*} [meta] - Additional metadata
   */
  constructor(type, location, meta = {}) {
    this.type = type;
    this.location = location;
    this.meta = meta;
  }

  /**
   * Returns a JSON-serializable representation of the node
   * @returns {Object} JSON representation
   */
  toJSON() {
    const result = {};
    
    for (const key of Object.keys(this)) {
      if (key === 'location') {
        result[key] = this.location;
      } else if (typeof this[key] !== 'function' && !key.startsWith('_')) {
        const value = this[key];
        
        if (value instanceof ASTNode) {
          result[key] = value.toJSON();
        } else if (Array.isArray(value)) {
          result[key] = value.map(item => 
            item instanceof ASTNode ? item.toJSON() : item
          );
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Creates a string representation of the node
   * @returns {string} Debug string
   */
  toString() {
    return this.toJSON();
  }
}

/**
 * AST node for binary operations
 */
export class BinaryOpNode extends ASTNode {
  constructor(op, left, right, location) {
    super('BinaryOp', location);
    this.op = op;
    this.left = left;
    this.right = right;
  }
}

/**
 * AST node for unary operations
 */
export class UnaryOpNode extends ASTNode {
  constructor(op, operand, location) {
    super('UnaryOp', location);
    this.op = op;
    this.operand = operand;
  }
}

/**
 * AST node for address-of operator (&)
 */
export class AddressOfNode extends ASTNode {
  /**
   * Creates an address-of node
   * @param {ExpressionNode} operand - Expression to take address of
   * @param {SourceLocation} location - Source location
   */
  constructor(operand, location) {
    super('AddressOf', location);
    this.operand = operand;
  }
}

/**
 * AST node for pointer dereference operator (*)
 */
export class DerefNode extends ASTNode {
  /**
   * Creates a dereference node
   * @param {ExpressionNode} operand - Pointer expression to dereference
   * @param {SourceLocation} location - Source location
   */
  constructor(operand, location) {
    super('Deref', location);
    this.operand = operand;
  }
}

/**
 * AST node for literal values
 */
export class LiteralNode extends ASTNode {
  /**
   * Creates a literal node
   * @param {string} type - 'int', 'float', 'char', or 'string'
   * @param {*} value - Literal value
   * @param {SourceLocation} location - Source location
   */
  constructor(type, value, location) {
    super('Literal', location);
    this.type = type;
    this.value = value;
  }
}

/**
 * AST node for identifiers/variables
 */
export class IdentifierNode extends ASTNode {
  /**
   * Creates an identifier node
   * @param {string} name - Variable/function name
   * @param {SourceLocation} location - Source location
   */
  constructor(name, location) {
    super('Identifier', location);
    this.name = name;
  }
}

/**
 * AST node for function calls
 */
export class CallNode extends ASTNode {
  /**
   * Creates a call node
   * @param {IdentifierNode|ExpressionNode} callee - Function being called
   * @param {ExpressionNode[]} args - Call arguments
   * @param {SourceLocation} location - Source location
   */
  constructor(callee, args, location) {
    super('Call', location);
    this.callee = callee;
    this.args = args;
  }
}

/**
 * AST node for calling through a function pointer
 */
export class FunctionPointerCallNode extends ASTNode {
  /**
   * Creates a function pointer call node
   * @param {ExpressionNode} pointer - Function pointer expression
   * @param {ExpressionNode[]} args - Call arguments
   * @param {SourceLocation} location - Source location
   */
  constructor(pointer, args, location) {
    super('FuncPtrCall', location);
    this.pointer = pointer;
    this.args = args;
  }
}

/**
 * AST node for array indexing
 */
export class IndexNode extends ASTNode {
  /**
   * Creates an index node
   * @param {ExpressionNode} base - Array expression
   * @param {ExpressionNode} index - Index expression
   * @param {SourceLocation} location - Source location
   */
  constructor(base, index, location) {
    super('Index', location);
    this.base = base;
    this.index = index;
  }
}

/**
 * AST node for member access (struct/union dot notation)
 */
export class MemberNode extends ASTNode {
  /**
   * Creates a member access node
   * @param {ExpressionNode} object - Object expression
   * @param {IdentifierNode} field - Field name
   * @param {SourceLocation} location - Source location
   */
  constructor(object, field, location) {
    super('Member', location);
    this.object = object;
    this.field = field;
  }
}

/**
 * AST node for pointer member access (struct/union arrow notation)
 */
export class PointerMemberNode extends ASTNode {
  /**
   * Creates a pointer member access node
   * @param {ExpressionNode} object - Object expression
   * @param {IdentifierNode} field - Field name
   * @param {SourceLocation} location - Source location
   */
  constructor(object, field, location) {
    super('PointerMember', location);
    this.object = object;
    this.field = field;
  }
}

/**
 * AST node for variable declarations
 */
export class DeclNode extends ASTNode {
   /**
    * Creates a declaration node
    * @param {string} kind - 'var', 'const', or 'typedef'
    * @param {TypeSpecNode} type - Variable type specification
    * @param {IdentifierNode} name - Variable name
    * @param {ASTNode} [init] - Optional initializer (expression or StructNode for typedef struct)
    * @param {SourceLocation} location - Source location
    * @param {string} [storageClass] - Storage class specifier ('register', 'static', 'extern', 'auto')
    */
   constructor(kind, type, name, init = null, location, storageClass = null) {
     super('Decl', location);
     this.kind = kind;
     this.type = type;
     this.name = name;
     this.init = init;
     this.storageClass = storageClass;
   }

   /**
    * Returns the struct node if this is a typedef struct/union declaration
    * @returns {StructNode|null}
    */
   get structNode() {
     return this.init instanceof StructNode ? this.init : null;
   }
 }

/**
 * AST node for control flow statements
 */
export class ControlFlowNode extends ASTNode {
  /**
   * Creates a control flow node
   * @param {string} kind - 'if', 'while', 'do_while', 'for'
   * @param {ExpressionNode} condition - Loop/condition expression
   * @param {StatementNode} body - Body statement(s)
   * @param {StatementNode} [elseBody] - Else branch for if statements
   * @param {SourceLocation} location - Source location
   * @param {ExpressionNode} [init] - For loop init expression/declaration
   * @param {ExpressionNode} [increment] - For loop increment expression
   */
  constructor(kind, condition, body, elseBody = null, location, init = null, increment = null) {
    super('ControlFlow', location);
    this.kind = kind;
    this.condition = condition;
    this.body = body;
    this.elseBody = elseBody;
    this.init = init;
    this.increment = increment;
  }
}

/**
 * AST node for switch statements
 */
export class SwitchNode extends ASTNode {
  /**
   * Creates a switch statement node
   * @param {ExpressionNode} expression - Expression to switch on
   * @param {CaseClauseNode[]} cases - Case clauses
   * @param {StatementNode} [defaultClause] - Default clause
   * @param {SourceLocation} location - Source location
   */
  constructor(expression, cases, defaultClause = null, location) {
    super('Switch', location);
    this.expression = expression;
    this.cases = cases;
    this.defaultClause = defaultClause;
  }
}

/**
 * AST node for case clauses in switch statements
 */
export class CaseClauseNode extends ASTNode {
  /**
   * Creates a case clause node
   * @param {ExpressionNode} [value] - Case value (null for default)
   * @param {StatementNode[]} statements - Statements in the case
   * @param {SourceLocation} location - Source location
   */
  constructor(value, statements, location) {
    super('CaseClause', location);
    this.value = value;
    this.statements = statements;
  }
}

/**
 * AST node for return statements
 */
export class ReturnNode extends ASTNode {
  /**
   * Creates a return statement node
   * @param {ExpressionNode} [value] - Optional return value
   * @param {SourceLocation} location - Source location
   */
  constructor(value = null, location) {
    super('Return', location);
    this.value = value;
  }
}

/**
 * AST node for break/continue statements
 */
export class JumpNode extends ASTNode {
  /**
   * Creates a jump statement node
   * @param {string} kind - 'break' or 'continue'
   * @param {SourceLocation} location - Source location
   */
  constructor(kind, location) {
    super('Jump', location);
    this.kind = kind;
  }
}

/**
 * AST node for labeled statements (goto targets)
 */
export class LabelNode extends ASTNode {
  /**
   * Creates a label statement node
   * @param {IdentifierNode} label - Label name
   * @param {StatementNode} body - Labeled statement(s)
   * @param {SourceLocation} location - Source location
   */
  constructor(label, body, location) {
    super('Label', location);
    this.label = label;
    this.body = body;
  }
}

/**
 * AST node for goto statements
 */
export class GotoNode extends ASTNode {
  /**
   * Creates a goto statement node
   * @param {IdentifierNode} target - Label to jump to
   * @param {SourceLocation} location - Source location
   */
  constructor(target, location) {
    super('Goto', location);
    this.target = target;
  }
}

/**
 * AST node for compound statements (blocks)
 */
export class CompoundNode extends ASTNode {
  /**
   * Creates a compound statement node
   * @param {StatementNode[]} statements - Statements in the block
   * @param {SourceLocation} location - Source location
   */
  constructor(statements, location) {
    super('Compound', location);
    this.statements = statements;
  }
}

/**
 * AST node for expression statements
 */
export class ExprStmtNode extends ASTNode {
  /**
   * Creates an expression statement node
   * @param {ExpressionNode} expression - Expression to evaluate
   * @param {SourceLocation} location - Source location
   */
  constructor(expression, location) {
    super('ExprStmt', location);
    this.expression = expression;
  }
}

/**
 * AST node for type specifications
 */
export class TypeSpecNode extends ASTNode {
  /**
   * Type size in bytes for Z80 target
   */
  static TypeSizes = {
    'void': 0,
    'char': 1,
    '_Bool': 1,
    'short': 2,
    'int': 2,
    'long': 4,
    'unsigned': 2,
    'float': 4,
    'double': 4,
  };

  /**
   * Creates a type specification node
   * @param {string} baseType - Base type (e.g., 'int', 'char')
   * @param {boolean} isSigned - Whether signed type
   * @param {boolean} isConst - Whether const qualified
   * @param {boolean} isVolatile - Whether volatile qualified
   * @param {number} [bitWidth] - Optional bit width for enums/fields
   * @param {SourceLocation} location - Source location
   * @param {number} [pointerDepth] - Pointer indirection level (0 = non-pointer)
   * @param {boolean} [isArray] - Whether this is an array type
   * @param {number} [arrayLength] - Array length (null for incomplete array)
   * @param {string} [structType] - Struct/union type name (e.g., 'Point')
   * @param {string} [structKind] - 'struct' or 'union' (null for non-struct types)
   * @param {boolean} [isFunctionPointer] - Whether this is a function pointer type
   * @param {TypeSpecNode|null} [functionReturnType] - Return type of function (for function pointers)
   * @param {ParameterNode[]|null} [functionParams] - Parameter types of function (for function pointers)
   */
  constructor(baseType, isSigned = true, isConst = false, isVolatile = false, bitWidth = null, location, pointerDepth = 0, isArray = false, arrayLength = null, structType = null, structKind = null, isFunctionPointer = false, functionReturnType = null, functionParams = null) {
    super('TypeSpec', location);
    this.baseType = baseType;
    this.isSigned = isSigned;
    this.isConst = isConst;
    this.isVolatile = isVolatile;
    this.bitWidth = bitWidth;
    this.pointerDepth = pointerDepth;
    this.isArray = isArray;
    this.arrayLength = arrayLength;
    this.structType = structType;
    this.structKind = structKind;
    this.isFunctionPointer = isFunctionPointer;
    this.functionReturnType = functionReturnType;
    this.functionParams = functionParams;
  }

  /**
    * Returns the size in bytes for this type on the Z80 target
    * Pointers are always 2 bytes (16-bit addresses). Arrays are elementSize * length.
    * Struct types use structSize if available, otherwise compute from fields.
    * Function pointers are also 2 bytes (16-bit function addresses).
    * Bit-width types (unsigned:n) return ceil(bitWidth / 8).
    * @returns {number} Size in bytes
    */
   getSize(structRegistry = null) {
     if (this.pointerDepth > 0 || this.isFunctionPointer) {
       return 2;
     }
     if (this.bitWidth != null) {
       return Math.ceil(this.bitWidth / 8);
     }
     if (this.structKind && this.structType && structRegistry) {
       const structDef = structRegistry.get(this.structType);
       if (structDef) {
         return structDef.size;
       }
     }
     const baseSize = TypeSpecNode.TypeSizes[this.baseType] ?? 2;
     if (this.isArray && this.arrayLength != null) {
       return baseSize * this.arrayLength;
     }
     return baseSize;
   }

  /**
    * Returns the element size for this type (ignores array length)
    * @param {Map} [structRegistry] - Struct type registry for size lookup
    * @returns {number} Element size in bytes
    */
   getElementSize(structRegistry = null) {
     if (this.pointerDepth > 0 || this.isFunctionPointer) {
       return 2;
     }
     if (this.bitWidth != null) {
       return Math.ceil(this.bitWidth / 8);
     }
     if (this.structKind && this.structType && structRegistry) {
       const structDef = structRegistry.get(this.structType);
       if (structDef) {
         return structDef.size;
       }
     }
     return TypeSpecNode.TypeSizes[this.baseType] ?? 2;
   }

  /**
    * Returns the type string representation (e.g., 'const int*', 'volatile char[10]', 'struct Point', 'int (*)(int)', 'unsigned:8')
    * @returns {string} Type string
    */
   typeString() {
     let s = '';
     if (this.isConst) s += 'const ';
     if (this.isVolatile) s += 'volatile ';
     
     if (this.isFunctionPointer && this.functionReturnType) {
       // Function pointer: int (*)(int, char)
       const returnStr = this.functionReturnType.typeString();
       s += `${returnStr} (*)`;
       
       if (this.functionParams && this.functionParams.length > 0) {
         s += '(';
         s += this.functionParams.map(p => p.type.typeString() + ' ' + (p.name || '')).join(', ');
         s += ')';
       } else {
         s += '(void)';
       }
     } else if (this.bitWidth != null) {
       s += `unsigned:${this.bitWidth}`;
     } else {
       s += this.structKind ? `${this.structKind} ${this.structType}` : this.baseType;
       for (let i = 0; i < this.pointerDepth; i++) {
         s += '*';
       }
       if (this.isArray) {
         s += `[${this.arrayLength ?? ''}]`;
       }
     }
     return s;
   }
}

/**
 * AST node for function declarations/definitions
 */
export class FunctionNode extends ASTNode {
  /**
   * Creates a function node
   * @param {IdentifierNode} name - Function name
   * @param {TypeSpecNode} returnType - Return type
   * @param {ParameterList[]} parameters - Function parameters
   * @param {StatementNode} body - Function body
   * @param {SourceLocation} location - Source location
   * @param {AttributeNode[]} [attributes] - Optional attribute annotations
   * @param {boolean} [isInline] - Whether function has inline keyword
   */
  constructor(name, returnType, parameters, body, location, attributes = [], isInline = false) {
    super('Function', location);
    this.name = name;
    this.returnType = returnType;
    this.parameters = parameters;
    this.body = body;
    this.attributes = attributes;
    this.isVariadic = parameters.some(p => p && p.isVariadic);
    this.isInline = isInline;
  }

  /**
   * Returns JSON representation of the function node
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name ? this.name.value : null,
      returnType: this.returnType.toJSON ? this.returnType.toJSON() : 'unknown',
      parameters: this.parameters.map(p => p.toJSON ? p.toJSON() : p),
      isVariadic: this.isVariadic,
      isInline: this.isInline,
      attributes: this.attributes.map(a => a.toJSON ? a.toJSON() : a)
    };
  }
}

/**
 * AST node for function parameters
 */
export class ParameterNode extends ASTNode {
  /**
   * Creates a parameter node
   * @param {TypeSpecNode} type - Parameter type
   * @param {IdentifierNode} name - Parameter name (null for unnamed)
   * @param {SourceLocation} location - Source location
   * @param {string} [storageClass] - Storage class specifier ('register')
   * @param {boolean} [isVariadic] - True if this is a variadic ellipsis parameter (...)
   */
  constructor(type, name = null, location, storageClass = null, isVariadic = false) {
    super('Parameter', location);
    this.type = type;
    this.name = name;
    this.storageClass = storageClass;
    this.isVariadic = isVariadic;
  }

  /**
   * Returns JSON representation of the parameter node
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type.toJSON ? this.type.toJSON() : 'unknown',
      name: this.name ? this.name.value : null,
      storageClass: this.storageClass,
      isVariadic: this.isVariadic
    };
  }
}

/**
 * AST node for struct/union definitions
 */
export class StructNode extends ASTNode {
  /**
   * Creates a struct/union definition node
   * @param {string} kind - 'struct' or 'union'
   * @param {IdentifierNode} name - Type name (null for anonymous)
   * @param {StructField[]} fields - Struct fields
   * @param {SourceLocation} location - Source location
   */
  constructor(kind, name, fields, location) {
    super('Struct', location);
    this.kind = kind;
    this.name = name;
    this.fields = fields;
  }
}

/**
 * AST node for struct/union fields
 */
export class StructFieldNode extends ASTNode {
  /**
   * Creates a struct field node
   * @param {TypeSpecNode} type - Field type
   * @param {IdentifierNode} name - Field name (null for anonymous)
   * @param {number} [bitWidth] - Bit width for bit-fields
   * @param {SourceLocation} location - Source location
   */
  constructor(type, name = null, bitWidth = null, location) {
    super('StructField', location);
    this.type = type;
    this.name = name;
    this.bitWidth = bitWidth;
  }
}

/**
 * AST node for enum definitions
 */
export class EnumNode extends ASTNode {
  /**
   * Creates an enum definition node
   * @param {IdentifierNode} name - Enum type name (null for anonymous)
   * @param {EnumValue[]} values - Enum values with assigned names
   * @param {SourceLocation} location - Source location
   */
  constructor(name, values, location) {
    super('Enum', location);
    this.name = name;
    this.values = values;
  }
}

/**
 * AST node for enum value definitions
 */
export class EnumValueNode extends ASTNode {
  /**
   * Creates an enum value node
   * @param {IdentifierNode} name - Value name
   * @param {ExpressionNode} [value] - Assigned value (auto-incremented if null)
   * @param {SourceLocation} location - Source location
   */
  constructor(name, value = null, location) {
    super('EnumValue', location);
    this.name = name;
    this.value = value;
  }
}

/**
 * AST node for preprocessor directives (preserved in AST)
 */
export class PreprocNode extends ASTNode {
  /**
   * Creates a preprocessor directive node
   * @param {string} kind - 'include', 'define', 'undef', 'ifdef', 'ifndef', 'else', 'endif'
   * @param {*} value - Directive-specific content
   * @param {SourceLocation} location - Source location
   */
  constructor(kind, value = null, location) {
    super('Preproc', location);
    this.kind = kind;
    this.value = value;
  }
}

/**
 * AST node for pragma directives (processed by preprocessor)
 */
export class PragmacNode extends ASTNode {
  /**
   * Creates a pragma directive node
   * @param {string} type - Pragma type ('once', 'pack', etc.)
   * @param {*} value - Pragma-specific data
   * @param {SourceLocation} location - Source location
   */
  constructor(type, value = null, location) {
    super('Pragma', location);
    this.type = type;
    this.value = value;
  }
}

/**
 * AST node for inline assembly code
 */
export class InlineAsmNode extends ASTNode {
  /**
   * Creates an inline assembly node
   * @param {string} asm - Assembly code string
   * @param {{[key: string]: ExpressionNode}} [inputs] - Input operands (name => expression)
   * @param {{[key: string]: ExpressionNode}} [outputs] - Output operands (name => expression)
   * @param {SourceLocation} location - Source location
   */
  constructor(asm, inputs = null, outputs = null, location) {
    super('InlineAsm', location);
    this.asm = asm;
    this.inputs = inputs || {};
    this.outputs = outputs || {};
  }
}

/**
 * AST node for sizeof expression
 */
export class SizeOfNode extends ASTNode {
  /**
   * Creates a sizeof node
   * @param {ASTNode|string} operand - Expression or type name to compute size of
   * @param {SourceLocation} location - Source location
   */
  constructor(operand, location) {
    super('SizeOf', location);
    this.operand = operand;
  }
}

/**
 * AST node for offsetof expression
 */
export class OffsetOfNode extends ASTNode {
  /**
   * Creates an offsetof node
   * @param {string} typeName - Struct/union type name
   * @param {string} fieldName - Field name within the type
   * @param {SourceLocation} location - Source location
   */
  constructor(typeName, fieldName, location) {
    super('OffsetOf', location);
    this.typeName = typeName;
    this.fieldName = fieldName;
  }
}

/**
 * AST node for typeof expression
 */
export class TypeOfNode extends ASTNode {
  /**
   * Creates a typeof node
   * @param {ASTNode} operand - Expression to get type of
   * @param {SourceLocation} location - Source location
   */
  constructor(operand, location) {
    super('TypeOf', location);
    this.operand = operand;
  }
}

/**
 * AST node for attribute specifications (__attribute__)
 */
export class AttributeNode extends ASTNode {
  /**
   * Creates an attribute specification node
   * @param {string} name - Attribute name (e.g., 'packed', 'aligned')
   * @param {*} args - Attribute arguments
   * @param {SourceLocation} location - Source location
   */
  constructor(name, args = null, location) {
    super('Attribute', location);
    this.name = name;
    this.args = args;
  }
}

/**
  * AST node for attribute-annotated declarations
  */
export class AnnotatedDeclNode extends ASTNode {
  /**
    * Creates an annotated declaration node
    * @param {DeclNode|FunctionNode|StructNode} declaration - Original declaration
    * @param {AttributeNode[]} attributes - Applied attributes
    * @param {SourceLocation} location - Source location
    */
  constructor(declaration, attributes, location) {
    super('AnnotatedDecl', location);
    this.declaration = declaration;
    this.attributes = attributes;
  }
}

/**
  * AST node for brace-enclosed initializer lists (array/struct initialization)
  */
export class InitializerNode extends ASTNode {
  /**
    * Creates an initializer node
    * @param {ASTNode[]} elements - Initializer elements (LiteralNode, InitializerNode for nested, or expression ASTNode)
    * @param {SourceLocation} location - Source location
    */
  constructor(elements, location) {
    super('Initializer', location);
    this.elements = elements;
  }
}

/**
 * AST node for C-style cast expressions
 */
export class CastNode extends ASTNode {
  /**
   * Creates a cast node
   * @param {TypeSpecNode} castType - Type being cast to
   * @param {ASTNode} operand - Expression being cast
   * @param {SourceLocation} location - Source location
   */
  constructor(castType, operand, location) {
    super('Cast', location);
    this.castType = castType;
    this.operand = operand;
  }

  /**
   * Returns a JSON-serializable representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      type: this.type,
      castType: this.castType.toJSON(),
      operand: this.operand ? this.operand.toJSON() : null,
      location: this.location
    };
  }
}
