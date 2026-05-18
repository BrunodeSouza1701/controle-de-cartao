# 🔧 Como Criar Variable Set no Automate v1.51.1 (SEM usar ponto)

## ⚠️ O Problema REAL

O Automate v1.51.1 **NÃO PERMITE** usar o caractere `.` (ponto) em **NENHUM LUGAR**:
- ❌ Não funciona no campo "Variable name"
- ❌ Não funciona no campo "Value"
- ❌ Não funciona para acessar propriedades JSON

**ERRO:** ❌ `{auth_response.idToken}` - Não funciona em lugar nenhum!

---

## ✅ A Solução REAL para v1.51.1

Como o Automate v1.51.1 não suporta acesso a campos JSON com ponto, você precisa usar uma abordagem diferente:

### **OPÇÃO 1: Usar Regex para Extrair (Recomendado)**

Use o bloco **Variable set** com **Input arguments** para extrair valores do JSON usando regex.

### **OPÇÃO 2: Pedir ao Usuário (Mais Simples)**

Use **Dialog input** para o usuário colar o token manualmente.

### **OPÇÃO 3: Usar Script (Avançado)**

Se o Automate tiver bloco de script JavaScript, use para parsear o JSON.

---

## 📝 Passo a Passo - OPÇÃO 1 (Regex)

### **PASSO 1: HTTP Request (Obter Token do Firebase)**

1. Adicione o bloco **HTTP request**
2. Configure:
   - **Method:** `POST`
   - **URL:**
     ```
     https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=SUA_API_KEY
     ```
   - **Content type:** `application/json`
   - **Content:**
     ```json
     {
       "email": "controle.cartao2026@gmail.com",
       "password": "SUA_SENHA",
       "returnSecureToken": true
     }
     ```
   - **✅ Assign to variable:** `auth_response`

**O que acontece:** O Firebase retorna um JSON como texto:
```json
{"idToken":"eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...","email":"controle.cartao2026@gmail.com","refreshToken":"...","expiresIn":"3600"}
```

---

### **PASSO 2: Variable Set (Extrair Token com Regex)**

1. Adicione o bloco **Variable set**
2. Configure:
   - **Variable name:** `firebase_token`
   - **Input arguments:**
     - Clique em **Add argument**
     - **Name:** `json_text`
     - **Value:** `{auth_response}`
   - **Value:** Use uma expressão regex (se o Automate suportar)
     - Se tiver campo "Expression" ou "Formula": `json_text.match(/"idToken":"([^"]+)"/)[1]`
     - Se não tiver: Vá para OPÇÃO 2

**Problema:** Se o Automate não suportar regex ou expressões, esta opção não funciona.

---

## 📝 Passo a Passo - OPÇÃO 2 (Dialog Input) ⭐ RECOMENDADO

Esta é a solução mais simples e que **FUNCIONA 100%** no Automate v1.51.1!

### **PASSO 1: HTTP Request (Obter Resposta do Firebase)**

1. Adicione o bloco **HTTP request**
2. Configure:
   - **Method:** `POST`
   - **URL:**
     ```
     https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=SUA_API_KEY
     ```
   - **Content type:** `application/json`
   - **Content:**
     ```json
     {
       "email": "controle.cartao2026@gmail.com",
       "password": "SUA_SENHA",
       "returnSecureToken": true
     }
     ```
   - **✅ Assign to variable:** `auth_response`

---

### **PASSO 2: Toast Show (Mostrar Resposta)**

1. Adicione o bloco **Toast show**
2. Configure:
   - **Message:** `{auth_response}`
   - **Duration:** `Long`

**Para que serve:**
- Mostra o JSON completo na tela
- Você pode ver o token e copiar se necessário

---

### **PASSO 3: Dialog Input (Pedir Token Manualmente)**

1. Adicione o bloco **Dialog input**
2. Configure:
   - **Title:** `Token Firebase`
   - **Message:** `Cole o idToken da resposta:`
   - **Input type:** `Text`
   - **Default value:** (deixe vazio)
   - **Assign to variable:** `firebase_token`

**Como usar:**
1. Execute o flow
2. Veja o toast com o JSON
3. Copie o valor do campo "idToken"
4. Cole no dialog

---

### **PASSO 4: Variable Set (Tornar Global)**

1. Adicione o bloco **Variable set**
2. Configure:
   - **Variable name:** `firebase_token`
   - **Value:** `{firebase_token}`
   - **Scope:** ✅ **Marque "Global"**

---

### **PASSO 5: Toast Show (Confirmar)**

1. Adicione o bloco **Toast show**
2. Configure:
   - **Message:** `Token salvo: {firebase_token}`
   - **Duration:** `Short`

---

## 🎯 Resumo Visual - OPÇÃO 2 (Recomendado)

```
┌──────────────────────────────────────────────────────────┐
│ BLOCO 1: HTTP Request                                    │
│ ─────────────────────────────────────────────────────    │
│ URL: https://identitytoolkit.googleapis.com/...          │
│ Content: { "email": "...", "password": "..." }           │
│ Assign to variable: auth_response                        │
│                                                           │
│ Retorna: {"idToken":"abc123...","email":"..."}           │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ BLOCO 2: Toast Show                                      │
│ ─────────────────────────────────────────────────────    │
│ Message: {auth_response}                                 │
│                                                           │
│ Mostra o JSON completo na tela                           │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ BLOCO 3: Dialog Input                                    │
│ ─────────────────────────────────────────────────────    │
│ Title: Token Firebase                                    │
│ Message: Cole o idToken da resposta:                     │
│ Assign to variable: firebase_token                       │
│                                                           │
│ Usuário cola: eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...         │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ BLOCO 4: Variable Set (Global)                           │
│ ─────────────────────────────────────────────────────    │
│ Variable name: firebase_token                            │
│ Value: {firebase_token}                                  │
│ Scope: ✅ Global                                         │
│                                                           │
│ Resultado: Variável disponível em todos os flows         │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ BLOCO 5: Toast Show (Confirmar)                          │
│ ─────────────────────────────────────────────────────    │
│ Message: Token salvo: {firebase_token}                   │
│                                                           │
│ Mostra: Token salvo: eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...  │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 Regras Importantes para v1.51.1

### ❌ NÃO FUNCIONA no Automate v1.51.1:
- **Ponto (.) em qualquer lugar:** `{variavel.campo}` ❌
- **Acesso a propriedades JSON:** Não suportado nativamente
- **Expressões complexas:** Limitadas ou inexistentes

### ✅ O QUE FUNCIONA:
- **Variáveis simples:** `{variavel}` ✅
- **Dialog Input:** Para entrada manual ✅
- **Toast Show:** Para mostrar valores ✅
- **Variable Set:** Para copiar valores entre variáveis ✅

---

## 🎯 Convenções de Nomenclatura

Use nomes simples SEM pontos:

| ❌ Não Use | ✅ Use Isto |
|-----------|------------|
| `auth.response` | `auth_response` |
| `user.name` | `user_name` ou `userName` |
| `api.token.id` | `api_token_id` ou `apiTokenId` |
| `response.data.value` | `response_data_value` |

---

## 🧪 Como Testar

### Teste 1: Verificar se o token foi salvo

1. Execute o flow
2. Veja o primeiro toast com o JSON completo
3. Copie o valor do campo "idToken" (sem as aspas)
4. Cole no dialog
5. Veja o segundo toast confirmando

### Teste 2: Verificar se é global

1. Crie um novo flow
2. Adicione um bloco **Toast show**
3. Configure: `Message: {firebase_token}`
4. Execute
5. **Esperado:** Deve mostrar o token salvo anteriormente

---

## 🆘 Problemas Comuns

### Problema 1: "Não consigo acessar campos do JSON"

**Causa:** O Automate v1.51.1 não suporta acesso com ponto

**Solução:**
- Use a OPÇÃO 2 (Dialog Input)
- Ou procure por um bloco "JSON Parse" ou "Extract" se existir
- Ou atualize para uma versão mais recente do Automate

### Problema 2: "O toast mostra o JSON mas não consigo extrair"

**Causa:** Limitação da versão 1.51.1

**Solução:**
- Copie manualmente o valor que precisa
- Cole no Dialog Input
- Ou use um app externo para parsear o JSON

### Problema 3: "Variável não funciona em outro flow"

**Causa:** Não foi marcada como Global

**Solução:**
1. Volte ao bloco Variable Set
2. Marque a opção **Global**
3. Execute o flow novamente

---

## 📚 Referência Rápida

### Campos do Variable Set (v1.51.1):

```
┌─────────────────────────────────────────┐
│ Variable Set                            │
├─────────────────────────────────────────┤
│ Variable name: [nome_sem_ponto]         │ ← SEM ponto
│ Value: [{variavel}]                     │ ← SEM ponto também!
│ Scope: [ ] Local  [✓] Global            │ ← Marque Global
└─────────────────────────────────────────┘
```

### O que você PODE fazer:

```
{variavel}           → Valor completo da variável ✅
{outra_variavel}     → Outra variável ✅
Texto fixo           → Texto literal ✅
```

### O que você NÃO PODE fazer:

```
{variavel.campo}              → ❌ Não funciona
{variavel.campo.subcampo}     → ❌ Não funciona
{variavel[0]}                 → ❌ Não funciona

---

## ✅ Checklist Final

Antes de executar seu flow, verifique:

- [ ] Nomes de variáveis **SEM ponto** (use `_` ou camelCase)
- [ ] Campo "Value" **COM ponto** para acessar propriedades
- [ ] Variável marcada como **Global** se for usar em outros flows
- [ ] Toast de teste adicionado para verificar o valor
- [ ] HTTP Request com "Assign to variable" configurado

---

## 🎉 Pronto!

Agora você sabe como usar o Variable Set corretamente no Automate v1.51.1!

**Lembre-se:**
- **Nome da variável:** SEM ponto
- **Acessar propriedade:** COM ponto
- **Tornar global:** Marque a opção

**Boa sorte com seus flows!** 🚀

---

## 📱 OPÇÃO 3: Flow Automático com Delay (Alternativa)

Se você não quer ficar colando o token manualmente toda hora, use esta abordagem:

### Estrutura:

```
Flow beginning
↓
HTTP Request (Firebase) → Salva em auth_response
↓
Toast Show → Mostra: {auth_response}
↓
Delay 5 segundos → Tempo para você copiar o token
↓
Dialog Input → Você cola o token
↓
Variable Set (Global) → Salva como firebase_token
↓
Toast Show → Confirma: Token salvo!
↓
Delay 3000 segundos (50 min)
↓
(Volta ao início)
```

**Vantagem:** Atualiza o token automaticamente a cada 50 minutos, você só precisa colar quando o dialog aparecer.

---

## 📱 OPÇÃO 4: Usar Outro App (Workaround)

Se você tem o app **Tasker** ou **MacroDroid**, eles têm melhor suporte a JSON:

1. Use o Automate para fazer o HTTP Request
2. Passe a resposta para o Tasker via Intent
3. O Tasker extrai o campo com JavaScript
4. Retorna o token para o Automate

**Complexidade:** Alta, mas funciona 100%

---

## ✅ Checklist Final - OPÇÃO 2 (Recomendada)

Antes de executar seu flow, verifique:

- [ ] HTTP Request configurado corretamente
- [ ] Toast Show adicionado para ver o JSON
- [ ] Dialog Input configurado para receber o token
- [ ] Variable Set com scope **Global** marcado
- [ ] Toast de confirmação adicionado
- [ ] Testado pelo menos uma vez

---

## 🎉 Conclusão

### Para o Automate v1.51.1:

**❌ NÃO FUNCIONA:**
- Acesso a campos JSON com ponto: `{variavel.campo}`
- Expressões complexas
- Parse automático de JSON

**✅ FUNCIONA:**
- Variáveis simples: `{variavel}`
- Dialog Input para entrada manual
- Toast Show para visualizar dados
- Variable Set para copiar valores

### Recomendação:

Use a **OPÇÃO 2** (Dialog Input) porque:
- ✅ Simples de configurar
- ✅ Funciona 100% na v1.51.1
- ✅ Você confirma os dados
- ✅ Não depende de recursos avançados

### Alternativa:

Se possível, **atualize o Automate** para uma versão mais recente que suporte:
- Acesso a campos JSON
- Blocos Expression
- Parse automático

**Boa sorte com seus flows!** 🚀

---

## 📞 Precisa de Mais Ajuda?

Se ainda tiver dúvidas:

1. **Verifique a versão:** Confirme que é realmente v1.51.1
2. **Liste os blocos:** Veja quais blocos estão disponíveis
3. **Teste simples:** Crie um flow só com Toast para testar variáveis
4. **Considere atualizar:** Versões mais novas têm mais recursos

**Estou aqui para ajudar!** 💪