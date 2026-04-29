/**
 * Viewport Configuration for Metadata Extractor Scripts
 * 
 * This file centralizes all viewport and display settings for running
 * the metadata extraction scripts on different screen sizes.
 * 
 * Adjust these settings based on your laptop/monitor screen size.
 */

export interface ViewportConfig {
  /** Browser viewport width in pixels */
  width: number;
  /** Browser viewport height in pixels */
  height: number;
  /** Device scale factor (0.5 = 50%, 0.75 = 75%, 1.0 = 100%) */
  deviceScaleFactor: number;
  /** Page zoom level as string (e.g., '0.67' = 67%, '1.0' = 100%) */
  pageZoom: string;
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/** For large monitors (1920x1080 or higher) - Default */
export const LARGE_MONITOR: ViewportConfig = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 0.75,
  pageZoom: '0.67'
};

/** For standard laptops (1366x768) */
export const STANDARD_LAPTOP: ViewportConfig = {
  width: 1366,
  height: 768,
  deviceScaleFactor: 0.75,
  pageZoom: '0.75'
};

/** For small laptops (1280x720) */
export const SMALL_LAPTOP: ViewportConfig = {
  width: 1280,
  height: 720,
  deviceScaleFactor: 0.6,
  pageZoom: '0.6'
};

/** For high-DPI/Retina displays */
export const HIGH_DPI: ViewportConfig = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 0.5,
  pageZoom: '0.5'
};

/** No zoom - actual size (may not fit on smaller screens) */
export const NO_ZOOM: ViewportConfig = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1.0,
  pageZoom: '1.0'
};

// ============================================
// ACTIVE CONFIGURATION
// ============================================

/**
 * CHANGE THIS to use a different preset or create your own custom config.
 * 
 * Options:
 * - LARGE_MONITOR (default) - For 1920x1080+ monitors
 * - STANDARD_LAPTOP - For 1366x768 laptops
 * - SMALL_LAPTOP - For 1280x720 screens
 * - HIGH_DPI - For Retina/4K displays
 * - NO_ZOOM - No scaling (actual size)
 * - Or create your own custom config below
 */
export const ACTIVE_VIEWPORT: ViewportConfig = NO_ZOOM;

// ============================================
// CUSTOM CONFIGURATION (Optional)
// ============================================

/**
 * Create your own custom viewport config here.
 * Uncomment and modify, then set ACTIVE_VIEWPORT = CUSTOM_CONFIG
 */
// export const CUSTOM_CONFIG: ViewportConfig = {
//   width: 1600,
//   height: 900,
//   deviceScaleFactor: 0.8,
//   pageZoom: '0.75'
// };

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Playwright browser context options
 */
export function getBrowserContextOptions(config: ViewportConfig = ACTIVE_VIEWPORT) {
  return {
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: config.deviceScaleFactor
  };
}

/**
 * Apply page zoom after page loads
 */
export async function applyPageZoom(page: any, config: ViewportConfig = ACTIVE_VIEWPORT) {
  await page.evaluate((zoom: string) => {
    document.body.style.zoom = zoom;
  }, config.pageZoom);
}

/**
 * Log current viewport settings
 */
export function logViewportSettings(config: ViewportConfig = ACTIVE_VIEWPORT) {
  console.log('Viewport Settings:');
  console.log(`  Resolution: ${config.width}x${config.height}`);
  console.log(`  Device Scale: ${config.deviceScaleFactor * 100}%`);
  console.log(`  Page Zoom: ${parseFloat(config.pageZoom) * 100}%`);
  console.log(`  Effective Scale: ${config.deviceScaleFactor * parseFloat(config.pageZoom) * 100}%`);
}
