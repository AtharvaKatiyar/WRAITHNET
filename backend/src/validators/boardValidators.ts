import { z } from 'zod';

export const createThreadSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'A title is required to create a thread.' })
      .min(3, 'Your thread title must be at least 3 characters long.')
      .max(200, 'Your thread title cannot exceed 200 characters.'),
    content: z
      .string({ required_error: 'Content is required to create a thread.' })
      .min(1, 'Your message must contain at least 1 character.')
      .max(10000, 'Your message cannot exceed 10000 characters.'),
  }),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>['body'];

export const createMessageSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Content is required to post a message.' })
      .min(1, 'Your message must contain at least 1 character.')
      .max(10000, 'Your message cannot exceed 10000 characters.'),
  }),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>['body'];

export const threadQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val >= 1, 'Page must be at least 1.'),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => val >= 1 && val <= 100, 'Limit must be between 1 and 100.'),
  }),
});
