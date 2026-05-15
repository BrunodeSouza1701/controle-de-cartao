# 🔧 Correção do Flow do Automate - Token Firebase

## 🐛 Problema Identificado

Nos logs do Automate, vemos o erro:
```
U 58@11: {"error":"missing_id_token"}
```

Isso significa que o token Firebase não está sendo enviado no header `Authorization` da requisição para a API.

---

## 🔍 Análise dos Logs

```
05-15 09:11:27.478 I 58@5: Flow beginning
05-15 09:11:27.478 I 58@4: HTTP request      ← Obtém token Firebase
05-15 09:11:27.849 I 58@10: HTTP request     ← Envia para API
05-15 09:11:27.966 U 58@11: {"error":"missing_id_token"}  ← Token não foi enviado!
```

O flow está executando:
1. ✅ Bloco 4: Obtém token do Firebase (sucesso)
2. ✅ Bloco 10: Faz requisição para API (sucesso)
3. ❌ Bloco 11: API retorna erro "missing_id_token"

**Conclusão:** O token está sendo obtido, mas não está sendo incluído no header da requisição.

---

## ✅ Solução: Corrigir o Flow

### Problema 1: Variável Global não está sendo usada

O flow do Firebase (bloco 4) provavelmente está salvando o token em uma variável local ao invés de global.

### Problema 2: Header Authorization não está correto

O bloco 10 (HTTP request para API) não está usando a variável global corretamente.

---

## 📝 Passo a Passo para Corrigir

### Etapa 1: Verificar o Flow "Obter Token Firebase"

1. Abra o flow **"Obter Token Firebase"** (ou similar)
2. Encontre o bloco **HTTP Request** que chama o Firebase
3. Verifique o bloco **Expression** ou **Variable Set** que extrai o `idToken`
4. **IMPORTANTE:** Certifique-se que está usando **Variable Set GLOBAL**

**Como deve estar:**

```
Bloco: Variable Set
├─ Variable name: firebase_token
├─ Value: {resposta_firebase.idToken}  (ou similar)
└─ ✅ MARQUE: "Global variable" (MUITO IMPORTANTE!)
```

Se não estiver marcado como "Global", o token só existe dentro daquele flow e não pode ser usado por outros flows!

---

### Etapa 2: Corrigir o Bloco HTTP Request da API

1. Abra o flow que envia dados para a API
2. Encontre o bloco **HTTP Request** (bloco 10 nos logs)
3. Verifique a seção **Headers**

**Como deve estar:**

```
Headers:
├─ Authorization: Bearer {firebase_token}
└─ Content-Type: application/json
```

**⚠️ ATENÇÃO:** 
- Use `{firebase_token}` (com chaves)
- Não use `{global.firebase_token}` ou `$firebase_token`
- O Automate acessa variáveis globais automaticamente com `{nome_da_variavel}`

---

### Etapa 3: Testar a Variável Global

Antes de testar o flow completo, vamos verificar se a variável global está funcionando:

1. Crie um flow de teste simples:
   ```
   Flow Beginning
   ↓
   Toast Show
   Message: Token: {firebase_token}
   ```

2. Execute o flow de teste
3. Se aparecer "Token: " (vazio), a variável global não está sendo criada
4. Se aparecer "Token: eyJhbGc..." (um token longo), está funcionando!

---

## 🔧 Solução Alternativa: Usar Variável de Ambiente

Se a variável global não estiver funcionando, use esta abordagem:

### Opção A: Salvar Token em Arquivo

**Flow "Obter Token Firebase":**
```
HTTP Request (Firebase)
↓
Expression: resposta.idToken → token
↓
File Write
├─ Path: /storage/emulated/0/Download/firebase_token.txt
└─ Content: {token}
```

**Flow "Enviar para API":**
```
File Read
├─ Path: /storage/emulated/0/Download/firebase_token.txt
└─ Assign to: firebase_token
↓
HTTP Request (API)
└─ Header: Authorization: Bearer {firebase_token}
```

### Opção B: Combinar os Flows

Ao invés de ter 2 flows separados, combine tudo em um único flow:

```
Flow Beginning
↓
HTTP Request (Firebase) → resposta_firebase
↓
Expression: resposta_firebase.idToken → token
↓
[... resto do flow ...]
↓
HTTP Request (API)
└─ Header: Authorization: Bearer {token}
```

---

## 🧪 Teste Completo

### 1. Teste Manual do Token

Execute este comando no terminal para verificar se o token funciona:

```bash
# 1. Obter token
curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "controle.cartao2026@gmail.com",
    "password": "SUA_SENHA",
    "returnSecureToken": true
  }'

# 2. Copiar o idToken da resposta

# 3. Testar a API
curl -X POST "https://controle-cartao-api.brunos2tammy.workers.dev/compra" \
  -H "Authorization: Bearer SEU_ID_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "2026-05-15",
    "valor": 10.00,
    "descricao": "Teste Manual",
    "tipo": "Supermercado",
    "cartao": "Itaú",
    "tipoCompra": "avista",
    "parcelas": 1,
    "parcelaAtual": 1
  }'
```

Se funcionar manualmente, o problema está no Automate.

---

## 📋 Checklist de Verificação

- [ ] Flow "Obter Token Firebase" está rodando
- [ ] Variável `firebase_token` está marcada como **Global**
- [ ] Toast de teste mostra o token (não vazio)
- [ ] Header `Authorization` usa `Bearer {firebase_token}`
- [ ] Header `Content-Type` é `application/json`
- [ ] Token é renovado a cada 50 minutos
- [ ] Teste manual com curl funciona

---

## 🎯 Estrutura Correta do Flow

### Flow 1: Obter Token (deve rodar continuamente)

```
┌─────────────────────┐
│  Flow Beginning     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  HTTP Request       │
│  POST Firebase Auth │
│  Output: resp_auth  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Expression         │
│  resp_auth.idToken  │
│  Output: token      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Variable Set       │
│  Name: firebase_token│
│  Value: {token}     │
│  ✅ Global: YES     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Toast Show         │
│  "Token atualizado" │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Delay 3000s        │
│  (50 minutos)       │
└──────────┬──────────┘
           │
           └──────────┐
                      │
           ┌──────────┘
           │
           ▼
    (volta ao início)
```

### Flow 2: Enviar Compra

```
┌─────────────────────┐
│  Notification/SMS   │
│  Trigger            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  [Extrair dados]    │
│  valor, desc, etc   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  [Diálogos]         │
│  Parcelado?         │
│  Categoria?         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  HTTP Request       │
│  POST /compra       │
│  Headers:           │
│  Authorization:     │
│  Bearer             │
│  {firebase_token}   │ ← USA VARIÁVEL GLOBAL
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Toast Show         │
│  "Compra adicionada"│
└─────────────────────┘
```

---

## 🚨 Erros Comuns

### Erro 1: "missing_id_token"
**Causa:** Token não está no header
**Solução:** Verificar se `Authorization: Bearer {firebase_token}` está correto

### Erro 2: "invalid_or_forbidden"
**Causa:** Token expirado ou inválido
**Solução:** Reiniciar o flow "Obter Token Firebase"

### Erro 3: "error code: 1101"
**Causa:** Problema de rede ou URL incorreta
**Solução:** Verificar URL da API e conexão com internet

### Erro 4: Token vazio no toast
**Causa:** Variável global não está sendo criada
**Solução:** Marcar "Global variable" no Variable Set

---

## 💡 Dica: Debug do Flow

Para ver o que está sendo enviado:

1. Adicione um bloco **Toast Show** antes do HTTP Request:
   ```
   Message: Token: {firebase_token}
   ```

2. Adicione um bloco **Toast Show** depois do HTTP Request:
   ```
   Message: Resposta: {resposta_api}
   ```

3. Execute o flow e veja os toasts

---

## 📞 Próximos Passos

1. Verifique se a variável `firebase_token` é **Global**
2. Teste com o toast para ver se o token aparece
3. Corrija o header `Authorization` se necessário
4. Execute o flow novamente
5. Me envie os novos logs se ainda houver erro

**Quer que eu crie um flow de exemplo completo para você importar?**