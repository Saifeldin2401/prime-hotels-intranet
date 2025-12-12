/**
 * Mock Email Service for Development
 * 
 * This service simulates sending emails by logging them to the console.
 * In production, this would be replaced by a real email provider (e.g. Resend, SendGrid, AWS SES).
 */

interface EmailPayload {
    to: string;
    subject: string;
    body: string;
    metadata?: Record<string, any>;
}

export const mockEmailService = {
    sendEmail: async (payload: EmailPayload): Promise<boolean> => {
        console.group('📧 [MOCK EMAIL SERVICE] Sending Email 📧');
        console.log(`To: ${payload.to}`);
        console.log(`Subject: ${payload.subject}`);
        console.log(`Body: ${payload.body}`);
        if (payload.metadata) {
            console.log('Metadata:', payload.metadata);
        }
        console.groupEnd();

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return true;
    }
};
