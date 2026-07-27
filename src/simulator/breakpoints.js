/**
 * Breakpoint manager for simulator debugging.
 * Tracks breakpoints by PC address with optional callbacks.
 */

/**
 * Breakpoint definition.
 * @typedef {Object} Breakpoint
 * @property {number} pc - Program counter address.
 * @property {() => void} [callback] - Optional callback when breakpoint is hit.
 */

/**
 * Breakpoint manager - stores and queries breakpoints.
 */
export class BreakpointManager {
  constructor() {
    /** @type {Map<number, Breakpoint>} */ this._breakpoints = new Map();
  }

  /** Add a breakpoint at a PC address.
   * @param {number} pc - Program counter address.
   * @param {() => void} [callback] - Optional callback when breakpoint is hit.
   * @returns {number} Breakpoint ID (PC address).
   */
  add(pc, callback) {
    const bp = { pc: pc & 0xFFFF, callback };
    this._breakpoints.set(bp.pc, bp);
    return bp.pc;
  }

  /** Remove a breakpoint at a PC address.
   * @param {number} pc - Program counter address.
   * @returns {boolean} True if breakpoint was removed.
   */
  remove(pc) {
    return this._breakpoints.delete(pc & 0xFFFF);
  }

  /** Check if a breakpoint exists at a PC address.
   * @param {number} pc - Program counter address.
   * @returns {boolean}
   */
  has(pc) { return this._breakpoints.has(pc); }

  /** Get the breakpoint at a PC address.
   * @param {number} pc - Program counter address.
   * @returns {Breakpoint|undefined}
   */
  get(pc) { return this._breakpoints.get(pc & 0xFFFF); }

  /** Get all breakpoints.
   * @returns {Breakpoint[]}
   */
  getAll() { return Array.from(this._breakpoints.values()); }

  /** Clear all breakpoints. */
  clear() { this._breakpoints.clear(); }

  /** Invoke callback for breakpoint at the given PC.
   * @param {number} pc - Program counter address.
   */
  invoke(pc) {
    const bp = this._breakpoints.get(pc & 0xFFFF);
    if (bp && bp.callback) bp.callback();
  }
}
