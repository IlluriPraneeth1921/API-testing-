# Viewport Settings for Metadata Extractor

This document explains how to adjust the viewport and zoom settings for running the metadata extraction scripts on different screen sizes.

## Quick Start

Edit `viewport-config.ts` and change the `ACTIVE_VIEWPORT` to match your screen:

```typescript
// For standard laptops (1366x768)
export const ACTIVE_VIEWPORT: ViewportConfig = STANDARD_LAPTOP;

// For small laptops (1280x720)
export const ACTIVE_VIEWPORT: ViewportConfig = SMALL_LAPTOP;

// For large monitors (1920x1080+) - Default
export const ACTIVE_VIEWPORT: ViewportConfig = LARGE_MONITOR;
```

## Available Presets

| Preset | Resolution | Device Scale | Page Zoom | Best For |
|--------|------------|--------------|-----------|----------|
| `LARGE_MONITOR` | 1920x1080 | 75% | 67% | Large monitors, external displays |
| `STANDARD_LAPTOP` | 1366x768 | 75% | 75% | Most laptops |
| `SMALL_LAPTOP` | 1280x720 | 60% | 60% | Small/older laptops |
| `HIGH_DPI` | 1920x1080 | 50% | 50% | Retina/4K displays |
| `NO_ZOOM` | 1920x1080 | 100% | 100% | No scaling (may not fit) |

## Understanding the Settings

### 1. Viewport (width x height)
The browser window size in pixels. This determines how much of the page is visible.

### 2. Device Scale Factor
Scales the entire browser rendering:
- `1.0` = 100% (normal)
- `0.75` = 75% (slightly zoomed out)
- `0.5` = 50% (significantly zoomed out)

### 3. Page Zoom
Additional zoom applied to the page content via CSS:
- `'1.0'` = 100% (normal)
- `'0.67'` = 67% (zoomed out)
- `'0.5'` = 50% (significantly zoomed out)

### Combined Effect
The effective zoom is: `deviceScaleFactor × pageZoom`

Example: `0.75 × 0.67 = 0.50` (50% effective zoom)

## Custom Configuration

Create your own config in `viewport-config.ts`:

```typescript
export const MY_LAPTOP: ViewportConfig = {
  width: 1600,      // Your screen width
  height: 900,      // Your screen height
  deviceScaleFactor: 0.8,  // 80% device scale
  pageZoom: '0.75'  // 75% page zoom
};

// Then set it as active:
export const ACTIVE_VIEWPORT: ViewportConfig = MY_LAPTOP;
```

## Troubleshooting

### Page content is cut off
- Decrease `deviceScaleFactor` (e.g., 0.75 → 0.6)
- Decrease `pageZoom` (e.g., '0.67' → '0.5')

### Content is too small to read
- Increase `deviceScaleFactor` (e.g., 0.75 → 1.0)
- Increase `pageZoom` (e.g., '0.67' → '1.0')

### Browser window doesn't fit on screen
- Decrease `width` and `height` to match your screen
- Or decrease `deviceScaleFactor`

### Elements are not clickable
- The zoom might be too aggressive
- Try `NO_ZOOM` preset first, then gradually decrease

## Files Using Viewport Settings

After updating `viewport-config.ts`, the following scripts will use the new settings:

- `metadata-editor-ui-capture.ts`
- `metadata-editor-ui-capture-v2.ts`
- `navigate-and-capture.ts`
- `comprehensive-metadata-capture.ts`

## Example Usage in Scripts

```typescript
import { 
  ACTIVE_VIEWPORT, 
  getBrowserContextOptions, 
  applyPageZoom,
  logViewportSettings 
} from './viewport-config';

// Log settings
logViewportSettings();

// Create browser context
const context = await browser.newContext(getBrowserContextOptions());
const page = await context.newPage();

// After login, apply page zoom
await applyPageZoom(page);
```

## Complete Example: Using Viewport Config in Different Environments

Here's a complete example showing how to use the viewport config in a Playwright script:

```typescript
import { chromium } from 'playwright';
import { 
  ACTIVE_VIEWPORT,
  STANDARD_LAPTOP,
  SMALL_LAPTOP,
  HIGH_DPI,
  getBrowserContextOptions, 
  applyPageZoom,
  logViewportSettings,
  ViewportConfig
} from './viewport-config';

async function runWithViewport(config?: ViewportConfig) {
  // Use provided config or fall back to ACTIVE_VIEWPORT
  const viewportConfig = config || ACTIVE_VIEWPORT;
  
  console.log('Starting with viewport settings:');
  logViewportSettings(viewportConfig);
  
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  
  // Create context with viewport settings
  const context = await browser.newContext(getBrowserContextOptions(viewportConfig));
  const page = await context.newPage();
  
  // Navigate to your app
  await page.goto('https://your-app-url.com');
  
  // Apply page zoom after page loads
  await applyPageZoom(page, viewportConfig);
  
  // Your test code here...
  
  await browser.close();
}

// Example 1: Use the default ACTIVE_VIEWPORT (set in viewport-config.ts)
await runWithViewport();

// Example 2: Use a specific preset for standard laptops
await runWithViewport(STANDARD_LAPTOP);

// Example 3: Use a specific preset for small laptops
await runWithViewport(SMALL_LAPTOP);

// Example 4: Use a specific preset for high-DPI displays
await runWithViewport(HIGH_DPI);

// Example 5: Use a custom config inline
await runWithViewport({
  width: 1600,
  height: 900,
  deviceScaleFactor: 0.8,
  pageZoom: '0.75'
});
```

## Environment-Based Configuration

You can also select viewport based on environment variables:

```typescript
import { 
  LARGE_MONITOR,
  STANDARD_LAPTOP,
  SMALL_LAPTOP,
  HIGH_DPI,
  NO_ZOOM,
  ViewportConfig
} from './viewport-config';

// Get viewport from environment variable
function getViewportFromEnv(): ViewportConfig {
  const preset = process.env.VIEWPORT_PRESET || 'LARGE_MONITOR';
  
  switch (preset.toUpperCase()) {
    case 'STANDARD_LAPTOP':
      return STANDARD_LAPTOP;
    case 'SMALL_LAPTOP':
      return SMALL_LAPTOP;
    case 'HIGH_DPI':
      return HIGH_DPI;
    case 'NO_ZOOM':
      return NO_ZOOM;
    case 'LARGE_MONITOR':
    default:
      return LARGE_MONITOR;
  }
}

// Usage:
// VIEWPORT_PRESET=STANDARD_LAPTOP npm run extract:std-f3:ui-v2
const viewportConfig = getViewportFromEnv();
const context = await browser.newContext(getBrowserContextOptions(viewportConfig));
```

## Adding to .env File

You can add viewport settings to your `.env` file:

```bash
# .env.std-f3
CARITY_USERNAME=george.parker
CARITY_PASSWORD="Password123#"
BASE_URL=https://std-f3.carity.com
ORGANIZATION=Your Org
LOCATION=Your Location
STAFF_MEMBER=George Parker

# Viewport preset: LARGE_MONITOR, STANDARD_LAPTOP, SMALL_LAPTOP, HIGH_DPI, NO_ZOOM
VIEWPORT_PRESET=STANDARD_LAPTOP
```
