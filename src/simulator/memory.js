/**
 * Flat 64KB Z80 memory with read/write hooks and optional backing file support.
 */

const MEMORY_SIZE = 0x10000; // 64KB

/**
 * Callback invoked on every memory read.
 * @param {number} addr - Memory address being read.
 * @param {number} value - Value that will be returned.
 * @returns {number} Modified value (return original to pass through).
 */
export function onMemoryReadHook(_addr, value) { return value; }

/**
 * Callback invoked on every memory write.
 * @param {number} addr - Memory address being written.
 * @param {number} value - Value being written.
 * @returns {number} Modified value (return original to pass through).
 */
export function onMemoryWriteHook(_addr, value) { return value; }

/**
 * Callback invoked when reading from a mapped memory region.
 * @param {number} addr - Memory address being read.
 * @returns {number|null} Mapped value or null for unmapped.
 */
export function onMemoryMapRead(_addr) { return null; }

/**
 * Callback invoked when writing to a mapped memory region.
 * @param {number} addr
 * @param {number} value
 * @returns {boolean} True if write was handled.
 */
export function onMemoryMapWrite(_addr, _value) { return false; }

/**
 * Memory region definition for mapped regions.
 * @typedef {Object} MemoryRegion
 * @property {number} start - Start address.
 * @property {number} end - End address (inclusive).
 * @property {number} [mask] - Value mask for reads.
 */

/**
 * Flat 64KB memory with optional hooks.
 */
export class Memory {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.trackAccess] - Track read/write access history.
   * @param {number} [options.fill] - Value to fill memory with (default 0xFF).
   */
   constructor(options = {}) {
     /** @type {boolean} */ this.trackAccess = options.trackAccess || false;
     /** @type {Uint8Array} */ this.buffer = new Uint8Array(MEMORY_SIZE);
     const fill = options.fill || 0xFF;
     this.buffer.fill(fill);
     /** @type {{read:number[],write:number[]}|null} */ this.accessLog = this.trackAccess ? { read: [], write: [] } : null;
     /** @type {MemoryRegion[]} */ this.regions = [];
     /** @type {import('./watcher.js').WatchManager|null} */ this.watcher = null;
   }

  /** Fill memory with a value.
   * @param {number} value
   */
  fill(value) { this.buffer.fill(value & 0xFF); }

  /** Clear memory to zeros. */
  clear() { this.buffer.fill(0); }

  /** Add a mapped memory region.
   * @param {MemoryRegion} region
   */
  addRegion(region) { this.regions.push(region); }

  /** Remove all mapped regions. */
  removeRegions() { this.regions = []; }

  /** Read a byte from memory.
   * @param {number} addr
   * @returns {number}
   */
  readByte(addr) {
    addr = addr & 0xFFFF;
    if (this.trackAccess) this.accessLog.read.push(addr);
    if (this.watcher) this.watcher.notify(addr, undefined, 'read');
    for (const region of this.regions) {
      if (addr >= region.start && addr <= region.end) {
        let value = this.buffer[addr];
        if (region.mask !== undefined) value &= region.mask;
        return value;
      }
    }
    return this.buffer[addr];
  }

  /** Write a byte to memory.
   * @param {number} addr
   * @param {number} value
   */
  writeByte(addr, value) {
    addr = addr & 0xFFFF;
    value = value & 0xFF;
    if (this.trackAccess) this.accessLog.write.push(addr);
    if (this.watcher) this.watcher.notify(addr, value, 'write');
    for (const region of this.regions) {
      if (addr >= region.start && addr <= region.end) {
        if (region.mask !== undefined) value &= region.mask;
        this.buffer[addr] = value;
        return;
      }
    }
    this.buffer[addr] = value;
  }

   /** Read a 16-bit value from memory (little-endian).
    * @param {number} addr
    * @returns {number}
    */
   readWord(addr) {
     return this.readByte(addr) | (this.readByte(addr + 1) << 8);
   }

   /** Write a 16-bit value to memory (little-endian).
    * @param {number} addr
    * @param {number} value
    */
   writeWord(addr, value) {
     this.writeByte(addr, value & 0xFF);
     this.writeByte(addr + 1, (value >> 8) & 0xFF);
  }

  /** Get the raw buffer.
   * @returns {Uint8Array}
   */
  getBuffer() { return this.buffer; }

  /** Get access log.
   * @returns {{read:number[],write:number[]}}
   */
  getAccessLog() {
    if (!this.trackAccess) throw new Error('Access tracking not enabled');
    return { read: [...this.accessLog.read], write: [...this.accessLog.write] };
  }

  /** Clear access log. */
  clearAccessLog() {
    if (this.trackAccess) {
      this.accessLog.read.length = 0;
      this.accessLog.write.length = 0;
    }
  }

  /** Get memory size.
    * @returns {number}
    */
  getSize() { return MEMORY_SIZE; }
}
