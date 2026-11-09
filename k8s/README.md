# Pronta Comanda no Kubernetes

Esta pasta sobe o sistema inteiro (banco, backend e frontend) em um cluster
Kubernetes, com **um comando** (`kubectl apply -k k8s/`). É o equivalente ao
`docker-compose.yml`, só que gerenciado pelo Kubernetes: ele reinicia o que cair,
guarda os dados em discos próprios e permite aumentar as réplicas do site com um comando.

> O Docker Compose continua funcionando normalmente. O Kubernetes é uma segunda forma
> de rodar o mesmo projeto, usando **as mesmas imagens**.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `kustomization.yaml` | Junta tudo e gera o ConfigMap e o Secret. É o arquivo que o `kubectl apply -k` lê |
| `namespace.yaml` | A "pasta" `pronta-comanda`, onde fica tudo |
| `mongo.yaml` | Banco de dados (StatefulSet + disco de 1 GB) |
| `backend.yaml` | API (Deployment + Service + disco das fotos de produto) |
| `frontend.yaml` | Site: nginx com **2 réplicas** + Service |
| `nginx-k8s.conf` | Versão da configuração do nginx para o Kubernetes (explicação abaixo) |
| `secret.env.example` | Modelo do arquivo com o `JWT_SECRET` (o `secret.env` real nunca vai para o Git) |
| `ingress.yaml` | **Opcional**: acesso por nome (`pronta-comanda.localtest.me`) |

## Como o Docker Compose vira Kubernetes

| No Docker Compose | No Kubernetes |
|---|---|
| serviço `mongo` + volume `mongo-data` | `StatefulSet` `mongo` com disco (PersistentVolumeClaim) |
| serviço `backend` + volume `uploads` | `Deployment` `backend` + `Service` + disco `uploads` |
| serviço `frontend` (nginx) | `Deployment` `frontend` (2 réplicas) + `Service` |
| arquivo `.env` e `environment:` | `ConfigMap` (variáveis comuns) e `Secret` (o `JWT_SECRET`) |
| `depends_on` + `healthcheck` | `initContainers` (esperam o Mongo) + `readinessProbe` / `livenessProbe` |
| `ports: "8080:80"` | `kubectl port-forward` (ou Ingress) |

**Uma diferença importante:** no Compose o nginx achava o backend pelo DNS interno do
Docker (`127.0.0.11`), que não existe no Kubernetes. Por isso o frontend recebe, por
um ConfigMap, o `nginx-k8s.conf`: o mesmo arquivo, mas usando o nome do Service
`backend`. A imagem do frontend é a mesma nos dois casos.

## O que você precisa ter

**Docker Desktop com o Kubernetes ligado** (o jeito mais simples, já que você usa o Docker):

1. Abra o Docker Desktop, vá em **Settings → Kubernetes**, marque **Enable Kubernetes** e
   clique em **Apply & restart**.
2. Espere o ícone do Kubernetes ficar **verde** ("Kubernetes running"). Na primeira vez
   pode levar alguns minutos.

Confira no Git Bash (o `kubectl` já vem com o Docker Desktop):

```bash
kubectl config current-context
kubectl get nodes
```

O contexto deve ser `docker-desktop` e o nó deve aparecer como `Ready`.

> ⚠️ **Sempre confira o contexto antes de aplicar.** O `kubectl` age no cluster que
> estiver selecionado. Se aparecer algo diferente de `docker-desktop` (ou `minikube`,
> `kind-kind`), troque com `kubectl config use-context docker-desktop`.

*Alternativas:* **minikube** (`minikube start`) ou **kind** (`kind create cluster`). Os
passos são os mesmos, com uma diferença no passo 1 (veja a observação lá).

## Passo a passo (primeira vez)

Todos os comandos no **Git Bash**, na **pasta raiz do projeto** (onde fica o `docker-compose.yml`).

### 1. Construa as imagens

```bash
docker build -t pronta-comanda-backend:local ./backend
docker build -t pronta-comanda-frontend:local ./frontend
```

Isso monta as mesmas imagens do Compose, com a etiqueta `local`. O frontend demora mais
(compila o React).

> **minikube:** depois do build, envie as imagens ao cluster:
> `minikube image load pronta-comanda-backend:local` e
> `minikube image load pronta-comanda-frontend:local`.
> **kind:** `kind load docker-image pronta-comanda-backend:local` e o mesmo para o frontend.
> No Docker Desktop **não precisa**: o cluster enxerga as imagens do Docker.

### 2. Crie o segredo

```bash
cp k8s/secret.env.example k8s/secret.env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 64)/" k8s/secret.env
```

O segundo comando grava uma chave aleatória no `k8s/secret.env`. Esse arquivo **não vai
para o Git** (a pasta tem um `.gitignore` para ele).

### 3. Suba o sistema

```bash
kubectl apply -k k8s/
```

O `-k` diz para usar o `kustomization.yaml`. Aparece uma lista de coisas `created`.

### 4. Acompanhe a subida

```bash
kubectl get pods -n pronta-comanda -w
```

(O `-w` fica atualizando. Para sair, **Ctrl+C**.) Na primeira vez demora alguns minutos,
porque o Kubernetes baixa as imagens do Mongo. Você vai ver os pods passarem por estes estados:

| Pod | O que aparece até ficar pronto |
|---|---|
| `mongo-0` | `ContainerCreating` → `Running 1/1` |
| `backend-...` | `Init:0/2` (esperando o Mongo) → `Init:1/2` → `PodInitializing` → `Running 1/1` |
| `frontend-...` (2 pods) | `ContainerCreating` → `Running 1/1` |

Está pronto quando **todos** estiverem `Running` com `1/1`.

### 5. Crie os dados de exemplo

```bash
kubectl exec -n pronta-comanda deploy/backend -- node scripts/seed.js
```

Cria administrador, garçom, cozinha, bar, caixa, o cardápio e as mesas (veja
`docs/dados-de-exemplo.md`). Os logins aparecem no final do comando.

### 6. Abra o sistema

```bash
kubectl port-forward -n pronta-comanda svc/frontend 8080:80
```

Esse comando **fica rodando** (deixe o terminal aberto). Abra **http://localhost:8080**.

> **Para o celular acessar (QR code):** use
> `kubectl port-forward -n pronta-comanda --address 0.0.0.0 svc/frontend 8080:80`
> e abra `http://IP_DO_COMPUTADOR:8080` no celular (mesma rede Wi-Fi). Pode ser preciso
> liberar a porta 8080 no Firewall do Windows.

## Roteiro de demonstração

Bom para mostrar para a banca. Use **outro terminal** (o do `port-forward` fica ocupado).

**1. Mostrar o que está rodando**
```bash
kubectl get all -n pronta-comanda
```
> "Aqui estão os pods, os serviços e as réplicas: 1 banco, 1 backend e 2 cópias do site."

**2. Auto-recuperação: derrubar um pod do site**
```bash
kubectl get pods -n pronta-comanda -l app.kubernetes.io/name=frontend
kubectl delete pod -n pronta-comanda NOME_DE_UM_DOS_PODS
kubectl get pods -n pronta-comanda -l app.kubernetes.io/name=frontend
```
> "Apaguei um pod, mas o sistema continua no ar pela outra cópia, e o Kubernetes já está
> criando um novo para manter as 2 réplicas."

**3. Escalar: aumentar as cópias do site**
```bash
kubectl scale deployment frontend -n pronta-comanda --replicas=4
kubectl get pods -n pronta-comanda -l app.kubernetes.io/name=frontend
```
Depois volte para 2: `kubectl scale deployment frontend -n pronta-comanda --replicas=2`.

**4. Os dados sobrevivem: derrubar o banco**
```bash
kubectl delete pod -n pronta-comanda mongo-0
kubectl get pods -n pronta-comanda -w
```
> "O banco foi recriado, mas o disco é outro objeto, que continua lá. Quando o Mongo
> volta, os dados estão intactos."

Quando o `mongo-0` voltar a `Running 1/1`, entre de novo no sistema: os usuários e produtos
continuam lá.

**5. Ver o que o backend está dizendo**
```bash
kubectl logs -n pronta-comanda deploy/backend -f
```
(**Ctrl+C** sai.)

**6. Ver os detalhes de um pod** (variáveis, discos, eventos)
```bash
kubectl describe pod -n pronta-comanda -l app.kubernetes.io/name=backend
```

## Atualizar o sistema depois de mudar o código

> ⚠️ **Não adianta só reconstruir a imagem com a etiqueta `local` e rodar `rollout restart`.**
> O cluster já guarda uma imagem chamada `pronta-comanda-frontend:local` e continua
> usando essa cópia antiga, mesmo depois de um `docker build` novo (testado: o pod
> reiniciava e seguia sem o código novo). A solução é **usar uma etiqueta nova a cada
> build** (`v2`, `v3`, `v4`...).

Rode na **raiz do projeto**, no Git Bash. Troque `v3` por um número que ainda não usou.

**Frontend:**

```bash
docker build -t pronta-comanda-frontend:v3 ./frontend
kubectl set image deployment/frontend frontend=pronta-comanda-frontend:v3 -n pronta-comanda
kubectl rollout status deployment/frontend -n pronta-comanda
```

**Backend** (o pod do backend tem 2 containers de preparação que usam a mesma imagem,
por isso são 3 nomes):

```bash
docker build -t pronta-comanda-backend:v3 ./backend
kubectl set image deployment/backend espera-mongo=pronta-comanda-backend:v3 permissao-uploads=pronta-comanda-backend:v3 backend=pronta-comanda-backend:v3 -n pronta-comanda
kubectl rollout status deployment/backend -n pronta-comanda
```

Depois de qualquer atualização, **o `port-forward` cai** (o pod antigo foi apagado).
Refaça: `kubectl port-forward -n pronta-comanda svc/frontend 8080:80`. No navegador, use
**Ctrl+Shift+R** ou uma aba anônima para não pegar JavaScript em cache.

Para conferir se o pod tem o código novo, procure um texto que você acabou de adicionar:

```bash
kubectl exec -n pronta-comanda deploy/frontend -- sh -c 'grep -l "TEXTO NOVO" /usr/share/nginx/html/assets/*.js'
```

Se aparecer um arquivo `.js`, o código novo está no pod. Se der `exit code 1`, o pod
ainda está com a imagem velha.

> ⚠️ **Não rode `kubectl apply -k k8s` depois disso.** O `kustomization.yaml` aponta para
> a etiqueta `local`, então o `apply` desfaz o `set image` e volta para a imagem velha.
> O `set image` muda só o cluster, não os arquivos. Para trocar a etiqueta de forma
> definitiva, edite `newTag` na seção `images` do `kustomization.yaml`.

## Mudar uma configuração

As variáveis comuns estão no `kustomization.yaml` (em `configMapGenerator`). Depois de
editar, aplique de novo e reinicie para os pods lerem os valores novos:

```bash
kubectl apply -k k8s/
kubectl rollout restart deployment -n pronta-comanda
```

## Desligar e limpar

```bash
kubectl delete -k k8s/
```

Isso apaga o namespace inteiro, **inclusive os discos**, ou seja, o **banco e as fotos
somem**. Para só pausar sem perder nada, use:

```bash
kubectl scale deployment --all -n pronta-comanda --replicas=0
kubectl scale statefulset mongo -n pronta-comanda --replicas=0
```

E para voltar: `--replicas=1` no `backend` e no `mongo`, e `--replicas=2` no `frontend`.

## Acesso por nome (Ingress, opcional)

Em vez do `port-forward`, dá para acessar por `http://pronta-comanda.localtest.me`
(esse domínio aponta para `127.0.0.1`). Precisa de um *Ingress Controller*:

- **minikube:** `minikube addons enable ingress`
- **Docker Desktop:**
  ```bash
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.13.0/deploy/static/provider/cloud/deploy.yaml
  ```
  (Se a versão estiver antiga, veja a atual na documentação do ingress-nginx.)

Depois: `kubectl apply -f k8s/ingress.yaml`.

## Por que só 1 backend?

O frontend tem 2 réplicas porque não guarda nada. O backend, **por enquanto**, roda com
1 réplica de propósito, porque o código ainda não foi preparado para várias cópias:

- o **socket.io** (tempo real) mantém as conexões na memória de cada cópia, e os eventos
  só chegariam a quem estivesse conectado na mesma cópia (seria preciso um Redis);
- o **job mensal** (node-cron, que consolida e apaga dados) rodaria uma vez por cópia;
- as **fotos de produto** ficam num disco que só um pod usa por vez;
- o **limite de tentativas de login** fica na memória de cada cópia.

Por isso o backend usa a estratégia `Recreate`: derruba o pod antigo antes de subir o novo.

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| `ErrImagePull` / `ImagePullBackOff` / `ErrImageNeverPull` no backend ou no frontend | O cluster não achou a imagem. Refaça o passo 1 (confira o nome e a etiqueta `:local`). No minikube ou kind, falta o `image load` / `load docker-image` |
| `kubectl apply` reclama de `secret.env` | Faltou o passo 2 (`cp k8s/secret.env.example k8s/secret.env`) |
| O `backend` fica em `Init:0/2` | Está esperando o Mongo. Veja se ele subiu: `kubectl get pods -n pronta-comanda` e `kubectl logs -n pronta-comanda mongo-0` |
| `mongo-0` ou `backend` em `Pending` e o disco (`pvc`) também | O cluster não tem disco automático. Veja `kubectl get storageclass` (deve existir um marcado `(default)`) |
| O `port-forward` dá `address already in use` | A porta 8080 está ocupada. Use outra: `... svc/frontend 8081:80` e abra `localhost:8081` |
| O site abre, mas o login dá erro 500 | O `JWT_SECRET` ficou vazio. Refaça o passo 2, depois `kubectl apply -k k8s/` e `kubectl rollout restart deployment/backend -n pronta-comanda` |
| `kubectl exec ... seed.js` dá `Cannot find module` | A imagem do backend foi construída antes de existir o script de seed. Refaça o `docker build` do backend e o `rollout restart` |
| Erro de permissão ao enviar foto de produto | Veja o init container: `kubectl logs -n pronta-comanda deploy/backend -c permissao-uploads` |
| O `kubectl` mostra um cluster que não é o seu | `kubectl config get-contexts` e `kubectl config use-context docker-desktop` |
| Quer ver por que um pod não sobe | `kubectl describe pod -n pronta-comanda NOME_DO_POD` (olhe a parte `Events` no final) |

## O que NÃO é produção

Assim como no Docker Compose, é uma configuração de **demonstração**: o MongoDB está
sem senha (só é alcançável de dentro do cluster), o acesso é em HTTP e o backend usa
`NODE_ENV=development` de propósito. Uma versão de produção teria HTTPS, senha no banco,
imagens publicadas em um registro e o backend preparado para várias réplicas.

## Texto para a apresentação

> "Além do Docker Compose, o sistema também roda em Kubernetes. A configuração está na
> pasta `k8s`, e um único comando, `kubectl apply -k`, sobe tudo.
>
> São três partes. O banco MongoDB roda como um StatefulSet, com um disco próprio, então
> os dados sobrevivem mesmo que o pod seja recriado. O backend é um Deployment com uma
> réplica, e as variáveis de configuração ficam em um ConfigMap, enquanto o segredo do
> login fica em um Secret, fora do Git. O site, que é o React servido por um nginx, tem
> duas réplicas e um Service na frente, então, se um pod cair, o outro continua atendendo
> e o Kubernetes cria um novo sozinho.
>
> Também usamos *probes*, que são verificações de saúde: o Kubernetes só manda tráfego
> para um pod depois que ele está pronto e reinicia o que travar. E o backend só inicia
> depois que o banco aceita conexões.
>
> O backend roda com uma réplica por enquanto, porque o tempo real e o job mensal ainda
> não foram preparados para várias cópias. Isso fica como próximo passo."
