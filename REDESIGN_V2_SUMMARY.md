# 📸 REDESIGN V2 — Resumo Executivo & Manual Técnico de Transição
> **Branch:** `redesign-v2`  
> **Status:** Marcos 1 a 5 concluídos e auditados com 100% de aprovação (Gates 1–4 homologados, M5 implementado e testado).  
> **Data do Snapshot:** Novembro / 2026  
> **Objetivo:** Documentação autocontida para retomada instantânea da Versão 2 sem desperdício de tokens.

---

## 🎯 O que é a Versão 2 (Redesign Inovador)?

A V2 foi construída a partir de uma proposta editorial **"fora da caixinha"** para a fotógrafa e estudante de Psicologia **Carliane Carvalho (Carly)** em Fortaleza-CE.  
O redesign mantém a stack original de **altíssima performance estática (Vanilla HTML, CSS e JavaScript puro — zero build step)**, garantindo compatibilidade total com o painel administrativo (`admin.html`) e o arquivo canônico de dados (`assets/js/data.js`), sem dependência de bundlers pesados.

---

## 🚀 Principais Inovações Implementadas na V2

### 1. Hero Cinema Dinâmico com Scrubber 01–07 (`#inicio`)
- **Carrossel Autoral com 7 Slides Reais**: Representa cada nicho da Carly (*Casais, Gestantes, Famílias, 15 Anos, Retratos, Festas & Casamentos, Pets*).
- **Barra Scrubber Numerada (01 a 07)**: Barra de navegação inferior com preenchimento de progresso em tempo real (`heroTabProgress`), permitindo ao visitante saltar diretamente para qualquer nicho de ensaio.
- **Card Dinâmico de Detalhes da Obra**: Exibe a categoria ativa, a citação poética e a locação cearense correspondente (ex: *Praia de Iracema*, *Ponte dos Ingleses*).
- **Sem Quebras de Layout**: Resolvido o alinhamento da barra rente ao chão da tela (`diff: 0`), mantendo proporções perfeitas sem corte indevido de fotos.

### 2. A Proposta Editorial & Díptico Fine-Art (`#proposta`)
- **Díptico Fotográfico**: Composição clássica de fotolivro com moldura passe-partout e textura analógica tátil.
- **Folga Geométrica de Legendas**: Ajustada para garantir entre 7px e 26px de respiro acima de legendas em todas as larguras móveis, com **0px² de colisão/sobreposição**.
- **Os 4 Pilares de Acolhimento**: Apresentados com numeração romana (`I. Escuta Atenta`, `II. Ritmo Próprio`, `III. Conexão Autêntica`, `IV. Memória Viva`).

### 3. Abordagem Humanizada em 3 Movimentos (`#humanizada`)
- **Metodologia da Psicologia + Fotografia**:
  1. *O Chegar (Acolhimento e descompressão)*
  2. *A Direção Serena (Condução suave sem poses engessadas)*
  3. *Os Gestos Silenciosos (Captura dos instantes espontâneos)*
- **Cards Responsivos**: Diagramação que respira em desktop e vira cartões verticais fluidos no mobile sem overflow horizontal.

### 4. Recurso Exclusivo: Guia da Luz Solar de Fortaleza ("One Live Thing")
- **Seção Interativa Canônica**: Explora os horários solares únicos do litoral cearense:
  - 🌅 *Amanhecer no Espigão (05h30 – 06h45)*: Luz fria e dourada suave, praias vazias e calmaria.
  - ☀️ *Tarde Dourada na Praia de Iracema (16h00 – 17h15)*: O brilho clássico alaranjado da Golden Hour.
  - 🌆 *Crepúsculo na Ponte dos Ingleses (17h15 – 18h00)*: Tons violáceos e reflexos no mar bravio.
- **Conexão Direta com WhatsApp**: Ao clicar em *"Quero um ensaio com esta luz"*, a escolha é salva, exibe um chip removível no formulário de contato e é automaticamente injetada na mensagem enviada para a Carly.

### 5. Galeria Curatorial & Lightbox Blindado (`#portfolio`)
- **Isolamento Estrito `min-width: 0`**: Aplicado em todos os 4 contêineres do Lightbox (`.lightbox-stage-col`, `.lightbox-media`, `.lightbox-filmstrip`, `.lightbox-wrapper`), eliminando o bug histórico que explodia o modal para 900px+ no mobile.
- **Navegação Touch & Teclado**: Suporte nativo a gestos de arrasto (*touch swipe*) no celular, setas do teclado e tecla `Escape` com retorno de foco acessível (WAI-ARIA).
- **Fita de Miniaturas Fluida**: Utiliza `strip.scrollTo()` suave, banindo o uso de `scrollIntoView()` que descolava a tela.

### 6. Formatos e Valores sem Conflito de IDs (`#servicos`)
- **Âncora Técnica Intacta**: Mantém estritamente o `id="servicos"`, preservando todos os links do menu e do rodapé.
- **Selo "Mais Escolhido" com Respiro**: Posicionado no topo do card com padding seguro (>40px), nunca cobrindo títulos, preços ou subtítulos.
- **Fallback Elegante para Pacotes sob Consulta**: Permite pacotes personalizados sem quebrar o layout da tabela.

### 7. Sobre Carly & Prova Social Real (`#sobre` e `#avaliacoes`)
- **Manifesto Noturno Intimista**: Tipografia combinando *Cormorant Garamond* com assinatura suave em *Alex Brush*.
- **Transparência Ética**: Nota formal (`role="note"`) destacando a formação em Psicologia como conduta de acolhimento ético e respeito às pessoas.
- **9 Depoimentos Reais do Google Meu Negócio**: Incorporados em `SITE_DATA.reviews` com notas 5 estrelas, fotos de perfil e respostas atenciosas da fotógrafa.

### 8. Formulário com Máscara de Telefone BR & Ponte com CMS (`#contato`)
- **Máscara Telefônica Brasileira Automática**: Suporta telefones fixos `(XX) XXXX-XXXX` e celulares `(XX) XXXXX-XXXX`, com suporte a copiar/colar (inclusive números com `+55` ou DDI) e backspace limpo.
- **Sanitização de Destino WhatsApp**: Higienização automática (`cleanDestNumber`) para envio seguro via `wa.me/5585920015290`.
- **Merge Defensivo no Painel Admin**: A função `applyIncomingSiteData()` agora realiza fusão profunda (*deep merge*) para mensagens parciais `CMS_LIVE_UPDATE`, permitindo que Carly edite textos avulsos sem sobrescrever ou zerar outras seções.

---

## 🧪 Suíte de Testes Automatizados (Playwright)

A branch `redesign-v2` conta com uma infraestrutura completa de testes E2E localizada em `tests/e2e/`:
- **`runner.mjs`**: 39/39 testes automatizados verdes (Tiers 1 a 4).
- **`test_milestone3_narrative_solar.mjs`**: 29/29 testes aprovados (Zero sobreposição no díptico e guia solar funcional).
- **`test_milestone4_gallery_pricing_reviews.mjs`**: 15/15 testes aprovados (Lightbox, pacotes e reviews).
- **`test_milestone5_form_admin_bridge.mjs`**: 9/9 testes aprovados (Máscara telefônica, validação e bridge CMS).
- **Baterias de Estresse**: Testes em 13 viewports diferentes (de 320px até 1920px), com **0px de overflow horizontal**.

---

## 🗂️ Histórico de Commits na Branch `redesign-v2`

```text
6248f98 (HEAD -> redesign-v2) feat(m5): contact form BR phone mask, solar chip styling, wa.me sanitization and CMS merge bridge
1d206ff feat(m4): curatorial gallery, bulletproof lightbox, commercial formats, about carly and reviews wall
3a060e8 feat(m1-m3): editorial narrative, cinema hero, solar guide, design tokens and E2E test suite
1e9a597 (main, origin/main) ✨ Polimento editorial: respiro de ancoras, tipografia balanceada e acessibilidade
```

---

## 🔄 Como Retomar a V2 no Futuro (Roteiro em 2 Passos)

Caso Yan decida migrar para a Versão 2 ou continuar seu refinamento:

1. **Trocar de Branch no Terminal**:
   ```powershell
   git checkout redesign-v2
   ```
2. **Visualizar Localmente**:
   - Abra `http://localhost:4173/` no navegador.
   - Todo o código, estilos e suíte de testes estarão imediatamente operacionais exatamente onde paramos.

