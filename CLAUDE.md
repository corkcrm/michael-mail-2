# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Michael Mail - A Gmail-style email client built with React, TypeScript, Vite, and Convex. Features real Gmail integration via OAuth, auto-sync on page refresh, and a clean, focused interface.

## Essential Commands

### Development
- `npm run dev` - Runs both frontend (Vite on port 3000) and backend (Convex) in parallel
- `npm run dev:frontend` - Frontend only (Vite dev server)
- `npm run dev:backend` - Backend only (Convex dev)

### Build & Testing
- `npm run build` - TypeScript check and production build
- `npm run lint` - Run TypeScript and ESLint checks (includes both main and convex TSConfigs)
- `npm test` - Run tests in watch mode (Vitest)
- `npm run test:once` - Run tests once
- `npm run test:coverage` - Generate test coverage report

### Deployment
- `npx convex dev --once` - Deploy functions to Convex dev environment
- `npx convex deploy -y` - Deploy functions to Convex production
- `git push origin main` - Triggers automatic Vercel deployment (GitHub integration enabled)

Production URLs:
- Frontend: https://michael-mail-2.vercel.app (auto-deploys from main branch)
- Convex Backend: https://elated-jellyfish-789.convex.cloud

## Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Convex (serverless functions and real-time database)
- **Auth**: Convex Auth with Google OAuth (Gmail scope enabled)
- **Email Integration**: Gmail API via OAuth tokens stored in user records

### Key Components

#### Frontend Structure
- `/src/App.tsx` - Main app with sidebar navigation (Inbox, Sent, Drafts, Archive, Trash)
- `/src/Inbox/InboxPage.tsx` - Email inbox with refresh button, auto-sync on mount
- `/src/auth/SignInFormsShowcase.tsx` - Google-only authentication
- `/src/components/ui/sidebar.tsx` - Dark theme Gmail-style sidebar

#### Backend Functions
- `/convex/auth.ts` - Google OAuth with Gmail readonly scope
- `/convex/gmail.ts` - Gmail API integration with parallel email fetching
  - `fetchEmails` - Display-only, returns formatted email data
  - `syncEmails` - Syncs Gmail to database with parallel fetching (3-5x faster)
- `/convex/emails.ts` - Email mutations (markAsRead, upsertEmail)
- `/convex/schema.ts` - Database schema with emails, threads, attachments
- `/convex/users.ts` - User queries

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

### Gmail Integration Flow
1. User signs in with Google → OAuth consent includes Gmail readonly scope
2. Access/refresh tokens stored in user record via profile() method
3. InboxPage automatically syncs on every mount (page refresh)
4. Sync process:
   - Fetches latest 50 emails from Gmail API (parallel fetching)
   - Upserts emails to database (updates existing, adds new)
   - Updates thread information and attachments
5. Real-time updates via Convex's useQuery hook
6. Manual refresh available via button in actions toolbar

### UI Features
- Clean, focused interface without star/starred functionality
- Dark theme sidebar with Gmail-style navigation
- Refresh button in actions toolbar for manual sync
- Auto-sync on page refresh for latest emails
- Email rows with read/unread visual states
- Dropdown menu for mark as read/unread, archive, delete
- Loading states and error handling
- Responsive design with mobile support

### Path Aliases
- `@/` maps to `./src/` directory (configured in vite.config.ts and tsconfig.json)

### Performance Optimizations
- **Parallel email fetching**: All 50 emails fetched simultaneously (3-5x faster)
- **One-way sync**: Gmail → App only (no complex bidirectional sync)
- **Efficient database operations**: Batch processing where possible
- **Auto-deployment**: GitHub integration for instant production updates

### Environment Variables
Required in `.env.local`:
- `VITE_CONVEX_URL` - Convex deployment URL
- `AUTH_GOOGLE_ID` - Google OAuth client ID  
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret

### Recent Changes (2024)
- Removed star/starred functionality for cleaner UI
- Implemented auto-sync on page refresh
- Added refresh button to actions toolbar
- Optimized sync with parallel fetching
- Enabled GitHub auto-deployment for Vercel
- Simplified to one-way sync (Gmail → App)