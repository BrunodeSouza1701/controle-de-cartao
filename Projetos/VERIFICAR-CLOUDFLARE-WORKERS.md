# Como Verificar e Configurar o Cloudflare Workers

## 1. Acessar o Cloudflare Workers

1. Acesse: **https://dash.cloudflare.com/**
2. Faça login com sua conta
3. No menu lateral esquerdo, clique em **Workers & Pages**
4. Você verá uma lista de Workers e Pages

## 2. Encontrar seu Worker da API

Procure por um Worker chamado:
- **controle-cartao-api** 
- Ou algo similar com "api" no nome

**Se NÃO encontrar o Worker**, significa que você ainda não fez o deploy da API. Pule para a seção "Fazer Deploy da API" abaixo.

## 3. Verificar as Credenciais do Worker

1. Clique no Worker **controle-cartao-api**
2. Clique na aba **Settings**
3. Role até **Variables and Secrets** (ou **Environment Variables**)
4. Verifique se existem estas variáveis:
   - `AUTH_USERNAME` = `admin`
   - `AUTH_PASSWORD` = `Ccsouza2026`

**Se as variáveis NÃO existirem ou estiverem diferentes:**

1. Clique em **Add variable**
2. Adicione:
   - Nome: `AUTH_USERNAME`
   - Valor: `admin`
   - Tipo: **Plain text** (não é secret)
3. Clique em **Add variable** novamente
4. Adicione:
   - Nome: `AUTH_PASSWORD`
   - Valor: `Ccsouza2026`
   - Tipo: **Plain text** (não é secret)
5. Clique em **Save and Deploy**

## 4. Testar a API Diretamente

Abra uma nova aba do navegador e acesse:
```
https://controle-cartao-api.brunos2tammy.workers.dev/state
```

**Resultado esperado:**
- Deve aparecer uma mensagem de erro: `{"error":"Unauthorized"}`
- Isso é CORRETO! Significa que a API está funcionando e pedindo autenticação

**Se aparecer outra coisa:**
- `404 Not Found` = O Worker não existe ou a URL está errada
- `Error 1101` = O Worker não está publicado
- Nada carrega = Problema de rede ou Worker não existe

## 5. Fazer Deploy da API (se necessário)

Se o Worker não existe ou as credenciais estão erradas, faça o deploy:

### No seu computador:

1. Abra o terminal/PowerShell
2. Navegue até a pasta do projeto:
   ```bash
   cd c:\Users\Goncales\Desktop\ControledeCartao
   ```

3. Entre na pasta da API:
   ```bash
   cd api
   ```

4. Faça o deploy:
   ```bash
   npm run deploy
   ```

5. Aguarde a mensagem de sucesso:
   ```
   Published controle-cartao-api (X.XX sec)
   https://controle-cartao-api.brunos2tammy.workers.dev
   ```

## 6. Verificar se Funcionou

Depois de configurar as variáveis ou fazer o deploy:

1. Aguarde 1-2 minutos
2. Acesse seu site do Cloudflare Pages
3. Tente fazer login:
   - Usuário: `admin`
   - Senha: `Ccsouza2026`

## 7. Testar com Postman ou cURL (Opcional)

Se quiser testar a API diretamente com as credenciais:

### Usando cURL (no PowerShell):
```powershell
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:Ccsouza2026"))
}
Invoke-WebRequest -Uri "https://controle-cartao-api.brunos2tammy.workers.dev/state" -Headers $headers
```

**Resultado esperado:**
```json
{
  "compras": [],
  "orcamentos": [],
  "fechamentosCartao": {"global": {}, "mensal": {}}
}
```

## Resumo dos Links Importantes

- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **Workers & Pages:** https://dash.cloudflare.com/ → Workers & Pages
- **Sua API:** https://controle-cartao-api.brunos2tammy.workers.dev/state
- **Seu Site:** (o link do Cloudflare Pages que você está usando)

## Problemas Comuns

### "Worker não encontrado"
→ Faça o deploy: `cd api && npm run deploy`

### "Unauthorized" mesmo com credenciais corretas
→ Verifique se as variáveis `AUTH_USERNAME` e `AUTH_PASSWORD` estão configuradas no Worker

### "CORS error"
→ A API já tem CORS configurado, mas verifique se a URL da API no site está correta

### "Erro ao conectar"
→ Verifique se a URL da API está correta no `index.html` (linha 544)