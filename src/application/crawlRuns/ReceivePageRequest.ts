import { z } from 'zod';

/** Página capturada pela extensão durante uma busca. */
export const ReceivePageRequest = z.object({
  url: z.string().trim().min(1),
  html: z.string().min(1),
});

export type ReceivePageRequest = z.infer<typeof ReceivePageRequest>;
