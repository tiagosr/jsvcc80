/**
 * Z80 optimization pass registration
 */
import { globalRegistry } from '../core/plugins.js';
import { PeepholeOptimizer, RegisterAllocator, InlineOptimizer } from '../nanopass/optimizations.js';

/**
 * Registers the default Z80 optimization passes
 */
export function registerOptimizationPasses() {
  globalRegistry.register('optimization_pass', 'peephole', new PeepholeOptimizer());
  globalRegistry.register('optimization_pass', 'register_allocator', new RegisterAllocator());
  globalRegistry.register('optimization_pass', 'inline', new InlineOptimizer());
}

registerOptimizationPasses();
