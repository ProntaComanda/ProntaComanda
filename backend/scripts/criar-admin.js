const mongoose = require('mongoose');
const argon2 = require('argon2');
const { Funcionario } = require('../src/models');
const { normalizarCpf, validarCpf } = require('../src/utils/cpf');

(async () => {
  const cpf = normalizarCpf(process.env.CPF || '');
  if (!validarCpf(cpf)) throw new Error('CPF inválido (precisa ter os dígitos verificadores corretos).');
  if (!process.env.SENHA || process.env.SENHA.length < 6) throw new Error('Senha muito curta (mínimo 6 caracteres).');
  await mongoose.connect(process.env.MONGO_URI);
  const senhaHash = await argon2.hash(process.env.SENHA);
  const adm = await Funcionario.create({
    nome: process.env.NOME,
    cpf,
    senhaHash,
    perfil: 'administrador',
  });
  console.log('Administrador criado:', adm.nome, '| CPF:', adm.cpf);
  await mongoose.disconnect();
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });

// $script | docker compose exec -T -e NOME=$NOME -e CPF=$CPF -e SENHA=$SENHA backend node -