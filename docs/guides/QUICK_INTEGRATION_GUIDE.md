# Quick Integration Guide - Code Snippets

## 1. Add Save Button to DescriptionNotebook

**File:** `src/components/DescriptionNotebook.tsx`

Add after line 243 (after the "Generate" button):

```typescript
{/* Save Button */}
{hasImage && activeDescription.english && activeDescription.spanish && (
  <div className="flex justify-center mt-4">
    <MotionButton
      onClick={async () => {
        try {
          const result = await APIClient.saveDescription({
            description_english: activeDescription.english,
            description_spanish: activeDescription.spanish,
            description_style: activeStyle,
            image_url: image.urls.regular,
            user_id: undefined // Add userId when auth is ready
          });

          if (result.error) {
            // Show error toast
            setError(result.error.message);
          } else {
            // Show success toast
            setError(null);
            // Optional: Show success message
          }
        } catch (err) {
          setError('Failed to save description');
        }
      }}
      className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center space-x-2 transition-colors shadow-lg"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Check className="h-5 w-5" />
      <span>Save Description</span>
    </MotionButton>
  </div>
)}
```

Add import at top:
```typescript
import APIClient from '@/lib/api-client';
import { Check } from 'lucide-react';
```

## 2. Update useVocabulary Hook

**File:** `src/hooks/useVocabulary.ts`

Add these new hooks at the bottom of the file:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import APIClient from '@/lib/api-client';

// Add these new hooks
export function useVocabularyListsDB(userId?: string) {
  return useQuery({
    queryKey: ['vocabulary', 'lists', userId],
    queryFn: async () => {
      const result = await APIClient.getVocabularyLists(userId);
      if (result.error) throw new Error(result.error.message);
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVocabularyItemsDB(listId: string | null) {
  return useQuery({
    queryKey: ['vocabulary', 'items', listId],
    queryFn: async () => {
      if (!listId) return [];
      const result = await APIClient.getVocabularyItems(listId);
      if (result.error) throw new Error(result.error.message);
      return result.data || [];
    },
    enabled: !!listId,
  });
}

export function useCreateVocabularyListDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description: string; userId?: string }) => {
      const result = await APIClient.createVocabularyList(data.name, data.description, data.userId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary', 'lists'] });
    },
  });
}
```

## 3. Update VocabularyList Component

**File:** `src/components/VocabularyBuilder/VocabularyList.tsx`

Replace the component props section (lines 15-23) with:

```typescript
import { useVocabularyListsDB } from '@/hooks/useVocabulary';

export const VocabularyList = memo<VocabularyListProps>(function VocabularyList({
  userId, // Add this prop
  reviewItems,
  statistics,
  onStartStudySession,
  onExportSet,
  onDeleteSet,
  calculateProgress,
}) {
  // Fetch vocabulary lists from database
  const { data: vocabularySets = [], isLoading, error } = useVocabularyListsDB(userId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">
          Failed to load vocabulary lists: {error.message}
        </p>
      </div>
    );
  }

  // ... rest of component code stays the same
```

Add to props type definition:
```typescript
interface VocabularyListProps {
  userId?: string;
  // ... existing props
}
```

## 4. Update Progress Hooks

**File:** `src/hooks/useProgressTracking.ts`

Replace the hooks with database-backed versions:

```typescript
import { useQuery } from '@tanstack/react-query';
import APIClient from '@/lib/api-client';

export function useProgressStats(userId?: string) {
  return useQuery({
    queryKey: ['progress', 'stats', userId],
    queryFn: async () => {
      if (!userId) {
        // Return mock data for unauthenticated users
        return getMockProgressStats();
      }
      const result = await APIClient.getUserProgress(userId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userId,
  });
}

export function useStreakInfo(userId?: string) {
  return useQuery({
    queryKey: ['progress', 'streak', userId],
    queryFn: async () => {
      if (!userId) {
        return { current: 0, longest: 0, today_completed: false };
      }
      const result = await APIClient.getStreakInfo(userId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
  });
}

export function useLearningAnalytics(userId?: string) {
  return useQuery({
    queryKey: ['progress', 'analytics', userId],
    queryFn: async () => {
      if (!userId) {
        return getMockAnalytics();
      }
      const result = await APIClient.getLearningAnalytics(userId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}

// Keep the existing localStorage-based hooks as fallback
function getMockProgressStats() {
  // Return the existing localStorage-based implementation
  // ... existing code
}
```

## 5. Update VocabularyForm Component

**File:** `src/components/VocabularyBuilder/VocabularyForm.tsx`

Replace the component with database integration:

```typescript
import { useCreateVocabularyListDB } from '@/hooks/useVocabulary';

export const VocabularyForm = memo<VocabularyFormProps>(function VocabularyForm({
  show,
  newSetName,
  savedPhrasesCount,
  userId, // Add this prop
  onSetNameChange,
  onCreateSet,
  onCancel,
}) {
  const createList = useCreateVocabularyListDB();

  const handleSubmit = async () => {
    if (!newSetName.trim()) return;

    try {
      await createList.mutateAsync({
        name: newSetName,
        description: `Vocabulary set with ${savedPhrasesCount} phrases`,
        userId: userId,
      });

      // Call parent's onCreateSet for any additional logic
      onCreateSet();
    } catch (error) {
      console.error('Failed to create vocabulary list:', error);
      // Show error toast
    }
  };

  if (!show) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Create New Study Set</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Set Name
          </label>
          <input
            type="text"
            value={newSetName}
            onChange={(e) => onSetNameChange(e.target.value)}
            placeholder="Enter study set name..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!newSetName.trim() || createList.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createList.isPending ? 'Creating...' : `Create Set (${savedPhrasesCount} phrases)`}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
        {createList.error && (
          <p className="text-sm text-red-600">
            Failed to create set: {createList.error.message}
          </p>
        )}
      </div>
    </div>
  );
});
```

## 6. Testing the Integration

### Test API Client
```typescript
// In browser console or test file
import APIClient from '@/lib/api-client';

// Test vocabulary lists
const result = await APIClient.getVocabularyLists();
console.log('Vocabulary lists:', result);

// Test progress
const progress = await APIClient.getUserProgress('user-id-here');
console.log('Progress:', progress);

// Test save description
const saved = await APIClient.saveDescription({
  description_english: 'A beautiful sunset',
  description_spanish: 'Una hermosa puesta de sol',
  description_style: 'poetico',
  image_url: 'https://example.com/image.jpg'
});
console.log('Saved:', saved);
```

### Test Components
```bash
# Run the app
npm run dev

# Open browser to http://localhost:3000
# Check browser console for errors
# Test each component's data loading
```

## 7. Add React Query DevTools (Optional)

**File:** `src/app/layout.tsx` or `pages/_app.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Common Issues & Solutions

### Issue: "Failed to fetch"
**Solution:** Check that the API routes are running and CORS is configured

### Issue: "Cannot read property of undefined"
**Solution:** Add proper null checks and loading states

### Issue: Data not updating after mutation
**Solution:** Ensure query invalidation is called:
```typescript
queryClient.invalidateQueries({ queryKey: ['vocabulary', 'lists'] });
```

### Issue: TypeScript errors
**Solution:** Import types from `@/types/database`:
```typescript
import type { VocabularyList, VocabularyItem } from '@/types/database';
```

## Summary

**Files to Update:**
1. ✅ Created `src/lib/api-client.ts`
2. 🟡 Update `src/components/DescriptionNotebook.tsx` - Add save button
3. 🟡 Update `src/hooks/useVocabulary.ts` - Add React Query hooks
4. 🟡 Update `src/components/VocabularyBuilder/VocabularyList.tsx` - Use new hooks
5. 🟡 Update `src/components/VocabularyBuilder/VocabularyForm.tsx` - Use new hooks
6. 🟡 Update `src/hooks/useProgressTracking.ts` - Replace localStorage with API

**Estimated Time:** 2-3 hours

**Test Checklist:**
- [ ] Vocabulary lists load from database
- [ ] Can create new vocabulary list
- [ ] Progress data displays correctly
- [ ] Can save descriptions
- [ ] Error states show properly
- [ ] Loading states work
- [ ] Real-time updates work (RecentActivity)
