# 🤖 Sistema de Automação de Compras

## 📋 Resumo

Sistema completo para capturar automaticamente notificações de compras de cartões e adicionar no app de controle financeiro.

---

## 🎯 Funcionalidades

- ✅ Captura automática de notificações do Itaú
- ✅ Captura automática de SMS do Carrefour
- ✅ Diálogo interativo para confirmar parcelas
- ✅ Seleção de categoria
- ✅ Sincronização automática com o app
- ✅ 100% gratuito (usando Automate)

---

## 📁 Arquivos Criados

### Documentação
- **AUTOMACAO-NOTIFICACOES.md** - Explicação completa do sistema
- **GUIA-INSTALACAO-AUTOMATE.md** - Passo a passo de instalação
- **CONTROLE-ACESSO.md** - Documentação de segurança

### Flows do Automate
- **automate-flows/flow-firebase-token.flo** - Autenticação Firebase
- **automate-flows/flow-itau-notificacao.flo** - Captura notificações Itaú
- **automate-flows/flow-carrefour-sms.flo** - Captura SMS Carrefour

### API
- **api/src/index.ts** - Novo endpoint POST /compra

---

## 🚀 Início Rápido

### 1. Deploy da API

```bash
cd api
npm run deploy
```

### 2. Instalar Automate

1. Baixe o [Automate](https://play.google.com/store/apps/details?id=com.llamalab.automate) (gratuito)
2. Siga o **GUIA-INSTALACAO-AUTOMATE.md**

### 3. Importar Flows

1. Importe os 3 arquivos `.flo` da pasta `automate-flows/`
2. Configure suas credenciais Firebase
3. Inicie os flows

---

## 🔐 Segurança

### Controle de Acesso Implementado

**Frontend (index.html):**
```javascript
const ALLOWED_USER_EMAIL = "controle.cartao2026@gmail.com";
```

**Backend (api/wrangler.toml):**
```toml
ALLOWED_EMAIL = "controle.cartao2026@gmail.com"
```

Apenas o e-mail autorizado pode:
- ✅ Fazer login no app
- ✅ Acessar a API
- ✅ Adicionar compras via automação

---

## 📡 Novo Endpoint da API

### POST /compra

Adiciona uma compra individual (usado pela automação).

**Requisição:**
```http
POST https://controle-cartao-api.brunos2tammy.workers.dev/compra
Authorization: Bearer {firebase_token}
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

**Resposta:**
```json
{
  "ok": true,
  "compra": {
    "id": 1715694000000,
    "data": "2026-05-14",
    "valor": 150.50,
    "descricao": "Supermercado Extra",
    "tipo": "Supermercado",
    "cartao": "Itaú",
    "tipoCompra": "parcelado",
    "parcelas": 3,
    "parcelaAtual": 1
  }
}
```

---

## 🎨 Fluxo de Funcionamento

```
Compra → Notificação/SMS → Automate → Diálogo → API → App
```

1. Você faz uma compra
2. Banco envia notificação/SMS
3. Automate detecta e extrai dados
4. Mostra diálogo: "Parcelado?"
5. Mostra diálogo: "Categoria?"
6. Envia para API
7. App sincroniza automaticamente

---

## 💰 Custos

| Item | Custo |
|------|-------|
| Automate | R$ 0 (gratuito) |
| Cloudflare Workers | R$ 0 (plano gratuito) |
| Cloudflare Pages | R$ 0 (plano gratuito) |
| Firebase | R$ 0 (plano gratuito) |
| **TOTAL** | **R$ 0/mês** |

---

## 🔧 Personalização

### Adicionar Mais Cartões

1. Duplique um flow existente
2. Altere o package name do app do banco
3. Altere o nome do cartão no JSON
4. Importe e inicie o flow

### Adicionar Mais Categorias

Edite o array de categorias no flow:
```json
"items": [
  "Farmácia",
  "Supermercado",
  "Nova Categoria Aqui"
]
```

---

## 📊 Monitoramento

### Ver Logs do Automate
1. Abra o Automate
2. Selecione o flow
3. Toque em **Log**

### Ver Logs da API
```bash
cd api
npx wrangler tail
```

---

## 🐛 Problemas Comuns

### "Token Firebase inválido"
- Verifique se o flow "Obter Token Firebase" está rodando
- Verifique API Key e senha

### "Notificação não detectada"
- Verifique permissões do Automate
- Verifique se o flow está rodando

### "Compra não aparece no app"
- Force sincronização no app (pull to refresh)
- Verifique logs da API

---

## 📚 Documentação Completa

- **AUTOMACAO-NOTIFICACOES.md** - Detalhes técnicos
- **GUIA-INSTALACAO-AUTOMATE.md** - Instalação passo a passo
- **CONTROLE-ACESSO.md** - Segurança e autenticação

---

## ✅ Checklist de Implementação

- [x] Endpoint POST /compra criado
- [x] CORS atualizado (POST permitido)
- [x] Flows do Automate criados
- [x] Documentação completa
- [x] Controle de acesso implementado
- [ ] Deploy da API realizado
- [ ] Automate instalado e configurado
- [ ] Teste com compra real

---

## 🎉 Resultado Final

Após a implementação completa, você terá:

- ✅ Sistema 100% automatizado
- ✅ Sem digitação manual
- ✅ Dados em tempo real
- ✅ Confirmação antes de adicionar
- ✅ Totalmente gratuito
- ✅ Seguro e privado

**Tempo economizado:** ~2 minutos por compra
**Compras por mês:** ~30
**Total economizado:** ~1 hora/mês! ⏰

---

## 📞 Próximos Passos

1. ✅ Aguardar deploy da API
2. 📱 Instalar Automate no celular
3. 📥 Importar os 3 flows
4. ⚙️ Configurar credenciais Firebase
5. ▶️ Iniciar os flows
6. 🧪 Testar com uma compra real
7. 🎉 Aproveitar a automação!

---

**Desenvolvido com ❤️ para facilitar o controle financeiro**