import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '../schemas/auth.schema';
import { useAuthStore } from '../store/authStore';
import { destinoPosLogin } from '../routes/destinosPorPerfil';
import { Button, IconArrowLeft, IconCheck, IconUser, Input, Logo } from '../components/ui';

// Aplica a máscara 000.000.000-00 enquanto digita. O schema de validação
// continua recebendo o texto como o usuário vê (com máscara); quem tira a
// pontuação antes de mandar pra API é o schema, não esta função.
function formatarCpf(valor) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

const DESTAQUES = ['Gestão de mesas e comandas', 'KDS em tempo real', 'Dashboard e relatórios'];

// RF02 - Tela de login (ver frame "Login" do design, tema vinho/laranja)
export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({ resolver: zodResolver(loginSchema) });

  const { onChange: onChangeCpf, ...registroCpf } = register('cpf');

  const onSubmit = async ({ cpf, senha }) => {
    try {
      const funcionario = await login(cpf, senha);
      // RF01 - cada perfil cai direto na sua tela: administrador/caixa no
      // desktop, cozinha/bar no KDS standalone, garçom no módulo mobile.
      navigate(destinoPosLogin(funcionario.perfil));
    } catch {
      setError('root', { message: 'CPF ou senha inválidos.' });
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1fr_minmax(22rem,27%)]">
      {/* Painel de marca (só em telas médias para cima) */}
      <div className="hidden items-center justify-center bg-login-gradient p-12 text-white md:flex">
        <div>
          <Logo vertical simboloEsquerda gradiente="laranja" className="h-52 text-white" />
          <p className="mt-5 text-sm text-white/70">Sistema de Gestão para Restaurantes</p>
          <ul className="mt-8 space-y-2 text-sm text-white/85">
            {DESTAQUES.map((texto) => (
              <li key={texto} className="flex items-center gap-2">
                <IconCheck className="h-4 w-4 text-brand-start" />
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-canvas px-8 pb-8 pt-16 md:p-8">
        {/* discreto: o cliente que chegou aqui sem querer volta ao cardápio sem mexer no endereço */}
        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-muted hover:text-ink"
        >
          <IconArrowLeft className="h-4 w-4" />
          Cardápio digital
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-sm space-y-4">
          <div className="mb-6">
            <Logo className="mb-4 h-14 text-ink" />
            <h1 className="font-display text-2xl leading-tight">Bem-vindo de volta</h1>
            <p className="mt-1 text-sm text-ink-soft">Entre com suas credenciais para acessar o painel</p>
          </div>

          <Input
            {...registroCpf}
            onChange={(e) => {
              e.target.value = formatarCpf(e.target.value);
              onChangeCpf(e);
            }}
            label="CPF"
            leftIcon={<IconUser className="h-4 w-4" />}
            inputMode="numeric"
            autoComplete="username"
            maxLength={14}
            placeholder="000.000.000-00"
            error={errors.cpf?.message}
          />

          <Input
            type="password"
            {...register('senha')}
            label="Senha"
            autoComplete="current-password"
            placeholder="Sua senha"
            error={errors.senha?.message}
          />

          {errors.root && (
            <p role="alert" className="text-sm text-danger-ink">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
