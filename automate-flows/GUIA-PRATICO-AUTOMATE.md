# 🚀 Guia Prático - Automate v1.51.1 - Lançar Compras Automaticamente

## ⚠️ IMPORTANTE: Versão 1.51.1

Este guia é **especificamente para Automate v1.51.1**.

### Principais Diferenças na v1.51.1:
- ❌ Não existe bloco **Expression**
- ❌ Não existe bloco **Fork Merge**
- ✅ Use **Variable set** com `{variavel.campo}` para extrair dados JSON
- ✅ Use **If condition** para decisões
- ✅ Conecte blocos direto (sem Fork Merge)

## ✅ Status Atual

- **Worker** ✅ Corrigido e deployado (autenticação validada)
- **Flow Firebase Token** ✅ Já existente e funcionando (veja logs 05-15 13:05:42+)
- **Faltam:** 2 flows novos para capturar compras (Itaú e Carrefour)

---

## 🎯 O Que Você Precisa Fazer

Criar 2 flows NOVOS (não mexer no Firebase Token Flow):

1. **Flow "Itaú - Lançar Compra"** → Captura push Itaú → Extrai dados → POST `/compra`
2. **Flow "Carrefour - Lançar Compra"** → Captura SMS Carrefour → Extrai dados → POST `/compra`

Ambos usarão a autenticação que já está configurada.

---

## � Formato Real das Notificações

### Itaú (Exemplo Real)

**Título da Notificação:**
```
Compra Aprovada Titular - 90% do Limite Utilizado
```

**Corpo da Notificação:**
```
Compra aprovada no ITAU MULT MC PLAT final 9519 - A PASTELARIA - RS 27,00 em 16/05/2026 as 15h13. Utilizado 90% do limite.
```

**Dados a extrair:**
- **Valor:** R$ 27,00
- **Estabelecimento:** A PASTELARIA
- **Cartão:** ITAU MULT MC PLAT (final 9519)
- **Data:** 16/05/2026
- **Hora:** 15h13

> ℹ️ **Nota:** Como a notificação vem no corpo, o Dialog input vai mostrar o texto completo. Você preencherá manualmente o valor e estabelecimento que reconhecer no texto.

---

## �📱 PASSO 1: Criar Flow para Notificações Itaú

### **⚠️ IMPORTANTE**
Este é um novo flow, diferente do "Firebase Token Flow" que você já tem ativo.

### **1.1 - Criar novo flow**
1. Abra o Automate
2. Toque em `+` para criar novo flow
3. Nomeie como: **"Itaú - Lançar Compra"**

### **1.2 - Estrutura Visual do Flow**

```
Notification posted (Itaú)
    ↓
Dialog input
    ↓
Variable set (Montar JSON)
    ↓
HTTP request (POST /compra)
    ↓
Toast show (Confirmação)
```

### **1.3 - Adicionar Blocos (Passo a Passo)**

#### **Bloco 1: Notification Posted**
- Clique em `Trigger` → **Notification posted**
- Configure:
  - **Package:** `com.itau`
  - **Title:** `Cartão Itau` (opcional)
  - Deixe os outros campos em branco

> 💡 **Dica:** Este trigger cria saída como `Message`, `Title` e `Ticker text`. Use `Message` para a descrição.

#### **Bloco 2: Dialog input**
- Clique em `+` → Search → **UI → Dialog input**
- Configure:
  - **Title:** `Compra detectada`
  - **Input type:** `Decimal number`
  - **Regular expression:** `0.00`
  - **Pre-populate:** `0.00`
  - **Hint:** `Digite o valor da compra`
  - **Show window:** `Show window directly if possible`
  - **Output variable:** `Text entered` = `valor`

> 💡 **Como usar:** Quando a notificação Itaú chegar, digite o valor exibido nela (ex.: `27,00`).

#### **Bloco 3: Variable set**
- Clique em `+` → Search → **Variables → Variable set**
- Configure cada ação do bloco preenchendo os dois campos visíveis na sua versão do Automate:
  - **Variable:** `descricao`
  - **Input arguments:** `={Message}`

- Adicione mais uma ação *Variable set* para cada valor, usando `Input arguments` com `=` à frente (conforme a sua tela):
  - **Variable:** `tipo` → **Input arguments:** `=Compras`
  - **Variable:** `cartao` → **Input arguments:** `=Itau`
  - **Variable:** `data_hoje` → **Input arguments:** `=2026-05-16`
  - **Variable:** `parcelas` → **Input arguments:** `=1`
  - **Variable:** `tipoCompra` → **Input arguments:** `=avista`

> ⚠️ Observações importantes:
>- Na sua versão do Automate o campo `Input arguments` mostra um `=` no placeholder (por exemplo `=Value`). Inclua o `=` antes do valor, **ex.:** `={Message}` ou `=Compras`.
>- Para valores extraídos do trigger (como o texto da notificação use `{Message}` com ou sem chaves conforme o comportamento da sua versão — se o app aceitar a referência, use `={Message}` para copiar o conteúdo do trigger).
>- Para valores numéricos, passe apenas o número (ex.: `=1` ou `=27.00`).
>- Se o `Input arguments` aceitar múltiplos argumentos, apenas o primeiro será usado para este propósito; use uma ação por variável para manter clareza.

> 💡 **Nota:** Use `Message` do trigger Notification posted como descrição da compra.

#### **Bloco 4: HTTP request**
- Clique em `+` → Search → **Network → HTTP request**
- Configure:
  - **Request URL:** `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
  - **Request method:** `POST`
  - **Request content type:** `application/json`
  - **Request content body:**
    ```json
    {
      "descricao": "{descricao}",
      "tipo": "{tipo}",
      "valor": {valor},
      "cartao": "{cartao}",
      "data": "{data_hoje}",
      "parcelas": {parcelas},
      "tipoCompra": "{tipoCompra}"
    }
    ```
  - **Basic authorization account:** `admin:Ccsouza2026` (se disponível)
  - **Request headers:** `Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=` (se não usar Basic authorization account)

#### **Bloco 5: Toast show (Confirmação)**
- Clique em `+` → **UI → Toast show**
- Configure:
  - **Options:** `Immediately`
  - **Message:** `✅ Compra Itaú de R$ {valor} lançada!`
  - **Duration:** `Short`

> 💡 **Categoria fixa "Compras":** Todas as compras Itaú vão como tipo `Compras` por enquanto. Você pode editar e categorizar direto na web app depois.

### **1.4 - Salvar e Ativar**
- Clique em ✅ para salvar
- Mude o toggle para ✅ (ativar o flow)

---

## 📲 PASSO 2: Criar Flow para SMS Carrefour

### **2.1 - Criar novo flow**
1. Toque em `+` para criar novo flow
2. Nomeie como: **"Carrefour - Lançar Compra"**

### **2.2 - Estrutura Visual do Flow**

```
SMS received (Carrefour)
    ↓
Dialog input
    ↓
Variable set (Montar JSON)
    ↓
HTTP request (POST /compra)
    ↓
Toast show (Confirmação)
```

### **2.3 - Adicionar Blocos (Passo a Passo)**

#### **Bloco 1: SMS Received**
- Clique em `Trigger` → **SMS received**
- Configure:
  - **From:** `Carrefour` ou número específico (ex: `27`)
  - Deixe os outros campos em branco

#### **Bloco 2: Dialog input**
- Clique em `+` → Search → **UI → Dialog input**
- Configure:
  - **Title:** `Compra detectada`
  - **Input type:** `Decimal number`
  - **Regular expression:** `0.00`
  - **Pre-populate:** `0.00`
  - **Hint:** `Digite o valor da compra`
  - **Show window:** `Show window directly if possible`
  - **Output variable:** `Text entered` = `valor`

> 💡 **Como usar:** Quando o SMS Carrefour chegar, digite o valor exato mostrado na mensagem.

#### **Bloco 3: Variable set**
- Clique em `+` → Search → **Variables → Variable set**
- Configure:
  - **Variable:** `descricao`
  - **Value:** `{Message}`

- Adicione outra ação Variable set para cada valor:
  - **Variable:** `tipo` → **Value:** `Compras`
  - **Variable:** `cartao` → **Value:** `Carrefour`
  - **Variable:** `data_hoje` → **Value:** `2026-05-16`
  - **Variable:** `parcelas` → **Value:** `1`
  - **Variable:** `tipoCompra` → **Value:** `avista`

> 💡 **Nota:** Use `Message` do trigger SMS received como descrição do SMS.

#### **Bloco 4: HTTP request**
- Clique em `+` → Search → **Network → HTTP request**
- Configure:
  - **Request URL:** `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
  - **Request method:** `POST`
  - **Request content type:** `application/json`
  - **Request content body:**
    ```json
    {
      "descricao": "{descricao}",
      "tipo": "{tipo}",
      "valor": {valor},
      "cartao": "{cartao}",
      "data": "{data_hoje}",
      "parcelas": {parcelas},
      "tipoCompra": "{tipoCompra}"
    }
    ```
  - **Basic authorization account:** `admin:Ccsouza2026` (se disponível)
  - **Request headers:** `Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=` (se não usar Basic authorization account)

#### **Bloco 5: Toast show (Confirmação)**
- Clique em `+` → **UI → Toast show**
- Configure:
  - **Options:** `Immediately`
  - **Message:** `✅ Carrefour: R$ {valor} lançada!`
  - **Duration:** `Short`

### **2.4 - Salvar e Ativar**
- Clique em ✅ para salvar
- Mude o toggle para ✅ (ativar o flow)

---

## 🧪 Teste Imediato (v1.51.1)

### **Opção 1: Teste Manual do Flow**
1. Abra o Automate
2. Abra o flow **"Itaú - Lançar Compra"**
3. Clique em **Play** (▶️) para executar manualmente
4. Preencha o diálogo com dados de teste:
   - Valor: `100.00`
5. Confirme o diálogo
6. Aguarde o toast verde ✅

### **Opção 2: Teste com Notificação Falsa**

**Para Itaú:**
1. Abra o Automate
2. Toque em **Play** no flow de Itaú
3. Digite os dados manualmente nos diálogos

**Para Carrefour:**
1. Abra o Automate
2. Toque em **Play** no flow de Carrefour
3. Digite os dados manualmente nos diálogos

### **Verificar Sucesso**
- ✅ Toast verde aparece na tela
- ✅ Mensagem: `✅ TESTE AUTOMATE - R$ 100,00 lançada!`
- ✅ Compra aparece no app ao atualizar a página

---

## 🧭 Alternativa: MacroDroid (versão 5.63) — passo a passo

Se você prefere usar o MacroDroid (v5.63), abaixo está um passo a passo com termos reais do app para criar os dois fluxos (Itaú e Carrefour).

Notas gerais para MacroDroid:
- O MacroDroid usa variáveis no formato `%nome_variavel%`.
- Para ver as variáveis internas, abra uma ação e use o botão de inserção de variáveis.
- Se o campo aceitar texto livre, insira `%valor%`, `%descricao%`, `%cartao%` etc. diretamente.
- No menu, o caminho de gatilho confirmado pela documentação é: `Eventos do dispositivo > Notificação > Notificação recebida`.

Passo a passo — MacroDroid: **Itaú - Lançar Compra**

1. Abra o MacroDroid e toque em **Adicionar Macro**.
2. Gatilho: **Notificação recebida**
   - Caminho: `Eventos do dispositivo > Notificação > Notificação recebida`
   - Aplicativo: escolha o app Itaú na lista (quando disponível, o pacote costuma ser `com.itau` ou similar).
   - Texto da notificação: deixe em branco inicialmente; se quiser filtrar mais, use algo como `Compra aprovada` ou `Itaú`.
   - Dica: se o app do Itaú não aparecer, escolha o app que gerou a notificação do Itaú no momento do teste.
3. Ação: **Solicitar entrada**
   - Tipo de entrada: Número decimal
   - Mensagem: `Digite o valor da compra`
   - Salvar resposta em variável: `valor`
4. Ação: **Definir variável**
   - Nome: `descricao`
   - Valor: use a variável interna do MacroDroid que contém o texto da notificação. Exemplos comuns: `%notification_text%`, `%notification_content%`, `%notification_message%`, `%message%`.
5. Adicione mais ações **Definir variável**:
   - `tipo` = `Compras`
   - `cartao` = `Itau`
   - `data_hoje` = `2026-05-16`
   - `parcelas` = `1`
   - `tipoCompra` = `avista`
6. Ação: **Enviar requisição HTTP**
   - URL: `https://controle-cartao-api.brunos2tammy.workers.dev/compra`
   - Método: `POST`
   - Tipo de conteúdo: `application/json`
   - Corpo da requisição:

```json
{
  "descricao": "%descricao%",
  "tipo": "%tipo%",
  "valor": %valor%,
  "cartao": "%cartao%",
  "data": "%data_hoje%",
  "parcelas": %parcelas%,
  "tipoCompra": "%tipoCompra%"
}
```

   - Headers:
     - `Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=` 
     - `Content-Type: application/json`
7. Ação: **Mostrar notificação**
   - Texto: `✅ Compra Itaú de R$ %valor% lançada!`
8. Salve o Macro e ative-o.

Passo a passo — MacroDroid: **Carrefour - Lançar Compra (SMS)**

1. Adicionar Macro → Gatilho: **SMS recebido**
   - Caminho: `Eventos do dispositivo > SMS recebido`
   - Remetente: `Carrefour` ou o número de origem (ex.: `27`)
2. Ação: **Solicitar entrada**
   - Tipo de entrada: Número decimal
   - Mensagem: `Digite o valor da compra`
   - Salvar resposta em variável: `valor`
3. Ação: **Definir variável**
   - `descricao` = use a variável interna do SMS, como `%sms_body%`, `%sms_text%` ou `%message%`.
   - `tipo` = `Compras`
   - `cartao` = `Carrefour`
   - `data_hoje` = `2026-05-16`
   - `parcelas` = `1`
   - `tipoCompra` = `avista`
4. Ação: **Enviar requisição HTTP** — mesma configuração do fluxo Itaú.
5. Ação: **Mostrar notificação**
   - Texto: `✅ Carrefour: R$ %valor% lançada!`
6. Salve e ative o Macro.

Testes e dicas
- Execute o Macro para testar e use `100.00` como valor de exemplo.
- Verifique os nomes exatos de variáveis internas no editor do MacroDroid.
- Se houver opção para “Corresponde” no gatilho de notificação, use-a para filtrar o app `com.itau` ou o texto que identifica a notificação.
- Caso o MacroDroid mostre “Mostrar diálogo de entrada” em vez de “Solicitar entrada”, use essa ação para pedir o valor da compra.
- O campo “Definir variável” normalmente pede Nome e Valor; insira o valor com `%...%`.
- Em muitas versões, a ação HTTP exige o corpo em texto e aceita `%variavel%` dentro do JSON.

Se quiser, posso deixar esse exemplo ainda mais adaptado ao seu MacroDroid com nomes exatos de ações e variáveis em português. Só me diga se o app mostrar: “Solicitar entrada”, “Pedir texto”, “Mostrar diálogo” ou outro nome.


## 🧪 Teste com cURL (Opcional)

Para confirmar que a API está funcionando:

```bash
curl -X POST https://controle-cartao-api.brunos2tammy.workers.dev/compra \
  -H "Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=" \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "TESTE",
    "tipo": "Supermercado",
    "valor": 50.00,
    "cartao": "Itau",
    "data": "2026-05-16",
    "parcelas": 1,
    "tipoCompra": "avista"
  }'
```

**Esperado:** `{"ok":true,"compra":{...}}`

---

## 🔧 Solução de Problemas (v1.51.1)

| Problema | Solução |
|----------|---------|
| **Toast não aparece** | Clique em Play manualmente; verifique se todos os diálogos foram preenchidos |
| **Diálogo não aparece** | Verifique se o bloco anterior foi conectado corretamente |
| **Notificação não dispara flow** | Confirme o package name (Itaú: `com.itau`, Carrefour: número ou nome) |
| **API retorna erro 401** | Confirme o header `Authorization: Basic YWRtaW46Q2Nzb3V6YTIwMjY=` |
| **Valor não é reconhecido** | Certifique-se que o Input type é "Decimal number" |
| **Compra não aparece no app** | Atualize a página do app (use botão de refresh) |
| **Flow não salva** | Confirme que todos os campos obrigatórios estão preenchidos |

---

## ✅ Checklist Final

- [ ] Worker deployado com correção de autenticação
- [ ] Flow "Itaú - Lançar Compra" criado e ativado
- [ ] Flow "Carrefour - Lançar Compra" criado e ativado
- [ ] Testou manualmente com Play (▶️)
- [ ] Compra aparece no app após atualizar página
- [ ] Toast de confirmação aparece em ambos os flows
- [ ] Botão de refresh está funcionando no app

---

## 📞 Versão Automate

Este guia foi criado para **Automate v1.51.1**.

Se você estiver usando outra versão, consulte:
- `GUIA-AUTOMATE-V1.51.1.md` para mais detalhes sobre blocos disponíveis
- `GUIA-CRIAR-FLOWS-MANUALMENTE.md` para instruções gerais



