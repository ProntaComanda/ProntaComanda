# Pronta Comanda

Sistema de gestão de mesas para estabelecimentos, com cardápio digital,
**autoatendimento por QR code**, KDS (cozinha/bar), estoque e gestão
financeira. Backend e frontend são projetos separados.

**Stack:** Node + Express + MongoDB (Mongoose) no backend; React + Vite +
Tailwind no frontend; tempo real com socket.io. Roda com Docker Compose ou
Kubernetes.

## Sumário

- [Como rodar](#como-rodar)
- [Logins de demonstração](#logins-de-demonstração)
- [Roteiro para demonstrar o sistema](#roteiro-para-demonstrar-o-sistema)
- [Autoatendimento (QR code)](#autoatendimento-qr-code)
- [Estrutura](#estrutura)
- [Como cada perfil entra no sistema](#como-cada-perfil-entra-no-sistema)
- [API](#api)
- [Regras de negócio](#regras-de-negócio)
- [O que já está funcional](#o-que-já-está-funcional)
- [O que ainda falta](#o-que-ainda-falta)
- [Convenções](#convenções)
- [Histórico de bugs corrigidos](#histórico-de-bugs-corrigidos)
- [Documentação adicional](#documentação-adicional)

## Como rodar

Há três jeitos. Escolha **um** (não rode dois ao mesmo tempo: eles usam as
mesmas portas):

| Jeito | Para quê | Endereço do sistema |
|---|---|---|
| **[Docker Compose](#opção-1-docker-compose-recomendado)** | O mais simples. Um comando sobe tudo | http://localhost:8080 |
| **[Kubernetes](#opção-2-kubernetes)** | Demonstrar a infraestrutura (réplicas, auto-recuperação) | http://localhost:8080 (via `port-forward`) |
| **[Sem Docker](#opção-3-sem-docker-desenvolvimento-local)** | Programar com atualização automática ao salvar | http://localhost:5173 |

### Opção 1: Docker Compose (recomendado)

Sobe o sistema inteiro (banco, backend e frontend) sem instalar Node nem
MongoDB na máquina.

**Você precisa de:**
- **Git**.
- **Docker Desktop** (Windows ou macOS) ou Docker Engine com o plugin Compose
  (Linux). No Windows, instale, **abra o Docker Desktop** e espere ele indicar
  que está rodando (ícone da baleia) antes de usar os comandos. Se o instalador
  pedir para ativar o WSL 2, aceite.

Os comandos abaixo funcionam no **Git Bash** (Windows) e no terminal do
macOS/Linux. Rode todos **na pasta raiz do projeto**, a que tem o
`docker-compose.yml`.

**O que sobe:**

| Serviço | O que é | Como acessar |
|---|---|---|
| `frontend` | nginx servindo o build do React; repassa `/api`, `/uploads` e `/socket.io` para o backend | **http://localhost:8080** (é a única porta que você usa) |
| `backend` | API Node 22 | só por dentro da rede do Docker (porta 3333) |
| `mongo` | MongoDB 7, sem senha | `localhost:27017`, só a própria máquina enxerga (dá para usar o Compass) |

Os dados ficam em *volumes* do Docker (`mongo-data` para o banco e `uploads`
para as fotos de produto), então **sobrevivem** quando você para ou recria os
containers.

#### Passo a passo (primeira vez)

**1. Baixe o projeto**
```bash
git clone https://github.com/BrunoOller/ProntaComanda.git
cd ProntaComanda
```

**2. Crie o seu arquivo `.env`**
```bash
cp .env.example .env
```
O `.env` guarda as configurações da sua máquina e **nunca vai para o Git**.

**3. Gere o `JWT_SECRET`** (a chave que assina os logins; o sistema não sobe
sem ela). Este comando já grava uma chave aleatória no seu `.env`:
```bash
$secret = -join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
(Get-Content .env) -replace '^JWT_SECRET=.*', "JWT_SECRET=$secret" | Set-Content .env
```
Cada pessoa gera a sua; não compartilhe nem commite essa chave.

**4. Suba o sistema**
```bash
docker compose up --build -d
```
Na **primeira vez demora alguns minutos** (baixa as imagens e instala as
dependências). O `-d` roda em segundo plano e devolve o terminal.

**5. Confira se está tudo certo**
```bash
docker compose ps
```
`mongo` e `backend` devem aparecer como `(healthy)`. Teste também a API:
```bash
curl.exe -i http://localhost:8080/api/auth/me
```
Deve responder `401` com `{"erro":"Não autenticado."}`. Isso é o esperado:
você ainda não fez login, e a resposta prova que o nginx está falando com o
backend.

**6. Crie os dados de exemplo** (usuários de todos os perfis, cardápio e mesas):
```bash
docker compose exec backend node scripts/seed.js
```
Pode rodar mais de uma vez: só cria o que ainda não existe. Os logins aparecem
no final do comando e estão [na tabela abaixo](#logins-de-demonstração). Detalhes
em [`docs/dados-de-exemplo.md`](docs/dados-de-exemplo.md).

**7. Entre no sistema:** abra **http://localhost:8080**, clique em **Entrar** e use
um dos logins de demonstração.

Este comando roda dentro do container do backend, grava a senha com hash argon2
e cria um administrador. Troque `NOME`, `CPF` e `SENHA` (a senha precisa de pelo
menos 6 caracteres e não pode ter aspas simples; o CPF precisa ser **válido**):

$NOME  = 'Seu Nome'
$CPF   = '000.000.000-00'
$SENHA = 'Sua Senha Aqui'

docker compose exec -T -e NOME=$NOME -e CPF=$CPF -e SENHA=$SENHA backend node scripts/criar-admin.js

#### Comandos do dia a dia

Sempre na pasta raiz do projeto:

| O que você quer | Comando |
|---|---|
| Subir (já construído antes) | `docker compose up -d` |
| Ver o estado dos serviços | `docker compose ps` |
| Ver os logs ao vivo (Ctrl+C sai, sem derrubar nada) | `docker compose logs -f backend` |
| Parar mantendo tudo (rápido para voltar) | `docker compose stop` |
| Desligar e remover os containers (**os dados continuam salvos**) | `docker compose down` |
| Atualizar depois de um `git pull` ou de mudar código | `docker compose up --build -d` |
| ⚠️ **Apagar tudo, inclusive o banco e as fotos** (volta ao zero) | `docker compose down -v` |

> **Mudou o código e nada mudou na tela?** Neste modo o código vai
> *empacotado* dentro da imagem: sem o `--build`, o Docker reutiliza a versão
> antiga. Sempre use `docker compose up --build -d` depois de editar ou de um
> `git pull`.

#### Configurações opcionais (`.env`)

| Variável | Padrão | Para que serve |
|---|---|---|
| `JWT_SECRET` | *(obrigatória)* | Chave que assina o login. O compose recusa subir sem ela |
| `WEB_PORT` | `8080` | Porta do sistema no navegador |
| `MONGO_PORT` | `27017` | Porta do Mongo na sua máquina (mude se der conflito) |
| `JWT_EXPIRES_IN` | `8h` | Duração do login |
| `TZ_ESTABELECIMENTO` | `America/Sao_Paulo` | Fuso do rollup mensal e do dashboard |

Depois de mudar o `.env`, rode `docker compose up -d` para aplicar.

#### Problemas comuns

| O que aparece | O que fazer |
|---|---|
| `ports are not available ... 127.0.0.1:27017` (ou "só é permitida uma utilização de cada endereço") | A porta 27017 já está em uso, geralmente por um **MongoDB instalado no Windows**. Coloque `MONGO_PORT=27018` no `.env` e rode `docker compose up -d` de novo. Para ver quem usa a porta: `netstat -ano \| grep 27017`, depois `tasklist \| grep NUMERO_DO_PID` |
| Mesmo erro, mas com a porta **8080** | Coloque `WEB_PORT=8081` no `.env` e abra `http://localhost:8081` |
| `Defina o JWT_SECRET ...` | O `.env` não existe ou está com `JWT_SECRET=` vazio. Refaça os passos 2 e 3 |
| `failed to connect to the docker API` / `Cannot connect to the Docker daemon` | O Docker não está rodando. Abra o Docker Desktop e espere iniciar |
| `Could not resolve "../../utils/..."` durante o build do frontend | Faltou algum arquivo novo ao copiar o projeto. Confira o `git status` e baixe de novo (`git pull`) |
| `Cannot find module` ao rodar o seed | A imagem do backend é anterior ao script de seed. Rode `docker compose up --build -d` e tente de novo |
| A tela abre, mas o login diz que o CPF ou a senha estão inválidos | O seed ainda não foi rodado (passo 6), ou o CPF/senha estão diferentes |
| O banco voltou vazio | Alguém rodou `docker compose down -v` (apaga os volumes). Rode o seed de novo |
| `backend` fica `unhealthy` ou reiniciando | Veja o motivo com `docker compose logs backend`. Geralmente é `JWT_SECRET` ou o Mongo ainda iniciando |
| Quer começar do zero | `docker compose down -v` e depois repita a partir do passo 4 |

#### Bom saber

- **Conectar no Compass:** `mongodb://localhost:27017` (ou a porta do
  `MONGO_PORT`), banco `pronta-comanda`.
- **Atrás do nginx:** o compose liga o `TRUST_PROXY=1` para o limite de
  tentativas de login funcionar por IP real, e as conexões de tempo real
  (socket.io, com WebSocket) passam pelo mesmo endereço do site.
- **Não é uma configuração de produção.** O Mongo está **sem senha** (por isso
  só aceita conexões da própria máquina), o site roda em HTTP e o backend
  usa `NODE_ENV=development` de propósito. Não exponha essas portas na internet
  nem em rede compartilhada.
- **Integração contínua:** a cada push na `main`, o GitHub Actions
  (`.github/workflows/ci.yml`) roda `docker compose build` para garantir que as
  imagens continuam compilando.

### Opção 2: Kubernetes

Sobe o mesmo sistema em um cluster Kubernetes, com um comando
(`kubectl apply -k k8s/`): banco com disco próprio (StatefulSet), backend, e o
site com **2 réplicas**. O passo a passo completo, com **roteiro de demonstração**
(derrubar um pod, escalar, persistência) e problemas comuns, está em
**[`k8s/README.md`](k8s/README.md)**.

**Você precisa de:** Docker Desktop com o Kubernetes ligado
(*Settings → Kubernetes → Enable Kubernetes*, e esperar ficar verde). Confira que
o `kubectl` aponta para o cluster certo:
```bash
kubectl config current-context    # deve ser docker-desktop
kubectl get nodes                 # o nó deve estar Ready
```

Resumo, na **pasta raiz** do projeto:
```bash
docker build -t pronta-comanda-backend:local ./backend
docker build -t pronta-comanda-frontend:local ./frontend
cp k8s/secret.env.example k8s/secret.env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 64)/" k8s/secret.env
kubectl apply -k k8s/
kubectl get pods -n pronta-comanda -w      # espere todos ficarem Running 1/1 (Ctrl+C sai)
kubectl exec -n pronta-comanda deploy/backend -- node scripts/seed.js
kubectl port-forward -n pronta-comanda svc/frontend 8080:80
```
O último comando **fica rodando** (deixe o terminal aberto); abra
**http://localhost:8080**. Para acompanhar o banco no Compass, abra **outro**
terminal com `kubectl port-forward -n pronta-comanda pod/mongo-0 27018:27017` e
conecte em `mongodb://localhost:27018`.

> Pare o Docker Compose antes (`docker compose down`, sem `-v`): os dois usam a
> porta 8080. O banco do Compose e o do Kubernetes são **separados**.

### Opção 3: sem Docker (desenvolvimento local)

Requisitos: Node 22 e MongoDB rodando (local ou Atlas). Use **dois terminais**.

**Backend** (na pasta `backend`)
```bash
cp .env.example .env
npm install
```
No `.env`, ajuste o `MONGO_URI` (se precisar) e troque o `JWT_SECRET` por uma
chave própria:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Depois ligue o servidor e crie os dados de exemplo:
```bash
npm run dev       # nodemon, porta 3333 (deixe rodando)
npm run seed      # em outro terminal, também na pasta backend
```

**Frontend** (na pasta `frontend`)
```bash
npm install
npm run dev       # vite, porta 5173, com proxy de /api -> :3333
```
Abra **http://localhost:5173**. Aqui o código atualiza sozinho ao salvar, sem
`--build`.

## Logins de demonstração

Criados pelo seed. A senha de todos é **`senha123`**.

| Perfil | Nome | CPF | Cai em |
|---|---|---|---|
| Administrador | Administrador | 529.982.247-25 | Dashboard |
| Garçom | Carlos Garçom | 111.444.777-35 | Mapa de mesas |
| Cozinha | Cozinha | 390.533.447-05 | KDS da cozinha |
| Bar | Bar | 123.456.789-09 | KDS do bar |
| Caixa | Caixa | 987.654.321-00 | Mesas/Comandas |

> São CPFs de teste (válidos, mas que não pertencem a ninguém) e uma senha
> conhecida. **Use só em demonstração**, nunca com dados reais.

## Roteiro para demonstrar o sistema

**Antes de começar:** suba o sistema (Docker ou Kubernetes), rode o seed e abra
**um navegador diferente para cada pessoa logada** (por exemplo: Chrome normal =
garçom, janela anônima do Chrome = cozinha, Edge = administrador/caixa). O login
fica em um cookie compartilhado entre as janelas do mesmo navegador, então dois
logins no mesmo navegador derrubam um ao outro. O **cliente** não precisa de login
e pode ser o celular.

1. **Cliente (celular):** escaneia o QR code, abre o cardápio, adiciona itens,
   escolhe a mesa e envia o pedido. A tela mostra "Aguardando garçom".
2. **Garçom:** o pedido aparece na hora no topo do mapa de mesas. Toca em
   **Aceitar**: a mesa fica ocupada e os itens vão para a cozinha e o bar.
3. **Cozinha e Bar:** o item chega no KDS. **Iniciar preparo** e depois **Pronto**.
4. **Cliente:** vê o andamento de cada item e a **comanda da mesa**.
5. **Segundo cliente na mesma mesa:** pede o mesmo produto e vê a mesma comanda,
   com os itens iguais empilhados (`2× Hambúrguer`).
6. **Caixa:** em Mesas/Comandas, fecha a mesa com o pagamento. A comanda **some do
   celular dos clientes** ("Conta encerrada").
7. **Administrador:** no Dashboard, mostra os indicadores, as **Estatísticas do
   período** (média, mediana, moda, desvio padrão), o **Desempenho da equipe** e
   clica em **Exportar PDF**. Para ter dados variados na apresentação, rode antes
   `docker compose exec backend node scripts/seed-demo.js` (veja
   [`docs/estatisticas.md`](docs/estatisticas.md)).
8. *(Kubernetes)* Apague um pod do site e mostre que o sistema continua no ar
   (veja o roteiro em [`k8s/README.md`](k8s/README.md)).

## Autoatendimento (QR code)

O cliente escaneia um QR code, abre o cardápio no celular e envia o pedido. **O
pedido não vai direto para a cozinha**: ele fica pendente até o garçom conferir no
salão e aceitar (ou recusar, com motivo). Só no aceite a mesa fica ocupada e os
itens seguem para o KDS. Depois de aceito, o cliente acompanha o andamento e vê a
comanda da mesa; quando o caixa recebe o pagamento, ela some da tela dele.

**Para testar com o celular:** o computador e o celular precisam estar na **mesma
rede Wi-Fi**. Descubra o IP do computador (`ipconfig | grep IPv4` no Git Bash) e
gere um QR code (qualquer gerador online) para `http://SEU_IP:8080`. Se não abrir,
libere a porta 8080 no Firewall do Windows. No Kubernetes, rode o `port-forward`
com `--address 0.0.0.0`.

Fluxo completo, regras de segurança e endpoints em
[`docs/autoatendimento.md`](docs/autoatendimento.md).

## Estrutura

```
ProntaComanda/
├── docker-compose.yml         # sobe mongo + backend + frontend
├── .env.example               # modelo do .env do compose (JWT_SECRET etc.)
├── .github/workflows/ci.yml   # CI: docker compose build a cada push na main
├── docs/                      # autoatendimento, dados de exemplo, relatório em PDF
├── k8s/                       # manifestos do Kubernetes (ver k8s/README.md)
├── backend/
│   ├── Dockerfile             # imagem do backend (Node 22)
│   ├── server.js              # ponto de entrada (conecta DB, sockets, cron, HTTP)
│   ├── scripts/seed.js        # dados de exemplo (npm run seed)
│   └── src/
│       ├── app.js             # monta o Express (helmet, cors, rotas em /api)
│       ├── config/            # conexão com o banco
│       ├── models/            # schemas Mongoose (inclui PedidoCliente)
│       ├── schemas/           # validação Zod de entrada, um arquivo por módulo
│       ├── routes/            # endpoints + RBAC + validação (fino, delega ao controller)
│       ├── controllers/       # regra de negócio de cada módulo
│       ├── middlewares/       # auth (JWT), RBAC, validate (Zod), limites de requisição, erro global
│       ├── sockets/           # socket.io (KDS, mapa de mesas, pedidos de cliente)
│       ├── jobs/              # rollup mensal agendado (node-cron)
│       └── utils/             # logger (winston), asyncHandler, AppError, cpf, escaparRegex
│
└── frontend/
    ├── Dockerfile             # build do Vite + nginx
    ├── nginx.conf             # serve o front e repassa /api, /uploads e /socket.io
    └── src/
        ├── api/               # cliente axios
        ├── store/             # zustand (sessão do funcionário)
        ├── routes/            # react-router-dom + guarda de rota por perfil
        │   └── destinosPorPerfil.js  # fonte única: para onde cada perfil vai após logar
        ├── schemas/           # validação de formulário (zod + react-hook-form)
        ├── hooks/             # useSocket (tempo real)
        ├── utils/             # agruparItens (empilha itens iguais), gerarRelatorioPdf
        ├── components/
        │   ├── layout/        # sidebar do admin (filtrada por perfil, com botão Sair)
        │   ├── kds/           # quadro do KDS, compartilhado entre 2 telas
        │   ├── publico/       # painel de pedido do cliente (carrinho, andamento, comanda da mesa)
        │   └── funcionarios/  # fila de pedidos de cliente do garçom
        └── pages/
            ├── publico/       # cardápio público (autoatendimento)
            ├── admin/         # Dashboard, Cardápio, Mesas/Comandas, Cozinha, Estoque, Funcionários, Auditoria
            ├── funcionarios/  # Mapa de mesas + Mesa (cardápio digital + comanda), mobile
            └── kds/           # tela standalone do KDS, sem sidebar (cozinha/bar)
```

## Como cada perfil entra no sistema

O login manda todo mundo para `/`, que decide o destino
(`routes/destinosPorPerfil.js`). Cada rota é protegida por perfil
(`routes/RotaProtegida.jsx`, RF01) e o backend valida o perfil de novo em
toda requisição. O cardápio público (`/`, sem login) é a porta do cliente.

| Perfil | Cai em | Sidebar? |
|---|---|---|
| administrador | `/admin/dashboard` | Sim, todos os itens |
| caixa | `/admin/mesas` | Sim, só "Mesas/Comandas" |
| cozinha / bar | `/kds` | Não, tela standalone só com o KDS |
| garçom | `/funcionarios` | Não, módulo mobile (funciona também no computador) |

## API

Todas as rotas ficam sob `/api` e exigem o cookie de sessão, **exceto** o login, o
cardápio público (`GET /cardapio`) e as rotas de autoatendimento (`/publico/*`).
Erros seguem o formato `{ "erro": "mensagem" }`; validação de entrada devolve
400 com `{ "erro": "Dados inválidos.", "detalhes": { campo: [mensagens] } }`.
Duplicidade (CPF, e-mail, nome, número de mesa) devolve 409.

| Módulo | Endpoints | Quem acessa |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | qualquer (`me` exige login) |
| Funcionários | `GET/POST /funcionarios`, `GET/PUT/DELETE /funcionarios/:id`, `PATCH /funcionarios/:id/reativar` | administrador |
| Categorias | `GET /categorias`, `GET /categorias/:id` | qualquer perfil logado |
| | `POST /categorias`, `PUT/DELETE /categorias/:id`, `PATCH /categorias/:id/reativar` | administrador |
| Produtos | `GET /produtos`, `GET /produtos/:id` | qualquer perfil logado |
| | `GET /cardapio` | **público** (sem login) |
| | `POST /produtos`, `PUT/DELETE /produtos/:id`, `PATCH /produtos/:id/disponibilidade`, `PATCH /produtos/:id/reativar`, `POST /produtos/:id/imagem` (upload de foto: JPG, PNG ou WEBP, até 5 MB) | administrador |
| Estoque | `GET/POST /estoque`, `GET/PUT/DELETE /estoque/:id`, `PATCH /estoque/:id/reativar`, `POST /estoque/:id/movimentar`, `GET /estoque/:id/movimentacoes` | administrador |
| Mesas | `GET /mesas` | qualquer perfil logado |
| | `POST /mesas`, `DELETE /mesas/:id`, `PATCH /mesas/:id/reabrir` | administrador |
| | `POST /mesas/:id/abrir`, `PATCH /mesas/:id/solicitar-fechamento` | garçom, caixa, administrador |
| Comandas | `GET /comandas/mesa/:mesaId`, `GET /comandas/produtos/:produtoId/sugestoes` | qualquer perfil logado |
| | `POST /comandas/abrir`, `POST /comandas/:id/itens`, `POST /comandas/:id/transferir` | garçom, caixa, administrador |
| | `GET /comandas/kds?setor=`, `PATCH /comandas/:id/avancar-status?setor=`, `PATCH /comandas/:id/itens/:itemId/status` | cozinha, bar, administrador |
| | `PATCH /comandas/:id/itens/:itemId/estornar` | caixa, administrador |
| | `PATCH /comandas/:id/desconto` | administrador |
| Pagamentos | `POST /pagamentos/mesa/:mesaId/fechar`, `POST /pagamentos/comanda/:comandaId/fechar` | caixa, administrador |
| Dashboard | `GET /dashboard/visao-geral?periodo=`, `GET /dashboard/faturamento-mensal`, `GET /dashboard/status-pedidos?periodo=`, `GET /dashboard/top-produtos?periodo=` | administrador |
| Auditoria | `GET /auditoria`, `GET /auditoria/tipos` | administrador |
| Autoatendimento (cliente) | `GET /publico/mesas`, `POST /publico/pedidos`, `GET /publico/acompanhamento?ids=`, `GET /publico/pedidos?ids=`, `GET /publico/pedidos/:id` | **público** (com limite de requisições por IP) |
| Pedidos de cliente | `GET /pedidos-cliente`, `POST /pedidos-cliente/:id/aceitar`, `POST /pedidos-cliente/:id/recusar` | garçom, caixa, administrador |

O relatório em PDF do Dashboard é gerado no navegador, com os mesmos dados dessas
rotas (não há rota de PDF no backend).

**Eventos socket.io:** `mesa:atualizada` (sala `mapa-mesas`),
`kds:novo-item` (sala do setor: `cozinha` ou `bar`), `kds:status-atualizado`,
`produto:atualizado` (disponibilidade/ruptura, para todos os dispositivos),
`pedido-cliente:novo` e `pedido-cliente:resolvido` (sala `pedidos-cliente`).

## Regras de negócio

- **Soft delete (RNF11):** funcionário, categoria, produto, insumo e mesa são
  inativados, nunca apagados, para preservar o histórico. Todos têm rota de
  reativar (exceto mesa, que é recriada pelo mesmo número).
- **Snapshot no item da comanda:** nome e preço do produto são copiados no
  lançamento, então editar o cardápio depois não altera contas antigas.
- **Setor vem do cadastro:** o item lançado usa o `setor` (cozinha/bar) do
  produto; o que o app enviar é ignorado.
- **Categoria com produto ativo não pode ser inativada** (409, com a contagem).
- **Mesa:** livre → ocupada (abrir) → aguardando fechamento (solicitar) →
  livre (pagamento). Uma mesa pode ter várias comandas abertas ao mesmo tempo.
- **Pagamento (RF11):** o valor recebido tem que cobrir o total; menos que isso é
  recusado com 409 dizendo quanto falta. Descontos e itens estornados entram no
  cálculo.
- **Estorno (RF07/RF08):** exige motivo e gera auditoria.
- **Desconto (RF09):** só o administrador aplica.
- **Reabertura (RF12):** só administrador. Reabre a(s) comanda(s), volta a mesa
  para ocupada e estorna o último pagamento (`estornado: true`, que o dashboard
  ignora).
- **KDS (RF05/RF06):** cada item tem um status (pendente → em preparo → pronto →
  entregue); item estornado não aparece mais no quadro.
- **Estoque (RF10/RF22):** o saldo só muda por `/movimentar` (entrada, saída ou
  ajuste), sempre com histórico, e nunca fica negativo. Ajuste exige motivo e gera
  auditoria. Zerar um insumo torna indisponíveis os produtos que dependem dele, e
  repor volta a liberá-los, em tempo real.
- **Auditoria:** criação/edição/desligamento de funcionário, troca de preço e
  inativação de produto, ajuste de estoque, estorno, desconto e reabertura de
  mesa gravam em `LogAuditoria`.
- **Login:** limite de 10 tentativas erradas por 15 minutos por IP; login correto
  nunca conta para o limite.
- **Autoatendimento:** pedido do cliente fica pendente até o garçom aceitar; o
  preço vem sempre do cadastro (nunca do cliente); no máximo 5 pedidos pendentes
  por mesa; produto esgotado bloqueia o envio; só quem tem pedido **aceito** numa
  mesa enxerga a comanda dela. Veja [`docs/autoatendimento.md`](docs/autoatendimento.md).

## O que já está funcional

- Login com JWT em cookie httpOnly + argon2, validado com Zod, com mitigação
  de timing attack (CPF inexistente ainda roda um `argon2.verify` falso) e
  limite de tentativas (`express-rate-limit`).
- RBAC (RF01) no backend em toda rota sensível e espelhado no frontend.
- CRUD de Funcionários (com CPF validado por dígito verificador), Categorias,
  Produtos (com setor, tempo de preparo e upload de foto), Estoque e Mesas, todos
  com validação Zod e erros do Mongo traduzidos (duplicidade vira 409, dado
  inválido vira 400).
- Cardápio agrupado por categoria em uma chamada (`GET /cardapio`), que também
  alimenta o cardápio público do cliente.
- **Autoatendimento por QR code:** carrinho no celular, confirmação pelo garçom em
  tempo real, andamento de cada item, comanda compartilhada da mesa (itens iguais
  empilhados) e limpeza da tela quando a conta é paga.
- Fluxo de mesa completo: abrir → lançar item → KDS → estornar → desconto →
  fechar com pagamento → reabrir se foi engano (RF04 a RF12).
- KDS por setor com semáforo de tempo (RF06, usa o tempo de preparo cadastrado
  no Cardápio, com um limite padrão quando não há tempo configurado) e avanço de
  status em lote. Itens iguais aparecem empilhados.
- Módulo mobile do garçom (RF19 a RF26): carrinho com quantidade e remoção por
  item, seleção explícita de qual comanda recebe o pedido, "+ Nova comanda" sempre
  disponível, sugestão de observações com um toque (RF21), espelho de consumo com
  status colorido e subtotal (RF23), mapa de mesas com os 3 status e indicador de
  conexão (RF04/RF19), tudo atualizado em tempo real por socket. Também funciona
  bem no computador (conteúdo centralizado e em colunas).
- Dashboard completo (RF17): filtro Hoje/Esta semana/Este mês, variação vs.
  período anterior (volta `null` quando o dado já foi expurgado e não dá pra
  comparar), faturamento dos últimos 12 meses, taxa de conversão, status dos
  pedidos e Top 5 produtos. **Exportação em PDF** do período selecionado
  ([`docs/relatorio-pdf.md`](docs/relatorio-pdf.md)).
- Telas admin de Funcionários, Cardápio, Estoque, Mesas/Comandas e **Auditoria**,
  com botões de criar, editar, remover/reativar e o botão Sair na sidebar.
- Job de consolidação mensal + expurgo (RF14 a RF16): só processa comandas
  fechadas, recupera meses perdidos se o servidor ficou desligado na virada
  (catch-up na inicialização) e usa o fuso do estabelecimento
  (`TZ_ESTABELECIMENTO`, padrão `America/Sao_Paulo`).
- **Docker Compose** e **Kubernetes** (ver [Como rodar](#como-rodar)), com CI que
  compila as imagens a cada push e dados de exemplo (`seed`) para demonstração.

## O que ainda falta

**Backend: validações que o sistema ainda não faz** (comportamentos encontrados ao
testar a API; ficam como pendência, e o ideal é corrigi-los antes de uso real):
- **Desconto sem limite:** aceita percentual acima de 100 ou negativo.
- **Comanda já paga pode ser alterada:** desconto, estorno e transferência de itens
  ainda funcionam depois do fechamento (o certo seria exigir comanda aberta ou
  reabrir a mesa antes).
- **Status do KDS sem validação:** `PATCH /comandas/:id/itens/:itemId/status` aceita
  qualquer texto (um status inválido impede fechar a comanda, porque o pagamento
  passa a falhar) e permite voltar para trás.
- **Estorno:** o motivo é obrigatório, mas aceita 1 caractere.
- **Rotas de comanda sem validação Zod:** o lançamento de item aceita quantidade
  fracionada ou enorme e observação de tamanho ilimitado.
- **Socket.io sem login:** qualquer cliente conectado consegue entrar nas salas
  internas (KDS, mapa de mesas, pedidos de cliente) e receber os eventos.

**Backend: funcionalidades**
- **Ficha técnica:** `insumosNecessarios` existe no produto, mas o lançamento
  de item ainda não dá baixa no estoque (hoje só o ajuste manual mexe no saldo).
- **Reabertura por comanda:** a reabertura (RF12) é por mesa; fechar por
  engano uma comanda avulsa enquanto a mesa continua ocupada ainda não tem
  como ser desfeito.
- **Várias réplicas do backend:** o tempo real, o job mensal e as fotos de produto
  ainda não suportam mais de uma cópia (por isso o backend roda com 1 réplica no
  Kubernetes).
- Swagger/OpenAPI (o `swagger-ui-express` já está no `package.json`, faltam as
  rotas e as specs).
- Backup segmentado com `mongodump` (RNF05) e revisão de índices para o limite de
  1s (RNF09).
- Emissão de vias impressas da conta (RF13, opcional): hoje só o relatório do
  Dashboard sai em PDF.
- Testes automatizados.
- Dependências com vulnerabilidades conhecidas (`npm audit`); parte tem correção
  segura (`npm audit fix`), parte exige trocar de versão principal.
- QR code **por mesa** (hoje o QR é único e o cliente escolhe a mesa; o garçom
  confere antes de aceitar).

**Frontend**
- Refino visual das telas para bater com o Figma (cores, espaçamento, tema
  escuro completo).
- Trocar os `prompt`/`confirm`/`alert` do navegador por modal, bottom sheet e
  toast.

## Convenções

- **Commits** no padrão Conventional Commits: `tipo(escopo): descrição`
  (`feat`, `fix`, `chore`, `docs`, `test`), por exemplo
  `fix(pagamento): bloqueia fechamento com valor insuficiente`.
- Antes de commitar: `npm run lint` e `npm run format` no backend, e conferir
  o `git status` para não subir `.env`, `k8s/secret.env`, `logs/`, `node_modules/`
  nem pastas de build de IDE.

## Histórico de bugs corrigidos

- **Loop de navegação na raiz (`/`):** `RotaProtegida`, `RaizRedirect` e
  `AdminIndex` usavam `<Navigate>` declarativo, que redispara a navegação a
  cada re-render. Como esses componentes assinavam a store inteira, qualquer
  mudança nela recriava o `<Navigate>` e travava o app com "Maximum update
  depth exceeded". Corrigido com `useNavigate()` + `useEffect` com
  dependências explícitas.
  ⚠️ **O bug já voltou uma vez** porque uma cópia local desatualizada foi
  enviada por cima da correção. Ao mexer nesses três arquivos, mantenha o
  padrão `useEffect` + `useNavigate`, nunca `<Navigate>` direto, e confira o
  `git diff` antes de commitar.
- **Auditoria de produto perdida em silêncio:** o controller gravava tipos
  (`produto_preco_alterado`, `produto_inativado`, `produto_reativado`) que não
  existiam no enum de `LogAuditoria`; o `try/catch` engolia o erro e nada era
  salvo. Corrigido adicionando os tipos ao enum.
- **Reabertura de mesa (RF12) nunca funcionava:** a condição estava invertida
  e bloqueava justamente o caso de uso (mesa já fechada). Agora reabre a
  comanda e estorna o pagamento.
- **Pagamento menor que o total era aceito:** só zerava o troco e liberava a
  mesa. Agora é recusado (409).
- **Criar mesa sem número** podia reativar a primeira mesa do banco por engano
  (o Mongo ignora chaves `undefined` no filtro). Agora dá 400.
- **Telas sem `try/catch`:** fechar mesa, estornar item e aplicar desconto
  quebravam em silêncio quando o backend recusava. Agora mostram o motivo.

## Documentação adicional

| Arquivo | Assunto |
|---|---|
| [`k8s/README.md`](k8s/README.md) | Kubernetes: passo a passo, roteiro de demonstração e problemas comuns |
