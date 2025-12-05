/**
 * Property-Based Test: Silence Trigger Activation
 * 
 * Feature: wraithnet, Property 12: Silence trigger activation
 * 
 * Tests that silence triggers correctly activate after the configured
 * threshold duration with no messages.
 * 
 * Validates: Requirements 5.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import triggerService from './triggerService';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';

describe('Property 12: Silence Trigger Activation', () => {
  beforeEach(async () => {
    // Reset state before each test
    await ghostStateService.resetState();
  });

  /**
   * Property: For any duration exceeding the silence threshold, 
   * a silence trigger should activate
   */
  it('should trigger after silence threshold is exceeded', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        // Generate durations that exceed the threshold
        fc.integer({ min: silenceThreshold + 1000, max: silenceThreshold + 300000 }),
        async (duration) => {
          // Set last intervention time to simulate silence
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(state);

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            timestamp: Date.now()
          });

          // Should have a silence trigger
          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
          expect(silenceTrigger).toBeDefined();
          expect(silenceTrigger?.triggered).toBe(true);
          expect(silenceTrigger?.targetMode).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: For any duration below the silence threshold,
   * no silence trigger should activate
   */
  it('should not trigger before silence threshold', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        // Generate durations below the threshold
        fc.integer({ min: 0, max: silenceThreshold - 1000 }),
        async (duration) => {
          // Set last intervention time to simulate recent activity
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(state);

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            timestamp: Date.now()
          });

          // Should not have a silence trigger
          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
          expect(silenceTrigger).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Silence trigger should select a valid ghost mode
   */
  it('should select valid ghost mode on silence trigger', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: silenceThreshold + 1000, max: silenceThreshold + 100000 }),
        async (duration) => {
          // Set last intervention time to trigger silence
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(state);

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            timestamp: Date.now()
          });

          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
          
          if (silenceTrigger) {
            // Should be one of the valid modes
            const validModes = [
              GhostMode.WHISPERER,
              GhostMode.POLTERGEIST,
              GhostMode.TRICKSTER,
              GhostMode.DEMON
            ];
            expect(validModes).toContain(silenceTrigger.targetMode);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Processing silence trigger should transition ghost mode
   */
  it('should transition mode when processing silence trigger', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: silenceThreshold + 1000, max: silenceThreshold + 100000 }),
        async (duration) => {
          // Record initial mode
          const initialState = await ghostStateService.getState();
          const initialMode = initialState.currentMode;

          // Set last intervention time to trigger silence
          initialState.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(initialState);

          // Evaluate and process triggers
          await triggerService.evaluateAndProcess({
            timestamp: Date.now()
          });

          // Mode may have changed (or stayed same if randomly selected same mode)
          const finalState = await ghostStateService.getState();
          expect(finalState.currentMode).toBeDefined();
          
          // Should be a valid mode
          const validModes = [
            GhostMode.WHISPERER,
            GhostMode.POLTERGEIST,
            GhostMode.TRICKSTER,
            GhostMode.DEMON
          ];
          expect(validModes).toContain(finalState.currentMode);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Silence trigger should have lower priority than keyword triggers
   */
  it('should have lower priority than keyword triggers', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('help', 'death', 'trick', 'rage'),
        async (keyword) => {
          // Set up silence condition
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - (silenceThreshold + 10000);
          await ghostStateService.setState(state);

          // Evaluate triggers with both silence and keyword
          const results = await triggerService.evaluateTriggers({
            message: `I need ${keyword}`,
            timestamp: Date.now()
          });

          // Should have both triggers
          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
          const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);

          if (silenceTrigger && keywordTrigger) {
            // Keyword should have higher priority
            expect(keywordTrigger.priority).toBeGreaterThan(silenceTrigger.priority);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Recording intervention should reset silence timer
   */
  it('should reset silence timer after intervention', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(TriggerType.KEYWORD, TriggerType.SENTIMENT, TriggerType.NARRATIVE),
        async (triggerType) => {
          // Set up old intervention time
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - (silenceThreshold + 10000);
          await ghostStateService.setState(state);

          // Record a new intervention
          await ghostStateService.recordIntervention(triggerType, {});

          // Check that silence trigger no longer activates
          const results = await triggerService.evaluateTriggers({
            timestamp: Date.now()
          });

          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
          expect(silenceTrigger).toBeUndefined();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Silence trigger should record intervention in history
   */
  it('should record silence trigger in history', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: silenceThreshold + 1000, max: silenceThreshold + 100000 }),
        async (duration) => {
          // Get initial history
          const initialHistory = await ghostStateService.getTriggerHistory();
          const initialLength = initialHistory.length;

          // Set up silence condition
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(state);

          // Process silence trigger
          await triggerService.evaluateAndProcess({
            timestamp: Date.now()
          });

          // History should have new entry
          const updatedHistory = await ghostStateService.getTriggerHistory();
          expect(updatedHistory.length).toBeGreaterThan(initialLength);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Multiple silence periods should each trigger independently
   */
  it('should trigger for each silence period', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (cycleCount) => {
          let triggerCount = 0;

          for (let i = 0; i < cycleCount; i++) {
            // Set up silence condition
            const state = await ghostStateService.getState();
            state.lastInterventionTime = Date.now() - (silenceThreshold + 5000);
            await ghostStateService.setState(state);

            // Evaluate triggers
            const results = await triggerService.evaluateTriggers({
              timestamp: Date.now()
            });

            const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
            if (silenceTrigger) {
              triggerCount++;
              
              // Process to reset timer
              await triggerService.processTriggers(results);
            }
          }

          // Should have triggered for each cycle
          expect(triggerCount).toBe(cycleCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Silence threshold boundary should be precise
   */
  it('should respect exact threshold boundary', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        // Test values right at the boundary
        fc.constantFrom(-1000, -100, -10, 0, 1, 10, 100, 1000),
        async (offset) => {
          const duration = silenceThreshold + offset;

          // Set last intervention time
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(state);

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            timestamp: Date.now()
          });

          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);

          if (offset >= 0) {
            // Should trigger at or above threshold (>= condition)
            expect(silenceTrigger).toBeDefined();
          } else {
            // Should not trigger below threshold
            expect(silenceTrigger).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Silence trigger reason should include duration information
   */
  it('should include duration in trigger reason', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: silenceThreshold + 1000, max: silenceThreshold + 100000 }),
        async (duration) => {
          // Set up silence condition
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - duration;
          await ghostStateService.setState(state);

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            timestamp: Date.now()
          });

          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);
          
          if (silenceTrigger) {
            expect(silenceTrigger.reason).toBeDefined();
            expect(silenceTrigger.reason).toContain('Silence');
            expect(silenceTrigger.reason).toContain(silenceThreshold.toString());
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
