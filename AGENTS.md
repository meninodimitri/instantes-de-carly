# AGENTS.md — Manual de Bordo & Arquitetura do Produto
> **Template Oficial de Portfólio Fotográfico Profissional com CMS Visual Integrado**  
> Mantido por Yan & Desenvolvido para venda escalável (White-Label) para fotógrafos e estúdios.

---

## 🧭 Visão Geral do Sistema

Este projeto é um produto completo de **Portfólio Editorial + Sistema de Gestão de Conteúdo (CMS)** voltado para fotógrafos profissionais. Ele foi construído com arquitetura estática pura de altíssima performance (Zero Build Step / Vanilla HTML, CSS e JavaScript), hospedado na **Vercel** e sincronizado diretamente com o **GitHub**.

### Componentes Principais:
1. **Site Principal (`index.html`)**:
   - Navegação fixa transparente/blur com indicadores de seção.
   - Hero dinâmico (*Cinema Hero*) com carrossel de fotos autorais em alta definição.
   - Proposta & Filosofia com tipografia editorial elegante.
   - Portfólio categorizado em tempo real com modal arquival (*Lightbox*) responsivo para desktop (1680px) e mobile (100vw).
   - Abordagem & Metodologia em 3 passos com grade horizontal sem overflow.
   - Formatos e Valores com tabela comparativa de pacotes e selos de destaque.
   - Sobre a fotógrafa com citação e links de contato.
   - Avaliações de clientes com carrossel dinâmico e integração com Google Meu Negócio.
   - Formulário de Pré-Agendamento com máscara de telefone brasileira e disparo direto para o WhatsApp da fotógrafa.
   - Rodapé com mapa de navegação, disclaimer e link para o Brandbook.

2. **Visualizador Mobile do Desenvolvedor (`mobile-preview.html`)**:
   - Ferramenta interna para demonstração a clientes e testes de desenvolvimento.
   - Permite visualizar o site em molduras de iPhone, Galaxy e Pixel com botões de salto direto para cada seção.

3. **Painel Administrativo da Fotógrafa (`admin.html`)**:
   - CMS Visual independente que dispensa qualquer conhecimento de programação pelo cliente.
   - **Otimizador DSLR embutido**: Redimensiona fotos pesadas de câmeras profissionais (Canvas 1920px, ~300KB com detecção de orientação EXIF).
   - Gestão de fotos da capa (Hero) com slider de ponto focal vertical/horizontal.
   - Gestão de categorias do portfólio (adicionar, remover, ordenar e categorizar fotos).
   - Tabela de preços e formatos de ensaios com controle de badge de "Mais Escolhido".
   - Editor de textos institucionais de todas as 8 seções do site (`00` a `07`).
   - **Publicação Atômica em 1 Clique**: Salva rascunho localmente no navegador e, ao clicar em "Salvar e Publicar no Site", faz commit direto na API do GitHub usando Personal Access Token (PAT).

4. **Brandbook Oficial (`brand/index.html`)**:
   - Manual de marca interativo com paleta de cores, tipografia, tom de voz e regras de aplicação.

5. **Motor de Deploy Automatizado (`scripts/push-to-github.js`)**:
   - Script em Node.js que sincroniza arquivos diretamente com a API do GitHub via REST (Blobs + Trees + Commits) sem depender do Git CLI instalado no computador do usuário.

---

## 🗂️ Estrutura de Pastas & Arquivos

```text
├── index.html                 # Página inicial pública do portfólio
├── admin.html                 # Painel administrativo visual da fotógrafa
├── mobile-preview.html        # Simulador responsivo para vendas e testes
├── vercel.json                # Configuração de rotas limpas da Vercel (cleanUrls)
├── README.md                  # Documentação pública do repositório
├── AGENTS.md                  # Este arquivo (Manual de contexto da IA)
├── .gitignore                 # Regras de exclusão (.vercel, node_modules, logs)
│
├── assets/
│   ├── css/
│   │   ├── style.css          # Estilos principais do site (Design System editorial)
│   │   └── admin.css          # Estilos do painel administrativo
│   │
│   ├── js/
│   │   ├── data.js            # BANCO DE DADOS LOCAL (Fonte Única da Verdade)
│   │   ├── main.js            # Interatividade do site, filtros, lightbox e hidratação
│   │   └── admin.js           # Engine do painel CMS, otimizador de fotos e GitHub API
│   │
│   └── images/
│       ├── real/              # Fotos reais de alta qualidade dos ensaios
│       ├── carly-perfil.jpg   # Foto da fotógrafa
│       ├── logo-dark.png      # Logo escura
│       ├── logo-light.png     # Logo clara
│       └── logo-original.png  # Logo original
│
├── brand/
│   ├── index.html             # Brandbook do projeto
│   └── referencias/           # Fotos e referências originais de marca
│
└── scripts/
    └── push-to-github.js      # Script de deploy autônomo para o GitHub
```

---

## 🎯 Fonte Única da Verdade: `assets/js/data.js`

Toda a informação editável do site vive no objeto global `SITE_DATA` dentro de `assets/js/data.js`.  
**Nunca declare textos fixos ou dados de clientes direto no HTML ou no JS sem refletir no `data.js`**.

Campos principais de `SITE_DATA`:
* `brand`: Nome, fotógrafo(a), slogan, bio, WhatsApp, Instagram, logo e link de avaliações do Google.
* `sections`: Textos das seções `hero`, `proposta`, `portfolio`, `metodologia`, `experiencias` (Formatos & Valores), `sobre`, `reviews` e `contato`.
* `categories`: Categorias do portfólio (id, nome, subtítulo, ordem).
* `packages`: Pacotes de investimento (nome, badge, duração, fotos entregues, prazo, valor, itens inclusos).
* `photos`: Galeria curatorial de fotografias (título, categoria, orientação, caminho da imagem, ponto focal, legenda).
* `reviews`: Depoimentos de clientes reais.

---

## 🎨 Sistema de Design & Paleta de Cores

As variáveis CSS estão declaradas no início de [assets/css/style.css](file:///assets/css/style.css):

```css
:root {
  --bg-primary: #FFFDF3;       /* Amarelinho Bebê: Fundo principal aconchegante */
  --bg-surface: #FDF6DF;       /* Creme Solar: Superfícies e cards */
  --color-gold: #E7C378;       /* Luz Dourada: Destaques e acentos solares */
  --color-gold-dark: #B58324;  /* Dourado escuro para contraste de texto */
  --color-blue: #3B7293;       /* Azul Iracema: Botões principais e links de ação */
  --color-blue-dark: #2B5772;  /* Azul Iracema escuro para hover */
  --text-primary: #1B2733;     /* Azul Maresia: Tipografia principal */
  --text-secondary: #4A5568;   /* Cinza neutro suave */
  --text-muted: #718096;       /* Cinza legível para metadados */
  --border-editorial: rgba(27, 39, 51, 0.12);
}
```

> **Atenção**: Este projeto aboliu tons terracota e marrons pesados, adotando uma paleta solar e marítima cearense. Ao customizar para um novo cliente, as cores principais devem ser alteradas nas variáveis acima.

---

## ⚠️ Regras Cruciais de Layout (Não Quebrar!)

1. **Integridade das Âncoras do Menu**:
   * O menu superior e o rodapé utilizam âncoras internas no formato `#id` (ex: `#inicio`, `#proposta`, `#portfolio`, `#abordagem`, `#servicos`, `#sobre`, `#depoimentos`, `#contato`).
   * **NUNCA** altere o `id="servicos"` da Seção 04, mesmo que o nome exibido mude de *"Experiências"* para *"Formatos e Valores"*. A âncora técnica deve permanecer idêntica para não quebrar a navegação suave.

2. **Lightbox Responsivo e Centralizado (Prevenção de Quebra Mobile)**:
   * Em `.lightbox-stage-col`, `.lightbox-media`, `.lightbox-filmstrip` e `.lightbox-wrapper`, **sempre mantenha `min-width: 0`**. Se qualquer contêiner flex/grid filho tiver `min-width: auto`, a fita de miniaturas (filmstrip) fará o palco explodir para 900px+ no mobile, empurrando a foto para fora da tela.
   * Na rolagem da miniatura ativa no filmstrip (`main.js`), use `strip.scrollTo({ left: targetScroll, behavior: 'smooth' })`. **NUNCA** use `element.scrollIntoView()` pois ele causa deslocamento horizontal em contêineres ancestrais.

3. **Badge "Mais Escolhido"**:
   * O selo `.popular-badge` do pacote mais escolhido deve ser posicionado na borda superior do card (`top: 0; transform: translateY(-50%)`) com `padding-top: 30px` no mobile para nunca cobrir o subtítulo ou os preços do card.

4. **Proibição de Texto Cortado**:
   * Nunca use `text-overflow: ellipsis` ou `overflow: hidden` que mutilem textos do cliente ou legendas em nenhuma resolução.

---

## 🚀 Guia Prático: Como Customizar para um Novo Cliente em 5 Minutos

Quando Yan disser: *"Esse projeto agora é para o(a) fotógrafo(a) [Nome]"*, siga este roteiro exato:

### Passo 1: Informações de Marca (`assets/js/data.js`)
Atualize o bloco `brand`:
* `brand.name`: Nome do estúdio ou fotógrafo.
* `brand.founder`: Nome do(a) fotógrafo(a).
* `brand.role`: Nicho de atuação (ex: "Fotógrafo de Casamentos e Família").
* `brand.tagline`: Frase de impacto principal.
* `brand.whatsappNumber` e `whatsappFormatted`: Telefone para onde os orçamentos vão.
* `brand.instagram` e `instagramUrl`: Perfil da rede social.
* `brand.location`: Cidade e estado de atuação.

### Passo 2: Cores do Cliente (`assets/css/style.css`)
Substitua as variáveis `--bg-primary`, `--color-gold`, `--color-blue` e `--text-primary` pela paleta do novo cliente (ex: Preto & Dourado, Verde Oliva & Terracota, etc.).

### Passo 3: Limpeza de Fotos Antigas
* Apague as fotos de demonstração de `assets/images/real/` e adicione as fotos iniciais fornecidas pelo novo cliente (ou deixe as de exemplo até que ele suba pelo Painel Admin).
* No `assets/js/data.js`, configure a lista inicial de `photos` e `categories`.

### Passo 4: Criar Repositório no GitHub e Deploy
1. Crie o novo repositório vazio no GitHub do Yan (ex: `meninodimitri/lucas-fotografia`).
2. Rode o script de deploy:
   ```powershell
   node scripts/push-to-github.js --repo="meninodimitri/nome-do-novo-repo" --token="SEU_GITHUB_TOKEN" --branch="main"
   ```
3. Na Vercel, clique em **Add New... > Project**, importe o novo repositório e clique em **Deploy**.

### Passo 5: Conectar o Painel Admin do Novo Cliente
Acesse `https://novo-site.vercel.app/admin`, vá na aba **Publicação & GitHub**, insira o repositório do novo cliente e o token. O novo cliente já pode gerenciar 100% do site sozinho!

