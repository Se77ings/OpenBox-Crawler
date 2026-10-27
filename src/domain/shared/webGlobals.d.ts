// O domain não usa @types/node nem a lib DOM, para não depender de nenhum ambiente.
// A única API de plataforma usada é a URL do padrão WHATWG, disponível igualmente no
// Node e nos navegadores; aqui está declarado apenas o subconjunto necessário.
declare global {
  class URL {
    constructor(input: string, base?: string);
    protocol: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    readonly origin: string;
    toString(): string;
  }
}

export {};
