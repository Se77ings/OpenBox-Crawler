import { z } from 'zod';

/** Confirmação do cadastro, com os dados do preview (o nome pode ter sido editado). */
export const RegisterWebsiteRequest = z.object({
  openBoxUrl: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  logoUrl: z.url().nullable(),
  extractorKey: z.string().min(1).nullable(),
});

export type RegisterWebsiteRequest = z.infer<typeof RegisterWebsiteRequest>;
