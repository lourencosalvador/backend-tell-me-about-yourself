# Documentação das APIs de Vídeo e Transcrição com Cloudflare R2

## Configuração Inicial

### 1. Configuração do Cloudflare R2

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=sua_access_key_id
R2_SECRET_ACCESS_KEY=sua_secret_access_key
R2_BUCKET_NAME=seu_bucket_name
R2_PUBLIC_URL=https://seu_dominio_publico.com

# OpenAI Configuration
OPENAI_API_KEY=sua_openai_key_aqui

# Database Configuration
DATABASE_URL="file:./dev.db"
```

### 2. Instalação das Dependências

```bash
npm install @aws-sdk/client-s3
```

### 3. Como Obter as Credenciais do R2

1. **Acesse o Cloudflare Dashboard**
2. **Vá para R2 Object Storage**
3. **Crie um bucket** ou use um existente
4. **Gerar API Token**:
   - Vá em "Manage R2 API tokens"
   - Clique em "Create API token"
   - Configure as permissões (Read/Write)
   - Copie o `Access Key ID` e `Secret Access Key`
5. **Obter o Account ID**:
   - Visível no sidebar direito do dashboard
6. **Configurar domínio público** (opcional):
   - Configure um domínio personalizado no R2 para URLs mais limpos

## Endpoints Disponíveis

### 1. Upload de Vídeo com Transcrição Automática

**POST** `/videos/upload?userId={userId}`

- **Descrição**: Faz upload de um vídeo para o Cloudflare R2, extrai o áudio e gera transcrição automaticamente
- **Content-Type**: `multipart/form-data`
- **Parâmetros**: 
  - `userId` (query): UUID do usuário
- **Body**: Arquivo de vídeo
- **Validações**:
  - Apenas arquivos de vídeo são aceitos
  - Usuário deve existir no banco

**Resposta de Sucesso** (200):
```json
{
  "videoId": "uuid-do-video",
  "audioId": "uuid-do-audio",
  "videoUrl": "https://seu_bucket.r2.dev/videos/user-id/video-id.mp4",
  "message": "Upload realizado com sucesso para Cloudflare R2 e transcrição processada"
}
```

**Fluxo do Processamento**:
1. ✅ Validação do usuário e arquivo
2. 🎵 Extração do áudio do vídeo (MP3)
3. ☁️ Upload do vídeo e áudio para Cloudflare R2
4. 💾 Criação dos registros no banco
5. 🎤 Transcrição automática via OpenAI Whisper
6. 🗑️ Limpeza dos arquivos temporários

### 2. Buscar Vídeos do Usuário

**GET** `/videos/{userId}`

- **Descrição**: Lista todos os vídeos de um usuário com suas transcrições
- **Parâmetros**:
  - `userId` (path): UUID do usuário

**Resposta de Sucesso** (200):
```json
{
  "videos": [
    {
      "id": "uuid-do-video",
      "url": "https://seu_bucket.r2.dev/videos/user-id/video-id.mp4",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "audio": {
        "id": "uuid-do-audio",
        "url": "https://seu_bucket.r2.dev/audios/user-id/video-id.mp3",
        "status": "COMPLETED",
        "transcription": {
          "id": "uuid-da-transcricao",
          "text": "Texto da transcrição...",
          "status": "COMPLETED",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      }
    }
  ]
}
```

### 3. Buscar Vídeo Específico com Transcrição

**GET** `/videos/{videoId}/transcription`

- **Descrição**: Busca um vídeo específico com sua transcrição completa
- **Parâmetros**:
  - `videoId` (path): UUID do vídeo

**Resposta de Sucesso** (200):
```json
{
  "video": {
    "id": "uuid-do-video",
    "url": "https://seu_bucket.r2.dev/videos/user-id/video-id.mp4",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "uuid-do-usuario",
      "name": "Nome do Usuário",
      "email": "email@exemplo.com"
    },
    "audio": {
      "id": "uuid-do-audio",
      "url": "https://seu_bucket.r2.dev/audios/user-id/video-id.mp3",
      "status": "COMPLETED",
      "transcription": {
        "id": "uuid-da-transcricao",
        "text": "Texto completo da transcrição...",
        "status": "COMPLETED",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

### 4. Buscar Apenas o Texto da Transcrição

**GET** `/videos/{videoId}/transcription/text`

- **Descrição**: Retorna apenas o texto da transcrição de um vídeo
- **Parâmetros**:
  - `videoId` (path): UUID do vídeo

**Resposta de Sucesso** (200):
```json
{
  "transcription": {
    "text": "Texto completo da transcrição...",
    "status": "COMPLETED",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Status dos Processamentos

### Status do Áudio:
- `PROCESSING`: Áudio sendo processado
- `COMPLETED`: Processamento concluído
- `ERROR`: Erro no processamento

### Status da Transcrição:
- `PENDING`: Aguardando processamento
- `COMPLETED`: Transcrição concluída
- `ERROR`: Erro na transcrição

## Exemplo de Uso com cURL

```bash
# Upload de vídeo
curl -X POST \
  'http://localhost:8000/videos/upload?userId=seu-user-id' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/caminho/para/seu/video.mp4'

# Buscar vídeos do usuário
curl -X GET 'http://localhost:8000/videos/seu-user-id'

# Buscar vídeo específico
curl -X GET 'http://localhost:8000/videos/video-id/transcription'

# Buscar apenas transcrição
curl -X GET 'http://localhost:8000/videos/video-id/transcription/text'
```

## Tratamento de Erros

Todos os endpoints retornam erros padronizados:

```json
{
  "error": "Descrição do erro",
  "details": "Detalhes técnicos (apenas em desenvolvimento)"
}
```

**Códigos de Status Comuns**:
- `400`: Dados inválidos ou arquivo não suportado
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor

## Vantagens do Cloudflare R2

- **Custo menor**: Sem taxas de egress para a maioria dos casos
- **Alta performance**: CDN global da Cloudflare
- **Compatibilidade S3**: APIs familiares e ferramentas existentes
- **Facilidade**: Configuração simples e direta

## Arquivos e Diretórios

- **Arquivos temporários**: São criados em `/temp` e removidos automaticamente
- **Cloudflare R2**: Vídeos em `videos/{userId}/{videoId}.mp4` e áudios em `audios/{userId}/{videoId}.mp3`
- **Banco de dados**: SQLite com tabelas `Video`, `Audio` e `Transcription` 