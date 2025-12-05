/**
 * Property-Based Test: Service Failure Fallback
 * 
 * Feature: wraithnet, Property 57: Service failure fallback
 * 
 * Tests that scheduled events handle failures gracefully with
 * fallback behavior and retry logic.
 * 
 * Validates: Requirements 20.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import ghostScheduler from './ghostScheduler';
import ghostStateService from './ghostStateService';
import { GhostMode } from '../types/ghost';

describe('Property 57: Service Failure Fallback', () => {
  beforeEach(async () => {
    // Reset ghost state
    await ghostStateService.resetState();
    
    // Stop scheduler if running
    if (ghostScheduler.isSchedulerRunning()) {
      ghostScheduler.stop();
    }
  });

  afterEach(() => {
    // Clean up scheduler
    if (ghostScheduler.isSchedulerRunning()) {
      ghostScheduler.stop();
    }
    
    // Restore all mocks
    vi.restoreAllMocks();
  });

  /**
   * Property: For any scheduled event that fails, the system should
   * continue operating without crashing
   */
  it('should handle event execution failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 200 }),
        fc.constantFrom('network error', 'timeout', 'invalid state', 'unknown error'),
        async (delayMs, errorMessage) => {
          ghostScheduler.start();

          let errorThrown = false;
          let systemStable = true;

          // Queue an event that will fail
          ghostScheduler.queueEvent({
            id: `failing-event-${Date.now()}`,
            name: 'Failing Event',
            delayMs,
            action: async () => {
              errorThrown = true;
              throw new Error(errorMessage);
            }
          });

          // Wait for execution
          await new Promise(resolve => setTimeout(resolve, delayMs + 50));

          // Verify error was thrown
          expect(errorThrown).toBe(true);

          // Verify system is still stable
          try {
            const state = await ghostStateService.getState();
            expect(state).toBeDefined();
            expect(state.currentMode).toBeDefined();
            systemStable = true;
          } catch (error) {
            systemStable = false;
          }

          expect(systemStable).toBe(true);
        }
      ),
      { numRuns: 15 }
    );
  }, 10000);

  /**
   * Property: Failed events should be removed from queue
   */
  it('should remove failed events from queue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 200 }),
        async (delayMs) => {
          ghostScheduler.start();

          const eventId = `failing-event-${Date.now()}`;

          ghostScheduler.queueEvent({
            id: eventId,
            name: 'Failing Event',
            delayMs,
            action: async () => {
              throw new Error('Intentional failure');
            }
          });

          // Verify event is queued
          let queued = ghostScheduler.getQueuedEvents();
          expect(queued.some(e => e.id === eventId)).toBe(true);

          // Wait for execution and failure
          await new Promise(resolve => setTimeout(resolve, delayMs + 50));

          // Verify event is removed from queue
          queued = ghostScheduler.getQueuedEvents();
          expect(queued.some(e => e.id === eventId)).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Multiple failing events should not affect each other
   */
  it('should isolate failures between events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 50, max: 150 }), { minLength: 2, maxLength: 5 }),
        async (delays) => {
          ghostScheduler.start();

          let successCount = 0;
          let failureCount = 0;

          // Queue multiple events, some will fail
          for (let i = 0; i < delays.length; i++) {
            const shouldFail = i % 2 === 0;

            ghostScheduler.queueEvent({
              id: `event-${i}-${Date.now()}`,
              name: `Event ${i}`,
              delayMs: delays[i],
              action: async () => {
                if (shouldFail) {
                  failureCount++;
                  throw new Error('Intentional failure');
                } else {
                  successCount++;
                }
              }
            });
          }

          // Wait for all executions
          const maxDelay = Math.max(...delays);
          await new Promise(resolve => setTimeout(resolve, maxDelay + 100));

          // Verify both successes and failures occurred
          expect(failureCount).toBeGreaterThan(0);
          expect(successCount).toBeGreaterThan(0);

          // System should still be operational
          const state = await ghostStateService.getState();
          expect(state).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Scheduler should continue operating after failures
   */
  it('should continue scheduling after event failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }),
        async (eventCount) => {
          ghostScheduler.start();

          // Queue events that will fail
          for (let i = 0; i < eventCount; i++) {
            ghostScheduler.queueEvent({
              id: `failing-${i}`,
              name: `Failing ${i}`,
              delayMs: 50 + i * 10,
              action: async () => {
                throw new Error('Failure');
              }
            });
          }

          // Wait for failures
          await new Promise(resolve => setTimeout(resolve, 200));

          // Scheduler should still be running
          expect(ghostScheduler.isSchedulerRunning()).toBe(true);

          // Should be able to queue new events
          let newEventExecuted = false;
          ghostScheduler.queueEvent({
            id: 'new-event',
            name: 'New Event',
            delayMs: 50,
            action: async () => {
              newEventExecuted = true;
            }
          });

          await new Promise(resolve => setTimeout(resolve, 100));

          expect(newEventExecuted).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  }, 10000);

  /**
   * Property: State service failures should not crash scheduler
   */
  it('should handle state service failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(GhostMode.WHISPERER, GhostMode.DEMON, GhostMode.TRICKSTER),
        async (targetMode) => {
          ghostScheduler.start();

          // Mock state service to fail
          const originalTransition = ghostStateService.transitionMode;
          let failureOccurred = false;

          vi.spyOn(ghostStateService, 'transitionMode').mockImplementation(async () => {
            failureOccurred = true;
            throw new Error('State service unavailable');
          });

          // Schedule intervention that will fail
          ghostScheduler.scheduleIntervention(50, targetMode, 'Test');

          // Wait for execution
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify failure occurred
          expect(failureOccurred).toBe(true);

          // Restore original function
          vi.mocked(ghostStateService.transitionMode).mockRestore();

          // Scheduler should still be operational
          expect(ghostScheduler.isSchedulerRunning()).toBe(true);

          // Should be able to schedule new events
          let newEventExecuted = false;
          ghostScheduler.queueEvent({
            id: 'recovery-test',
            name: 'Recovery Test',
            delayMs: 50,
            action: async () => {
              newEventExecuted = true;
            }
          });

          await new Promise(resolve => setTimeout(resolve, 100));

          expect(newEventExecuted).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Queued events should execute even if previous events failed
   */
  it('should execute subsequent events after failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 5 }),
        async (totalEvents) => {
          ghostScheduler.start();

          const executionOrder: number[] = [];

          // Queue events where first one fails
          for (let i = 0; i < totalEvents; i++) {
            ghostScheduler.queueEvent({
              id: `event-${i}`,
              name: `Event ${i}`,
              delayMs: 50 + i * 20,
              action: async () => {
                if (i === 0) {
                  throw new Error('First event fails');
                }
                executionOrder.push(i);
              }
            });
          }

          // Wait for all executions
          await new Promise(resolve => setTimeout(resolve, 300));

          // All events except first should have executed
          expect(executionOrder.length).toBe(totalEvents - 1);
          
          // Should be in order
          for (let i = 0; i < executionOrder.length; i++) {
            expect(executionOrder[i]).toBe(i + 1);
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 10000);

  /**
   * Property: Cancelling events should work even after failures
   */
  it('should allow cancellation after failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 300 }),
        async (delayMs) => {
          ghostScheduler.start();

          // Queue a failing event
          ghostScheduler.queueEvent({
            id: 'failing',
            name: 'Failing',
            delayMs: 50,
            action: async () => {
              throw new Error('Failure');
            }
          });

          // Wait for failure
          await new Promise(resolve => setTimeout(resolve, 100));

          // Queue a new event
          ghostScheduler.queueEvent({
            id: 'cancellable',
            name: 'Cancellable',
            delayMs,
            action: async () => {}
          });

          // Should be able to cancel it
          const cancelled = ghostScheduler.cancelQueuedEvent('cancellable');
          expect(cancelled).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Scheduler state queries should work after failures
   */
  it('should provide accurate state after failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (failureCount) => {
          ghostScheduler.start();

          // Cause multiple failures
          for (let i = 0; i < failureCount; i++) {
            ghostScheduler.queueEvent({
              id: `fail-${i}`,
              name: `Fail ${i}`,
              delayMs: 50,
              action: async () => {
                throw new Error('Failure');
              }
            });
          }

          // Wait for failures
          await new Promise(resolve => setTimeout(resolve, 100));

          // Should be able to query state
          const scheduled = ghostScheduler.getScheduledEvents();
          const queued = ghostScheduler.getQueuedEvents();
          const running = ghostScheduler.isSchedulerRunning();

          expect(Array.isArray(scheduled)).toBe(true);
          expect(Array.isArray(queued)).toBe(true);
          expect(running).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Stop should work correctly even after failures
   */
  it('should stop cleanly after failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (failureCount) => {
          ghostScheduler.start();

          // Cause failures
          for (let i = 0; i < failureCount; i++) {
            ghostScheduler.queueEvent({
              id: `fail-${i}`,
              name: `Fail ${i}`,
              delayMs: 50,
              action: async () => {
                throw new Error('Failure');
              }
            });
          }

          // Wait for failures
          await new Promise(resolve => setTimeout(resolve, 100));

          // Should stop cleanly
          ghostScheduler.stop();
          expect(ghostScheduler.isSchedulerRunning()).toBe(false);

          // Queue should be cleared
          const queued = ghostScheduler.getQueuedEvents();
          expect(queued.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Restart should work after failures
   */
  it('should restart successfully after failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (cycleCount) => {
          for (let cycle = 0; cycle < cycleCount; cycle++) {
            ghostScheduler.start();

            // Cause a failure
            ghostScheduler.queueEvent({
              id: `fail-${cycle}`,
              name: `Fail ${cycle}`,
              delayMs: 50,
              action: async () => {
                throw new Error('Failure');
              }
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            ghostScheduler.stop();
            expect(ghostScheduler.isSchedulerRunning()).toBe(false);
          }

          // Final restart should work
          ghostScheduler.start();
          expect(ghostScheduler.isSchedulerRunning()).toBe(true);

          // Should be able to queue events
          let executed = false;
          ghostScheduler.queueEvent({
            id: 'final-test',
            name: 'Final Test',
            delayMs: 50,
            action: async () => {
              executed = true;
            }
          });

          await new Promise(resolve => setTimeout(resolve, 100));

          expect(executed).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);
});
