# Regras Firebase – Firestore e Storage

Resumo do que está configurado e como atualizar.

---

## 1. Firestore (`firestore.rules`) – já existente

| Coleção | Leitura | Escrita | Observação |
|--------|---------|---------|------------|
| `users/{userId}` | Só o dono | Só o dono | Dados do usuário (lançamentos, commProfile, avatarURL, etc.) |
| `users/{userId}/aiFeedback/{docId}` | Só o dono | Só o dono | Feedback do consultor IA (útil/não útil) para treino futuro |
| `couples/{coupleId}` | Autenticado | Autenticado | Casais |
| `invites/{inviteId}` | Autenticado | Autenticado | Convites |
| `community/{postId}` | Autenticado | Autenticado; delete só se for dono do post | Feed da comunidade |
| `rateLimits/{userId}` | Só o dono | Ninguém (só backend) | Limites |
| `telegramCodes/{codeId}` | Autenticado | Criar/deletar autenticado | Códigos Telegram |
| `newsInteractions/{articleId}` | Autenticado | Autenticado | Curtidas/comentários em notícias |
| `community_reports/{reportId}` | Ninguém | Só create (autenticado) | Denúncias |
| `community_ranking/{docId}` | Autenticado | Ninguém | Ranking |
| Qualquer outro path | Negado | Negado | Bloqueio explícito |

---

## 2. Storage (`storage.rules`) – novo (foto de perfil)

- **Caminho:** `avatars/{fileName}`
- **Leitura:** qualquer usuário **autenticado** (para exibir fotos no app e na comunidade).
- **Escrita:** só se o nome do arquivo começar com o `uid` do usuário + `_` (ex.: `abc123_1710123456789.jpg`), ou seja, cada um só grava o próprio avatar.
- **Resto do bucket:** leitura e escrita **negadas**.

Assim a alteração da foto de perfil fica coberta pelas regras sem abrir o Storage todo.

---

## 3. Como aplicar as regras

No projeto (com Firebase CLI logado):

```bash
# Só Firestore
firebase deploy --only firestore

# Só Storage
firebase deploy --only storage

# Firestore + Storage
firebase deploy --only firestore,storage
```

O `firebase.json` já aponta para `firestore.rules` e `storage.rules`.

---

## 4. Habilitar Storage no projeto

Se o Storage ainda não foi ativado:

1. [Firebase Console](https://console.firebase.google.com) → projeto **virtus-financeiro-cd7bd**
2. Menu **Storage** → **Começar** e concluir o fluxo (modo de produção já usa as regras deste doc).

Depois disso, as regras do `storage.rules` passam a valer e a funcionalidade de foto de perfil fica atendida sem problemas de permissão.
