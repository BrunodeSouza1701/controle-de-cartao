# 📱 Guia Completo de Instalação - Automate

## 🎯 O que você vai conseguir

Após seguir este guia, seu celular vai:
- ✅ Detectar automaticamente notificações do Itaú
- ✅ Detectar automaticamente SMS do Carrefour
- ✅ Perguntar se a compra é parcelada
- ✅ Adicionar a compra no app automaticamente
- ✅ Tudo 100% gratuito!

---

## 📥 Passo 1: Instalar o Automate

1. Abra a **Play Store**
2. Busque por **"Automate"** (desenvolvedor: LlamaLab)
3. Instale o app (é gratuito!)
4. Abra o Automate

---

## 🔑 Passo 2: Obter Credenciais do Firebase

### 2.1 - API Key do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto: **controle-de-cartao-47347**
3. Clique no ⚙️ (engrenagem) > **Configurações do projeto**
4. Role até **Seus apps** > **SDK setup and configuration**
5. Copie o valor de `apiKey` (começa com `AIza...`)

**Exemplo:**
```
apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 2.2 - Senha da Conta

Você precisará da senha da conta `controle.cartao2026@gmail.com`

⚠️ **IMPORTANTE:** Guarde essas informações em local seguro!

---

## 📲 Passo 3: Importar os Flows

### 3.1 - Flow de Token Firebase (OBRIGATÓRIO)

Este flow mantém você autenticado.

1. No Automate, toque no **+** (adicionar flow)
2. Toque em **Import** (importar)
3. Navegue até a pasta do projeto: `automate-flows/`
4. Selecione: **flow-firebase-token.flo**
5. Toque em **Edit** (editar)
6. Encontre o bloco **HTTP Request**
7. Edite a URL, substituindo:
   - `AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` → Sua API Key do Firebase
8. Edite o Body, substituindo:
   - `SUA_SENHA_AQUI` → Senha da conta controle.cartao2026@gmail.com
9. Toque em **Save** (salvar)
10. Toque em **▶️ Start** (iniciar)

✅ **Pronto!** O token será renovado automaticamente a cada 50 minutos.

---

### 3.2 - Flow do Itaú (Notificações)

1. No Automate, toque no **+** (adicionar flow)
2. Toque em **Import** (importar)
3. Selecione: **flow-itau-notificacao.flo**
4. Toque em **▶️ Start** (iniciar)
5. Conceda as permissões solicitadas:
   - ✅ Acesso a notificações
   - ✅ Acesso à internet

✅ **Pronto!** Agora o Automate vai detectar notificações do Itaú.

---

### 3.3 - Flow do Carrefour (SMS)

1. No Automate, toque no **+** (adicionar flow)
2. Toque em **Import** (importar)
3. Selecione: **flow-carrefour-sms.flo**
4. Toque em **▶️ Start** (iniciar)
5. Conceda as permissões solicitadas:
   - ✅ Acesso a SMS
   - ✅ Acesso à internet

✅ **Pronto!** Agora o Automate vai detectar SMS do Carrefour.

---

## 🧪 Passo 4: Testar

### Teste 1: Verificar Token Firebase

1. Abra o Automate
2. Veja se o flow **"Obter Token Firebase"** está rodando (ícone ▶️)
3. Deve aparecer um toast: "✅ Token Firebase atualizado!"

Se não aparecer:
- Verifique se a API Key está correta
- Verifique se a senha está correta
- Verifique se tem internet

---

### Teste 2: Simular Notificação do Itaú

**Opção A: Fazer uma compra real**
- Faça uma compra com o cartão Itaú
- Aguarde a notificação
- O Automate deve mostrar o diálogo automaticamente

**Opção B: Testar manualmente**
1. No Automate, abra o flow **"Capturar Compra Itaú"**
2. Toque em **▶️ Test** (testar)
3. Simule uma notificação

---

### Teste 3: Simular SMS do Carrefour

**Opção A: Fazer uma compra real**
- Faça uma compra com o cartão Carrefour
- Aguarde o SMS
- O Automate deve mostrar o diálogo automaticamente

**Opção B: Enviar SMS de teste**
1. De outro celular, envie um SMS para o seu número
2. Remetente: "Carrefour"
3. Texto: "Compra aprovada de R$ 50,00 em Supermercado Extra"

---

## 🎨 Passo 5: Personalizar (Opcional)

### Adicionar Mais Cartões

Para adicionar outros cartões (Nubank, C6, etc.):

1. Duplique o flow do Itaú
2. Renomeie para o nome do banco
3. Edite o bloco **Notification Posted**:
   - Mude o `package` para o do app do banco
   - Exemplo Nubank: `com.nu.production`
4. Edite o bloco **HTTP Request**:
   - Mude `"cartao": "Itaú"` para `"cartao": "Nubank"`

---

### Descobrir o Package Name de um App

1. Instale o app **"App Inspector"** (gratuito)
2. Abra o App Inspector
3. Encontre o app do banco
4. Copie o **Package Name**

**Exemplos comuns:**
- Itaú: `com.itau`
- Nubank: `com.nu.production`
- Bradesco: `br.com.bradesco`
- Santander: `com.santander.app`
- C6 Bank: `com.c6bank.app`

---

## 🔧 Passo 6: Configurações Avançadas

### Economizar Bateria

1. Abra **Configurações do Android**
2. **Bateria** > **Otimização de bateria**
3. Encontre **Automate**
4. Selecione **Não otimizar**

Isso garante que o Automate continue rodando em segundo plano.

---

### Notificações Persistentes

O Automate mostra uma notificação permanente quando está rodando. Para ocultar:

1. Mantenha pressionada a notificação do Automate
2. Toque em **Configurações**
3. Desative **Mostrar notificações**

⚠️ O Automate continuará funcionando normalmente.

---

## 🐛 Solução de Problemas

### Problema: "Token Firebase inválido"

**Solução:**
1. Verifique se o flow **"Obter Token Firebase"** está rodando
2. Verifique se a API Key está correta
3. Verifique se a senha está correta
4. Reinicie o flow manualmente

---

### Problema: "Notificação não detectada"

**Solução:**
1. Verifique se o Automate tem permissão de acesso a notificações:
   - **Configurações** > **Apps** > **Automate** > **Permissões**
2. Verifique se o flow está rodando (ícone ▶️)
3. Teste com uma notificação manual

---

### Problema: "SMS não detectado"

**Solução:**
1. Verifique se o Automate tem permissão de acesso a SMS:
   - **Configurações** > **Apps** > **Automate** > **Permissões**
2. Verifique se o número do remetente está correto no flow
3. Teste enviando um SMS de outro celular

---

### Problema: "Compra não aparece no app"

**Solução:**
1. Verifique se o token Firebase está válido
2. Verifique se tem internet
3. Abra o app e force uma sincronização (pull to refresh)
4. Verifique os logs do Automate:
   - Abra o flow > **Log** (ver erros)

---

## 📊 Monitoramento

### Ver Logs do Automate

1. Abra o Automate
2. Toque no flow que deseja monitorar
3. Toque em **Log**
4. Veja todas as execuções e erros

---

### Ver Logs da API

Para ver se as requisições estão chegando na API:

```bash
cd api
npx wrangler tail
```

Você verá em tempo real:
- ✅ Requisições bem-sucedidas
- ❌ Erros de autenticação
- 📊 Dados enviados

---

## 🎯 Fluxo Completo de Funcionamento

```
┌─────────────────────────────────────────────────────────────┐
│  1. Você faz uma compra com o cartão                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Banco envia notificação/SMS                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Automate detecta e extrai dados                         │
│     - Valor: R$ 150,00                                      │
│     - Estabelecimento: Supermercado Extra                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Mostra diálogo: "Compra parcelada?"                     │
│     [Sim] [Não]                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─── Sim ──▶ "Quantas parcelas?" [2]
                     │
                     └─── Não ──▶ (continua)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Mostra diálogo: "Selecione a categoria"                 │
│     [Supermercado] [Farmácia] [Outros]...                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Envia para API                                          │
│     POST /compra                                            │
│     Authorization: Bearer {token}                           │
│     Body: { valor, descricao, categoria, parcelas... }      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. API adiciona no Firestore                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. App sincroniza automaticamente                          │
│     ✅ Compra aparece na lista!                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 Pronto!

Agora você tem um sistema completamente automatizado de controle de gastos!

**Benefícios:**
- ✅ Sem digitação manual
- ✅ Dados capturados em tempo real
- ✅ Confirmação antes de adicionar
- ✅ Categorização facilitada
- ✅ 100% gratuito
- ✅ Funciona offline (sincroniza depois)

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs do Automate
2. Verifique os logs da API (`npx wrangler tail`)
3. Revise as permissões do app
4. Teste com dados simulados

---

## 🔄 Atualizações Futuras

Melhorias planejadas:

- [ ] Reconhecimento automático de categoria por IA
- [ ] Histórico de estabelecimentos (lembrar categoria)
- [ ] Widget para adicionar compras rápidas
- [ ] Notificação de confirmação com opção de desfazer
- [ ] Suporte a mais bancos/cartões
- [ ] Backup automático

---

## 📝 Checklist Final

Antes de considerar a instalação completa:

- [ ] Automate instalado
- [ ] Flow "Obter Token Firebase" rodando
- [ ] Flow "Capturar Compra Itaú" rodando
- [ ] Flow "Capturar Compra Carrefour (SMS)" rodando
- [ ] Permissões concedidas (notificações, SMS, internet)
- [ ] Otimização de bateria desativada para o Automate
- [ ] Teste realizado com sucesso
- [ ] Compra apareceu no app

✅ **Tudo pronto? Parabéns! Seu sistema está 100% automatizado!** 🎉