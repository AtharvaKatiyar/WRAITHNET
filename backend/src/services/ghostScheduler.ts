/**
 * Ghost Event Scheduler
 * 
 * Manages scheduled ghost events and interventions using cron jobs
 * Requirements: 17.1
 */

import cron from 'node-cron';
import logger from '../config/logger';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType } from '../types/ghost';

interface ScheduledEvent {
  id: string;
  name: string;
  cronExpression: string;
  action: () => Promise<void>;
  task?: cron.ScheduledTask;
  enabled: boolean;
}

interface QueuedEvent {
  id: string;
  name: string;
  executeAt: number; // Unix timestamp
  action: () => Promise<void>;
  timeout?: NodeJS.Timeout;
}

class GhostScheduler {
  private scheduledEvents: Map<string, ScheduledEvent> = new Map();
  private eventQueue: Map<string, QueuedEvent> = new Map();
  private isRunning: boolean = false;

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Ghost scheduler already running');
      return;
    }

    this.isRunning = true;
    
    // Initialize default scheduled events
    this.initializeDefaultEvents();
    
    logger.info('Ghost scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    // Stop all cron tasks
    for (const event of this.scheduledEvents.values()) {
      if (event.task) {
        event.task.stop();
      }
    }

    // Clear all queued events
    for (const event of this.eventQueue.values()) {
      if (event.timeout) {
        clearTimeout(event.timeout);
      }
    }

    this.eventQueue.clear();
    this.isRunning = false;
    
    logger.info('Ghost scheduler stopped');
  }

  /**
   * Initialize default scheduled events
   */
  private initializeDefaultEvents(): void {
    // Midnight ghost intervention (00:00)
    this.scheduleEvent({
      id: 'midnight-intervention',
      name: 'Midnight Ghost Intervention',
      cronExpression: '0 0 * * *', // Every day at midnight
      action: async () => {
        await ghostStateService.transitionMode(
          GhostMode.DEMON,
          'Midnight hour - the veil is thinnest'
        );
        logger.info('Midnight ghost intervention triggered');
      }
    });

    // 3 AM "witching hour" intervention
    this.scheduleEvent({
      id: 'witching-hour',
      name: 'Witching Hour Intervention',
      cronExpression: '0 3 * * *', // Every day at 3 AM
      action: async () => {
        await ghostStateService.transitionMode(
          GhostMode.DEMON,
          'The witching hour - spirits are most active'
        );
        await ghostStateService.updateIntensity(30);
        logger.info('Witching hour intervention triggered');
      }
    });

    // Random daytime interventions (every 2 hours during day)
    this.scheduleEvent({
      id: 'daytime-whispers',
      name: 'Daytime Whispers',
      cronExpression: '0 */2 8-20 * *', // Every 2 hours from 8 AM to 8 PM
      action: async () => {
        const modes = [GhostMode.WHISPERER, GhostMode.TRICKSTER];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        
        await ghostStateService.transitionMode(
          randomMode,
          'Daytime whisper - subtle presence'
        );
        logger.info({ mode: randomMode }, 'Daytime whisper triggered');
      }
    });

    // Evening intensity increase (6 PM)
    this.scheduleEvent({
      id: 'evening-intensity',
      name: 'Evening Intensity Increase',
      cronExpression: '0 18 * * *', // Every day at 6 PM
      action: async () => {
        await ghostStateService.updateIntensity(20);
        logger.info('Evening intensity increase triggered');
      }
    });

    // Weekly reset (Sunday midnight)
    this.scheduleEvent({
      id: 'weekly-reset',
      name: 'Weekly State Reset',
      cronExpression: '0 0 * * 0', // Every Sunday at midnight
      action: async () => {
        await ghostStateService.resetState();
        logger.info('Weekly ghost state reset triggered');
      }
    });
  }

  /**
   * Schedule a recurring event with cron expression
   */
  scheduleEvent(config: {
    id: string;
    name: string;
    cronExpression: string;
    action: () => Promise<void>;
  }): void {
    // Validate cron expression
    if (!cron.validate(config.cronExpression)) {
      logger.error({ cronExpression: config.cronExpression }, 'Invalid cron expression');
      throw new Error(`Invalid cron expression: ${config.cronExpression}`);
    }

    // Stop existing task if it exists
    const existing = this.scheduledEvents.get(config.id);
    if (existing?.task) {
      existing.task.stop();
    }

    // Create new scheduled task
    const task = cron.schedule(config.cronExpression, async () => {
      try {
        logger.info({ eventId: config.id, eventName: config.name }, 'Executing scheduled event');
        await config.action();
      } catch (error) {
        logger.error({ error, eventId: config.id }, 'Error executing scheduled event');
      }
    });

    // Store the event
    this.scheduledEvents.set(config.id, {
      ...config,
      task,
      enabled: true
    });

    logger.info({ 
      eventId: config.id, 
      eventName: config.name, 
      cronExpression: config.cronExpression 
    }, 'Scheduled event registered');
  }

  /**
   * Queue an event to execute after a delay
   */
  queueEvent(config: {
    id: string;
    name: string;
    delayMs: number;
    action: () => Promise<void>;
  }): void {
    // Clear existing queued event if it exists
    const existing = this.eventQueue.get(config.id);
    if (existing?.timeout) {
      clearTimeout(existing.timeout);
    }

    const executeAt = Date.now() + config.delayMs;

    // Create timeout for execution
    const timeout = setTimeout(async () => {
      try {
        logger.info({ eventId: config.id, eventName: config.name }, 'Executing queued event');
        await config.action();
        
        // Remove from queue after execution
        this.eventQueue.delete(config.id);
      } catch (error) {
        logger.error({ error, eventId: config.id }, 'Error executing queued event');
        this.eventQueue.delete(config.id);
      }
    }, config.delayMs);

    // Store the queued event
    this.eventQueue.set(config.id, {
      id: config.id,
      name: config.name,
      executeAt,
      action: config.action,
      timeout
    });

    logger.info({ 
      eventId: config.id, 
      eventName: config.name, 
      delayMs: config.delayMs,
      executeAt: new Date(executeAt).toISOString()
    }, 'Event queued for execution');
  }

  /**
   * Cancel a queued event
   */
  cancelQueuedEvent(eventId: string): boolean {
    const event = this.eventQueue.get(eventId);
    
    if (!event) {
      return false;
    }

    if (event.timeout) {
      clearTimeout(event.timeout);
    }

    this.eventQueue.delete(eventId);
    
    logger.info({ eventId }, 'Queued event cancelled');
    return true;
  }

  /**
   * Enable a scheduled event
   */
  enableEvent(eventId: string): boolean {
    const event = this.scheduledEvents.get(eventId);
    
    if (!event) {
      logger.warn({ eventId }, 'Event not found');
      return false;
    }

    if (event.task) {
      event.task.start();
      event.enabled = true;
      logger.info({ eventId }, 'Scheduled event enabled');
      return true;
    }

    return false;
  }

  /**
   * Disable a scheduled event
   */
  disableEvent(eventId: string): boolean {
    const event = this.scheduledEvents.get(eventId);
    
    if (!event) {
      logger.warn({ eventId }, 'Event not found');
      return false;
    }

    if (event.task) {
      event.task.stop();
      event.enabled = false;
      logger.info({ eventId }, 'Scheduled event disabled');
      return true;
    }

    return false;
  }

  /**
   * Remove a scheduled event
   */
  removeEvent(eventId: string): boolean {
    const event = this.scheduledEvents.get(eventId);
    
    if (!event) {
      return false;
    }

    if (event.task) {
      event.task.stop();
    }

    this.scheduledEvents.delete(eventId);
    
    logger.info({ eventId }, 'Scheduled event removed');
    return true;
  }

  /**
   * Get all scheduled events
   */
  getScheduledEvents(): Array<{
    id: string;
    name: string;
    cronExpression: string;
    enabled: boolean;
  }> {
    return Array.from(this.scheduledEvents.values()).map(event => ({
      id: event.id,
      name: event.name,
      cronExpression: event.cronExpression,
      enabled: event.enabled
    }));
  }

  /**
   * Get all queued events
   */
  getQueuedEvents(): Array<{
    id: string;
    name: string;
    executeAt: number;
    executeAtISO: string;
  }> {
    return Array.from(this.eventQueue.values()).map(event => ({
      id: event.id,
      name: event.name,
      executeAt: event.executeAt,
      executeAtISO: new Date(event.executeAt).toISOString()
    }));
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Schedule a mode transition after delay
   */
  scheduleIntervention(delayMs: number, mode: GhostMode, reason: string): void {
    const eventId = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.queueEvent({
      id: eventId,
      name: `Ghost Intervention: ${mode}`,
      delayMs,
      action: async () => {
        await ghostStateService.transitionMode(mode, reason);
        await ghostStateService.recordIntervention(TriggerType.TIME, {
          scheduledMode: mode,
          reason
        });
      }
    });
  }
}

// Export singleton instance
export const ghostScheduler = new GhostScheduler();
export default ghostScheduler;
