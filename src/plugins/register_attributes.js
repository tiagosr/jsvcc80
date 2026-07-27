/**
 * Attribute handler registration for calling conventions
 */
import { globalRegistry } from '../core/plugins.js';
import { CdeclAttributeHandler, FastcallAttributeHandler, CalleeAttributeHandler, NewSdccAttributeHandler } from '../plugins/attribute-handlers.js';

/**
 * Registers the default attribute handlers
 */
export function registerAttributeHandlers() {
  globalRegistry.register('attribute', '__cdecl__', new CdeclAttributeHandler());
  globalRegistry.register('attribute', '__fastcall__', new FastcallAttributeHandler());
  globalRegistry.register('attribute', '__callee__', new CalleeAttributeHandler());
  globalRegistry.register('attribute', '__new_sdcc__', new NewSdccAttributeHandler());
}

registerAttributeHandlers();
