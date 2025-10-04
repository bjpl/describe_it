# Onboarding System Integration Guide

## Overview

The onboarding system provides a comprehensive, multi-step wizard that guides new users through setting up their learning experience. It integrates seamlessly with the existing AuthManager and settings system.

## Quick Start

### 1. Basic Integration

```tsx
import { OnboardingProvider, OnboardingWizard } from '../components/Onboarding';

function App() {
  return (
    <OnboardingProvider autoShow={true}>
      <YourAppContent />
    </OnboardingProvider>
  );
}
```

### 2. Manual Control

```tsx
import { useOnboardingContext } from '../components/Onboarding/OnboardingProvider';

function WelcomeButton() {
  const { showOnboarding } = useOnboardingContext();
  
  return (
    <button onClick={showOnboarding}>
      Start Setup Tour
    </button>
  );
}
```

### 3. Direct Component Usage

```tsx
import { OnboardingWizard } from '../components/Onboarding';

function CustomOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <OnboardingWizard
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onComplete={() => {
        setIsOpen(false);
        // Handle completion
      }}
    />
  );
}
```

## Components

### OnboardingWizard

Main container component that manages the wizard flow.

**Props:**
- `isOpen: boolean` - Controls wizard visibility
- `onClose: () => void` - Called when user closes wizard
- `onComplete: () => void` - Called when onboarding is completed
- `className?: string` - Additional CSS classes

### Individual Steps

1. **WelcomeStep** - App introduction and overview
2. **ApiKeySetup** - Optional API key configuration
3. **PreferencesSetup** - Learning preferences and profile setup
4. **TutorialStep** - Interactive feature tour
5. **CompletionStep** - Celebration and next steps

All step components follow the same prop interface:
```tsx
interface StepProps {
  onNext: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  className?: string;
}
```

## Hook Usage

### useOnboarding

Provides complete state management for the onboarding flow:

```tsx
import useOnboarding from '../hooks/useOnboarding';

function MyComponent() {
  const {
    currentStep,
    steps,
    isComplete,
    progress,
    nextStep,
    prevStep,
    updateUserData,
    updatePreferences,
    completeOnboarding
  } = useOnboarding();
  
  // Your component logic
}
```

**State Properties:**
- `currentStep: number` - Current step index
- `steps: OnboardingStep[]` - Array of step configurations
- `isLoading: boolean` - Loading state during operations
- `isComplete: boolean` - Whether onboarding is finished
- `progress: number` - Completion percentage (0-100)
- `userData: Partial<UserProfile>` - Collected user data
- `preferences: Partial<AppSettings>` - User preferences

**Actions:**
- `nextStep()` - Move to next step
- `prevStep()` - Move to previous step
- `goToStep(index)` - Jump to specific step
- `skipStep()` - Skip current step (if optional)
- `skipOnboarding()` - Skip entire onboarding
- `updateUserData(data)` - Update user profile data
- `updatePreferences(prefs)` - Update user preferences
- `completeOnboarding()` - Complete and save onboarding
- `restartOnboarding()` - Reset to beginning

## Integration with Existing Systems

### AuthManager Integration

The onboarding system automatically integrates with the AuthManager:

- Saves user profile updates via `authManager.updateProfile()`
- Stores API keys securely via `authManager.saveApiKeys()`
- Checks for existing user data to skip completed sections
- Works for both authenticated and guest users

### Settings Integration

Preferences are automatically saved to:

1. **For logged-in users:** Supabase user preferences
2. **For guest users:** Local settings via `settingsManager`

Settings are applied immediately during the onboarding process.

### Supabase Integration

User preferences are stored in the `users` table with the following structure:

```sql
-- preferences column (JSONB)
{
  "onboarding_completed": true,
  "onboarding_completed_at": "2024-01-01T00:00:00.000Z",
  "theme": "dark",
  "language": "en",
  // ... other preferences
}
```

## Customization

### Styling

All components use Tailwind CSS with dark mode support:

```tsx
<OnboardingWizard 
  className="custom-onboarding-styles"
  // ... other props
/>
```

### Custom Steps

Add new steps by extending the `ONBOARDING_STEPS` array:

```tsx
const customSteps = [
  ...ONBOARDING_STEPS,
  {
    id: 'custom-step',
    title: 'Custom Step',
    description: 'Your custom step description',
    component: 'CustomStepComponent'
  }
];
```

### Animations

Built with Framer Motion for smooth animations:

- Step transitions slide horizontally
- Progress bar animates smoothly
- Confetti celebration on completion
- Hover effects and micro-interactions

## Storage & Persistence

### Progress Saving

Onboarding progress is automatically saved to `localStorage`:

```json
{
  "currentStep": 2,
  "userData": { "full_name": "John Doe" },
  "preferences": { "theme": { "mode": "dark" } },
  "completedSteps": ["welcome", "api-keys"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Completion Tracking

Completion is tracked via:
1. `localStorage.setItem('onboarding-completed', 'true')`
2. User preferences in database
3. Profile completion indicators

## Mobile Responsiveness

The onboarding system is fully responsive:

- Modal adapts to screen size
- Touch-friendly interactions
- Optimized layouts for mobile devices
- Accessible keyboard navigation

## Accessibility Features

- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatible
- High contrast mode support
- Configurable font sizes

## Performance Considerations

- Lazy loading of step components
- Debounced preference updates
- Optimized re-renders with proper memoization
- Minimal bundle impact with tree-shaking

## Testing

Test the onboarding system:

```tsx
// Reset onboarding state
localStorage.removeItem('onboarding-completed');
localStorage.removeItem('onboarding-progress');

// Force show onboarding
<OnboardingProvider forceShow={true}>
  <App />
</OnboardingProvider>
```

## Troubleshooting

### Common Issues

1. **Onboarding doesn't show:**
   - Check if `onboarding-completed` is in localStorage
   - Verify user doesn't have existing preferences
   - Ensure `autoShow` is enabled

2. **Progress not saving:**
   - Check localStorage quota
   - Verify no errors in browser console
   - Test with different browsers

3. **Preferences not applying:**
   - Check settingsManager integration
   - Verify Supabase connection for logged-in users
   - Test preference updates manually

### Debug Mode

Enable debug logging:

```tsx
const { isComplete, currentStep, preferences } = useOnboarding();
console.log('Onboarding State:', { isComplete, currentStep, preferences });
```

## API Reference

See the TypeScript definitions in the component files for complete API documentation. All components are fully typed with comprehensive interfaces.