# Comunidade Sibanki — Melhorias estilo Instagram

Ideias para deixar a Comunidade mais polida, envolvente e com cara de app premium (nível Instagram).

---

## 1. Visual e identidade (quick wins)

- **Cards de post**  
  - Sombra suave e consistente (`box-shadow` em camadas).  
  - Bordas mais arredondadas (ex.: 20px).  
  - Transição suave no hover (sombra + leve scale ou elevação).  

- **Compose (caixa de publicar)**  
  - Estilo “card flutuante”: sombra um pouco maior, bordas bem arredondadas.  
  - Placeholder do textarea mais amigável e alinhado ao tom da comunidade.  

- **Avatar e identidade**  
  - Avatar com borda colorida (ex.: gradiente ou cor do tema).  
  - Nome/apelido em destaque; “há X min” em cinza menor, como no Instagram.  

- **Cores e contraste**  
  - Tags (Dica, Análise, Dúvida etc.) com cores mais vivas mas ainda acessíveis.  
  - Botões de ação (curtir, comentar, compartilhar) com ícones claros e estados de hover/ativo.

---

## 2. “Stories” no topo do feed

- Faixa horizontal no topo da Comunidade (igual Stories do Instagram).  
- Conteúdo sugerido:  
  - **Seu perfil** (sempre primeiro): “Adicionar ao seu story” ou “Sua sequência”.  
  - **Destaques da comunidade**: “Dica do dia”, “Conquista em alta”, “Pergunta da semana”.  
  - **Membros ativos**: avatar + nome, ao clicar abre perfil ou último post.  
- Cada item: círculo com borda colorida (gradiente ou cor tema), avatar ou ícone, nome curto por baixo.  
- Scroll horizontal com scroll suave (CSS ou JS leve).

---

## 3. Feed mais “premium”

- **Pull-to-refresh**  
  - No mobile: arrastar para baixo atualiza o feed com indicador de loading (e opcionalmente mensagem “Atualizando…”).  

- **Skeleton loading**  
  - Enquanto carrega posts: placeholders com animação shimmer (como Instagram/LinkedIn).  

- **Infinite scroll**  
  - Ao chegar perto do fim da lista, carregar mais posts automaticamente (com loading discreto no rodapé).  

- **Microanimações**  
  - Post entrando: fade + leve slide de baixo para cima.  
  - Curtir: ícone de coração preenchendo + pequeno “bump”.  
  - Comentário enviado: breve feedback visual no botão ou na área de input.

---

## 4. Engajamento (curtir, comentar, compartilhar)

- **Curtir**  
  - Duplo toque no card do post = curtir (como Instagram).  
  - Ícone de coração que preenche ao curtir e anima (scale + cor).  
  - Contador de curtidas visível e atualizado em tempo real (se tiver backend em tempo real).  

- **Comentários**  
  - Preview: “Ver todos os X comentários” com os 1–2 últimos em uma linha.  
  - Abrir comentários em bottom sheet (mobile) ou painel lateral (desktop).  
  - Campo de comentário fixo no rodapé do sheet/painel.  

- **Compartilhar**  
  - Botão “Compartilhar” que abre opções: copiar link, compartilhar no app (se tiver deep link), “Enviar para…” (lista de contatos/grupos se existir).

---

## 5. Empty states e onboarding

- **Feed vazio**  
  - Ilustração ou ícone grande + título (“Nenhum post ainda”) + texto (“Seja o primeiro a compartilhar uma dica ou conquista”) + botão “Publicar”.  

- **Primeira vez na Comunidade**  
  - Tela rápida de boas-vindas (1–2 telas): “Aqui você conecta com quem também quer melhorar de vida financeira”.  
  - Sugestão de primeiro post: “Conte uma meta que você alcançou” ou “Compartilhe uma dica que funcionou para você”.

---

## 6. Header e navegação

- **Header fixo**  
  - Barra superior fixa ao rolar (como Instagram): logo/título + busca + notificações.  
  - Fundo com leve blur (glass effect) para manter legibilidade.  

- **Abas (Feed, Notícias, Ranking, etc.)**  
  - Estilo “pill” ou “underline” bem definido para a aba ativa.  
  - Transição suave ao trocar de aba (fade no conteúdo).  

- **Mobile**  
  - Considerar bottom bar só para Comunidade (Feed | Notícias | + Publicar | Ranking | Perfil) para deixar o fluxo mais parecido com app nativo.

---

## 7. Notícias e conteúdo editorial

- **Cards de notícia**  
  - Imagem em destaque (se houver), título, fonte, tempo de leitura.  
  - Layout em grid ou lista que funcione bem em mobile e desktop.  

- **Briefing / destaques**  
  - Manter “AO VIVO” ou “Destaque” com um indicador visual claro (badge, cor, ícone).  
  - Números (índices, altas/baixas) com tipografia forte e cores semânticas (verde/vermelho).

---

## 8. Acessibilidade e performance

- **Foco e teclado**  
  - Navegação por tab entre posts, botões e campos; foco visível (outline) em todos os controles.  

- **Imagens**  
  - Lazy load para imagens do feed e das notícias.  
  - Placeholder (blur ou cor sólida) até carregar.  

- **Reduzir movimento**  
  - Respeitar `prefers-reduced-motion`: desativar ou simplificar animações quando o usuário preferir.

---

## Ordem sugerida de implementação

1. **Fase 1 (impacto rápido)**  
   - Ajustes visuais nos cards de post e no compose.  
   - Empty state do feed.  
   - Microanimações no curtir e no “novo post”.

2. **Fase 2**  
   - Faixa de “Stories” no topo.  
   - Pull-to-refresh e skeleton no feed.  
   - Duplo toque para curtir.

3. **Fase 3**  
   - Infinite scroll.  
   - Comentários em bottom sheet.  
   - Onboarding da Comunidade e pequenos refinamentos de copy.

Se quiser, podemos começar por uma fase específica (por exemplo só Fase 1) e eu te ajudo a quebrar em tarefas no código (HTML/CSS/JS) do seu projeto.
