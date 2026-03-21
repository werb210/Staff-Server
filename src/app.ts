import express from 'express'

import authRoutes from './modules/auth/auth.routes'
import telephonyRoutes from './modules/telephony/token.route'
import health from './routes/_int/health'
import runtime from './routes/_int/runtime'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(express.json())
app.use(requestLogger)

app.use(authRoutes)
app.use(telephonyRoutes)
app.use(health)
app.use(runtime)

app.use(errorHandler)

export default app
