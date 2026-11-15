import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSidebarStore } from '../../store/sidebarStore';
import {
  IconBox,
  IconChart,
  IconChef,
  IconClipboard,
  IconLogout,
  IconMenu,
  IconShield,
  IconUser,
  IconUsers,
  IconUtensils,
  Logo,
  ThemeToggle,
} from '../ui';
import { cn } from '../../lib/cn';
import CabecalhoGarcom from '../garcom/CabecalhoGarcom';
import { useBarraDeRolagemFixa } from '../../hooks/useBarraDeRolagemFixa';

/**
 * Sidebar do Admin, como no design: uma barra fina de ícones sempre visível
 * (menu, tema, sair) e, quando aberta, o painel com logo, navegação e usuário.
 * Fechada, os ícones de navegação passam para a barra fina. RNF08 - telas largas.
 *
 * RF01 exige restringir tanto a EXECUÇÃO quanto a VISUALIZAÇÃO por perfil.
 * Cada item carrega os perfis que podem vê-lo aqui; o backend continua
 * sendo a autoridade de verdade (ver middlewares/rbac.middleware.js em
 * cada rota) — isto é só o espelho no menu, pra não mostrar atalho pra
 * tela que o perfil vai ser barrado de abrir.
 */
const ITENS_MENU = [
  { rota: '/admin/cardapio', label: 'Cardápio', Icone: IconUtensils, perfis: ['administrador'] },
  { rota: '/admin/mesas', label: 'Mesas/Comandas', Icone: IconClipboard, perfis: ['administrador', 'caixa'] },
  { rota: '/admin/cozinha', label: 'Cozinha e Bar', Icone: IconChef, perfis: ['administrador'] },
  { rota: '/admin/funcionarios', label: 'Funcionários', Icone: IconUsers, perfis: ['administrador'] },
  { rota: '/admin/estoque', label: 'Estoque', Icone: IconBox, perfis: ['administrador'] },
  { rota: '/admin/auditoria', label: 'Auditoria', Icone: IconShield, perfis: ['administrador'] },
  { rota: '/admin/dashboard', label: 'Dashboard', Icone: IconChart, perfis: ['administrador'] },
];

const COR_ITEM = {
  ativo: 'bg-brand-gradient text-white shadow-md',
  inativo: 'text-ink-soft hover:bg-muted hover:text-ink',
};

function Avatar({ nome }) {
  return (
    <span
      title={nome}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tile text-ink-soft"
    >
      <IconUser />
    </span>
  );
}

// `painel` (opcional): coluna fixa à direita, na altura da tela, como o painel "MESA 00" do
// design. O conteúdo decide o próprio scroll (cabeçalho e rodapé fixos, miolo rolando).
//
// `sidebarFechada` (opcional): ao entrar na tela, fecha o menu lateral e bloqueia o botão que
// abre (ele continua à vista, só desabilitado). Usado no KDS (Cozinha e Bar), para a equipe
// da cozinha ter o máximo de área útil. O fechamento vale como uma escolha do usuário: ao ir
// para outra tela o menu continua fechado (não "reabre sozinho") e ele abre se quiser.
//
// `reservarBarra` (opcional): reserva o espaço da barra de rolagem da página, para o conteúdo
// não "pular" quando a lista fica curta ou longa (ver hooks/useBarraDeRolagemFixa). Ligue nas
// telas de lista, como o Cardápio. Não use em tela de altura fixa, como Mesas e Comandas.
export default function AdminLayout({ children, painel, sidebarFechada = false, reservarBarra = false }) {
  const funcionario = useAuthStore((s) => s.funcionario);
  const logout = useAuthStore((s) => s.logout);
  const abertaSalva = useSidebarStore((s) => s.aberta);
  const alternar = useSidebarStore((s) => s.alternar);
  const fechar = useSidebarStore((s) => s.fechar);
  const itensVisiveis = ITENS_MENU.filter((item) => item.perfis.includes(funcionario?.perfil));
  // Com um destino só (hoje, o Caixa: só Mesas/Comandas) o menu não tem função. Esses perfis
  // seguem o padrão do garçom e da cozinha: sem barra lateral, só a barra de topo.
  // Não mexe na preferência salva da sidebar: ela só vale para quem tem 2 ou mais destinos.
  const semMenu = itensVisiveis.length <= 1;
  // `&& !sidebarFechada` evita o menu aparecer aberto por um instante antes do efeito abaixo fechar
  const aberta = abertaSalva && !sidebarFechada;

  useEffect(() => {
    if (sidebarFechada) fechar();
  }, [sidebarFechada, fechar]);

  useBarraDeRolagemFixa(reservarBarra);

  // Ao limpar a sessão, a RotaProtegida redireciona para /login. Se a chamada
  // falhar, a store já limpou a sessão (finally): nada a tratar aqui.
  const sair = () => logout().catch(() => {});

  if (semMenu) {
    // Tela fixa na altura do navegador: a página não rola. A barra de topo e o painel lateral
    // ficam parados e só o conteúdo (main) rola, se precisar.
    // `--topo`: altura da barra de topo (4rem). As telas que ocupam a altura toda subtraem
    // isso do cálculo (ver MesasComandas); no layout com sidebar a variável nem existe.
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink" style={{ '--topo': '4rem' }}>
        <CabecalhoGarcom esticado />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
          {painel && (
            <aside className="flex w-[22.5rem] shrink-0 flex-col overflow-hidden border-l border-line bg-surface">
              {painel}
            </aside>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <div className="sticky top-0 flex h-screen shrink-0">
        {/* Barra fina: sempre visível */}
        <div className="flex w-14 flex-col items-center border-r border-line bg-muted py-3 dark:bg-surface">
          <button
            type="button"
            onClick={alternar}
            disabled={sidebarFechada}
            aria-label={sidebarFechada ? 'Menu bloqueado nesta tela' : aberta ? 'Recolher menu' : 'Abrir menu'}
            title={sidebarFechada ? 'Menu bloqueado nesta tela' : undefined}
            aria-expanded={aberta}
            aria-controls="menu-lateral"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-tile text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-soft dark:bg-muted"
          >
            <IconMenu />
          </button>

          {!aberta && (
            <nav aria-label="Navegação principal" className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
              {itensVisiveis.map(({ rota, label, Icone }) => (
                <NavLink
                  key={rota}
                  to={rota}
                  title={label}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-md transition',
                      isActive ? COR_ITEM.ativo : COR_ITEM.inativo
                    )
                  }
                >
                  <Icone />
                </NavLink>
              ))}
            </nav>
          )}

          <div className="mt-auto flex flex-col items-center gap-1 border-t border-line pt-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={sair}
              aria-label="Sair"
              title="Sair"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink"
            >
              <IconLogout />
            </button>
            {!aberta && <Avatar nome={funcionario?.nome} />}
          </div>
        </div>

        {/* Painel: só quando aberta */}
        {aberta && (
          <aside id="menu-lateral" className="flex w-[14.5rem] flex-col border-r border-line bg-surface">
            <div className="flex h-36 items-center justify-center border-b border-line">
              <Logo className="h-16 text-ink" />
            </div>

            <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-2 py-3">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Navegação
              </p>
              <div className="flex flex-col gap-1">
                {itensVisiveis.map(({ rota, label, Icone }) => (
                  <NavLink
                    key={rota}
                    to={rota}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition',
                        isActive ? COR_ITEM.ativo : COR_ITEM.inativo
                      )
                    }
                  >
                    <Icone className="h-5 w-5 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </nav>

            <div className="p-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <Avatar nome={funcionario?.nome} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{funcionario?.nome}</p>
                  <p className="truncate text-[11px] capitalize text-ink-faint">{funcionario?.perfil}</p>
                </div>
              </div>
              <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-wider text-ink-faint">
                Gestão que serve resultados
              </p>
            </div>
          </aside>
        )}
      </div>

      <main className="min-w-0 flex-1 p-8">{children}</main>

      {painel && (
        <aside className="sticky top-0 flex h-screen w-[22.5rem] shrink-0 flex-col overflow-hidden border-l border-line bg-surface">
          {painel}
        </aside>
      )}
    </div>
  );
}
