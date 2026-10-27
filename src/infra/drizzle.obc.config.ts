import { defineConfig } from 'drizzle-kit';

// Banco consistente: sites, rodadas e histórico de preços. Nunca é apagado.
export default defineConfig({
  dialect: 'sqlite',
  schema: [
    './mappings/websitesTable.ts',
    './mappings/crawlRunsTable.ts',
    './mappings/activeRunsTable.ts',
    './mappings/priceHistoryTable.ts',
  ],
  out: './migrations/obc',
});
