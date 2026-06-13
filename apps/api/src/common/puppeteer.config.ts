import type { LaunchOptions } from 'puppeteer';

const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
] as const;

/** Resolve Chrome/Chromium for Puppeteer in Docker (Alpine) and local dev. */
export function getPuppeteerLaunchOptions(): LaunchOptions {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_BIN?.trim() ||
    undefined;

  return {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [...PUPPETEER_ARGS],
  };
}
