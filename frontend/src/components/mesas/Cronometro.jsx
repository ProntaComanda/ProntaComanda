import { useAgora } from '../../hooks/useAgora';
import { cronometro, duracao } from '../../utils/tempo';

// Cronômetro "00:18:42" desde `desde`. Cada instância cuida do próprio relógio,
// então só ele re-renderiza a cada segundo (não a tela inteira).
export default function Cronometro({ desde }) {
  const agora = useAgora(1000);
  return <span>{cronometro(agora - new Date(desde).getTime())}</span>;
}

// Tempo de mesa aberta "01h 18m" (muda de minuto em minuto).
export function Duracao({ desde }) {
  const agora = useAgora(15000);
  return <span>{duracao(agora - new Date(desde).getTime())}</span>;
}
