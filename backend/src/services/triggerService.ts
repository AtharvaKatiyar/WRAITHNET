/**
 * Trigger Service
 * 
 * Evaluates triggers and fires ghost actions based on various conditions
 * Requirements: 5.1, 5.2, 5.3, 17.2, 17.4
 */

import Sentiment from 'sentiment';
import logger from '../config/logger';
import ghostStateService from './ghostStateService';
import { GhostMode, TriggerType, TriggerEvent } from '../types/ghost';

const sentiment = new Sentiment();

// Keyword triggers mapped to ghost modes
const KEYWORD_TRIGGERS: Record<string, { mode: GhostMode; keywords: string[] }> = {
  whisperer: {
    mode: GhostMode.WHISPERER,
    keywords: ['help', 'lost', 'confused', 'where', 'what', 'how', 'guide', 'hint']
  },
  poltergeist: {
    mode: GhostMode.POLTERGEIST,
    keywords: ['angry', 'rage', 'hate', 'destroy', 'break', 'smash', 'chaos', 'violence']
  },
  trickster: {
    mode: GhostMode.TRICKSTER,
    keywords: ['trick', 'joke', 'fun', 'play', 'game', 'puzzle', 'riddle', 'laugh']
  },
  demon: {
    mode: GhostMode.DEMON,
    keywords: ['death', 'die', 'kill', 'fear', 'terror', 'nightmare', 'hell', 'demon', 'evil']
  }
};

// Silence threshold in milliseconds (60 seconds)
const SILENCE_THRESHOLD = 60000;

// Sentiment thresholds
const SENTIMENT_THRESHOLDS = {
  VERY_NEGATIVE: -5,  // Demon mode
  NEGATIVE: -2,       // Poltergeist mode
  POSITIVE: 2,        // Trickster mode
  VERY_POSITIVE: 5    // Whisperer mode
};

interface TriggerContext {
  message?: string;
  userId?: string;
  timestamp: number;
  lastMessageTime?: number;
}

interface TriggerResult {
  triggered: boolean;
  triggerType?: TriggerType;
  targetMode?: GhostMode;
  reason?: string;
  priority: number;
}

class TriggerService {
  /**
   * Evaluate all triggers for a given context
   */
  async evaluateTriggers(context: TriggerContext): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];

    try {
      // Evaluate keyword triggers
      if (context.message) {
        const keywordResult = await this.evaluateKeywordTrigger(context.message);
        if (keywordResult.triggered) {
          results.push(keywordResult);
        }

        // Evaluate sentiment triggers
        const sentimentResult = await this.evaluateSentimentTrigger(context.message);
        if (sentimentResult.triggered) {
          results.push(sentimentResult);
        }
      }

      // Evaluate silence trigger
      const silenceResult = await this.evaluateSilenceTrigger(context);
      if (silenceResult.triggered) {
        results.push(silenceResult);
      }

      // Sort by priority (higher priority first)
      results.sort((a, b) => b.priority - a.priority);

      return results;
    } catch (error) {
      logger.error({ error }, 'Error evaluating triggers');
      return [];
    }
  }

  /**
   * Evaluate keyword triggers in a message
   */
  private async evaluateKeywordTrigger(message: string): Promise<TriggerResult> {
    const lowerMessage = message.toLowerCase();

    // Check each keyword set
    for (const [modeName, config] of Object.entries(KEYWORD_TRIGGERS)) {
      for (const keyword of config.keywords) {
        if (lowerMessage.includes(keyword)) {
          logger.info({ 
            keyword, 
            targetMode: config.mode 
          }, 'Keyword trigger detected');

          return {
            triggered: true,
            triggerType: TriggerType.KEYWORD,
            targetMode: config.mode,
            reason: `Keyword "${keyword}" detected`,
            priority: 80 // High priority
          };
        }
      }
    }

    return { triggered: false, priority: 0 };
  }

  /**
   * Evaluate sentiment-based triggers
   */
  private async evaluateSentimentTrigger(message: string): Promise<TriggerResult> {
    try {
      const analysis = sentiment.analyze(message);
      const score = analysis.score;

      let targetMode: GhostMode | undefined;
      let reason: string | undefined;

      if (score <= SENTIMENT_THRESHOLDS.VERY_NEGATIVE) {
        targetMode = GhostMode.DEMON;
        reason = `Very negative sentiment detected (score: ${score})`;
      } else if (score <= SENTIMENT_THRESHOLDS.NEGATIVE) {
        targetMode = GhostMode.POLTERGEIST;
        reason = `Negative sentiment detected (score: ${score})`;
      } else if (score >= SENTIMENT_THRESHOLDS.VERY_POSITIVE) {
        targetMode = GhostMode.WHISPERER;
        reason = `Very positive sentiment detected (score: ${score})`;
      } else if (score >= SENTIMENT_THRESHOLDS.POSITIVE) {
        targetMode = GhostMode.TRICKSTER;
        reason = `Positive sentiment detected (score: ${score})`;
      }

      if (targetMode) {
        logger.info({ 
          score, 
          targetMode 
        }, 'Sentiment trigger detected');

        return {
          triggered: true,
          triggerType: TriggerType.SENTIMENT,
          targetMode,
          reason,
          priority: 60 // Medium priority
        };
      }

      return { triggered: false, priority: 0 };
    } catch (error) {
      logger.error({ error }, 'Error analyzing sentiment');
      return { triggered: false, priority: 0 };
    }
  }

  /**
   * Evaluate silence trigger
   */
  private async evaluateSilenceTrigger(context: TriggerContext): Promise<TriggerResult> {
    try {
      const timeSinceLastIntervention = await ghostStateService.getTimeSinceLastIntervention();

      // Check if silence threshold exceeded
      if (timeSinceLastIntervention >= SILENCE_THRESHOLD) {
        logger.info({ 
          timeSinceLastIntervention 
        }, 'Silence trigger detected');

        // Randomly choose a mode for silence intervention
        const modes = [GhostMode.WHISPERER, GhostMode.POLTERGEIST, GhostMode.TRICKSTER];
        const targetMode = modes[Math.floor(Math.random() * modes.length)];

        return {
          triggered: true,
          triggerType: TriggerType.SILENCE,
          targetMode,
          reason: `Silence exceeded ${SILENCE_THRESHOLD}ms`,
          priority: 50 // Lower priority than keywords/sentiment
        };
      }

      return { triggered: false, priority: 0 };
    } catch (error) {
      logger.error({ error }, 'Error evaluating silence trigger');
      return { triggered: false, priority: 0 };
    }
  }

  /**
   * Process trigger results and execute the highest priority action
   */
  async processTriggers(results: TriggerResult[]): Promise<void> {
    if (results.length === 0) {
      return;
    }

    // Execute the highest priority trigger
    const topTrigger = results[0];

    if (topTrigger.targetMode && topTrigger.triggerType) {
      try {
        // Get current state
        const currentState = await ghostStateService.getState();

        // Only transition if mode is different
        if (currentState.currentMode !== topTrigger.targetMode) {
          await ghostStateService.transitionMode(
            topTrigger.targetMode,
            topTrigger.reason
          );

          logger.info({
            triggerType: topTrigger.triggerType,
            oldMode: currentState.currentMode,
            newMode: topTrigger.targetMode,
            reason: topTrigger.reason
          }, 'Trigger processed and mode transitioned');
        } else {
          // Same mode, just record the intervention
          await ghostStateService.recordIntervention(
            topTrigger.triggerType,
            { reason: topTrigger.reason }
          );

          logger.info({
            triggerType: topTrigger.triggerType,
            mode: currentState.currentMode,
            reason: topTrigger.reason
          }, 'Trigger processed (no mode change)');
        }
      } catch (error) {
        logger.error({ error, trigger: topTrigger }, 'Error processing trigger');
      }
    }
  }

  /**
   * Evaluate and process triggers in one call
   */
  async evaluateAndProcess(context: TriggerContext): Promise<TriggerResult[]> {
    const results = await this.evaluateTriggers(context);
    await this.processTriggers(results);
    return results;
  }

  /**
   * Get keyword triggers configuration (for testing/debugging)
   */
  getKeywordTriggers(): typeof KEYWORD_TRIGGERS {
    return KEYWORD_TRIGGERS;
  }

  /**
   * Get silence threshold (for testing/debugging)
   */
  getSilenceThreshold(): number {
    return SILENCE_THRESHOLD;
  }

  /**
   * Get sentiment thresholds (for testing/debugging)
   */
  getSentimentThresholds(): typeof SENTIMENT_THRESHOLDS {
    return SENTIMENT_THRESHOLDS;
  }

  /**
   * Analyze sentiment of a message (utility method)
   */
  analyzeSentiment(message: string): { score: number; comparative: number } {
    const analysis = sentiment.analyze(message);
    return {
      score: analysis.score,
      comparative: analysis.comparative
    };
  }
}

// Export singleton instance
export const triggerService = new TriggerService();
export default triggerService;
