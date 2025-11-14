# Phase 2: Authentication, Router & API Contract - Testing Guide

## Overview
This document outlines the testing approach for Phase 2 implementation, focusing on authentication flow, routing, and API contract validation.

## Prerequisites
- Netlify Functions deployed or running locally via `npm run dev:functions`
- Frontend running via `npm run dev`
- Google OAuth credentials configured in environment variables
- Google Drive OAuth credentials configured

## Authentication Flow Testing

### 1. Login Flow
1. **Navigate to `/login`**
   - Verify login page renders with Google Sign-In button
   - Check that Google Sign-In SDK loads correctly
   - Verify client ID is fetched from `/api/config`

2. **Google Sign-In**
   - Click "Sign in with Google"
   - Complete Google authentication
   - Verify redirect to `/stories` after successful authentication
   - Check that user data is stored in localStorage
   - Verify session cookie is set

3. **Auth State Persistence**
   - Refresh the page
   - Verify user remains authenticated
   - Check that protected routes are accessible

### 2. Protected Routes
1. **Unauthenticated Access**
   - Clear localStorage and cookies
   - Navigate to `/` or `/stories`
   - Verify redirect to `/login`

2. **Authenticated Access**
   - While authenticated, navigate between routes:
     - `/` → should show AppLayout
     - `/stories` → should show AppLayout
     - `/editor` → should show AppLayout
   - Verify route loaders execute and prefetch data

### 3. Window Focus Reconciliation
1. **Multi-Tab Authentication**
   - Open two tabs
   - Log in on tab 1
   - Switch to tab 2
   - Verify tab 2 detects authentication and updates UI
   - Log out on tab 1
   - Switch to tab 2
   - Verify tab 2 detects logout and redirects to login

### 4. Error Handling
1. **Network Errors**
   - Disconnect network
   - Attempt to log in
   - Verify error message is displayed
   - Reconnect network
   - Verify retry works

2. **Invalid Credentials**
   - Attempt login with invalid Google token
   - Verify error handling

3. **Route Errors**
   - Navigate to invalid route (e.g., `/invalid`)
   - Verify 404 error boundary displays
   - Test error boundary reset functionality

## API Contract Testing

### 1. API Client Type Safety
- Verify all API calls use typed contracts from `src/api/contract.ts`
- Check that Zod schemas validate responses
- Verify error responses are properly typed

### 2. Netlify Functions
1. **Type Compilation**
   - Run `npm run build:functions`
   - Verify all TypeScript functions compile without errors
   - Check that compiled JavaScript is generated in `netlify/functions`

2. **Function Handlers**
   - Test each function endpoint:
     - `GET /.netlify/functions/config` - should return client ID
     - `POST /.netlify/functions/verify-google` - should verify Google token
     - `POST /.netlify/functions/logout` - should clear session
     - `GET /.netlify/functions/drive-get-or-create-yarny-stories` - should return folder
     - Other Drive functions as needed

## Route Loaders Testing

### 1. Stories Loader
- Navigate to `/stories`
- Verify loader prefetches:
  - Yarny Stories folder
  - Projects list
- Check React Query cache is populated
- Verify no loading flicker (data should be ready)

### 2. Editor Loader
- Navigate to `/editor`
- Verify loader prefetches:
  - Yarny Stories folder
  - Projects list
- Check data is available immediately

## Loading States

### 1. Route Loading
- Verify `RouteLoader` component displays during route transitions
- Check Suspense fallback shows when routes are loading

### 2. Protected Route Loading
- Verify loading spinner shows while checking authentication
- Check smooth transition after authentication check completes

## Error Boundaries

### 1. Component Errors
- Trigger a component error (e.g., throw in render)
- Verify `ErrorBoundary` catches and displays error
- Test "Try again" button resets error state

### 2. Route Errors
- Cause route loader to throw error
- Verify `RouteErrorBoundary` displays
- Check error message is user-friendly
- Test navigation back to home

## Browser Console Checks

### 1. No Errors
- Open browser console
- Navigate through all routes
- Verify no console errors

### 2. Network Requests
- Check Network tab
- Verify API calls use correct endpoints
- Check request/response formats match contracts

## Manual Test Checklist

- [ ] Login page renders correctly
- [ ] Google Sign-In button works
- [ ] Authentication redirects to `/stories`
- [ ] Protected routes require authentication
- [ ] Unauthenticated users redirected to `/login`
- [ ] Auth state persists on page refresh
- [ ] Window focus reconciliation works across tabs
- [ ] Logout clears session and redirects
- [ ] Route loaders prefetch data correctly
- [ ] Loading states display during transitions
- [ ] Error boundaries catch and display errors
- [ ] 404 pages show error boundary
- [ ] API calls use typed contracts
- [ ] Netlify Functions compile successfully
- [ ] All routes are accessible when authenticated

## Automated Testing (Future)

Future phases should include:
- Unit tests for auth hooks
- Integration tests for API client
- E2E tests with Playwright for full auth flow
- Visual regression tests for UI components

## Troubleshooting

### Common Issues

1. **Google Sign-In not loading**
   - Check `GOOGLE_CLIENT_ID` environment variable
   - Verify Google Sign-In script loads
   - Check browser console for errors

2. **Authentication not persisting**
   - Check localStorage for `yarny_auth` and `yarny_user`
   - Verify cookies are being set
   - Check CORS settings

3. **Route loaders failing**
   - Check Netlify Functions are running
   - Verify API endpoints are accessible
   - Check network tab for failed requests

4. **TypeScript compilation errors**
   - Run `npm run typecheck` to see all errors
   - Verify all imports are correct
   - Check type definitions match actual data

