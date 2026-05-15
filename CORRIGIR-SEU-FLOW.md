# 🔧 Correção do Seu Flow - Passo a Passo

## 📊 Análise do Seu Flow Atual

Seu flow está assim:
```
5. Flow beginning
   ↓
4. HTTP request (Firebase Auth)
   ↓
10. HTTP request (API /compra)  ← PROBLEMA AQUI!
   ↓
11. Log api_response
   ↓
7. Message dialog
```

## 🐛 Problema Identificado

**Falta extrair o token do Firebase!**

O bloco 4 faz a requisição para o Firebase e recebe uma resposta com o token, mas você está pulando direto para o bloco 10 (requisição para API) sem extrair e salvar o token.

---

## ✅ Solução: Adicionar Blocos Entre 4 e 10

Você precisa adicionar 2 blocos novos entre o bloco 4 e o bloco 10:

### Novo Bloco A: Expression (Extrair Token)
### Novo Bloco B: Variable Set Global (Salvar Token)

---

## 📝 Passo a Passo para Corrigir

### Passo 1: Desconectar Blocos 4 e 10

1. Toque no flow para editá-lo
2. Toque na conexão entre o bloco 4 e o bloco 10
3. Toque em **Delete** para remover a conexão

---

### Passo 2: Adicionar Bloco "Expression"

1. Toque no bloco 4 (HTTP request Firebase)
2. Toque no **+** (adicionar bloco)
3. Procure e selecione **Expression**
4. Configure:
   - **Expression:** `api_response.idToken`
   - **Assign to variable:** `token_firebase`
5. Toque em **OK**

**O que isso faz:** Extrai o campo `idToken` da resposta do Firebase e salva na variável `token_firebase`.

---

### Passo 3: Adicionar Bloco "Variable Set" (GLOBAL)

1. Toque no bloco Expression que você acabou de criar
2. Toque no **+** (adicionar bloco)
3. Procure e selecione **Variable set**
4. Configure:
   - **Variable name:** `firebase_token`
   - **Value:** `{token_firebase}`
   - ✅ **MARQUE:** "Global variable" (MUITO IMPORTANTE!)
5. Toque em **OK**

**O que isso faz:** Salva o token em uma variável GLOBAL que pode ser usada por outros blocos e flows.

---

### Passo 4: Conectar ao Bloco 10

1. Toque no bloco Variable Set que você acabou de criar
2. Conecte ao bloco 10 (HTTP request API)

---

### Passo 5: Configurar o Bloco 10 (HTTP Request API)

1. Toque no bloco 10 para editá-lo
2. Vá até a seção **Headers**
3. Adicione ou edite o header:
   - **Name:** `Authorization`
   - **Value:** `Bearer {firebase_token}`
4. Verifique se também tem:
   - **Name:** `Content-Type`
   - **Value:** `application/json`
5. Toque em **OK**

---

## 🎯 Flow Corrigido (Como Deve Ficar)

```
5. Flow beginning
   ↓
4. HTTP request (Firebase Auth)
   Output: api_response
   ↓
   [NOVO] Expression
   Expression: api_response.idToken
   Output: token_firebase
   ↓
   [NOVO] Variable Set (GLOBAL)
   Name: firebase_token
   Value: {token_firebase}
   ✅ Global: YES
   ↓
10. HTTP request (API /compra)
   Header: Authorization: Bearer {firebase_token}
   ↓
11. Log api_response
   ↓
7. Message dialog
```

---

## 🧪 Teste Rápido

Depois de fazer as alterações:

1. **Adicione um Toast de Teste:**
   - Entre o Variable Set e o bloco 10
   - Adicione um bloco **Toast show**
   - Message: `Token: {firebase_token}`
   - Duration: Long

2. **Execute o Flow:**
   - Toque em ▶️ (Start)
   - Deve aparecer um toast com um token longo (começa com "eyJ...")
   - Se aparecer "Token: " (vazio), a variável global não foi criada

3. **Se o Token Aparecer:**
   - Remova o bloco Toast (opcional)
   - O flow deve funcionar agora!

---

## 📋 Checklist de Verificação

Antes de testar, verifique:

- [ ] Bloco Expression criado após o bloco 4
- [ ] Expression usa `api_response.idToken`
- [ ] Bloco Variable Set criado após Expression
- [ ] Variable Set está marcado como **Global** ✅
- [ ] Bloco 10 tem header `Authorization: Bearer {firebase_token}`
- [ ] Bloco 10 tem header `Content-Type: application/json`
- [ ] Todos os blocos estão conectados na ordem correta

---

## 🎨 Diagrama Visual

```
┌─────────────────────────────────┐
│  4. HTTP Request Firebase       │
│  POST identitytoolkit...        │
│  Output: api_response           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  [NOVO] Expression              │
│  api_response.idToken           │
│  → token_firebase               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  [NOVO] Variable Set            │
│  Name: firebase_token           │
│  Value: {token_firebase}        │
│  ✅ Global: YES                 │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  10. HTTP Request API           │
│  POST /compra                   │
│  Header:                        │
│  Authorization:                 │
│  Bearer {firebase_token}        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  11. Log api_response           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  7. Message dialog              │
└─────────────────────────────────┘
```

---

## 🚨 Atenção: Nome da Variável de Saída do Bloco 4

**IMPORTANTE:** Verifique qual é o nome da variável de saída do bloco 4!

1. Toque no bloco 4 (HTTP request Firebase)
2. Role até o final
3. Veja o campo **"Output variable"** ou **"Assign to variable"**
4. Pode ser: `api_response`, `response`, `result`, etc.

**Use esse nome no Expression!**

Se for `response`, use: `response.idToken`
Se for `result`, use: `result.idToken`
Se for `api_response`, use: `api_response.idToken`

---

## 💡 Dica Extra: Adicionar Toast de Debug

Para facilitar o debug, adicione toasts em pontos estratégicos:

**Após o bloco 4:**
```
Toast: Resposta Firebase: {api_response}
```

**Após o Expression:**
```
Toast: Token extraído: {token_firebase}
```

**Após o Variable Set:**
```
Toast: Token global: {firebase_token}
```

**Após o bloco 10:**
```
Toast: Resposta API: {api_response}
```

Assim você vê exatamente onde está o problema!

---

## 📞 Próximos Passos

1. Siga os passos 1-5 acima
2. Adicione o toast de teste
3. Execute o flow
4. Me envie:
   - Screenshot do flow atualizado
   - O que apareceu no toast
   - Os novos logs (se houver erro)

**Boa sorte! Você está quase lá!** 🚀