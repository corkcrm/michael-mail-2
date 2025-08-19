# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Michael Mail - A Gmail-style email client built with React, TypeScript, Vite, and Convex. Features real Gmail integration via OAuth, auto-sync on page refresh, and a clean, focused interface.

## Essential Commands

### Development
- `npm run dev` - Runs both frontend (Vite on port 3000) and backend (Convex) in parallel
- `npm run dev:frontend` - Frontend only (Vite dev server)
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
- `npx convex deploy -y` - Deploy functions to Convex production (if manual deployment needed)
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
- **Testing**: Vitest with edge-runtime environment

### Core Data Flow

1. **Authentication Flow**:
   - User signs in via Google OAuth → `/convex/auth.ts` 
   - OAuth tokens stored in users table with Gmail readonly scope
   - Tokens include: `googleAccessToken`, `googleRefreshToken`, `tokenExpiresAt`

2. **Email Sync Flow**:
   - Page load → `InboxPage` mounts → calls `syncEmails` action
   - `syncEmails` fetches 50 latest emails from Gmail API in parallel
   - Emails upserted to database, maintaining Gmail IDs for deduplication
   - Real-time updates via Convex's reactive `useQuery` hooks

3. **User Interactions**:
   - Mark as read/unread → Local database update only (one-way sync)
   - Refresh button → Triggers new `syncEmails` call
   - No write-back to Gmail (intentionally simplified)

### Key Backend Functions

#### `/convex/gmail.ts`
- `syncEmails(fullSync?: boolean)` - Main sync action, fetches and stores emails
  - Uses `Promise.all` for parallel fetching (3-5x performance improvement)
  - Processes emails, threads, and attachments
  - Returns `{ synced: number, hasMore?: boolean, error?: string }`
- `getCurrentUserWithTokens()` - Query to get user with OAuth tokens

#### `/convex/emails.ts`
- `upsertEmail(...)` - Insert or update email in database
- `getInboxEmails(limit?, cursor?)` - Paginated inbox query
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
messages: { userId, body } // Chat functionality (unused)
```

### Common Development Patterns

#### Adding New Email Actions
When adding new email actions (e.g., archive, delete), follow this pattern:
1. Add mutation in `/convex/emails.ts` for local state
2. Add UI handler in `InboxPage.tsx`
3. Consider if Gmail API sync needed (usually not for read-only app)

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
- **Pagination**: Use cursor-based pagination for large datasets
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