# Admin Panel Architecture

## Overview
The Admin Panel is a standalone Vite + React application that connects to Supabase for data management.

## Backend Architecture

### Direct Supabase Access
The admin panel primarily uses **direct Supabase client calls** for data operations. This is the preferred approach for most admin operations.

**Example:**
```typescript
const { data, error } = await supabaseAdmin
  .from('table_name')
  .select('*')
  .eq('id', id)
```

### External API Calls
Some operations require calling the **main website's backend API** (configured via `VITE_API_BASE_URL`). These are typically operations that:
- Send emails
- Trigger complex workflows
- Require main website business logic

**Example:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const response = await fetch(`${API_BASE_URL}/api/admin/some-endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

## Critical Rules

### ❌ DO NOT
- Call API endpoints that don't exist (e.g., `/api/admin/featured-hackathons` in admin panel context)
- Create fetch calls to relative paths like `/api/...` without checking if the endpoint exists
- Assume the admin panel has its own backend server

### ✅ DO
- Use direct Supabase calls for CRUD operations
- Use `VITE_API_BASE_URL` when calling main website APIs
- Check if an API endpoint exists in the main website before calling it
- Document which operations require external API calls vs direct Supabase

## Component Patterns

### Pattern 1: Direct Supabase (Preferred)
```typescript
// For simple CRUD operations
const handleSave = async () => {
  const { error } = await supabaseAdmin
    .from('table_name')
    .upsert(data)
  
  if (error) throw error
  toast.success('Saved successfully')
}
```

### Pattern 2: External API Call
```typescript
// For operations requiring main website backend
const handleApprove = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/admin/endpoint`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  if (!response.ok) throw new Error('Failed')
}
```

## Files Using External APIs

The following files make legitimate calls to the main website's API:

1. **OrganizerApplications.tsx** - Approve/reject organizer applications (sends emails)
2. **OrganizerHackathonRequests.tsx** - Approve/reject hackathon requests (sends emails)
3. **HackathonList.tsx** - Approve/reject/delete organizer hackathons (sends emails)
4. **ProjectGalleryModeration.tsx** - Sync hackathon submissions

All other components should use direct Supabase calls.

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=https://your-main-website.com
```

## Troubleshooting

### Error: "Failed to fetch" or "404 Not Found"
- Check if you're calling a non-existent API endpoint
- Verify the endpoint exists in the main website's backend
- Consider using direct Supabase instead

### Error: "Not authenticated"
- Ensure you're getting the session token correctly
- Check if the token is being passed in headers

## Migration Guide

If you find code calling non-existent API endpoints:

1. Identify the operation being performed
2. Check if it can be done with direct Supabase
3. If yes, replace with Supabase call
4. If no, verify the endpoint exists in main website
5. Update the code to use `VITE_API_BASE_URL`
