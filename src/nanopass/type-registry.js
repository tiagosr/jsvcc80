import * as AST from '../ast/nodes.js';
import * as IL from './il.js';

/**
 * Registry for type aliases, struct/union definitions, and type resolution.
 * Manages typedef chains and struct/union size computation.
 */
export class TypeRegistry {
  /**
   * Creates a new type registry
   */
  constructor() {
    /** @type {Map<string, AST.TypeSpecNode>} */
    this.typedefs = new Map();
    /** @type {Map<string, {name: string, kind: string, fields: AST.StructFieldNode[], size: number, fieldOffsets: Map<string, number>}>} */
    this.structRegistry = new Map();
    this._registerBuiltInStructs();
    this._registerBuiltInTypedefs();
  }

  /**
   * Registers built-in struct types (FILE, etc.)
   */
  _registerBuiltInStructs() {
    const fileFields = [
      new AST.StructFieldNode(new AST.TypeSpecNode('char', true, false, false, null, null, 1), new AST.IdentifierNode('streamType', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('char', true, false, false, null, null, 1), new AST.IdentifierNode('flags', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('port', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('read', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('write', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('close', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('eof', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('error', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('available', null)),
      new AST.StructFieldNode(new AST.TypeSpecNode('int', true, false, false, null, null), new AST.IdentifierNode('flush', null)),
    ];
    this.structRegistry.set('FILE', {
      name: 'FILE',
      kind: 'struct',
      fields: fileFields,
      size: 18,
      fieldOffsets: new Map([['streamType', 0], ['flags', 1], ['port', 2], ['read', 4], ['write', 6], ['close', 8], ['eof', 10], ['error', 12], ['available', 14], ['flush', 16]])
    });
  }

  /**
   * Register a typedef name as an alias for a type
   * @param {AST.DeclNode} decl - Typedef declaration node
   */
  registerTypedef(decl) {
    const typeName = decl.name.name;
    const aliasedType = decl.type;
    this.typedefs.set(typeName, aliasedType);
  }

  /**
    * Register a struct/union definition in the type registry
    * @param {AST.StructNode} structNode - Struct/union definition node
    * @returns {{size: number, fieldOffsets: Map<string, number>}} Computed size and field offsets
    */
   registerStruct(structNode) {
     if (!structNode.name) return { size: 0, fieldOffsets: new Map() };
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

     return { size, fieldOffsets };
   }

  /**
    * Register built-in typedefs (nullptr_t, etc.)
    */
   _registerBuiltInTypedefs() {
     const nullptrTType = new AST.TypeSpecNode('bool', true, false, false, null, null);
     this.typedefs.set('nullptr_t', nullptrTType);
   }

  /**
    * Register a struct/union definition from a typedef declaration
    * @param {AST.DeclNode} decl - Typedef declaration with structNode
    * @returns {{size: number, fieldOffsets: Map<string, number>}} Computed size and field offsets
    */
   registerStructFromTypedef(decl) {
     if (!decl.structNode) return { size: 0, fieldOffsets: new Map() };
     const structNode = decl.structNode;
     const structName = decl.name.name;
     const size = computeStructSize(structNode.fields, structNode.kind, this.structRegistry);
     const fieldOffsets = computeFieldOffsets(structNode.fields, structNode.kind, this.structRegistry);

     this.structRegistry.set(structName, {
       name: structName,
       kind: structNode.kind,
       fields: structNode.fields,
       size,
       fieldOffsets
     });

     return { size, fieldOffsets };
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
}

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
 * @returns {Map<string, number>} Map from field name to byte offset
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
