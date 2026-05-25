// ============================================================================
// TYPE DECLARATIONS FOR JSON IMPORTS
// ============================================================================

/**
 * This file provides TypeScript declarations for importing JSON files as modules.
 * 
 * Place this file in your src/ directory or types/ directory.
 * TypeScript will automatically pick it up.
 */

declare module '*.json' {
  const value: any;
  export default value;
}

/**
 * If you want stricter typing for specific JSON files, you can declare them explicitly:
 * 
 * declare module './plugins/anderson/anderson-plugin.json' {
 *   import { RuleSet, RuleSetMetadata } from './semantic-types';
 *   const value: {
 *     metadata: RuleSetMetadata;
 *     rules: any[];
 *     classes: any[];
 *     validation?: any;
 *   };
 *   export default value;
 * }
 */
