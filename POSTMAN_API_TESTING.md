# Dr. Bushra Mirzah Blog API - Postman Testing Guide

**Base URL**: `https://hyg-backend.onrender.com`

## Authentication

Most endpoints require authentication. After logging in, include the `admin_token` cookie in subsequent requests.

### 🚀 Quick Start Test

**Method**: GET
**URL**: `{{base_url}}/health`

**Expected Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-16T08:33:44.189Z",
  "uptime": 100.062463784
}
```

---

## 📚 API Endpoints Collection

### 1. Authentication Routes (`/auth`)

#### Login Admin
**Method**: POST
**URL**: `{{base_url}}/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "username": "DrBushraMirza",
  "password": "your_admin_password"
}
```

**Expected Response** (200):
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "DrBushraMirza"
  }
}
```
**Note**: Sets `admin_token` cookie automatically

#### Verify Admin Session
**Method**: GET
**URL**: `{{base_url}}/auth/verify`

**Headers**:
```
Cookie: admin_token=your_token_here
```

**Expected Response** (200):
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "DrBushraMirza"
  }
}
```

### 2. Posts Routes (`/posts`)

#### Get All Posts
**Method**: GET
**URL**: `{{base_url}}/posts`

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "title": "Sample Blog Post",
    "slug": "sample-blog-post",
    "content": "<p>Blog content...</p>",
    "excerpt": "Blog excerpt...",
    "author_id": 1,
    "status": "published",
    "created_at": "2025-11-16T08:30:00Z",
    "updated_at": "2025-11-16T08:30:00Z"
  }
]
```

#### Get Single Post
**Method**: GET
**URL**: `{{base_url}}/posts/1` (replace 1 with actual post ID)

**Expected Response** (200):
```json
{
  "id": 1,
  "title": "Sample Blog Post",
  "slug": "sample-blog-post",
  "content": "<p>Full blog content...</p>",
  "excerpt": "Blog excerpt...",
  "author_id": 1,
  "status": "published",
  "created_at": "2025-11-16T08:30:00Z",
  "updated_at": "2025-11-16T08:30:00Z"
}
```

#### Create New Post (Admin Only)
**Method**: POST
**URL**: `{{base_url}}/posts`

**Headers**:
```
Content-Type: application/json
Cookie: admin_token=your_token_here
```

**Body** (raw JSON):
```json
{
  "title": "New Blog Post",
  "content": "<p>This is a new blog post content.</p>",
  "excerpt": "Short description of the post",
  "author_id": 1,
  "status": "draft"
}
```

**Expected Response** (201):
```json
{
  "id": 2,
  "title": "New Blog Post",
  "slug": "new-blog-post",
  "content": "<p>This is a new blog post content.</p>",
  "excerpt": "Short description of the post",
  "author_id": 1,
  "status": "draft",
  "created_at": "2025-11-16T08:35:00Z",
  "updated_at": "2025-11-16T08:35:00Z"
}
```

### 3. Categories Routes (`/categories`)

#### Get All Categories
**Method**: GET
**URL**: `{{base_url}}/categories`

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "name": "Health",
    "slug": "health",
    "description": "Health related articles"
  }
]
```

### 4. Authors Routes (`/authors`)

#### Get All Authors
**Method**: GET
**URL**: `{{base_url}}/authors`

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "name": "Dr. Bushra Mirzah",
    "bio": "Dental health expert",
    "email": "drbushra@example.com"
  }
]
```

### 5. Tags Routes (`/tags`)

#### Get All Tags
**Method**: GET
**URL**: `{{base_url}}/tags`

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "name": "Dental Care",
    "type": "content"
  }
]
```

### 6. Comments Routes (`/comments`)

#### Get Comments for Post
**Method**: GET
**URL**: `{{base_url}}/comments/post/1` (replace 1 with post ID)

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "post_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "comment": "Great article!",
    "created_at": "2025-11-16T08:40:00Z"
  }
]
```

#### Add Comment
**Method**: POST
**URL**: `{{base_url}}/comments`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "post_id": 1,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "comment": "Very informative post!"
}
```

**Expected Response** (201):
```json
{
  "id": 2,
  "post_id": 1,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "comment": "Very informative post!",
  "created_at": "2025-11-16T08:45:00Z"
}
```

### 7. Likes Routes (`/likes`)

#### Get Like Count for Post
**Method**: GET
**URL**: `{{base_url}}/likes/post/1` (replace 1 with post ID)

**Expected Response** (200):
```json
{
  "post_id": 1,
  "like_count": 15,
  "user_liked": false
}
```

#### Add Like to Post
**Method**: POST
**URL**: `{{base_url}}/likes`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "post_id": 1
}
```

**Expected Response** (201):
```json
{
  "post_id": 1,
  "like_count": 16,
  "user_liked": true
}
```

### 8. Contact Routes (`/contact`)

#### Submit Contact Form
**Method**: POST
**URL**: `{{base_url}}/contact`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I would like to schedule an appointment."
}
```

**Expected Response** (201):
```json
{
  "message": "Contact form submitted successfully"
}
```

### 9. Images Routes (`/images`)

#### Get Images List
**Method**: GET
**URL**: `{{base_url}}/images`

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "filename": "clinic.jpg",
    "url": "https://example.com/images/clinic.jpg",
    "uploaded_at": "2025-11-16T08:30:00Z"
  }
]
```

### 10. Affiliate Links Routes (`/affiliate-links`)

#### Get All Affiliate Links (Admin Only)
**Method**: GET
**URL**: `{{base_url}}/affiliate-links`

**Headers**:
```
Cookie: admin_token=your_token_here
```

**Expected Response** (200):
```json
[
  {
    "id": 1,
    "title": "Dental Product Link",
    "url": "https://example.com/affiliate/product",
    "clicks": 25,
    "created_at": "2025-11-16T08:30:00Z"
  }
]
```

## 🔧 Postman Environment Setup

Create a new Environment in Postman called "Dr. Bushra Backend" with these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| base_url | https://hyg-backend.onrender.com | https://hyg-backend.onrender.com |
| admin_token |  | (will be set after login) |

## 📋 Testing Checklist

- [ ] Health check endpoint works
- [ ] Can login as admin successfully
- [ ] Can retrieve posts list
- [ ] Can view individual post
- [ ] Can submit comments
- [ ] Can add likes
- [ ] Can submit contact forms
- [ ] Categories endpoint works
- [ ] Authors endpoint works
- [ ] Tags endpoint works
- [ ] Admin-only endpoints require authentication

## 🚨 Important Notes

1. **CORS**: All endpoints allow requests from any origin
2. **Authentication**: Required for admin operations, uses cookies
3. **Rate Limiting**: Not implemented yet
4. **File Upload**: Use `/upload` or `/image-upload` for file operations
5. **Database**: Uses Supabase PostgreSQL
6. **Caching**: Uses Redis for performance

## 🔗 Frontend Integration

To connect your frontend, update API calls to use:
```
const API_BASE_URL = 'https://hyg-backend.onrender.com'
```

Example in frontend code:
```javascript
// Instead of localhost:8080, use:
const response = await fetch('https://hyg-backend.onrender.com/posts')
