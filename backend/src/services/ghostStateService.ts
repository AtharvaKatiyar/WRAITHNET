/**
 * Ghost State Service
 * 
 * Manages the ghost state machine, mode transitions, and persistence
 * Requirements: 5.1, 5.4, 5.5, 5.6, 5.7, 14.3
 */

import redisClient from '../config/redis';
import logger from '../config/logger';
import { GhostMode, GhostState, TriggerEvent, TriggerType } from '../types/ghost';

const GHOST_STATE_KEY = 'ghost:state';
const MAX_TRIGGER_HISTORY = 50;

// Default initial state
const DEFAULT_STATE: GhostState = {
  currentMode: GhostMode.WHISPERER,
  intensity: 30,
  lastInterventionTime: Date.now(),
  triggerHistory: []
};

class GhostStateService {
  /**
   * Get the current ghost state from Redis
   */
  async getState(): Promise<GhostState> {
    try {
      const stateJson = await redisClient.get(GHOST_STATE_KEY);
      
      if (!stateJson) {
        // Initialize with default state
        await this.setState(DEFAULT_STATE);
        return DEFAULT_STATE;
      }

      const state = JSON.parse(stateJson) as GhostState;
      return state;
    } catch (error) {
      logger.error({ error }, 'Error getting ghost state');
      return DEFAULT_STATE;
    }
  }

  /**
   * Set the ghost state in Redis
   */
  async setState(state: GhostState): Promise<void> {
    try {
      await redisClient.set(GHOST_STATE_KEY, JSON.stringify(state));
      logger.info({ mode: state.currentMode, intensity: state.intensity }, 'Ghost state updated');
    } catch (error) {
      logger.error({ error }, 'Error setting ghost state');
      throw error;
    }
  }

  /**
   * Transition to a new ghost mode
   */
  async transitionMode(newMode: GhostMode, reason?: string): Promise<GhostState> {
    try {
      const state = await this.getState();
      const oldMode = state.currentMode;

      // Update mode
      state.currentMode = newMode;
      
      // Adjust intensity based on mode
      state.intensity = this.calculateIntensityForMode(newMode, state.intensity);
      
      // Record trigger event
      const triggerEvent: TriggerEvent = {
        type: TriggerType.NARRATIVE, // Default, can be overridden
        timestamp: Date.now(),
        data: { reason, oldMode, newMode },
        resultingMode: newMode
      };
      
      state.triggerHistory.push(triggerEvent);
      
      // Trim history if too long
      if (state.triggerHistory.length > MAX_TRIGGER_HISTORY) {
        state.triggerHistory = state.triggerHistory.slice(-MAX_TRIGGER_HISTORY);
      }

      await this.setState(state);

      logger.info({ 
        oldMode, 
        newMode, 
        intensity: state.intensity, 
        reason 
      }, 'Ghost mode transitioned');

      return state;
    } catch (error) {
      logger.error({ error, newMode }, 'Error transitioning ghost mode');
      throw error;
    }
  }

  /**
   * Update intensity level
   */
  async updateIntensity(delta: number): Promise<GhostState> {
    try {
      const state = await this.getState();
      
      // Update intensity (clamped between 0-100)
      state.intensity = Math.max(0, Math.min(100, state.intensity + delta));

      await this.setState(state);

      logger.info({ intensity: state.intensity, delta }, 'Ghost intensity updated');

      return state;
    } catch (error) {
      logger.error({ error, delta }, 'Error updating ghost intensity');
      throw error;
    }
  }

  /**
   * Record an intervention (message sent, effect triggered, etc.)
   */
  async recordIntervention(triggerType: TriggerType, data: any): Promise<void> {
    try {
      const state = await this.getState();
      
      state.lastInterventionTime = Date.now();
      
      const triggerEvent: TriggerEvent = {
        type: triggerType,
        timestamp: Date.now(),
        data,
        resultingMode: state.currentMode
      };
      
      state.triggerHistory.push(triggerEvent);
      
      // Trim history if too long
      if (state.triggerHistory.length > MAX_TRIGGER_HISTORY) {
        state.triggerHistory = state.triggerHistory.slice(-MAX_TRIGGER_HISTORY);
      }

      await this.setState(state);

      logger.info({ triggerType, mode: state.currentMode }, 'Ghost intervention recorded');
    } catch (error) {
      logger.error({ error, triggerType }, 'Error recording intervention');
      throw error;
    }
  }

  /**
   * Get time since last intervention in milliseconds
   */
  async getTimeSinceLastIntervention(): Promise<number> {
    try {
      const state = await this.getState();
      return Date.now() - state.lastInterventionTime;
    } catch (error) {
      logger.error({ error }, 'Error getting time since last intervention');
      return 0;
    }
  }

  /**
   * Get trigger history
   */
  async getTriggerHistory(limit?: number): Promise<TriggerEvent[]> {
    try {
      const state = await this.getState();
      const history = state.triggerHistory;
      
      if (limit && limit > 0) {
        return history.slice(-limit);
      }
      
      return history;
    } catch (error) {
      logger.error({ error }, 'Error getting trigger history');
      return [];
    }
  }

  /**
   * Reset ghost state to default
   */
  async resetState(): Promise<GhostState> {
    try {
      const newState = {
        ...DEFAULT_STATE,
        lastInterventionTime: Date.now(),
        triggerHistory: []
      };
      
      await this.setState(newState);
      
      logger.info('Ghost state reset to default');
      
      return newState;
    } catch (error) {
      logger.error({ error }, 'Error resetting ghost state');
      throw error;
    }
  }

  /**
   * Calculate appropriate intensity for a given mode
   */
  private calculateIntensityForMode(mode: GhostMode, currentIntensity: number): number {
    // Each mode has a preferred intensity range
    const modeIntensityRanges: Record<GhostMode, { min: number; max: number }> = {
      [GhostMode.WHISPERER]: { min: 10, max: 40 },
      [GhostMode.TRICKSTER]: { min: 30, max: 60 },
      [GhostMode.POLTERGEIST]: { min: 50, max: 80 },
      [GhostMode.DEMON]: { min: 70, max: 100 }
    };

    const range = modeIntensityRanges[mode];
    
    // If current intensity is within range, keep it
    if (currentIntensity >= range.min && currentIntensity <= range.max) {
      return currentIntensity;
    }
    
    // Otherwise, set to middle of range
    return Math.floor((range.min + range.max) / 2);
  }

  /**
   * Get mode-specific message characteristics
   */
  getModeCharacteristics(mode: GhostMode): {
    tone: string;
    messageStyle: string;
    effectIntensity: string;
  } {
    const characteristics = {
      [GhostMode.WHISPERER]: {
        tone: 'subtle, cryptic, mysterious',
        messageStyle: 'short, enigmatic hints and observations',
        effectIntensity: 'minimal'
      },
      [GhostMode.TRICKSTER]: {
        tone: 'playful, misleading, puzzle-like',
        messageStyle: 'riddles, wordplay, misdirection',
        effectIntensity: 'moderate'
      },
      [GhostMode.POLTERGEIST]: {
        tone: 'aggressive, chaotic, disruptive',
        messageStyle: 'fragmented, corrupted text, urgent warnings',
        effectIntensity: 'high'
      },
      [GhostMode.DEMON]: {
        tone: 'threatening, intense, overwhelming',
        messageStyle: 'dark prophecies, direct threats, existential horror',
        effectIntensity: 'maximum'
      }
    };

    return characteristics[mode];
  }
}

// Export singleton instance
export const ghostStateService = new GhostStateService();
export default ghostStateService;
