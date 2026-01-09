# Gmail OAuth2 Email System

A complete Node.js + TypeScript setup for sending emails using Nodemailer with Gmail OAuth2.

## Features

- ✅ **Gmail OAuth2 Authentication** - No passwords, only refresh tokens
- ✅ **One-Click OAuth Setup** - Easy refresh token generation
- ✅ **Automatic Token Refresh** - Handles expired access tokens
- ✅ **Rate-Limited Email Queue** - 1 email per minute (safe for 300 emails/day)
- ✅ **Production-Ready** - Stable for cron jobs and automated emails
- ✅ **TypeScript Support** - Full type safety

## Project Structure

```
backend/
├── .env.example                # Environment variable template
├── get-gmail-refresh-token.ts  # One-click OAuth script
├── test-email-system.ts        # Test script
├── src/utils/
│   ├── mailer.ts               # Gmail transporter
│   ├── sendEmail.ts            # Generic email sender
│   ├── emailQueue.ts           # Rate-limited queue
│   └── welcomeEmail.ts         # Example email
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add authorized redirect URI: `http://localhost:3000/oauth2callback`
7. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory based on `.env.example`:

```env
# Gmail OAuth2 Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

### 4. Get Refresh Token

Run the one-click OAuth script:

```bash
cd backend
node get-gmail-refresh-token.ts
```

This will:
1. Open your browser to Google's OAuth consent screen
2. Request the required permissions
3. Automatically handle the OAuth callback
4. Save the refresh token to your `.env` file

### 5. Test the Email System

```bash
cd backend
node test-email-system.ts
```

## Usage Examples

### Send a Basic Email

```typescript
import { sendEmail } from './src/utils/sendEmail';

await sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello World',
  html: '<p>This is a test email</p>',
  from: 'your-email@gmail.com'
});
```

### Send a Welcome Email

```typescript
import { sendWelcomeEmail } from './src/utils/welcomeEmail';

await sendWelcomeEmail({
  email: 'newuser@example.com',
  name: 'John Doe'
});
```

### Use the Email Queue

```typescript
import { emailQueue } from './src/utils/emailQueue';

// Add emails to the queue (automatically rate-limited)
await emailQueue.enqueue({
  to: 'user1@example.com',
  subject: 'Email 1',
  html: '<p>First email</p>'
});

await emailQueue.enqueue({
  to: 'user2@example.com',
  subject: 'Email 2',
  html: '<p>Second email</p>'
});

// Check queue status
console.log(`Queue length: ${emailQueue.getQueueLength()}`);
```

## Rate Limiting

The system implements a **1 email per minute** rate limit to stay within Gmail's sending limits:

- ✅ Safe for up to **300 emails/day**
- ✅ Automatic queue processing
- ✅ Background processing
- ✅ Error handling and retries

## Production Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Error Handling**: The system automatically handles token refresh failures
3. **Logging**: Detailed console logs for monitoring
4. **Cron Jobs**: Safe to use in scheduled tasks
5. **Scalability**: Can handle multiple email queues if needed

## Troubleshooting

### Missing Environment Variables

```bash
Error: Missing required Gmail OAuth2 environment variables
```

**Solution**: Create a `.env` file with all required variables.

### OAuth Consent Screen Issues

If you get OAuth consent screen errors:

1. Ensure your Google Cloud project has the correct OAuth consent screen configuration
2. Add your email as a test user in the OAuth consent screen settings
3. Make sure the redirect URI matches exactly

### Rate Limit Issues

If emails are being delayed:

- This is expected behavior due to the 1 email per minute rate limit
- Check the console logs for queue processing status
- For higher volume, consider using a dedicated email service

## Security Best Practices

1. **Never commit secrets**: Add `.env` to your `.gitignore`
2. **Use separate Gmail accounts**: For production vs development
3. **Monitor usage**: Check Gmail sending limits regularly
4. **Rotate refresh tokens**: Periodically generate new refresh tokens
5. **Limit permissions**: Only request the minimum required scopes

## License

This email system is provided as-is for educational and production use. Follow Google's [Gmail API Terms of Service](https://developers.google.com/gmail/api/tos) when using this system.
