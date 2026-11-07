# ⚡ Guia Prático de Economia de Tokens & Gerenciamento de Contexto
> **Manual de Engenharia de Contexto para Antigravity & Harness de Agentes Autônomos**  
> *Aplique estas diretrizes em qualquer projeto para reduzir o consumo de tokens em até 80% sem perder qualidade.*

---

## 🛑 1. O Princípio de Agente Único (Evite Enxames Desnecessários)

### O Problema do Multi-Agent Sprawl:
Equipes autônomas completas (`/teamwork` com 5 a 10 subagentes concorrentes — orquestrador, explorador, worker, 2 revisores, 2 challengers, auditor, sentinel) são projetadas para bases de código gigantescas e auditorias corporativas.  
**Em projetos pontuais ou equipes ágeis, isso multiplica o consumo de tokens por 8x a 15x**, pois:
- Cada subagente carrega cópias completas do system prompt e histórico;
- As mensagens de checkpoint e handoff entre subagentes consomem milhares de tokens a cada poucos minutos;
- Pequenos loops de verificação geram dezenas de chamadas redundantes.

### A Boa Prática:
- **Padrão:** Conduza o desenvolvimento com um **único agente mestre** direto no chat.
- **Subagentes Pontuais:** Invoque um subagente apenas para tarefas isoladas e demoradas (ex.: pesquisar uma documentação extensa ou varrer um log sem poluir a conversa principal), encerrando-o logo após a resposta.

---

## 🔍 2. Leitura Cirúrgica de Código (Zero Dumps Desnecessários)

- **Nunca leia arquivos inteiros de 3.000 linhas de uma vez.**
- Use **busca direcionada** (`grep` ou `Select-String`) para localizar as linhas exatas de interesse.
- Ao usar ferramentas de leitura de arquivo, utilize sempre **intervalos de linha** (`StartLine` e `EndLine`, ex.: linhas 170 a 220).
- Cada 1.000 linhas de código lidas desnecessariamente consomem de 3.000 a 5.000 tokens a cada turno da conversa.

---

## 💻 3. Comandos de Terminal Concisos & Filtrados

- **Sempre filtre saídas de terminal**:
  - Em vez de `git log`, use `git log --oneline -n 5`.
  - Em vez de `git diff`, use `git diff --stat` primeiro para ver o impacto geral, e depois inspecione apenas os blocos relevantes.
  - Ao rodar testes ou build, use flags que silenciem saídas verbosas (ex.: `--silent`, `--reporter=list`).
- Saídas gigantescas de terminal de 50 KB podem esgotar 20% do orçamento de tokens de uma rodada inteira.

---

## 💾 4. Commits Atômicos como Pontos de Restauração de Contexto

- **O Git é o melhor compressor de memória**:
  - Ao concluir uma melhoria, faça um commit local com mensagem clara (ex.: `git commit -m "feat: mascara de telefone e ajuste de lightbox"`).
  - Um agente que entra na conversa precisa ler apenas 3 linhas de `git log` para saber exatamente o que já foi feito, economizando ter que re-ler todo o histórico das etapas anteriores.

---

## 🧹 5. Compactação Periódica de Contexto (`/compact`)

- Conversas longas com mais de 30 mensagens acumulam ruído e logs antigos.
- Use o comando nativo **`/compact`** no chat ao fechar um ciclo importante.
- O Antigravity gera um resumo estruturado e descarta os dados brutos antigos, liberando 70% da janela de contexto para a próxima tarefa.

---

## 🎯 6. Divisão de Tarefas em Passos Curtos e Objetivos

- **Evite prompts gigantescos do tipo:** *"Refaça o site todo, teste todas as 15 seções, crie 40 testes, altere as 8 páginas e revise a marca ao mesmo tempo."*
- **Prefira execuções faseadas:**
  - *Turno 1:* "Ajuste o formulário de contato e teste o envio para o WhatsApp."
  - *Turno 2:* "Agora ajuste o espaçamento da galeria de fotos."
- Isso gera ciclos rápidos de feedback, menor chance de alucinação e redução drástica no retrabalho.

---

## 📑 7. Checklist Rápido de Economia de Token

| Prática | Economia Estimada | Quando Aplicar |
| :--- | :---: | :--- |
| **Agente único em vez de enxame de 8** | **-80% a -90%** | Em quase todas as tarefas de desenvolvimento e design. |
| **Leitura por intervalo (`StartLine`/`EndLine`)** | **-50%** | Ao inspecionar arquivos CSS ou JS longos. |
| **Pipes de terminal (`Select-Object -First 20`)** | **-30%** | Em logs de build, testes e status do Git. |
| **Uso de `/compact` após marcos** | **-60%** | Quando a conversa passar de 20–30 interações. |
| **Commits atômicos no Git** | **-40%** | A cada feature funcional concluída. |
