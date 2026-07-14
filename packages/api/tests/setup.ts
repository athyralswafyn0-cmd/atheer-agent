// packages/api/tests/setup.ts
import { vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 1. تنظيف Prisma Client من الذاكرة
export function clearPrismaCache() {
  // حذف الـ require cache
  const modulesToClear = [
    '@prisma/client',
    '@prisma/client/runtime/library',
    '@prisma/client/default.js',
  ];
  
  for (const mod of modulesToClear) {
    try {
      const resolved = require.resolve(mod);
      if (require.cache[resolved]) {
        delete require.cache[resolved];
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  
  // حذف prisma generate cache
  const prismaDir = path.join(__dirname, '../node_modules/.prisma');
  if (fs.existsSync(prismaDir)) {
    try {
      fs.rmSync(prismaDir, { recursive: true, force: true });
    } catch (e) {
      // تجاهل
    }
  }
  
  // إعادة توليد Prisma Client
  try {
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch (e) {
    console.warn('⚠️ Prisma generate failed:', e);
  }
  
  // إعادة تعيين Vitest modules
  vi.resetModules();
}

// 2. تنفيذ التنظيف قبل جميع الاختبارات
clearPrismaCache();

// 3. تصدير Prisma Client جديد
export { PrismaClient } from '@prisma/client';

// 4. دالة مساعدة لإنشاء مستخدم اختبار
export async function createTestUser(prisma: any) {
  const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  return await prisma.user.create({
    data: {
      email,
      name: 'Test User',
      passwordHash: 'hash',
      role: 'ADMIN',
    }
  });
}

// 5. دالة مساعدة لإنشاء منظمة اختبار
export async function createTestOrg(prisma: any, userId: string) {
  return await prisma.organization.create({
    data: {
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      domain: `test-org-${Date.now()}.example.com`,
      description: 'A test organization',
      members: {
        create: {
          userId,
          role: 'OWNER',
        }
      }
    }
  });
}

// 6. دالة مساعدة لإنشاء شريك اختبار
export async function createTestPartner(prisma: any) {
  return await prisma.partner.create({
    data: {
      name: `Test Partner ${Date.now()}`,
      email: `partner-${Date.now()}@test.com`,
      passwordHash: 'hash',
    }
  });
}

// 7. دالة مساعدة لإنشاء بوت اختبار
export async function createTestBot(prisma: any, organizationId: string, ownerId: string) {
  return await prisma.bot.create({
    data: {
      name: `Test Bot ${Date.now()}`,
      description: 'A test bot',
      welcomeMessage: 'Hello! How can I help?',
      primaryColor: '#0000ff',
      organizationId,
      ownerId,
      status: 'INACTIVE',
    }
  });
}

// 7. دالة تنظيف بعد كل اختبار
export async function cleanupTestData(prisma: any) {
  try {
    await prisma.embedScript.deleteMany({ where: { domain: { contains: 'test' } } });
    await prisma.bot.deleteMany({ where: { name: { contains: 'Test Bot' } } });
    await prisma.organizationMember.deleteMany({ where: { user: { email: { contains: 'test-' } } } });
    await prisma.organization.deleteMany({ where: { name: { contains: 'Test Org' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
    await prisma.partner.deleteMany({ where: { name: { contains: 'Test Partner' } } });
    await prisma.brand.deleteMany({ where: { customDomain: { contains: 'test' } } });
    await prisma.license.deleteMany({ where: { partner: { name: { contains: 'Test' } } } });
  } catch (e) {
    console.warn('Cleanup warning:', e);
  }
}