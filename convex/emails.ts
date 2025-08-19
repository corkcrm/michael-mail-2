import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// Mutation to upsert an email (insert or update)
export const upsertEmail = mutation({
  args: {
    gmailId: v.string(),
    gmailThreadId: v.string(),
    subject: v.string(),
    snippet: v.string(),
    internalDate: v.number(),
    historyId: v.string(),
    sizeEstimate: v.number(),
    from: v.string(),
    fromEmail: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    replyTo: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    bodyPlain: v.optional(v.string()),
    isRead: v.boolean(),
    isStarred: v.boolean(),
    isImportant: v.boolean(),
    isSpam: v.boolean(),
    isTrash: v.boolean(),
    isDraft: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Check if email already exists
    const existing = await ctx.db
      .query("emails")
      .withIndex("gmailId", (q) => q.eq("gmailId", args.gmailId))
      .first();

    const emailData = {
      ...args,
      userId,
      lastSyncedAt: Date.now(),
      syncStatus: "synced",
    };

    if (existing) {
      // Update existing email
      await ctx.db.patch(existing._id, emailData);
      return existing._id;
    } else {
      // Insert new email
      return await ctx.db.insert("emails", emailData);
    }
  },
});

// Mutation to upsert a thread
export const upsertThread = mutation({
  args: {
    gmailThreadId: v.string(),
    subject: v.string(),
    snippet: v.string(),
    lastMessageDate: v.number(),
    messageCount: v.number(),
    participantEmails: v.array(v.string()),
    isRead: v.boolean(),
    hasAttachments: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Check if thread already exists
    const existing = await ctx.db
      .query("threads")
      .withIndex("gmailThreadId", (q) => q.eq("gmailThreadId", args.gmailThreadId))
      .first();

    const threadData = {
      ...args,
      userId,
    };

    if (existing) {
      // Update existing thread
      await ctx.db.patch(existing._id, threadData);
      return existing._id;
    } else {
      // Insert new thread
      return await ctx.db.insert("threads", threadData);
    }
  },
});

// Mutation to add attachment
export const addAttachment = mutation({
  args: {
    emailId: v.id("emails"),
    gmailAttachmentId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    contentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify email belongs to user
    const email = await ctx.db.get(args.emailId);
    if (!email || email.userId !== userId) {
      throw new ConvexError("Email not found or unauthorized");
    }

    return await ctx.db.insert("attachments", args);
  },
});

// Mutation to update sync state
export const updateSyncState = mutation({
  args: {
    lastHistoryId: v.string(),
    nextPageToken: v.optional(v.string()),
    syncStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Check if sync state exists
    const existing = await ctx.db
      .query("syncState")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    const syncData = {
      userId,
      lastHistoryId: args.lastHistoryId,
      lastSyncTime: Date.now(),
      nextPageToken: args.nextPageToken,
      syncStatus: args.syncStatus,
    };

    if (existing) {
      await ctx.db.patch(existing._id, syncData);
      return existing._id;
    } else {
      return await ctx.db.insert("syncState", syncData);
    }
  },
});

// Query to get inbox emails
export const getInboxEmails = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { emails: [], nextCursor: null };
    }

    const limit = args.limit || 20;

    // Get emails that are not spam or trash
    let query = ctx.db
      .query("emails")
      .withIndex("userDate", (q) => q.eq("userId", userId))
      .order("desc");

    // Apply cursor if provided
    if (args.cursor) {
      const cursorDate = parseInt(args.cursor);
      query = query.filter((q) => q.lt(q.field("internalDate"), cursorDate));
    }

    const emails = await query
      .filter((q) => 
        q.and(
          q.eq(q.field("isSpam"), false),
          q.eq(q.field("isTrash"), false)
        )
      )
      .take(limit + 1);

    const hasMore = emails.length > limit;
    const emailList = hasMore ? emails.slice(0, limit) : emails;
    const nextCursor = hasMore ? String(emailList[emailList.length - 1].internalDate) : null;

    return {
      emails: emailList,
      nextCursor,
    };
  },
});

// Query to get email by ID
export const getEmailById = query({
  args: {
    emailId: v.id("emails"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const email = await ctx.db.get(args.emailId);
    if (!email || email.userId !== userId) {
      return null;
    }

    // Get attachments
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("emailId", (q) => q.eq("emailId", args.emailId))
      .collect();

    return {
      ...email,
      attachments,
    };
  },
});

// Query to get emails by thread
export const getEmailsByThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("emails")
      .withIndex("gmailThreadId", (q) => q.eq("gmailThreadId", args.threadId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("asc")
      .collect();
  },
});

// Query to search emails
export const searchEmails = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = args.limit || 50;
    const searchLower = args.searchTerm.toLowerCase();

    // Search in subject, snippet, from, and fromEmail
    const emails = await ctx.db
      .query("emails")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isSpam"), false),
          q.eq(q.field("isTrash"), false)
        )
      )
      .take(200); // Get more to filter in memory

    // Filter by search term
    const filtered = emails.filter(email => 
      email.subject.toLowerCase().includes(searchLower) ||
      email.snippet.toLowerCase().includes(searchLower) ||
      email.from.toLowerCase().includes(searchLower) ||
      email.fromEmail.toLowerCase().includes(searchLower)
    );

    return filtered.slice(0, limit);
  },
});

// Query to get sync state
export const getSyncState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("syncState")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();
  },
});

// Mutation to mark email as read (local only)
export const markAsRead = mutation({
  args: {
    emailId: v.id("emails"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const email = await ctx.db.get(args.emailId);
    if (!email || email.userId !== userId) {
      throw new ConvexError("Email not found or unauthorized");
    }

    // Update local database only
    await ctx.db.patch(args.emailId, { isRead: args.isRead });
    
    return { success: true };
  },
});


// Mutation to star/unstar email (local only)
export const toggleStar = mutation({
  args: {
    emailId: v.id("emails"),
    isStarred: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const email = await ctx.db.get(args.emailId);
    if (!email || email.userId !== userId) {
      throw new ConvexError("Email not found or unauthorized");
    }

    // Update local database only
    await ctx.db.patch(args.emailId, { isStarred: args.isStarred });
    
    return { success: true };
  },
});

