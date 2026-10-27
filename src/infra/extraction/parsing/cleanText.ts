/** Junta espaços, quebras de linha e espaços não separáveis do HTML num espaço simples. */
export function cleanText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}
