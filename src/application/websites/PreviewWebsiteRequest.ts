import { z } from 'zod';

/** Página de open box capturada pela extensão a partir da URL digitada no cadastro. */
export const PreviewWebsiteRequest = z.object({
  url: z.string().trim().min(1),
  html: z.string().min(1),
});

export type PreviewWebsiteRequest = z.infer<typeof PreviewWebsiteRequest>;
