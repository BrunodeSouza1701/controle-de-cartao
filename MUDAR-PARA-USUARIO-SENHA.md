# 🔐 Mudar Autenticação: Email → Usuário/Senha

## 🎯 Objetivo

Mudar o sistema de autenticação de:
- ❌ **Antes:** Login com Google (controle.cartao2026@gmail.com)
- ✅ **Depois:** Login com usuário e senha simples

---

## 📋 O Que Será Modificado

1. **Frontend (index.html):**
   - Remover botão "Entrar com Google"
   - Adicionar campos de usuário e senha
   - Remover dependência do Firebase Auth

2. **Backend (api/src/index.ts):**
   - Remover verificação de email do Firebase
   - Adicionar verificação de usuário/senha
   - Usar autenticação básica (Basic Auth)

3. **Configuração:**
   - Adicionar variáveis de ambiente para usuário/senha

---

## 🔧 Passo 1: Modificar o Backend (API)

### 1.1 Atualizar `api/wrangler.toml`

Adicione as novas variáveis de ambiente:

```toml
[vars]
FIREBASE_PROJECT_ID = "controle-cartao-2026"
ALLOWED_ORIGIN = "https://seu-dominio.pages.dev"

# NOVAS VARIÁVEIS - Adicione estas linhas:
AUTH_USERNAME = "admin"
AUTH_PASSWORD = "sua_senha_segura_aqui"
```

### 1.2 Atualizar `api/src/index.ts`

Substitua a função `verifyFirebaseIdToken` por uma nova função de autenticação:

**ANTES (linhas 57-83):**
```typescript
async function verifyFirebaseIdToken(
  idToken: string,
  env: Env,
): Promise<{ uid: string; email: string } | null> {
  // ... código antigo ...
}
```

**DEPOIS:**
```typescript
function verifyBasicAuth(
  req: Request,
  env: Env,
): boolean {
  const auth = req.headers.get("Authorization") || "";
  
  if (!auth.startsWith("Basic ")) {
    return false;
  }
  
  const base64 = auth.slice(6).trim();
  let decoded = "";
  
  try {
    decoded = atob(base64);
  } catch {
    return false;
  }
  
  const [username, password] = decoded.split(":");
  
  const validUsername = env.AUTH_USERNAME?.trim() || "admin";
  const validPassword = env.AUTH_PASSWORD?.trim() || "";
  
  if (!validPassword) return false;
  
  return username === validUsername && password === validPassword;
}
```

### 1.3 Atualizar a Interface `Env`

**ANTES (linhas 3-10):**
```typescript
export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  ALLOWED_EMAIL: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}
```

**DEPOIS:**
```typescript
export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  AUTH_USERNAME: string;
  AUTH_PASSWORD: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}
```

### 1.4 Atualizar as Rotas Protegidas

Procure por todas as chamadas de `verifyFirebaseIdToken` e substitua por `verifyBasicAuth`.

**ANTES:**
```typescript
const idToken = bearerIdToken(req);
const user = await verifyFirebaseIdToken(idToken, env);
if (!user) return unauthorized(env, req);
```

**DEPOIS:**
```typescript
if (!verifyBasicAuth(req, env)) {
  return unauthorized(env, req);
}
```

---

## 🎨 Passo 2: Modificar o Frontend (index.html)

### 2.1 Remover Scripts do Firebase

**DELETE estas linhas (296-297):**
```html
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
```

### 2.2 Modificar o HTML do Login

**ANTES (linhas 303-314):**
```html
<div id="authGate" class="auth-gate ...">
  <div class="card ...">
    <div class="card-body ...">
      <h5 class="fw-bold mb-2">Controle de Cartão</h5>
      <p class="text-muted small mb-4">Acesso restrito. Entre com a conta Google autorizada para continuar.</p>
      <button type="button" id="btnGoogleLogin" class="btn btn-primary w-100 rounded-pill mb-2">
        <i class="bi bi-google"></i> Entrar com Google
      </button>
      <p id="authGateErro" class="text-danger small mb-0 d-none"></p>
    </div>
  </div>
</div>
```

**DEPOIS:**
```html
<div id="authGate" class="auth-gate position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 d-none">
  <div class="card shadow-lg border-0" style="max-width:400px;width:100%;">
    <div class="card-body p-4">
      <h5 class="fw-bold mb-2 text-center">Controle de Cartão</h5>
      <p class="text-muted small mb-4 text-center">Acesso restrito. Entre com suas credenciais.</p>
      
      <form id="loginForm" onsubmit="return false;">
        <div class="mb-3">
          <label for="loginUsername" class="form-label">Usuário</label>
          <input type="text" class="form-control" id="loginUsername" required autocomplete="username">
        </div>
        
        <div class="mb-3">
          <label for="loginPassword" class="form-label">Senha</label>
          <input type="password" class="form-control" id="loginPassword" required autocomplete="current-password">
        </div>
        
        <button type="submit" id="btnLogin" class="btn btn-primary w-100 rounded-pill mb-2">
          <i class="bi bi-box-arrow-in-right"></i> Entrar
        </button>
      </form>
      
      <p id="authGateErro" class="text-danger small mb-0 text-center d-none"></p>
    </div>
  </div>
</div>
```

### 2.3 Modificar o JavaScript de Autenticação

**Procure pela função `initFirebaseAuth()` (por volta da linha 780) e SUBSTITUA por:**

```javascript
function initBasicAuth() {
  const gate = document.getElementById("authGate");
  const form = document.getElementById("loginForm");
  const btnLogin = document.getElementById("btnLogin");
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  
  // Verificar se já está autenticado
  const savedAuth = sessionStorage.getItem("auth_credentials");
  if (savedAuth) {
    debugLog('Credenciais salvas encontradas');
    currentAuthCredentials = savedAuth;
    if (gate) gate.classList.add("d-none");
    startAppAfterAuth();
    return;
  }
  
  // Mostrar tela de login
  debugLog('Mostrando tela de login');
  if (gate) gate.classList.remove("d-none");
  
  // Handler do formulário
  if (form) {
    form.onsubmit = async function(e) {
      e.preventDefault();
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      
      if (!username || !password) {
        showAuthGateErro("Preencha usuário e senha.");
        return;
      }
      
      debugLog('Tentando login com usuário: ' + username);
      
      try {
        showAuthGateErro("");
        btnLogin.disabled = true;
        btnLogin.textContent = "Aguarde...";
        
        // Criar credenciais Basic Auth
        const credentials = btoa(username + ":" + password);
        const authHeader = "Basic " + credentials;
        
        // Testar credenciais fazendo uma requisição à API
        const response = await fetch(API_BASE_URL + "/state", {
          method: "GET",
          headers: {
            "Authorization": authHeader
          }
        });
        
        if (response.ok) {
          debugLog('Login bem-sucedido', 'success');
          
          // Salvar credenciais
          currentAuthCredentials = authHeader;
          sessionStorage.setItem("auth_credentials", authHeader);
          
          // Esconder tela de login
          if (gate) gate.classList.add("d-none");
          
          // Iniciar app
          startAppAfterAuth();
        } else {
          debugLog('Login falhou: ' + response.status, 'error');
          showAuthGateErro("Usuário ou senha incorretos.");
          btnLogin.disabled = false;
          btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Entrar';
        }
      } catch (error) {
        debugLog('Erro no login: ' + error.message, 'error');
        showAuthGateErro("Erro ao conectar. Verifique sua conexão.");
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Entrar';
      }
    };
  }
  
  // Botão de logout
  const lo = document.getElementById("btnLogout");
  if (lo) {
    lo.onclick = function() {
      logoutBasicAuth();
    };
  }
}

function logoutBasicAuth() {
  debugLog('Fazendo logout');
  currentAuthCredentials = null;
  sessionStorage.removeItem("auth_credentials");
  
  const gate = document.getElementById("authGate");
  if (gate) gate.classList.remove("d-none");
  
  // Limpar formulário
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";
}
```

### 2.4 Adicionar Variável Global

**No início do JavaScript (por volta da linha 700), adicione:**

```javascript
let currentAuthCredentials = null;
```

### 2.5 Atualizar Chamadas à API

**Procure por todas as funções que fazem requisições à API e atualize o header Authorization:**

**ANTES:**
```javascript
const idToken = await firebase.auth().currentUser.getIdToken();
headers: {
  "Authorization": "Bearer " + idToken,
  "Content-Type": "application/json"
}
```

**DEPOIS:**
```javascript
headers: {
  "Authorization": currentAuthCredentials,
  "Content-Type": "application/json"
}
```

### 2.6 Atualizar Inicialização

**Procure pela chamada `initFirebaseAuth()` e substitua por:**

```javascript
initBasicAuth();
```

---

## 🧪 Passo 3: Testar

### 3.1 Testar Localmente

1. **Configure as variáveis** em `api/dev.vars`:
```
AUTH_USERNAME=admin
AUTH_PASSWORD=sua_senha_aqui
```

2. **Inicie a API:**
```bash
cd api
npm run dev
```

3. **Abra o index.html** no navegador

4. **Tente fazer login** com:
   - Usuário: `admin`
   - Senha: `sua_senha_aqui`

### 3.2 Deploy

1. **Configure as variáveis no Cloudflare:**
```bash
cd api
wrangler secret put AUTH_USERNAME
# Digite: admin

wrangler secret put AUTH_PASSWORD
# Digite: sua_senha_segura
```

2. **Deploy:**
```bash
wrangler deploy
```

---

## ✅ Checklist

- [ ] Backend atualizado (api/src/index.ts)
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend atualizado (index.html)
- [ ] Scripts do Firebase removidos
- [ ] Testado localmente
- [ ] Deploy realizado
- [ ] Testado em produção

---

## 🔒 Segurança

**IMPORTANTE:**
1. Use uma senha **forte** (mínimo 16 caracteres)
2. Nunca commite a senha no Git
3. Use HTTPS sempre
4. Considere adicionar rate limiting
5. Considere adicionar 2FA no futuro

---

## 💡 Melhorias Futuras

1. **Hash de senha:** Use bcrypt ou similar
2. **Múltiplos usuários:** Banco de dados de usuários
3. **Tokens JWT:** Ao invés de Basic Auth
4. **2FA:** Autenticação de dois fatores
5. **Recuperação de senha:** Sistema de reset

---

Qualquer dúvida, estou aqui para ajudar! 💪