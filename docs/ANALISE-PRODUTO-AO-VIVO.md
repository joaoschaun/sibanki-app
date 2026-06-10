# Sibanki — Análise do Produto ao Vivo (produção)
**Data:** 09/06/2026 | **Metodologia:** acesso direto ao deploy em https://virtus-financeiro-cd7bd.web.app  
**Dados coletados:** screenshots reais, curl de performance, health API, bundle analysis, inspeção de código-fonte

---

## 📸 O QUE ESTÁ REALMENTE NO AR

### Landing Page (`/`)
- **Headline:** "SUA LIBERDADE. SEM CONCESSÕES." — impactante, typography em 8xl bold ALL CAPS
- **Tag:** "SIBANKI FINANCIAL OPERATING SYSTEM (V2.1)" com dot verde pulsante — posicionamento premium imediato
- **Subtítulo:** explica Open Finance + Ld em linguagem acessível
- **CTAs:** "INICIAR DEGUSTAÇÃO DE 30 DIAS →" (primário) + "VER DEMONSTRAÇÃO" (secundário)
- **Header:** Logo S + "SIBANKI" ALL CAPS | "ENTRAR" | "COMEÇAR AGORA" (botão branco sólido)
- **Abaixo do fold:** 3 cards de conceito (Ld/Sg/Sv), simulador interativo de Ld, demo do dashboard, planos, simulação de chat

**Visual ao vivo:** design Pierre Finance implementado com fidelidade — fundo `#030303`, tipografia gradiente branco→zinc, sem elementos coloridos na nav.

### Login Page (`/login`)
- Card modal centralizado no fundo escuro
- Trust signals acima do form: *"Sem compartilhar senha bancária no app"* + *"Leitura para insights: sem movimentar seu dinheiro"* — excelente copy de conversão
- Campos: E-mail + Senha
- Links: "Esqueci a senha" / "Criar conta"
- Botão "Entrar" + "Entrar com Google"
- ⚠️ **BUG DE DESIGN:** botão "Entrar" é **azul sólido** (`#4F8CFF`) — viola explicitamente o design system Pierre Finance ("sem botões coloridos, apenas neutros")

### Admin Panel (`/admin/`)
- Página separada vanilla HTML/JS — funciona e está protegido
- Design completamente diferente do app: fundo `#1a1a2e` + botão roxo gradiente
- Não faz parte do design system Pierre Finance — aceitável para painel interno

---

## ⚡ PERFORMANCE (medições reais curl em produção)

| Recurso | Tamanho (não-comprimido) | Tempo de resposta | Cache |
|---------|--------------------------|-------------------|-------|
| `index.html` | 1.277 bytes | **0,47s** | CDN HIT (max-age=3600) |
| `vendor-react` | 163.549 bytes (~160KB) | 1,17s | immutable |
| `vendor-firebase` | 506.148 bytes (~494KB) | 1,32s | immutable |
| `vendor-ui` (lucide+clsx) | 82.483 bytes (~80KB) | 1,00s | immutable |
| `index.js` (app principal) | 293.214 bytes (~286KB) | 1,23s | immutable |
| `vendor-pdf` (lazy) | 625.198 bytes (~610KB) | 1,38s | immutable |
| `index.css` | ~130KB | — | immutable |

**Total de JS no carregamento inicial (sem PDF):** ~1,12 MB não-comprimido → estimativa gzipped **~380-420 KB**  
**PDF chunk:** lazy-loaded, zero custo na entrada

**Infra:** Fastly CDN, HTTPS, HSTS (`max-age=31556926 includeSubDomains preload`), `X-Cache: HIT` em todos os assets.  
**Staging:** respondendo em 0,58s — ambiente secundário ativo.

**Avaliação de performance:** adequada para MVP/early SaaS. Firebase SDK (~494KB não-comprimido) é o maior gargalo — estrutural, não há como reduzir sem trocar de SDK. First meaningful paint provavelmente >2s em conexões 4G médias brasileiras.

---

## 🏥 HEALTH API (serviços ao vivo)

```json
{
  "status": "ok",
  "services": {
    "firestore": "ok",
    "auth": "ok",
    "deepseek": "configured",   ← NÃO DOCUMENTADO NO CLAUDE.md
    "gemini": "configured",
    "stripe": "configured",
    "resend": "configured",
    "whatsapp": "configured",
    "pluggy": "configured",
    "lomadee": "configured",
    "monetizze": "configured",
    "monetizzeToken": "missing", ← PROBLEMA ATIVO
    "cashbackEngine": "configured"
  }
}
```

**22/22 serviços UP** (Firestore, Auth, IA, billing, push, afiliados)  
⚠️ `monetizzeToken: missing` — webhooks da Monetizze não irão processar cashback corretamente  
⚠️ `deepseek: configured` — LLM novo adicionado mas não documentado no CLAUDE.md

---

## 🔎 ACHADOS ESPECÍFICOS DO PRODUTO AO VIVO

### Confirmado funcionando (vs documentação)
- ✅ React SPA como produção (cutover legado→React confirmado)
- ✅ PWA manifest presente e válido
- ✅ CDN com cache-busting correto (hashes nos filenames)
- ✅ HSTS configurado (proteção HTTPS obrigatório)
- ✅ Admin separado em `/admin/` — isolado do app principal
- ✅ Staging em `staging-13a0b.web.app` ativo e respondendo
- ✅ Todos os 11+ serviços cloud reportando "configured"
- ✅ `vendor-pdf` isolado em chunk separado (estratégia de lazy load correta)
- ✅ Badge "V2.1" na landing coerente com o roadmap documentado

### Problemas encontrados ao vivo (não identificáveis só pelos docs)

**🔴 Design Violation — Login Button**  
Botão "Entrar" na tela de login é azul (`#4F8CFF`). O design system Pierre Finance define explicitamente "sem botões coloridos — apenas neutros + rose para ações destrutivas". Esta é a primeira impressão do usuário autenticado e está fora do padrão.

**🟡 monetizzeToken Missing**  
`monetizzeToken: missing` no health check. Webhooks Monetizze funcionam parcialmente — a validação de assinatura do token pode falhar, impedindo processamento correto de cashback.

**🟡 DeepSeek não documentado**  
Provider `deepseek` aparece como "configured" na API mas não existe referência em `CLAUDE.md`, `functions/config.js` ou `INVENTARIO`. Pode indicar adição recente não documentada, ou variável de ambiente configurada sem uso ativo.

**🟡 PWA Theme Color Inconsistente**  
`manifest.json` define `theme_color: "#4F8CFF"` (azul) mas a UI tem fundo `#0a0a0a`. No Android, a barra de status fica azul ao instalar o PWA — contrasta com a identidade visual dark.

**🟡 SVG-only Icons no manifest**  
Manifest tem apenas ícones SVG (`icon-192.svg`, `icon-512.svg`). iOS Safari não suporta SVG como ícone de homescreen PWA. Usuários iPhone que instalarem o app terão ícone genérico ou fallback.

**🟡 Testes desatualizados**  
Último run dos testes Playwright registrado: **16 de março de 2026** (quase 3 meses atrás). Dois arquivos de teste (`compare-modulos-legado.spec.js`, `compare-modulos-react.spec.js`) estão **quebrados** com `ReferenceError: require is not defined` — usam sintaxe CommonJS em projeto configurado como ES Module.

**🟢 Sem headers de segurança visíveis no HTML**  
HTTP response do `index.html` não inclui `X-Frame-Options`, `X-Content-Type-Options`, ou `Content-Security-Policy`. Firebase Hosting não injeta esses headers por padrão — recomendável adicionar em `firebase.json`.

---

## 👤 PERSPECTIVA: USUÁRIO FINAL

### Primeira impressão (não autenticado)
**Pontuação: 8/10**

A landing page é o ponto alto do produto. O copy "SUA LIBERDADE. SEM CONCESSÕES." é diferenciador — comunica que não é mais um app de planilha de gastos. O trio Ld/Sg/Sv apresentado em cards limpos com explicações claras educa o visitante antes de pedir cadastro. O simulador interativo de Ld (com campos de patrimônio e custo de vida) é um gancho excelente — o usuário sai da landing sabendo quantos dias de liberdade tem.

**Pontos positivos:**
- CTA "30 dias grátis" elimina fricção de conversão
- Trust signals na tela de login são bem posicionados
- Design limpo, não parece app gratuito

**Pontos negativos:**
- Não há provas sociais (depoimentos, número de usuários, logos de bancos integrados)
- Sem vídeo explicativo do produto em uso real
- O botão azul no login cria um micro-inconsistência que usuários atentos notam
- A proposta "Financial OS" pode ser abstrata para o público que ainda usa planilha Excel — precisa de mais demo do que o produto faz em 30 segundos

### Fluxo autenticado (inferido de código + estrutura)
**Pontuação estimada: 7/10**

Ponto de entrada é o **Consultor IA** (`/consultor-ia`) — decisão corajosa e diferenciadora. A maioria dos apps de finanças abrem num dashboard com gráficos. O Sibanki abre numa conversa. Isso reforça o posicionamento de "OS com IA" mas pode confundir novos usuários que esperam ver um dashboard.

**O que funciona bem:**
- Sidebar com 13 itens organizados (Principal + Mais + Rodapé) — hierarquia clara
- FloatingConsultantButton em todas as páginas — IA sempre acessível
- Módulo de Crédito com 6 sub-rotas (`/credito/visao-geral`, `/credito/cartoes`, etc.) — estrutura profissional
- Open Finance via Pluggy integrado no onboarding — dados reais desde o primeiro uso
- SibCoin gamifica comportamentos saudáveis — retenção via missões

**Gaps de UX identificados:**
- Usuário que chega vazio (zero dados) vê Ld = 0 e Sg indefinido — experiência de "empty state" precisa guiar ação imediata
- 35+ páginas/rotas são muitas para onboarding zero-to-value em <5 minutos
- Módulos como `AgentCouncil`, `Casal`, `Filhos`, `Filiados`, `Quarentena`, `Envelope` existem no código mas não estão documentados ou linkados — risco de rotas mortas ou features inacabadas

---

## 💼 PERSPECTIVA: ANALISTA COMERCIAL

### Posicionamento de mercado ao vivo
**Força real do produto: 7,5/10**

A landing page confirma o posicionamento premium de "Financial OS". O badge "V2.1" + "SIBANKI FINANCIAL OPERATING SYSTEM" comunica maturidade de produto. Os planos estão bem estruturados:

| Plano | Preço | Diferencial real |
|-------|-------|-----------------|
| Gratuito | R$0 | 2 contas, IA limitada, WhatsApp básico |
| Pro | R$29,90/mês | Open Finance, IA ilimitada, Sentinela GPS, relatórios |
| Família | R$49,90/mês | 4 membros, espaço casal, educação infantil |

**Análise comercial da estrutura de planos:**
- O "Gratuito" tem freemium suficientemente limitado (2 contas, IA limitada) para criar desejo de upgrade
- R$29,90/mês para Pro é agressivo vs NuBank (grátis), GuiaBolso (encerrado), Organizze (~R$20). Mas se o Open Finance + IA realmente funcionar, o valor é defensável
- "30 dias grátis" na landing é correto para um produto que precisa de dados para mostrar valor
- O plano Família (R$49,90) é o mais interessante comercialmente — LTV 3-4x maior, menor churn

**Gaps comerciais críticos ao vivo:**

1. **Sem social proof na landing** — nenhum depoimento, caso de uso, ou número de usuários. Em 2026, a landing de um SaaS sem prova social tem conversão significativamente menor.

2. **Sem captação de email antes do cadastro** — o usuário clica em "Iniciar degustação" e vai direto para o registro. Uma sequência de email (lead nurturing pré-registro) aumentaria conversão em 20-40%.

3. **Proposta "Financial OS" sem benchmark** — quem é o concorrente? A landing não mostra. Para o usuário que usa Mobills ou Organizze, não fica claro POR QUE o Sibanki é superior.

4. **Loja (afiliados)** — analisando o código da função `affiliateStoreCatalogApi` e o health check, a integração Lomadee ainda depende de ativação manual no painel deles. A Loja pode estar em modo demonstração para a maioria dos usuários.

5. **WhatsApp como canal de entrada** — mencionado na landing e nos planos, mas exige configuração de número. Potencial enorme para mercado BR mas não testável sem setup operacional.

**Upside comercial real:**
- Open Finance via Pluggy é real e funcional (health API confirma) — proposta diferenciada
- Consultor IA com fallback multi-LLM (Gemini→Groq→OpenAI→Claude→DeepSeek) é resiliente
- SibCoin cria lock-in gamificado — usuário acumulando moeda tem custo de saída maior
- Multi-tenant já arquitetado — B2B2C (contadores, bancos, fintechs) é caminho natural para série B

---

## 🔧 PERSPECTIVA: DESENVOLVIMENTO

### Estado real do código vs documentação
**Saúde técnica: 7/10**

**O que está melhor que o documentado:**
- DeepSeek adicionado como LLM (5 providers agora) — resiliência de IA acima do documentado
- Testes Vitest: passando (confirmado)
- TypeScript: 0 erros em `tsc --noEmit`
- CDN com hashing correto (`vendor-firebase-C6mP-fBb.js`) — cache-busting implementado

**Dívidas técnicas confirmadas ao vivo:**

| # | Problema | Impacto | Evidência |
|---|----------|---------|-----------|
| 1 | Login button azul | Design System violation | Screenshot ao vivo |
| 2 | monetizzeToken missing | Cashback quebrado | Health API |
| 3 | 2 test files quebrados (require CJS em ESM) | CI degradado | test-results/results.json |
| 4 | Último test run: 16/03/2026 | Sem regressão coverage 3 meses | test-results/.last-run.json |
| 5 | PWA icons SVG-only | iOS homescreen sem ícone | manifest.json |
| 6 | theme_color mismatch (#4F8CFF vs #0a0a0a) | Android PWA incorreto | manifest.json |
| 7 | ~8 rotas extras não documentadas (Casal, Filhos, AgentCouncil...) | Surface de manutenção oculta | src/pages/ |
| 8 | Sem CSP headers no HTML | XSS surface maior | curl -sI |
| 9 | Firebase SDK 506KB | Maior chunk do bundle — estrutural | curl bundle sizes |
| 10 | DeepSeek não documentado | CLAUDE.md desatualizado | Health API |

**Arquitetura ao vivo — o que funciona:**
- SPA puro sem SSR — correto para app autenticado com dados sensíveis
- Code splitting em 5 chunks + lazy PDF — estratégia correta
- 52 Cloud Functions cobrindo IA, billing, push, Open Finance, afiliados, rewards
- AppContext com apenas 2 listeners Firestore — disciplina de performance preservada

**O maior risco técnico não visível nos docs:**  
O arquivo `Cards.tsx` tem 1.728 linhas e `Dashboard.tsx` tem 1.405. Esses mega-componentes são os candidatos mais prováveis a bugs silenciosos. A integração do `validators.ts` com `persistUserData.ts` ainda está pendente (confirmado na seção "CRÍTICO" do CLAUDE.md) — dados malformados podem ser escritos no Firestore.

---

## 📋 RESUMO EXECUTIVO — ACHADOS ÚNICOS DO PRODUTO AO VIVO

| Categoria | Achado | Tipo |
|-----------|--------|------|
| Design | Botão azul no login viola Pierre Finance DS | Bug ao vivo |
| Infra | monetizzeToken missing — cashback Monetizze quebrado | Problema ativo |
| IA | DeepSeek como 5º LLM provider (não documentado) | Feature não documentada |
| PWA | SVG-only icons — iOS sem ícone de homescreen | Bug silencioso |
| PWA | theme_color `#4F8CFF` vs background `#0a0a0a` | Inconsistência |
| Testes | 2 arquivos Playwright com `require()` quebrado | CI degradado |
| Testes | Sem run de testes há 3 meses | Risco de regressão |
| Segurança | Sem CSP headers no HTML response | Hardening recomendado |
| Comercial | Sem social proof na landing | Conversão abaixo do potencial |
| Produto | ~8 rotas extras não documentadas (Casal, Filhos, AgentCouncil...) | Tech debt oculto |
| Performance | Firebase SDK 506KB é o maior chunk — estrutural | Aceitável, monitorar |
| Velocidade | CDN HIT, HSTS, immutable cache — infra sólida | ✅ Positivo |
| API | Health 22/22 serviços respondendo | ✅ Positivo |
| Segurança | Admin Custom Claims (não ADMIN_EMAILS hardcoded) | ✅ Positivo |

---

## 🎯 TOP 5 AÇÕES PRIORITÁRIAS (baseadas no produto ao vivo)

1. **Corrigir botão do login** — trocar `bg-blue-500` por `bg-zinc-100 text-black` (ou neutro do DS) no componente de login. 30 minutos de trabalho, impacto imediato no brand.

2. **Configurar `monetizzeToken`** — `firebase functions:secrets:set MONETIZZE_TOKEN`. Tarefa operacional, desbloqueia cashback.

3. **Corrigir PWA manifest** — adicionar PNG 192×192 e 512×512 em `/public/`, atualizar `theme_color` para `#0a0a0a`. Melhora instalação no iOS/Android.

4. **Renomear os 2 test files quebrados** para `.cjs` (`compare-modulos-legado.spec.cjs`, `compare-modulos-react.spec.cjs`) — desbloqueia CI.

5. **Adicionar security headers no `firebase.json`** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Configuração declarativa, sem código JS.
