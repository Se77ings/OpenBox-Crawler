/**
 * Prepara um texto para busca: minúsculas e sem acentos, para que "Placa de Vídeo"
 * seja encontrada por "placa de video". O lower() do SQLite só trata letras ASCII.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
