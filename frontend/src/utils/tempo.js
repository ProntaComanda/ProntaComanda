const doisDigitos = (n) => String(n).padStart(2, '0');

// Date | ISO -> "14:32"
export function horaCurta(data) {
  const d = new Date(data);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

// 4_680_000 ms -> "01:18:00" (cronômetro da plaquinha da mesa)
export function cronometro(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${doisDigitos(h)}:${doisDigitos(m)}:${doisDigitos(s)}`;
}

// 4_680_000 ms -> "01h 18m" (tempo de mesa aberta no painel)
export function duracao(ms) {
  const minutos = Math.max(0, Math.floor(ms / 60000));
  return `${doisDigitos(Math.floor(minutos / 60))}h ${doisDigitos(minutos % 60)}m`;
}
