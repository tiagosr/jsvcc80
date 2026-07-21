/**
 * Plugin registry for managing compiler extensions
 */
export class PluginRegistry {
  constructor() {
    /** @type {Map<string, Set<object>>} */
    this.plugins = new Map();
  }

  /**
   * Registers a plugin with the given category and name
   * @param {string} category - Plugin category (e.g., 'parser', 'preprocessor')
   * @param {string} name - Unique name for the plugin
   * @param {object} plugin - The plugin object
   */
  register(category, name, plugin) {
    if (!this.plugins.has(category)) {
      this.plugins.set(category, new Set());
    }
    /** @type {Set<object>} */ (this.plugins.get(category)).add(plugin);
    return this;
  }

  /**
   * Gets all plugins for a category
   * @param {string} category - Plugin category
   * @returns {object[]} Array of plugins
   */
  getPlugins(category) {
    const set = this.plugins.get(category);
    return set ? [...set] : [];
  }

  /**
   * Gets a specific plugin by name within a category
   * @param {string} category - Plugin category
   * @param {string} name - Plugin name
   * @returns {object|undefined} The plugin or undefined
   */
  getPlugin(category, name) {
    const set = this.plugins.get(category);
    if (!set) return undefined;
    for (const plugin of set) {
      if (plugin.name === name) return plugin;
    }
    return undefined;
  }

  /**
   * Clears all registered plugins
   */
  clear() {
    this.plugins.clear();
  }
}

/**
 * Global plugin registry instance
 */
export const globalRegistry = new PluginRegistry();
