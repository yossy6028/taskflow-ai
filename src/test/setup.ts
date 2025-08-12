// Test setup file
import '@testing-library/jest-dom';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    quit: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
  },
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'AIzaSyA-test-api-key-1234567890123456789';

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};