# Beluva Interiors - Authentication Bypass for Testing

This document explains the temporary authentication bypass implemented for testing the AI features.

## What's Changed

To focus on testing AI features without dealing with authentication issues, we've temporarily:

1. **Disabled authentication checks** in the middleware
2. **Created a mock user** in the auth provider
3. **Set up mock APIs** for recommendations and visualizations
4. **Added visual indicators** when in test mode

## How It Works

### Authentication Bypass

The middleware now automatically redirects `/login` and `/signup` requests to `/dashboard` and skips all authentication checks.

### Mock User

A mock user is automatically created:
```
{
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test User',
  email: 'test@example.com'
}
```

### Mock APIs

The following mock endpoints are available:
- `/api/mock-recommendations` - Returns AI-generated furniture recommendations

### Test Mode Indicators

UI elements show when you're in test mode:
- "Test Mode" badge next to the user name
- Yellow info boxes on upload forms

## Testing the AI Features

1. Start the app with `npm run dev`
2. Upload a room image on the dashboard
3. Get recommendations and test the visualization flow
4. All AI operations are simulated with realistic mock data

## Restoring Authentication

When you're ready to re-enable authentication:

1. In `nextjs/src/middleware.ts`: Uncomment the original authentication code
2. In `nextjs/src/components/auth-provider.tsx`: Set `useMockUser` to `false`
3. In the component files: Uncomment the authentication redirection code

## Files Modified

- `nextjs/src/middleware.ts`
- `nextjs/src/components/auth-provider.tsx`
- `nextjs/src/app/dashboard/page.tsx`
- `nextjs/src/components/room-upload/room-uploader.tsx`
- `nextjs/src/app/recommendations/page.tsx`
- `nextjs/src/app/visualization/page.tsx`
- Added: `nextjs/src/app/api/mock-recommendations/route.ts`