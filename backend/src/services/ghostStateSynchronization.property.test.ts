/**
 * Property-Based Test: Ghost State Synchronization
 * 
 * Feature: wraithnet, Property 45: Ghost state synchronization
 * 
 * Tests that ghost state transitions are properly synchronized to Redis
 * for real-time access across the system.
 * 
 * Validates: Requirements 14.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';
import redisClient from '../config/redis';

describe('Property 45: Ghost State Synchronization', () => {
  beforeEach(async () => {
    // Reset state before each test
    await ghostStateService.resetState();
  });

  /**
   * Property: For any ghost mode transition, the new state should be 
   * immediately retrievable from Redis
   */
  it('should synchronize mode transitions to Redis immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random mode transitions
        fc.constantFrom(
          GhostMode.WHISPERER,
          GhostMode.POLTERGEIST,
          GhostMode.TRICKSTER,
          GhostMode.DEMON
        ),
        fc.constantFrom(
          GhostMode.WHISPERER,
          GhostMode.POLTERGEIST,
          GhostMode.TRICKSTER,
          GhostMode.DEMON
        ),
        async (initialMode, targetMode) => {
          // Set initial mode
          await ghostStateService.transitionMode(initialMode);
          
          // Transition to target mode
          await ghostStateService.transitionMode(targetMode);
          
          // Verify state is immediately retrievable from Redis
          const stateFromRedis = await ghostStateService.getState();
          
          // State should match the target mode
          expect(stateFromRedis.currentMode).toBe(targetMode);
          
          // Verify it's actually in Redis (not just in memory)
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData.currentMode).toBe(targetMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any intensity update, the new intensity should be
   * immediately synchronized to Redis
   */
  it('should synchronize intensity updates to Redis immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random intensity deltas between -50 and +50
        fc.integer({ min: -50, max: 50 }),
        async (intensityDelta) => {
          // Get initial state
          const initialState = await ghostStateService.getState();
          const initialIntensity = initialState.intensity;
          
          // Update intensity
          await ghostStateService.updateIntensity(intensityDelta);
          
          // Calculate expected intensity (clamped 0-100)
          const expectedIntensity = Math.max(0, Math.min(100, initialIntensity + intensityDelta));
          
          // Verify state is immediately retrievable from Redis
          const stateFromRedis = await ghostStateService.getState();
          expect(stateFromRedis.intensity).toBe(expectedIntensity);
          
          // Verify it's actually in Redis
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData.intensity).toBe(expectedIntensity);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any intervention recording, the trigger history should be
   * immediately synchronized to Redis
   */
  it('should synchronize intervention recordings to Redis immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random trigger types
        fc.constantFrom(
          TriggerType.KEYWORD,
          TriggerType.SILENCE,
          TriggerType.SENTIMENT,
          TriggerType.TIME,
          TriggerType.NARRATIVE
        ),
        // Generate random data
        fc.record({
          value: fc.string(),
          timestamp: fc.integer({ min: 0, max: Date.now() })
        }),
        async (triggerType, data) => {
          // Get initial history length
          const initialHistory = await ghostStateService.getTriggerHistory();
          const initialLength = initialHistory.length;
          
          // Record intervention
          await ghostStateService.recordIntervention(triggerType, data);
          
          // Verify history is immediately updated in Redis
          const updatedHistory = await ghostStateService.getTriggerHistory();
          expect(updatedHistory.length).toBe(initialLength + 1);
          
          // Verify the last event matches what we recorded
          const lastEvent = updatedHistory[updatedHistory.length - 1];
          expect(lastEvent.type).toBe(triggerType);
          expect(lastEvent.data).toEqual(data);
          
          // Verify it's actually in Redis
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData.triggerHistory.length).toBe(initialLength + 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Multiple rapid state changes should all be synchronized
   * without data loss
   */
  it('should handle rapid state changes without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of mode transitions
        fc.array(
          fc.constantFrom(
            GhostMode.WHISPERER,
            GhostMode.POLTERGEIST,
            GhostMode.TRICKSTER,
            GhostMode.DEMON
          ),
          { minLength: 3, maxLength: 10 }
        ),
        async (modeSequence) => {
          // Apply all mode transitions rapidly
          for (const mode of modeSequence) {
            await ghostStateService.transitionMode(mode);
          }
          
          // Final state should match the last mode in sequence
          const finalState = await ghostStateService.getState();
          const expectedMode = modeSequence[modeSequence.length - 1];
          expect(finalState.currentMode).toBe(expectedMode);
          
          // Verify trigger history contains all transitions
          expect(finalState.triggerHistory.length).toBeGreaterThanOrEqual(modeSequence.length);
          
          // Verify it's in Redis
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData.currentMode).toBe(expectedMode);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: State retrieved from Redis should always be valid and complete
   */
  it('should always retrieve valid and complete state from Redis', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random state modifications
        fc.constantFrom(
          GhostMode.WHISPERER,
          GhostMode.POLTERGEIST,
          GhostMode.TRICKSTER,
          GhostMode.DEMON
        ),
        fc.integer({ min: -100, max: 100 }),
        fc.constantFrom(
          TriggerType.KEYWORD,
          TriggerType.SILENCE,
          TriggerType.SENTIMENT
        ),
        async (mode, intensityDelta, triggerType) => {
          // Modify state in various ways
          await ghostStateService.transitionMode(mode);
          await ghostStateService.updateIntensity(intensityDelta);
          await ghostStateService.recordIntervention(triggerType, { test: true });
          
          // Retrieve state
          const state = await ghostStateService.getState();
          
          // Verify state structure is complete
          expect(state).toHaveProperty('currentMode');
          expect(state).toHaveProperty('intensity');
          expect(state).toHaveProperty('lastInterventionTime');
          expect(state).toHaveProperty('triggerHistory');
          
          // Verify values are valid
          expect(Object.values(GhostMode)).toContain(state.currentMode);
          expect(state.intensity).toBeGreaterThanOrEqual(0);
          expect(state.intensity).toBeLessThanOrEqual(100);
          expect(state.lastInterventionTime).toBeGreaterThan(0);
          expect(Array.isArray(state.triggerHistory)).toBe(true);
          
          // Verify Redis contains the same data
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData).toEqual(state);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Concurrent reads should always return consistent state
   */
  it('should return consistent state across concurrent reads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          GhostMode.WHISPERER,
          GhostMode.POLTERGEIST,
          GhostMode.TRICKSTER,
          GhostMode.DEMON
        ),
        async (targetMode) => {
          // Set a specific mode
          await ghostStateService.transitionMode(targetMode);
          
          // Perform multiple concurrent reads
          const reads = await Promise.all([
            ghostStateService.getState(),
            ghostStateService.getState(),
            ghostStateService.getState(),
            ghostStateService.getState(),
            ghostStateService.getState()
          ]);
          
          // All reads should return the same mode
          for (const state of reads) {
            expect(state.currentMode).toBe(targetMode);
          }
          
          // All reads should have the same intensity
          const firstIntensity = reads[0].intensity;
          for (const state of reads) {
            expect(state.intensity).toBe(firstIntensity);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: State reset should synchronize default state to Redis
   */
  it('should synchronize reset state to Redis', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random initial state
        fc.constantFrom(
          GhostMode.POLTERGEIST,
          GhostMode.TRICKSTER,
          GhostMode.DEMON
        ),
        fc.integer({ min: 50, max: 100 }),
        async (initialMode, initialIntensity) => {
          // Set non-default state
          await ghostStateService.transitionMode(initialMode);
          await ghostStateService.updateIntensity(initialIntensity - 30);
          
          // Reset state
          const resetState = await ghostStateService.resetState();
          
          // Verify reset state is default
          expect(resetState.currentMode).toBe(GhostMode.WHISPERER);
          expect(resetState.intensity).toBe(30);
          expect(resetState.triggerHistory.length).toBe(0);
          
          // Verify it's synchronized to Redis
          const stateFromRedis = await ghostStateService.getState();
          expect(stateFromRedis.currentMode).toBe(GhostMode.WHISPERER);
          expect(stateFromRedis.intensity).toBe(30);
          
          // Verify Redis contains the reset state
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData.currentMode).toBe(GhostMode.WHISPERER);
          expect(parsedRedisData.intensity).toBe(30);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Last intervention time should always be updated and synchronized
   */
  it('should synchronize last intervention time updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          TriggerType.KEYWORD,
          TriggerType.SILENCE,
          TriggerType.SENTIMENT
        ),
        async (triggerType) => {
          const beforeTime = Date.now();
          
          // Record intervention
          await ghostStateService.recordIntervention(triggerType, {});
          
          const afterTime = Date.now();
          
          // Verify last intervention time is updated
          const state = await ghostStateService.getState();
          expect(state.lastInterventionTime).toBeGreaterThanOrEqual(beforeTime);
          expect(state.lastInterventionTime).toBeLessThanOrEqual(afterTime);
          
          // Verify it's in Redis
          const rawRedisData = await redisClient.get('ghost:state');
          expect(rawRedisData).toBeTruthy();
          
          const parsedRedisData = JSON.parse(rawRedisData!);
          expect(parsedRedisData.lastInterventionTime).toBe(state.lastInterventionTime);
        }
      ),
      { numRuns: 50 }
    );
  });
});
