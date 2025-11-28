/**
 * Fallback Visibility Fix
 * Ensures content is never stuck invisible due to animation failures
 * This runs as early as possible in the client-side bundle
 */

/* eslint-disable no-console, custom-rules/require-logger */
if (typeof window !== 'undefined') {
  // Run after a delay to give Framer Motion a chance to work
  setTimeout(() => {
    // Find all elements with opacity:0 inline style
    const hiddenElements = document.querySelectorAll('[style*="opacity:0"], [style*="opacity: 0"]');

    if (hiddenElements.length > 0) {
      console.warn(`[Fallback] Found ${hiddenElements.length} hidden elements, making visible...`);

      hiddenElements.forEach(element => {
        if (element instanceof HTMLElement) {
          // Smoothly fade in the element
          element.style.transition = 'opacity 0.5s ease-in, transform 0.5s ease-in';
          element.style.opacity = '1';
          element.style.transform = 'translateY(0px) translateX(0px)';
        }
      });

      console.log('[Fallback] All hidden elements are now visible');
    }
  }, 2000); // Wait 2 seconds for Framer Motion to initialize

  // Additional check after 4 seconds for any remaining hidden elements
  setTimeout(() => {
    const stillHidden = document.querySelectorAll('[style*="opacity:0"], [style*="opacity: 0"]');
    if (stillHidden.length > 0) {
      console.warn(`[Fallback] Secondary check: ${stillHidden.length} elements still hidden, forcing visibility...`);
      stillHidden.forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.opacity = '1';
          element.style.transform = 'none';
        }
      });
    }
  }, 4000);
}

export {};
