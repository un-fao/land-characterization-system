// ============================================================================
// LEGEND PLUGIN REGISTRY SYSTEM
// ============================================================================

import {
  ReferenceLegendPlugin,
  RuleSet,
  RuleSetMetadata,
  ValidationResult,
  ValidationError
} from './semantic-types';
import { loadBuiltInPlugins } from './PluginLoader';

/**
 * Central registry for managing reference legend plugins
 */
export class LegendRegistry {
  private plugins: Map<string, ReferenceLegendPlugin> = new Map();
  private loadedUrls: Set<string> = new Set();
  
  /**
   * Register a plugin
   */
  register(plugin: ReferenceLegendPlugin): void {
    if (this.plugins.has(plugin.metadata.id)) {
      console.warn(`Plugin ${plugin.metadata.id} already registered, overwriting`);
    }
    
    // Validate plugin before registration
    const validation = this.validatePlugin(plugin);
    if (!validation.valid) {
      throw new Error(
        `Invalid plugin: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }
    
    this.plugins.set(plugin.metadata.id, plugin);
    console.log(`Registered plugin: ${plugin.metadata.name} v${plugin.metadata.version}`);
  }
  
  /**
   * Unregister a plugin
   */
  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }
  
  /**
   * Get a specific plugin
   */
  get(id: string): ReferenceLegendPlugin | undefined {
    return this.plugins.get(id);
  }
  
  /**
   * Get all registered plugins
   */
  getAll(): ReferenceLegendPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get plugin metadata list
   */
  getMetadataList(): RuleSetMetadata[] {
    return this.getAll().map(p => p.metadata);
  }
  
  /**
   * Check if plugin exists
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }
  
  /**
   * Load plugin from URL
   */
  async loadFromURL(url: string): Promise<ReferenceLegendPlugin> {
    if (this.loadedUrls.has(url)) {
      throw new Error(`Plugin from ${url} already loaded`);
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin: ${response.statusText}`);
      }
      
      const pluginData = await response.json();
      const plugin = this.parsePluginData(pluginData);
      
      this.register(plugin);
      this.loadedUrls.add(url);
      
      return plugin;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load plugin from ${url}: ${message}`);
    }
  }
  
  /**
   * Load plugin from file
   */
  async loadFromFile(file: File): Promise<ReferenceLegendPlugin> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const pluginData = JSON.parse(e.target?.result as string);
          const plugin = this.parsePluginData(pluginData);
          this.register(plugin);
          resolve(plugin);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          reject(new Error(`Failed to parse plugin file: ${message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  /**
   * Parse plugin data from JSON
   */
  private parsePluginData(data: any): ReferenceLegendPlugin {
    // Handle different formats
    if (data.metadata && data.ruleSet) {
      // Direct plugin format
      return {
        metadata: data.metadata,
        ruleSet: data.ruleSet as RuleSet
      };
    } else if (data.metadata && data.rules && data.classes) {
      // RuleSet format - wrap it
      return {
        metadata: data.metadata,
        ruleSet: data as RuleSet
      };
    } else {
      throw new Error('Invalid plugin format');
    }
  }
  
  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: ReferenceLegendPlugin): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Validate metadata
    if (!plugin.metadata) {
      errors.push({
        ruleId: 0,
        field: 'metadata',
        message: 'Plugin metadata is required',
        severity: 'critical'
      });
    } else {
      if (!plugin.metadata.id) {
        errors.push({
          ruleId: 0,
          field: 'metadata.id',
          message: 'Plugin ID is required',
          severity: 'critical'
        });
      }
      if (!plugin.metadata.name) {
        errors.push({
          ruleId: 0,
          field: 'metadata.name',
          message: 'Plugin name is required',
          severity: 'error'
        });
      }
      if (!plugin.metadata.version) {
        errors.push({
          ruleId: 0,
          field: 'metadata.version',
          message: 'Plugin version is required',
          severity: 'error'
        });
      }
    }
    
    // Validate ruleSet
    if (!plugin.ruleSet) {
      errors.push({
        ruleId: 0,
        field: 'ruleSet',
        message: 'Plugin ruleSet is required',
        severity: 'critical'
      });
    } else {
      if (!plugin.ruleSet.rules || !Array.isArray(plugin.ruleSet.rules)) {
        errors.push({
          ruleId: 0,
          field: 'ruleSet.rules',
          message: 'Rules array is required',
          severity: 'critical'
        });
      }
      if (!plugin.ruleSet.classes || !Array.isArray(plugin.ruleSet.classes)) {
        errors.push({
          ruleId: 0,
          field: 'ruleSet.classes',
          message: 'Classes array is required',
          severity: 'critical'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  /**
   * Export plugin to JSON
   */
  exportPlugin(id: string): string {
    const plugin = this.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }
    
    return JSON.stringify(plugin, null, 2);
  }
  
  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.loadedUrls.clear();
  }
  
  /**
   * Get plugin statistics
   */
  getStatistics() {
    return {
      totalPlugins: this.plugins.size,
      totalRules: this.getAll().reduce((sum, p) => sum + p.ruleSet.rules.length, 0),
      totalClasses: this.getAll().reduce((sum, p) => sum + p.ruleSet.classes.length, 0),
      plugins: this.getAll().map(p => ({
        id: p.metadata.id,
        name: p.metadata.name,
        version: p.metadata.version,
        rules: p.ruleSet.rules.length,
        classes: p.ruleSet.classes.length
      }))
    };
  }
}

// Global registry instance
export const globalLegendRegistry = new LegendRegistry();

/**
 * Helper function to create a plugin from rule set
 */
export function createPlugin(
  metadata: RuleSetMetadata,
  ruleSet: any
): ReferenceLegendPlugin {
  return {
    metadata,
    ruleSet: ruleSet as RuleSet
  };
}

/**
 * Helper function to load built-in plugins
 */
export { loadBuiltInPlugins } from './PluginLoader';
