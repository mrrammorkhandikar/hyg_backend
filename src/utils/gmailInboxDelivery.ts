import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';

dotenv.config();

interface GmailInboxOptions {
  messageId: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Gmail API integration for inbox delivery management
 * Can modify labels and ensure emails go to inbox
 */
export class GmailInboxDelivery {
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor() {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      throw new Error('Missing Gmail OAuth2 credentials');
    }

    this.oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
  }

  /**
   * Initialize Gmail API with access token
   */
  private async initializeGmail(accessToken: string, refreshToken: string): Promise<void> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Refresh token if needed
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.log('Using existing access token');
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Ensure email goes to inbox by modifying labels
   * Removes SPAM label and adds INBOX label if needed
   */
  public async ensureInboxDelivery(options: GmailInboxOptions): Promise<void> {
    try {
      await this.initializeGmail(options.accessToken, options.refreshToken);

      // Get message details
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: options.messageId,
        format: 'minimal'
      });

      const labels = message.data.labelIds || [];

      // Check if message is in spam
      const hasSpamLabel = labels.includes('SPAM');
      const hasInboxLabel = labels.includes('INBOX');

      if (hasSpamLabel && !hasInboxLabel) {
        // Remove SPAM label and add INBOX label
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: options.messageId,
          requestBody: {
            addLabelIds: ['INBOX'],
            removeLabelIds: ['SPAM']
          }
        });

        console.log(`✅ Moved email ${options.messageId} from SPAM to INBOX`);
      } else if (!hasInboxLabel) {
        // Add INBOX label if not present
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: options.messageId,
          requestBody: {
            addLabelIds: ['INBOX']
          }
        });

        console.log(`✅ Added INBOX label to email ${options.messageId}`);
      } else {
        console.log(`ℹ️ Email ${options.messageId} is already in INBOX`);
      }

    } catch (error) {
      console.error('❌ Failed to modify email labels:', error);
      throw new Error('Failed to ensure inbox delivery');
    }
  }

  /**
   * Mark email as important (star it)
   */
  public async markAsImportant(messageId: string, accessToken: string, refreshToken: string): Promise<void> {
    try {
      await this.initializeGmail(accessToken, refreshToken);

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['IMPORTANT', 'STARRED']
        }
      });

      console.log(`⭐ Marked email ${messageId} as important`);
    } catch (error) {
      console.error('❌ Failed to mark email as important:', error);
    }
  }

  /**
   * Get fresh access token
   */
  public static async getFreshAccessToken(refreshToken: string): Promise<string> {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !refreshToken) {
      throw new Error('Missing required Gmail OAuth2 credentials');
    }

    const oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token || '';
  }
}

/**
 * Helper function to ensure inbox delivery with automatic token refresh
 */
export async function ensureEmailInboxDelivery(messageId: string): Promise<void> {
  try {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.log('⚠️ No Gmail refresh token available, skipping inbox delivery assurance');
      return;
    }

    const accessToken = await GmailInboxDelivery.getFreshAccessToken(process.env.GMAIL_REFRESH_TOKEN);

    const gmailDelivery = new GmailInboxDelivery();
    await gmailDelivery.ensureInboxDelivery({
      messageId,
      accessToken,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN
    });

  } catch (error) {
    console.error('❌ Inbox delivery assurance failed:', error);
    // Don't throw error - email was sent successfully, this is just a bonus feature
  }
}

/**
 * Helper function to mark email as important
 */
export async function markEmailAsImportant(messageId: string): Promise<void> {
  try {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.log('⚠️ No Gmail refresh token available, skipping importance marking');
      return;
    }

    const accessToken = await GmailInboxDelivery.getFreshAccessToken(process.env.GMAIL_REFRESH_TOKEN);

    const gmailDelivery = new GmailInboxDelivery();
    await gmailDelivery.markAsImportant(messageId, accessToken, process.env.GMAIL_REFRESH_TOKEN);

  } catch (error) {
    console.error('❌ Failed to mark email as important:', error);
    // Don't throw error - email was sent successfully
  }
}