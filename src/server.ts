import { fastify } from "fastify"
import { fastifyCors } from "@fastify/cors"
import { validatorCompiler, serializerCompiler } from "fastify-type-provider-zod"
import multipart from "@fastify/multipart"
import { createTranscriptionRoute } from "./routes/create-transcription"
import { uploadVideoRoute } from "./routes/upload-video"
import { getUser } from "./routes/user/get-user"
import { authUser } from "./routes/user/user-auth"
import { deleteUser } from "./routes/user/delete-user"
import { updateUser } from "./routes/user/update-user"
import { createUser } from "./routes/user/create-user"

const app = fastify()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
app.register(fastifyCors, { origin: '*' })
app.register(multipart)

app.register(uploadVideoRoute)
app.register(createTranscriptionRoute)

app.register(getUser)
app.register(authUser)
app.register(updateUser)
app.register(deleteUser)
app.register(createUser)


app.listen({ port: 3333 }).then(() => {
  console.log("Server running on port 3333")
})