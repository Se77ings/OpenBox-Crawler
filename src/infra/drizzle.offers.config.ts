import { defineConfig } from 'drizzle-kit';

// Banco volátil: as ofertas encontradas, trocadas a cada busca.
export default defineConfig({
  dialect: 'sqlite',
  schema: ['./mappings/productsTable.ts'],
  out: './migrations/offers',
});
