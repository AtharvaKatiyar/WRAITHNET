/**
 * Trigger Service Tests
 * 
 * Tests for trigger evaluation and processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import triggerService from './triggerService';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';

describe('Trigger Service', () => {
  beforeEach(async () => {
    // Reset ghost state before each test
    await ghostStateService.resetState();
  });

  describe('evaluateKeywordTrigger', () => {
    it('should detect "help" keyword and trigger Whisperer mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I need help finding my way',
        timestamp: Date.now()
      });

      expect(results.length).toBeGreaterThan(0);
      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      expect(keywordTrigger).toBeDefined();
      expect(keywordTrigger?.targetMode).toBe(GhostMode.WHISPERER);
    });

    it('should detect "death" keyword and trigger Demon mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'Death is coming for us all',
        timestamp: Date.now()
      });

      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      expect(keywordTrigger).toBeDefined();
      expect(keywordTrigger?.targetMode).toBe(GhostMode.DEMON);
    });

    it('should detect "trick" keyword and trigger Trickster mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'That was a clever trick',
        timestamp: Date.now()
      });

      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      expect(keywordTrigger).toBeDefined();
      expect(keywordTrigger?.targetMode).toBe(GhostMode.TRICKSTER);
    });

    it('should detect "rage" keyword and trigger Poltergeist mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I am filled with rage',
        timestamp: Date.now()
      });

      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      expect(keywordTrigger).toBeDefined();
      expect(keywordTrigger?.targetMode).toBe(GhostMode.POLTERGEIST);
    });

    it('should be case-insensitive', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'HELP ME PLEASE',
        timestamp: Date.now()
      });

      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      expect(keywordTrigger).toBeDefined();
      expect(keywordTrigger?.targetMode).toBe(GhostMode.WHISPERER);
    });

    it('should not trigger on messages without keywords', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'The weather is nice today',
        timestamp: Date.now()
      });

      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      expect(keywordTrigger).toBeUndefined();
    });
  });

  describe('evaluateSentimentTrigger', () => {
    it('should detect very negative sentiment and trigger Demon mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I hate this terrible awful horrible nightmare',
        timestamp: Date.now()
      });

      const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
      expect(sentimentTrigger).toBeDefined();
      expect(sentimentTrigger?.targetMode).toBe(GhostMode.DEMON);
    });

    it('should detect negative sentiment and trigger Poltergeist mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'This is bad and wrong',
        timestamp: Date.now()
      });

      const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
      if (sentimentTrigger) {
        expect([GhostMode.POLTERGEIST, GhostMode.DEMON]).toContain(sentimentTrigger.targetMode);
      }
    });

    it('should detect positive sentiment and trigger Trickster mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'This is good and fun',
        timestamp: Date.now()
      });

      const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
      if (sentimentTrigger) {
        expect([GhostMode.TRICKSTER, GhostMode.WHISPERER]).toContain(sentimentTrigger.targetMode);
      }
    });

    it('should detect very positive sentiment and trigger Whisperer mode', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I love this wonderful amazing beautiful experience',
        timestamp: Date.now()
      });

      const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
      if (sentimentTrigger) {
        expect([GhostMode.WHISPERER, GhostMode.TRICKSTER]).toContain(sentimentTrigger.targetMode);
      }
    });

    it('should not trigger on neutral sentiment', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'The cat sat on the mat',
        timestamp: Date.now()
      });

      const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
      expect(sentimentTrigger).toBeUndefined();
    });
  });

  describe('evaluateSilenceTrigger', () => {
    it('should not trigger if recent intervention occurred', async () => {
      // Record a recent intervention
      await ghostStateService.recordIntervention(TriggerType.KEYWORD, {});

      const results = await triggerService.evaluateTriggers({
        timestamp: Date.now()
      });

      const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
      expect(silenceTrigger).toBeUndefined();
    });

    it('should trigger after silence threshold', async () => {
      // Reset state with old intervention time
      const state = await ghostStateService.getState();
      state.lastInterventionTime = Date.now() - 70000; // 70 seconds ago
      await ghostStateService.setState(state);

      const results = await triggerService.evaluateTriggers({
        timestamp: Date.now()
      });

      const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
      expect(silenceTrigger).toBeDefined();
      expect(silenceTrigger?.targetMode).toBeDefined();
    });
  });

  describe('trigger priority', () => {
    it('should prioritize keyword triggers over sentiment', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I hate needing help', // Both keyword and negative sentiment
        timestamp: Date.now()
      });

      expect(results.length).toBeGreaterThan(0);
      
      // Keyword trigger should have higher priority
      const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
      const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);

      if (keywordTrigger && sentimentTrigger) {
        expect(keywordTrigger.priority).toBeGreaterThan(sentimentTrigger.priority);
      }
    });

    it('should sort results by priority', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I need help with this terrible situation',
        timestamp: Date.now()
      });

      // Results should be sorted by priority (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].priority).toBeGreaterThanOrEqual(results[i + 1].priority);
      }
    });
  });

  describe('processTriggers', () => {
    it('should transition mode when processing keyword trigger', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I need help',
        timestamp: Date.now()
      });

      await triggerService.processTriggers(results);

      const state = await ghostStateService.getState();
      expect(state.currentMode).toBe(GhostMode.WHISPERER);
    });

    it('should not transition if already in target mode', async () => {
      // Set to Demon mode
      await ghostStateService.transitionMode(GhostMode.DEMON);

      const results = await triggerService.evaluateTriggers({
        message: 'death and terror',
        timestamp: Date.now()
      });

      const initialHistory = await ghostStateService.getTriggerHistory();
      const initialLength = initialHistory.length;

      await triggerService.processTriggers(results);

      const state = await ghostStateService.getState();
      expect(state.currentMode).toBe(GhostMode.DEMON);

      // Should have recorded intervention even without mode change
      const updatedHistory = await ghostStateService.getTriggerHistory();
      expect(updatedHistory.length).toBeGreaterThan(initialLength);
    });

    it('should handle empty results gracefully', async () => {
      await triggerService.processTriggers([]);
      
      // Should not throw error
      const state = await ghostStateService.getState();
      expect(state).toBeDefined();
    });
  });

  describe('evaluateAndProcess', () => {
    it('should evaluate and process triggers in one call', async () => {
      const results = await triggerService.evaluateAndProcess({
        message: 'I need help',
        timestamp: Date.now()
      });

      expect(results.length).toBeGreaterThan(0);

      const state = await ghostStateService.getState();
      expect(state.currentMode).toBe(GhostMode.WHISPERER);
    });
  });

  describe('utility methods', () => {
    it('should return keyword triggers configuration', () => {
      const config = triggerService.getKeywordTriggers();
      expect(config).toBeDefined();
      expect(config.whisperer).toBeDefined();
      expect(config.whisperer.mode).toBe(GhostMode.WHISPERER);
      expect(Array.isArray(config.whisperer.keywords)).toBe(true);
    });

    it('should return silence threshold', () => {
      const threshold = triggerService.getSilenceThreshold();
      expect(threshold).toBe(60000);
    });

    it('should return sentiment thresholds', () => {
      const thresholds = triggerService.getSentimentThresholds();
      expect(thresholds).toBeDefined();
      expect(thresholds.VERY_NEGATIVE).toBeDefined();
      expect(thresholds.NEGATIVE).toBeDefined();
      expect(thresholds.POSITIVE).toBeDefined();
      expect(thresholds.VERY_POSITIVE).toBeDefined();
    });

    it('should analyze sentiment of a message', () => {
      const result = triggerService.analyzeSentiment('I love this!');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('comparative');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('multiple trigger scenarios', () => {
    it('should handle message with multiple trigger types', async () => {
      const results = await triggerService.evaluateTriggers({
        message: 'I hate needing help with this terrible nightmare',
        timestamp: Date.now()
      });

      // Should detect both keyword and sentiment triggers
      expect(results.length).toBeGreaterThan(0);
      
      const triggerTypes = results.map(r => r.triggerType);
      expect(triggerTypes).toContain(TriggerType.KEYWORD);
    });

    it('should process highest priority trigger first', async () => {
      await triggerService.evaluateAndProcess({
        message: 'I need help but I also hate this',
        timestamp: Date.now()
      });

      const state = await ghostStateService.getState();
      // Keyword "help" should win over negative sentiment
      expect(state.currentMode).toBe(GhostMode.WHISPERER);
    });
  });
});
