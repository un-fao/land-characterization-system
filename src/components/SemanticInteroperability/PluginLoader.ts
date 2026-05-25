// ============================================================================
// BUILT-IN PLUGIN LOADER
// ============================================================================

import { LegendRegistry } from './LegendRegistry';
import { ReferenceLegendPlugin, RuleSetMetadata } from './semantic-types';
// import { Anderson } from './plugins/anderson/Anderson';

/**
 * Convert a TypeScript rule module to a plugin
 */
function createPluginFromModule(
  id: string,
  name: string,
  fullName: string,
  author: string,
  organization: string,
  description: string,
  url: string,
  citation: string,
  module: { Rules: any[]; Classes: any[] }
): ReferenceLegendPlugin {
  const metadata: RuleSetMetadata = {
    id,
    name,
    fullName,
    version: '1.0.0',
    author,
    organization,
    description,
    url,
    citation,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tags: []
  };

  return {
    metadata,
    ruleSet: {
      metadata,
      rules: module.Rules,
      classes: module.Classes,
      validation: {
        version: '1.0',
        requiredElements: [],
        requiredCharacteristics: [],
        validPresenceTypes: ['Fixed', 'Mandatory', 'Optional'],
        coverageRules: {
          min: 0,
          max: 100
        }
      }
    }
  };
}

/**
 * Load all built-in plugins into the registry
 */
export async function loadBuiltInPlugins(registry: LegendRegistry): Promise<void> {
  console.log('Loading built-in plugins...');

  try {
    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/Anderson-plugin.json`
    );
    console.log('✓ Anderson plugin loaded');

    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/WorldCover2020-plugin.json`
    );
    console.log('✓ WorldCover2020 plugin loaded');

    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/FRA-plugin.json`
    );
    console.log('✓ FRA plugin loaded');

    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/GLC-SHARE-plugin.json`
    );
    console.log('✓ GLC-SHARE plugin loaded');

    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/IGBP-plugin.json`
    );
    console.log('✓ IGBP plugin loaded');


    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/IPCC-plugin.json`
    );
    console.log('✓ IPCC plugin loaded');

    await loadPluginFromJSON(
      registry,
      `${process.env.PUBLIC_URL || ''}/components/plugins/SEEA-plugin.json`
    );
    console.log('✓ SEEA plugin loaded');

    /*// Load Anderson
    const andersonPlugin = createPluginFromModule(
      'anderson',
      'Anderson Land Use Classification',
      'Land use and land cover classification system for use with remote sensor data',
      'USGS',
      'United States Geological Survey',
      'A land use and land cover classification system developed for use with remote sensor data',
      'https://pubs.usgs.gov/pp/0964/report.pdf',
      'Anderson, J.R., Hardy, E.E., Roach, J.T., and Witmer, R.E., 1976',
      Anderson
    );
    registry.register(andersonPlugin);
    console.log('✓ Anderson plugin loaded');*/

    console.log(`Successfully loaded ${registry.getAll().length} built-in plugins`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to load built-in plugins:', message);
    throw error;
  }
}

/**
 * Load plugins from JSON files
 */
export async function loadPluginFromJSON(
  registry: LegendRegistry,
  jsonPath: string
): Promise<void> {
  try {
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin: ${response.statusText}`);
    }

    const raw = await response.json();

    // ------------------------------------------------------------------
    // NORMALISE SHAPE: support both top-level and nested ruleSet plugins
    // ------------------------------------------------------------------
    const metadata: RuleSetMetadata | undefined =
      raw.metadata ?? raw.ruleSet?.metadata;

    const rules = raw.rules ?? raw.ruleSet?.rules;
    const classes = raw.classes ?? raw.ruleSet?.classes;
    const validation =
      raw.validation ?? raw.ruleSet?.validation ?? { enabled: false, rules: [] };

    // -------------------------
    // BASIC VALIDATION
    // -------------------------
    if (!metadata) {
      throw new Error('Invalid plugin: metadata is required');
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      throw new Error('Invalid plugin: Rules array is required');
    }

    if (!Array.isArray(classes) || classes.length === 0) {
      throw new Error('Invalid plugin: Classes array is required');
    }

    // -------------------------
    // BUILD PLUGIN OBJECT
    // -------------------------
    const plugin: ReferenceLegendPlugin = {
      metadata,
      ruleSet: {
        metadata,
        rules,
        classes,
        validation
      }
    };

    registry.register(plugin);
    console.log(`✓ Plugin loaded from ${jsonPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load plugin from ${jsonPath}:`, message);
    throw error;
  }
}

export default loadBuiltInPlugins;
