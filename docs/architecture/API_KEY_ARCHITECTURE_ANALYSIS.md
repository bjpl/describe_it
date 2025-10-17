# 🔍 API Key Architecture Analysis

## Current Problems:

### Multiple Storage Locations:
1. `localStorage['app-settings']` - settingsManager
2. `sessionStorage['api-keys-backup']` - keyProvider
3. `localStorage['describe-it-auth']` - auth tokens
4. Cookies: `openai_key`, `unsplash_key`
5. Component state (volatile)

### Redundancy Issues:
- Keys stored in 3+ different places
- No clear single source of truth
- Components reading from different sources
- Sync issues between storage locations
- Migration breaking old data

### User Experience Problems:
- Settings UI appears locked
- Unclear where to enter keys
- No visual feedback on save
- Keys don't persist properly
- Confusing for new users

## Proposed Solution:

### Single Source of Truth Architecture:
```
┌─────────────────────────────────────┐
│   User Enters Key in Settings UI   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  localStorage['api-keys'] ONLY      │
│  {                                  │
│    anthropic: "sk-ant-...",        │
│    unsplash: "..."                 │
│  }                                  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Single keyManager.ts Module       │
│   - get(service)                    │
│   - set(service, key)               │
│   - validate(service, key)          │
│   - remove(service)                 │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   All APIs Read from keyManager     │
│   - Description API                 │
│   - Q&A API                         │
│   - Translation API                 │
│   - Image Search                    │
└─────────────────────────────────────┘
```

## Implementation Plan:

1. Create new `lib/keys/keyManager.ts` - Single manager
2. Migrate all storage to `localStorage['api-keys']` only
3. Remove `app-settings.apiKeys` redundancy
4. Update Settings UI to use keyManager directly
5. Add visual feedback (validation, testing)
6. Migration function for old keys
7. Clear documentation

## Benefits:
- ✅ Single storage location
- ✅ Clear data flow
- ✅ Easy to debug
- ✅ Better UX
- ✅ Maintainable
