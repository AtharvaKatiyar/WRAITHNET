/**
 * Property-Based Test: Ghost Event Sequencing
 * 
 * Feature: wraithnet, Property 14: Ghost event sequencing
 * 
 * Tests that when multiple ghost events are triggered simultaneously,
 * they are executed in priority order without conflicts.
 * 
 * Validates: Requirements 3.5, 17.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import triggerService from './triggerService';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';

describe('Property 14: Ghost Event Sequencing', () => {
  beforeEach(async () => {
    // Reset state before each test
    await ghostStateService.resetState();
  });

  /**
   * Property: For any set of triggers, results should be sorted by priority
   */
  it('should sort multiple triggers by priority', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        // Generate messages that trigger multiple types
        fc.record({
          hasKeyword: fc.boolean(),
          hasSentiment: fc.boolean(),
          hasSilence: fc.boolean()
        }),
        async (config) => {
          // Set up conditions for multiple triggers
          let message = 'The situation is ';

          if (config.hasKeyword) {
            message += 'help ';
          }
          if (config.hasSentiment) {
            message += 'terrible awful horrible ';
          }

          // Set up silence condition if needed
          if (config.hasSilence) {
            const state = await ghostStateService.getState();
            state.lastInterventionTime = Date.now() - (silenceThreshold + 10000);
            await ghostStateService.setState(state);
          }

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          // Verify results are sorted by priority (descending)
          for (let i = 0; i < results.length - 1; i++) {
            expect(results[i].priority).toBeGreaterThanOrEqual(results[i + 1].priority);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Highest priority trigger should be processed first
   */
  it('should process highest priority trigger first', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate messages with multiple triggers
        fc.constantFrom(
          'I need help but I hate this terrible situation',
          'This is awful and I am lost and confused',
          'Death and fear but also help me please'
        ),
        async (message) => {
          // Reset state
          await ghostStateService.resetState();

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          if (results.length === 0) return;

          // Get the highest priority trigger
          const highestPriority = results[0];

          // Process triggers
          await triggerService.processTriggers(results);

          // Verify the mode matches the highest priority trigger
          const state = await ghostStateService.getState();
          if (highestPriority.targetMode) {
            expect(state.currentMode).toBe(highestPriority.targetMode);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Keyword triggers should always have higher priority than sentiment
   */
  it('should prioritize keywords over sentiment consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('help', 'death', 'trick', 'rage'),
        fc.constantFrom(
          'wonderful amazing beautiful',
          'terrible awful horrible',
          'good great positive',
          'bad wrong negative'
        ),
        async (keyword, sentimentWords) => {
          // Create message with both
          const message = `${sentimentWords} ${keyword} ${sentimentWords}`;

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          // Find both trigger types
          const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
          const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);

          // If both exist, keyword should have higher priority
          if (keywordTrigger && sentimentTrigger) {
            expect(keywordTrigger.priority).toBeGreaterThan(sentimentTrigger.priority);
            
            // Keyword should be first in sorted results
            const keywordIndex = results.indexOf(keywordTrigger);
            const sentimentIndex = results.indexOf(sentimentTrigger);
            expect(keywordIndex).toBeLessThan(sentimentIndex);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Sentiment triggers should have higher priority than silence
   */
  it('should prioritize sentiment over silence consistently', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'wonderful amazing beautiful',
          'terrible awful horrible'
        ),
        async (sentimentWords) => {
          // Set up silence condition
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - (silenceThreshold + 10000);
          await ghostStateService.setState(state);

          // Evaluate triggers with sentiment message
          const results = await triggerService.evaluateTriggers({
            message: sentimentWords,
            timestamp: Date.now()
          });

          // Find both trigger types
          const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);

          // If both exist, sentiment should have higher priority
          if (sentimentTrigger && silenceTrigger) {
            expect(sentimentTrigger.priority).toBeGreaterThan(silenceTrigger.priority);
            
            // Sentiment should be first in sorted results
            const sentimentIndex = results.indexOf(sentimentTrigger);
            const silenceIndex = results.indexOf(silenceTrigger);
            expect(sentimentIndex).toBeLessThan(silenceIndex);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Only one trigger should be processed even when multiple are detected
   */
  it('should process only the highest priority trigger', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'I need help with this terrible awful situation',
          'Death and fear but I am lost and confused'
        ),
        async (message) => {
          // Set up silence condition too
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - (silenceThreshold + 10000);
          await ghostStateService.setState(state);

          // Get initial history length
          const initialHistory = await ghostStateService.getTriggerHistory();
          const initialLength = initialHistory.length;

          // Evaluate and process
          const results = await triggerService.evaluateAndProcess({
            message,
            timestamp: Date.now()
          });

          // Should have detected multiple triggers
          expect(results.length).toBeGreaterThan(0);

          // But only one should be processed (one new history entry or mode transition)
          const updatedHistory = await ghostStateService.getTriggerHistory();
          const historyGrowth = updatedHistory.length - initialLength;
          
          // Should have added 1-2 entries (mode transition creates 1-2 entries)
          expect(historyGrowth).toBeGreaterThanOrEqual(1);
          expect(historyGrowth).toBeLessThanOrEqual(2);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Priority ordering should be consistent across evaluations
   */
  it('should maintain consistent priority ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'help me with this terrible situation',
          'I hate needing assistance',
          'death and fear but also lost'
        ),
        fc.integer({ min: 1, max: 5 }),
        async (message, repeatCount) => {
          const prioritySequences: number[][] = [];

          for (let i = 0; i < repeatCount; i++) {
            // Reset state
            await ghostStateService.resetState();

            // Evaluate triggers
            const results = await triggerService.evaluateTriggers({
              message,
              timestamp: Date.now()
            });

            // Record priority sequence
            const priorities = results.map(r => r.priority);
            prioritySequences.push(priorities);
          }

          // All sequences should be identical
          if (prioritySequences.length > 1) {
            const firstSequence = JSON.stringify(prioritySequences[0]);
            for (const sequence of prioritySequences) {
              expect(JSON.stringify(sequence)).toBe(firstSequence);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Trigger types should have fixed priority levels
   */
  it('should maintain fixed priority levels for trigger types', async () => {
    const silenceThreshold = triggerService.getSilenceThreshold();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (iteration) => {
          // Set up all trigger types
          const state = await ghostStateService.getState();
          state.lastInterventionTime = Date.now() - (silenceThreshold + 10000);
          await ghostStateService.setState(state);

          // Message with keyword and sentiment
          const message = 'I need help with this terrible awful situation';

          // Evaluate triggers
          const results = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          // Check priority levels
          const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
          const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);
          const silenceTrigger = results.find(r => r.triggerType === TriggerType.SILENCE);

          // Verify fixed priority levels
          if (keywordTrigger) {
            expect(keywordTrigger.priority).toBe(80);
          }
          if (sentimentTrigger) {
            expect(sentimentTrigger.priority).toBe(60);
          }
          if (silenceTrigger) {
            expect(silenceTrigger.priority).toBe(50);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: No trigger conflicts should occur during processing
   */
  it('should process triggers without conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            'help me please',
            'this is terrible',
            'I hate this',
            'death approaches',
            'play a game',
            'fear and terror'
          ),
          { minLength: 3, maxLength: 10 }
        ),
        async (messages) => {
          // Process multiple messages in sequence
          for (const message of messages) {
            await triggerService.evaluateAndProcess({
              message,
              timestamp: Date.now()
            });

            // Verify state is valid after each processing
            const state = await ghostStateService.getState();
            expect(state.currentMode).toBeDefined();
            expect([
              GhostMode.WHISPERER,
              GhostMode.POLTERGEIST,
              GhostMode.TRICKSTER,
              GhostMode.DEMON
            ]).toContain(state.currentMode);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Trigger evaluation should be deterministic for same input
   */
  it('should produce deterministic results for same input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'help me with this terrible situation',
          'death and fear consume me',
          'let us play a trick'
        ),
        async (message) => {
          // Evaluate same message multiple times
          const results1 = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          const results2 = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          // Results should have same structure (excluding silence which depends on time)
          const nonSilenceResults1 = results1.filter(r => r.triggerType !== TriggerType.SILENCE);
          const nonSilenceResults2 = results2.filter(r => r.triggerType !== TriggerType.SILENCE);

          expect(nonSilenceResults1.length).toBe(nonSilenceResults2.length);

          // Same trigger types should be detected
          for (let i = 0; i < nonSilenceResults1.length; i++) {
            expect(nonSilenceResults1[i].triggerType).toBe(nonSilenceResults2[i].triggerType);
            expect(nonSilenceResults1[i].priority).toBe(nonSilenceResults2[i].priority);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Empty trigger results should be handled gracefully
   */
  it('should handle empty trigger results without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'The weather is nice today',
          'Just a normal conversation',
          'Nothing special here'
        ),
        async (message) => {
          // These messages should not trigger anything
          const results = await triggerService.evaluateTriggers({
            message,
            timestamp: Date.now()
          });

          // Process empty or minimal results
          await triggerService.processTriggers(results);

          // Should not throw error
          const state = await ghostStateService.getState();
          expect(state).toBeDefined();
        }
      ),
      { numRuns: 30 }
    );
  });
});
