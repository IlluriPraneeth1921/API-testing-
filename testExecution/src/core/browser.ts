import { chromium, firefox, webkit, Browser } from "playwright";
import { env } from "@src/config/env";

export async function launchBrowser(): Promise<Browser> {

  const launchOptions = {
    headless: env.headless,
    slowMo: env.headless ? 0 : 200,
    args: ['--start-maximized']
  };

  if (env.browser === "firefox") {
    return firefox.launch(launchOptions);
  }

  if (env.browser === "webkit") {
    return webkit.launch(launchOptions);
  }

  // default → chromium (Chrome-like)
  return chromium.launch(launchOptions);
}