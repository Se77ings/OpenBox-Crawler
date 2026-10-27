import { z } from 'zod';

/** Falha relatada pela extensão (ex.: a página não carregou, o usuário fechou a aba). */
export const FailCrawlRunRequest = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type FailCrawlRunRequest = z.infer<typeof FailCrawlRunRequest>;
