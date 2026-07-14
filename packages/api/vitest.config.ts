import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // تعطيل caching نهائياً
    cache: false,
    
    // إعادة تعيين الـ modules بين كل اختبار
    isolate: true,
    
    // عدم استخدام الـ cache للـ modules
    deps: {
      inline: ['@prisma/client'],
    },
    
    // ملف الإعداد
    setupFiles: ['./tests/setup.ts'],
    
    // بيئة الاختبار
    environment: 'node',
    
    // مهلة أطول
    testTimeout: 30000,
    
    // إظهار جميع الأخطاء
    reporters: ['verbose'],
    
    // إعدادات إضافية
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});