# Data Persistence Test Suite

Comprehensive integration tests for data persistence mechanisms with 90%+ coverage.

## Test Overview

- **Total Tests**: 114 tests
- **Total Lines**: 1,932 lines of test code
- **Coverage Target**: 90%+ code coverage
- **Test Files**: 3 comprehensive test suites

## Test Files

### 1. localStorage.test.ts (48 tests)

Tests for localStorage persistence with comprehensive coverage:

#### Basic Operations (6 tests)
- ✓ Save data to localStorage
- ✓ Retrieve data from localStorage
- ✓ Update existing data
- ✓ Delete data from localStorage
- ✓ Delete metadata when removing item
- ✓ Clear all data

#### JSON Serialization (9 tests)
- ✓ Save and retrieve JSON objects
- ✓ Save and retrieve arrays
- ✓ Save and retrieve nested objects
- ✓ Handle null values
- ✓ Handle undefined values
- ✓ Handle boolean values
- ✓ Handle number values
- ✓ Handle empty objects
- ✓ Handle empty arrays

#### Quota Management (5 tests)
- ✓ Calculate storage size
- ✓ Calculate storage percentage
- ✓ Analyze storage entries
- ✓ Sort entries by size descending
- ✓ Handle quota exceeded error with auto-cleanup

#### Compression (4 tests)
- ✓ Compress large values
- ✓ Decompress on retrieval
- ✓ Store compression metadata
- ✓ Not compress small values

#### TTL and Expiration (3 tests)
- ✓ Store TTL metadata
- ✓ Cleanup expired items
- ✓ Not cleanup non-expired items

#### Cleanup Strategies (4 tests)
- ✓ Cleanup by priority (remove low priority first)
- ✓ Cleanup LRU items
- ✓ Cleanup largest items first
- ✓ Preserve specified keys during cleanup

#### Cross-tab Synchronization (3 tests)
- ✓ Listen for storage events
- ✓ Notify listeners of changes
- ✓ Remove event listeners

#### Categories (4 tests)
- ✓ Categorize API keys correctly
- ✓ Categorize settings correctly
- ✓ Categorize image cache correctly
- ✓ Clear specific category

#### Health Reports (3 tests)
- ✓ Generate health report
- ✓ Include largest items in report
- ✓ Provide recommendations when storage is high

#### Import/Export (4 tests)
- ✓ Export all data as JSON
- ✓ Not export metadata keys
- ✓ Import data from JSON
- ✓ Handle import errors gracefully

#### Error Handling (3 tests)
- ✓ Handle getItem errors gracefully
- ✓ Handle setItem errors gracefully
- ✓ Handle removeItem errors gracefully

### 2. sessionStorage.test.ts (38 tests)

Tests for sessionStorage persistence and session-specific data:

#### Basic Operations (5 tests)
- ✓ Save data to sessionStorage
- ✓ Retrieve data from sessionStorage
- ✓ Update existing session data
- ✓ Delete session data
- ✓ Clear all session data

#### JSON Serialization (3 tests)
- ✓ Save and retrieve JSON objects
- ✓ Save and retrieve session arrays
- ✓ Handle session metadata

#### Session Store Integration (7 tests)
- ✓ Initialize a new session
- ✓ Initialize session with user ID
- ✓ Track session start time
- ✓ Update last activity timestamp
- ✓ End session
- ✓ Set authentication status
- ✓ Initialize session on authentication if not initialized

#### Activity Tracking (7 tests)
- ✓ Track search activity
- ✓ Limit search history to max items
- ✓ Keep most recent searches
- ✓ Calculate session duration
- ✓ Return zero duration for no session
- ✓ Generate activity summary
- ✓ Return empty summary for no session

#### Session Isolation (3 tests)
- ✓ Isolate data between simulated tabs
- ✓ Not share session data across tabs
- ✓ Maintain separate session histories per tab

#### Temporary Data Management (4 tests)
- ✓ Store temporary form data
- ✓ Store temporary navigation state
- ✓ Store wizard/multi-step form progress
- ✓ Store temporary API responses

#### Error Handling (3 tests)
- ✓ Handle quota exceeded for session storage
- ✓ Handle invalid JSON in session storage
- ✓ Handle missing session data gracefully

#### Preferences Management (3 tests)
- ✓ Maintain session preferences
- ✓ Store session-specific UI state
- ✓ Manage session filters and sorting

#### Auto-clear Simulation (3 tests)
- ✓ Clear session data when simulating tab close
- ✓ Preserve localStorage when session clears
- ✓ Handle beforeunload event

### 3. state-hydration.test.ts (28 tests)

Tests for state restoration and hydration:

#### App Store Persistence (6 tests)
- ✓ Persist app state to localStorage
- ✓ Restore app state from localStorage on mount
- ✓ Merge persisted state with initial state
- ✓ Persist search history
- ✓ Persist user preferences
- ✓ Not persist transient state (currentImage, isLoading, error)

#### Corrupted Data Handling (5 tests)
- ✓ Handle corrupted JSON in localStorage
- ✓ Handle missing state property in stored data
- ✓ Handle partially corrupted preferences
- ✓ Handle invalid data types in stored state
- ✓ Handle storage quota exceeded during persistence

#### SSR Safety (4 tests)
- ✓ Create SSR-safe storage
- ✓ Handle SSR environment gracefully
- ✓ Use provided storage when available
- ✓ Handle storage errors gracefully

#### Version Migration (3 tests)
- ✓ Handle version mismatches
- ✓ Migrate deprecated fields
- ✓ Preserve version number in persisted state

#### Session Store (3 tests)
- ✓ Not persist session state (by design)
- ✓ Create new session on each tab
- ✓ Maintain session during page refresh if desired

#### Deduplication (2 tests)
- ✓ Deduplicate search history on hydration
- ✓ Limit search history to maxHistoryItems on hydration

#### Timing (2 tests)
- ✓ Hydrate asynchronously
- ✓ Not cause hydration mismatches

#### Export/Import (3 tests)
- ✓ Export current state
- ✓ Import and apply state
- ✓ Validate imported state structure

## Test Coverage Areas

### LocalStorage Manager
- ✅ Basic CRUD operations
- ✅ JSON serialization/deserialization
- ✅ Storage quota calculation and monitoring
- ✅ Automatic cleanup strategies (LRU, TTL, size, priority)
- ✅ Compression for large values
- ✅ TTL-based expiration
- ✅ Cross-tab synchronization via storage events
- ✅ Category-based organization
- ✅ Health reports and recommendations
- ✅ Import/export functionality
- ✅ Error handling and recovery

### SessionStorage
- ✅ Session-specific data storage
- ✅ Tab isolation
- ✅ Session lifecycle management
- ✅ Activity tracking
- ✅ Temporary data management
- ✅ Auto-clear behavior
- ✅ Session metadata

### State Hydration
- ✅ State restoration from localStorage
- ✅ SSR-safe hydration
- ✅ Merge strategy for persisted state
- ✅ Corrupted data recovery
- ✅ Version migration
- ✅ Asynchronous hydration
- ✅ Deduplication
- ✅ Export/import state

## Running the Tests

### Run All Persistence Tests
```bash
npm test tests/integration/persistence
```

### Run Specific Test File
```bash
npm test tests/integration/persistence/localStorage.test.ts
npm test tests/integration/persistence/sessionStorage.test.ts
npm test tests/integration/persistence/state-hydration.test.ts
```

### Run with Coverage
```bash
npm test tests/integration/persistence -- --coverage
```

### Watch Mode
```bash
npm test tests/integration/persistence -- --watch
```

## Test Patterns Used

### 1. Arrange-Act-Assert (AAA)
```typescript
it('should save data to localStorage', () => {
  // Arrange
  const key = 'test-key';
  const value = 'test-value';

  // Act
  const success = localStorageManager.setItem(key, value);

  // Assert
  expect(success).toBe(true);
  expect(localStorage.getItem(key)).toBe(value);
});
```

### 2. Setup and Teardown
```typescript
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});
```

### 3. Mocking and Spying
```typescript
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = vi.fn(() => {
  throw new Error('QuotaExceededError');
});
// ... test code ...
Storage.prototype.setItem = originalSetItem;
```

### 4. Asynchronous Testing
```typescript
await waitFor(() => {
  expect(result.current.sidebarOpen).toBe(true);
});
```

## Key Features Tested

### Storage Quota Management
- Automatic quota calculation
- Warning and critical thresholds
- Automatic cleanup when quota exceeded
- Multiple cleanup strategies (LRU, TTL, size, priority)

### Data Integrity
- JSON serialization safety
- Corrupted data recovery
- Type validation
- Schema migration

### Performance Optimization
- Compression for large values
- Efficient cleanup algorithms
- Deduplication
- Category-based prioritization

### Cross-tab Communication
- Storage event listeners
- State synchronization
- Conflict resolution

### Error Handling
- Graceful degradation
- Quota exceeded handling
- JSON parse errors
- Storage access errors

## Coverage Metrics

Expected coverage for persistence modules:

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| LocalStorageManager | 95%+ | 90%+ | 95%+ | 95%+ |
| SessionStore | 95%+ | 90%+ | 95%+ | 95%+ |
| SSR Persist | 90%+ | 85%+ | 90%+ | 90%+ |
| **Overall** | **93%+** | **88%+** | **93%+** | **93%+** |

## Test Data Fixtures

### Sample User Preferences
```typescript
const defaultPreferences = {
  theme: 'auto',
  language: 'en',
  defaultDescriptionStyle: 'conversacional',
  autoSaveDescriptions: true,
  maxHistoryItems: 50,
  exportFormat: 'json'
};
```

### Sample Search History Entry
```typescript
const searchEntry = {
  id: 'search-123',
  query: 'test search',
  timestamp: new Date(),
  resultCount: 5
};
```

### Sample Session Data
```typescript
const session = {
  id: 'session-123',
  userId: 'user-456',
  startTime: new Date(),
  lastActivity: new Date(),
  searchHistory: [],
  preferences: defaultPreferences,
  isAuthenticated: true
};
```

## Known Issues and Limitations

1. **IndexedDB Testing**: Not included in current suite (localStorage/sessionStorage only)
2. **Service Worker Integration**: Persistence with service workers not tested
3. **Large Data Sets**: Performance tests for very large datasets (>100MB) not included
4. **Concurrent Modifications**: Race conditions between tabs not extensively tested

## Future Enhancements

- [ ] Add IndexedDB persistence tests
- [ ] Add Web Storage API quota estimate tests
- [ ] Add service worker cache integration tests
- [ ] Add performance benchmarks for large datasets
- [ ] Add concurrency and race condition tests
- [ ] Add encryption/decryption tests for sensitive data
- [ ] Add compression ratio analysis tests

## Related Documentation

- [LocalStorageManager API](/src/lib/storage/LocalStorageManager.ts)
- [HybridStorageManager API](/src/lib/storage/HybridStorageManager.ts)
- [SSR Persist Middleware](/src/lib/store/middleware/ssrPersist.ts)
- [Zustand Stores](/src/lib/store/)

## Contributing

When adding new persistence tests:

1. Follow the AAA pattern (Arrange-Act-Assert)
2. Use descriptive test names starting with "should"
3. Group related tests in describe blocks
4. Clean up state in beforeEach/afterEach
5. Mock external dependencies
6. Test both success and error paths
7. Aim for 90%+ coverage of new code

## License

These tests are part of the DescribeIt project and follow the same license.
