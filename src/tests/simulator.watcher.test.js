/**
 * Tests for the Z80 Watch Manager module.
 * Covers adding/removing watches, notification, and address masking.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { WatchManager } from '../simulator/watcher.js';

describe('Simulator - Watch Manager', () => {
  it('should add and notify watches', () => {
    const wm = new WatchManager();
    let notified = false;
    wm.addWatch(0x100, () => { notified = true; });
    assert.strictEqual(wm.hasWatches(0x100), true);
    wm.notify(0x100, undefined, 'read');
    assert.strictEqual(notified, true);
  });

  it('should support different watch types', () => {
    const wm = new WatchManager();
    let readCalled = false;
    let writeCalled = false;
    wm.addWatch(0x200, () => { readCalled = true; }, 'read');
    wm.addWatch(0x200, () => { writeCalled = true; }, 'write');
    wm.notify(0x200, undefined, 'read');
    assert.strictEqual(readCalled, true);
    assert.strictEqual(writeCalled, false);
    wm.notify(0x200, 0x42, 'write');
    assert.strictEqual(writeCalled, true);
  });

  it('should remove specific watches', () => {
    const wm = new WatchManager();
    const cb = () => {};
    wm.addWatch(0x100, cb);
    assert.strictEqual(wm.removeWatch(0x100, cb), true);
    assert.strictEqual(wm.hasWatches(0x100), false);
  });

  it('should remove all watches on an address', () => {
    const wm = new WatchManager();
    wm.addWatch(0x100, () => {});
    wm.addWatch(0x100, () => {});
    wm.removeWatches(0x100);
    assert.strictEqual(wm.hasWatches(0x100), false);
  });

  it('should clear all watches', () => {
    const wm = new WatchManager();
    wm.addWatch(0x100, () => {});
    wm.addWatch(0x200, () => {});
    wm.clear();
    assert.strictEqual(wm.hasWatches(0x100), false);
    assert.strictEqual(wm.hasWatches(0x200), false);
  });

  it('should mask addresses to 16 bits', () => {
    const wm = new WatchManager();
    let hit = false;
    wm.addWatch(0x1234, () => { hit = true; });
    wm.notify(0x1234, undefined, 'read');
    assert.strictEqual(hit, true);
  });

  it('should pass value to watch callback', () => {
    const wm = new WatchManager();
    let receivedValue = -1;
    wm.addWatch(0x100, (_addr, value) => { receivedValue = value; }, 'write');
    wm.notify(0x100, 0x42, 'write');
    assert.strictEqual(receivedValue, 0x42);
  });
});
