import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom field.
    favoriteColor: v.optional(v.string()),
    // OAuth tokens for Gmail API access
    googleAccessToken: v.optional(v.string()),
    googleRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  messages: defineTable({
    userId: v.id("users"),
    body: v.string(),
  }),
  
  // Email storage tables
  emails: defineTable({
    gmailId: v.string(),
    gmailThreadId: v.string(),
    userId: v.id("users"),
    
    // Core metadata
    subject: v.string(),
    snippet: v.string(),
    internalDate: v.number(),
    historyId: v.string(),
    sizeEstimate: v.number(),
    
    // Sender/recipient info
    from: v.string(),
    fromEmail: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    replyTo: v.optional(v.string()),
    
    // Content
    bodyHtml: v.optional(v.string()),
    bodyPlain: v.optional(v.string()),
    
    // Status flags
    isRead: v.boolean(),
    isStarred: v.boolean(),
    isImportant: v.boolean(),
    isSpam: v.boolean(),
    isTrash: v.boolean(),
    isDraft: v.boolean(),
    
    // AI-enhanced fields
    aiCategory: v.optional(v.string()),
    aiPriority: v.optional(v.number()),
    aiSummary: v.optional(v.string()),
    aiSentiment: v.optional(v.string()),
    
    // Sync metadata
    lastSyncedAt: v.number(),
    syncStatus: v.string(),
  })
    .index("userId", ["userId"])
    .index("gmailId", ["gmailId"])
    .index("gmailThreadId", ["gmailThreadId"])
    .index("userDate", ["userId", "internalDate"]),
  
  threads: defineTable({
    gmailThreadId: v.string(),
    userId: v.id("users"),
    subject: v.string(),
    snippet: v.string(),
    lastMessageDate: v.number(),
    messageCount: v.number(),
    participantEmails: v.array(v.string()),
    isRead: v.boolean(),
    hasAttachments: v.boolean(),
    
    // AI-enhanced
    aiTopicSummary: v.optional(v.string()),
    aiActionRequired: v.optional(v.boolean()),
  })
    .index("userId", ["userId"])
    .index("gmailThreadId", ["gmailThreadId"])
    .index("userDate", ["userId", "lastMessageDate"]),
  
  attachments: defineTable({
    emailId: v.id("emails"),
    gmailAttachmentId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    contentId: v.optional(v.string()),
    storageUrl: v.optional(v.string()),
    
    // AI-enhanced
    aiContentSummary: v.optional(v.string()),
    aiIsImportant: v.optional(v.boolean()),
  })
    .index("emailId", ["emailId"]),
  
  labels: defineTable({
    gmailLabelId: v.optional(v.string()),
    userId: v.id("users"),
    name: v.string(),
    type: v.string(), // 'system' or 'user'
    color: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
    
    // Stats
    totalMessages: v.number(),
    unreadMessages: v.number(),
    
    // AI-enhanced
    aiAutoApplyRules: v.optional(v.string()),
  })
    .index("userId", ["userId"])
    .index("gmailLabelId", ["gmailLabelId"]),
  
  emailLabels: defineTable({
    emailId: v.id("emails"),
    labelId: v.id("labels"),
  })
    .index("emailId", ["emailId"])
    .index("labelId", ["labelId"])
    .index("emailLabel", ["emailId", "labelId"]),
  
  emailHeaders: defineTable({
    emailId: v.id("emails"),
    name: v.string(),
    value: v.string(),
  })
    .index("emailId", ["emailId"])
    .index("emailName", ["emailId", "name"]),
  
  syncState: defineTable({
    userId: v.id("users"),
    lastHistoryId: v.string(),
    lastSyncTime: v.number(),
    nextPageToken: v.optional(v.string()),
    syncStatus: v.string(),
  })
    .index("userId", ["userId"]),
});
