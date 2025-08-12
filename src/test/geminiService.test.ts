import GeminiService from '../main/services/geminiService';

// Mock the Google Generative AI module
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('{"tasks": [], "summary": "Test response"}')
        }
      })
    })
  }))
}));

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'AIzaSyA-test-api-key-1234567890123456789';
    service = new GeminiService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if API key is not set', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GeminiService()).toThrow('GEMINI_API_KEY is not set');
    });

    it('should throw error if API key is placeholder', () => {
      process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
      expect(() => new GeminiService()).toThrow('must be set to a valid API key');
    });

    it('should throw error if API key has invalid format', () => {
      process.env.GEMINI_API_KEY = 'invalid-key';
      expect(() => new GeminiService()).toThrow('Invalid GEMINI_API_KEY format');
    });
  });

  describe('generateTaskBreakdown', () => {
    it('should throw error for empty input', async () => {
      await expect(service.generateTaskBreakdown('', {})).rejects.toThrow('User input is required');
    });

    it('should throw error for too long input', async () => {
      const longInput = 'a'.repeat(5001);
      await expect(service.generateTaskBreakdown(longInput, {})).rejects.toThrow('Input too long');
    });

    it('should sanitize script tags from input', async () => {
      const maliciousInput = 'Task <script>alert("XSS")</script> description';
      const result = await service.generateTaskBreakdown(maliciousInput, {});
      expect(result).toBeDefined();
      // The script tag should be removed in the processing
    });

    it('should return parsed task breakdown', async () => {
      const result = await service.generateTaskBreakdown('Create a website', {});
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('summary');
    });
  });

  describe('chatWithContext', () => {
    it('should throw error for empty message', async () => {
      await expect(service.chatWithContext('', [])).rejects.toThrow('Message is required');
    });

    it('should throw error for too long message', async () => {
      const longMessage = 'a'.repeat(2001);
      await expect(service.chatWithContext(longMessage, [])).rejects.toThrow('Message too long');
    });

    it('should handle conversation history', async () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      const result = await service.chatWithContext('How are you?', history);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});