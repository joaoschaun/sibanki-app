# Como extrair o index.html do celular (versão que funciona)

## No Android

### 1. Preparar o celular
- Ative **Opções do desenvolvedor**: Configurações > Sobre o telefone > toque 7x em "Número da versão"
- Ative **Depuração USB**: Configurações > Opções do desenvolvedor > Depuração USB

### 2. Conectar ao computador
- Conecte o celular via USB
- No celular, aceite "Permitir depuração USB" quando aparecer
- Abra o **Sibanki** no Chrome do celular (a versão que funciona)

### 3. Inspecionar no computador
- No **Chrome do computador**, acesse: `chrome://inspect`
- Em "Dispositivos", encontre o seu celular
- Em "Páginas abertas", procure o Sibanki (virtus-financeiro ou sibanki)
- Clique em **"inspect"**

### 4. Extrair o HTML
- Abra a aba **Application** (Aplicativo)
- No menu lateral: **Storage** > **Cache Storage**
- Clique no cache do site (ex: virtus-financeiro-cd7bd.web.app)
- Procure o arquivo `index.html` ou o HTML principal
- Clique com o botão direito > **Copy response** ou visualize o conteúdo

**OU** (mais simples):
- Abra a aba **Sources** (Fontes)
- No painel esquerdo, expanda o domínio do app
- Encontre `index.html` ou o arquivo principal
- Clique para abrir e **Ctrl+A** (selecionar tudo) > **Ctrl+C** (copiar)
- Cole em um arquivo novo no computador

### 5. Salvar no projeto
- Salve o conteúdo em: `c:\Users\jscha\virtus-financeiro\index-celular-backup.html`
- Avise quando terminar para eu comparar

---

## Alternativa: sem usar o celular

Se o celular tiver o app instalado como PWA, você também pode:
- No Chrome do **computador**, acesse o site
- Abra DevTools (F12) > Application > Clear storage
- **Desmarque** "Cache storage" e "Service workers" (para não limpar)
- Ou: use uma aba anônima e acesse o site
- O site pode carregar uma versão antiga do cache do CDN

Se o app funcionar no computador em alguma situação (ex: aba anônima, outro navegador), podemos inspecionar de lá.
