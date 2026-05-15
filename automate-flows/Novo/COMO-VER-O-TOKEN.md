# 🔍 Como Ver o Token do Firebase

## ⚠️ Problema Atual

Você está vendo:
- ✅ Dialog "Token Firebase" aparece
- ❌ Toast com o JSON NÃO aparece (ou aparece muito rápido)

**Solução:** Vamos modificar o flow para mostrar o token de forma que você consiga copiar.

---

## 🛠️ Solução 1: Aumentar Duração do Toast (RECOMENDADO)

### Passo a Passo:

1. **Abra seu flow** no Automate
2. **Localize o bloco "Toast show"** (bloco 14 nos logs)
3. **Toque no bloco** para editar
4. **Modifique:**
   - **Duration:** Mude de `Short` para `Long`
   - **Message:** Certifique-se que está `{auth_response}` ou o nome da variável do HTTP Request

5. **Salve** e **execute** novamente

**Resultado:** O toast vai ficar na tela por mais tempo (cerca de 3-5 segundos).

---

## 🛠️ Solução 2: Usar Dialog Message ao Invés de Toast (MELHOR)

O Dialog Message fica na tela até você fechar, então é mais fácil de copiar.

### Passo a Passo:

1. **Abra seu flow** no Automate
2. **Localize o bloco "Toast show"** (bloco 14)
3. **DELETE** o bloco Toast show
4. **Adicione um bloco "Dialog message"** no lugar
5. **Configure:**
   - **Title:** `Resposta Firebase`
   - **Message:** `{auth_response}`
   - **Positive button:** `OK`
   - **Cancelable:** ✅ Marque

6. **Conecte** o Dialog message entre o HTTP Request e o Dialog Input
7. **Salve** e **execute**

**Resultado:** Uma janela vai aparecer com o JSON completo, você pode ler com calma e copiar o token.

---

## 🛠️ Solução 3: Usar o Log do Automate (MAIS FÁCIL)

Você não precisa ver o toast! O Automate salva tudo nos logs.

### Passo a Passo:

1. **Execute o flow** normalmente
2. **Cancele** o Dialog Input (não precisa colar nada ainda)
3. **Abra o Automate**
4. **Vá em:** Menu (☰) → **Logs**
5. **Toque na última execução** (a mais recente)
6. **Procure pela linha:** `HTTP request` (bloco 4)
7. **Toque nessa linha** para expandir
8. **Você verá:** A resposta completa do Firebase com o token!

**Exemplo do que você vai ver:**
```
05-15 13:25:32 I 64@4: HTTP request
Response: {"idToken":"eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4ZTU...","email":"controle.cartao2026@gmail.com","refreshToken":"...","expiresIn":"3600"}
```

9. **Copie** o valor do `idToken` (o texto longo)
10. **Execute o flow novamente**
11. **Cole** no Dialog Input

---

## 🎯 Solução 4: Modificar o Dialog Input para Mostrar o Token

Faça o próprio Dialog Input mostrar o token!

### Passo a Passo:

1. **Abra seu flow** no Automate
2. **Localize o bloco "Dialog input"** (bloco 15)
3. **Toque no bloco** para editar
4. **Modifique:**
   - **Title:** `Token Firebase`
   - **Message:** `Resposta: {auth_response}\n\nCole o idToken:`
   - **Default value:** (deixe vazio)

5. **Salve** e **execute**

**Resultado:** O Dialog vai mostrar a resposta completa do Firebase na mensagem, e você pode copiar o token de lá mesmo!

---

## 📱 Como Copiar o Token do JSON

Quando você ver o JSON (seja no toast, dialog ou log), procure por:

```json
{"idToken":"ESTE_É_O_TOKEN_QUE_VOCÊ_PRECISA","email":"..."}
```

**O que copiar:**
- ✅ Copie: `ESTE_É_O_TOKEN_QUE_VOCÊ_PRECISA`
- ❌ NÃO copie: `"idToken":"`
- ❌ NÃO copie: as aspas `"`

**Dica:** O token sempre começa com `eyJ` e é bem longo (centenas de caracteres).

---

## 🧪 Teste Rápido - Qual Solução Usar?

### Use a **Solução 3 (Logs)** se:
- ✅ Você quer a forma mais rápida
- ✅ Não quer modificar o flow
- ✅ Está confortável navegando nos logs

### Use a **Solução 2 (Dialog Message)** se:
- ✅ Quer ver o JSON na tela
- ✅ Quer copiar facilmente
- ✅ Não se importa em modificar o flow

### Use a **Solução 4 (Modificar Dialog)** se:
- ✅ Quer tudo em uma tela só
- ✅ Quer a solução mais elegante
- ✅ Está disposto a fazer uma pequena modificação

---

## 🎬 Passo a Passo Completo - Solução 3 (Recomendada)

Esta é a mais fácil e não requer modificar nada:

1. **Execute o flow** no Automate
2. Quando o Dialog "Token Firebase" aparecer, **cancele** (toque fora ou no X)
3. **Abra o Automate**
4. **Menu (☰)** → **Logs**
5. **Toque na última execução** (topo da lista)
6. **Procure:** `64@4: HTTP request` (ou similar)
7. **Toque** nessa linha
8. **Veja:** A resposta completa com o token
9. **Copie** o valor do `idToken` (toque e segure para selecionar)
10. **Execute o flow novamente**
11. **Cole** o token no Dialog Input
12. **Confirme**

---

## ✅ Checklist

- [ ] Tentei ver o toast (pode estar muito rápido)
- [ ] Verifiquei os logs do Automate
- [ ] Encontrei a resposta do HTTP request nos logs
- [ ] Copiei o valor do idToken (sem aspas)
- [ ] Colei no Dialog Input
- [ ] Flow executou com sucesso

---

## 🆘 Ainda Não Conseguiu?

Se ainda não conseguir ver o token:

1. **Tire um screenshot** do Dialog que aparece
2. **Tire um screenshot** dos logs do Automate
3. **Me envie** para eu ver exatamente o que está acontecendo

**Ou tente isto:**
- Abra o flow no Automate
- Tire um screenshot da estrutura completa
- Veja se o bloco Toast está realmente conectado

---

## 💡 Dica Final

O token está sendo gerado! Os logs mostram que o HTTP request está funcionando. Você só precisa **visualizar** a resposta. A forma mais fácil é pelos **Logs do Automate** (Solução 3).

**Boa sorte!** 🚀