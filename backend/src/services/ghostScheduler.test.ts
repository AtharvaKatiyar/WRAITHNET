/**
 * Ghost Scheduler Tests
 * 
 * Tests for scheduled ghost events and interventions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ghostScheduler from './ghostScheduler';
import ghostStateService from './ghostStateService';
import { GhostMode } from '../types/ghost';

describe('Ghost Scheduler', () => {
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
  });

  describe('scheduler lifecycle', () => {
    it('should start the scheduler', () => {
      ghostScheduler.start();
      expect(ghostScheduler.isSchedulerRunning()).toBe(true);
    });

    it('should stop the scheduler', () => {
      ghostScheduler.start();
      ghostScheduler.stop();
      expect(ghostScheduler.isSchedulerRunning()).toBe(false);
    });

    it('should not start twice', () => {
      ghostScheduler.start();
      ghostScheduler.start(); // Should not throw
      expect(ghostScheduler.isSchedulerRunning()).toBe(true);
    });

    it('should initialize default events on start', () => {
      ghostScheduler.start();
      
      const events = ghostScheduler.getScheduledEvents();
      expect(events.length).toBeGreaterThan(0);
      
      // Check for some default events
      const eventIds = events.map(e => e.id);
      expect(eventIds).toContain('midnight-intervention');
      expect(eventIds).toContain('witching-hour');
    });
  });

  describe('scheduleEvent', () => {
    it('should schedule a valid cron event', () => {
      ghostScheduler.start();
      
      ghostScheduler.scheduleEvent({
        id: 'test-event',
        name: 'Test Event',
        cronExpression: '0 0 * * *', // Daily at midnight
        action: async () => {
          // Test action
        }
      });

      const events = ghostScheduler.getScheduledEvents();
      const testEvent = events.find(e => e.id === 'test-event');
      
      expect(testEvent).toBeDefined();
      expect(testEvent?.name).toBe('Test Event');
      expect(testEvent?.cronExpression).toBe('0 0 * * *');
      expect(testEvent?.enabled).toBe(true);
    });

    it('should reject invalid cron expression', () => {
      ghostScheduler.start();
      
      expect(() => {
        ghostScheduler.scheduleEvent({
          id: 'invalid-event',
          name: 'Invalid Event',
          cronExpression: 'not-a-cron-expression',
          action: async () => {}
        });
      }).toThrow();
    });

    it('should replace existing event with same id', () => {
      ghostScheduler.start();
      
      ghostScheduler.scheduleEvent({
        id: 'replaceable-event',
        name: 'Original Event',
        cronExpression: '0 0 * * *',
        action: async () => {}
      });

      ghostScheduler.scheduleEvent({
        id: 'replaceable-event',
        name: 'Replaced Event',
        cronExpression: '0 1 * * *',
        action: async () => {}
      });

      const events = ghostScheduler.getScheduledEvents();
      const event = events.find(e => e.id === 'replaceable-event');
      
      expect(event?.name).toBe('Replaced Event');
      expect(event?.cronExpression).toBe('0 1 * * *');
    });
  });

  describe('queueEvent', () => {
    it('should queue an event for delayed execution', async () => {
      ghostScheduler.start();
      
      let executed = false;
      
      ghostScheduler.queueEvent({
        id: 'test-queued',
        name: 'Test Queued Event',
        delayMs: 100,
        action: async () => {
          executed = true;
        }
      });

      const queued = ghostScheduler.getQueuedEvents();
      expect(queued.length).toBe(1);
      expect(queued[0].id).toBe('test-queued');

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(executed).toBe(true);
      
      // Should be removed from queue after execution
      const queuedAfter = ghostScheduler.getQueuedEvents();
      expect(queuedAfter.length).toBe(0);
    });

    it('should replace existing queued event with same id', () => {
      ghostScheduler.start();
      
      ghostScheduler.queueEvent({
        id: 'replaceable-queued',
        name: 'Original Queued',
        delayMs: 5000,
        action: async () => {}
      });

      ghostScheduler.queueEvent({
        id: 'replaceable-queued',
        name: 'Replaced Queued',
        delayMs: 10000,
        action: async () => {}
      });

      const queued = ghostScheduler.getQueuedEvents();
      expect(queued.length).toBe(1);
      expect(queued[0].name).toBe('Replaced Queued');
    });
  });

  describe('cancelQueuedEvent', () => {
    it('should cancel a queued event', async () => {
      ghostScheduler.start();
      
      let executed = false;
      
      ghostScheduler.queueEvent({
        id: 'cancellable',
        name: 'Cancellable Event',
        delayMs: 100,
        action: async () => {
          executed = true;
        }
      });

      const cancelled = ghostScheduler.cancelQueuedEvent('cancellable');
      expect(cancelled).toBe(true);

      // Wait to ensure it doesn't execute
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(executed).toBe(false);
    });

    it('should return false for non-existent event', () => {
      ghostScheduler.start();
      
      const cancelled = ghostScheduler.cancelQueuedEvent('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('enableEvent and disableEvent', () => {
    it('should disable a scheduled event', () => {
      ghostScheduler.start();
      
      ghostScheduler.scheduleEvent({
        id: 'toggleable',
        name: 'Toggleable Event',
        cronExpression: '0 0 * * *',
        action: async () => {}
      });

      const disabled = ghostScheduler.disableEvent('toggleable');
      expect(disabled).toBe(true);

      const events = ghostScheduler.getScheduledEvents();
      const event = events.find(e => e.id === 'toggleable');
      expect(event?.enabled).toBe(false);
    });

    it('should enable a disabled event', () => {
      ghostScheduler.start();
      
      ghostScheduler.scheduleEvent({
        id: 'toggleable',
        name: 'Toggleable Event',
        cronExpression: '0 0 * * *',
        action: async () => {}
      });

      ghostScheduler.disableEvent('toggleable');
      const enabled = ghostScheduler.enableEvent('toggleable');
      expect(enabled).toBe(true);

      const events = ghostScheduler.getScheduledEvents();
      const event = events.find(e => e.id === 'toggleable');
      expect(event?.enabled).toBe(true);
    });

    it('should return false for non-existent event', () => {
      ghostScheduler.start();
      
      expect(ghostScheduler.disableEvent('non-existent')).toBe(false);
      expect(ghostScheduler.enableEvent('non-existent')).toBe(false);
    });
  });

  describe('removeEvent', () => {
    it('should remove a scheduled event', () => {
      ghostScheduler.start();
      
      ghostScheduler.scheduleEvent({
        id: 'removable',
        name: 'Removable Event',
        cronExpression: '0 0 * * *',
        action: async () => {}
      });

      const removed = ghostScheduler.removeEvent('removable');
      expect(removed).toBe(true);

      const events = ghostScheduler.getScheduledEvents();
      const event = events.find(e => e.id === 'removable');
      expect(event).toBeUndefined();
    });

    it('should return false for non-existent event', () => {
      ghostScheduler.start();
      
      const removed = ghostScheduler.removeEvent('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('scheduleIntervention', () => {
    it('should schedule a ghost intervention', async () => {
      ghostScheduler.start();
      
      const initialState = await ghostStateService.getState();
      expect(initialState.currentMode).toBe(GhostMode.WHISPERER);

      ghostScheduler.scheduleIntervention(
        100,
        GhostMode.DEMON,
        'Test intervention'
      );

      const queued = ghostScheduler.getQueuedEvents();
      expect(queued.length).toBe(1);
      expect(queued[0].name).toContain('demon');

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150));

      const finalState = await ghostStateService.getState();
      expect(finalState.currentMode).toBe(GhostMode.DEMON);
    });

    it('should record intervention in history', async () => {
      ghostScheduler.start();
      
      const initialHistory = await ghostStateService.getTriggerHistory();
      const initialLength = initialHistory.length;

      ghostScheduler.scheduleIntervention(
        100,
        GhostMode.POLTERGEIST,
        'Scheduled test'
      );

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 150));

      const finalHistory = await ghostStateService.getTriggerHistory();
      expect(finalHistory.length).toBeGreaterThan(initialLength);
    });
  });

  describe('getScheduledEvents', () => {
    it('should return all scheduled events', () => {
      ghostScheduler.start();
      
      const events = ghostScheduler.getScheduledEvents();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      
      // Each event should have required properties
      for (const event of events) {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('cronExpression');
        expect(event).toHaveProperty('enabled');
      }
    });
  });

  describe('getQueuedEvents', () => {
    it('should return all queued events', () => {
      ghostScheduler.start();
      
      ghostScheduler.queueEvent({
        id: 'queued-1',
        name: 'Queued Event 1',
        delayMs: 5000,
        action: async () => {}
      });

      ghostScheduler.queueEvent({
        id: 'queued-2',
        name: 'Queued Event 2',
        delayMs: 10000,
        action: async () => {}
      });

      const queued = ghostScheduler.getQueuedEvents();
      expect(queued.length).toBe(2);
      
      // Each event should have required properties
      for (const event of queued) {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('executeAt');
        expect(event).toHaveProperty('executeAtISO');
      }
    });
  });

  describe('cleanup on stop', () => {
    it('should clear all queued events on stop', () => {
      ghostScheduler.start();
      
      ghostScheduler.queueEvent({
        id: 'test-1',
        name: 'Test 1',
        delayMs: 5000,
        action: async () => {}
      });

      ghostScheduler.queueEvent({
        id: 'test-2',
        name: 'Test 2',
        delayMs: 10000,
        action: async () => {}
      });

      expect(ghostScheduler.getQueuedEvents().length).toBe(2);

      ghostScheduler.stop();

      expect(ghostScheduler.getQueuedEvents().length).toBe(0);
    });
  });
});
