import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout, { metadata } from '@/app/layout';
import '@testing-library/jest-dom';

// Mock the Providers component
vi.mock('@/app/providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <div data-testid="providers">{children}</div>
}));

// Mock Next.js font
vi.mock('next/font/google', () => ({
  Inter: () => ({
    className: 'inter-font'
  })
}));

describe('RootLayout Component', () => {
  // 1. Metadata Tests
  describe('Metadata Configuration', () => {
    it('should have correct title', () => {
      expect(metadata.title).toBe('Describe It - Spanish Learning with Images');
    });

    it('should have correct description', () => {
      expect(metadata.description).toBe('Learn Spanish through visual descriptions, Q&A, and vocabulary extraction');
    });

    it('should have viewport configuration', () => {
      expect(metadata.viewport).toBe('width=device-width, initial-scale=1');
    });

    it('should have theme color', () => {
      expect(metadata.themeColor).toBe('#3b82f6');
    });

    it('should have manifest path', () => {
      expect(metadata.manifest).toBe('/manifest.json');
    });

    it('should have favicon configuration', () => {
      expect(metadata.icons).toEqual({
        icon: '/favicon.ico',
        apple: '/apple-touch-icon.png'
      });
    });

    it('should have OpenGraph configuration', () => {
      expect(metadata.openGraph).toEqual({
        title: 'Describe It - Spanish Learning with Images',
        description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
        type: 'website',
        locale: 'en_US'
      });
    });

    it('should have robots configuration', () => {
      expect(metadata.robots).toBeDefined();
      expect(metadata.robots?.index).toBe(true);
      expect(metadata.robots?.follow).toBe(true);
    });

    it('should have Google bot specific settings', () => {
      const googleBot = metadata.robots?.googleBot;
      expect(googleBot).toBeDefined();
      expect(googleBot?.index).toBe(true);
      expect(googleBot?.follow).toBe(true);
    });
  });

  // 2. HTML Structure Tests
  describe('HTML Structure', () => {
    it('should render html element with lang attribute', () => {
      const { container } = render(
        <RootLayout>
          <div>Test Content</div>
        </RootLayout>
      );

      const html = container.querySelector('html');
      expect(html).toHaveAttribute('lang', 'en');
    });

    it('should render body element', () => {
      const { container } = render(
        <RootLayout>
          <div>Test Content</div>
        </RootLayout>
      );

      const body = container.querySelector('body');
      expect(body).toBeInTheDocument();
    });

    it('should apply Inter font className to body', () => {
      const { container } = render(
        <RootLayout>
          <div>Test Content</div>
        </RootLayout>
      );

      const body = container.querySelector('body');
      expect(body).toHaveClass('inter-font');
    });

    it('should apply min-height and background classes to body', () => {
      const { container } = render(
        <RootLayout>
          <div>Test Content</div>
        </RootLayout>
      );

      const body = container.querySelector('body');
      expect(body).toHaveClass('min-h-screen', 'bg-gray-50');
    });
  });

  // 3. Preconnect Links Tests
  describe('Preconnect Links', () => {
    it('should have preconnect to Unsplash', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const preconnect = head?.querySelector('link[href="https://images.unsplash.com"]');
      expect(preconnect).toBeInTheDocument();
      expect(preconnect).toHaveAttribute('rel', 'preconnect');
    });

    it('should have preconnect to OpenAI', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const preconnect = head?.querySelector('link[href="https://api.openai.com"]');
      expect(preconnect).toBeInTheDocument();
    });

    it('should have preconnect to Google Fonts', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const preconnect = head?.querySelector('link[href="https://fonts.googleapis.com"]');
      expect(preconnect).toBeInTheDocument();
    });

    it('should have preconnect to Google Fonts static with crossOrigin', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const preconnect = head?.querySelector('link[href="https://fonts.gstatic.com"]');
      expect(preconnect).toBeInTheDocument();
      expect(preconnect).toHaveAttribute('crossOrigin', 'anonymous');
    });
  });

  // 4. DNS Prefetch Tests
  describe('DNS Prefetch Links', () => {
    it('should have dns-prefetch for Unsplash images', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const dnsPrefetch = head?.querySelector('link[rel="dns-prefetch"][href="https://images.unsplash.com"]');
      expect(dnsPrefetch).toBeInTheDocument();
    });

    it('should have dns-prefetch for Unsplash plus', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const dnsPrefetch = head?.querySelector('link[rel="dns-prefetch"][href="https://plus.unsplash.com"]');
      expect(dnsPrefetch).toBeInTheDocument();
    });
  });

  // 5. Resource Hints Tests
  describe('Resource Hints', () => {
    it('should have prefetch for translate API', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const prefetch = head?.querySelector('link[rel="prefetch"][href="/api/translate"]');
      expect(prefetch).toBeInTheDocument();
    });

    it('should have prefetch for phrases extract API', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const prefetch = head?.querySelector('link[rel="prefetch"][href="/api/phrases/extract"]');
      expect(prefetch).toBeInTheDocument();
    });
  });

  // 6. Meta Tags Tests
  describe('Meta Tags', () => {
    it('should have X-UA-Compatible meta tag', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const meta = head?.querySelector('meta[http-equiv="X-UA-Compatible"]');
      expect(meta).toBeInTheDocument();
      expect(meta).toHaveAttribute('content', 'IE=edge');
    });

    it('should have format-detection meta tag', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');
      const meta = head?.querySelector('meta[name="format-detection"]');
      expect(meta).toBeInTheDocument();
      expect(meta).toHaveAttribute('content', 'telephone=no');
    });
  });

  // 7. Providers Integration Tests
  describe('Providers Integration', () => {
    it('should wrap children with Providers component', () => {
      const { getByTestId } = render(
        <RootLayout>
          <div>Test Content</div>
        </RootLayout>
      );

      expect(getByTestId('providers')).toBeInTheDocument();
    });

    it('should render children inside Providers', () => {
      const { getByText } = render(
        <RootLayout>
          <div>Test Content</div>
        </RootLayout>
      );

      expect(getByText('Test Content')).toBeInTheDocument();
    });
  });

  // 8. Children Rendering Tests
  describe('Children Rendering', () => {
    it('should render single child', () => {
      const { getByText } = render(
        <RootLayout>
          <div>Single Child</div>
        </RootLayout>
      );

      expect(getByText('Single Child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <RootLayout>
          <div>Child 1</div>
          <div>Child 2</div>
        </RootLayout>
      );

      expect(getByText('Child 1')).toBeInTheDocument();
      expect(getByText('Child 2')).toBeInTheDocument();
    });

    it('should render complex child components', () => {
      const ComplexChild = () => (
        <div>
          <h1>Title</h1>
          <p>Content</p>
        </div>
      );

      const { getByText } = render(
        <RootLayout>
          <ComplexChild />
        </RootLayout>
      );

      expect(getByText('Title')).toBeInTheDocument();
      expect(getByText('Content')).toBeInTheDocument();
    });
  });

  // 9. Performance Optimization Tests
  describe('Performance Optimizations', () => {
    it('should have all required performance optimization links', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const head = container.querySelector('head');

      // Check for preconnect links (4 total)
      const preconnects = head?.querySelectorAll('link[rel="preconnect"]');
      expect(preconnects?.length).toBeGreaterThanOrEqual(4);

      // Check for dns-prefetch links (2 total)
      const dnsPrefetch = head?.querySelectorAll('link[rel="dns-prefetch"]');
      expect(dnsPrefetch?.length).toBeGreaterThanOrEqual(2);

      // Check for prefetch links (2 total)
      const prefetch = head?.querySelectorAll('link[rel="prefetch"]');
      expect(prefetch?.length).toBeGreaterThanOrEqual(2);
    });
  });

  // 10. Accessibility Tests
  describe('Accessibility', () => {
    it('should have lang attribute on html element', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const html = container.querySelector('html');
      expect(html).toHaveAttribute('lang');
    });

    it('should have proper document structure', () => {
      const { container } = render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      expect(container.querySelector('html')).toBeInTheDocument();
      expect(container.querySelector('head')).toBeInTheDocument();
      expect(container.querySelector('body')).toBeInTheDocument();
    });
  });
});
