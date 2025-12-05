import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from './errorHandler';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        next(new AppError(`Validation failed: ${errorMessages}`, 400));
      } else {
        next(error);
      }
    }
  };
};

// Common validation schemas
export const schemas = {
  // Pagination
  pagination: z.object({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20)
    })
  }),

  // ID parameter
  idParam: z.object({
    params: z.object({
      id: z.string().uuid('Invalid ID format')
    })
  })
};
