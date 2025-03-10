import { fastify } from "fastify"
import { fastifyCors } from "@fastify/cors"
import { validatorCompiler, serializerCompiler } from "fastify-type-provider-zod"
import multipart from "@fastify/multipart" // 📌 Importa o plugin
import { createTranscriptionRoute } from "./routes/create-transcription"
import { uploadVideoRoute } from "./routes/upload-video"

const app = fastify()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifyCors, { origin: '*' })

app.register(multipart) 

app.register(uploadVideoRoute) 
app.register(createTranscriptionRoute)

app.listen({ port: 3333 }).then(() => {
    console.log("Server running on port 3333")
})
