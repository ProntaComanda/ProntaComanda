// Minúsculas e sem acento, para busca: "Pão" combina com "pao".
export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
