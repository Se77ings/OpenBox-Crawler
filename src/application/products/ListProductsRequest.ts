import { z } from 'zod';

// Os filtros chegam pela query string, onde tudo é texto: listas vêm separadas por
// vírgula ("a,b") e booleanos como "true"/"false".
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
    z.array(item),
  );
const flag = z.preprocess((value) => value === true || value === 'true', z.boolean());

export const ListProductsRequest = z.object({
  text: z.string().trim().min(1).max(200).optional(),
  websiteIds: list(z.string().min(1)).optional(),
  category: z.string().trim().min(1).optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  minDiscountPercent: z.coerce.number().int().min(0).max(100).optional(),
  conditions: list(z.enum(['openbox', 'refurbished', 'showcase', 'unknown'])).optional(),
  onlyAvailable: flag.optional(),
  onlyPriceDrops: flag.optional(),
  sort: z.enum(['price-asc', 'discount-desc', 'name-asc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type ListProductsRequest = z.infer<typeof ListProductsRequest>;
