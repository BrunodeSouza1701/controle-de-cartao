# 🔧 Guia para Automate v1.51.1

## ⚠️ Diferenças da Versão 1.51.1

Na versão 1.51.1 do Automate, alguns blocos mencionados nos outros guias **não existem**:
- ❌ **Expression** - Não existe nesta versão
- ❌ **Fork Merge** - Pode ter nome diferente

## ✅ Blocos Disponíveis na v1.51.1

Use estes blocos alternativos:

| Função | Bloco a Usar |
|--------|--------------|
| Extrair dados JSON | **Variable set** com `{variavel.campo}` |
| Decisões | **If condition** |
| Juntar fluxos | Conecte direto ao próximo bloco |
| Mostrar mensagem | **Toast show** ou **Dialog message** |
| Fazer requisição HTTP | **HTTP request** |
| Salvar variável | **Variable set** |

---

## 📱 Flow 1: Obter Token Firebase (SIMPLIFICADO)

### Estrutura do Flow

```
Flow beginning
↓
HTTP request (Firebase)
↓
Variable set (extrair token)
↓
Variable set (salvar global)
↓
Toast show
↓
Delay 3000s
↓
(volta ao início)
```

### Passo a Passo

#### 1. Flow Beginning
- Adicione o bloco **Flow beginning**
- Deixe configurações padrão

#### 2. HTTP Request (Firebase)
- **Method:** POST
- **URL:** 
  ```
  https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=SUA_API_KEY
  ```
- **Content type:** application/json
- **Content:**
  ```json
  {
    "email": "controle.cartao2026@gmail.com",
    "password": "SUA_SENHA",
    "returnSecureToken": true
  }
  ```
- **Assign to variable:** `auth_response`

#### 3. Variable Set (Extrair Token)
Como não temos o bloco Expression, use **Variable set** com acesso direto ao campo:

- **Variable name:** `token_firebase`
- **Value:** `{auth_response.idToken}`
- **Scope:** Local (por enquanto)

⚠️ **IMPORTANTE:** O Automate consegue acessar campos JSON diretamente usando `{variavel.campo}`

#### 4. Variable Set (Salvar Global)
- **Variable name:** `firebase_token`
- **Value:** `{token_firebase}`
- **Scope:** ✅ **Global** (marque esta opção!)

#### 5. Toast Show
- **Message:** `✅ Token atualizado!`
- **Duration:** Short

#### 6. Delay
- **Duration:** `3000` segundos (50 minutos)

#### 7. Conectar de Volta
- Conecte o Delay ao **Flow beginning** inicial

---

## 📱 Flow 2: Capturar Compra Itaú (SIMPLIFICADO)

### Estrutura do Flow

```
Notification posted
↓
Variable set (texto notificação)
↓
Variable set (extrair valor)
↓
Variable set (extrair estabelecimento)
↓
Dialog input (parcelado?)
↓
If condition (é parcelado?)
├─ YES → Dialog input (quantas parcelas?)
│        ↓
│        Variable set (tipo = parcelado)
│        ↓
│        (vai para próximo bloco)
│
└─ NO → Variable set (tipo = avista)
        ↓
        Variable set (parcelas = 1)
        ↓
        (vai para próximo bloco)
↓
Variable set (data hoje)
↓
Dialog choice (categoria)
↓
HTTP request (API)
↓
Toast show (confirmação)
```

### Passo a Passo

#### 1. Notification Posted
- **Apps:** Selecione **Itaú** (ou digite o package name)
- **Title pattern:** `.*`
- **Text pattern:** `.*(compra|débito|transação).*`
- **Case sensitive:** ❌ Desmarque

#### 2. Variable Set (Texto da Notificação)
- **Variable name:** `notif_texto`
- **Value:** `{notification_text}`

#### 3. Variable Set (Extrair Valor)
Para extrair o valor sem o bloco Expression, use uma abordagem mais simples:

**Opção A - Se o formato for sempre "R$ 150,00":**
- **Variable name:** `valor_str`
- **Value:** Deixe vazio por enquanto (vamos pedir ao usuário)

**Opção B - Usar Dialog Input:**
Adicione um **Dialog input** antes:
- **Title:** `Confirmar Valor`
- **Message:** `Notificação: {notif_texto}\n\nDigite o valor:`
- **Input type:** Decimal number
- **Assign to variable:** `valor`

#### 4. Variable Set (Estabelecimento)
Mesma situação - use Dialog Input:
- **Title:** `Estabelecimento`
- **Message:** `Digite o nome do estabelecimento:`
- **Default value:** `Estabelecimento`
- **Assign to variable:** `estabelecimento`

#### 5. Dialog Input (Parcelado?)
- **Title:** `Compra Detectada!`
- **Message:** `Valor: R$ {valor}\nEstabelecimento: {estabelecimento}\n\nCompra parcelada?`
- **Positive button:** `Sim`
- **Negative button:** `Não`
- **Assign to variable:** `resposta_parcelado`

#### 6. If Condition (Decisão)
- **Condition:** `resposta_parcelado == true`
- Conecte a saída **YES** para o próximo bloco
- Conecte a saída **NO** para outro caminho

#### 7a. Dialog Input (Quantas Parcelas?) - Caminho YES
- **Title:** `Quantas parcelas?`
- **Message:** `Digite o número de parcelas:`
- **Input type:** Number
- **Default value:** `2`
- **Assign to variable:** `num_parcelas`

#### 8a. Variable Set (Tipo = Parcelado) - Caminho YES
- **Variable name:** `tipo_compra`
- **Value:** `parcelado`

#### 7b. Variable Set (Tipo = À Vista) - Caminho NO
- **Variable name:** `tipo_compra`
- **Value:** `avista`

#### 8b. Variable Set (Parcelas = 1) - Caminho NO
- **Variable name:** `num_parcelas`
- **Value:** `1`

#### 9. Juntar os Caminhos
Conecte ambos os caminhos (8a e 8b) ao próximo bloco

#### 10. Variable Set (Data Hoje)
- **Variable name:** `data_hoje`
- **Value:** Use a função de data do Automate ou deixe fixo: `2026-05-15`

**Alternativa:** Adicione um Dialog Input para o usuário confirmar a data

#### 11. Dialog Choice (Categoria)
- **Title:** `Categoria`
- **Message:** `Selecione a categoria:`
- **Choices:** (uma por linha)
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

#### 12. HTTP Request (Enviar para API)
- **Method:** POST
- **URL:** `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
- **Headers:**
  - Header 1:
    - **Name:** `Authorization`
    - **Value:** `Bearer {firebase_token}`
  - Header 2:
    - **Name:** `Content-Type`
    - **Value:** `application/json`
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
- **Assign to variable:** `resposta_api`

#### 13. Toast Show (Confirmação)
- **Message:** `✅ Compra adicionada!\nR$ {valor} - {estabelecimento}`
- **Duration:** Long

---

## 🎯 Versão SUPER SIMPLIFICADA (Recomendada)

Se você está tendo dificuldades, use esta versão que pede tudo ao usuário:

### Flow: Adicionar Compra Manual

```
Flow beginning (ou Notification posted)
↓
Dialog input (Valor)
↓
Dialog input (Estabelecimento)
↓
Dialog input (Parcelado? Sim/Não)
↓
If condition (parcelado?)
├─ YES → Dialog input (Quantas parcelas?)
└─ NO → Variable set (parcelas = 1)
↓
Dialog choice (Categoria)
↓
Variable set (data = hoje)
↓
HTTP request (API)
↓
Toast show (Confirmação)
```

**Vantagens:**
- ✅ Não precisa extrair dados automaticamente
- ✅ Você confirma todos os dados
- ✅ Mais simples de configurar
- ✅ Funciona 100% na v1.51.1

---

## 🔧 Solução para o Seu Flow Atual

Baseado no erro que você está tendo, aqui está como corrigir:

### Seu Flow Atual:
```
5. Flow beginning
↓
4. HTTP request (Firebase)
↓
10. HTTP request (API) ← ERRO: Token não está sendo enviado
```

### Como Corrigir:

#### Adicione entre os blocos 4 e 10:

**Bloco A: Variable Set (Extrair Token)**
- **Variable name:** `token_extraido`
- **Value:** `{api_response.idToken}`

**Bloco B: Variable Set (Salvar Global)**
- **Variable name:** `firebase_token`
- **Value:** `{token_extraido}`
- **Scope:** ✅ **Global**

**Bloco C: Toast (Teste)**
- **Message:** `Token: {firebase_token}`

### Estrutura Corrigida:
```
5. Flow beginning
↓
4. HTTP request (Firebase)
   Output: api_response
↓
[NOVO] Variable set
   Name: token_extraido
   Value: {api_response.idToken}
↓
[NOVO] Variable set (GLOBAL)
   Name: firebase_token
   Value: {token_extraido}
   ✅ Global: YES
↓
[NOVO] Toast show
   Message: Token: {firebase_token}
↓
10. HTTP request (API)
    Header: Authorization: Bearer {firebase_token}
```

---

## 🧪 Teste Rápido

1. Execute o flow
2. Veja se o toast mostra um token longo (começa com "eyJ...")
3. Se mostrar "Token: " (vazio), a variável global não foi criada
4. Se mostrar o token, remova o toast e teste a API

---

## 💡 Dicas Importantes

### 1. Acesso a Campos JSON
Na v1.51.1, você pode acessar campos JSON diretamente:
- `{variavel.campo}` - Acessa campo de primeiro nível
- `{variavel.campo.subcampo}` - Acessa campo aninhado

### 2. Variáveis Globais
- Sempre marque "Global" quando quiser usar a variável em outros blocos
- Variáveis locais só existem dentro do flow atual

### 3. Debug com Toast
- Adicione blocos Toast para ver o valor das variáveis
- Use `Message: {nome_variavel}` para ver o conteúdo

### 4. If Condition vs Fork
- Use **If condition** para decisões simples
- Conecte as saídas YES e NO aos blocos apropriados

---

## 📋 Checklist de Verificação

- [ ] Flow "Obter Token Firebase" criado
- [ ] Variável `firebase_token` marcada como Global
- [ ] Toast de teste mostra o token
- [ ] Flow de captura criado
- [ ] Header `Authorization` configurado corretamente
- [ ] Teste realizado com sucesso

---

## 🆘 Precisa de Ajuda?

Se ainda tiver problemas:

1. **Tire screenshots:**
   - Do flow completo
   - De cada bloco problemático
   - Dos logs de erro

2. **Me envie:**
   - Versão exata do Automate
   - Quais blocos você consegue ver na lista
   - O erro específico que aparece

3. **Teste básico:**
   - Crie um flow simples só com Toast
   - Veja se consegue mostrar variáveis

---

## 🎉 Próximos Passos

1. Comece com o Flow 1 (Token Firebase)
2. Teste se o token aparece no toast
3. Depois crie o Flow 2 (Captura)
4. Use a versão simplificada se tiver dificuldades

**Boa sorte! Estou aqui para ajudar!** 🚀