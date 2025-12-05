/**
 * Ghost State Service Tests
 * 
 * Tests for ghost state machine functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';

describe('Ghost State Service', () => {
  beforeEach(async () => {
    // Reset state before each test
    await ghostStateService.resetState();
  });

  describe('getState', () => {
    it('should return default state on first call', async () => {
      const state = await ghostStateService.getState();
      
      expect(state).toBeDefined();
      expect(state.currentMode).toBe(GhostMode.WHISPERER);
      expect(state.intensity).toBe(30);
      expect(state.lastInterventionTime).toBeDefined();
      expect(Array.isArray(state.triggerHistory)).toBe(true);
    });

    it('should persist state across calls', async () => {
      const state1 = await ghostStateService.getState();
      const state2 = await ghostStateService.getState();
      
      expect(state1.currentMode).toBe(state2.currentMode);
      expect(state1.intensity).toBe(state2.intensity);
    });
  });

  describe('transitionMode', () => {
    it('should transition from Whisperer to Poltergeist', async () => {
      const initialState = await ghostStateService.getState();
      expect(initialState.currentMode).toBe(GhostMode.WHISPERER);

      const newState = await ghostStateService.transitionMode(
        GhostMode.POLTERGEIST,
        'test transition'
      );

      expect(newState.currentMode).toBe(GhostMode.POLTERGEIST);
      expect(newState.triggerHistory.length).toBeGreaterThan(0);
    });

    it('should adjust intensity appropriately for each mode', async () => {
      // Whisperer should have low intensity
      await ghostStateService.transitionMode(GhostMode.WHISPERER);
      let state = await ghostStateService.getState();
      expect(state.intensity).toBeGreaterThanOrEqual(10);
      expect(state.intensity).toBeLessThanOrEqual(40);

      // Demon should have high intensity
      await ghostStateService.transitionMode(GhostMode.DEMON);
      state = await ghostStateService.getState();
      expect(state.intensity).toBeGreaterThanOrEqual(70);
      expect(state.intensity).toBeLessThanOrEqual(100);

      // Trickster should have moderate intensity
      await ghostStateService.transitionMode(GhostMode.TRICKSTER);
      state = await ghostStateService.getState();
      expect(state.intensity).toBeGreaterThanOrEqual(30);
      expect(state.intensity).toBeLessThanOrEqual(60);

      // Poltergeist should have high-moderate intensity
      await ghostStateService.transitionMode(GhostMode.POLTERGEIST);
      state = await ghostStateService.getState();
      expect(state.intensity).toBeGreaterThanOrEqual(50);
      expect(state.intensity).toBeLessThanOrEqual(80);
    });

    it('should record transition in trigger history', async () => {
      await ghostStateService.transitionMode(GhostMode.TRICKSTER, 'keyword detected');
      
      const state = await ghostStateService.getState();
      const lastEvent = state.triggerHistory[state.triggerHistory.length - 1];
      
      expect(lastEvent).toBeDefined();
      expect(lastEvent.resultingMode).toBe(GhostMode.TRICKSTER);
      expect(lastEvent.data.reason).toBe('keyword detected');
      expect(lastEvent.data.newMode).toBe(GhostMode.TRICKSTER);
    });

    it('should handle all mode transitions', async () => {
      const modes = [
        GhostMode.WHISPERER,
        GhostMode.TRICKSTER,
        GhostMode.POLTERGEIST,
        GhostMode.DEMON
      ];

      for (const mode of modes) {
        const state = await ghostStateService.transitionMode(mode);
        expect(state.currentMode).toBe(mode);
      }
    });
  });

  describe('updateIntensity', () => {
    it('should increase intensity', async () => {
      const initialState = await ghostStateService.getState();
      const initialIntensity = initialState.intensity;

      await ghostStateService.updateIntensity(20);
      
      const newState = await ghostStateService.getState();
      expect(newState.intensity).toBe(initialIntensity + 20);
    });

    it('should decrease intensity', async () => {
      await ghostStateService.updateIntensity(50); // Set to 80
      await ghostStateService.updateIntensity(-30);
      
      const state = await ghostStateService.getState();
      expect(state.intensity).toBe(50);
    });

    it('should clamp intensity at 0', async () => {
      await ghostStateService.updateIntensity(-200);
      
      const state = await ghostStateService.getState();
      expect(state.intensity).toBe(0);
    });

    it('should clamp intensity at 100', async () => {
      await ghostStateService.updateIntensity(200);
      
      const state = await ghostStateService.getState();
      expect(state.intensity).toBe(100);
    });
  });

  describe('recordIntervention', () => {
    it('should update last intervention time', async () => {
      const beforeTime = Date.now();
      
      await ghostStateService.recordIntervention(TriggerType.KEYWORD, {
        keyword: 'help'
      });
      
      const state = await ghostStateService.getState();
      expect(state.lastInterventionTime).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should add event to trigger history', async () => {
      await ghostStateService.recordIntervention(TriggerType.SILENCE, {
        duration: 60000
      });
      
      const state = await ghostStateService.getState();
      const lastEvent = state.triggerHistory[state.triggerHistory.length - 1];
      
      expect(lastEvent.type).toBe(TriggerType.SILENCE);
      expect(lastEvent.data.duration).toBe(60000);
    });

    it('should limit trigger history size', async () => {
      // Add more than MAX_TRIGGER_HISTORY events
      for (let i = 0; i < 60; i++) {
        await ghostStateService.recordIntervention(TriggerType.KEYWORD, {
          index: i
        });
      }
      
      const state = await ghostStateService.getState();
      expect(state.triggerHistory.length).toBeLessThanOrEqual(50);
      
      // Should keep most recent events
      const lastEvent = state.triggerHistory[state.triggerHistory.length - 1];
      expect(lastEvent.data.index).toBe(59);
    });
  });

  describe('getTimeSinceLastIntervention', () => {
    it('should return time since last intervention', async () => {
      await ghostStateService.recordIntervention(TriggerType.KEYWORD, {});
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const timeSince = await ghostStateService.getTimeSinceLastIntervention();
      expect(timeSince).toBeGreaterThanOrEqual(100);
      expect(timeSince).toBeLessThan(1000);
    });
  });

  describe('getTriggerHistory', () => {
    it('should return full history when no limit specified', async () => {
      await ghostStateService.recordIntervention(TriggerType.KEYWORD, { id: 1 });
      await ghostStateService.recordIntervention(TriggerType.SILENCE, { id: 2 });
      await ghostStateService.recordIntervention(TriggerType.SENTIMENT, { id: 3 });
      
      const history = await ghostStateService.getTriggerHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should return limited history when limit specified', async () => {
      await ghostStateService.recordIntervention(TriggerType.KEYWORD, { id: 1 });
      await ghostStateService.recordIntervention(TriggerType.SILENCE, { id: 2 });
      await ghostStateService.recordIntervention(TriggerType.SENTIMENT, { id: 3 });
      
      const history = await ghostStateService.getTriggerHistory(2);
      expect(history.length).toBe(2);
      
      // Should return most recent
      expect(history[1].data.id).toBe(3);
    });
  });

  describe('resetState', () => {
    it('should reset to default state', async () => {
      // Modify state
      await ghostStateService.transitionMode(GhostMode.DEMON);
      await ghostStateService.updateIntensity(50);
      
      // Reset
      const resetState = await ghostStateService.resetState();
      
      expect(resetState.currentMode).toBe(GhostMode.WHISPERER);
      expect(resetState.intensity).toBe(30);
      expect(resetState.triggerHistory.length).toBe(0);
    });
  });

  describe('getModeCharacteristics', () => {
    it('should return characteristics for Whisperer mode', () => {
      const chars = ghostStateService.getModeCharacteristics(GhostMode.WHISPERER);
      
      expect(chars.tone).toContain('subtle');
      expect(chars.effectIntensity).toBe('minimal');
    });

    it('should return characteristics for Poltergeist mode', () => {
      const chars = ghostStateService.getModeCharacteristics(GhostMode.POLTERGEIST);
      
      expect(chars.tone).toContain('aggressive');
      expect(chars.effectIntensity).toBe('high');
    });

    it('should return characteristics for Trickster mode', () => {
      const chars = ghostStateService.getModeCharacteristics(GhostMode.TRICKSTER);
      
      expect(chars.tone).toContain('playful');
      expect(chars.messageStyle).toContain('riddles');
    });

    it('should return characteristics for Demon mode', () => {
      const chars = ghostStateService.getModeCharacteristics(GhostMode.DEMON);
      
      expect(chars.tone).toContain('threatening');
      expect(chars.effectIntensity).toBe('maximum');
    });
  });

  describe('state persistence', () => {
    it('should persist mode transitions', async () => {
      await ghostStateService.transitionMode(GhostMode.DEMON);
      
      const state = await ghostStateService.getState();
      expect(state.currentMode).toBe(GhostMode.DEMON);
    });

    it('should persist intensity changes', async () => {
      await ghostStateService.updateIntensity(25);
      
      const state = await ghostStateService.getState();
      expect(state.intensity).toBe(55); // 30 + 25
    });

    it('should persist trigger history', async () => {
      await ghostStateService.recordIntervention(TriggerType.KEYWORD, {
        test: 'data'
      });
      
      const history = await ghostStateService.getTriggerHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].data.test).toBe('data');
    });
  });
});
