import { action, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload?: {
    headers: Array<{
      name: string;
      value: string;
    }>;
  };
  internalDate?: string;
}

interface EmailData {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
  starred: boolean;
}

// Query to get the current user with their OAuth tokens
export const getCurrentUserWithTokens = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const fetchEmails = action({
  args: {},
  handler: async (ctx): Promise<EmailData[]> => {
    // Get the current user with their OAuth tokens
    const user = await ctx.runQuery(api.gmail.getCurrentUserWithTokens);
    
    if (!user) {
      throw new ConvexError("Not authenticated. Please sign in again.");
    }

    if (!user.googleAccessToken) {
      console.log("No Google access token found. User needs to re-authenticate with Google.");
      // Return empty array for now - user needs to sign in again with Google
      // to grant Gmail permissions
      return [];
    }

    const accessToken = user.googleAccessToken;

    try {
      // Fetch the list of message IDs from Gmail
      const listResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!listResponse.ok) {
        if (listResponse.status === 401) {
          throw new ConvexError("Gmail access expired. Please sign in again.");
        }
        throw new ConvexError(`Failed to fetch emails: ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      const messages = listData.messages || [];

      // Fetch details for each message
      const emailPromises = messages.map(async (msg: { id: string }) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!detailResponse.ok) {
          console.error(`Failed to fetch message ${msg.id}`);
          return null;
        }

        const messageData: GmailMessage = await detailResponse.json();
        return transformGmailMessage(messageData);
      });

      const emails = await Promise.all(emailPromises);
      
      // Filter out any failed fetches and return
      return emails.filter((email): email is EmailData => email !== null);
    } catch (error) {
      console.error("Error fetching Gmail messages:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to fetch emails from Gmail");
    }
  },
});

function transformGmailMessage(message: GmailMessage): EmailData {
  // Extract headers
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) => 
    headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  // Extract sender info
  const fromHeader = getHeader("From");
  const senderMatch = fromHeader.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/);
  const senderName = senderMatch ? senderMatch[1].trim() : fromHeader;
  const senderEmail = senderMatch && senderMatch[2] ? senderMatch[2] : fromHeader;

  // Format date
  const date = message.internalDate ? new Date(parseInt(message.internalDate)) : new Date();
  const timeString = formatEmailTime(date);

  return {
    id: message.id,
    sender: senderName || senderEmail,
    senderEmail: senderEmail,
    subject: getHeader("Subject") || "(no subject)",
    preview: message.snippet || "",
    time: timeString,
    read: !message.labelIds?.includes("UNREAD"),
    starred: message.labelIds?.includes("STARRED") || false,
  };
}

function formatEmailTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "Just now";
    return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    // Today - show time
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Show date for older emails
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}