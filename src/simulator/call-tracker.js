/**
 * Call depth tracker for step-into/step-over functionality.
 * Tracks the nesting depth of CALL/RST instructions during simulation.
 */

/**
 * Call depth tracker - monitors CALL/RST/RET instruction nesting.
 */
export class CallTracker {
  constructor() {
    /** @type {number} */ this._depth = 0;
  }

  /** Current call nesting depth.
   * @returns {number}
   */
  get depth() { return this._depth; }

  /** Called when a CALL or RST instruction executes (PC jumps to target, return address pushed).
   * Increments call depth.
   */
  onCall() { this._depth++; }

  /** Called when a RET, RETI, or RETN instruction executes (PC pops from stack).
   * Decrements call depth. Never goes below 0.
   */
  onRet() {
    if (this._depth > 0) this._depth--;
  }

  /** Reset tracker to initial state. */
  reset() { this._depth = 0; }
}
