# Gmail OAuth2 Setup Guide

## How to Run the Gmail Refresh Token Script

The `get-gmail-refresh-token.ts` file is a TypeScript script that needs to be run with the proper tools.

### Option 1: Using ts-node (Recommended)

If you have `ts-node` installed globally:

```bash
# Install ts-node if not already installed
npm install -g ts-node

# Run the script
ts-node get-gmail-refresh-token.ts
```

### Option 2: Using npx (No Installation Required)

```bash
# Run with npx
npx ts-node get-gmail-refresh-token.ts
```

### Option 3: Using npm script (If configured)

Check if there's a script in `package.json`:

```bash
# Check package.json for scripts
cat package.json | grep -A 10 "scripts"

# If there's a script like "oauth": "ts-node get-gmail-refresh-token.ts"
npm run oauth
```

### Option 4: Compile to JavaScript First

```bash
# Compile TypeScript to JavaScript
npx tsc get-gmail-refresh-token.ts --outDir . --target es2020

# Run the compiled JavaScript
node get-gmail-refresh-token.js
```

## Prerequisites

Before running the script, ensure you have:

1. **Google OAuth Credentials** in your `.env` file:
   ```
   GMAIL_CLIENT_ID=your_client_id_here
   GMAIL_CLIENT_SECRET=your_client_secret_here
   ```

2. **Required Dependencies** installed:
   ```bash
   npm install express googleapis google-auth-library open dotenv
   ```

3. **Node.js** version 14 or higher

## What the Script Does

1. **Opens Browser**: Automatically opens Google OAuth consent screen
2. **Requests Permission**: Asks for Gmail send permission
3. **Handles Callback**: Receives authorization code on localhost
4. **Exchanges Tokens**: Converts code to access and refresh tokens
5. **Saves Token**: Stores refresh token in `.env` file as `GMAIL_REFRESH_TOKEN`
6. **Displays Result**: Shows success message with the refresh token

## Expected Output

When successful, you should see:
```
🔑 Starting Gmail OAuth2 flow...
📋 This will open your browser to authenticate with Google
🌐 Opening browser for Google authentication...
🚀 Local server running on port 3000
🔄 Waiting for Google OAuth callback...
📝 After authenticating, you will be redirected back to this application

✅ SUCCESS: Gmail OAuth2 Refresh Token Obtained
🔑 Your Refresh Token:
[your-refresh-token-here]
📝 The refresh token has been saved to your .env file
```

## Troubleshooting

### Error: "Unknown file extension .ts"
**Solution**: Use `ts-node` instead of `node`:
```bash
ts-node get-gmail-refresh-token.ts
```

### Error: "GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set"
**Solution**: Add your Google OAuth credentials to `.env` file:
```
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
```

### Error: "Cannot find module"
**Solution**: Install missing dependencies:
```bash
npm install express googleapis google-auth-library open dotenv
```

### Browser Doesn't Open
**Solution**: Manually copy the auth URL from terminal output and paste it in your browser.

## Next Steps

After obtaining the refresh token:

1. **Verify .env file** contains `GMAIL_REFRESH_TOKEN`
2. **Test email system** with: `node test-email-system.ts`
3. **Test newsletter** with: `node test-newsletter.js`

The email system will now be able to send emails using your Gmail account!
