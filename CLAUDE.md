# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Michael Mail - A Gmail-style email client built with React, TypeScript, Vite, and Convex. Features real Gmail integration via OAuth, thread view support, auto-sync on page refresh, and a clean Gmail-inspired interface.

## Essential Commands

### Development
- `npm run dev` - Runs both frontend (Vite on port 3000) and backend (Convex) in parallel
  - Automatically runs `predev` first: ensures Convex is running and opens dashboard
- `npm run dev:frontend` - Frontend only (Vite dev server on port 3000)
- `npm run dev:backend` - Backend only (Convex dev)
- `npx convex dev --once` - Deploy functions to Convex dev environment once (useful after schema changes)
- `npx convex dashboard` - Open Convex dashboard in browser

### Build & Testing
- `npm run build` - TypeScript check and production build
- `npm run lint` - Run TypeScript and ESLint checks (includes both main and convex TSConfigs)
- `npm test` - Run tests in watch mode (Vitest with edge-runtime environment)
- `npm run test:once` - Run tests once
- `npm run test:debug` - Debug tests with inspector
- `npm run test:coverage` - Generate test coverage report

### Deployment
- `git push origin main` - Triggers automatic Vercel deployment (GitHub integration enabled)
- `npx convex deploy -y` - **IMPORTANT**: Deploy Convex backend functions to production after pushing
  - Frontend auto-deploys via GitHub integration, but Convex functions need manual deployment
  - Always deploy Convex after schema or function changes to avoid production errors
- `vercel --prod` - Deploy frontend to Vercel production (if manual deployment needed)

Production URLs:
- Frontend: https://michael-mail-2.vercel.app (auto-deploys from main branch)
- Convex Backend: https://elated-jellyfish-789.convex.cloud

## Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Convex (serverless functions and real-time database)
- **Auth**: Convex Auth with Google OAuth (Gmail scope enabled)
- **Email Integration**: Gmail API via OAuth tokens stored in user records
- **Testing**: Vitest with edge-runtime environment (configured in vitest.config.mts)

### Key Components

#### Frontend Structure
- `/src/App.tsx` - Main app with sidebar navigation and authenticated layout
- `/src/views/` - Different email views (InboxView, SentView, DraftsView, ArchiveView, TrashView)
- `/src/components/EmailListView.tsx` - Reusable email list component used by all views
- `/src/Inbox/EmailViewer.tsx` - Full email viewer with back navigation
- `/src/Inbox/ThreadViewer.tsx` - Thread conversation view with collapsible emails
- `/src/Inbox/EmailViewer.css` - Email content styling for proper HTML display
- `/src/components/ComposeDialog.tsx` - Gmail-style compose dialog
- `/src/auth/SignInFormsShowcase.tsx` - Google OAuth authentication
- `/src/components/ui/sidebar.tsx` - Dark theme Gmail-style sidebar navigation

### Core Data Flow

1. **Authentication Flow**:
   - User signs in via Google OAuth → `/convex/auth.ts` 
   - OAuth tokens stored in users table with Gmail readonly scope
   - Tokens include: `googleAccessToken`, `googleRefreshToken`, `tokenExpiresAt`

2. **Email Sync Flow**:
   - Page load → View component mounts → calls `syncEmails` action (inbox only)
   - `syncEmails` fetches 50 latest emails from Gmail API in parallel
   - Emails upserted to database, maintaining Gmail IDs for deduplication
   - Real-time updates via Convex's reactive `useQuery` hooks

3. **User Interactions**:
   - Click email row → Opens EmailViewer or ThreadViewer component
   - Back button → Returns to email list view
   - Mark as read/unread → Local database update only (one-way sync)
   - Refresh button → Triggers new `syncEmails` call
   - Email automatically marked as read when opened
   - No write-back to Gmail (intentionally simplified)

### Key Backend Functions

#### `/convex/gmail.ts`
- `syncEmails(fullSync?: boolean)` - Main sync action, fetches and stores emails
  - Uses `Promise.all` for parallel fetching (3-5x performance improvement)
  - Processes emails, threads, and attachments
  - Returns `{ synced: number, hasMore?: boolean, error?: string }`
- `getCurrentUserWithTokens()` - Query to get user with OAuth tokens
- `sendEmail(to, cc?, bcc?, subject, body)` - Send emails via Gmail API
  - Creates MIME-formatted messages
  - Handles token refresh automatically
  - Stores sent emails in database
- `updateUserTokens(accessToken, expiresAt)` - Update OAuth tokens after refresh

#### `/convex/emails.ts`
- `upsertEmail(...)` - Insert or update email in database
- `getEmails(filter, page?, pageSize?)` - Unified query for all email views
  - Supports filters: inbox, sent, drafts, archive, trash, all
  - Returns emails with total count and navigation metadata
  - Default page size: 50 emails
  - Includes `hasNext` and `hasPrev` flags for navigation
- `getEmailById(emailId)` - Get single email with attachments for viewing
- `getEmailsByThread(threadId)` - Get all emails in a thread conversation
- `markAsRead(emailId, isRead)` - Local read status update
- `updateSyncState(...)` - Track sync progress and pagination

### Database Schema
```typescript
users: {
  name, email, image, // Standard fields
  googleAccessToken, googleRefreshToken, tokenExpiresAt, // Gmail OAuth tokens
  favoriteColor // Custom field
}
emails: {
  gmailId, gmailThreadId, subject, snippet, // Gmail identifiers
  from, fromEmail, to, cc, bcc, // Recipients
  bodyHtml, bodyPlain, // Content
  isRead, isImportant, isSpam, isTrash, isDraft, // Status flags
  isStarred: optional // Deprecated field for migration
  internalDate, lastSyncedAt // Timestamps
}
threads: {
  gmailThreadId, subject, snippet,
  lastMessageDate, messageCount, participantEmails,
  isRead, hasAttachments
}
attachments: {
  emailId, gmailAttachmentId, filename, mimeType, size
}
syncState: {
  userId, lastHistoryId, lastSyncTime, nextPageToken, syncStatus
}
labels: {
  gmailLabelId, userId, name, type, // Label metadata
  color, backgroundColor, // Display settings
  totalMessages, unreadMessages // Stats
}
emailLabels: { emailId, labelId } // Many-to-many relation
emailHeaders: { emailId, name, value } // Email headers storage
messages: { userId, body } // Chat functionality (unused)
```

### Common Development Patterns

#### Adding New Email Actions
When adding new email actions (e.g., archive, delete), follow this pattern:
1. Add mutation in `/convex/emails.ts` for local state
2. Add UI handler in `EmailListView.tsx` or viewer components
3. Consider if Gmail API sync needed (usually not for read-only app)

#### DRY Architecture for Views
All email views (Inbox, Sent, Drafts, Archive, Trash) share the same `EmailListView` component:
- Pass appropriate `filter` prop to control which emails are shown
- Filter logic is handled in the backend `getEmails` query
- Maintains consistency across all views

#### Schema Migrations
When modifying the database schema:
1. Make fields optional first: `v.optional(v.type())`
2. Deploy with `npx convex dev --once`
3. Run migration if needed
4. Make field required after data migration

#### Error Handling
- Gmail API 401 errors → User needs to re-authenticate
- Network errors → Show retry button with error message
- Use `ConvexError` for user-facing errors in actions/mutations

### Performance Considerations

- **Parallel fetching**: Always use `Promise.all` for multiple API calls
- **Database indexes**: Schema includes indexes on `gmailId`, `userId`, `userDate`
- **Pagination**: Use page-based pagination with 50 emails per page
- **Real-time updates**: Convex handles subscriptions automatically via `useQuery`

### Path Aliases
- `@/` maps to `./src/` directory (configured in vite.config.ts and tsconfig.json)

### Environment Variables
Required in `.env.local`:
- `VITE_CONVEX_URL` - Convex deployment URL
- `AUTH_GOOGLE_ID` - Google OAuth client ID  
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret

### Debugging Tips

- **Check OAuth tokens**: Use Convex dashboard to inspect user records
- **Gmail API errors**: Check browser console and Convex function logs
- **Sync issues**: Verify `syncState` table for pagination tokens
- **Type errors after schema changes**: Run `npx convex dev --once` to regenerate types
- **Email content not visible**: Check EmailViewer.css for proper color overrides
- **Production errors after deployment**: Ensure Convex functions are deployed with `npx convex deploy -y`
  - Common error: "Server Error" in production after pushing changes
  - Solution: Frontend and backend must be deployed together

### Recent Features & Changes

- **Thread View Support** (2025-01): Gmail-style conversation threading
  - ThreadViewer component displays entire email conversations
  - Collapsible/expandable emails within threads
  - `getEmailsByThread` query for fetching thread emails
  - Automatic thread grouping based on Gmail thread IDs
- **DRY Architecture** (2025-01): Refactored to use single EmailListView component
  - All views (Inbox, Sent, Drafts, Archive, Trash) now share the same component
  - Unified `getEmails` query with filter parameter
  - Simplified codebase by eliminating duplicate components
- **Gmail-Style Pagination** (2025-01): Full pagination implementation
  - Page-based navigation showing "1-50 of 248" format
  - Previous/Next arrow buttons with proper disabled states
  - Backend query returns total count and pagination metadata
  - Automatic page reset when syncing new emails
  - Clears selections when navigating between pages (matching Gmail behavior)
- **Responsive Design Fixes** (2025-01): Eliminated horizontal scrolling issues
  - Proper overflow handling with `overflow-hidden` on all containers
  - Text truncation for long subjects and snippets
  - Mobile-first responsive layout with stacked view on small screens
- **Email Viewer** (2025-01): Click-to-read functionality with full email display
- **Checkbox Functionality** (2025-01): Fixed checkbox selection in inbox
- **Token Refresh** (2025-01): Automatic Gmail token refresh
- **Compose Email** (2025-01): Full email composition and sending
  - Gmail-style compose dialog that slides from bottom
  - Real email sending via Gmail API
  - Required OAuth scope: `gmail.send` (re-authentication needed after update)
- **Performance Optimizations**: Parallel email fetching with Promise.all
- **Auto-sync**: Emails sync automatically on page refresh (inbox view only)
- **GitHub Integration**: Auto-deployment to Vercel on push to main