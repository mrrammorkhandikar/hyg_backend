#!/usr/bin/env node
/**
 * One-Click Gmail OAuth Script (Port 3001)
 *
 * This script runs on port 3001 to avoid conflicts with the main server on port 3000.
 *
 * Usage: node get-gmail-refresh-token-port-3001.ts
 */

import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import open from 'open';

// Load environment variables
dotenv.config();

const PORT = 3001; // Changed from 3000 to avoid conflicts
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Create OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  REDIRECT_URI
);

// Create Express app for OAuth callback
const app = express();

app.get('/oauth2callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Print ONLY the refresh token clearly
    console.log('\n\x1b[32m%s\x1b[0m', '✅ SUCCESS: Gmail OAuth2 Refresh Token Obtained');
    console.log('\x1b[34m%s\x1b[0m', '🔑 Your Refresh Token:');
    console.log('\x1b[33m%s\x1b[0m', tokens.refresh_token);
    console.log('\x1b[34m%s\x1b[0m', '📝 The refresh token has been saved to your .env file');

    // Save to .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Update or add GMAIL_REFRESH_TOKEN
    const lines = envContent.split('\n');
    const updatedLines = lines.filter(line => !line.startsWith('GMAIL_REFRESH_TOKEN='));
    updatedLines.push(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);

    fs.writeFileSync(envPath, updatedLines.join('\n'));

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail OAuth2 Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
          h1 { color: #4CAF50; }
          .token { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all; }
          .instructions { text-align: left; margin-top: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Gmail OAuth2 Success!</h1>
          <p>Your refresh token has been obtained and saved to your .env file.</p>

          <div class="token">
            <strong>Refresh Token:</strong><br>
            ${tokens.refresh_token}
          </div>

          <div class="instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Close this browser window</li>
              <li>Check your terminal for the refresh token</li>
              <li>You can now use the email system with the refresh token</li>
            </ol>
          </div>

          <p>You can close this window and return to your terminal.</p>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Error exchanging code for tokens');
  } finally {
    // Close the server after handling the callback
    setTimeout(() => process.exit(0), 2000);
  }
});

async function startOAuthFlow() {
  try {
    // Check if required environment variables are set
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in your .env file');
      console.log('Please create a .env file based on .env.example and add your Google OAuth credentials');
      process.exit(1);
    }

    console.log('🔑 Starting Gmail OAuth2 flow...');
    console.log('📋 This will open your browser to authenticate with Google');
    console.log('⚠️  Using port 3001 to avoid conflicts with your main server on port 3000');

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    console.log('🌐 Opening browser for Google authentication...');

    // Open browser
    await open(authUrl);

    // Start server to listen for callback
    app.listen(PORT, () => {
      console.log(`🚀 Local server running on port ${PORT}`);
      console.log('🔄 Waiting for Google OAuth callback...');
      console.log('📝 After authenticating, you will be redirected back to this application');
    });

  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    process.exit(1);
  }
}

// Start the OAuth flow
startOAuthFlow().catch(console.error);
