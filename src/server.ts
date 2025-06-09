import 'dotenv/config'
import { fastify } from "fastify"
import { fastifyCors } from "@fastify/cors"
import { validatorCompiler, serializerCompiler } from "fastify-type-provider-zod"
import multipart from "@fastify/multipart"
import { createTranscriptionRoute } from "./routes/create-transcription"
import { uploadVideoRoute } from "./routes/upload-video"
import { getVideoTranscriptionRoute } from "./routes/get-video-transcription"
import { getUser } from "./routes/user/get-user"
import { authUser } from "./routes/user/user-auth"
import { deleteUser } from "./routes/user/delete-user"
import { updateUser } from "./routes/user/update-user"
import { createUser } from "./routes/user/create-user"
import { userVideos } from "./routes/user-videos"
import { deleteVideo } from "./routes/delete-video"
import { recommendationsRoute } from "./routes/recommendations"
import { streamVideo } from "./routes/stream-video"
 
const app = fastify() 

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
app.register(fastifyCors, { origin: '*' })
app.register(multipart)

app.register(uploadVideoRoute)
app.register(createTranscriptionRoute)
app.register(getVideoTranscriptionRoute)
app.register(streamVideo)

app.register(getUser) 
app.register(authUser)
app.register(updateUser)
app.register(deleteUser)
app.register(createUser)
app.register(userVideos)
app.register(deleteVideo)
app.register(recommendationsRoute)

app.listen({ port: 8000, host: '0.0.0.0' }).then(() => {
  console.log("Server running on port 8000")
})