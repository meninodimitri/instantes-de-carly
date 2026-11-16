# Instantes de Carly — Fotografia Autoral & Afetiva

Portfólio online oficial e sistema de gestão editorial (CMS Visual) para fotografia de casais, gestantes, famílias, 15 anos, celebrações intimistas e afeto em Fortaleza, Ceará.

- **Domínio Oficial**: [instantesdecarly.com.br](https://instantesdecarly.com.br)
- **Painel Administrativo**: [instantesdecarly.com.br/admin](https://instantesdecarly.com.br/admin)

---

## 📸 Sobre o Projeto

- **Fotógrafa & Idealizadora**: Carliane Carvalho (Carly)
- **Localização**: Fortaleza, Ceará & Região Metropolitana
- **Abordagem**: Fotografia afetiva e acolhedora inspirada pela sensibilidade da Psicologia, valorizando a luz natural, o ritmo de cada pessoa e momentos espontâneos.

---

## 🌟 Funcionalidades

1. **Portfólio Dinâmico com Vitrine de Capas por Categoria**:
   - No filtro **Acervo Completo**, exibe apenas **1 foto-capa escolhida por categoria** para manter a curadoria limpa; ao clicar na capa, o portfólio filtra automaticamente todas as fotos daquela categoria.
   - Lightbox responsivo em tela cheia (desktop e mobile) com navegação por teclado/toque e fita de miniaturas.
2. **Formatos e Valores Claros**:
   - Tabela de investimentos transparente com selo de pacote mais escolhido e chamada personalizada para o WhatsApp.
3. **Pré-Agendamento Inteligente**:
   - Formulário com máscara brasileira automática e disparo direto para o WhatsApp da fotógrafa.
4. **Painel Administrativo Completo (`/admin`)**:
   - Gestão visual split-screen (Editor + Preview PC/Celular ao vivo) sem mexer em código.
   - Otimização automática de fotos DSLR no navegador (Canvas 1920px, ~300KB, detecção de orientação EXIF).
   - Seletor dedicado de **Capa Principal (Hero)** e **Capa do Acervo Completo** (`★ Capa Acervo`) por categoria.
   - Gestão completa de categorias, pacotes, preços e textos institucionais.
   - **Publicação Atômica em 1 Clique + Propagação Zero-Cache**: Commit direto via GitHub REST API com cabeçalhos `no-store` em `vercel.json`, sincronização instantânea entre abas (`BroadcastChannel`) e revalidação automática de `data.js` sem exigir `Ctrl+F5`.
5. **Área Privada do Cliente (`/galeria`) & Sincronização Nuvem (`/api/*`)**:
   - Fluxo integrado de seleção de provas (Fase 1, com 3 níveis de proteção/marca d'água e anti-print) e entrega final em alta resolução (Fase 2, com **16 capas editoriais estilo Pixieset** e tela de acesso neutra).
   - **Checkout Híbrido de Fotos Extras**: **Pix Direto ao Estúdio (0% de taxa)** como 1ª opção e **Mercado Pago Automatizado (Pix + Cartão)** como 2ª opção, fechamento automático do modal ao aprovar e miniaturas das fotos escolhidas no banner confirmado.
   - **Sincronização Bidirecional & Isolamento por ID**: comentários por foto, seleções e pagamentos sincronizados via `/api/selection`, `/api/checkout`, `/api/payments` e `/api/webhooks/mercadopago` sem `Alt+F5`, evitando herança ao excluir e recriar álbuns com o mesmo nome (`slug`).
   - **Trava Anti-Exclusão + Filtro "Só Escolhidas"**: filtro sincronizado entre `/admin` e `/galeria`, confirmação antes de excluir foto selecionada e **botão direto de avaliação no Google Meu Negócio** na Fase 2.
6. **Brandbook Oficial (`/brand`), Arquitetura White-Label (`AGENTS.md`) & Suíte E2E (`tests/`)**:
   - Manual interativo de marca, guia de replicação escalável e **31 testes automatizados E2E em Playwright**.

---

## 🎨 Paleta de Cores

- **Amarelinho Bebê**: `#FFFDF3` (Fundo acolhedor)
- **Creme Solar**: `#FDF6DF` (Superfícies de destaque e cards)
- **Luz Dourada**: `#E7C378` / `#B58324` (Acentos solares)
- **Azul Iracema**: `#3B7293` (Identidade marítima e botões de ação)
- **Azul Maresia**: `#1B2733` (Tipografia e contraste sofisticado)
