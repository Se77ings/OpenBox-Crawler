/**
 * Identifica o mesmo produto entre buscas diferentes, para montar o histórico de preços.
 * Usa o código do produto no site quando existe; senão, a URL do anúncio.
 * Gerada por `Product.keyOf`.
 */
export type ProductKey = string & { readonly __brand: 'ProductKey' };
