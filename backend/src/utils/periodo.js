const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const TIMEZONE = process.env.TZ_ESTABELECIMENTO || 'America/Sao_Paulo';

/**
 * Limites do período filtrado no Dashboard e do período usado como base de
 * comparação.
 *
 * O período anterior tem a MESMA duração do atual: em "hoje" compara até esta
 * mesma hora de ontem (e não o dia de ontem inteiro), em "semana" a janela
 * anterior termina há exatamente 7 dias e em "mes" vai até o mesmo dia/hora do
 * mês passado. Antes o período atual ia "até agora" e o anterior era o período
 * inteiro, o que fazia a variação parecer sempre negativa no começo do período.
 */
function limitesDoPeriodo(periodo, agora = dayjs().tz(TIMEZONE)) {
  switch (periodo) {
    case 'hoje':
      return {
        inicio: agora.startOf('day'),
        fim: agora,
        inicioAnterior: agora.subtract(1, 'day').startOf('day'),
        fimAnterior: agora.subtract(1, 'day'),
      };
    case 'semana':
      // Janela corrida dos últimos 7 dias (não a semana de calendário).
      return {
        inicio: agora.subtract(6, 'day').startOf('day'),
        fim: agora,
        inicioAnterior: agora.subtract(13, 'day').startOf('day'),
        fimAnterior: agora.subtract(7, 'day'),
      };
    case 'mes':
    default:
      return {
        inicio: agora.startOf('month'),
        fim: agora,
        inicioAnterior: agora.subtract(1, 'month').startOf('month'),
        // dayjs ajusta sozinho o fim do mês (31/03 -> 28/02)
        fimAnterior: agora.subtract(1, 'month'),
      };
  }
}

module.exports = { dayjs, TIMEZONE, limitesDoPeriodo };
