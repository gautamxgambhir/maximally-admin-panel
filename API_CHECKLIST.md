# Admin Panel API Call Checklist

## Before Adding Any fetch() Call

Use this checklist every time you add a `fetch()` call in the admin panel:

### ✅ Step 1: Can this be done with Supabase?

Ask yourself:
- [ ] Am I just reading data? → Use Supabase `.select()`
- [ ] Am I just creating a record? → Use Supabase `.insert()`
- [ ] Am I just updating a record? → Use Supabase `.update()` or `.upsert()`
- [ ] Am I just deleting a record? → Use Supabase `.delete()`

**If YES to any above:** Use direct Supabase. Stop here. ✋

### ✅ Step 2: Does this require the main website backend?

Ask yourself:
- [ ] Does this send an email?
- [ ] Does this trigger a complex workflow?
- [ ] Does this require business logic that exists in the main website?
- [ ] Does this need to notify users?

**If NO to all above:** You probably don't need an API call. Use Supabase. ✋

**If YES to any above:** Continue to Step 3. ✅

### ✅ Step 3: Does the endpoint exist?

Check the main website backend:
- [ ] Open `maximally-main-website/netlify/functions/api.ts`
- [ ] Search for the endpoint path (e.g., `/api/admin/organizer-applications`)
- [ ] Verify the endpoint exists and handles your HTTP method

**If endpoint doesn't exist:** 
- Either create it in the main website backend first
- Or reconsider if you really need it (maybe Supabase is enough)

### ✅ Step 4: Use the correct pattern

```typescript
// ✅ CORRECT: Use VITE_API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002'
const response = await fetch(`${API_BASE_URL}/api/admin/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})

// ❌ WRONG: Relative path
const response = await fetch('/api/admin/endpoint', { ... })

// ❌ WRONG: Hardcoded URL
const response = await fetch('http://localhost:5002/api/admin/endpoint', { ... })
```

### ✅ Step 5: Use the helper function (Optional but recommended)

```typescript
import { callMainWebsiteApi } from '@/lib/apiHelpers'

// Instead of manual fetch
const result = await callMainWebsiteApi('/api/admin/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Calling non-existent endpoints
```typescript
// This endpoint doesn't exist in admin panel!
fetch('/api/admin/featured-hackathons', { ... })
```

**Fix:** Use direct Supabase or verify endpoint exists in main website

### ❌ Mistake 2: Using relative paths
```typescript
// This assumes admin panel has its own backend (it doesn't!)
fetch('/api/something', { ... })
```

**Fix:** Use `${VITE_API_BASE_URL}/api/something`

### ❌ Mistake 3: Not checking authentication
```typescript
// Missing auth token
fetch(`${API_BASE_URL}/api/admin/endpoint`, {
  method: 'POST'
})
```

**Fix:** Always include Authorization header with session token

## Quick Reference

### When to use what:

| Operation | Use This | Example |
|-----------|----------|---------|
| Read data | Supabase `.select()` | `supabaseAdmin.from('table').select('*')` |
| Create record | Supabase `.insert()` | `supabaseAdmin.from('table').insert(data)` |
| Update record | Supabase `.update()` | `supabaseAdmin.from('table').update(data)` |
| Delete record | Supabase `.delete()` | `supabaseAdmin.from('table').delete()` |
| Approve application | Main website API | `callMainWebsiteApi('/api/admin/applications/123/approve')` |
| Send email | Main website API | `callMainWebsiteApi('/api/admin/send-email')` |
| Complex workflow | Main website API | `callMainWebsiteApi('/api/admin/complex-operation')` |

## Files That Use External APIs (Legitimate)

These files correctly call the main website's API:

1. `src/pages/OrganizerApplications.tsx` - Approve/reject applications
2. `src/pages/OrganizerHackathonRequests.tsx` - Approve/reject hackathons
3. `src/pages/HackathonList.tsx` - Manage organizer hackathons
4. `src/pages/ProjectGalleryModeration.tsx` - Sync submissions

All other files should use direct Supabase.

## Testing Your Changes

Before committing:
- [ ] Test in development environment
- [ ] Verify no console errors about failed fetches
- [ ] Check that VITE_API_BASE_URL is set in .env
- [ ] Confirm the operation works as expected

## Need Help?

1. Read `admin-panel/ARCHITECTURE.md` for detailed architecture
2. Check `admin-panel/src/lib/apiHelpers.ts` for helper functions
3. Look at existing files for examples
4. Ask: "Can this be done with Supabase instead?"
