# Voz fora do app ("Oi Siba") e Play Store

## O que já existe

- **Dentro do app:** o usuário pode abrir o Consultor (FAB), digitar ou **usar o microfone** para falar algo como "comprei 50 de almoço" e o lançamento é criado.
- **Link com frase:** o app aceita `?voice=` ou `?siba=` na URL. Exemplo:  
  `https://seu-app.web.app/app/?voice=comprei%2050%20de%20almoço`  
  Ao abrir esse link (logado), o consultor abre, o texto é preenchido e enviado automaticamente. O **mesmo agente** do botão FAB processa a frase — ou seja, **qualquer função que o consultor faz** (lançamento rápido, "quanto gastei?", metas, contas, etc.) pode ser acionada pelo Assistente do celular abrindo o app com `?voice=...`.

## Pode o Assistente do celular lançar no nosso app?

**Sim.** O fluxo é:

1. O usuário fala: **"Ok Google, adicionar no Sibanki compra 50 reais gasolina"** (ou "Oi Google, no Sibanki: almoço 45", "quanto gastei no Sibanki", etc.).
2. O **Google Assistant** reconhece o comando e abre o **app Sibanki** (quando estiver na Play Store como TWA ou nativo).
3. O app recebe o **texto falado** e abre a URL do PWA com `?voice=comprei%2050%20reais%20gasolina` (ou a frase que o usuário disse).
4. O app web já trata `?voice=`: abre o consultor e envia a frase. O **mesmo agente** do FAB responde — cria lançamento, responde perguntas, metas, etc.

Ou seja: **qualquer coisa que o consultor (botão FAB) faz pode ser acionada pelo Assistente**, desde que o app Android (TWA) esteja configurado para receber a frase do Assistant e repassar na URL.

---

## Limitações no navegador/PWA

- O app **não pode** escutar o microfone com a aba em segundo plano (política dos navegadores).
- Por isso, "falar de fora" só funciona quando **o Assistente (ou outro app) abre o Sibanki** e envia a frase pronta (por URL ou intent).

---

## Opções para "falar de fora"

### 1. Atalho na tela inicial (agora)

- **Android:** criar um atalho que abre a URL com `?voice=` vazio ou com uma frase fixa. O usuário edita no consultor ou usa o microfone ao abrir.
- Exemplo: atalho "Adicionar no Sibanki" → `https://seu-app.web.app/app/?voice=` → consultor abre e o usuário fala no microfone.

### 2. App Actions (Google Assistant) – para a Play Store

O Assistente abre o app e envia a frase. O app (TWA) precisa:

1. **Declarar um Custom Intent** no Android com um parâmetro de **texto livre** (o que o usuário falou).
2. **Ao receber o intent**, o app Android (ou a Activity do TWA) abrir a URL do PWA com `?voice=` + texto recebido.

Assim o usuário pode dizer, por exemplo:

- "Ok Google, adicionar no Sibanki compra 50 reais gasolina"
- "Ok Google, no Sibanki: almoço 30"
- "Ok Google, no Sibanki quanto gastei esse mês?"

Tudo isso vai para o **mesmo consultor** que já existe no FAB; não é um fluxo separado.

#### Limitação importante (Custom Intents)

- Os **Custom Intents** do App Actions hoje são **apenas en-US** (idioma do dispositivo e do Assistant devem ser inglês). Para **pt-BR** ainda não há suporte oficial aos custom intents; quando o usuário usar em português, pode ser necessário:
  - testar se algum padrão em inglês funciona (ex.: "Ok Google, add in Sibanki 50 gas"); ou
  - usar um **Built-in Intent** (BII) se existir um que se encaixe; ou
  - aguardar suporte a mais idiomas nos custom intents.

#### Implementação técnica (quando tiver o app Android / TWA)

- **shortcuts.xml** (em `res/xml/`): definir uma capability com custom intent que receba um parâmetro `https://schema.org/Text` (ex.: `phrase` ou `text`).
- **Query patterns** (em `res/values/strings.xml`): frases de exemplo para o Assistant reconhecer, por exemplo:
  - "add $phrase"
  - "say $phrase"
  - "adicionar $phrase" (quando/pt-BR for suportado)
- **Fulfillment:** o intent deve abrir uma **Activity** que:
  - lê o extra do intent (a frase),
  - monta a URL base do PWA + `?voice=` + encodeURIComponent(frase),
  - abre o TWA com essa URL (ou, no caso de TWA, usa uma **LauncherActivity customizada** que em `getLaunchingUrl()` lê o intent e acrescenta `?voice=...` à URL padrão).

Exemplo de **custom LauncherActivity** (TWA) para acrescentar `?voice=` ao abrir:

```java
// CustomQueryStringLauncherActivity.java (exemplo para Bubblewrap/TWA)
public class CustomQueryStringLauncherActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = super.getLaunchingUrl();
        String voice = getIntent().getStringExtra("phrase"); // mesmo nome do key no shortcuts.xml
        if (voice == null) voice = getIntent().getStringExtra("text");
        if (voice != null && !voice.isEmpty()) {
            return uri.buildUpon()
                .appendQueryParameter("voice", voice)
                .build();
        }
        return uri;
    }
}
```

No `shortcuts.xml`, o parâmetro do custom intent deve usar o mesmo `android:key` (ex.: `phrase`) para que o Assistant passe o texto nesse extra.

### 3. Segurar o ícone do app (long-press) → Lançamento rápido

**Sim.** Quando tiverem o app na Play Store, dá para o usuário **segurar um pouco o ícone** do Sibanki e aparecer um atalho direto para **Lançamento rápido** (e outros).

- No Android isso são **App Shortcuts** (atalhos no ícone). Podem ser:
  - **Estáticos:** definidos no app (ex.: `shortcuts.xml`) — ex.: "Lançamento rápido", "Ver gastos".
  - **Dinâmicos:** o app pode adicionar/atualizar at runtime (ex.: "Última conta usada").
- Cada atalho dispara um **Intent** que abre o app. No caso do TWA, o intent pode abrir a **mesma Activity** com uma URL específica:
  - **Lançamento rápido:** abrir o PWA com `?voice=` (vazio) ou `?open=consultor` — o app web abre o consultor e o usuário fala ou digita.
  - Outros atalhos: ex. `?open=dash`, `?open=metas`.

Assim o usuário não precisa abrir o app, ir até o FAB e clicar: **segura o ícone → "Lançamento rápido" → app abre já no consultor** (e pode usar o microfone dali).

Implementação (quando tiver o app TWA): declarar os shortcuts no Android (ex.: `res/xml/shortcuts.xml` e referência no `AndroidManifest`) com intents que a LauncherActivity lê e vira query params na URL (ex.: `voice=` vazio para lançamento rápido).

### 4. Nosso comando de voz "Oi Siba" — sem abrir o app?

Você pergunta: **na instalação, podemos pedir permissão ao usuário para nosso comando de voz, e aí ele falar "Oi Siba, adiciona" e ir direto sem abrir o app?**

- **Permissão na instalação/primeira abertura:** sim, podemos pedir permissão de **microfone** (e explicar que é para o consultor por voz dentro do app). Isso já faz sentido para o uso atual (microfone no FAB).
- **"Oi Siba" funcionando com o app fechado (sem abrir o app):** isso seria o celular **sempre ouvindo** a palavra-chave "Oi Siba" e, ao reconhecer, executar a ação (ex.: abrir o app e enviar o que vier depois, ou só processar). Isso é tecnicamente possível no Android com:
  - um **serviço em primeiro plano** (foreground service) que fica escutando;
  - um motor de **wake word** ("Oi Siba") no dispositivo (ex.: bibliotecas como Porcupine);
  - permissão de microfone e aviso claro para o usuário (bateria, privacidade).

Porém:
  - A **Play Store** exige que o uso do microfone seja **claramente declarado**, necessário para a função principal do app e com consentimento explícito. "Sempre ouvindo" é alvo de revisão e políticas mais rígidas.
  - **Bateria e uso de recurso:** escutar o tempo todo consome mais bateria e pode ser limitado pelo sistema em segundo plano.
  - **Comando de voz independente** no sentido de "só nosso app ouvir" = possível em teoria, mas trabalhoso e com risco de restrição; a via **recomendada** para "voz sem abrir o app antes" continua sendo o **Google Assistant** (App Actions): o usuário diz "Ok Google, adicionar no Sibanki 50 reais gasolina" e o Assistant abre o app com a frase — não é "Oi Siba", mas o resultado é o mesmo (voz → lançamento sem abrir manualmente o app).

Resumo:
- **Atalho no ícone (segurar)** → Lançamento rápido: **sim**, com App Shortcuts.
- **Permissão de microfone** → para uso **dentro do app** (consultor): **sim**, pedir na primeira vez.
- **"Oi Siba" sempre ouvindo, app fechado:** possível em teoria (serviço + wake word), mas pesado e sujeito a políticas; na prática, usar **Google Assistant + App Actions** para comando de voz fora do app.

### 5. App nativo (Capacitor / React Native)

- Com app nativo, dá para ter um serviço em primeiro plano que escuta um comando de voz (ex.: "Oi Siba") e abre o app ou envia o texto para o consultor. É mais trabalho e impacto em bateria; só vale se a prioridade for experiência tipo "sempre ouvindo".

---

## Resumo

| Pergunta | Resposta |
|----------|----------|
| O Assistente pode lançar no nosso app? | **Sim** — abrindo o app com a frase em `?voice=`. |
| Só lançamento rápido ou outras funções? | **Todas** as funções do consultor (lançamento, "quanto gastei?", metas, etc.). |
| O que falta no nosso lado? | Nada no PWA; o tratamento de `?voice=` já está pronto. Falta o app Android (TWA) + App Action que receba a fala e abra a URL com `?voice=`. |
| Idioma | Custom intents hoje são en-US; pt-BR pode precisar de teste ou BII até haver suporte. |
| Segurar ícone → Lançamento rápido? | **Sim** — com App Shortcuts no app Android (atalho que abre com `?voice=` ou `?open=consultor`). |
| "Oi Siba" nosso, sem abrir o app? | **Em teoria** sim (serviço + wake word), mas pesado e sujeito a políticas. Na prática: usar **Google Assistant** (App Actions) para voz de fora. |

---

## Próximos passos sugeridos

1. **Deploy das Functions**  
   Rodar `firebase deploy --only functions` para o `chatApi` usar `gemini-2.0-flash` em produção.

2. **Testar o link com frase**  
   Abrir no celular (logado):  
   `https://staging-13a0b.web.app/app/?voice=almoço%2045`  
   e conferir se o consultor abre e envia a frase.

3. **Para a Play Store**  
   Ao criar o app Android (TWA com Bubblewrap ou similar):
   - Implementar a **LauncherActivity customizada** que lê o intent do Assistant e adiciona `?voice=` à URL.
   - Configurar **App Actions** com um **Custom Intent** com parâmetro de texto e query patterns (ex.: "add in Sibanki $phrase").
   - Testar em en-US; quando possível, testar ou adaptar para pt-BR.
