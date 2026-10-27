import { z } from 'zod';

export const UpdateWebsiteRequest = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    openBoxUrl: z.string().trim().min(1).optional(),
    status: z.enum(['active', 'paused']).optional(),
  })
  .refine((request) => Object.values(request).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para alterar.',
  });

export type UpdateWebsiteRequest = z.infer<typeof UpdateWebsiteRequest>;
