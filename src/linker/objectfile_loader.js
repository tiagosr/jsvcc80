/**
 * Binary serialization and loading for VCC80 object files
 * Defines a compact binary format for .o files
 */

import { writeFileSync, readFileSync } from 'fs';
import {
  ObjectFile,
  ObjectSection,
  ObjectSymbol,
  ObjectRelocation,
  SymbolType,
  SymbolVisibility,
  SectionType,
  RelocationType
} from './objectfile.js';

const VCC80_MAGIC = 'VCC80O';
const VCC80_VERSION = 0x01;

const SymbolTypeMap = {
  'function': 0x00,
  'variable': 0x01,
  'section': 0x02,
  'absolute': 0x03,
  'label': 0x04,
  'equ': 0x05
};

const SymbolTypeReverse = Object.fromEntries(
  Object.entries(SymbolTypeMap).map(([k, v]) => [v, k])
);

const VisibilityMap = {
  'global': 0x00,
  'local': 0x01,
  'weak': 0x02
};

const VisibilityReverse = Object.fromEntries(
  Object.entries(VisibilityMap).map(([k, v]) => [v, k])
);

const SectionTypeMap = {
  'code': 0x00,
  'data': 0x01,
  'bss': 0x02,
  'rodata': 0x03
};

const SectionTypeReverse = Object.fromEntries(
  Object.entries(SectionTypeMap).map(([k, v]) => [v, k])
);

const RelocTypeMap = {
  'abs8': 0x00,
  'abs16': 0x01,
  'pcrel8': 0x02,
  'pcrel16': 0x03,
  'call': 0x04,
  'jp': 0x05,
  'ld': 0x06
};

const RelocTypeReverse = Object.fromEntries(
  Object.entries(RelocTypeMap).map(([k, v]) => [v, k])
);

const NO_SECTION = 0xFFFF;

/**
 * Encodes a string to UTF-8 bytes
 * @param {string} str - String to encode
 * @returns {Uint8Array} UTF-8 encoded bytes
 */
function encodeString(str) {
  return new TextEncoder().encode(str);
}

/**
 * Decodes UTF-8 bytes to a string
 * @param {Uint8Array} bytes - Bytes to decode
 * @returns {string} Decoded string
 */
function decodeString(bytes) {
  return new TextDecoder().decode(bytes);
}

/**
 * Binary writer for building object file bytes
 */
class BinaryWriter {
  /**
   * Creates a new binary writer
   */
  constructor() {
    this.buffer = [];
  }

  /**
   * Writes a single byte
   * @param {number} value - Byte value
   */
  writeByte(value) {
    this.buffer.push(value & 0xFF);
  }

  /**
   * Writes a 16-bit unsigned integer (little-endian)
   * @param {number} value - Value to write
   */
  writeUint16(value) {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
  }

  /**
   * Writes a 32-bit unsigned integer (little-endian)
   * @param {number} value - Value to write
   */
  writeUint32(value) {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    this.buffer.push((value >> 24) & 0xFF);
  }

  /**
   * Writes a signed 32-bit integer (little-endian)
   * @param {number} value - Value to write
   */
  writeInt32(value) {
    const u = value >>> 0;
    this.writeUint32(u);
  }

  /**
   * Writes a length-prefixed string
   * @param {string} str - String to write
   */
  writeString(str) {
    const encoded = encodeString(str);
    this.writeUint16(encoded.length);
    for (const byte of encoded) {
      this.buffer.push(byte);
    }
  }

  /**
   * Writes raw bytes with length prefix
   * @param {Uint8Array} data - Bytes to write
   */
  writeBytes(data) {
    this.writeUint32(data.length);
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data[i]);
    }
  }

  /**
   * Returns the complete buffer as a Uint8Array
   * @returns {Uint8Array} Serialized bytes
   */
  toBytes() {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Binary reader for parsing object file bytes
 */
class BinaryReader {
  /**
   * Creates a new binary reader
   * @param {Uint8Array} data - Data to read from
   */
  constructor(data) {
    this.data = data;
    this.pos = 0;
  }

  /**
   * Checks if there are more bytes to read
   * @returns {boolean} True if more bytes available
   */
  hasMore() {
    return this.pos < this.data.length;
  }

  /**
   * Reads a single byte
   * @returns {number} Byte value
   */
  readByte() {
    const value = this.data[this.pos++];
    return value;
  }

  /**
   * Reads a 16-bit unsigned integer (little-endian)
   * @returns {number} Value
   */
  readUint16() {
    const lo = this.data[this.pos++];
    const hi = this.data[this.pos++];
    return lo | (hi << 8);
  }

  /**
   * Reads a 32-bit unsigned integer (little-endian)
   * @returns {number} Value
   */
  readUint32() {
    const b0 = this.data[this.pos++];
    const b1 = this.data[this.pos++];
    const b2 = this.data[this.pos++];
    const b3 = this.data[this.pos++];
    return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
  }

  /**
   * Reads a signed 32-bit integer (little-endian)
   * @returns {number} Value
   */
  readInt32() {
    return this.readUint32() | 0;
  }

  /**
   * Reads a length-prefixed string
   * @returns {string} String value
   */
  readString() {
    const length = this.readUint16();
    const slice = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return decodeString(slice);
  }

  /**
   * Reads raw bytes with length prefix
   * @returns {Uint8Array} Bytes
   */
  readBytes() {
    const length = this.readUint32();
    const slice = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return slice;
  }
}

/**
 * Serializes an ObjectFile to binary format
 * @param {ObjectFile} objectFile - Object file to serialize
 * @returns {Uint8Array} Binary data
 */
export function serializeObjectFile(objectFile) {
  const writer = new BinaryWriter();

  const magicBytes = encodeString(VCC80_MAGIC);
  for (const b of magicBytes) {
    writer.writeByte(b);
  }
  writer.writeByte(VCC80_VERSION);
  writer.writeByte(0x00);

  writer.writeUint16(objectFile.sections.length);
  const sectionIndexMap = new Map();

  for (let i = 0; i < objectFile.sections.length; i++) {
    const section = objectFile.sections[i];
    sectionIndexMap.set(section.name, i);

    writer.writeString(section.name);
    writer.writeByte(SectionTypeMap[section.type] ?? 0xFF);
    writer.writeBytes(section.contents);

    const relocs = section.relocations;
    writer.writeUint16(relocs.length);
    for (const reloc of relocs) {
      writer.writeUint32(reloc.offset);
      writer.writeString(reloc.symbolName);
      writer.writeByte(RelocTypeMap[reloc.type] ?? 0x00);
      writer.writeInt32(reloc.addend);
    }
  }

  writer.writeUint16(objectFile.symbols.length);
  for (const symbol of objectFile.symbols) {
    writer.writeString(symbol.name);
    writer.writeByte(SymbolTypeMap[symbol.type] ?? 0xFF);
    writer.writeByte(VisibilityMap[symbol.visibility] ?? 0x00);
    writer.writeUint32(symbol.value);
    if (symbol.section && sectionIndexMap.has(symbol.section)) {
      writer.writeUint16(sectionIndexMap.get(symbol.section));
    } else {
      writer.writeUint16(NO_SECTION);
    }
    writer.writeUint32(symbol.size || 0);
    writer.writeUint32(symbol.line || 0);
    writer.writeString(symbol.sourceFile || '');
  }

  return writer.toBytes();
}

/**
 * Deserializes binary data into an ObjectFile
 * @param {Uint8Array} data - Binary object file data
 * @returns {ObjectFile} Deserialized object file
 */
export function deserializeObjectFile(data) {
  const reader = new BinaryReader(data);

  const magicBytes = reader.data.slice(0, 6);
  reader.pos = 6;
  const magic = decodeString(magicBytes);
  if (magic !== VCC80_MAGIC) {
    throw new Error(`Invalid object file: bad magic "${magic}"`);
  }

  const version = reader.readByte();
  if (version !== VCC80_VERSION) {
    throw new Error(`Unsupported object file version: ${version}`);
  }

  reader.readByte();

  const sectionCount = reader.readUint16();
  const sectionNames = [];

  const objectFile = new ObjectFile('loaded.o');

  for (let i = 0; i < sectionCount; i++) {
    const name = reader.readString();
    const typeCode = reader.readByte();
    const type = SectionTypeReverse[typeCode] ?? 'code';
    const contents = reader.readBytes();

    const section = new ObjectSection(name, type, contents);

    const relocCount = reader.readUint16();
    for (let j = 0; j < relocCount; j++) {
      const offset = reader.readUint32();
      const symbolName = reader.readString();
      const relocTypeCode = reader.readByte();
      const relocType = RelocTypeReverse[relocTypeCode] ?? 'abs8';
      const addend = reader.readInt32();

      const reloc = new ObjectRelocation(offset, symbolName, relocType, name, addend);
      section.addRelocation(reloc);
    }

    sectionNames.push(name);
    objectFile.addSection(section);
  }

  const symbolCount = reader.readUint16();
  for (let i = 0; i < symbolCount; i++) {
    const sname = reader.readString();
    const sTypeCode = reader.readByte();
    const sType = SymbolTypeReverse[sTypeCode] ?? 'variable';
    const sVisCode = reader.readByte();
    const sVis = VisibilityReverse[sVisCode] ?? 'global';
    const sValue = reader.readUint32();
    const sSectionIdx = reader.readUint16();
    const sSize = reader.readUint32();
    const sLine = reader.readUint32();
    const sSourceFile = reader.readString();

    const sSection = sSectionIdx !== NO_SECTION ? sectionNames[sSectionIdx] : null;
    const symbol = new ObjectSymbol(sname, sType, sVis, sValue, sSection, sSize, sLine, sSourceFile || null);
    objectFile.addSymbol(symbol);
  }

  return objectFile;
}

/**
 * Loads an object file from disk
 * @param {string} filePath - Path to .o file
 * @returns {ObjectFile} Loaded object file
 */
export function loadObjectFile(filePath) {
  const data = readFileSync(filePath);
  return deserializeObjectFile(data);
}

/**
 * Saves an object file to disk
 * @param {ObjectFile} objectFile - Object file to save
 * @param {string} filePath - Output file path
 */
export function saveObjectFile(objectFile, filePath) {
  const data = serializeObjectFile(objectFile);
  writeFileSync(filePath, Buffer.from(data));
}

/**
 * Checks if binary data is a valid VCC80 object file
 * @param {Uint8Array} data - Data to check
 * @returns {boolean} True if valid object file
 */
export function isObjectFile(data) {
  if (data.length < 8) {
    return false;
  }
  const magic = decodeString(data.slice(0, 6));
  return magic === VCC80_MAGIC;
}
