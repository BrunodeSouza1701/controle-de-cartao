# 🔒 Controle de Acesso Restrito

## Como Funciona

O sistema **JÁ POSSUI** controle de acesso restrito implementado. Apenas o e-mail configurado na variável `ALLOWED_EMAIL` pode acessar a API.

### Verificação de Segurança (api/src/index.ts)

A API verifica:
1. ✅ Token Firebase válido
2. ✅ E-mail do usuário corresponde ao `ALLOWED_EMAIL`
3. ✅ E-mail verificado no Google
4. ✅ Token não expirado

**Código de verificação (linhas 57-83):**
```typescript
async function verifyFirebaseIdToken(idToken: string, env: Env) {
  const allowed = env.ALLOWED_EMAIL?.trim().toLowerCase();
  
  // Verifica o token JWT do Firebase
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  // Compara o e-mail do token com o e-mail permitido
  const email = payload.email.trim().toLowerCase();
  if (!email || email !== allowed) return null; // ❌ ACESSO NEGADO
  
  // Verifica se o e-mail está verificado
  if (payload.email_verified === false) return null; // ❌ ACESSO NEGADO
  
  return { uid, email }; // ✅ ACESSO PERMITIDO
}
```

## 📋 Configuração Atual

**Arquivo:** `api/wrangler.toml` (linha 11)
```toml
ALLOWED_EMAIL = "controle.cartao2026@gmail.com"
```

## 🔧 Como Alterar o E-mail Autorizado

### Opção 1: Editar wrangler.toml (Recomendado)

1. Abra o arquivo `api/wrangler.toml`
2. Altere a linha 11:
   ```toml
   ALLOWED_EMAIL = "seu-email@gmail.com"
   ```
3. Faça o deploy:
   ```bash
   cd api
   npm run deploy
   ```

### Opção 2: Usar Variável de Ambiente no Cloudflare

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** > Seu worker
3. **Settings** > **Variables**
4. Adicione/edite:
   - Nome: `ALLOWED_EMAIL`
   - Valor: `seu-email@gmail.com`
5. Salve e aguarde a propagação

## 🚨 Importante

- **Apenas UM e-mail** pode acessar por vez
- O e-mail deve estar **verificado no Google**
- Qualquer outro e-mail receberá erro `401 Unauthorized`
- A comparação é **case-insensitive** (maiúsculas/minúsculas não importam)

## 🧪 Testando o Acesso Restrito

### Teste 1: Login com e-mail autorizado
```
✅ Login bem-sucedido
✅ Dados carregam normalmente
```

### Teste 2: Login com e-mail NÃO autorizado
```
❌ Erro: "invalid_or_forbidden"
❌ Status HTTP: 401 Unauthorized
❌ Dados não carregam
```

## 📊 Logs de Acesso

Para ver tentativas de acesso:
```bash
cd api
npx wrangler tail
```

Você verá logs de:
- ✅ Acessos autorizados
- ❌ Tentativas de acesso negadas

## 🔐 Múltiplos Usuários (Futuro)

Se precisar permitir múltiplos e-mails, você precisará:

1. Alterar `ALLOWED_EMAIL` para `ALLOWED_EMAILS` (plural)
2. Modificar o código em `api/src/index.ts`:
   ```typescript
   // Linha 62-72: Substituir
   const allowed = env.ALLOWED_EMAIL?.trim().toLowerCase();
   // Por:
   const allowedList = env.ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
   
   // Linha 71-72: Substituir
   if (!email || email !== allowed) return null;
   // Por:
   if (!email || !allowedList.includes(email)) return null;
   ```
3. Configurar no wrangler.toml:
   ```toml
   ALLOWED_EMAILS = "email1@gmail.com,email2@gmail.com,email3@gmail.com"
   ```

## ✅ Status Atual

- ✅ Controle de acesso implementado
- ✅ Apenas `controle.cartao2026@gmail.com` pode acessar
- ✅ Verificação de e-mail obrigatória
- ✅ Tokens JWT validados
- ✅ CORS configurado

**Seu sistema JÁ ESTÁ SEGURO!** 🎉