# Dr. Bushra Mirzah Blog Backend - Architecture Analysis

## System Overview

The backend is a **Node.js/Express.js** application built with **TypeScript** that serves as the API layer for a dental blog platform. It provides authentication, content management, file uploads, and affiliate link tracking functionality.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4.18.2
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis (optional, with fallback)
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: Zod schemas
- **File Storage**: Supabase Storage

### Key Dependencies
- `@supabase/supabase-js`: Database and storage operations
- `bcrypt`: Password hashing
- `jsonwebtoken`: JWT token generation/verification
- `multer`: File upload handling
- `helmet`: Security headers
- `cors`: Cross-origin resource sharing
- `ioredis`: Redis client for caching

## Project Structure

```
src/
├── db/                     # Database connections
│   ├── supabaseClient.ts   # Supabase client configuration
│   ├── redisClient.ts      # Redis caching utilities
│   └── redis.ts           # Alternative Redis configuration
├── middleware/             # Express middleware
│   └── requireAdmin.ts     # Authentication middleware
├── routes/                 # API route handlers
│   ├── auth.ts            # Authentication endpoints
│   ├── posts.ts           # Blog post CRUD operations
│   ├── upload.ts          # File upload handling
│   ├── affiliate.ts       # Affiliate link tracking
│   └── session.ts         # Session utilities
├── utils/                  # Business logic utilities
│   ├── seo.ts             # SEO metadata generation
│   └── slugify.ts         # URL slug generation
├── seed/                   # Database seeding
│   └── seedAdmin.ts       # Admin user and sample data
└── server.ts              # Application entry point
```

## Database Schema (Supabase)

### Tables
1. **admins**
   - `id` (UUID, primary key)
   - `username` (string, unique)
   - `email` (string)
   - `password_hash` (string, bcrypt hashed)

2. **posts**
   - `id` (UUID, primary key)
   - `slug` (string, unique, URL-friendly)
   - `title` (string)
   - `excerpt` (text, optional)
   - `content` (text, optional)
   - `category` (string, optional)
   - `tags` (string array, optional)
   - `image_url` (string, optional)
   - `seo_title` (string)
   - `seo_description` (string)
   - `seo_keywords` (string array)
   - `affiliate_links` (JSON object)
   - `published` (boolean, default false)
   - `date` (timestamp, auto-generated)
   - `updated_at` (timestamp)

3. **affiliate_clicks**
   - `id` (UUID, primary key)
   - `post_id` (UUID, foreign key to posts)
   - `affiliate_provider` (string)
   - `meta` (JSON object with IP, user agent)
   - `clicked_at` (timestamp, auto-generated)

### Storage Buckets
- **posts-images**: Stores uploaded images for blog posts

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - Admin login with username/password
- `POST /logout` - Clear authentication cookie

### Posts Management (`/api/posts`)
- `GET /` - List all posts (cached, ordered by date desc)
- `GET /:slug` - Get single post by slug
- `POST /` - Create new post (admin only)
- `PUT /:id` - Update existing post (admin only)
- `DELETE /:id` - Delete post (admin only)

### File Upload (`/api/upload`)
- `POST /` - Upload image to Supabase storage (admin only)

### Affiliate Tracking (`/a`)
- `GET /:postSlug/:provider` - Redirect to affiliate link and log click

### Health Check
- `GET /` - Returns `{"ok": true}`

## Data Flow Architecture

### 1. Request Processing Flow
```
Client Request → CORS/Helmet → Body Parser → Cookie Parser → Route Handler → Response
```

### 2. Authentication Flow
```
Login Request → Validate Credentials → Hash Check → JWT Generation → HTTP-only Cookie → Response
Protected Route → Extract Cookie → Verify JWT → Attach Admin Info → Continue
```

### 3. Post Management Flow
```
Create Post → Validate Schema → Generate Slug → Auto-SEO → Insert DB → Clear Cache → Response
List Posts → Check Cache → Query DB → Set Cache → Response
Update/Delete → Modify DB → Clear Cache → Response
```

### 4. File Upload Flow
```
File Upload → Multer Processing → Supabase Storage → Generate Public URL → Response
```

### 5. Affiliate Tracking Flow
```
Affiliate Link Click → Validate Post/Provider → Log Click Data → Redirect to Destination
```

## Security Measures

### Authentication & Authorization
- **JWT Tokens**: 7-day expiration, HTTP-only cookies
- **Password Security**: bcrypt hashing with salt rounds
- **Admin-only Routes**: Protected by `requireAdmin` middleware
- **Cookie Security**: Secure flag in production, SameSite protection

### Request Security
- **Helmet**: Security headers (XSS, CSRF protection)
- **CORS**: Configured for credentials and specific origins
- **Input Validation**: Zod schemas for request validation
- **File Upload**: Memory storage with size limits

### Environment Security
- **Environment Variables**: Sensitive data in `.env`
- **Service Role Key**: Supabase admin access
- **Redis Security**: Optional TLS for cloud connections

## Caching Strategy

### Redis Implementation
- **Two Redis Configurations**: 
  - `redisClient.ts`: Graceful fallback if Redis unavailable
  - `redis.ts`: Direct Redis Cloud connection
- **Cache Keys**: `posts:list` for post listings
- **TTL Strategy**: 30 seconds for post lists, 1 hour for sessions
- **Cache Invalidation**: Automatic on post create/update/delete

### Cache Patterns
```javascript
// Read-through pattern
const cached = await cacheGet('posts:list')
if (cached) return cached
const data = await database.query()
await cacheSet('posts:list', data, 30)
return data

// Write-through pattern
await database.update()
await cacheSet('posts:list', null, 1) // Clear cache
```

## Business Logic Components

### SEO Automation (`utils/seo.ts`)
- **Title Optimization**: Truncate at 60 characters
- **Description Generation**: Auto-generate from title/excerpt
- **Keyword Extraction**: Parse title for relevant keywords
- **Fallback Content**: Default descriptions with branding

### URL Generation (`utils/slugify.ts`)
- **Slug Creation**: Convert titles to URL-friendly slugs
- **Consistency**: Lowercase, strict character filtering
- **Uniqueness**: Timestamp fallback for duplicate titles

### Data Seeding (`seed/seedAdmin.ts`)
- **Admin Creation**: Default admin user setup
- **Sample Content**: Initial blog post for testing
- **Environment-based**: Configurable via environment variables

## Error Handling & Logging

### Error Patterns
- **Database Errors**: Supabase error messages passed through
- **Validation Errors**: Zod validation with descriptive messages
- **Authentication Errors**: Generic "Invalid credentials" for security
- **File Upload Errors**: Specific error types for debugging

### Logging Strategy
- **Connection Logging**: Redis connection status
- **Seed Logging**: Admin creation and sample data insertion
- **Error Logging**: Database and application errors

## Performance Considerations

### Optimization Strategies
- **Redis Caching**: Reduces database load for frequent queries
- **Selective Queries**: Only fetch required fields
- **Pagination Ready**: Structure supports future pagination
- **Connection Pooling**: Supabase handles connection management

### Scalability Features
- **Stateless Design**: JWT tokens enable horizontal scaling
- **External Storage**: Supabase storage offloads file handling
- **Cache Layer**: Redis enables distributed caching
- **Environment Flexibility**: Easy deployment configuration

## Configuration Management

### Environment Variables
```bash
# Database
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Caching
REDIS_URI=redis://localhost:6379
REDIS_PASSWORD=password

# Security
COOKIE_SECRET=long-random-string
COOKIE_NAME=admin_token

# Application
PORT=8080
NODE_ENV=production

# Seeding
ADMIN_USERNAME=DrBushraMirza
ADMIN_PASSWORD=secure-password
ADMIN_EMAIL=admin@example.com
```

### Development vs Production
- **Cookie Security**: Secure flag enabled in production
- **CORS Origins**: Configurable for different environments
- **Redis TLS**: Required for cloud Redis instances
- **Error Verbosity**: Detailed errors in development

## Integration Points

### Frontend Integration
- **Cookie-based Auth**: Seamless authentication state
- **RESTful API**: Standard HTTP methods and status codes
- **CORS Enabled**: Cross-origin requests supported
- **File URLs**: Direct Supabase storage URLs

### External Services
- **Supabase**: Database, authentication, and storage
- **Redis Cloud**: Optional caching layer
- **CDN Ready**: Public URLs for static assets

## Monitoring & Maintenance

### Health Checks
- **Application Health**: `GET /` endpoint
- **Database Connection**: Supabase client validation
- **Cache Status**: Redis connection monitoring

### Maintenance Tasks
- **Cache Cleanup**: Automatic TTL expiration
- **Log Rotation**: Application-level logging
- **Database Maintenance**: Handled by Supabase
- **Security Updates**: Regular dependency updates

## Future Enhancements

### Potential Improvements
1. **Rate Limiting**: Implement request throttling
2. **Pagination**: Add pagination to post listings
3. **Search**: Full-text search capabilities
4. **Analytics**: Enhanced affiliate tracking
5. **Backup**: Automated database backups
6. **Monitoring**: Application performance monitoring
7. **Testing**: Unit and integration test suite
8. **Documentation**: API documentation with OpenAPI/Swagger

This architecture provides a solid foundation for a content management system with modern security practices, performance optimization, and scalability considerations.