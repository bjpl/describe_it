import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

/**
 * Accessibility testing utilities and WCAG compliance helpers
 */

interface AccessibilityTestResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    element?: string;
  }>;
  warnings: string[];
}

interface KeyboardNavigationTest {
  element: HTMLElement;
  expectedFocusOrder: string[];
  passed: boolean;
  violations: string[];
}

// ARIA attribute validation
export const validateAriaAttributes = (element: HTMLElement): AccessibilityTestResult => {
  const violations: AccessibilityTestResult['violations'] = [];
  const warnings: string[] = [];

  // Check for required ARIA labels on interactive elements
  const interactiveElements = element.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'
  );

  interactiveElements.forEach((el, index) => {
    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    const textContent = el.textContent?.trim();
    const alt = el.getAttribute('alt');
    const title = el.getAttribute('title');

    // Check if element has accessible name
    const hasAccessibleName = ariaLabel || ariaLabelledBy || textContent || alt || title;

    if (!hasAccessibleName) {
      violations.push({
        rule: 'accessible-name',
        description: `Interactive element (${tagName}) must have an accessible name`,
        severity: 'error',
        element: `${tagName}[${index}]`,
      });
    }

    // Check for invalid ARIA attributes
    const ariaAttributes = Array.from(el.attributes).filter(attr => 
      attr.name.startsWith('aria-')
    );

    ariaAttributes.forEach(attr => {
      if (attr.name === 'aria-labelledby') {
        const labelIds = attr.value.split(' ');
        labelIds.forEach(id => {
          if (!element.querySelector(`#${id}`)) {
            violations.push({
              rule: 'aria-labelledby-valid',
              description: `aria-labelledby references non-existent element with id="${id}"`,
              severity: 'error',
              element: `${tagName}[${index}]`,
            });
          }
        });
      }
    });
  });

  // Check for proper heading hierarchy
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  
  headings.forEach((heading, index) => {
    const currentLevel = parseInt(heading.tagName.charAt(1));
    
    if (currentLevel > previousLevel + 1) {
      violations.push({
        rule: 'heading-hierarchy',
        description: `Heading levels should increase by one (found h${currentLevel} after h${previousLevel})`,
        severity: 'warning',
        element: `h${currentLevel}[${index}]`,
      });
    }
    
    previousLevel = currentLevel;
  });

  // Check for images without alt text
  const images = element.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.hasAttribute('alt')) {
      violations.push({
        rule: 'img-alt',
        description: 'Images must have alt attributes',
        severity: 'error',
        element: `img[${index}]`,
      });
    }
  });

  // Check for form labels
  const formInputs = element.querySelectorAll('input, select, textarea');
  formInputs.forEach((input, index) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const label = id ? element.querySelector(`label[for="${id}"]`) : null;
    
    if (!label && !ariaLabel && !ariaLabelledBy) {
      violations.push({
        rule: 'form-label',
        description: 'Form inputs must have associated labels',
        severity: 'error',
        element: `${input.tagName.toLowerCase()}[${index}]`,
      });
    }
  });

  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    warnings,
  };
};

// Keyboard navigation testing
export const testKeyboardNavigation = async (
  component: ReactElement,
  expectedFocusOrder: string[]
): Promise<KeyboardNavigationTest> => {
  const user = userEvent.setup();
  const { container } = render(component);
  
  const violations: string[] = [];
  let currentFocusIndex = -1;

  // Start from the first focusable element
  const focusableElements = container.querySelectorAll(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) {
    violations.push('No focusable elements found');
    return {
      element: container,
      expectedFocusOrder,
      passed: false,
      violations,
    };
  }

  // Test Tab navigation
  for (let i = 0; i < expectedFocusOrder.length; i++) {
    await user.tab();
    
    const focusedElement = document.activeElement;
    if (!focusedElement) {
      violations.push(`No element focused at position ${i}`);
      continue;
    }

    const expectedIdentifier = expectedFocusOrder[i];
    const actualIdentifier = 
      focusedElement.getAttribute('aria-label') ||
      focusedElement.getAttribute('data-testid') ||
      focusedElement.textContent?.trim() ||
      focusedElement.tagName.toLowerCase();

    if (!actualIdentifier?.includes(expectedIdentifier)) {
      violations.push(
        `Expected focus on element containing "${expectedIdentifier}", but got "${actualIdentifier}"`
      );
    }
  }

  // Test Shift+Tab (reverse navigation)
  for (let i = expectedFocusOrder.length - 2; i >= 0; i--) {
    await user.tab({ shift: true });
    
    const focusedElement = document.activeElement;
    if (!focusedElement) {
      violations.push(`No element focused during reverse navigation at position ${i}`);
      continue;
    }

    const expectedIdentifier = expectedFocusOrder[i];
    const actualIdentifier = 
      focusedElement.getAttribute('aria-label') ||
      focusedElement.getAttribute('data-testid') ||
      focusedElement.textContent?.trim() ||
      focusedElement.tagName.toLowerCase();

    if (!actualIdentifier?.includes(expectedIdentifier)) {
      violations.push(
        `Reverse navigation: Expected focus on "${expectedIdentifier}", but got "${actualIdentifier}"`
      );
    }
  }

  return {
    element: container,
    expectedFocusOrder,
    passed: violations.length === 0,
    violations,
  };
};

// Color contrast testing
export const testColorContrast = (element: HTMLElement): AccessibilityTestResult => {
  const violations: AccessibilityTestResult['violations'] = [];
  const warnings: string[] = [];

  // Helper function to calculate relative luminance
  const calculateLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Helper function to calculate contrast ratio
  const calculateContrast = (color1: string, color2: string): number => {
    // This is a simplified implementation
    // In a real scenario, you'd want a more robust color parsing
    const rgb1 = color1.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const rgb2 = color2.match(/\d+/g)?.map(Number) || [255, 255, 255];
    
    const lum1 = calculateLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const lum2 = calculateLuminance(rgb2[0], rgb2[1], rgb2[2]);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  // Check text elements for contrast
  const textElements = element.querySelectorAll('*');
  
  textElements.forEach((el, index) => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const backgroundColor = style.backgroundColor;
    const fontSize = parseFloat(style.fontSize);
    
    if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const contrast = calculateContrast(color, backgroundColor);
      
      // WCAG AA requirements
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && style.fontWeight === 'bold');
      const minContrast = isLargeText ? 3 : 4.5;
      
      if (contrast < minContrast) {
        violations.push({
          rule: 'color-contrast',
          description: `Insufficient color contrast ratio: ${contrast.toFixed(2)} (minimum: ${minContrast})`,
          severity: 'error',
          element: `${el.tagName.toLowerCase()}[${index}]`,
        });
      }
    }
  });

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
};

// Screen reader compatibility testing
export const testScreenReaderCompatibility = (element: HTMLElement): AccessibilityTestResult => {
  const violations: AccessibilityTestResult['violations'] = [];
  const warnings: string[] = [];

  // Check for proper semantic HTML
  const checkSemanticHTML = () => {
    const genericElements = element.querySelectorAll('div, span');
    genericElements.forEach((el, index) => {
      const hasRole = el.hasAttribute('role');
      const hasAriaLabel = el.hasAttribute('aria-label');
      const isInteractive = el.hasAttribute('onclick') || el.hasAttribute('tabindex');
      
      if (isInteractive && !hasRole && !hasAriaLabel) {
        warnings.push(`Interactive ${el.tagName.toLowerCase()}[${index}] should have proper role or aria-label`);
      }
    });
  };

  // Check for proper landmark usage
  const checkLandmarks = () => {
    const hasMain = element.querySelector('main, [role="main"]');
    const hasNav = element.querySelector('nav, [role="navigation"]');
    const hasHeader = element.querySelector('header, [role="banner"]');
    const hasFooter = element.querySelector('footer, [role="contentinfo"]');
    
    if (!hasMain) {
      warnings.push('Page should have a main landmark');
    }
  };

  // Check for proper list structure
  const checkListStructure = () => {
    const lists = element.querySelectorAll('ul, ol');
    lists.forEach((list, index) => {
      const directChildren = Array.from(list.children);
      const hasInvalidChildren = directChildren.some(child => child.tagName !== 'LI');
      
      if (hasInvalidChildren) {
        violations.push({
          rule: 'list-structure',
          description: 'Lists should only contain li elements as direct children',
          severity: 'error',
          element: `${list.tagName.toLowerCase()}[${index}]`,
        });
      }
    });
  };

  checkSemanticHTML();
  checkLandmarks();
  checkListStructure();

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
};

// Focus management testing
export const testFocusManagement = async (
  component: ReactElement,
  interactions: Array<{
    action: 'click' | 'keydown' | 'focus';
    target: string;
    key?: string;
    expectedFocus?: string;
  }>
) => {
  const user = userEvent.setup();
  const { container } = render(component);
  
  const violations: string[] = [];

  for (const interaction of interactions) {
    const target = screen.getByTestId(interaction.target) || 
                  screen.getByRole('button', { name: interaction.target }) ||
                  container.querySelector(`[data-testid="${interaction.target}"]`);

    if (!target) {
      violations.push(`Target element not found: ${interaction.target}`);
      continue;
    }

    // Perform the interaction
    switch (interaction.action) {
      case 'click':
        await user.click(target);
        break;
      case 'keydown':
        await user.type(target, interaction.key || '');
        break;
      case 'focus':
        target.focus();
        break;
    }

    // Check expected focus
    if (interaction.expectedFocus) {
      const expectedElement = screen.queryByTestId(interaction.expectedFocus) ||
                             container.querySelector(`[data-testid="${interaction.expectedFocus}"]`);
      
      if (document.activeElement !== expectedElement) {
        violations.push(
          `After ${interaction.action} on ${interaction.target}, expected focus on ${interaction.expectedFocus}`
        );
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
};

// ARIA live regions testing
export const testLiveRegions = async (
  component: ReactElement,
  updates: Array<{
    trigger: string;
    expectedAnnouncement: string;
  }>
) => {
  const { container } = render(component);
  const user = userEvent.setup();
  
  const violations: string[] = [];
  const announcements: string[] = [];

  // Mock screen reader announcements
  const liveRegions = container.querySelectorAll('[aria-live]');
  
  // Set up observers for live region changes
  const observers: MutationObserver[] = [];
  
  liveRegions.forEach(region => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const text = (mutation.target as HTMLElement).textContent;
          if (text) {
            announcements.push(text);
          }
        }
      });
    });
    
    observer.observe(region, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    observers.push(observer);
  });

  // Perform updates and check announcements
  for (const update of updates) {
    const trigger = screen.getByTestId(update.trigger) ||
                   container.querySelector(`[data-testid="${update.trigger}"]`);
    
    if (!trigger) {
      violations.push(`Trigger element not found: ${update.trigger}`);
      continue;
    }

    await user.click(trigger);
    
    // Wait for announcements
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const hasExpectedAnnouncement = announcements.some(announcement => 
      announcement.includes(update.expectedAnnouncement)
    );
    
    if (!hasExpectedAnnouncement) {
      violations.push(
        `Expected announcement containing "${update.expectedAnnouncement}" after triggering ${update.trigger}`
      );
    }
  }

  // Clean up observers
  observers.forEach(observer => observer.disconnect());

  return {
    passed: violations.length === 0,
    violations,
    announcements,
  };
};

// Comprehensive accessibility test suite
export const runAccessibilityTests = async (
  component: ReactElement,
  options: {
    skipKeyboardTest?: boolean;
    skipColorContrastTest?: boolean;
    skipScreenReaderTest?: boolean;
    expectedFocusOrder?: string[];
  } = {}
): Promise<{
  passed: boolean;
  results: {
    ariaAttributes: AccessibilityTestResult;
    keyboardNavigation?: KeyboardNavigationTest;
    colorContrast?: AccessibilityTestResult;
    screenReader?: AccessibilityTestResult;
  };
  summary: {
    totalTests: number;
    passedTests: number;
    totalViolations: number;
    criticalViolations: number;
  };
}> => {
  const { container } = render(component);
  
  const results: any = {};
  
  // Run ARIA attributes test
  results.ariaAttributes = validateAriaAttributes(container);
  
  // Run keyboard navigation test
  if (!options.skipKeyboardTest && options.expectedFocusOrder) {
    results.keyboardNavigation = await testKeyboardNavigation(
      component,
      options.expectedFocusOrder
    );
  }
  
  // Run color contrast test
  if (!options.skipColorContrastTest) {
    results.colorContrast = testColorContrast(container);
  }
  
  // Run screen reader test
  if (!options.skipScreenReaderTest) {
    results.screenReader = testScreenReaderCompatibility(container);
  }
  
  // Calculate summary
  const allResults = Object.values(results).filter(Boolean) as Array<
    AccessibilityTestResult | KeyboardNavigationTest
  >;
  
  const totalTests = allResults.length;
  const passedTests = allResults.filter(result => result.passed).length;
  
  const allViolations = allResults.flatMap(result => 
    'violations' in result && Array.isArray(result.violations) 
      ? result.violations 
      : []
  );
  
  const totalViolations = allViolations.length;
  const criticalViolations = allViolations.filter(v => 
    typeof v === 'object' && v.severity === 'error'
  ).length;
  
  return {
    passed: passedTests === totalTests,
    results,
    summary: {
      totalTests,
      passedTests,
      totalViolations,
      criticalViolations,
    },
  };
};

// Utility functions for common accessibility patterns
export const accessibilityUtils = {
  // Generate unique IDs for form associations
  generateId: (prefix: string = 'a11y') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Create accessible button props
  createButtonProps: (label: string, options: {
    disabled?: boolean;
    pressed?: boolean;
    expanded?: boolean;
  } = {}) => ({
    'aria-label': label,
    'aria-disabled': options.disabled,
    'aria-pressed': options.pressed,
    'aria-expanded': options.expanded,
    role: 'button',
    tabIndex: options.disabled ? -1 : 0,
  }),
  
  // Create accessible form field props
  createFormFieldProps: (label: string, options: {
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
  } = {}) => {
    const fieldId = accessibilityUtils.generateId('field');
    const labelId = accessibilityUtils.generateId('label');
    
    return {
      field: {
        id: fieldId,
        'aria-labelledby': labelId,
        'aria-required': options.required,
        'aria-invalid': options.invalid,
        'aria-describedby': options.describedBy,
      },
      label: {
        id: labelId,
        htmlFor: fieldId,
      },
    };
  },
};

export default {
  validateAriaAttributes,
  testKeyboardNavigation,
  testColorContrast,
  testScreenReaderCompatibility,
  testFocusManagement,
  testLiveRegions,
  runAccessibilityTests,
  accessibilityUtils,
};
