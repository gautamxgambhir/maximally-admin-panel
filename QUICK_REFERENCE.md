# Admin Panel - Quick Reference Card

## 🚀 Quick Decision Tree

```
Need to make a data operation?
│
├─ Is it just reading/writing data?
│  └─ YES → Use Supabase ✅
│
└─ Does it send emails or trigger workflows?
   └─ YES → Use Main Website API ✅
```

## 📋 Common Operations

### Reading Data
```typescript
const { data, error } = await supabaseAdmin
  .from('table_name')
  .select('*')
  .eq('id', id)
```

### Creating Data
```typescript
const { data, error } = await supabaseAdmin
  .from('table_name')
  .insert({ field: 'value' })
```

### Updating Data
```typescript
const { error } = await supabaseAdmin
  .from('table_name')
  .update({ field: 'new_value' })
  .eq('id', id)
```

### Upserting Data
```typescript
const { error } = await supabaseAdmin
  .from('table_name')
  .upsert({ id: 1, field: 'value' }, { onConflict: 'id' })
```

### Deleting Data
```typescript
const { error } = await supabaseAdmin
  .from('table_name')
  .delete()
  .eq('id', id)
```

### Calling Main Website API
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const { data: { session } } = await supabase.auth.getSession()

const response = await fetch(`${API_BASE_URL}/api/admin/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

## ⚠️ Common Mistakes

### ❌ DON'T
```typescript
// Relative path - WRONG!
fetch('/api/admin/endpoint', { ... })

// Hardcoded URL - WRONG!
fetch('http://localhost:5002/api/endpoint', { ... })

// Missing auth - WRONG!
fetch(`${API_BASE_URL}/api/endpoint`, { method: 'POST' })
```

### ✅ DO
```typescript
// Use environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Include auth token
const { data: { session } } = await supabase.auth.getSession()
headers: { 'Authorization': `Bearer ${session.access_token}` }

// Or use Supabase directly
await supabaseAdmin.from('table').update(data)
```

## 🎯 When to Use What

| Task | Use | Why |
|------|-----|-----|
| Update featured events | Supabase | Simple data update |
| Update featured blogs | Supabase | Simple data update |
| Approve organizer application | Main API | Sends email |
| Reject hackathon | Main API | Sends notification |
| Delete user | Supabase | Simple deletion |
| Fetch analytics | Supabase | Simple query |
| Moderate content | Supabase | Simple status update |

## 📚 Full Documentation

- **Architecture:** `admin-panel/ARCHITECTURE.md`
- **Checklist:** `admin-panel/API_CHECKLIST.md`
- **Helpers:** `admin-panel/src/lib/apiHelpers.ts`
- **Fixes:** `admin-panel/FIXES_APPLIED.md`

## 🔍 Need Help?

1. Check if operation can be done with Supabase
2. If not, verify endpoint exists in main website
3. Use `callMainWebsiteApi()` helper from `apiHelpers.ts`
4. Follow patterns in existing files

## 🛡️ Safety Net

The **admin-api-check** hook will review your code changes and warn you about:
- Calls to non-existent endpoints
- Missing VITE_API_BASE_URL
- Operations that should use Supabase instead

---

**Remember:** When in doubt, use Supabase! 🎯
