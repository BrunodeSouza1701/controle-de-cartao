# 📱 Guia: Criar Flows Manualmente no Automate

Como os arquivos `.flo` não podem ser importados diretamente, vamos criar os flows manualmente usando a interface visual do Automate. É mais fácil do que parece!

---

## 🎯 Visão Geral

Vamos criar 3 flows:
1. **Obter Token Firebase** (obrigatório)
2. **Capturar Compra Itaú**
3. **Capturar SMS Carrefour**

Tempo estimado: 15-20 minutos

---

## 📱 Flow 1: Obter Token Firebase (OBRIGATÓRIO)

Este flow mantém você autenticado na API.

### Passo 1: Criar Novo Flow

1. Abra o **Automate**
2. Toque no **+** (botão flutuante)
3. Nome: `Obter Token Firebase`
4. Toque em **OK**

### Passo 2: Adicionar Blocos

#### Bloco 1: Flow Beginning
1. Toque no **+** no canvas
2. Selecione **Flow beginning**
3. Deixe as configurações padrão
4. Toque em **OK**

#### Bloco 2: HTTP Request
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **HTTP request**
4. Configure:
   - **Method:** POST
   - **URL:** `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=SUA_API_KEY_AQUI`
   - **Content type:** application/json
   - **Content:** 
     ```json
     {
       "email": "controle.cartao2026@gmail.com",
       "password": "SUA_SENHA_AQUI",
       "returnSecureToken": true
     }
     ```
   - **Output variable:** `auth_response`
5. Toque em **OK**

⚠️ **IMPORTANTE:** Substitua:
- `SUA_API_KEY_AQUI` → API Key do Firebase (começa com AIza...)
- `SUA_SENHA_AQUI` → Senha da conta

#### Bloco 3: Expression
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Expression**
4. Configure:
   - **Expression:** `auth_response.idToken`
   - **Assign to variable:** `firebase_token`
5. Toque em **OK**

#### Bloco 4: Variable Set (Global)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Variable set**
4. Configure:
   - **Variable name:** `firebase_token`
   - **Value:** `{firebase_token}`
   - **Scope:** ✅ **Global** (marque esta opção!)
5. Toque em **OK**

#### Bloco 5: Toast
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Toast show**
4. Configure:
   - **Message:** `✅ Token Firebase atualizado!`
   - **Duration:** Short
5. Toque em **OK**

#### Bloco 6: Delay
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Delay**
4. Configure:
   - **Duration:** `3000` segundos (50 minutos)
5. Toque em **OK**

#### Bloco 7: Flow Beginning (Loop)
1. Conecte o Delay de volta ao primeiro **Flow Beginning**
2. Isso cria um loop que renova o token a cada 50 minutos

### Passo 3: Salvar e Iniciar

1. Toque em **✓** (salvar)
2. Toque em **▶️** (start)
3. Aguarde o toast: "✅ Token Firebase atualizado!"

✅ **Pronto!** O token será renovado automaticamente.

---

## 📱 Flow 2: Capturar Compra Itaú

### Passo 1: Criar Novo Flow

1. Toque no **+**
2. Nome: `Capturar Compra Itaú`
3. Toque em **OK**

### Passo 2: Adicionar Blocos

#### Bloco 1: Notification Posted
1. Toque no **+**
2. Selecione **Notification posted**
3. Configure:
   - **Apps:** Selecione **Itaú** (ou digite `com.itau`)
   - **Title pattern:** `.*` (deixe vazio ou use .*)
   - **Text pattern:** `.*(compra|débito|transação).*`
   - **Case sensitive:** ❌ Desmarque
4. Toque em **OK**

⚠️ **Permissão:** O Automate vai pedir acesso a notificações. Conceda!

#### Bloco 2: Variable Set (Texto da Notificação)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Variable set**
4. Configure:
   - **Variable name:** `notif_texto`
   - **Value:** `{notification_text}`
5. Toque em **OK**

#### Bloco 3: Expression (Extrair Valor)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Expression**
4. Configure:
   - **Expression:** `notif_texto.match(/R\$\s*([\d.,]+)/)[1]`
   - **Assign to variable:** `valor_str`
5. Toque em **OK**

#### Bloco 4: Expression (Converter Valor)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Expression**
4. Configure:
   - **Expression:** `parseFloat(valor_str.replace('.', '').replace(',', '.'))`
   - **Assign to variable:** `valor`
5. Toque em **OK**

#### Bloco 5: Expression (Extrair Estabelecimento)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Expression**
4. Configure:
   - **Expression:** `notif_texto.match(/em\s+(.+?)\s+no/i) ? notif_texto.match(/em\s+(.+?)\s+no/i)[1] : 'Estabelecimento'`
   - **Assign to variable:** `estabelecimento`
5. Toque em **OK**

#### Bloco 6: Dialog Input (Parcelado?)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Dialog input**
4. Configure:
   - **Title:** `Compra Detectada!`
   - **Message:** `Estabelecimento: {estabelecimento}\nValor: R$ {valor_str}\n\nCompra parcelada?`
   - **Positive button:** `Sim`
   - **Negative button:** `Não`
   - **Assign to variable:** `parcelado`
5. Toque em **OK**

#### Bloco 7: Fork (Decisão)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Fork**
4. Configure:
   - **Proceed:** `When`
   - **Condition:** `parcelado == true`
5. Toque em **OK**

#### Bloco 8: Dialog Input Number (Quantas Parcelas?)
1. Conecte à saída **YES** do Fork
2. Toque no **+**
3. Selecione **Dialog input**
4. Configure:
   - **Title:** `Quantas parcelas?`
   - **Message:** `Digite o número de parcelas:`
   - **Input type:** Number
   - **Default value:** `2`
   - **Assign to variable:** `num_parcelas`
5. Toque em **OK**

#### Bloco 9: Variable Set (Tipo = Parcelado)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Variable set**
4. Configure:
   - **Variable name:** `tipo_compra`
   - **Value:** `parcelado`
5. Toque em **OK**

#### Bloco 10: Fork Merge
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Fork merge**
4. Toque em **OK**

#### Bloco 11: Variable Set (Tipo = À Vista)
1. Conecte à saída **NO** do Fork (bloco 7)
2. Toque no **+**
3. Selecione **Variable set**
4. Configure:
   - **Variable name:** `tipo_compra`
   - **Value:** `avista`
5. Toque em **OK**

#### Bloco 12: Variable Set (Parcelas = 1)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Variable set**
4. Configure:
   - **Variable name:** `num_parcelas`
   - **Value:** `1`
5. Toque em **OK**

#### Bloco 13: Conectar ao Fork Merge
1. Conecte o bloco 12 ao **Fork merge** (bloco 10)

#### Bloco 14: Expression (Data Hoje)
1. Conecte ao Fork merge
2. Toque no **+**
3. Selecione **Expression**
4. Configure:
   - **Expression:** `new Date().toISOString().split('T')[0]`
   - **Assign to variable:** `data_hoje`
5. Toque em **OK**

#### Bloco 15: Dialog Choice (Categoria)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Dialog choice**
4. Configure:
   - **Title:** `Categoria`
   - **Message:** `Selecione a categoria:`
   - **Choices:** (adicione uma por linha)
     ```
     Farmácia
     Supermercado
     Carro / Combustivel
     Estacionamento
     Acadêmico
     Pão da Terra
     Compra Fora
     Gasto Pet
     Necessidades Perfumaria
     Roupas
     Reparo Casa
     Academia
     Compra Online
     ```
   - **Assign to variable:** `categoria`
5. Toque em **OK**

#### Bloco 16: HTTP Request (Enviar para API)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **HTTP request**
4. Configure:
   - **Method:** POST
   - **URL:** `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
   - **Headers:** (adicione 2 headers)
     - `Authorization`: `Bearer {firebase_token}`
     - `Content-Type`: `application/json`
   - **Content type:** application/json
   - **Content:**
     ```json
     {
       "data": "{data_hoje}",
       "valor": {valor},
       "descricao": "{estabelecimento}",
       "tipo": "{categoria}",
       "cartao": "Itaú",
       "tipoCompra": "{tipo_compra}",
       "parcelas": {num_parcelas},
       "parcelaAtual": 1
     }
     ```
   - **Output variable:** `resposta`
5. Toque em **OK**

#### Bloco 17: Toast (Confirmação)
1. Conecte ao bloco anterior
2. Toque no **+**
3. Selecione **Toast show**
4. Configure:
   - **Message:** `✅ Compra adicionada!\nR$ {valor_str} - {estabelecimento}`
   - **Duration:** Long
5. Toque em **OK**

### Passo 3: Salvar e Iniciar

1. Toque em **✓** (salvar)
2. Toque em **▶️** (start)
3. Conceda permissão de acesso a notificações

✅ **Pronto!** Agora o flow vai detectar notificações do Itaú.

---

## 📱 Flow 3: Capturar SMS Carrefour

### Passo 1: Criar Novo Flow

1. Toque no **+**
2. Nome: `Capturar SMS Carrefour`
3. Toque em **OK**

### Passo 2: Adicionar Blocos

#### Bloco 1: SMS Received
1. Toque no **+**
2. Selecione **SMS received**
3. Configure:
   - **Sender pattern:** `.*Carrefour.*`
   - **Body pattern:** `.*(compra|transação|débito).*`
   - **Case sensitive:** ❌ Desmarque
4. Toque em **OK**

⚠️ **Permissão:** O Automate vai pedir acesso a SMS. Conceda!

#### Blocos 2-17: Igual ao Flow do Itaú

Os blocos são **exatamente iguais** ao Flow do Itaú, com apenas 2 diferenças:

**Diferença 1 - Bloco 2:**
- **Value:** `{sms_body}` (ao invés de `{notification_text}`)

**Diferença 2 - Bloco 16 (HTTP Request):**
- **Content:** Mude `"cartao": "Itaú"` para `"cartao": "Carrefour"`

### Passo 3: Salvar e Iniciar

1. Toque em **✓** (salvar)
2. Toque em **▶️** (start)
3. Conceda permissão de acesso a SMS

✅ **Pronto!** Agora o flow vai detectar SMS do Carrefour.

---

## 🧪 Testar os Flows

### Teste 1: Token Firebase

1. Veja se o flow "Obter Token Firebase" está rodando (ícone ▶️)
2. Deve aparecer o toast: "✅ Token Firebase atualizado!"
3. Se não aparecer, revise a API Key e senha

### Teste 2: Notificação Itaú

**Opção A: Compra Real**
- Faça uma compra com o cartão Itaú
- Aguarde a notificação
- O diálogo deve aparecer automaticamente

**Opção B: Teste Manual**
1. Abra o flow "Capturar Compra Itaú"
2. Toque no bloco "Notification posted"
3. Toque em **Test** (ícone de play com bug)
4. Simule uma notificação

### Teste 3: SMS Carrefour

**Opção A: Compra Real**
- Faça uma compra com o cartão Carrefour
- Aguarde o SMS
- O diálogo deve aparecer automaticamente

**Opção B: SMS de Teste**
- De outro celular, envie um SMS
- Remetente: "Carrefour"
- Texto: "Compra aprovada de R$ 50,00 em Supermercado"

---

## 🐛 Solução de Problemas

### "Expression error"

**Causa:** Regex não encontrou o padrão

**Solução:** Ajuste o regex no bloco Expression:
```javascript
// Antes
notif_texto.match(/em\s+(.+?)\s+no/i)[1]

// Depois (com fallback)
notif_texto.match(/em\s+(.+?)\s+no/i) ? notif_texto.match(/em\s+(.+?)\s+no/i)[1] : 'Estabelecimento'
```

### "HTTP 401 Unauthorized"

**Causa:** Token Firebase inválido ou expirado

**Solução:**
1. Verifique se o flow "Obter Token Firebase" está rodando
2. Reinicie o flow manualmente
3. Verifique se a variável `firebase_token` é global

### "Notification not detected"

**Causa:** Permissão não concedida ou package name incorreto

**Solução:**
1. **Configurações** > **Apps** > **Automate** > **Permissões**
2. Verifique se "Acesso a notificações" está ativado
3. Verifique o package name com App Inspector

---

## 💡 Dicas

### Economizar Bateria

1. **Configurações** > **Bateria** > **Otimização de bateria**
2. Encontre **Automate**
3. Selecione **Não otimizar**

### Ver Logs

1. Abra o flow
2. Toque em **Log** (ícone de lista)
3. Veja todas as execuções e erros

### Duplicar Flow

Para adicionar outros cartões:
1. Abra o flow do Itaú
2. Menu (⋮) > **Duplicate**
3. Renomeie e ajuste o package name

---

## ✅ Checklist Final

- [ ] Flow "Obter Token Firebase" criado e rodando
- [ ] Flow "Capturar Compra Itaú" criado e rodando
- [ ] Flow "Capturar SMS Carrefour" criado e rodando
- [ ] Todas as permissões concedidas
- [ ] Token Firebase atualizado (toast apareceu)
- [ ] Teste realizado com sucesso
- [ ] Compra apareceu no app

---

## 🎉 Pronto!

Agora você tem um sistema completamente automatizado!

**Tempo economizado:** ~2 minutos por compra × 30 compras/mês = **1 hora/mês!** ⏰

---

## 📞 Precisa de Ajuda?

Se tiver dificuldades:
1. Veja os logs do Automate
2. Teste cada bloco individualmente
3. Verifique as permissões
4. Revise as variáveis (devem estar corretas)

**Boa automação!** 🚀