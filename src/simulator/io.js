/**
 * Z80 port I/O callback system.
 * Handles IN/OUT instructions with registered port handlers.
 */

/**
 * Callback for handling port I/O operations.
 * @callback IOHandler
 * @param {number} port - Port address (0-255).
 * @param {number} [value] - Value to write (undefined for IN).
 * @returns {number|null} Value read from port, or null if unhandled.
 */

/**
 * Port I/O handler registry.
 */
export class IOHandler {
  constructor() {
    /** @type {Map<number, IOHandler>} */ this.handlers = new Map();
    /** @type {IOHandler|null} */ this.defaultHandler = null;
  }

  /** Register a handler for a specific port.
   * @param {number} port - Port address (0-255).
   * @param {IOHandler} handler
   */
  register(port, handler) {
    this.handlers.set(port & 0xFF, handler);
  }

  /** Register a default handler for unhandled ports.
   * @param {IOHandler} handler
   */
  setDefault(handler) { this.defaultHandler = handler; }

  /** Remove all handlers. */
  clear() {
    this.handlers.clear();
    this.defaultHandler = null;
  }

  /** Handle an IN instruction (read from port).
   * @param {number} port - Port address.
   * @returns {number} Value read, or 0xFF if unhandled.
   */
  handleIn(port) {
    const p = port & 0xFF;
    const handler = this.handlers.get(p);
    if (handler) {
      const result = handler(p);
      if (result !== null) return result & 0xFF;
    }
    if (this.defaultHandler) {
      return this.defaultHandler(p) & 0xFF;
    }
    return 0xFF; // Default: return 0xFF for unhandled ports
  }

  /** Handle an OUT instruction (write to port).
   * @param {number} port
   * @param {number} value
   */
  handleOut(port, value) {
    const p = port & 0xFF;
    const handler = this.handlers.get(p);
    if (handler) {
      handler(p, value & 0xFF);
      return;
    }
    if (this.defaultHandler) {
      this.defaultHandler(p, value & 0xFF);
      return;
    }
  }

  /** Check if a port has a registered handler.
   * @param {number} port
   * @returns {boolean}
   */
  hasHandler(port) {
    return this.handlers.has(port & 0xFF) || this.defaultHandler !== null;
  }
}
