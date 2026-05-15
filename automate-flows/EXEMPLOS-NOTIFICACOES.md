# 📱 Exemplos de Notificações para Teste

Este arquivo contém exemplos reais de notificações e SMS de bancos para ajudar a configurar os flows do Automate.

---

## 🏦 Itaú - Notificações Push

### Exemplo 1: Compra à Vista
```
Título: Itaú
Texto: Compra aprovada de R$ 45,90 em SUPERMERCADO EXTRA no cartão final 1234
```

### Exemplo 2: Compra Parcelada
```
Título: Itaú Cartões
Texto: Compra parcelada aprovada de R$ 299,00 em 3x de R$ 99,67 em MAGAZINE LUIZA no cartão final 1234
```

### Exemplo 3: Débito
```
Título: Itaú
Texto: Débito de R$ 150,00 em POSTO SHELL no cartão final 1234
```

### Padrões de Extração (Regex)

**Valor:**
```regex
R\$\s*([\d.,]+)
```

**Estabelecimento:**
```regex
em\s+(.+?)\s+no
```

**Package Name:**
```
com.itau
```

---

## 🛒 Carrefour - SMS

### Exemplo 1: Compra Aprovada
```
Remetente: Carrefour
Texto: Compra aprovada de R$ 89,90 em CARREFOUR HIPER em 14/05/2026 as 15:30
```

### Exemplo 2: Compra Parcelada
```
Remetente: Carrefour
Texto: Compra parcelada aprovada de R$ 450,00 em 6x de R$ 75,00 em LOJAS AMERICANAS
```

### Exemplo 3: Débito
```
Remetente: Carrefour
Texto: Transacao aprovada de R$ 35,50 em FARMACIA SAO PAULO
```

### Padrões de Extração (Regex)

**Valor:**
```regex
R\$\s*([\d.,]+)
```

**Estabelecimento:**
```regex
em\s+(.+?)\s+em
```

**Número do Remetente:**
```
Varia por região, geralmente: 27xxx ou 40xxx
```

---

## 💳 Nubank - Notificações Push

### Exemplo 1: Compra Aprovada
```
Título: Nubank
Texto: Compra de R$ 120,00 aprovada em UBER *TRIP
```

### Exemplo 2: Compra Internacional
```
Título: Nubank
Texto: Compra internacional de USD 25.00 (R$ 125,00) aprovada em AMAZON.COM
```

### Padrões de Extração (Regex)

**Valor:**
```regex
R\$\s*([\d.,]+)
```

**Estabelecimento:**
```regex
em\s+(.+?)$
```

**Package Name:**
```
com.nu.production
```

---

## 🏦 Bradesco - Notificações Push

### Exemplo 1: Compra Aprovada
```
Título: Bradesco Cartões
Texto: Compra aprovada: R$ 78,50 - RESTAURANTE OUTBACK - Cartao 1234
```

### Exemplo 2: Compra Parcelada
```
Título: Bradesco
Texto: Compra parcelada: R$ 600,00 em 10x - CASAS BAHIA
```

### Padrões de Extração (Regex)

**Valor:**
```regex
R\$\s*([\d.,]+)
```

**Estabelecimento:**
```regex
-\s+(.+?)\s+-
```

**Package Name:**
```
br.com.bradesco
```

---

## 🏦 Santander - Notificações Push

### Exemplo 1: Compra Aprovada
```
Título: Santander
Texto: Compra no valor de R$ 95,00 realizada em MC DONALDS
```

### Exemplo 2: Débito
```
Título: Santander Cartões
Texto: Debito de R$ 200,00 em POSTO IPIRANGA - Cartao final 5678
```

### Padrões de Extração (Regex)

**Valor:**
```regex
R\$\s*([\d.,]+)
```

**Estabelecimento:**
```regex
em\s+(.+?)(?:\s+-|$)
```

**Package Name:**
```
com.santander.app
```

---

## 🏦 C6 Bank - Notificações Push

### Exemplo 1: Compra Aprovada
```
Título: C6 Bank
Texto: Compra aprovada: R$ 55,00 em IFOOD *RESTAURANTE
```

### Exemplo 2: Compra Parcelada
```
Título: C6 Bank
Texto: Compra parcelada: R$ 1.200,00 em 12x de R$ 100,00 em MAGAZINE LUIZA
```

### Padrões de Extração (Regex)

**Valor:**
```regex
R\$\s*([\d.,]+)
```

**Estabelecimento:**
```regex
em\s+(.+?)$
```

**Package Name:**
```
com.c6bank.app
```

---

## 🧪 Como Testar os Padrões

### Método 1: Regex101.com

1. Acesse [regex101.com](https://regex101.com/)
2. Cole o texto da notificação
3. Cole o regex
4. Verifique se captura corretamente

### Método 2: Automate Test Mode

1. Abra o flow no Automate
2. Toque em **Test** (ícone de play com bug)
3. Insira manualmente o texto da notificação
4. Veja se os dados são extraídos corretamente

### Método 3: Notificação Real

1. Faça uma compra pequena (R$ 1,00)
2. Aguarde a notificação
3. Veja os logs do Automate
4. Ajuste o regex se necessário

---

## 🔍 Descobrir Package Name de Apps

### Método 1: App Inspector (Recomendado)

1. Instale **App Inspector** (gratuito na Play Store)
2. Abra o App Inspector
3. Encontre o app do banco
4. Copie o **Package Name**

### Método 2: ADB (Avançado)

```bash
# Listar apps instalados
adb shell pm list packages | grep -i banco

# Ver detalhes de um app
adb shell dumpsys package com.itau
```

### Método 3: Play Store URL

A URL da Play Store contém o package name:
```
https://play.google.com/store/apps/details?id=com.itau
                                              ^^^^^^^^
                                           Package Name
```

---

## 📊 Tabela de Package Names Comuns

| Banco | Package Name | Tipo |
|-------|--------------|------|
| Itaú | `com.itau` | App |
| Nubank | `com.nu.production` | App |
| Bradesco | `br.com.bradesco` | App |
| Santander | `com.santander.app` | App |
| C6 Bank | `com.c6bank.app` | App |
| Inter | `br.com.intermedium` | App |
| Banco do Brasil | `br.com.bb.android` | App |
| Caixa | `br.com.gabba.Caixa` | App |
| PicPay | `com.picpay` | App |
| Mercado Pago | `com.mercadopago.wallet` | App |

---

## 🎯 Dicas para Criar Flows Personalizados

### 1. Capture Várias Notificações

Antes de criar o flow, faça algumas compras e salve os textos das notificações para identificar padrões.

### 2. Use Regex Flexível

```regex
# Muito específico (pode quebrar)
R\$ 45,90

# Flexível (funciona com qualquer valor)
R\$\s*([\d.,]+)
```

### 3. Teste com Valores Diferentes

- R$ 1,00 (um dígito)
- R$ 10,50 (dois dígitos)
- R$ 100,00 (três dígitos)
- R$ 1.000,00 (com ponto)
- R$ 10.000,00 (cinco dígitos)

### 4. Considere Variações

Bancos podem mudar o formato das notificações. Use padrões que funcionem com pequenas variações:

```regex
# Aceita "em" ou "no"
(?:em|no)\s+(.+?)
```

---

## 🐛 Problemas Comuns e Soluções

### Problema: Valor não é capturado

**Causa:** Formato diferente (ex: R$45,90 sem espaço)

**Solução:**
```regex
# Antes
R\$\s*([\d.,]+)

# Depois (aceita com ou sem espaço)
R\$\s*?([\d.,]+)
```

---

### Problema: Estabelecimento captura texto extra

**Causa:** Regex muito permissivo

**Solução:**
```regex
# Antes (captura até o final)
em\s+(.+)$

# Depois (para no primeiro "no" ou "em")
em\s+(.+?)\s+(?:no|em|$)
```

---

### Problema: Notificação não é detectada

**Causa:** Package name incorreto ou padrão de texto não corresponde

**Solução:**
1. Verifique o package name com App Inspector
2. Veja o texto exato da notificação nos logs do Automate
3. Ajuste o padrão de texto no flow

---

## 📝 Template de Flow Genérico

Use este template para criar flows para outros bancos:

```json
{
  "name": "Capturar Compra [NOME DO BANCO]",
  "blocks": [
    {
      "type": "notification_posted",
      "package": "[PACKAGE_NAME]",
      "text_pattern": ".*(compra|débito|transação).*"
    },
    {
      "type": "variable_set",
      "name": "notificacao_texto",
      "value": "{notification_text}"
    },
    {
      "type": "expression",
      "expression": "notificacao_texto.match(/R\\$\\s*([\\d.,]+)/)[1]",
      "output": "valor_str"
    },
    {
      "type": "expression",
      "expression": "notificacao_texto.match(/em\\s+(.+?)\\s+(?:no|em|$)/i)[1]",
      "output": "estabelecimento"
    }
    // ... resto do flow igual aos exemplos
  ]
}
```

---

## ✅ Checklist de Teste

Antes de considerar o flow pronto:

- [ ] Testado com compra à vista
- [ ] Testado com compra parcelada
- [ ] Testado com valores pequenos (R$ 1,00)
- [ ] Testado com valores grandes (R$ 1.000,00)
- [ ] Testado com estabelecimentos com nomes curtos
- [ ] Testado com estabelecimentos com nomes longos
- [ ] Testado com caracteres especiais (*, &, etc)
- [ ] Verificado que não captura notificações irrelevantes
- [ ] Verificado que os dados aparecem corretamente no app

---

**Dica Final:** Mantenha este arquivo atualizado com novos exemplos de notificações que você receber. Isso ajudará a melhorar os flows ao longo do tempo! 📝