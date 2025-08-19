# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Gmail-style email client clone built with React, TypeScript, Vite, and Convex. It features authentication via Convex Auth with multiple providers (Google, GitHub, Apple, password-based, OTP, anonymous) and includes a chat functionality demonstrator.

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

## Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Convex (serverless functions and real-time database)
- **Auth**: Convex Auth with multiple providers configured in `convex/auth.ts`
- **Testing**: Vitest with React Testing Library

### Key Directories
- `/src` - React application code
  - `/auth` - Authentication components and forms for various sign-in methods
  - `/components` - Reusable UI components (using shadcn/ui)
  - `/Chat` - Real-time chat functionality
- `/convex` - Backend Convex functions
  - `schema.ts` - Database schema definitions
  - `auth.ts` - Authentication configuration with all providers
  - `/otp` - OTP verification implementations (Resend, Twilio)
  - `/passwordReset` - Password reset functionality

### Database Schema
- **users**: Extended auth table with email, phone, verification times, and custom fields
- **messages**: Simple chat messages linked to users
- Auth tables are included via `@convex-dev/auth/server`

### Path Aliases
- `@/` maps to `./src/` directory (configured in vite.config.ts and tsconfig.json)

### Authentication Providers
The app supports multiple authentication methods:
- OAuth: Google, GitHub, Apple
- Email: Magic links (Resend), OTP codes
- Phone: SMS OTP via Twilio
- Password: Multiple variants with email verification and reset
- Anonymous sign-in

### Environment Variables
Required for full functionality:
- `VITE_CONVEX_URL` - Convex deployment URL
- `CONVEX_SITE_URL` - Site URL for OAuth callbacks
- Auth provider secrets (Google, GitHub, Apple, Resend, Twilio)