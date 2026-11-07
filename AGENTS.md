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

4. **Visualizador Mobile (`mobile-preview.html`)**, **Brandbook (`brand/index.html`)** e **Deploy Automatizado (`scripts/push-to-github.js`)**.

---

## 🗂️ Estrutura de Pastas & Arquivos

```text
├── index.html                   # Página inicial pública do portfólio
├── admin.html                   # Painel administrativo visual (CMS)
├── mobile-preview.html          # Simulador responsivo em molduras reais
├── vercel.json                  # Clean URLs + Headers Zero-Cache para data.js
├── README.md                    # Documentação pública do repositório
├── AGENTS.md                    # Manual de arquitetura e replicação White-Label (auto-carregado)
├── CONTEXT_ECONOMY_GUIDE.md     # Guia de economia de tokens e execução enxuta
│
├── assets/
│   ├── css/
│   │   ├── style.css            # Design System editorial e responsividade
│   │   └── admin.css            # Estilos do painel administrativo
│   ├── js/
│   │   ├── data.js              # BANCO DE DADOS LOCAL (Fonte Única da Verdade)
│   │   ├── main.js              # Hidratação, vitrine de capas, filtros, lightbox e live-sync
│   │   └── admin.js             # Engine do CMS, otimizador DSLR, seletor de capas e GitHub API
│   └── images/
│       ├── real/                # Fotos iniciais curadas do portfólio
│       ├── uploads/             # Fotos enviadas pelo cliente via Painel Admin
│       ├── carly-perfil.jpg     # Foto de perfil do(a) fotógrafo(a)
│       ├── logo-dark.png        # Logo escura (header após scroll)
│       └── logo-light.png       # Logo clara (hero e admin)
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

## ⚡ Economia de Tokens & Estilo de Execução da IA

Regras operacionais obrigatórias (detalhadas em `CONTEXT_ECONOMY_GUIDE.md`):
* **Zero-Fluff (Respostas Diretas)**: Sem introduções vazias, elogios ou recapitulações longas. Vá direto à resposta/diff em bullets curtos (1–2 frases). Nunca transcreva arquivos inteiros no chat.
* **Single-Agent por Padrão**: Nunca acione `/teamwork` ou múltiplos subagentes em paralelo para tarefas normais.
* **Padrão Advisor sob Demanda**: Só invoque 1 subagente pontual (`Model: 'pro'`) para decisões críticas de arquitetura ou bugs complexos; use `flash`/`flash_lite` para varreduras mecânicas.
* **Leitura e Terminal Cirúrgicos**: Sempre passe `StartLine`/`EndLine` no `read_file` e filtre saídas longas de terminal (`git status -sb`, `--oneline`).

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
