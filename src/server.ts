import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import postsRoutes from './routes/posts'
import uploadRoutes from './routes/upload'
import imageUploadRoutes from './routes/imageUpload'
import imagesRoutes from './routes/images'
import authorsRoutes from './routes/authors'
import productsRoutes from './routes/products'

import affiliateLinksRoutes from './routes/affiliateLinks'
import affiliateTrackingRoutes from './routes/affiliateTracking'
import categoriesRoutes from './routes/categories'
import tagsRoutes from './routes/tags'
import teamsRoutes from './routes/teams'
import seoTagsRoutes from './routes/seoTags'
import llmRoutes from './routes/llm'
import commentsRoutes from './routes/comments'
import likesRoutes from './routes/likes'
import contactRoutes from './routes/contact'
import jobApplicationsRoutes from './routes/jobApplications'

dotenv.config()

const app = express()
// Use Render's PORT environment variable, fallback to 8080 for local development
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080

// Explicit CORS preflight handling and open origin
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.options('*', cors())

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes
app.use('/auth', authRoutes)
app.use('/posts', postsRoutes)
app.use('/upload', uploadRoutes)
app.use('/image-upload', imageUploadRoutes)
app.use('/images', imagesRoutes)
app.use('/authors', authorsRoutes)
app.use('/products', productsRoutes)

app.use('/affiliate-links', affiliateLinksRoutes)
app.use('/affiliate-tracking', affiliateTrackingRoutes)
app.use('/categories', categoriesRoutes)
app.use('/tags', tagsRoutes)
app.use('/teams', teamsRoutes)
app.use('/seo-tags', seoTagsRoutes)
app.use('/llm', llmRoutes)
app.use('/comments', commentsRoutes)
app.use('/likes', likesRoutes)
app.use('/contact', contactRoutes)
app.use('/job-applications', jobApplicationsRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Dr. Bushra Mirzah Blog API' })
})

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

export default app
