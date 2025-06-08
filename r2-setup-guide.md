# 🔧 Guia Prático: Configurando Cloudflare R2

## 📋 Passo a Passo para Obter as Credenciais

### 1. **Acessar o Cloudflare Dashboard**
- Vá para [dash.cloudflare.com](https://dash.cloudflare.com)
- Faça login na sua conta

### 2. **Ir para R2 Object Storage**
- No menu lateral esquerdo, clique em **"R2 Object Storage"**
- Se for a primeira vez, aceite os termos de uso

### 3. **Obter o Account ID**
- No sidebar direito, você verá o **Account ID**
- Copie este valor (exemplo: `a1b2c3d4e5f6...`)

### 4. **Criar/Usar um Bucket**
- Clique em **"Create bucket"** (se não tiver nenhum)
- Nome do bucket: escolha um nome único (exemplo: `meu-app-videos`)
- Região: escolha a mais próxima aos seus usuários
- Clique em **"Create bucket"**

### 5. **Gerar API Token**
- Clique em **"Manage R2 API tokens"**
- Clique em **"Create API token"**
- **Nome**: `API-Upload-Videos` (ou qualquer nome)
- **Permissions**: 
  - ✅ Object Read
  - ✅ Object Write
- **TTL**: Não definir (para token permanente)
- Clique em **"Create API token"**

### 6. **Copiar as Credenciais**
Após criar o token, você verá:
- **Access Key ID**: `1234567890abcdef...`
- **Secret Access Key**: `abcdef1234567890...`
- ⚠️ **IMPORTANTE**: Copie e salve essas credenciais imediatamente!

### 7. **Configurar Domínio Público (Opcional)**
- No bucket, vá para **"Settings"**
- Em **"Public access"**, configure um domínio personalizado
- Ou use a URL padrão: `https://seu-bucket.r2.dev`

## 🔄 Configurar o Arquivo .env

Com as informações obtidas, atualize seu arquivo `.env`:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://a1b2c3d4e5f6.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=1234567890abcdef
R2_SECRET_ACCESS_KEY=abcdef1234567890
R2_BUCKET_NAME=meu-app-videos
R2_PUBLIC_URL=https://meu-app-videos.r2.dev

# OpenAI Configuration
OPENAI_API_KEY=sua_openai_key_aqui

# Database Configuration
DATABASE_URL="file:./dev.db"
```

## 📝 Exemplo Real de Configuração

Se você tem:
- **Account ID**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Bucket Name**: `videos-app`
- **Access Key**: `1a2b3c4d5e6f7g8h`
- **Secret Key**: `9i8u7y6t5r4e3w2q1a2s3d4f5g6h7j8k`

Seu `.env` ficaria:

```env
R2_ENDPOINT=https://a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=1a2b3c4d5e6f7g8h
R2_SECRET_ACCESS_KEY=9i8u7y6t5r4e3w2q1a2s3d4f5g6h7j8k
R2_BUCKET_NAME=videos-app
R2_PUBLIC_URL=https://videos-app.r2.dev
```

## ✅ Testar a Configuração

Execute o servidor para testar:

```bash
npm run dev
```

Se tudo estiver correto, você verá:
```
Server running on port 8000
```

## 🔒 Segurança

1. **Nunca commite o `.env`** - adicione no `.gitignore`
2. **Use tokens com permissões mínimas necessárias**
3. **Monitore o uso do R2** no dashboard
4. **Rotacione as chaves periodicamente**

## 💰 Custos do R2

- **Armazenamento**: $0.015/GB/mês
- **Operações de Classe A**: $4.50/milhão (writes)
- **Operações de Classe B**: $0.36/milhão (reads)
- **Egress**: GRATUITO para a maioria dos casos 🎉

## 🆘 Problemas Comuns

### Erro: "InvalidAccessKeyId"
- Verifique se o `R2_ACCESS_KEY_ID` está correto
- Confirme se o token não expirou

### Erro: "NoSuchBucket"
- Verifique se o `R2_BUCKET_NAME` está correto
- Confirme se o bucket existe na conta

### Erro: "Access Denied"
- Verifique as permissões do token
- Confirme se tem permissões Read/Write

### URLs não funcionam
- Verifique se o bucket tem acesso público configurado
- Confirme se o `R2_PUBLIC_URL` está correto 