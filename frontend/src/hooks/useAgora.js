import { useEffect, useState } from 'react';

// Devolve Date.now() atualizado a cada `intervaloMs` (cronômetros). Só roda se `ativo`.
export function useAgora(intervaloMs = 1000, ativo = true) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!ativo) return undefined;
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs, ativo]);

  return agora;
}
