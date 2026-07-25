/**
 * Memory watch/probe system for debugging simulator.
 * Supports address breakpoints, value watches, and access logging.
 */

/**
 * Callback invoked when a watched address is accessed.
 * @callback WatchCallback
 * @param {number} addr - Memory address accessed.
 * @param {number} [value] - Value written (undefined for reads).
 * @param {'read'|'write'} type - Access type.
 */

/**
 * Memory watch definition.
 * @typedef {Object} Watch
 * @property {number} addr - Address to watch.
 * @property {WatchCallback} callback
 * @property {'read'|'write'|'access'} [type] - Watch type (default: 'access').
 */

/**
 * Memory watch/probe manager.
 */
export class WatchManager {
  constructor() {
    /** @type {Map<number, Watch[]>} */ this.watches = new Map();
    /** @type {Set<number>} */ this.watchedAddresses = new Set();
  }

  /** Add a watch on a memory address.
   * @param {number} addr
   * @param {WatchCallback} callback
   * @param {'read'|'write'|'access'} [type]
   * @returns {Watch}
   */
  addWatch(addr, callback, type = 'access') {
    const watch = { addr: addr & 0xFFFF, callback, type };
    if (!this.watches.has(addr)) this.watches.set(addr, []);
    this.watches.get(addr).push(watch);
    this.watchedAddresses.add(addr & 0xFFFF);
    return watch;
  }

  /** Remove a specific watch.
   * @param {number} addr
   * @param {WatchCallback} callback
   * @returns {boolean}
   */
  removeWatch(addr, callback) {
    const addrMasked = addr & 0xFFFF;
    const list = this.watches.get(addrMasked);
    if (!list) return false;
    const idx = list.findIndex(w => w.callback === callback);
    if (idx >= 0) {
      list.splice(idx, 1);
      if (list.length === 0) {
        this.watches.delete(addrMasked);
        this.watchedAddresses.delete(addrMasked);
      }
      return true;
    }
    return false;
  }

  /** Remove all watches on an address.
   * @param {number} addr
   */
  removeWatches(addr) {
    const addrMasked = addr & 0xFFFF;
    this.watches.delete(addrMasked);
    this.watchedAddresses.delete(addrMasked);
  }

  /** Clear all watches. */
  clear() {
    this.watches.clear();
    this.watchedAddresses.clear();
  }

  /** Check if any watches exist for an address.
   * @param {number} addr
   * @returns {boolean}
   */
  hasWatches(addr) { return this.watchedAddresses.has(addr & 0xFFFF); }

  /** Notify all watches for a memory access.
   * @param {number} addr
   * @param {number} [value]
   * @param {'read'|'write'} type
   */
  notify(addr, value, type) {
    const addrMasked = addr & 0xFFFF;
    const list = this.watches.get(addrMasked);
    if (!list) return;
    for (const watch of list) {
      if (watch.type === 'access' || watch.type === type) {
        watch.callback(addrMasked, value, type);
      }
    }
  }
}
