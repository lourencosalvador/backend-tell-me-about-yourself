import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Configuração minimalista do Cloudflare R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

// Função para gerar URL pressinada (funciona sempre)
export async function getSignedVideoUrl(videoKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: videoKey,
  })
  
  // URL válida por 1 hora
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
  return signedUrl
}
