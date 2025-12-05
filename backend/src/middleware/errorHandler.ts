import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// In-character error messages for different error types
const getInCharacterMessage = (statusCode: number, originalMessage: string): string => {
  const messages: Record<number, string[]> = {
    400: [
      'The spirits reject your malformed request...',
      'Your command echoes into the void, unheard...',
      'The terminal flickers. Something is wrong with your input.'
    ],
    401: [
      'You are not recognized by the system. Authentication required.',
      'The ghost refuses to acknowledge your presence.',
      'Access denied. The spirits do not know you.'
    ],
    403: [
      'The Sysop forbids this action.',
      'You lack the clearance to proceed. The door remains locked.',
      'Forbidden. The ghost blocks your path.'
    ],
    404: [
      'The data you seek has been consumed by the void.',
      'Nothing exists at this location. Perhaps it never did.',
      'Error 404: Lost in the digital cemetery.'
    ],
    500: [
      'The system convulses. Something has gone terribly wrong.',
      'A glitch in the haunted machine. The ghost is restless.',
      'Internal corruption detected. The spirits are angry.'
    ]
  };

  const messageArray = messages[statusCode] || messages[500];
  const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
  
  return `${randomMessage}\n[Technical: ${originalMessage}]`;
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = err.message || 'An unknown error occurred';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
  }

  // Log error details
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    }
  }, 'Error occurred');

  // Send in-character error response
  res.status(statusCode).json({
    error: {
      message: getInCharacterMessage(statusCode, message),
      statusCode,
      timestamp: new Date().toISOString()
    }
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: getInCharacterMessage(404, `Route ${req.method} ${req.path} not found`),
      statusCode: 404,
      timestamp: new Date().toISOString()
    }
  });
};
