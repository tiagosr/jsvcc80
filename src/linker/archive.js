/**
 * Static library archive format for VCC80
 * Containers holding multiple .o object files with a manifest
 */

import { writeFileSync, readFileSync } from 'fs';
import { ObjectFile } from './objectfile.js';
import {
  serializeObjectFile,
  deserializeObjectFile,
  isObjectFile
} from './objectfile_loader.js';

const VCC80A_MAGIC = 'VCC80A';
const VCC80A_VERSION = 0x01;

/**
 * Metadata for a single member within an archive
 */
export class ArchiveMember {
  /**
   * Creates an archive member entry
   * @param {string} name - Member name (typically filename)
   * @param {ObjectFile} objectFile - The object file contents
   */
  constructor(name, objectFile) {
    this.name = name;
    this.objectFile = objectFile;
  }

  /**
   * Serializes member to plain object
   * @returns {Object} JSON-serializable representation
   */
  toJSON() {
    return {
      name: this.name,
      objectFile: this.objectFile.toJSON()
    };
  }
}

/**
 * Static library archive - container for multiple object files
 */
export class Archive {
  /**
   * Creates a new archive
   * @param {string} name - Archive name
   */
  constructor(name) {
    this.name = name;
    /** @type {ArchiveMember[]} */
    this.members = [];
  }

  /**
   * Adds an object file as a member of the archive
   * @param {string} memberName - Name for this member
   * @param {ObjectFile} objectFile - Object file to add
   */
  addMember(memberName, objectFile) {
    this.members.push(new ArchiveMember(memberName, objectFile));
  }

  /**
   * Gets a member by name
   * @param {string} name - Member name to look up
   * @returns {ArchiveMember|null} Member or null if not found
   */
  getMember(name) {
    return this.members.find(m => m.name === name) || null;
  }

  /**
   * Gets all object files from the archive
   * @returns {ObjectFile[]} Array of object files
   */
  getObjectFiles() {
    return this.members.map(m => m.objectFile);
  }

  /**
   * Lists all member names
   * @returns {string[]} Array of member names
   */
  listMembers() {
    return this.members.map(m => m.name);
  }

  /**
   * Serializes archive to plain object
   * @returns {Object} JSON-serializable representation
   */
  toJSON() {
    return {
      name: this.name,
      members: this.members.map(m => m.toJSON())
    };
  }
}

/**
 * Serializes an Archive to binary format
 * Format: VCC80A magic + version + member count + members
 * Each member: name string + serialized object file data
 * @param {Archive} archive - Archive to serialize
 * @returns {Uint8Array} Binary archive data
 */
export function serializeArchive(archive) {
  const chunks = [];

  const magicBytes = new TextEncoder().encode(VCC80A_MAGIC);
  chunks.push(magicBytes);

  const header = new Uint8Array(4);
  header[0] = VCC80A_VERSION;
  header[1] = 0x00;
  header[2] = archive.members.length & 0xFF;
  header[3] = (archive.members.length >> 8) & 0xFF;
  chunks.push(header);

  for (const member of archive.members) {
    const serialized = serializeObjectFile(member.objectFile);

    const nameBytes = new TextEncoder().encode(member.name);
    const nameLen = nameBytes.length;

    const nameLenBuf = new Uint8Array(2);
    nameLenBuf[0] = nameLen & 0xFF;
    nameLenBuf[1] = (nameLen >> 8) & 0xFF;

    const dataLen = serialized.length;
    const dataLenBuf = new Uint8Array(4);
    dataLenBuf[0] = dataLen & 0xFF;
    dataLenBuf[1] = (dataLen >> 8) & 0xFF;
    dataLenBuf[2] = (dataLen >> 16) & 0xFF;
    dataLenBuf[3] = (dataLen >> 24) & 0xFF;

    chunks.push(nameLenBuf);
    chunks.push(nameBytes);
    chunks.push(dataLenBuf);
    chunks.push(serialized);
  }

  const totalLen = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Deserializes binary data into an Archive
 * @param {Uint8Array} data - Binary archive data
 * @returns {Archive} Deserialized archive
 */
export function deserializeArchive(data) {
  if (data.length < 10) {
    throw new Error('Archive data too short');
  }

  const magic = new TextDecoder().decode(data.slice(0, 6));
  if (magic !== VCC80A_MAGIC) {
    throw new Error(`Invalid archive: bad magic "${magic}"`);
  }

  const version = data[6];
  if (version !== VCC80A_VERSION) {
    throw new Error(`Unsupported archive version: ${version}`);
  }

  const memberCount = data[8] | (data[9] << 8);

  const archive = new Archive('loaded.a');
  let pos = 10;

  for (let i = 0; i < memberCount; i++) {
    const nameLen = data[pos] | (data[pos + 1] << 8);
    pos += 2;

    const nameBytes = data.slice(pos, pos + nameLen);
    const memberName = new TextDecoder().decode(nameBytes);
    pos += nameLen;

    const dataLen = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24);
    pos += 4;

    const objData = data.slice(pos, pos + dataLen);
    pos += dataLen;

    const objectFile = deserializeObjectFile(objData);
    archive.addMember(memberName, objectFile);
  }

  return archive;
}

/**
 * Loads an archive from disk
 * @param {string} filePath - Path to .a file
 * @returns {Archive} Loaded archive
 */
export function loadArchive(filePath) {
  const data = readFileSync(filePath);
  return deserializeArchive(data);
}

/**
 * Saves an archive to disk
 * @param {Archive} archive - Archive to save
 * @param {string} filePath - Output file path
 */
export function saveArchive(archive, filePath) {
  const data = serializeArchive(archive);
  writeFileSync(filePath, Buffer.from(data));
}

/**
 * Checks if binary data is a valid VCC80 archive
 * @param {Uint8Array} data - Data to check
 * @returns {boolean} True if valid archive
 */
export function isArchive(data) {
  if (data.length < 10) {
    return false;
  }
  const magic = new TextDecoder().decode(data.slice(0, 6));
  return magic === VCC80A_MAGIC;
}

/**
 * Creates an archive from an array of object files
 * @param {string} archiveName - Name for the archive
 * @param {ObjectFile[]} objectFiles - Object files to archive
 * @param {string[]} [memberNames] - Optional names for each member
 * @returns {Archive} Created archive
 */
export function createArchive(archiveName, objectFiles, memberNames = null) {
  const archive = new Archive(archiveName);
  for (let i = 0; i < objectFiles.length; i++) {
    const name = memberNames ? memberNames[i] : `member${i}.o`;
    archive.addMember(name, objectFiles[i]);
  }
  return archive;
}
