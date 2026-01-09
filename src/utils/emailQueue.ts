import { sendEmail } from './sendEmail';

interface QueuedEmail {
  options: any;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

/**
 * Rate-limited email queue (1 email per minute)
 * Safe for sending up to 300 emails/day
 */
class EmailQueue {
  private queue: QueuedEmail[] = [];
  private isProcessing = false;
  private lastSentTime = 0;
  private readonly RATE_LIMIT_MS = 60 * 1000; // 1 minute

  /**
   * Add email to queue
   */
  public async enqueue(options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ options, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    if (this.queue.length === 0) return;

    const now = Date.now();
    const timeSinceLastEmail = now - this.lastSentTime;

    if (timeSinceLastEmail < this.RATE_LIMIT_MS) {
      // Wait until we can send the next email
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastEmail;
      console.log(`🕒 Waiting ${Math.ceil(waitTime / 1000)} seconds before sending next email (rate limit)`);

      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    this.isProcessing = true;

    const currentEmail = this.queue.shift();
    if (!currentEmail) {
      this.isProcessing = false;
      return;
    }

    try {
      console.log(`📤 Processing email to ${currentEmail.options.to}`);
      await sendEmail(currentEmail.options);
      this.lastSentTime = Date.now();
      currentEmail.resolve();
    } catch (error) {
      console.error(`❌ Failed to send email to ${currentEmail.options.to}:`, error);
      currentEmail.reject(error);
    } finally {
      this.isProcessing = false;
      // Process next email in queue
      this.processQueue();
    }
  }

  /**
   * Get current queue length
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  public clearQueue(): void {
    this.queue = [];
    this.isProcessing = false;
  }
}

// Singleton instance
export const emailQueue = new EmailQueue();
