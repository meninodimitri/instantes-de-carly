# AGENTS.md — Manual de Bordo & Arquitetura do Produto (White-Label)
> **Template Oficial de Portfólio Fotográfico Profissional com CMS Visual Integrado**  
> Mantido por Yan & Desenvolvido para replicação escalável (White-Label) para fotógrafos e estúdios.

---

## 🧭 Visão Geral do Sistema

Produto completo de **Portfólio Editorial + Sistema de Gestão de Conteúdo (CMS)** para fotógrafos profissionais. Arquitetura estática pura de altíssima performance (**Zero Build Step** / Vanilla HTML, CSS e JavaScript), hospedado na **Vercel** e sincronizado diretamente com o **GitHub**.

### Componentes Principais:
1. **Site Principal (`index.html`)**:
   - Navegação fixa transparente/blur com indicadores de seção e `scroll-margin-top` calibrado exclusivamente em `.section`.
   - Hero dinâmico (*Cinema Hero*) com carrossel de fotos autorais em alta definição e barra inferior de controle.
   - Proposta & Filosofia com tipografia editorial (`text-wrap: balance`/`pretty` e `tabular-nums`).
   - **Portfólio com Vitrine de Capas Inteligente**:
     - No filtro **Acervo Completo (`todos`)**, exibe **apenas 1 foto-capa por categoria** (com badge `Categoria • X fotos →`). Ao clicar na capa, o site filtra automaticamente aquela categoria e rola suavemente até a grade completa.
     - Dentro de qualquer categoria específica, exibe todas as fotos da categoria e abre o modal arquival (*Lightbox*) responsivo para desktop (1680px) e mobile (`100vw`).
   - Abordagem & Metodologia em 3 passos com grade horizontal sem overflow.
   - Formatos e Valores com tabela comparativa de pacotes e selo `Mais Escolhido`.
   - Sobre a fotógrafa, Avaliações de clientes (integração Google Meu Negócio) e Formulário de Pré-Agendamento com máscara brasileira (`inputmode="tel"`, `autocomplete`) e disparo direto para o WhatsApp.
   - Rodapé com mapa de navegação, disclaimer e link para o Brandbook.

2. **Painel Administrativo Visual (`admin.html`)**:
   - CMS Visual split-screen (Editor + Preview PC/Mobile ao vivo) sem necessidade de código.
   - Hidrata automaticamente o nome e a logo do estúdio a partir de `SITE_DATA.brand`.
   - **Otimizador DSLR embutido**: Redimensiona fotos pesadas no navegador (Canvas 1920px, ~300KB, WebP/JPEG com leitura de orientação EXIF) e envia para `assets/images/uploads/`.
   - **Duplo Seletor de Capas**:
     - Botão `+ Capa` (Hero principal do topo do site).
     - Botão `☆ Usar na Capa do Acervo` / `★ Capa do Acervo Completo` (`photo.isAcervoCover = true`, garantindo 1 capa exclusiva por categoria na vitrine inicial do Portfólio).
   - Gestão completa de categorias, pacotes/preços e textos institucionais das seções (`00` a `07`).
   - **Publicação Atômica em 1 Clique + Propagação Instantânea (Zero Cache)**: Commit direto na API REST do GitHub via Personal Access Token (PAT), sem exigir `Ctrl+F5` / `Alt+F5` no site público.

3. **Infraestrutura Zero-Cache & Live Sync (`vercel.json` + `main.js` + `admin.js`)**:
   - `vercel.json` aplica `Cache-Control: no-cache, no-store, must-revalidate` e `CDN-Cache-Control: no-store` em `/assets/js/data.js`, `max-age=0, must-revalidate` nas rotas HTML e cache longo `immutable` em `/assets/images/uploads/(.*)`.
   - `BroadcastChannel('instantes_carly_cms_sync')` atualiza em **0 segundos** qualquer aba aberta do site no mesmo navegador assim que o admin publica.
   - Ponte local temporária (3 min no IndexedDB `local_published`) cobre a janela de ~15s de deploy da Vercel em produção.
   - `revalidateSiteDataFromServer()` busca `assets/js/data.js?t=...` com `cache: 'no-store'` ao abrir ou voltar o foco para a aba (`visibilitychange`), re-hidratando o DOM automaticamente se `cmsVersion` mudou.

4. **Área Privada do Cliente (`galeria.html`)**:
   - Plataforma exclusiva de Provas e Entrega Final para clientes (fluxo integrado Sineto Studio + Pixieset).
   - Tela de acesso protegida por senha com estética editorial em *Glassmorphism* (fundo translúcido com `backdrop-filter: blur`, borda luminosa e foto do ensaio em tela cheia ao fundo).
   - **Fase 1 (Seleção de Provas — Estilo Sineto)**: Filtros limpos (*Todas, Selecionadas, Não Selecionadas, Com Observação*), proteção de imagem com 3 níveis (Marca d'água autoral, Marca d'água + Baixa resolução, ou Marca d'água + Foco interativo ao passar o mouse/dedo), contador de franquia contratada e compra de fotos extras com cálculo automático e pagamento via Pix.
   - **Fase 2 (Entrega Final em Alta — Estilo Pixieset)**: 16 capas autênticas do Pixieset (*Centro, Alegria com máscara JOY na foto, Esquerda, Romance split 50/50, Vintage polaroid, Moldura interna, Listra, Divisor central, Diário, Carimbo, Contorno, Clássico, Dividido, Rótulo, Borda passe-partout e Álbum*), personalização de tipografia, cores e grade, e download em alta resolução protegido por PIN opcional de 4 dígitos.

5. **Visualizador Mobile (`mobile-preview.html`)**, **Brandbook (`brand/index.html`)** e **Deploy Automatizado (`scripts/push-to-github.js`)**.

---

## 🗂️ Estrutura de Pastas & Arquivos

```text
├── index.html                   # Página inicial pública do portfólio
├── admin.html                   # Painel administrativo visual (CMS)
├── galeria.html                 # Área privada do cliente (Seleção Sineto + Entrega Pixieset)
├── mobile-preview.html          # Simulador responsivo em molduras reais
├── vercel.json                  # Clean URLs + Headers Zero-Cache para data.js
├── README.md                    # Documentação pública do repositório
├── AGENTS.md                    # Manual de arquitetura, White-Label e Regras de Tokens (auto-carregado)
├── CONTEXT_ECONOMY_GUIDE.md     # Guia complementar de engenharia de contexto
│
├── assets/
│   ├── css/
│   │   ├── style.css            # Design System editorial e responsividade do site público
│   │   ├── admin.css            # Estilos do painel administrativo e preview split-screen
│   │   ├── galeria.css          # Design editorial da galeria privada, glassmorphism e 16 capas
│   │   └── albums-admin.css     # Estilos da gestão de álbuns, proteções e mini-previews
│   ├── js/
│   │   ├── data.js              # BANCO DE DADOS LOCAL do Portfólio (Fonte Única da Verdade)
│   │   ├── main.js              # Hidratação, vitrine de capas, filtros, lightbox e live-sync
│   │   ├── admin.js             # Engine do CMS, otimizador DSLR, seletor de capas e GitHub API
│   │   ├── albums-store.js      # Store local/IndexedDB de álbuns, cálculo de extras e marcas d'água
│   │   ├── albums-admin.js      # Subpainel do CMS para gerenciar álbuns, capas Pixieset e convites
│   │   └── galeria.js           # Engine da galeria do cliente: seleção, carrinho de extras e downloads
│   └── images/
│       ├── real/                # Fotos iniciais curadas do portfólio
│       ├── uploads/             # Fotos enviadas pelo cliente via Painel Admin
│       ├── carly-perfil.jpg     # Foto de perfil do(a) fotógrafo(a)
│       ├── logo-dark.png        # Logo escura (header após scroll e fundos claros)
│       └── logo-light.png       # Logo clara (hero, admin e capas escuras)
│
├── brand/
│   └── index.html               # Brandbook interativo da marca
└── scripts/
    └── push-to-github.js        # Motor de deploy via GitHub REST API (sem depender de Git CLI)
```

---

## 🎯 Fonte Única da Verdade: `assets/js/data.js`

Toda informação editável vive em `window.SITE_DATA` dentro de `assets/js/data.js`.  
**Nunca declare textos fixos ou dados de clientes direto no HTML/JS sem refletir no `data.js`**.

Chaves oficiais de `SITE_DATA`:
* `cmsVersion`: Timestamp numérico atualizado a cada publicação no `/admin` (controla o live-sync sem cache).
* `brand`: `name`, `shortName`, `founder`, `role`, `tagline`, `whatsappNumber`, `whatsappFormatted`, `instagram`, `instagramUrl`, `location`, `googleReviewsUrl`, `googleRating`, `googleReviewsCount`.
* `sections`: Textos e imagens das seções `hero`, `proposta`, `portfolio`, `metodologia`, `experiencias` (Formatos & Valores), `sobre`, `reviews` e `contato`.
* `heroSlides`: Fotos da capa principal (Hero) com `src`, `alt`, `focalPoint` e legenda.
* `categories`: Categorias do portfólio (`id`, `label`, `subtitle`, `description`).
* `portfolio`: Galeria de fotos (`id`, `title`, `category`, `categoryLabel`, `location`, `aspect`, `src`, `focalPoint`, `story`, `isAcervoCover`).
* `packages`: Pacotes de investimento (`id`, `name`, `badge`, `featured`, `price`, `priceNote`, `duration`, `photosCount`, `deliveryTime`, `details`, `whatsappMsg`).
* `googleReviews`: Depoimentos reais de clientes.

---

## ⚠️ Regras Cruciais de Layout & Git (Não Quebrar!)

1. **Sincronização Git vs Painel Admin (REGRA DE OURO)**:
   * O cliente publica fotos e textos diretamente na branch `main` pelo `/admin` (alterando `assets/js/data.js` e `assets/images/uploads/`).
   * **SEMPRE** execute `git fetch origin main && git rebase origin/main` antes de editar `data.js` ou fazer `git push`, evitando conflitos `non-fast-forward` ou perda de publicações feitas em produção.
   * No Windows/PowerShell local, caso `git` não esteja no `PATH` da sessão, adicione `C:\Users\carli\AppData\Local\Programs\MinGit\cmd` ao `$env:PATH`.

2. **Integridade das Âncoras e Padding do Hero**:
   * Âncoras oficiais de `index.html`: `#inicio`, `#proposta`, `#portfolio`, `#humanizada`, `#servicos`, `#sobre`, `#avaliacoes`, `#contato`.
   * **NUNCA** altere `id="servicos"` nem `id="humanizada"` / `id="avaliacoes"`.
   * **NUNCA** aplique `padding` global em `section[id]` — mantenha `padding` e `scroll-margin-top` estritamente na classe `.section`, pois `<section id="inicio" class="hero-cinema">` ocupa `100svh` exatos.

3. **Lightbox Responsivo e Centralizado (Prevenção de Quebra Mobile)**:
   * Em `.lightbox-stage-col`, `.lightbox-media`, `.lightbox-filmstrip` e `.lightbox-wrapper`, **sempre mantenha `min-width: 0`**.
   * Na fita de miniaturas (`main.js`), use `strip.scrollTo({ left: targetScroll, behavior: 'smooth' })`. **NUNCA** use `element.scrollIntoView()`.

4. **Badge "Mais Escolhido" & Textos Integrais**:
   * `.popular-badge` permanece em `top: 0; transform: translateY(-50%)` com `padding-top: 30px` no mobile.
   * Nunca use `text-overflow: ellipsis` ou `overflow: hidden` que cortem textos ou legendas do cliente.

---

## ⚡ Economia de Tokens & Gerenciamento de Contexto (Regras Obrigatórias)
> **Diretrizes Permanentes de Engenharia de Contexto para Antigravity & Harness de IA**  
> *Redução comprovada de até 80% no consumo de tokens com máxima precisão técnica e estética.*

### 1. 🛑 Princípio de Agente Único (Sem Enxames Desnecessários)
- **Regra Padrão**: Todo o desenvolvimento, refatoração, estilização e testes deve ser conduzido por um **único agente mestre** direto no chat.
- **Proibido Multi-Agent Sprawl**: Nunca acione `/teamwork` ou convoque múltiplos subagentes concorrentes em paralelo para tarefas normais (orquestrador, 2 revisores, challengers, auditores). Cada subagente duplica o prompt de sistema e o histórico, multiplicando o consumo em 8x a 15x.
- **Subagentes Pontuais**: Invoque um subagente somente para tarefas demoradas e isoladas (ex.: varredura de logs massivos ou pesquisa de documentação pesada), encerrando-o imediatamente após obter a resposta.

### 2. 🔍 Leitura Cirúrgica de Código (Zero Dumps Desnecessários)
- **Proibido ler arquivos inteiros** de centenas ou milhares de linhas sem necessidade.
- Use busca direcionada (`Select-String` / `grep`) para encontrar as linhas exatas antes de abrir o arquivo.
- Em `read_file`, especifique **sempre** `StartLine` e `EndLine` (intervalos de 30 a 60 linhas).
- Cada 1.000 linhas lidas desnecessariamente consomem de 3.000 a 5.000 tokens a cada turno da conversa.

### 3. 💻 Comandos de Terminal Concisos & Filtrados
- **Sempre filtre saídas de terminal**:
  - `git status -sb` em vez de `git status` completo.
  - `git log --oneline -n 5` em vez de `git log`.
  - `git diff --stat` primeiro para avaliar o escopo; inspecione apenas arquivos/linhas pontuais.
  - Testes e scripts com flags silenciosas (ex.: `--silent`, `--reporter=list`).
- Saídas brutas de terminal de 50 KB esgotam até 20% do orçamento de tokens de um ciclo.

### 4. 💾 Commits Atômicos como Pontos de Restauração de Contexto
- **O Git é o compressor de memória definitivo**:
  - A cada funcionalidade ou correção concluída, faça commit local imediato com mensagem semântica (ex.: `git commit -m "feat(galeria): ajuste de lightbox e mascara de telefone"`).
  - Um agente que entra na conversa lê 3 linhas de `git log` e sabe exatamente o estado atual, dispensando releituras de turnos anteriores.

### 5. 🧹 Compactação Periódica de Contexto (`/compact`)
- Ao acumular 20 a 30 interações ou finalizar um marco arquitetural, recomende e execute `/compact`.
- O Antigravity descarta dados brutos intermediários e preserva o resumo estruturado, liberando até 70% da janela de contexto para a próxima tarefa.

### 6. 🎯 Tarefas em Passos Curtos e Objetivos
- Nunca execute mega-prompts combinando dezenas de tarefas desconexas ao mesmo tempo.
- Divida em turnos focados: implementar componente -> testar/validar visualmente -> commitar -> próximo passo.
- Evita alucinações, retrabalho e loops de correção caros.

### 7. 🔇 Comunicação Cirúrgica & Eliminação de Fluff (Anti-Rodeios)
Tokens de saída (output) custam de 3x a 5x mais caro que tokens de entrada e elevam a latência.
- **Zero Conversational Filler**: Eliminar saudações, cortesias e bajulações (*"Com certeza!", "Ótima escolha!", "Certamente posso ajudar com isso!"*).
- **Code & Action First**: Inicie a resposta diretamente pela ação executada, código ou diff. Não repita a pergunta do usuário nem explique sintaxe óbvia sem ser solicitado.
- **Proibido Re-sumarizar Artefatos**: Se um arquivo/artefato foi editado no disco, **nunca** transcreva o conteúdo inteiro no chat. Indique o link do arquivo e cite bullets curtos de decisões críticas.
- **Diffs Cirúrgicos**: Altere apenas as linhas necessárias. Nunca cuspa centenas de linhas para mudar 5.
- **Bullets Concisos**: Explicações devem conter no máximo 1 a 2 frases curtas por tópico.

### 8. 🧠 Model Tiering & Padrão Advisor (Cérebro vs. Músculo)
- **Chat em Modelo Pesado (Opus / Pro / Argon)**: Atue como Advisor — formule a arquitetura em poucas linhas e delegue rotinas volumosas, testes e buscas extensas via `invoke_subagent` com `Model: "flash"` ou `"flash_lite"`.
- **Chat em Modelo Leve (Flash)**: Ao encontrar decisão arquitetural ambígua ou bug complexo, consulte pontualmente 1 subagente `research` com `Model: "pro"` pedindo apenas o plano de ação conciso (200–400 tokens) antes de implementar.

### 9. 📑 Tabela de Impacto na Economia de Tokens

| Prática | Economia Estimada | Quando Aplicar |
| :--- | :---: | :--- |
| **Agente único em vez de enxame (Sem `/teamwork`)** | **-80% a -90%** | Padrão permanente em desenvolvimento e design. |
| **Model Tiering / Advisor (`pro` vs `flash`)** | **-60% a -85% no Custo** | Decisões no modelo forte; código e varreduras no `flash`. |
| **Comunicação Anti-Rodeios (Zero-Fluff)** | **-40% a -60% no Output** | Obrigatório em todas as respostas da IA. |
| **Leitura por intervalo (`StartLine`/`EndLine`)** | **-50% no Input** | Ao ler CSS, JS ou HTML longos. |
| **Filtros de terminal (`git status -sb`, `--oneline`)** | **-30% no Input** | Em todos os comandos de checagem. |
| **Uso de `/compact` após marcos** | **-60% no Contexto** | Ao atingir 20–30 mensagens ou fechar ciclos. |
| **Commits atômicos no Git** | **-40% no Contexto** | A cada feature funcional concluída. |

---

## 🚀 Guia Prático: Replicar para um Novo Cliente em 6 Passos

Quando Yan pedir: *"Esse projeto agora é para o(a) fotógrafo(a) [Nome]"*, siga este checklist completo:

### Passo 1: Dados da Marca & SEO (`assets/js/data.js` + `index.html`)
1. Em `assets/js/data.js`, atualize `brand`, `sections`, `packages` e `googleReviews` do novo cliente (o painel `/admin` já assume automaticamente o nome e a logo definidos em `SITE_DATA.brand`).
2. Em `index.html` (linhas 8–25), atualize `<title>`, `<meta name="description">`, `<meta name="keywords">`, `<meta name="author">`, `<meta property="og:*">` e o `<link rel="preload" as="image">` da primeira foto do Hero.
3. Se o cliente contratar Brandbook personalizado, atualize `brand/index.html`.

### Passo 2: Paleta de Cores & Logos (`assets/css/style.css` + `assets/images/`)
1. Em `assets/css/style.css` (`:root`), ajuste `--bg-primary`, `--bg-surface`, `--color-gold`, `--color-gold-dark`, `--color-blue`, `--color-blue-dark` e `--text-primary`.
2. Substitua `assets/images/logo-light.png`, `assets/images/logo-dark.png` e a foto de perfil da seção Sobre (atualizando o caminho em `SITE_DATA.sections.sobre.image`).

### Passo 3: Acervo Inicial de Fotos
1. Limpe as fotos do cliente anterior em `assets/images/real/` e `assets/images/uploads/`, adicionando as fotos iniciais do novo cliente (ou deixe 1 foto por categoria para ele subir o resto pelo `/admin`).
2. Em `SITE_DATA.categories` e `SITE_DATA.portfolio`, defina as categorias iniciais e marque `isAcervoCover: true` na foto-capa de cada categoria.

### Passo 4: Criar Repositório no GitHub & Deploy na Vercel
1. Crie um repositório vazio no GitHub (ex: `meninodimitri/nome-do-cliente`).
2. Envie o projeto (garantindo que `vercel.json` vá junto para ativar o Zero-Cache):
   ```powershell
   node scripts/push-to-github.js --repo="meninodimitri/nome-do-cliente" --token="SEU_GITHUB_TOKEN" --branch="main"
   ```
3. Na Vercel: **Add New... > Project** → importe o repositório → **Deploy**.

### Passo 5: Conectar o Painel Admin (`/admin`)
Acesse `https://dominio-do-cliente.com.br/admin`, informe o repositório (`meninodimitri/nome-do-cliente`) e o GitHub Personal Access Token (PAT com permissão `repo` / `Contents: Read and write`), marcando **Lembrar neste aparelho**.

### Passo 6: Conectar Domínio Próprio (Hostinger → Vercel)
1. Na Vercel (**Project > Settings > Domains > Add Existing**), adicione `dominiodocliente.com.br` (marcando redirecionamento para `www`) e copie os dois valores exibidos na tela (*DNS Records*).
2. Na Hostinger (**Domínios > DNS / Nameservers**):
   - **Registro `A`**: Nome `@` → Valor `216.198.79.1` (ou o IP exibido na Vercel) → **TTL `300`**.
   - **Registro `CNAME`**: Nome `www` → Destino `xxxx.vercel-dns-017.com` (copiado da Vercel) → **TTL `300`**.
   - Se houver registro **`AAAA`** com nome `@` apontando para estacionamento da Hostinger, exclua-o para não conflitar no SSL.
3. Clique em **Refresh** nos dois domínios na Vercel até aparecer **Valid Configuration** (leva 1 a 5 minutos).
