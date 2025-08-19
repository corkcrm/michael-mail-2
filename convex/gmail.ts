import { action, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

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
    parts?: MessagePart[];
    body?: {
      size: number;
      data?: string;
    };
    mimeType?: string;
  };
  internalDate?: string;
  historyId?: string;
  sizeEstimate?: number;
}

interface MessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers: Array<{
    name: string;
    value: string;
  }>;
  body: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: MessagePart[];
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

// Helper function to decode base64 in web environment
function decodeBase64(str: string): string {
  // Replace URL-safe characters with standard base64 characters
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  try {
    // Use atob for base64 decoding (available in web environments)
    const decoded = atob(base64);
    
    // Convert to proper UTF-8 string
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    
    // Use TextDecoder for proper UTF-8 decoding
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error('Error decoding base64:', e);
    return '';
  }
}

// Helper function to extract email body content
function extractEmailBody(message: GmailMessage): { html?: string; plain?: string } {
  const result: { html?: string; plain?: string } = {};
  
  function extractFromPart(part: MessagePart | typeof message.payload): void {
    if (!part) return;
    
    // Check direct body data
    if ('body' in part && part.body?.data) {
      if (part.mimeType === 'text/html') {
        result.html = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/plain') {
        result.plain = decodeBase64(part.body.data);
      }
    }
    
    // Recursively check parts
    if ('parts' in part && part.parts) {
      for (const subPart of part.parts) {
        extractFromPart(subPart);
      }
    }
  }
  
  if (message.payload) {
    extractFromPart(message.payload);
  }
  
  return result;
}

// Helper function to extract attachments
function extractAttachments(message: GmailMessage): Array<{
  gmailAttachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}> {
  const attachments: Array<{
    gmailAttachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }> = [];
  
  function checkPart(part: MessagePart): void {
    if (part.body?.attachmentId && part.filename) {
      attachments.push({
        gmailAttachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
      });
    }
    
    if (part.parts) {
      for (const subPart of part.parts) {
        checkPart(subPart);
      }
    }
  }
  
  if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      checkPart(part);
    }
  }
  
  return attachments;
}

// Helper function to parse email addresses from header
function parseEmailAddresses(headerValue: string): string[] {
  if (!headerValue) return [];
  
  // Split by comma and clean up
  return headerValue
    .split(',')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0);
}

// Action to sync emails from Gmail to database

export const syncEmails = action({
  args: {
    fullSync: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ synced: number; hasMore?: boolean; error?: string }> => {
    const user = await ctx.runQuery(api.gmail.getCurrentUserWithTokens);
    
    if (!user) {
      throw new ConvexError("Not authenticated. Please sign in again.");
    }

    if (!user.googleAccessToken) {
      console.log("No Google access token found. User needs to re-authenticate with Google.");
      return { synced: 0, error: "No Gmail access" };
    }

    const accessToken = user.googleAccessToken;
    
    try {
      // Always fetch the latest emails first (don't use pageToken for regular syncs)
      // This ensures we always get the newest emails on refresh
      let url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50";
      
      // Only use pageToken if explicitly doing a full sync continuation
      if (args.fullSync) {
        const syncState = await ctx.runQuery(api.emails.getSyncState);
        if (syncState?.nextPageToken) {
          url += `&pageToken=${syncState.nextPageToken}`;
        }
      }
      
      // Fetch message list
      const listResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!listResponse.ok) {
        if (listResponse.status === 401) {
          throw new ConvexError("Gmail access expired. Please sign in again.");
        }
        throw new ConvexError(`Failed to fetch emails: ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      const messages = listData.messages || [];
      const nextPageToken = listData.nextPageToken;
      
      let syncedCount = 0;
      const threads = new Map<string, any>();
      
      // Fetch and store each message
      for (const msg of messages) {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!detailResponse.ok) {
          console.error(`Failed to fetch message ${msg.id}`);
          continue;
        }

        const messageData: GmailMessage = await detailResponse.json();
        
        // Extract headers
        const headers = messageData.payload?.headers || [];
        const getHeader = (name: string) => 
          headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
        
        // Extract sender info
        const fromHeader = getHeader("From");
        const senderMatch = fromHeader.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/);
        const senderName = senderMatch ? senderMatch[1].trim() : fromHeader;
        const senderEmail = senderMatch && senderMatch[2] ? senderMatch[2] : fromHeader;
        
        // Extract body content
        const bodyContent = extractEmailBody(messageData);
        
        // Parse recipients
        const to = parseEmailAddresses(getHeader("To"));
        const cc = parseEmailAddresses(getHeader("Cc"));
        const bcc = parseEmailAddresses(getHeader("Bcc"));
        
        // Store email
        const emailId = await ctx.runMutation(api.emails.upsertEmail, {
          gmailId: messageData.id,
          gmailThreadId: messageData.threadId,
          subject: getHeader("Subject") || "(no subject)",
          snippet: messageData.snippet || "",
          internalDate: parseInt(messageData.internalDate || "0"),
          historyId: messageData.historyId || "",
          sizeEstimate: messageData.sizeEstimate || 0,
          from: senderName || senderEmail,
          fromEmail: senderEmail,
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          replyTo: getHeader("Reply-To") || undefined,
          bodyHtml: bodyContent.html,
          bodyPlain: bodyContent.plain,
          isRead: !messageData.labelIds?.includes("UNREAD"),
          isStarred: messageData.labelIds?.includes("STARRED") || false,
          isImportant: messageData.labelIds?.includes("IMPORTANT") || false,
          isSpam: messageData.labelIds?.includes("SPAM") || false,
          isTrash: messageData.labelIds?.includes("TRASH") || false,
          isDraft: messageData.labelIds?.includes("DRAFT") || false,
        });
        
        // Extract and store attachments
        const attachments = extractAttachments(messageData);
        for (const attachment of attachments) {
          await ctx.runMutation(api.emails.addAttachment, {
            emailId,
            ...attachment,
          });
        }
        
        // Track thread info for aggregation
        if (!threads.has(messageData.threadId)) {
          threads.set(messageData.threadId, {
            gmailThreadId: messageData.threadId,
            subject: getHeader("Subject") || "(no subject)",
            snippet: messageData.snippet || "",
            lastMessageDate: parseInt(messageData.internalDate || "0"),
            messageCount: 1,
            participantEmails: [senderEmail, ...to],
            isRead: !messageData.labelIds?.includes("UNREAD"),
            hasAttachments: attachments.length > 0,
          });
        } else {
          const thread = threads.get(messageData.threadId);
          thread.messageCount++;
          thread.lastMessageDate = Math.max(
            thread.lastMessageDate,
            parseInt(messageData.internalDate || "0")
          );
          thread.isRead = thread.isRead && !messageData.labelIds?.includes("UNREAD");
          thread.hasAttachments = thread.hasAttachments || attachments.length > 0;
          
          // Add unique participants
          const allParticipants = new Set([...thread.participantEmails, senderEmail, ...to]);
          thread.participantEmails = Array.from(allParticipants);
        }
        
        syncedCount++;
      }
      
      // Upsert threads
      for (const thread of threads.values()) {
        await ctx.runMutation(api.emails.upsertThread, thread);
      }
      
      // Update sync state
      if (listData.resultSizeEstimate > 0) {
        await ctx.runMutation(api.emails.updateSyncState, {
          lastHistoryId: listData.historyId || "",
          nextPageToken,
          syncStatus: nextPageToken ? "partial" : "complete",
        });
      }
      
      return { synced: syncedCount, hasMore: !!nextPageToken };
    } catch (error) {
      console.error("Error syncing Gmail messages:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to sync emails from Gmail");
    }
  },
});