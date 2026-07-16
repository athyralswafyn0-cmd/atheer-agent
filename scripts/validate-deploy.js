#!/usr/bin/env node
/**
 * Pre-deployment validation script for Render
 * Checks Prisma schema compatibility, database connections, and service configs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVICES = [
  'auth-service',
  'tenant-service',
  'partner-service',
  'bot-service',
  'conversation-service',
  'widget-service',
];

const PROJECT_ROOT = path.join(__dirname, '..');

function runCommand(cmd, cwd = PROJECT_ROOT, silent = false) {
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, output: error.stdout?.toString() || error.message };
  }
}

function checkFile(filepath) {
  return fs.existsSync(path.join(PROJECT_ROOT, filepath));
}

function readPackageJson(service) {
  const pkgPath = path.join(PROJECT_ROOT, 'services', service, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function readPrismaSchema(service) {
  const schemaPath = path.join(PROJECT_ROOT, 'services', service, 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) return null;
  return fs.readFileSync(schemaPath, 'utf8');
}

async function validateService(service) {
  console.log(`\n🔍 Validating ${service}...`);
  const issues = [];
  const warnings = [];

  // 1. Check directory structure
  const serviceDir = path.join(PROJECT_ROOT, 'services', service);
  if (!fs.existsSync(serviceDir)) {
    issues.push(`Service directory not found: ${serviceDir}`);
    return { service, issues, warnings, passed: false };
  }

  // 2. Check package.json
  const pkg = readPackageJson(service);
  if (!pkg) {
    issues.push('package.json not found');
  } else {
    // Check required scripts
    const requiredScripts = ['build', 'start', 'db:generate', 'db:push', 'db:migrate'];
    for (const script of requiredScripts) {
      if (!pkg.scripts?.[script]) {
        warnings.push(`Missing script: ${script}`);
      }
    }
    
    // Check Prisma dependencies
    const hasPrismaClient = !!pkg.dependencies?.['@prisma/client'];
    const hasPrisma = !!pkg.devDependencies?.prisma || !!pkg.dependencies?.prisma;
    if (!hasPrismaClient) issues.push('Missing @prisma/client dependency');
    if (!hasPrisma) warnings.push('Prisma CLI not in dependencies');
  }

  // 3. Check Prisma schema
  const schema = readPrismaSchema(service);
  if (!schema) {
    issues.push('Prisma schema not found');
  } else {
    // Check for pgvector usage (not supported on Render free tier)
    // Look for actual vector type usage, not comments
    const hasVectorType = schema.includes('Unsupported("vector")') || 
                          schema.includes("Unsupported('vector')") ||
                          (schema.includes('vector') && !schema.includes('pgvector-free') && !schema.includes('vectorWeight'));
    if (hasVectorType) {
      issues.push('❌ Uses pgvector/PostgreSQL extensions - NOT supported on Render free tier');
    }
    
    // Check for unsupported preview features
    if (schema.includes('previewFeatures') && (schema.includes('multiSchema') || schema.includes('interactiveTransactions'))) {
      warnings.push('Uses preview features - verify compatibility');
    }
    
    // Check generator output path
    if (schema.includes('output =') && !schema.includes('../node_modules/.prisma/client')) {
      warnings.push('Prisma client output path may not be in node_modules');
    }
    
    // Verify datasource uses env("DATABASE_URL")
    if (!schema.includes('env("DATABASE_URL")')) {
      issues.push('Datasource does not use env("DATABASE_URL")');
    }
  }

  // 4. Check TypeScript config
  const tsconfigPath = path.join(serviceDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    warnings.push('tsconfig.json not found');
  }

  // 5. Run Prisma generate (dry run)
  console.log(`  Running prisma generate...`);
  const genResult = runCommand('npx prisma generate', serviceDir, true);
  if (!genResult.success) {
    issues.push(`Prisma generate failed: ${genResult.output}`);
  } else {
    console.log(`  ✅ Prisma generate successful`);
  }

  // 6. Check build
  console.log(`  Running build...`);
  const buildResult = runCommand('npm run build', serviceDir, true);
  if (!buildResult.success) {
    issues.push(`Build failed: ${buildResult.output}`);
  } else {
    console.log(`  ✅ Build successful`);
  }

  return { service, issues, warnings, passed: issues.length === 0 };
}

async function validateApiGateway() {
  console.log('\n🔍 Validating API Gateway (packages/api)...');
  const issues = [];
  const warnings = [];

  const apiDir = path.join(PROJECT_ROOT, 'packages', 'api');
  
  // Check package.json
  const pkgPath = path.join(apiDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    issues.push('API package.json not found');
  } else {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.scripts?.build) issues.push('Missing build script');
    if (!pkg.scripts?.start) issues.push('Missing start script');
  }

  // Check Prisma schema
  const schemaPath = path.join(apiDir, 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    issues.push('API Prisma schema not found');
  } else {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const hasVectorType = schema.includes('Unsupported("vector")') || 
                          schema.includes("Unsupported('vector')") ||
                          (schema.includes('vector') && !schema.includes('pgvector-free') && !schema.includes('vectorWeight'));
    if (hasVectorType) {
      issues.push('❌ API uses pgvector - NOT supported on Render free tier');
    }
  }

  // Run build
  const buildResult = runCommand('pnpm run build', apiDir, true);
  if (!buildResult.success) {
    issues.push(`API build failed: ${buildResult.output}`);
  } else {
    console.log('  ✅ API Gateway build successful');
  }

  return { service: 'api-gateway', issues, warnings, passed: issues.length === 0 };
}

async function validateDashboard() {
  console.log('\n🔍 Validating Dashboard (Next.js)...');
  const issues = [];
  const warnings = [];

  const dashDir = path.join(PROJECT_ROOT, 'dashboard');
  
  const pkgPath = path.join(dashDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    issues.push('Dashboard package.json not found');
  } else {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.scripts?.build) issues.push('Missing build script');
  }

  // Check next.config.js
  const nextConfig = path.join(dashDir, 'next.config.js');
  if (!fs.existsSync(nextConfig)) {
    warnings.push('next.config.js not found');
  }

  // Run build
  const buildResult = runCommand('npm run build', dashDir, true);
  if (!buildResult.success) {
    issues.push(`Dashboard build failed: ${buildResult.output}`);
  } else {
    console.log('  ✅ Dashboard build successful');
  }

  return { service: 'dashboard', issues, warnings, passed: issues.length === 0 };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Atheer Agent AI - Pre-Deployment Validation for Render     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results = [];
  
  // Validate all microservices
  for (const service of SERVICES) {
    const result = await validateService(service);
    results.push(result);
  }

  // Validate API Gateway
  const apiResult = await validateApiGateway();
  results.push(apiResult);

  // Validate Dashboard
  const dashResult = await validateDashboard();
  results.push(dashResult);

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}  ${result.service}`);
    
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`    └─ ${issue}`);
      }
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`    ⚠ ${warning}`);
      }
    }
    if (!result.passed) allPassed = false;
  }

  console.log('\n' + (allPassed ? '✅ All validations passed!' : '❌ Some validations failed - fix before deploying'));
  
  // Check render.yaml
  const renderYaml = path.join(PROJECT_ROOT, 'render.yaml');
  if (fs.existsSync(renderYaml)) {
    console.log('✅ render.yaml exists');
  } else {
    console.log('❌ render.yaml not found');
    allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);