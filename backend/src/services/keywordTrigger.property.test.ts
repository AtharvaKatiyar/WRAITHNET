/**
 * Property-Based Test: Keyword Trigger Mode Transition
 * 
 * Feature: wraithnet, Property 11: Keyword trigger mode transition
 * 
 * Tests that keyword triggers correctly transition the ghost to the
 * appropriate personality mode.
 * 
 * Validates: Requirements 5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import triggerService from './triggerService';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';

describe('Property 11: Keyword Trigger Mode Transition', () => {
  beforeEach(async () => {
    // Reset state before each test
    await ghostStateService.resetState();
  });

  /**
   * Property: For any keyword from a mode's keyword list, when that keyword
   * appears in a message, the ghost should transition to that mode
   */
  it('should transition to correct mode for any keyword', async () => {
    // Get all keyword configurations
    const keywordConfig = triggerService.getKeywordTriggers();

    // Create test cases for each mode and its keywords
    const testCases: Array<{ keyword: string; expectedMode: GhostMode }> = [];
    
    for (const [modeName, config] of Object.entries(keywordConfig)) {
      for (const keyword of config.keywords) {
        testCases.push({
          keyword,
          expectedMode: config.mode
        });
      }
    }

    await fc.assert(
      fc.asyncProperty(
        // Pick a random test case
        fc.constantFrom(...testCases),
        // Generate random surrounding text
        fc.array(fc.constantFrom('the', 'a', 'is', 'was', 'very', 'quite', 'really'), {
          minLength: 0,
          maxLength: 5
        }),
        fc.array(fc.constantFrom('today', 'now', 'here', 'there', 'always', 'never'), {
          minLength: 0,
          maxLength: 5
        }),
        async (testCase, prefixWords, suffixWords) => {
          // Reset to a different mode first
          const initialMode = testCase.expectedMode === GhostMode.WHISPERER 
            ? GhostMode.DEMON 
            : GhostMode.WHISPERER;
          await ghostStateService.transitionMode(initialMode);

          // Construct message with keyword embedded in random text
          const prefix = prefixWords.join(' ');
          const suffix = suffixWords.join(' ');
          const message = [prefix, testCase.keyword, suffix]
            .filter(s => s.length > 0)
            .join(' ');

          // Evaluate and process triggers
          await triggerService.evaluateAndProcess({
            message,
            timestamp: Date.now()
          });

          // Verify mode transition
          const state = await ghostStateService.getState();
          expect(state.currentMode).toBe(testCase.expectedMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Keywords should be detected case-insensitively
   */
  it('should detect keywords regardless of case', async () => {
    const keywordConfig = triggerService.getKeywordTriggers();
    
    // Get a sample keyword from each mode
    const sampleKeywords = Object.entries(keywordConfig).map(([_, config]) => ({
      keyword: config.keywords[0],
      mode: config.mode
    }));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...sampleKeywords),
        fc.constantFrom('lower', 'UPPER', 'Title', 'MiXeD'),
        async (sample, caseType) => {
          // Reset to different mode
          const initialMode = sample.mode === GhostMode.WHISPERER 
            ? GhostMode.DEMON 
            : GhostMode.WHISPERER;
          await ghostStateService.transitionMode(initialMode);

          // Transform keyword case
          let keyword = sample.keyword;
          switch (caseType) {
            case 'lower':
              keyword = keyword.toLowerCase();
              break;
            case 'UPPER':
              keyword = keyword.toUpperCase();
              break;
            case 'Title':
              keyword = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
              break;
            case 'MiXeD':
              keyword = keyword.split('').map((c, i) => 
                i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
              ).join('');
              break;
          }

          // Process message
          await triggerService.evaluateAndProcess({
            message: `I am feeling ${keyword} right now`,
            timestamp: Date.now()
          });

          // Should still detect and transition
          const state = await ghostStateService.getState();
          expect(state.currentMode).toBe(sample.mode);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Keyword detection should work with any position in message
   */
  it('should detect keywords at any position in message', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Pick a keyword
        fc.constantFrom('help', 'death', 'trick', 'rage'),
        // Generate random words before and after
        fc.array(fc.lorem({ maxCount: 1 }), { minLength: 0, maxLength: 10 }),
        fc.array(fc.lorem({ maxCount: 1 }), { minLength: 0, maxLength: 10 }),
        async (keyword, before, after) => {
          // Determine expected mode
          const keywordConfig = triggerService.getKeywordTriggers();
          let expectedMode: GhostMode | undefined;
          
          for (const config of Object.values(keywordConfig)) {
            if (config.keywords.includes(keyword)) {
              expectedMode = config.mode;
              break;
            }
          }

          if (!expectedMode) return; // Skip if keyword not found

          // Reset to different mode
          const initialMode = expectedMode === GhostMode.WHISPERER 
            ? GhostMode.DEMON 
            : GhostMode.WHISPERER;
          await ghostStateService.transitionMode(initialMode);

          // Construct message with keyword at various positions
          const message = [...before, keyword, ...after].join(' ');

          // Process message
          await triggerService.evaluateAndProcess({
            message,
            timestamp: Date.now()
          });

          // Verify transition
          const state = await ghostStateService.getState();
          expect(state.currentMode).toBe(expectedMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple keywords in same message should trigger based on first match
   */
  it('should handle multiple keywords consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of keywords from different modes
        fc.shuffledSubarray(
          ['help', 'death', 'trick', 'rage', 'lost', 'kill', 'play', 'hate'],
          { minLength: 2, maxLength: 4 }
        ),
        async (keywords) => {
          // Reset state
          await ghostStateService.resetState();

          // Create message with all keywords
          const message = keywords.join(' and ');

          // Process message
          const results = await triggerService.evaluateAndProcess({
            message,
            timestamp: Date.now()
          });

          // Should have detected at least one keyword trigger
          const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
          expect(keywordTrigger).toBeDefined();
          expect(keywordTrigger?.targetMode).toBeDefined();

          // State should have transitioned
          const state = await ghostStateService.getState();
          expect(state.currentMode).toBe(keywordTrigger?.targetMode);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Keyword triggers should have higher priority than sentiment
   */
  it('should prioritize keyword triggers over sentiment', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Pick a keyword
        fc.constantFrom('help', 'death', 'trick', 'rage'),
        // Add sentiment words
        fc.constantFrom(
          'terrible awful horrible',
          'wonderful amazing beautiful',
          'bad wrong negative',
          'good great positive'
        ),
        async (keyword, sentimentWords) => {
          // Determine expected mode from keyword
          const keywordConfig = triggerService.getKeywordTriggers();
          let expectedMode: GhostMode | undefined;
          
          for (const config of Object.values(keywordConfig)) {
            if (config.keywords.includes(keyword)) {
              expectedMode = config.mode;
              break;
            }
          }

          if (!expectedMode) return;

          // Reset state
          await ghostStateService.resetState();

          // Create message with both keyword and sentiment
          const message = `${sentimentWords} ${keyword} ${sentimentWords}`;

          // Process message
          const results = await triggerService.evaluateAndProcess({
            message,
            timestamp: Date.now()
          });

          // Keyword trigger should be present and have higher priority
          const keywordTrigger = results.find(r => r.triggerType === TriggerType.KEYWORD);
          const sentimentTrigger = results.find(r => r.triggerType === TriggerType.SENTIMENT);

          expect(keywordTrigger).toBeDefined();
          
          if (sentimentTrigger) {
            expect(keywordTrigger!.priority).toBeGreaterThan(sentimentTrigger.priority);
          }

          // Should transition to keyword's mode, not sentiment's mode
          const state = await ghostStateService.getState();
          expect(state.currentMode).toBe(expectedMode);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Trigger history should record keyword triggers
   */
  it('should record keyword triggers in history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('help', 'death', 'trick', 'rage'),
        async (keyword) => {
          // Reset state
          await ghostStateService.resetState();
          const initialHistory = await ghostStateService.getTriggerHistory();
          const initialLength = initialHistory.length;

          // Process message with keyword
          await triggerService.evaluateAndProcess({
            message: `I need ${keyword} right now`,
            timestamp: Date.now()
          });

          // History should have new entry
          const updatedHistory = await ghostStateService.getTriggerHistory();
          expect(updatedHistory.length).toBeGreaterThan(initialLength);

          // Last entry should be from keyword trigger or mode transition
          const lastEntry = updatedHistory[updatedHistory.length - 1];
          expect([TriggerType.KEYWORD, TriggerType.NARRATIVE]).toContain(lastEntry.type);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Repeated keyword triggers should maintain mode
   */
  it('should maintain mode on repeated keyword triggers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('help', 'death', 'trick', 'rage'),
        fc.integer({ min: 2, max: 5 }),
        async (keyword, repeatCount) => {
          // Determine expected mode
          const keywordConfig = triggerService.getKeywordTriggers();
          let expectedMode: GhostMode | undefined;
          
          for (const config of Object.values(keywordConfig)) {
            if (config.keywords.includes(keyword)) {
              expectedMode = config.mode;
              break;
            }
          }

          if (!expectedMode) return;

          // Reset state
          await ghostStateService.resetState();

          // Process same keyword multiple times
          for (let i = 0; i < repeatCount; i++) {
            await triggerService.evaluateAndProcess({
              message: `Message ${i}: ${keyword}`,
              timestamp: Date.now()
            });

            // Should maintain the same mode
            const state = await ghostStateService.getState();
            expect(state.currentMode).toBe(expectedMode);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: All configured keywords should be detectable
   */
  it('should detect all configured keywords', async () => {
    const keywordConfig = triggerService.getKeywordTriggers();
    
    // Collect all keywords with their expected modes
    const allKeywords: Array<{ keyword: string; mode: GhostMode }> = [];
    for (const config of Object.values(keywordConfig)) {
      for (const keyword of config.keywords) {
        allKeywords.push({ keyword, mode: config.mode });
      }
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...allKeywords),
        async (keywordData) => {
          // Reset to different mode
          const initialMode = keywordData.mode === GhostMode.WHISPERER 
            ? GhostMode.DEMON 
            : GhostMode.WHISPERER;
          await ghostStateService.transitionMode(initialMode);

          // Process message with keyword
          await triggerService.evaluateAndProcess({
            message: keywordData.keyword,
            timestamp: Date.now()
          });

          // Should transition to expected mode
          const state = await ghostStateService.getState();
          expect(state.currentMode).toBe(keywordData.mode);
        }
      ),
      { numRuns: 100 }
    );
  });
});
