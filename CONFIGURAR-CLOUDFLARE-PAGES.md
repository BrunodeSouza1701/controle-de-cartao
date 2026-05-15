# Como Configurar o Cloudflare Pages para Basic Auth

## Problema Atual
O login está dando erro "Erro ao conectar" porque o `api-config.js` não tem a URL da API configurada.

## Solução: Configurar Variável de Ambiente

### Passo 1: Acessar o Painel do Cloudflare Pages
1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages**
3. Clique no seu projeto **controle-cartao**

### Passo 2: Configurar a Variável de Ambiente
1. Clique na aba **Settings**
2. Role até **Environment variables**
3. Clique em **Add variable** (ou **Edit variables**)
4. Adicione a seguinte variável:

```
Nome: CF_API_BASE
Valor: https://controle-cartao-api.brunos2tammy.workers.dev
```

5. Selecione **Production** e **Preview** (ambos)
6. Clique em **Save**

### Passo 3: Fazer Redeploy
1. Vá na aba **Deployments**
2. Clique nos 3 pontinhos (...) do último deployment
3. Clique em **Retry deployment**

OU simplesmente faça um novo commit:
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Passo 4: Aguardar o Build
Aguarde alguns minutos até o build terminar. Você verá o status mudando de "Building" para "Success".

### Passo 5: Testar o Login
Acesse seu site e tente fazer login com:
- **Usuário:** admin
- **Senha:** Ccsouza2026

## Verificar se Funcionou
Após o deploy, abra o Console do navegador (F12) e digite:
```javascript
window.CONTROLE_API
```

Deve mostrar:
```javascript
{base: "https://controle-cartao-api.brunos2tammy.workers.dev"}
```

Se mostrar `{base: ""}`, a variável de ambiente não foi configurada corretamente.

## Alternativa Rápida (Temporária)
Se você quiser testar agora sem esperar o deploy, pode editar manualmente o `api-config.js` localmente e abrir o `index.html` direto no navegador:

1. Certifique-se que `api-config.js` tem:
```javascript
window.CONTROLE_API = {"base":"https://controle-cartao-api.brunos2tammy.workers.dev"};
```

2. Abra o arquivo `index.html` diretamente no navegador (duplo clique)

3. Teste o login

**IMPORTANTE:** Isso é só para teste local. Para o site publicado funcionar, você DEVE configurar a variável de ambiente no Cloudflare Pages.