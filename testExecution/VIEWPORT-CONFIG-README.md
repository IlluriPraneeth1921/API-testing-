# Viewport Configuration - Developer Guide

This guide explains how to integrate the centralized viewport configuration into your Playwright scripts.

## Overview

The `viewport-config.ts` module provides a centralized way to manage browser viewport and zoom settings across all metadata extraction scripts. This ensures consistent display settings and makes it easy to adjust for different screen sizes.

## Files

| File | Purpose |
|------|---------|
| `viewport-config.ts` | Core configuration module with presets and helper functions |
| `VIEWPORT-SETTINGS.md` | User documentation for adjusting settings |
| `VIEWPORT-CONFIG-README.md` | This file - developer integration guide |

## Quick Integration

### Step 1: Add the Import

Add this import at the top of your Playwright script:

```typescript
import { 
  getBrowserContextOptions, 
  applyPageZoom,
  logViewportSettings 
} from './viewport-config';
```

### Step 2: Replace Browser Context Creation

**Before:**
```typescript
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 0.75
});
const page = await context.newPage();
```

**After:**
```typescript
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext(getBrowserContextOptions());
const page = await context.newPage();
```

### Step 3: Replace Page Zoom

**Before:**
```typescript
await page.evaluate(() => { document.body.style.zoom = '0.67'; });
```

**After:**
```typescript
await applyPageZoom(page);
```

### Step 4: (Optional) Log Settings

Add this after launching the browser to log the current viewport settings:

```typescript
logViewportSettings();
```

## Complete Example

Here's a complete before/after comparison:

### Before (Hardcoded Values)

```typescript
import { chromium } from 'playwright';

async function main() {
  console.log('Starting script...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 0.75
  });
  const page = await context.newPage();
  
  await page.goto('https://example.com');
  
  // Apply zoom
  await page.evaluate(() => { document.body.style.zoom = '0.67'; });
  
  // ... rest of script
  
  await browser.close();
}

main();
```

### After (Using Viewport Config)

```typescript
import { chromium } from 'playwright';
import { 
  getBrowserContextOptions, 
  applyPageZoom,
  logViewportSettings 
} from './viewport-config';

async function main() {
  console.log('Starting script...');
  
  // Log current viewport settings
  logViewportSettings();
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(getBrowserContextOptions());
  const page = await context.newPage();
  
  await page.goto('https://example.com');
  
  // Apply zoom from config
  await applyPageZoom(page);
  
  // ... rest of script
  
  await browser.close();
}

main();
```

## Using Specific Presets

If you want to use a specific preset instead of the default `ACTIVE_VIEWPORT`:

```typescript
import { 
  STANDARD_LAPTOP,
  SMALL_LAPTOP,
  HIGH_DPI,
  LARGE_MONITOR,
  NO_ZOOM,
  getBrowserContextOptions, 
  applyPageZoom,
  logViewportSettings 
} from './viewport-config';

// Use a specific preset
const context = await browser.newContext(getBrowserContextOptions(STANDARD_LAPTOP));
await applyPageZoom(page, STANDARD_LAPTOP);
logViewportSettings(STANDARD_LAPTOP);
```

## Using Custom Configuration

You can also pass a custom configuration inline:

```typescript
import { 
  ViewportConfig,
  getBrowserContextOptions, 
  applyPageZoom 
} from './viewport-config';

// Define custom config
const myConfig: ViewportConfig = {
  width: 1600,
  height: 900,
  deviceScaleFactor: 0.8,
  pageZoom: '0.75'
};

// Use custom config
const context = await browser.newContext(getBrowserContextOptions(myConfig));
await applyPageZoom(page, myConfig);
```

## Available Presets

| Preset | Resolution | Device Scale | Page Zoom | Effective Scale |
|--------|------------|--------------|-----------|-----------------|
| `LARGE_MONITOR` | 1920x1080 | 75% | 67% | ~50% |
| `STANDARD_LAPTOP` | 1366x768 | 75% | 75% | ~56% |
| `SMALL_LAPTOP` | 1280x720 | 60% | 60% | ~36% |
| `HIGH_DPI` | 1920x1080 | 50% | 50% | ~25% |
| `NO_ZOOM` | 1920x1080 | 100% | 100% | 100% |

## API Reference

### `getBrowserContextOptions(config?: ViewportConfig)`

Returns Playwright browser context options with viewport and device scale factor.

```typescript
// Returns:
{
  viewport: { width: number, height: number },
  deviceScaleFactor: number
}
```

### `applyPageZoom(page: Page, config?: ViewportConfig)`

Applies CSS zoom to the page body. Call this after the page loads.

```typescript
await applyPageZoom(page);  // Uses ACTIVE_VIEWPORT
await applyPageZoom(page, STANDARD_LAPTOP);  // Uses specific preset
```

### `logViewportSettings(config?: ViewportConfig)`

Logs the current viewport settings to the console.

```typescript
logViewportSettings();
// Output:
// Viewport Settings:
//   Resolution: 1920x1080
//   Device Scale: 75%
//   Page Zoom: 67%
//   Effective Scale: 50%
```

### `ViewportConfig` Interface

```typescript
interface ViewportConfig {
  width: number;           // Browser viewport width in pixels
  height: number;          // Browser viewport height in pixels
  deviceScaleFactor: number;  // Device scale (0.5 = 50%, 1.0 = 100%)
  pageZoom: string;        // CSS zoom level ('0.67' = 67%)
}
```

## Changing the Default Preset

To change the default preset used by all scripts, edit `viewport-config.ts`:

```typescript
// Change this line to use a different preset
export const ACTIVE_VIEWPORT: ViewportConfig = STANDARD_LAPTOP;
```

## Environment-Based Configuration

You can select viewport based on environment variables:

```typescript
import { 
  LARGE_MONITOR,
  STANDARD_LAPTOP,
  SMALL_LAPTOP,
  HIGH_DPI,
  NO_ZOOM,
  ViewportConfig
} from './viewport-config';

function getViewportFromEnv(): ViewportConfig {
  const preset = process.env.VIEWPORT_PRESET || 'LARGE_MONITOR';
  
  switch (preset.toUpperCase()) {
    case 'STANDARD_LAPTOP': return STANDARD_LAPTOP;
    case 'SMALL_LAPTOP': return SMALL_LAPTOP;
    case 'HIGH_DPI': return HIGH_DPI;
    case 'NO_ZOOM': return NO_ZOOM;
    default: return LARGE_MONITOR;
  }
}

// Usage
const viewportConfig = getViewportFromEnv();
const context = await browser.newContext(getBrowserContextOptions(viewportConfig));
```

Then run with:
```bash
VIEWPORT_PRESET=STANDARD_LAPTOP npm run your-script
```

## Scripts Already Using Viewport Config

The following scripts have been updated to use the viewport configuration:

- ✅ `metadata-editor-ui-capture.ts`
- ✅ `metadata-editor-ui-capture-v2.ts`
- ✅ `navigate-and-capture.ts`
- ✅ `comprehensive-metadata-capture.ts`

## Troubleshooting

### Content is cut off
- Decrease `deviceScaleFactor` or `pageZoom` in your preset
- Try `SMALL_LAPTOP` or `HIGH_DPI` preset

### Content is too small
- Increase `deviceScaleFactor` or `pageZoom`
- Try `NO_ZOOM` preset

### Browser window doesn't fit on screen
- Use a preset with smaller `width` and `height`
- Or decrease `deviceScaleFactor`

### Elements are not clickable
- The zoom might be too aggressive
- Try `NO_ZOOM` preset first, then gradually decrease
