# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Michael Mail - A Gmail-style email client built with React, TypeScript, Vite, and Convex. Features real Gmail integration via OAuth, dark theme sidebar navigation, and responsive design.

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
- `vercel --prod` - Deploy frontend to Vercel production
- `git push origin main` - Triggers automatic Vercel deployment

Production URLs:
- Frontend: https://michael-mail-2.vercel.app
- Convex Backend: https://elated-jellyfish-789.convex.cloud

## Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Convex (serverless functions and real-time database)
- **Auth**: Convex Auth with Google OAuth (Gmail scope enabled)
- **Email Integration**: Gmail API via OAuth tokens stored in user records

### Key Components

#### Frontend Structure
- `/src/App.tsx` - Main app with sidebar navigation and routing
- `/src/Inbox/InboxPage.tsx` - Email inbox with real Gmail integration
- `/src/auth/SignInFormsShowcase.tsx` - Simplified to Google-only authentication
- `/src/components/ui/sidebar.tsx` - Dark theme Gmail-style sidebar (10rem width)

#### Backend Functions
- `/convex/auth.ts` - Google OAuth with Gmail scope and token storage
- `/convex/gmail.ts` - Gmail API integration (fetchEmails, getCurrentUserWithTokens)
- `/convex/schema.ts` - Database schema with OAuth token fields
- `/convex/users.ts` - User queries

### Database Schema
```typescript
users: {
  name, email, image, // Standard fields
  googleAccessToken, googleRefreshToken, tokenExpiresAt, // Gmail OAuth tokens
  favoriteColor // Custom field
}
messages: { userId, body } // Chat functionality
```

### Gmail Integration Flow
1. User signs in with Google → OAuth consent includes Gmail read scope
2. Access/refresh tokens stored in user record via profile() method
3. InboxPage calls `api.gmail.fetchEmails` action on mount
4. Action retrieves user's tokens and fetches emails from Gmail API
5. Emails transformed to UI format and displayed

### UI Features
- Dark slate-900 sidebar with collapsible navigation
- Responsive design with mobile menu
- User menu in sidebar footer with theme toggle
- Condensed Gmail-style email rows with read/unread states
- Loading and error states for email fetching

### Path Aliases
- `@/` maps to `./src/` directory (configured in vite.config.ts and tsconfig.json)

### Environment Variables
Required in `.env.local`:
- `VITE_CONVEX_URL` - Convex deployment URL
- `AUTH_GOOGLE_ID` - Google OAuth client ID  
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret