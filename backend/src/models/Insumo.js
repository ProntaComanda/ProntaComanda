const { Schema, model } = require('mongoose');

/**
 * RF10 - Gestão e Entrada de Estoque
 * RF22 - Alerta de Ruptura em Tempo Real (quando saldoAtual chega a 0,
 *        os produtos vinculados devem ser marcados `disponivel = false`
 *        e o evento propagado via socket.io para todos os dispositivos).
 */
const insumoSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true }, // ex: "Pão de hambúrguer"
    unidade: { type: String, required: true, trim: true }, // ex: "un", "kg", "L"
    saldoAtual: { type: Number, required: true, default: 0, min: 0 },
    saldoMinimo: { type: Number, default: 0, min: 0 }, // gatilho de alerta

    ativo: { type: Boolean, default: true }, // soft delete (RNF11)
  },
  { timestamps: true }
);

/**
 * Toda entrada/saída/ajuste gera um registro aqui em vez de apenas
 * sobrescrever `saldoAtual` — histórico necessário para auditoria e para
 * o RF14 (consolidação mensal não perde o motivo dos ajustes).
 */
const movimentacaoEstoqueSchema = new Schema(
  {
    insumo: { type: Schema.Types.ObjectId, ref: 'Insumo', required: true },
    tipo: { type: String, enum: ['entrada', 'saida', 'ajuste'], required: true },
    // entrada/saída: a quantidade movimentada. ajuste: a diferença (para mais ou para menos);
    // o sentido está em saldoAnterior -> saldoPosterior.
    quantidade: { type: Number, required: true },
    // saldo antes e depois (registros antigos não têm: o histórico trata como opcional)
    saldoAnterior: { type: Number },
    saldoPosterior: { type: Number },
    motivo: { type: String, trim: true }, // obrigatório em ajustes manuais
    responsavel: { type: Schema.Types.ObjectId, ref: 'Funcionario', required: true },
  },
  { timestamps: true }
);

movimentacaoEstoqueSchema.index({ insumo: 1, createdAt: -1 });

module.exports = {
  Insumo: model('Insumo', insumoSchema),
  MovimentacaoEstoque: model('MovimentacaoEstoque', movimentacaoEstoqueSchema),
};
