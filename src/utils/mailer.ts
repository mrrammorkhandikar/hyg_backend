import * as nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';

dotenv.config();

interface GmailTransporterOptions {
  user: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

/**
 * Create a reusable Gmail transporter using Nodemailer + OAuth2
 * with automatic access token refresh
 */
export function createGmailTransporter(): any {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error('Missing required Gmail OAuth2 environment variables');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: process.env.GMAIL_ACCESS_TOKEN || undefined,
    },
  });

  return transporter;
}

/**
 * Create SMTP transporter as fallback option
 */
export function createSMTPTransporter(): any {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Missing required SMTP environment variables');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Create the best available transporter (SMTP first, OAuth2 fallback)
 */
export function createTransporter(): any {
  // Check if SMTP credentials are available
  const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;
  const hasOAuth2 = process.env.GMAIL_USER && process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN;

  console.log('🔧 Creating email transporter...');
  console.log('SMTP available:', hasSMTP);
  console.log('OAuth2 available:', hasOAuth2);

  if (hasSMTP) {
    console.log('📧 Trying SMTP transport first...');
    try {
      const transporter = createSMTPTransporter();
      console.log('✅ SMTP transporter created successfully');
      return transporter;
    } catch (smtpError) {
      console.error('❌ SMTP transporter creation failed:', smtpError);
      console.log('🔄 Trying Gmail OAuth2 fallback...');
      if (hasOAuth2) {
        try {
          const transporter = createGmailTransporter();
          console.log('✅ Gmail OAuth2 transporter created successfully');
          return transporter;
        } catch (oauthError) {
          console.error('❌ Gmail OAuth2 transporter creation failed:', (oauthError as Error).message);
          throw oauthError;
        }
      } else {
        console.error('❌ SMTP failed and no OAuth2 fallback configured');
        throw new Error('SMTP failed and no OAuth2 fallback configured');
      }
    }
  } else if (hasOAuth2) {
    console.log('📧 Using Gmail OAuth2 transport (SMTP not configured)');
    try {
      const transporter = createGmailTransporter();
      console.log('✅ Gmail OAuth2 transporter created successfully');
      return transporter;
    } catch (oauthError) {
      console.error('❌ Gmail OAuth2 transporter creation failed:');
      throw oauthError;
    }
  } else {
    const error = new Error('No email transport method configured (neither SMTP nor OAuth2)');
    console.error('❌', error.message);
    throw error;
  }
}

/**
 * Get a fresh access token using the refresh token
 */
export async function getFreshAccessToken(): Promise<string> {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error('Missing required Gmail OAuth2 environment variables');
  }

  const oauth2Client = new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials.access_token || '';
}

/**
 * Refresh access token and update transporter if needed
 */
export async function refreshAccessTokenIfNeeded(transporter: any): Promise<void> {
  try {
    // Try to send a test email to check if current token is valid
    await transporter.verify();
  } catch (error) {
    // If verification fails, refresh the access token
    console.log('🔄 Refreshing Gmail access token...');
    const freshAccessToken = await getFreshAccessToken();

    // Update the transporter with the new access token
    const transporterConfig = transporter.options as any;
    transporterConfig.auth.accessToken = freshAccessToken;

    // Update the transporter
    transporter.close();
    const newTransporter = nodemailer.createTransport(transporterConfig);
    Object.assign(transporter, newTransporter);
  }
}

/**
 * Create a Gmail transporter with fresh access token
 */
export async function createGmailTransporterWithToken(): Promise<any> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error('Missing required Gmail OAuth2 environment variables');
  }

  // Get a fresh access token
  const accessToken = await getFreshAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });

  return transporter;
}
