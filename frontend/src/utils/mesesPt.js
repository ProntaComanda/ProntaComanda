// O servidor devolve o mês abreviado em inglês ("Dec", "Apr"...). Na tela e no relatório
// em português traduzimos; rótulos que já vierem em português passam direto.
const MESES_EN_PT = {
  jan: 'jan',
  feb: 'fev',
  mar: 'mar',
  apr: 'abr',
  may: 'mai',
  jun: 'jun',
  jul: 'jul',
  aug: 'ago',
  sep: 'set',
  oct: 'out',
  nov: 'nov',
  dec: 'dez',
};

export const rotuloDoMes = (rotulo) =>
  MESES_EN_PT[
    String(rotulo ?? '')
      .trim()
      .toLowerCase()
  ] ?? String(rotulo ?? '');
