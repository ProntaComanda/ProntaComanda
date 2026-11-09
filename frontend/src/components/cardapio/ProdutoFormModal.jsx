import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '../ui';
import { mensagemErro } from '../../utils/erroApi';

// Aceita "25.90" e "25,90" (o jeito natural de digitar no Brasil).
const lerPreco = (texto) => Number(String(texto).trim().replace(',', '.'));

// "Pão, Carne, Queijo" -> ['Pão', 'Carne', 'Queijo']
const lerIngredientes = (texto) =>
  String(texto)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

// Mesmas regras do servidor (schemas/produto.schema.js); o servidor continua sendo
// a palavra final, isto só evita idas e voltas por erro óbvio.
function validar(campos) {
  const erros = {};
  const nome = campos.nome.trim();
  if (nome.length < 2) erros.nome = 'O nome deve ter ao menos 2 caracteres.';
  else if (nome.length > 80) erros.nome = 'O nome deve ter no máximo 80 caracteres.';

  const preco = lerPreco(campos.preco);
  if (!campos.preco.trim() || Number.isNaN(preco)) erros.preco = 'Informe o preço. Ex.: 25,90';
  else if (preco <= 0) erros.preco = 'O preço deve ser maior que zero.';
  else if (preco > 99999.99) erros.preco = 'Preço muito alto.';
  else if (Math.abs(preco * 100 - Math.round(preco * 100)) > 1e-6) erros.preco = 'Use no máximo 2 casas decimais.';

  if (!campos.categoria) erros.categoria = 'Escolha uma categoria.';

  if (campos.tempo.trim()) {
    const t = Number(campos.tempo);
    if (!Number.isInteger(t) || t < 1 || t > 240) erros.tempo = 'Use um número inteiro de 1 a 240 minutos.';
  }

  if (campos.descricao.trim().length > 300) erros.descricao = 'Máximo de 300 caracteres.';

  const ingredientes = lerIngredientes(campos.ingredientes);
  if (ingredientes.length > 20) erros.ingredientes = 'Máximo de 20 ingredientes.';
  else if (ingredientes.some((i) => i.length > 30)) erros.ingredientes = 'Cada ingrediente pode ter até 30 caracteres.';

  return erros;
}

/**
 * Criar/editar produto. Monte só quando for abrir (`{aberto && <ProdutoFormModal .../>}`):
 * assim o formulário começa limpo a cada abertura.
 * `onSalvar(dados)` devolve uma Promise; se falhar, a mensagem aparece no formulário.
 */
export default function ProdutoFormModal({ produto, categorias, categoriaInicial, onSalvar, onFechar }) {
  const editando = Boolean(produto);
  const [campos, setCampos] = useState({
    nome: produto?.nome ?? '',
    preco: produto ? String(produto.preco).replace('.', ',') : '',
    categoria: produto ? String(produto.categoria?._id ?? produto.categoria ?? '') : (categoriaInicial ?? ''),
    setor: produto?.setor ?? 'cozinha',
    tempo: produto?.tempoPreparoMinutos ? String(produto.tempoPreparoMinutos) : '',
    descricao: produto?.descricao ?? '',
    ingredientes: (produto?.ingredientes ?? []).join(', '),
  });
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const definir = (campo) => (e) => setCampos((atual) => ({ ...atual, [campo]: e.target.value }));

  async function aoEnviar(e) {
    e.preventDefault();
    const encontrados = validar(campos);
    setErros(encontrados);
    setErroServidor('');
    if (Object.keys(encontrados).length) return;

    const tempo = campos.tempo.trim() ? Number(campos.tempo) : null;
    const dados = {
      nome: campos.nome.trim(),
      preco: lerPreco(campos.preco),
      categoria: campos.categoria,
      setor: campos.setor,
      descricao: campos.descricao.trim(),
      ingredientes: lerIngredientes(campos.ingredientes),
      // Na edição, null limpa o campo no backend; na criação, simplesmente não envia.
      ...(editando ? { tempoPreparoMinutos: tempo } : tempo !== null && { tempoPreparoMinutos: tempo }),
    };

    setEnviando(true);
    try {
      await onSalvar(dados);
    } catch (err) {
      setErroServidor(mensagemErro(err, 'Não foi possível salvar o produto. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onFechar}
      closeOnOverlay={false}
      title={editando ? 'Editar produto' : 'Novo produto'}
      description={editando ? undefined : 'Preencha os dados que aparecem no cardápio.'}
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-produto" loading={enviando}>
            {editando ? 'Salvar alterações' : 'Adicionar produto'}
          </Button>
        </>
      }
    >
      <form id="form-produto" onSubmit={aoEnviar} noValidate className="space-y-4">
        <Input
          data-autofocus
          label="Nome"
          value={campos.nome}
          onChange={definir('nome')}
          maxLength={80}
          error={erros.nome}
          placeholder="Ex.: X-Bacon"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço (R$)"
            inputMode="decimal"
            value={campos.preco}
            onChange={definir('preco')}
            error={erros.preco}
            placeholder="25,90"
          />
          <Input
            label="Tempo de preparo (min)"
            inputMode="numeric"
            value={campos.tempo}
            onChange={definir('tempo')}
            error={erros.tempo}
            hint="Opcional"
            placeholder="15"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Categoria" value={campos.categoria} onChange={definir('categoria')} error={erros.categoria}>
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nome}
              </option>
            ))}
          </Select>
          <Select label="Setor de preparo" value={campos.setor} onChange={definir('setor')}>
            <option value="cozinha">Cozinha</option>
            <option value="bar">Bar</option>
          </Select>
        </div>

        <Textarea
          label="Descrição"
          value={campos.descricao}
          onChange={definir('descricao')}
          maxLength={300}
          error={erros.descricao}
          hint={`${campos.descricao.length}/300 · Opcional`}
        />

        <Input
          label="Ingredientes"
          value={campos.ingredientes}
          onChange={definir('ingredientes')}
          error={erros.ingredientes}
          hint="Separe por vírgula. Ex.: Pão, Carne, Queijo"
        />

        {erroServidor && (
          <p role="alert" className="text-sm text-danger-ink">
            {erroServidor}
          </p>
        )}
      </form>
    </Modal>
  );
}
