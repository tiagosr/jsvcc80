/**
 * Tests for the Z80 IO Handler module.
 * Covers port registration, default handlers, and I/O operations.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { IOHandler } from '../simulator/io.js';

describe('Simulator - IO Handler', () => {
  it('should handle unregistered ports with default 0xFF', () => {
    const handler = new IOHandler();
    assert.strictEqual(handler.handleIn(0x01), 0xFF);
    handler.handleOut(0x01, 0x42);
  });

  it('should register and invoke port handlers', () => {
    const handler = new IOHandler();
    let called = false;
    handler.register(0x10, (port) => {
      called = true;
      assert.strictEqual(port, 0x10);
      return 0x55;
    });
    assert.strictEqual(handler.handleIn(0x10), 0x55);
    assert.strictEqual(called, true);
  });

  it('should handle OUT operations', () => {
    const handler = new IOHandler();
    let outValue = -1;
    handler.register(0x20, (_port, value) => { outValue = value; });
    handler.handleOut(0x20, 0x78);
    assert.strictEqual(outValue, 0x78);
  });

  it('should use default handler for unregistered ports', () => {
    const handler = new IOHandler();
    handler.setDefault((_port) => 0xFF);
    assert.strictEqual(handler.handleIn(0x99), 0xFF);
  });

  it('should mask port and value to 8 bits', () => {
    const handler = new IOHandler();
    handler.register(0x05, () => 0x123);
    assert.strictEqual(handler.handleIn(0x305), 0x23);
  });

  it('should check if port has handler', () => {
    const handler = new IOHandler();
    assert.strictEqual(handler.hasHandler(0x10), false);
    handler.register(0x10, () => 0);
    assert.strictEqual(handler.hasHandler(0x10), true);
  });

  it('should clear all handlers', () => {
    const handler = new IOHandler();
    handler.register(0x10, () => 0);
    handler.setDefault(() => 0);
    handler.clear();
    assert.strictEqual(handler.hasHandler(0x10), false);
    assert.strictEqual(handler.hasHandler(0x99), false);
  });
});
