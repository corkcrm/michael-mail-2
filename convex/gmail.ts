import { action, query, mutation } from "./_generated/server";
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

// Mutation to update user tokens after refresh
export const updateUserTokens = mutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    await ctx.db.patch(userId, {
      googleAccessToken: args.accessToken,
      tokenExpiresAt: args.expiresAt,
    });
  },
});

// Helper function to refresh Google access token
async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new ConvexError("Failed to refresh Google token");
  }

  return await response.json();
}

// Helper function to get a valid access token (refresh if needed)
async function getValidAccessToken(ctx: any, user: any): Promise<string> {
  // Check if token is expired or about to expire (5 minutes buffer)
  const now = Date.now() / 1000;
  const tokenExpiresAt = user.tokenExpiresAt || 0;
  
  if (tokenExpiresAt > now + 300) {
    // Token is still valid for more than 5 minutes
    return user.googleAccessToken;
  }

  // Token is expired or about to expire, refresh it
  if (!user.googleRefreshToken) {
    throw new ConvexError("No refresh token available. Please sign in again.");
  }

  try {
    const tokenData = await refreshGoogleToken(user.googleRefreshToken);
    const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
    
    // Update the tokens in the database
    await ctx.runMutation(api.gmail.updateUserTokens, {
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
    });
    
    return tokenData.access_token;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    throw new ConvexError("Failed to refresh Gmail access. Please sign in again.");
  }
}

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

    // Get a valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(ctx, user);

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
          // Token might have just expired, try one more time with a fresh token
          if (user.googleRefreshToken) {
            try {
              const tokenData = await refreshGoogleToken(user.googleRefreshToken);
              const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
              
              await ctx.runMutation(api.gmail.updateUserTokens, {
                accessToken: tokenData.access_token,
                expiresAt: newExpiresAt,
              });
              
              // Retry with new token
              const retryResponse = await fetch(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
                {
                  headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                  },
                }
              );
              
              if (retryResponse.ok) {
                const data = await retryResponse.json();
                // Continue processing with the new response
                return processEmailList(ctx, data, tokenData.access_token);
              }
            } catch (error) {
              console.error("Token refresh failed:", error);
            }
          }
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

// Helper function to process email list response
async function processEmailList(_ctx: any, listData: any, accessToken: string): Promise<EmailData[]> {
  const messages = listData.messages || [];
  const emails: EmailData[] = [];
  
  for (const msg of messages) {
    try {
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!detailResponse.ok) {
        console.error(`Failed to fetch message ${msg.id}: ${detailResponse.statusText}`);
        continue;
      }

      const messageData: GmailMessage = await detailResponse.json();
      const headers = messageData.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      const fromHeader = getHeader("From");
      const senderMatch = fromHeader.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/);
      const senderName = senderMatch ? senderMatch[1].trim() : fromHeader;
      const senderEmail = senderMatch && senderMatch[2] ? senderMatch[2] : fromHeader;

      const date = new Date(parseInt(messageData.internalDate || "0"));

      emails.push({
        id: messageData.id,
        sender: senderName || senderEmail,
        senderEmail: senderEmail,
        subject: getHeader("Subject") || "(no subject)",
        preview: messageData.snippet || "",
        time: date.toISOString(),
        read: !messageData.labelIds?.includes("UNREAD"),
      });
    } catch (error) {
      console.error(`Error processing message ${msg.id}:`, error);
    }
  }

  return emails;
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

    // Get a valid access token (refresh if needed)
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(ctx, user);
    } catch (error) {
      console.error("Failed to get valid access token:", error);
      return { synced: 0, error: "Failed to refresh Gmail access. Please sign in again." };
    }
    
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
      let listResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Handle 401 error with token refresh retry
      if (!listResponse.ok && listResponse.status === 401 && user.googleRefreshToken) {
        try {
          console.log("Access token expired, attempting to refresh...");
          const tokenData = await refreshGoogleToken(user.googleRefreshToken);
          const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
          
          await ctx.runMutation(api.gmail.updateUserTokens, {
            accessToken: tokenData.access_token,
            expiresAt: newExpiresAt,
          });
          
          accessToken = tokenData.access_token;
          
          // Retry with new token
          listResponse = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          throw new ConvexError("Gmail access expired. Please sign in again.");
        }
      }

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
      
      // Fetch all messages in parallel for better performance
      const messagePromises = messages.map(async (msg: { id: string }) => {
        try {
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
            return null;
          }

          const messageData: GmailMessage = await detailResponse.json();
          return messageData;
        } catch (error) {
          console.error(`Error fetching message ${msg.id}:`, error);
          return null;
        }
      });

      // Wait for all fetches to complete
      const messageResults = await Promise.all(messagePromises);
      
      // Process each successfully fetched message
      for (const messageData of messageResults) {
        if (!messageData) continue; // Skip failed fetches
        
        // Extract headers
        const headers = messageData.payload?.headers || [];
        const getHeader = (name: string) => 
          headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
        
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
          isImportant: messageData.labelIds?.includes("IMPORTANT") || false,
          isSpam: messageData.labelIds?.includes("SPAM") || false,
          isTrash: messageData.labelIds?.includes("TRASH") || false,
          isDraft: messageData.labelIds?.includes("DRAFT") || false,
        });
        
        // Extract and store attachments (batch these later for better performance)
        const attachments = extractAttachments(messageData);
        // Store attachments in parallel instead of sequentially
        const attachmentPromises = attachments.map(attachment => 
          ctx.runMutation(api.emails.addAttachment, {
            emailId,
            ...attachment,
          })
        );
        await Promise.all(attachmentPromises);
        
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

// Helper function to create a MIME message
function createMimeMessage(params: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  from: string;
}): string {
  const boundary = "boundary_" + Math.random().toString(36).substring(2);
  
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
  ];
  
  if (params.cc) {
    headers.push(`Cc: ${params.cc}`);
  }
  
  if (params.bcc) {
    headers.push(`Bcc: ${params.bcc}`);
  }
  
  headers.push(
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.body,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.body.replace(/\n/g, "<br/>"),
    "",
    `--${boundary}--`
  );
  
  return headers.join("\r\n");
}

// Action to send an email via Gmail
export const sendEmail = action({
  args: {
    to: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      // Get the current user with their OAuth tokens
      const user = await ctx.runQuery(api.gmail.getCurrentUserWithTokens);
      
      if (!user) {
        throw new ConvexError("Not authenticated. Please sign in again.");
      }
      
      if (!user.googleAccessToken) {
        throw new ConvexError("No Gmail access. Please sign in with Google.");
      }
      
      // Get a valid access token (refresh if needed)
      let accessToken: string;
      try {
        accessToken = await getValidAccessToken(ctx, user);
      } catch (error) {
        console.error("Failed to get valid access token:", error);
        return { success: false, error: "Failed to refresh Gmail access. Please sign in again." };
      }
      
      // Create the MIME message
      const mimeMessage = createMimeMessage({
        from: user.email || "me",
        to: args.to,
        cc: args.cc,
        bcc: args.bcc,
        subject: args.subject,
        body: args.body,
      });
      
      // Convert to base64url encoding
      // Use btoa for base64 encoding (available in Convex runtime)
      const base64 = btoa(unescape(encodeURIComponent(mimeMessage)));
      const encodedMessage = base64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      
      // Send the email via Gmail API
      let response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw: encodedMessage,
          }),
        }
      );
      
      // Handle 401 error with token refresh retry
      if (!response.ok && response.status === 401 && user.googleRefreshToken) {
        try {
          console.log("Access token expired during send, attempting to refresh...");
          const tokenData = await refreshGoogleToken(user.googleRefreshToken);
          const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
          
          await ctx.runMutation(api.gmail.updateUserTokens, {
            accessToken: tokenData.access_token,
            expiresAt: newExpiresAt,
          });
          
          accessToken = tokenData.access_token;
          
          // Retry with new token
          response = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                raw: encodedMessage,
              }),
            }
          );
        } catch (refreshError) {
          console.error("Token refresh failed during send:", refreshError);
          return { success: false, error: "Gmail access expired. Please sign in again." };
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send email:", response.status, errorText);
        return { 
          success: false, 
          error: `Failed to send email: ${response.statusText}` 
        };
      }
      
      const result = await response.json();
      
      // Store the sent email in our database
      try {
        // Fetch the sent message details to store it
        const sentMessageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${result.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        if (sentMessageResponse.ok) {
          const sentMessage: GmailMessage = await sentMessageResponse.json();
          
          // Store in database
          await ctx.runMutation(api.emails.upsertEmail, {
            gmailId: sentMessage.id,
            gmailThreadId: sentMessage.threadId,
            subject: args.subject,
            snippet: sentMessage.snippet || args.body.substring(0, 100),
            internalDate: parseInt(sentMessage.internalDate || Date.now().toString()),
            historyId: sentMessage.historyId || "",
            sizeEstimate: sentMessage.sizeEstimate || 0,
            from: user.name || user.email || "me",
            fromEmail: user.email || "",
            to: args.to.split(",").map(e => e.trim()),
            cc: args.cc ? args.cc.split(",").map(e => e.trim()) : undefined,
            bcc: args.bcc ? args.bcc.split(",").map(e => e.trim()) : undefined,
            replyTo: user.email,
            bodyHtml: args.body.replace(/\n/g, "<br/>"),
            bodyPlain: args.body,
            isRead: true,
            isImportant: false,
            isSpam: false,
            isTrash: false,
            isDraft: false,
          });
        }
      } catch (error) {
        // Log but don't fail if we can't store the sent message
        console.error("Failed to store sent message:", error);
      }
      
      return { 
        success: true, 
        messageId: result.id 
      };
    } catch (error) {
      console.error("Error sending email:", error);
      if (error instanceof ConvexError) {
        return { success: false, error: error.data };
      }
      return { success: false, error: "Failed to send email" };
    }
  },
});