// Junta classes ignorando valores vazios. Não resolve conflitos do Tailwind
// (não é um tailwind-merge): os componentes de ui/ aceitam className só para
// ADICIONAR classes (margem, largura...), não para trocar as que já têm.
export function cn(...classes) {
  return classes.flat(Infinity).filter(Boolean).join(' ');
}
