# 🔍 Diagnóstico - Automação de Compras com Automate

## 📋 Resumo do Problema

Você quer automatizar o lançamento de compras quando recebe:
- **Push Itaú:** Compra aprovada de R$ XXX
- **SMS Carrefour:** Compra aprovada de R$ XXX

Mas está enfrentando erro HTTP 500 com mensagem `"request is not defined"` ao fazer POST para `/compra`.

---

## 🚨 Problemas Identificados

### 1️⃣ **Erro Principal: "request is not defined"**
- **Causa:** O Worker não está recebendo o header `Authorization` corretamente
- **Motivo:** O Automate precisa enviar credenciais Basic Auth em TODAS as requisições
- **Solução:** Adicionar header `Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=`
  - Base64 de `admin:Ccsouza2026`

### 2️⃣ **Falta de Validação de Autenticação no Endpoint /compra**
- O endpoint `/compra` **NÃO** verifica `Authorization`
- Isso causa erro quando tenta ler o `req.json()` sem estar autenticado
- **Solução:** Adicionar `verifyBasicAuth()` no começo do `/compra`

### 3️⃣ **Flow do Automate Incompleto**
- Faltam configurações para:
  - ✅ Capturar notificações push do Itaú
  - ✅ Capturar SMS do Carrefour
  - ✅ Extrair valor, descrição, tipo usando regex
  - ✅ Montar JSON correto
  - ✅ Enviar com autenticação Basic Auth

---

## 🛠️ Plano de Ação

### **PASSO 1: Corrigir o Worker (TypeScript)**

Adicionar verificação de autenticação no endpoint `/compra`:

```typescript
// No bloco if (pathname === "/compra" && req.method === "POST"):
if (!verifyBasicAuth(req, env)) {
  return unauthorized(env, req, "autenticacao_obrigatoria");
}
```

**Local:** Antes de `const body = (await req.json())...`

---

### **PASSO 2: Criar Flow para Itaú (Push)**

#### **Trigger:** Notification received
- **App:** Itaú
- **Title:** "Itaú" ou "Itaú Cartões"

#### **Actions:**
1. **Extract with regex** - Extrair valor
   - Pattern: `R\$\s*([\d.,]+)`
   - Salvar em: `%valor_extraido`

2. **Extract with regex** - Extrair estabelecimento
   - Pattern: `em\s+(.+?)\s+no`
   - Salvar em: `%estabelecimento`

3. **Text processing** - Formatar valor para decimal
   - Input: `%valor_extraido`
   - Replace: `.` com vazio, `,` com `.`
   - Salvar em: `%valor_formatado`

4. **HTTP Request - POST**
   - **URL:** `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
   - **Headers:**
     ```
     Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=
     Content-Type: application/json
     ```
   - **Body:**
     ```json
     {
       "descricao": "%estabelecimento",
       "tipo": "Supermercado",
       "valor": %valor_formatado,
       "cartao": "Itau",
       "data": "%date",
       "parcelas": 1,
       "tipoCompra": "avista"
     }
     ```

5. **Show notification**
   - Message: "✅ Compra lançada: %estabelecimento R$ %valor_extraido"

---

### **PASSO 3: Criar Flow para Carrefour (SMS)**

#### **Trigger:** SMS received
- **From:** Carrefour (ou número específico)

#### **Actions:**
1. **Extract with regex** - Extrair valor
   - Pattern: `R\$\s*([\d.,]+)`
   - Salvar em: `%valor_extraido`

2. **Extract with regex** - Extrair local
   - Pattern: `em\s+(.+?)\s+em`
   - Salvar em: `%local`

3. **Text processing** - Formatar valor
   - Input: `%valor_extraido`
   - Replace: `.` com vazio, `,` com `.`
   - Salvar em: `%valor_formatado`

4. **HTTP Request - POST**
   - **URL:** `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
   - **Headers:**
     ```
     Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=
     Content-Type: application/json
     ```
   - **Body:**
     ```json
     {
       "descricao": "%local",
       "tipo": "Compras",
       "valor": %valor_formatado,
       "cartao": "Carrefour",
       "data": "%date",
       "parcelas": 1,
       "tipoCompra": "avista"
     }
     ```

5. **Show notification**
   - Message: "✅ Carrefour: %local - R$ %valor_extraido"

---

## 📝 Base64 de Credenciais

Use este valor já codificado:
```
YWRtaW46Q2Nzb3V6YTIwMjY=
```

**Decodificado:** `admin:Ccsouza2026`

---

## 🧪 Teste Rápido via cURL

```bash
curl -X POST https://controle-cartao-api.brunos2tammy.workers.dev/compra \
  -H "Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=" \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "TESTE AUTOMATE",
    "tipo": "Teste",
    "valor": 123.45,
    "cartao": "Itau",
    "data": "2026-05-16",
    "parcelas": 1,
    "tipoCompra": "avista"
  }'
```

**Esperado:** `{"ok":true,"compra":{...}}`

---

## 🎯 Próximos Passos

1. ✅ **AGORA:** Corrigir o Worker adicionando verificação de autenticação
2. ✅ Deployar o Worker (`npx wrangler deploy`)
3. ✅ Criar flows de Itaú e Carrefour conforme acima
4. ✅ Testar com notificação/SMS de teste
5. ✅ Ajustar regex se necessário

---

## 📞 Tipos de Compra (Sugestões)

Para o campo `tipo` no JSON:
- **Itaú:** "Supermercado", "Restaurante", "Combustível", "Outros"
- **Carrefour:** "Supermercado", "Eletrônicos", "Roupas", "Higiene"

Ajuste conforme suas categorias configuradas no app.

