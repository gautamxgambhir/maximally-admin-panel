# Deployment Fix - Organizer Applications Not Showing

## Problem
Organizer applications show in development but not in deployment. This is because the admin panel needs to call the main website's API, and the URL was hardcoded to `localhost`.

## Root Cause
The admin panel uses `VITE_API_BASE_URL` environment variable to know where the main website API is located. In development, this is `http://localhost:5002`, but in production it should be `https://maximally.in`.

## Solution Applied

### 1. Smart Auto-Detection
Updated `admin-panel/src/lib/apiHelpers.ts` to automatically detect the environment:

```typescript
export const getApiBaseUrl = (): string => {
  // Check if we have an explicit environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  
  // Auto-detect based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Production: admin panel is on vercel.app or contains 'admin'
    // Main website is on maximally.in
    if (hostname.includes('vercel.app') || hostname.includes('admin')) {
      return 'https://maximally.in'
    }
  }
  
  // Development fallback
  return 'http://localhost:5002'
}
```

### 2. Updated All API Calls
Updated these files to use the helper function:
- ✅ `OrganizerApplications.tsx`
- ✅ `OrganizerHackathonRequests.tsx`
- ✅ `HackathonList.tsx`
- ✅ `ProjectGalleryModeration.tsx`

## How It Works

### Development (localhost)
- Hostname: `localhost:5173`
- Auto-detects: `http://localhost:5002`
- Calls local API ✅

### Production (Vercel)
- Hostname: `maximally-admin-panel.vercel.app` (or similar)
- Auto-detects: `https://maximally.in`
- Calls production API ✅

## Testing

### Before Deploying
1. Test locally to ensure it still works:
   ```bash
   cd admin-panel
   npm run dev
   ```
2. Navigate to Organizer Applications
3. Verify applications load

### After Deploying
1. Visit your deployed admin panel
2. Navigate to Organizer Applications
3. Applications should now appear!

## Alternative: Set Environment Variable

If auto-detection doesn't work, you can explicitly set the environment variable in Vercel:

1. Go to Vercel Dashboard
2. Select your admin panel project
3. Go to Settings → Environment Variables
4. Add:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://maximally.in`
   - **Environment:** Production

5. Redeploy the application

## Verification

After deployment, check the browser console:
- ✅ No "Failed to fetch" errors
- ✅ API calls go to `https://maximally.in/api/...`
- ✅ Applications load correctly

## Files Changed

1. `admin-panel/src/lib/apiHelpers.ts` - Added auto-detection
2. `admin-panel/src/pages/OrganizerApplications.tsx` - Use helper
3. `admin-panel/src/pages/OrganizerHackathonRequests.tsx` - Use helper
4. `admin-panel/src/pages/HackathonList.tsx` - Use helper
5. `admin-panel/src/pages/ProjectGalleryModeration.tsx` - Use helper

## Next Steps

1. Commit these changes
2. Push to your repository
3. Vercel will auto-deploy
4. Test the deployed admin panel
5. Verify organizer applications appear

## Troubleshooting

### Still not working?
1. Check browser console for errors
2. Verify the API URL being called (should be `https://maximally.in`)
3. Check if the main website API is accessible
4. Verify CORS settings on main website allow admin panel domain

### API returns 401 Unauthorized?
- Check if you're logged in to the admin panel
- Verify the session token is being sent
- Check Supabase authentication

### API returns 404 Not Found?
- Verify the endpoint exists in main website
- Check `maximally-main-website/netlify/functions/api.ts`
- Ensure the route is properly configured

## Summary

The fix automatically detects whether you're in development or production and uses the correct API URL. No manual configuration needed! 🎉
