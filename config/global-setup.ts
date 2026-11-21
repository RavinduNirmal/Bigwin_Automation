/// <reference types="node" />
import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Setup
 * Runs once before all tests.
 *
 * Loads config/env/<TEST_ENV>.json (dev | staging | prod, default dev) and exposes it to the
 * tests as BASE_URL / ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_OTP.
 * BigWin login is two-step (password, then a 6-digit OTP); the dev server has a fixed bypass OTP.
 */
async function globalSetup(_config: FullConfig) {
  console.log('🚀 Running Global Setup...');

  // Create test-results directory if it doesn't exist
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Create allure-results directory if it doesn't exist
  const allureResultsDir = path.join(process.cwd(), 'allure-results');
  if (!fs.existsSync(allureResultsDir)) {
    fs.mkdirSync(allureResultsDir, { recursive: true });
  }

  // Load environment configuration
  const env = process.env.TEST_ENV || 'dev';
  const envConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, `env/${env}.json`), 'utf-8')
  );
  if (!envConfig.baseURL || !envConfig.admin?.username || !envConfig.admin?.password) {
    throw new Error(`config/env/${env}.json is missing baseURL / admin.username / admin.password`);
  }

  // Set environment variables for tests
  process.env.BASE_URL = envConfig.baseURL;
  process.env.ADMIN_USERNAME = envConfig.admin.username;
  process.env.ADMIN_PASSWORD = envConfig.admin.password;
  process.env.ADMIN_OTP = envConfig.admin.otp || '';

  console.log(`✅ Global Setup Complete (Environment: ${env})`);
  console.log(`📍 Base URL: ${process.env.BASE_URL}`);
}

export default globalSetup;
