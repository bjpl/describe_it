import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Setup MSW for API mocking
import { setupMSW } from './mocks/msw.setup';
setupMSW();

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock Lucide React icons - Complete set for React 19 compatibility
vi.mock('lucide-react', () => ({
  // Core icons
  Search: ({ className = '', ...props }) => <svg data-testid="search-icon" className={className} {...props} />,
  Settings: ({ className = '', ...props }) => <svg data-testid="settings-icon" className={className} {...props} />,
  Download: ({ className = '', ...props }) => <svg data-testid="download-icon" className={className} {...props} />,
  BarChart3: ({ className = '', ...props }) => <svg data-testid="bar-chart-icon" className={className} {...props} />,
  BookOpen: ({ className = '', ...props }) => <svg data-testid="book-open-icon" className={className} {...props} />,
  MessageCircle: ({ className = '', ...props }) => <svg data-testid="message-circle-icon" className={className} {...props} />,
  Brain: ({ className = '', ...props }) => <svg data-testid="brain-icon" className={className} {...props} />,
  ChevronLeft: ({ className = '', ...props }) => <svg data-testid="chevron-left-icon" className={className} {...props} />,
  ChevronRight: ({ className = '', ...props }) => <svg data-testid="chevron-right-icon" className={className} {...props} />,
  Check: ({ className = '', ...props }) => <svg data-testid="check-icon" className={className} {...props} />,
  X: ({ className = '', ...props }) => <svg data-testid="x-icon" className={className} {...props} />,
  AlertCircle: ({ className = '', ...props }) => <svg data-testid="alert-circle-icon" className={className} {...props} />,
  Loader2: ({ className = '', ...props }) => <svg data-testid="loader-icon" className={className} {...props} />,
  Plus: ({ className = '', ...props }) => <svg data-testid="plus-icon" className={className} {...props} />,
  Minus: ({ className = '', ...props }) => <svg data-testid="minus-icon" className={className} {...props} />,
  Filter: ({ className = '', ...props }) => <svg data-testid="filter-icon" className={className} {...props} />,
  Grid: ({ className = '', ...props }) => <svg data-testid="grid-icon" className={className} {...props} />,
  List: ({ className = '', ...props }) => <svg data-testid="list-icon" className={className} {...props} />,
  
  // Additional icons found in components
  Eye: ({ className = '', ...props }) => <svg data-testid="eye-icon" className={className} {...props} />,
  EyeOff: ({ className = '', ...props }) => <svg data-testid="eye-off-icon" className={className} {...props} />,
  AlertTriangle: ({ className = '', ...props }) => <svg data-testid="alert-triangle-icon" className={className} {...props} />,
  RefreshCw: ({ className = '', ...props }) => <svg data-testid="refresh-icon" className={className} {...props} />,
  ArrowLeft: ({ className = '', ...props }) => <svg data-testid="arrow-left-icon" className={className} {...props} />,
  ArrowRight: ({ className = '', ...props }) => <svg data-testid="arrow-right-icon" className={className} {...props} />,
  Home: ({ className = '', ...props }) => <svg data-testid="home-icon" className={className} {...props} />,
  Wifi: ({ className = '', ...props }) => <svg data-testid="wifi-icon" className={className} {...props} />,
  WifiOff: ({ className = '', ...props }) => <svg data-testid="wifi-off-icon" className={className} {...props} />,
  Info: ({ className = '', ...props }) => <svg data-testid="info-icon" className={className} {...props} />,
  ChevronDown: ({ className = '', ...props }) => <svg data-testid="chevron-down-icon" className={className} {...props} />,
  ChevronUp: ({ className = '', ...props }) => <svg data-testid="chevron-up-icon" className={className} {...props} />,
  MoreHorizontal: ({ className = '', ...props }) => <svg data-testid="more-horizontal-icon" className={className} {...props} />,
  Edit: ({ className = '', ...props }) => <svg data-testid="edit-icon" className={className} {...props} />,
  Trash: ({ className = '', ...props }) => <svg data-testid="trash-icon" className={className} {...props} />,
  Save: ({ className = '', ...props }) => <svg data-testid="save-icon" className={className} {...props} />,
  Upload: ({ className = '', ...props }) => <svg data-testid="upload-icon" className={className} {...props} />,
  Image: ({ className = '', ...props }) => <svg data-testid="image-icon" className={className} {...props} />,
  FileText: ({ className = '', ...props }) => <svg data-testid="file-text-icon" className={className} {...props} />,
  Copy: ({ className = '', ...props }) => <svg data-testid="copy-icon" className={className} {...props} />,
  ExternalLink: ({ className = '', ...props }) => <svg data-testid="external-link-icon" className={className} {...props} />,
  Star: ({ className = '', ...props }) => <svg data-testid="star-icon" className={className} {...props} />,
  StarOff: ({ className = '', ...props }) => <svg data-testid="star-off-icon" className={className} {...props} />,
  Heart: ({ className = '', ...props }) => <svg data-testid="heart-icon" className={className} {...props} />,
  Share: ({ className = '', ...props }) => <svg data-testid="share-icon" className={className} {...props} />,
  Moon: ({ className = '', ...props }) => <svg data-testid="moon-icon" className={className} {...props} />,
  Sun: ({ className = '', ...props }) => <svg data-testid="sun-icon" className={className} {...props} />,
  Menu: ({ className = '', ...props }) => <svg data-testid="menu-icon" className={className} {...props} />,
  Play: ({ className = '', ...props }) => <svg data-testid="play-icon" className={className} {...props} />,
  Pause: ({ className = '', ...props }) => <svg data-testid="pause-icon" className={className} {...props} />,
  Volume2: ({ className = '', ...props }) => <svg data-testid="volume-icon" className={className} {...props} />,
  VolumeX: ({ className = '', ...props }) => <svg data-testid="volume-x-icon" className={className} {...props} />,
  Maximize2: ({ className = '', ...props }) => <svg data-testid="maximize-icon" className={className} {...props} />,
  Minimize2: ({ className = '', ...props }) => <svg data-testid="minimize-icon" className={className} {...props} />,
  RotateCcw: ({ className = '', ...props }) => <svg data-testid="rotate-ccw-icon" className={className} {...props} />,
  ZoomIn: ({ className = '', ...props }) => <svg data-testid="zoom-in-icon" className={className} {...props} />,
  ZoomOut: ({ className = '', ...props }) => <svg data-testid="zoom-out-icon" className={className} {...props} />,
  Target: ({ className = '', ...props }) => <svg data-testid="target-icon" className={className} {...props} />,
  HelpCircle: ({ className = '', ...props }) => <svg data-testid="help-circle-icon" className={className} {...props} />,
  User: ({ className = '', ...props }) => <svg data-testid="user-icon" className={className} {...props} />,
  Users: ({ className = '', ...props }) => <svg data-testid="users-icon" className={className} {...props} />,
  Lock: ({ className = '', ...props }) => <svg data-testid="lock-icon" className={className} {...props} />,
  Unlock: ({ className = '', ...props }) => <svg data-testid="unlock-icon" className={className} {...props} />,
  Key: ({ className = '', ...props }) => <svg data-testid="key-icon" className={className} {...props} />,
  Shield: ({ className = '', ...props }) => <svg data-testid="shield-icon" className={className} {...props} />,
  Database: ({ className = '', ...props }) => <svg data-testid="database-icon" className={className} {...props} />,
  Server: ({ className = '', ...props }) => <svg data-testid="server-icon" className={className} {...props} />,
  Globe: ({ className = '', ...props }) => <svg data-testid="globe-icon" className={className} {...props} />,
  Mail: ({ className = '', ...props }) => <svg data-testid="mail-icon" className={className} {...props} />,
  Phone: ({ className = '', ...props }) => <svg data-testid="phone-icon" className={className} {...props} />,
  Calendar: ({ className = '', ...props }) => <svg data-testid="calendar-icon" className={className} {...props} />,
  Clock: ({ className = '', ...props }) => <svg data-testid="clock-icon" className={className} {...props} />,
  Timer: ({ className = '', ...props }) => <svg data-testid="timer-icon" className={className} {...props} />,
  Zap: ({ className = '', ...props }) => <svg data-testid="zap-icon" className={className} {...props} />,
  Activity: ({ className = '', ...props }) => <svg data-testid="activity-icon" className={className} {...props} />,
  TrendingUp: ({ className = '', ...props }) => <svg data-testid="trending-up-icon" className={className} {...props} />,
  TrendingDown: ({ className = '', ...props }) => <svg data-testid="trending-down-icon" className={className} {...props} />,
  BarChart: ({ className = '', ...props }) => <svg data-testid="bar-chart-icon" className={className} {...props} />,
  PieChart: ({ className = '', ...props }) => <svg data-testid="pie-chart-icon" className={className} {...props} />,
  LineChart: ({ className = '', ...props }) => <svg data-testid="line-chart-icon" className={className} {...props} />,
  Layers: ({ className = '', ...props }) => <svg data-testid="layers-icon" className={className} {...props} />,
  Package: ({ className = '', ...props }) => <svg data-testid="package-icon" className={className} {...props} />,
  Folder: ({ className = '', ...props }) => <svg data-testid="folder-icon" className={className} {...props} />,
  FolderOpen: ({ className = '', ...props }) => <svg data-testid="folder-open-icon" className={className} {...props} />,
  File: ({ className = '', ...props }) => <svg data-testid="file-icon" className={className} {...props} />,
}));

// Mock Supabase before other imports
vi.mock('@supabase/supabase-js', async () => {
  const { createMockSupabaseClient } = await import('./mocks/supabase');
  return {
    createClient: vi.fn().mockImplementation(() => createMockSupabaseClient()),
  };
});

// Mock environment variables for consistent testing
process.env.OPENAI_API_KEY = 'sk-test1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key-1234567890abcdef';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Global mocks for browser APIs
global.fetch = vi.fn();
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock OpenAI and other API services before they're imported
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test response' } }]
        })
      }
    }
  }))
}));

// Mock API route handlers to prevent actual API calls
vi.mock('../src/app/api', () => ({}));
vi.mock('../src/lib/services', () => ({}));

// Mock File and FileList
global.File = class MockFile {
  constructor(
    public bits: any[],
    public name: string,
    public options: any = {}
  ) {}
} as any;

global.FileList = class MockFileList {
  constructor(public files: File[] = []) {}
  item(index: number) {
    return this.files[index] || null;
  }
  get length() {
    return this.files.length;
  }
} as any;

// Setup and teardown
beforeAll(() => {
  // Suppress console errors during tests unless explicitly testing them
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});