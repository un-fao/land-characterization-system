/**
 * LocalStorageManager.tsx
 * 
 * Manages local storage operations for the Legend application including:
 * - Saving/Loading legend data
 * - Managing user-defined blocks and characteristics
 * - Auto-save functionality
 * - Legend versioning
 */

export interface UserDefinedBlock {
    block_id: number;
    block_name: string;
    block_label: string;
    block_description: string;
    block_icon: string;
    block_reference: string;
    elements: any[];
    isUserDefined: boolean;
    createdAt: string;
}

export interface UserDefinedCharacteristic {
    characteristic_id: number;
    characteristic_name: string;
    characteristic_label: string;
    characteristic_description: string;
    characteristic_icon: string;
    characteristic_reference: string;
    characteristic_group?: number;
    elements: any[];
    isUserDefined: boolean;
    createdAt: string;
}

export interface LegendData {
    id: string;
    name: string;
    timestamp: string;
    version: string;
    LC_Legend: any;
    LC_Class: any[];
    LC_ClassCharacteristics: any;
    LC_HorizontalPatterns: any[];
    LC_Strata: any[];
    LC_Properties: any[];
    LC_Characteristics: any[];
    userDefinedBlocks?: UserDefinedBlock[];
    userDefinedCharacteristics?: UserDefinedCharacteristic[];
}

export class LocalStorageManager {
    private static readonly STORAGE_PREFIX = 'lchs_';
    private static readonly LEGEND_LIST_KEY = 'lchs_legend_list';
    private static readonly AUTO_SAVE_KEY = 'lchs_auto_save';
    private static readonly USER_BLOCKS_KEY = 'lchs_user_blocks';
    private static readonly USER_CHARACTERISTICS_KEY = 'lchs_user_characteristics';
    private static readonly CURRENT_VERSION = '1.0.0';

    /**
     * Save legend data to local storage
     */
    static saveLegend(
        legendId: string,
        legendName: string,
        LC_Legend: any,
        LC_Class: any[],
        LC_ClassCharacteristics: any,
        LC_HorizontalPatterns: any[],
        LC_Strata: any[],
        LC_Properties: any[],
        LC_Characteristics: any[],
        userDefinedBlocks?: UserDefinedBlock[],
        userDefinedCharacteristics?: UserDefinedCharacteristic[]
    ): boolean {
        try {
            const legendData: LegendData = {
                id: legendId,
                name: legendName,
                timestamp: new Date().toISOString(),
                version: this.CURRENT_VERSION,
                LC_Legend,
                LC_Class,
                LC_ClassCharacteristics,
                LC_HorizontalPatterns,
                LC_Strata,
                LC_Properties,
                LC_Characteristics,
                userDefinedBlocks: userDefinedBlocks || [],
                userDefinedCharacteristics: userDefinedCharacteristics || []
            };

            // Save the legend data
            const key = `${this.STORAGE_PREFIX}legend_${legendId}`;
            localStorage.setItem(key, JSON.stringify(legendData));

            // Update the legend list
            this.updateLegendList(legendId, legendName);

            return true;
        } catch (error) {
            console.error('Error saving legend:', error);
            return false;
        }
    }

    /**
     * Load legend data from local storage
     */
    static loadLegend(legendId: string): LegendData | null {
        try {
            const key = `${this.STORAGE_PREFIX}legend_${legendId}`;
            const data = localStorage.getItem(key);
            
            if (!data) {
                return null;
            }

            const legendData: LegendData = JSON.parse(data);
            
            // Ensure user-defined arrays exist
            if (!legendData.userDefinedBlocks) {
                legendData.userDefinedBlocks = [];
            }
            if (!legendData.userDefinedCharacteristics) {
                legendData.userDefinedCharacteristics = [];
            }

            return legendData;
        } catch (error) {
            console.error('Error loading legend:', error);
            return null;
        }
    }

    /**
     * Delete a legend from local storage
     */
    static deleteLegend(legendId: string): boolean {
        try {
            const key = `${this.STORAGE_PREFIX}legend_${legendId}`;
            localStorage.removeItem(key);
            
            // Update the legend list
            const list = this.getLegendList();
            const updatedList = list.filter(item => item.id !== legendId);
            localStorage.setItem(this.LEGEND_LIST_KEY, JSON.stringify(updatedList));
            
            return true;
        } catch (error) {
            console.error('Error deleting legend:', error);
            return false;
        }
    }

    /**
     * Get list of all saved legends
     */
    static getLegendList(): Array<{ id: string; name: string; timestamp: string }> {
        try {
            const data = localStorage.getItem(this.LEGEND_LIST_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting legend list:', error);
            return [];
        }
    }

    /**
     * Update the legend list
     */
    private static updateLegendList(legendId: string, legendName: string): void {
        try {
            let list = this.getLegendList();
            const existingIndex = list.findIndex(item => item.id === legendId);
            
            const listItem = {
                id: legendId,
                name: legendName,
                timestamp: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                list[existingIndex] = listItem;
            } else {
                list.push(listItem);
            }

            localStorage.setItem(this.LEGEND_LIST_KEY, JSON.stringify(list));
        } catch (error) {
            console.error('Error updating legend list:', error);
        }
    }

    /**
     * Auto-save current legend
     */
    static autoSave(
        LC_Legend: any,
        LC_Class: any[],
        LC_ClassCharacteristics: any,
        LC_HorizontalPatterns: any[],
        LC_Strata: any[],
        LC_Properties: any[],
        LC_Characteristics: any[],
        userDefinedBlocks?: UserDefinedBlock[],
        userDefinedCharacteristics?: UserDefinedCharacteristic[]
    ): boolean {
        try {
            const autoSaveData: LegendData = {
                id: 'auto_save',
                name: 'Auto Save',
                timestamp: new Date().toISOString(),
                version: this.CURRENT_VERSION,
                LC_Legend,
                LC_Class,
                LC_ClassCharacteristics,
                LC_HorizontalPatterns,
                LC_Strata,
                LC_Properties,
                LC_Characteristics,
                userDefinedBlocks: userDefinedBlocks || [],
                userDefinedCharacteristics: userDefinedCharacteristics || []
            };

            localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(autoSaveData));
            return true;
        } catch (error) {
            console.error('Error auto-saving:', error);
            return false;
        }
    }

    /**
     * Load auto-saved legend
     */
    static loadAutoSave(): LegendData | null {
        try {
            const data = localStorage.getItem(this.AUTO_SAVE_KEY);
            if (!data) {
                return null;
            }

            const legendData: LegendData = JSON.parse(data);
            
            // Ensure user-defined arrays exist
            if (!legendData.userDefinedBlocks) {
                legendData.userDefinedBlocks = [];
            }
            if (!legendData.userDefinedCharacteristics) {
                legendData.userDefinedCharacteristics = [];
            }

            return legendData;
        } catch (error) {
            console.error('Error loading auto-save:', error);
            return null;
        }
    }

    /**
     * Save a user-defined block
     */
    static saveUserBlock(block: UserDefinedBlock): boolean {
        try {
            const blocks = this.getUserBlocks();
            
            // Check if block already exists
            const existingIndex = blocks.findIndex(b => b.block_id === block.block_id);
            
            if (existingIndex >= 0) {
                blocks[existingIndex] = block;
            } else {
                blocks.push(block);
            }

            localStorage.setItem(this.USER_BLOCKS_KEY, JSON.stringify(blocks));
            return true;
        } catch (error) {
            console.error('Error saving user block:', error);
            return false;
        }
    }

    /**
     * Get all user-defined blocks
     */
    static getUserBlocks(): UserDefinedBlock[] {
        try {
            const data = localStorage.getItem(this.USER_BLOCKS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting user blocks:', error);
            return [];
        }
    }

    /**
     * Delete a user-defined block
     */
    static deleteUserBlock(blockId: number): boolean {
        try {
            const blocks = this.getUserBlocks();
            const filteredBlocks = blocks.filter(b => b.block_id !== blockId);
            localStorage.setItem(this.USER_BLOCKS_KEY, JSON.stringify(filteredBlocks));
            return true;
        } catch (error) {
            console.error('Error deleting user block:', error);
            return false;
        }
    }

    /**
     * Save a user-defined characteristic
     */
    static saveUserCharacteristic(characteristic: UserDefinedCharacteristic): boolean {
        try {
            const characteristics = this.getUserCharacteristics();
            
            // Check if characteristic already exists
            const existingIndex = characteristics.findIndex(
                c => c.characteristic_id === characteristic.characteristic_id
            );
            
            if (existingIndex >= 0) {
                characteristics[existingIndex] = characteristic;
            } else {
                characteristics.push(characteristic);
            }

            localStorage.setItem(this.USER_CHARACTERISTICS_KEY, JSON.stringify(characteristics));
            return true;
        } catch (error) {
            console.error('Error saving user characteristic:', error);
            return false;
        }
    }

    /**
     * Get all user-defined characteristics
     */
    static getUserCharacteristics(): UserDefinedCharacteristic[] {
        try {
            const data = localStorage.getItem(this.USER_CHARACTERISTICS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting user characteristics:', error);
            return [];
        }
    }

    /**
     * Delete a user-defined characteristic
     */
    static deleteUserCharacteristic(characteristicId: number): boolean {
        try {
            const characteristics = this.getUserCharacteristics();
            const filteredCharacteristics = characteristics.filter(
                c => c.characteristic_id !== characteristicId
            );
            localStorage.setItem(this.USER_CHARACTERISTICS_KEY, JSON.stringify(filteredCharacteristics));
            return true;
        } catch (error) {
            console.error('Error deleting user characteristic:', error);
            return false;
        }
    }

    /**
     * Get next available block ID for user-defined blocks
     */
    static getNextBlockId(): number {
        const userBlocks = this.getUserBlocks();
        if (userBlocks.length === 0) {
            return 9000; // Start user-defined blocks at 9000
        }
        const maxId = Math.max(...userBlocks.map(b => b.block_id));
        return maxId + 1;
    }

    /**
     * Get next available characteristic ID for user-defined characteristics
     */
    static getNextCharacteristicId(): number {
        const userCharacteristics = this.getUserCharacteristics();
        if (userCharacteristics.length === 0) {
            return 900001; // Start user-defined characteristics at 900001
        }
        const maxId = Math.max(...userCharacteristics.map(c => c.characteristic_id));
        return maxId + 1;
    }

    /**
     * Export legend to JSON file
     */
    static exportLegend(legendData: LegendData): void {
        try {
            const dataStr = JSON.stringify(legendData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${legendData.name}_${legendData.id}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting legend:', error);
        }
    }

    /**
     * Import legend from JSON file
     */
    static async importLegend(file: File): Promise<LegendData | null> {
        try {
            const text = await file.text();
            const legendData: LegendData = JSON.parse(text);
            
            // Validate the data structure
            if (!legendData.LC_Legend || !legendData.LC_Class) {
                throw new Error('Invalid legend data structure');
            }

            // Ensure user-defined arrays exist
            if (!legendData.userDefinedBlocks) {
                legendData.userDefinedBlocks = [];
            }
            if (!legendData.userDefinedCharacteristics) {
                legendData.userDefinedCharacteristics = [];
            }

            return legendData;
        } catch (error) {
            console.error('Error importing legend:', error);
            return null;
        }
    }

    /**
     * Clear all local storage data (use with caution)
     */
    static clearAllData(): boolean {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.STORAGE_PREFIX) || 
                    key === this.LEGEND_LIST_KEY || 
                    key === this.AUTO_SAVE_KEY ||
                    key === this.USER_BLOCKS_KEY ||
                    key === this.USER_CHARACTERISTICS_KEY) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    static getStorageInfo(): { used: number; total: number; percentage: number } {
        try {
            let used = 0;
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith(this.STORAGE_PREFIX) || 
                    key === this.LEGEND_LIST_KEY || 
                    key === this.AUTO_SAVE_KEY ||
                    key === this.USER_BLOCKS_KEY ||
                    key === this.USER_CHARACTERISTICS_KEY) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        used += item.length * 2; // Approximate bytes (UTF-16)
                    }
                }
            });

            const total = 5 * 1024 * 1024; // 5MB typical limit
            const percentage = (used / total) * 100;

            return {
                used: Math.round(used / 1024), // KB
                total: Math.round(total / 1024), // KB
                percentage: Math.round(percentage)
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { used: 0, total: 0, percentage: 0 };
        }
    }
}