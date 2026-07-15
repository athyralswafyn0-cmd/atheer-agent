import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './service.js';
import { PrismaAuthRepository } from './repository.js';

// Mock the PrismaAuthRepository
const mockPrismaAuthRepository = {
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  createOrganization: vi.fn(),
  createOrganizationMember: vi.fn(),
  updateUserLastLogin: vi.fn(),
  logActivity: vi.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockPrismaAuthRepository as any, 12);
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should throw error if email already exists', async () => {
      mockPrismaAuthRepository.findUserByEmail.mockResolvedValue({ id: '1' } as any);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('EMAIL_ALREADY_REGISTERED');
    });

    it('should create user and organization', async () => {
      mockPrismaAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockPrismaAuthRepository.createOrganization.mockResolvedValue({ id: 'org-1', slug: 'test-user-s-organization-123', name: 'Test User\'s Organization' });
      mockPrismaAuthRepository.createUser.mockResolvedValue({ id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'ADMIN', organizationId: 'org-1', avatar: null } as any);
      mockPrismaAuthRepository.createOrganizationMember.mockResolvedValue({} as any);
      mockPrismaAuthRepository.logActivity.mockResolvedValue({} as any);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.organizationId).toBe('org-1');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });
});