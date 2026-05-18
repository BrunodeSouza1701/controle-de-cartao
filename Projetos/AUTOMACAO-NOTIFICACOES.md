# 🤖 Automação de Notificações de Cartão

## 📱 Objetivo

Capturar automaticamente notificações de compras (push do Itaú e SMS do Carrefour) e adicionar ao app com confirmação de parcelas.

## ✅ Soluções Possíveis

### Opção 1: Tasker + AutoNotification (Android) - **RECOMENDADO**

**Vantagens:**
- ✅ Funciona offline
- ✅ Captura push notifications e SMS
- ✅ Pode mostrar diálogos de confirmação
- ✅ Integração direta com o app via API
- ✅ Não precisa de servidor adicional

**Como Funciona:**

1. **Tasker** detecta notificação do Itaú ou SMS do Carrefour
2. Extrai informações (valor, estabelecimento, data)
3. Mostra diálogo: "Compra parcelada? (Sim/Não)"
4. Se SIM: "Quantas parcelas?"
5. Envia dados para a API do app

**Custo:** ~R$ 15 (Tasker) + R$ 10 (AutoNotification) - compra única

---

### Opção 2: IFTTT + Webhooks (Mais Simples)

**Vantagens:**
- ✅ Interface visual simples
- ✅ Sem programação complexa
- ✅ Funciona com SMS e notificações

**Limitações:**
- ⚠️ Não tem diálogo interativo (precisa configurar regras)
- ⚠️ Versão gratuita limitada

---

### Opção 3: App Android Personalizado

**Vantagens:**
- ✅ Controle total
- ✅ Interface customizada
- ✅ Diálogos interativos

**Desvantagens:**
- ❌ Requer desenvolvimento Android
- ❌ Mais tempo de implementação

---

## 🎯 Implementação Recomendada: Tasker

### Passo 1: Instalar Apps

```
1. Tasker (Play Store - R$ 15)
2. AutoNotification (Play Store - R$ 10)
```

### Passo 2: Criar Profile para Itaú (Push)

**Profile: "Compra Itaú"**
- Trigger: AutoNotification Intercept
- App: Itaú (com.itau)
- Texto contém: "compra" ou "débito"

**Task: "Processar Compra Itaú"**

```
1. Variable Set: %Notificacao = %antext (texto da notificação)

2. Variable Search Replace:
   - Variável: %Notificacao
   - Buscar: R\$ ([\d.,]+)
   - Armazenar em: %Valor

3. Variable Search Replace:
   - Variável: %Notificacao
   - Buscar: em (.+?) no
   - Armazenar em: %Estabelecimento

4. Input Dialog:
   - Título: "Compra Parcelada?"
   - Botões: Sim,Não
   - Armazenar em: %Parcelado

5. If %Parcelado ~ Sim
   
   6. Input Dialog:
      - Título: "Quantas parcelas?"
      - Tipo: Número
      - Armazenar em: %Parcelas
   
   7. Variable Set: %TipoCompra = parcelado
   
8. Else
   
   9. Variable Set: %TipoCompra = avista
   10. Variable Set: %Parcelas = 1

11. End If

12. HTTP Request:
    - Método: PUT
    - URL: https://SEU-WORKER.workers.dev/state
    - Headers:
      Authorization: Bearer %IdToken
      Content-Type: application/json
    - Body:
      {
        "compras": [
          {
            "id": %TIMEMS,
            "data": "%DATE",
            "valor": %Valor,
            "descricao": "%Estabelecimento",
            "tipo": "Itaú",
            "cartao": "Itaú",
            "tipoCompra": "%TipoCompra",
            "parcelas": %Parcelas,
            "parcelaAtual": 1
          }
        ]
      }

13. Flash: "Compra adicionada: R$ %Valor - %Estabelecimento"
```

### Passo 3: Criar Profile para Carrefour (SMS)

**Profile: "SMS Carrefour"**
- Trigger: Received Text
- Sender: Carrefour (número do banco)
- Content: *compra* ou *transacao*

**Task: "Processar SMS Carrefour"**

```
(Similar ao Itaú, mas extrai dados do SMS)

1. Variable Set: %SMS = %SMSRB (corpo do SMS)

2. Variable Search Replace:
   - Variável: %SMS
   - Buscar: R\$ ([\d.,]+)
   - Armazenar em: %Valor

3. Variable Search Replace:
   - Variável: %SMS
   - Buscar: em (.+?)\.
   - Armazenar em: %Estabelecimento

4-13. (Mesmo processo do Itaú)
```

---

## 🔐 Autenticação Firebase no Tasker

Para obter o `IdToken` do Firebase:

**Task: "Obter Firebase Token"**

```
1. HTTP Request:
   - URL: https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=SUA_API_KEY
   - Método: POST
   - Body:
     {
       "email": "controle.cartao2026@gmail.com",
       "password": "SUA_SENHA",
       "returnSecureToken": true
     }

2. Variable Set: %IdToken = %http_data.idToken (extrair do JSON)

3. Variable Set Global: %FIREBASE_TOKEN = %IdToken
```

**Executar essa task:**
- A cada 50 minutos (token expira em 1h)
- Ou antes de cada requisição

---

## 📊 Fluxo Completo

```
┌─────────────────────┐
│  Notificação Itaú   │
│  ou SMS Carrefour   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Tasker Detecta     │
│  Extrai Dados       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Diálogo:           │
│  "Parcelado?"       │
│  [Sim] [Não]        │
└──────────┬──────────┘
           │
           ├─── Sim ──▶ ┌─────────────────┐
           │            │ "Quantas        │
           │            │  parcelas?"     │
           │            └────────┬────────┘
           │                     │
           ▼                     ▼
┌─────────────────────────────────┐
│  Envia para API                 │
│  PUT /state                     │
│  + Dados da compra              │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────┐
│  App Atualiza       │
│  Automaticamente    │
└─────────────────────┘
```

---

## 🛠️ Modificações Necessárias no App

### 1. Adicionar Endpoint para Adicionar Compra Individual

**Arquivo:** `api/src/index.ts`

Adicionar novo endpoint `POST /compra`:

```typescript
if (req.method === "POST" && url.pathname === "/compra") {
  const body = await req.json() as {
    data: string;
    valor: number;
    descricao: string;
    tipo: string;
    cartao: string;
    tipoCompra: string;
    parcelas: number;
    parcelaAtual: number;
  };

  // Validar dados
  if (!body.valor || !body.descricao || !body.cartao) {
    return json({ error: "dados_invalidos" }, env, req, 400);
  }

  // Buscar estado atual
  const state = await readState(env, session.uid);
  
  // Adicionar nova compra
  const novaCompra = {
    id: Date.now(),
    ...body
  };
  
  state.compras.push(novaCompra);
  
  // Salvar
  await writeState(env, session.uid, state);
  
  return json({ ok: true, compra: novaCompra }, env, req);
}
```

### 2. Atualizar CORS

```typescript
"Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
```

---

## 📝 Exemplo de Requisição do Tasker

```http
POST https://controle-cartao-api.brunos2tammy.workers.dev/compra
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6...
Content-Type: application/json

{
  "data": "2026-05-14",
  "valor": 150.50,
  "descricao": "Supermercado Extra",
  "tipo": "Supermercado",
  "cartao": "Itaú",
  "tipoCompra": "parcelado",
  "parcelas": 3,
  "parcelaAtual": 1
}
```

---

## 🎨 Melhorias Futuras

1. **Reconhecimento Inteligente de Categoria**
   - Usar IA para categorizar automaticamente
   - Ex: "Supermercado Extra" → categoria "Supermercado"

2. **Histórico de Estabelecimentos**
   - Lembrar categoria de estabelecimentos anteriores
   - Ex: "Extra" sempre → "Supermercado"

3. **Notificação de Confirmação**
   - Enviar notificação após adicionar
   - Permitir desfazer em 10 segundos

4. **Widget Android**
   - Adicionar compra rápida direto da tela inicial

---

## 💰 Custo Total

- **Tasker:** R$ 15 (única vez)
- **AutoNotification:** R$ 10 (única vez)
- **Total:** R$ 25

**Alternativa Gratuita:**
- Usar Automate (gratuito) ao invés de Tasker
- Funcionalidade similar, interface diferente

---

## 🚀 Próximos Passos

1. ✅ Instalar Tasker e AutoNotification
2. ✅ Criar profiles para Itaú e Carrefour
3. ✅ Implementar endpoint POST /compra na API
4. ✅ Testar com notificação real
5. ✅ Ajustar regex de extração de dados

---

## 📱 Alternativa: Shortcuts (iOS)

Se você usar iPhone:

1. **Shortcuts** (nativo do iOS)
2. Automação: "Quando receber notificação de Itaú"
3. Extrair texto da notificação
4. Mostrar menu: "Parcelado?"
5. Fazer requisição HTTP para API

**Limitação:** iOS não permite acesso total a notificações de apps de terceiros

---

## ❓ Dúvidas Comuns

**P: Precisa de internet?**
R: Sim, para enviar dados para a API. Mas o Tasker pode armazenar offline e sincronizar depois.

**P: Funciona com qualquer banco?**
R: Sim! Basta criar um profile para cada banco/cartão.

**P: E se a notificação não tiver todas as informações?**
R: O Tasker pode pedir informações faltantes via diálogo.

**P: É seguro?**
R: Sim, os dados ficam apenas no seu celular e na sua API. Nenhum serviço terceiro tem acesso.

---

## 🎯 Quer que eu implemente?

Posso criar:
1. ✅ Endpoint POST /compra na API
2. ✅ Scripts Tasker prontos para usar
3. ✅ Guia passo a passo com screenshots
4. ✅ Regex para extrair dados das notificações

**Basta confirmar e eu começo a implementação!** 🚀