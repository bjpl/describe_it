import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  preventDefault?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: HTMLElement | Document | Window;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {},
) {
  const {
    enabled = true,
    target = typeof document !== "undefined" ? document : null,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle shortcuts when typing in input fields
      const activeElement =
        typeof document !== "undefined" ? document.activeElement : null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !shortcut.ctrlKey || event.ctrlKey;
        const altMatches = !shortcut.altKey || event.altKey;
        const shiftMatches = !shortcut.shiftKey || event.shiftKey;
        const metaMatches = !shortcut.metaKey || event.metaKey;

        // For Cmd+Key combinations, check both ctrlKey (Windows/Linux) and metaKey (Mac)
        const cmdKeyMatches = shortcut.ctrlKey
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;

        if (
          keyMatches &&
          cmdKeyMatches &&
          altMatches &&
          shiftMatches &&
          (!shortcut.metaKey || metaMatches)
        ) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled],
  );

  useEffect(() => {
    if (!enabled || !target) return;

    const targetElement = target as EventTarget;
    targetElement.addEventListener("keydown", handleKeyDown);

    return () => {
      targetElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled, target]);

  return { enabled };
}

// Predefined shortcut configurations
export const createAppShortcuts = (actions: {
  focusSearch?: () => void;
  triggerSearch?: () => void;
  generateDescription?: () => void;
  generateQA?: () => void;
  extractPhrases?: () => void;
  openHelp?: () => void;
  closeModal?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.focusSearch) {
    shortcuts.push({
      key: "k",
      ctrlKey: true,
      action: actions.focusSearch,
      description: "Focus search bar",
    });
  }

  if (actions.triggerSearch) {
    shortcuts.push({
      key: "Enter",
      ctrlKey: true,
      action: actions.triggerSearch,
      description: "Search for images",
    });
  }

  if (actions.generateDescription) {
    shortcuts.push({
      key: "d",
      ctrlKey: true,
      action: actions.generateDescription,
      description: "Generate description",
    });
  }

  if (actions.generateQA) {
    shortcuts.push({
      key: "q",
      ctrlKey: true,
      action: actions.generateQA,
      description: "Generate Q&A",
    });
  }

  if (actions.extractPhrases) {
    shortcuts.push({
      key: "p",
      ctrlKey: true,
      action: actions.extractPhrases,
      description: "Extract phrases",
    });
  }

  if (actions.openHelp) {
    shortcuts.push({
      key: "i",
      ctrlKey: true,
      action: actions.openHelp,
      description: "Open help modal",
    });
  }

  if (actions.closeModal) {
    shortcuts.push({
      key: "Escape",
      action: actions.closeModal,
      description: "Close modal/cancel action",
    });
  }

  return shortcuts;
};

export default useKeyboardShortcuts;
