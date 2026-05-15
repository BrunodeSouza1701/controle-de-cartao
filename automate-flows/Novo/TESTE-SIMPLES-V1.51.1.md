# 🧪 Teste Simples - Automate v1.51.1

## 🎯 Solução Mais Simples (2 minutos)

### Passo 1: Abrir o Flow
1. Abra o **Automate**
2. Toque no flow **"Projeto -Flow Firebase"**
3. Toque no **ícone de lápis** (editar)

### Passo 2: Modificar o Dialog Input
1. **Procure** o bloco com ícone de mensagem/dialog
2. **Toque** nesse bloco
3. **Encontre** o campo **"Message"**
4. **Apague** tudo
5. **Digite** exatamente: `{auth_response}`
6. **Salve** (✓)
7. **Salve o flow**

### Passo 3: Executar
1. **Execute** o flow (▶️)
2. O Dialog vai mostrar o JSON completo
3. **Procure** por `"idToken":"`
4. **Copie** o texto longo depois (começa com `eyJ`)
5. **Cole** no campo do Dialog
6. **Confirme**

---

## 📸 O Que Você Vai Ver

O Dialog mostrará algo assim:

```json
{"idToken":"eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4ZTU...","email":"controle.cartao2026@gmail.com"}
```

**Copie apenas:** `eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4ZTU...` (o texto longo)

---

## ✅ Pronto!

Agora o token aparece direto no Dialog. Basta copiar e colar!

**Dica:** O token sempre começa com `eyJ` e é bem longo.