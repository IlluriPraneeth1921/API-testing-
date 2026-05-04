import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import type { ScreenshotStage } from './visual-scanner';

// pixelmatch v7+ is ESM-only, use dynamic import for CommonJS compatibility
async function loadPixelmatch(): Promise<typeof import('pixelmatch')['default']> {
  const mod = await import('pixelmatch');
  return mod.default;
}

// --- Interfaces ---

export type GridCell =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface DifferenceDescription {
  affectedRegion: GridCell;
  affectedGridCells: GridCell[];
  diffPercentage: number;
  diffPixelCount: number;
}

export type IssueCategory =
  | 'Missing Scrollbar'
  | 'Content Truncation'
  | 'Error List Visibility'
  | 'Grid/Table Layout Shift'
  | 'Modal/Dialog Size Change'
  | 'Button/Control Missing'
  | 'General Layout Change';

export interface UIPatternAnalysis {
  category: IssueCategory;
  description: string;
  affectedRegion: string;
}

export interface ComparisonResult {
  module: string;
  stage: ScreenshotStage;
  baselinePath: string;
  targetPath: string;
  diffPath: string;
  totalPixels: number;
  diffPixels: number;
  diffPercentage: number;
  flagged: boolean;
  status: 'matched' | 'flagged' | 'new_screen' | 'missing_in_target' | 'dimension_mismatch' | 'unreadable';
  affectedRegion?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  differenceDescription?: DifferenceDescription;
  uiPatternAnalysis?: UIPatternAnalysis;
  semanticDiff?: SemanticDiff;
}

export interface SemanticDiff {
  missingInTarget: string[];   // controls present in baseline but not target
  addedInTarget: string[];     // controls present in target but not baseline
  summary: string;             // plain English one-liner
}

// --- VisualComparator ---

export class VisualComparator {
  constructor(
    private baselineEnv: string,
    private targetEnv: string,
    private threshold: number = 0.5
  ) {}

  /**
   * Compare all matching screenshot pairs between baseline and target environments.
   */
  async compare(moduleName?: string): Promise<ComparisonResult[]> {
    const baselineDir = path.join('visual-regression', 'screenshots', this.baselineEnv);
    const targetDir = path.join('visual-regression', 'screenshots', this.targetEnv);
    const diffDir = path.join('visual-regression', 'diffs', `${this.baselineEnv}_vs_${this.targetEnv}`);

    // Ensure diff output directory exists
    fs.mkdirSync(diffDir, { recursive: true });

    // Load screenshot filenames, filter to .png only
    const baselineFiles = this.loadPngFiles(baselineDir);
    const targetFiles = this.loadPngFiles(targetDir);

    // Apply module filter if provided
    const filteredBaselineFiles = moduleName
      ? baselineFiles.filter(f => f.includes(moduleName))
      : baselineFiles;
    const filteredTargetFiles = moduleName
      ? targetFiles.filter(f => f.includes(moduleName))
      : targetFiles;

    const results: ComparisonResult[] = [];

    // Build lookup maps by screenshot key (module_stage.png)
    const baselineByKey = new Map<string, string>();
    for (const file of filteredBaselineFiles) {
      baselineByKey.set(this.getScreenshotKey(file), file);
    }

    const targetByKey = new Map<string, string>();
    for (const file of filteredTargetFiles) {
      targetByKey.set(this.getScreenshotKey(file), file);
    }

    // Compare matching pairs
    for (const [key, baselineFile] of baselineByKey) {
      const targetFile = targetByKey.get(key);
      if (targetFile) {
        const baselinePath = path.join(baselineDir, baselineFile);
        const targetPath = path.join(targetDir, targetFile);
        const diffFilename = key.replace('.png', '_diff.png');
        const diffPath = path.join(diffDir, diffFilename);

        console.log(`[COMPARATOR] Comparing: ${baselineFile} vs ${targetFile}`);
        const result = await this.comparePair(baselinePath, targetPath, diffPath);
        results.push(result);
      }
    }

    // Handle unmatched files
    const { newScreens, missingInTarget } = this.findUnmatched(filteredBaselineFiles, filteredTargetFiles);

    for (const file of newScreens) {
      const key = this.getScreenshotKey(file);
      const { module: mod, stage } = this.parseScreenshotKey(key);
      console.log(`[COMPARATOR] New screen (no baseline): ${file}`);
      results.push({
        module: mod,
        stage,
        baselinePath: '',
        targetPath: path.join(targetDir, file),
        diffPath: '',
        totalPixels: 0,
        diffPixels: 0,
        diffPercentage: 0,
        flagged: false,
        status: 'new_screen',
      });
    }

    for (const file of missingInTarget) {
      const key = this.getScreenshotKey(file);
      const { module: mod, stage } = this.parseScreenshotKey(key);
      console.log(`[COMPARATOR] Missing in target: ${file}`);
      results.push({
        module: mod,
        stage,
        baselinePath: path.join(baselineDir, file),
        targetPath: '',
        diffPath: '',
        totalPixels: 0,
        diffPixels: 0,
        diffPercentage: 0,
        flagged: false,
        status: 'missing_in_target',
      });
    }

    console.log(`[COMPARATOR] Comparison complete: ${results.length} results (${results.filter(r => r.flagged).length} flagged)`);
    return results;
  }

  /**
   * Compare a single screenshot pair using pixelmatch.
   */
  async comparePair(baselinePath: string, targetPath: string, diffOutputPath: string): Promise<ComparisonResult> {
    const { module: mod, stage } = this.parseScreenshotKey(
      this.getScreenshotKey(path.basename(baselinePath))
    );

    try {
      const baselineData = PNG.sync.read(fs.readFileSync(baselinePath));
      const targetData = PNG.sync.read(fs.readFileSync(targetPath));

      // Dimension mismatch check
      if (baselineData.width !== targetData.width || baselineData.height !== targetData.height) {
        console.log(`[COMPARATOR] Dimension mismatch: ${path.basename(baselinePath)} (${baselineData.width}x${baselineData.height}) vs (${targetData.width}x${targetData.height})`);
        return {
          module: mod,
          stage,
          baselinePath,
          targetPath,
          diffPath: '',
          totalPixels: 0,
          diffPixels: 0,
          diffPercentage: 0,
          flagged: false,
          status: 'dimension_mismatch',
        };
      }

      const { width, height } = baselineData;
      const diff = new PNG({ width, height });

      // Mask the top header region (first 80px) — same pixels in both so comparison ignores it.
      // This prevents header timestamp/user differences from polluting the diff.
      const HEADER_MASK_HEIGHT = 80;
      for (let y = 0; y < Math.min(HEADER_MASK_HEIGHT, height); y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          // Copy baseline pixels into target so they match — header diffs become 0
          targetData.data[idx]     = baselineData.data[idx];
          targetData.data[idx + 1] = baselineData.data[idx + 1];
          targetData.data[idx + 2] = baselineData.data[idx + 2];
          targetData.data[idx + 3] = baselineData.data[idx + 3];
        }
      }

      const pixelmatch = await loadPixelmatch();
      const diffPixels = pixelmatch(
        baselineData.data,
        targetData.data,
        diff.data,
        width,
        height,
        {
          threshold: 0.15,   // slightly more tolerant to reduce hover/antialiasing noise
          includeAA: true,   // ignore anti-aliasing differences
          alpha: 0.3,        // make unchanged pixels more visible (lighter grey)
          diffColor: [220, 50, 50],      // softer red (not pure #FF0000)
          diffColorAlt: [50, 180, 100],  // softer green
        }
      );

      const totalPixels = width * height;
      const diffPercentage = (diffPixels / totalPixels) * 100;
      const flagged = diffPercentage > this.threshold;

      // Write diff image
      fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true });
      fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

      let affectedRegion: 'top' | 'bottom' | 'left' | 'right' | 'center' | undefined;
      let differenceDescription: DifferenceDescription | undefined;
      let uiPatternAnalysis: UIPatternAnalysis | undefined;
      let semanticDiff: SemanticDiff | undefined;
      if (flagged) {
        affectedRegion = this.analyzeAffectedRegion(diff.data, width, height);
        const gridAnalysis = this.analyzeAffectedRegion3x3(diff.data, width, height);
        differenceDescription = {
          affectedRegion: gridAnalysis.primaryRegion,
          affectedGridCells: gridAnalysis.affectedGridCells,
          diffPercentage,
          diffPixelCount: diffPixels,
        };
        uiPatternAnalysis = this.analyzeUIPattern(diff.data, width, height, stage, diffPercentage);
        semanticDiff = this.comparedomSnapshots(baselinePath, targetPath);
      }

      const status = flagged ? 'flagged' : 'matched';
      console.log(`[COMPARATOR] ${path.basename(baselinePath)}: ${diffPercentage.toFixed(2)}% diff (${status})`);

      return {
        module: mod,
        stage,
        baselinePath,
        targetPath,
        diffPath: diffOutputPath,
        totalPixels,
        diffPixels,
        diffPercentage,
        flagged,
        status,
        affectedRegion,
        differenceDescription,
        uiPatternAnalysis,
        semanticDiff,
      };
    } catch (error) {
      console.error(`[COMPARATOR] Error reading PNG: ${(error as Error).message}`);
      return {
        module: mod,
        stage,
        baselinePath,
        targetPath,
        diffPath: '',
        totalPixels: 0,
        diffPixels: 0,
        diffPercentage: 0,
        flagged: false,
        status: 'unreadable',
      };
    }
  }


  /**
   * Analyze the spatial distribution of diff pixels to determine the most affected region.
   * Divides the image into 5 regions: top 20%, bottom 20%, left 20%, right 20%, center.
   */
  analyzeAffectedRegion(diffBuffer: Buffer, width: number, height: number): 'top' | 'bottom' | 'left' | 'right' | 'center' {
    const regions = { top: 0, bottom: 0, left: 0, right: 0, center: 0 };

    const topBound = Math.floor(height * 0.2);
    const bottomBound = Math.floor(height * 0.8);
    const leftBound = Math.floor(width * 0.2);
    const rightBound = Math.floor(width * 0.8);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Check if this pixel has a diff (non-zero R, G, or B in the diff buffer)
        const r = diffBuffer[idx];
        const g = diffBuffer[idx + 1];
        const b = diffBuffer[idx + 2];

        if (r > 0 || g > 0 || b > 0) {
          if (y < topBound) {
            regions.top++;
          } else if (y >= bottomBound) {
            regions.bottom++;
          } else if (x < leftBound) {
            regions.left++;
          } else if (x >= rightBound) {
            regions.right++;
          } else {
            regions.center++;
          }
        }
      }
    }

    // Return the region with the most diff pixels
    let maxRegion: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'center';
    let maxCount = 0;
    for (const [region, count] of Object.entries(regions)) {
      if (count > maxCount) {
        maxCount = count;
        maxRegion = region as typeof maxRegion;
      }
    }

    return maxRegion;
  }

  /**
   * Analyze diff pixel distribution across a 3×3 grid.
   */
  analyzeAffectedRegion3x3(
    diffBuffer: Buffer,
    width: number,
    height: number
  ): { primaryRegion: GridCell; affectedGridCells: GridCell[]; gridCounts: Record<GridCell, number> } {
    const cells: GridCell[] = [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'center', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right',
    ];
    const gridCounts: Record<GridCell, number> = {} as Record<GridCell, number>;
    for (const cell of cells) gridCounts[cell] = 0;

    const colW = Math.floor(width / 3);
    const rowH = Math.floor(height / 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = diffBuffer[idx];
        const g = diffBuffer[idx + 1];
        const b = diffBuffer[idx + 2];
        if (r > 0 || g > 0 || b > 0) {
          const col = x < colW ? 0 : x < colW * 2 ? 1 : 2;
          const row = y < rowH ? 0 : y < rowH * 2 ? 1 : 2;
          const rowNames = ['top', 'middle', 'bottom'] as const;
          const colNames = ['left', 'center', 'right'] as const;
          const cellName = (row === 1 && col === 1)
            ? 'center' as GridCell
            : `${rowNames[row]}-${colNames[col]}` as GridCell;
          gridCounts[cellName]++;
        }
      }
    }

    let primaryRegion: GridCell = 'center';
    let maxCount = 0;
    let totalDiff = 0;
    for (const cell of cells) {
      totalDiff += gridCounts[cell];
      if (gridCounts[cell] > maxCount) {
        maxCount = gridCounts[cell];
        primaryRegion = cell;
      }
    }

    const threshold = totalDiff * 0.1;
    const affectedGridCells = cells.filter(c => gridCounts[c] > threshold);

    return { primaryRegion, affectedGridCells, gridCounts };
  }

  /**
   * Classify the visual difference into a known IssueCategory based on spatial distribution
   * and quantity of differing pixels. Evaluated in priority order.
   */
  analyzeUIPattern(
    diffBuffer: Buffer,
    width: number,
    height: number,
    stage: ScreenshotStage,
    diffPercentage: number
  ): UIPatternAnalysis {
    const { primaryRegion, gridCounts } = this.analyzeAffectedRegion3x3(diffBuffer, width, height);

    // Count total diff pixels from the buffer directly
    let totalDiffPixels = 0;
    for (let i = 0; i < diffBuffer.length; i += 4) {
      if (diffBuffer[i] > 0 || diffBuffer[i + 1] > 0 || diffBuffer[i + 2] > 0) {
        totalDiffPixels++;
      }
    }

    if (totalDiffPixels === 0) {
      return {
        category: 'General Layout Change',
        description: 'General layout differences detected — manual review recommended',
        affectedRegion: primaryRegion,
      };
    }

    // 1. Missing Scrollbar: >30% of diff pixels in rightmost 20px column OR bottom 20px row
    let edgePixels = 0;
    let rightEdgePixels = 0;
    let bottomEdgePixels = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (diffBuffer[idx] > 0 || diffBuffer[idx + 1] > 0 || diffBuffer[idx + 2] > 0) {
          if (x > width - 20) rightEdgePixels++;
          if (y > height - 20) bottomEdgePixels++;
        }
      }
    }
    edgePixels = Math.max(rightEdgePixels, bottomEdgePixels);
    if (edgePixels / totalDiffPixels > 0.30) {
      const region = rightEdgePixels >= bottomEdgePixels ? 'right edge' : 'bottom edge';
      return {
        category: 'Missing Scrollbar',
        description: 'Scrollbar may be missing or added in [modal/grid/panel]',
        affectedRegion: region,
      };
    }

    // 2. Content Truncation: >40% of diff pixels in bottom-left + bottom-center + bottom-right
    const bottomSum = gridCounts['bottom-left'] + gridCounts['bottom-center'] + gridCounts['bottom-right'];
    if (bottomSum / totalDiffPixels > 0.40) {
      return {
        category: 'Content Truncation',
        description: 'Content may be truncated or overflow hidden changed',
        affectedRegion: 'bottom edge of container',
      };
    }

    // 3. Error List Visibility: stage === 'form_validation' AND >30% in bottom cells
    if (stage === 'form_validation' && bottomSum / totalDiffPixels > 0.30) {
      return {
        category: 'Error List Visibility',
        description: 'Validation error messages may be missing or styled differently',
        affectedRegion: 'lower portion of form',
      };
    }

    // 4. Grid/Table Layout Shift: ≥4 cells each with >10% of total diff pixels
    const cellsAboveThreshold = Object.values(gridCounts).filter(
      count => count / totalDiffPixels > 0.10
    ).length;
    if (cellsAboveThreshold >= 4) {
      return {
        category: 'Grid/Table Layout Shift',
        description: 'Table or grid layout may have shifted — check row heights and column widths',
        affectedRegion: 'multiple rows in center region',
      };
    }

    // 5. Modal/Dialog Size Change: form stages AND diff in middle-left/middle-right/top-center/bottom-center
    const formStages: ScreenshotStage[] = ['form_empty', 'form_validation', 'form_filled'];
    if (formStages.includes(stage)) {
      const edgeCenterSum =
        gridCounts['middle-left'] + gridCounts['middle-right'] +
        gridCounts['top-center'] + gridCounts['bottom-center'];
      if (edgeCenterSum / totalDiffPixels > 0.30) {
        return {
          category: 'Modal/Dialog Size Change',
          description: 'Modal or dialog size may have changed',
          affectedRegion: 'edges of center region',
        };
      }
    }

    // 6. Button/Control Missing: diffPercentage < 1.0 AND diff in ≤2 grid cells
    if (diffPercentage < 1.0) {
      const cellsWithAnyDiff = Object.values(gridCounts).filter(count => count > 0).length;
      if (cellsWithAnyDiff <= 2) {
        return {
          category: 'Button/Control Missing',
          description: 'A UI control (button, icon, or widget) may be missing or repositioned',
          affectedRegion: primaryRegion,
        };
      }
    }

    // 7. General Layout Change: fallback
    return {
      category: 'General Layout Change',
      description: 'General layout differences detected — manual review recommended',
      affectedRegion: primaryRegion,
    };
  }

  /**
   * Compare DOM snapshots (.dom.json files) for two screenshots to detect
   * missing/added controls by name — semantic diff beyond pixel comparison.
   */
  comparedomSnapshots(baselinePngPath: string, targetPngPath: string): SemanticDiff | undefined {
    try {
      const baselineJson = baselinePngPath.replace('.png', '.dom.json');
      const targetJson = targetPngPath.replace('.png', '.dom.json');

      if (!fs.existsSync(baselineJson) || !fs.existsSync(targetJson)) {
        return undefined;
      }

      const baseline = JSON.parse(fs.readFileSync(baselineJson, 'utf-8'));
      const target = JSON.parse(fs.readFileSync(targetJson, 'utf-8'));

      const missingInTarget: string[] = [];
      const addedInTarget: string[] = [];

      // Helper: compare simple string arrays
      const compareStringArrays = (baseArr: string[], targetArr: string[], label: string) => {
        const baseSet = new Set(baseArr.map((s: string) => s.toLowerCase().trim()));
        const targetSet = new Set(targetArr.map((s: string) => s.toLowerCase().trim()));
        for (const item of baseArr) {
          if (!targetSet.has(item.toLowerCase().trim())) {
            missingInTarget.push(`${label} "${item}" missing in target`);
          }
        }
        for (const item of targetArr) {
          if (!baseSet.has(item.toLowerCase().trim())) {
            addedInTarget.push(`${label} "${item}" added in target`);
          }
        }
      };

      // Columns
      compareStringArrays(baseline.columns || [], target.columns || [], 'Column');

      // Column options panel
      compareStringArrays(baseline.columnOptions || [], target.columnOptions || [], 'Column option');

      // Form fields — compare labels, required status, and size
      const baseFields: Array<{ label: string; required: boolean; size: { w: number; h: number } }> = baseline.formFields || [];
      const targetFields: Array<{ label: string; required: boolean; size: { w: number; h: number } }> = target.formFields || [];
      const baseFieldMap = new Map(baseFields.map(f => [f.label.toLowerCase().trim(), f]));
      const targetFieldMap = new Map(targetFields.map(f => [f.label.toLowerCase().trim(), f]));

      for (const [key, bf] of baseFieldMap) {
        const tf = targetFieldMap.get(key);
        if (!tf) {
          missingInTarget.push(`Form field "${bf.label}" missing in target`);
        } else {
          // Required marker diff
          if (bf.required && !tf.required) {
            missingInTarget.push(`Required marker (*) missing on "${bf.label}" in target`);
          } else if (!bf.required && tf.required) {
            addedInTarget.push(`Required marker (*) added on "${bf.label}" in target`);
          }
          // Size diff — flag if height or width differs by more than 10px
          const wDiff = Math.abs(bf.size.w - tf.size.w);
          const hDiff = Math.abs(bf.size.h - tf.size.h);
          if (hDiff > 10) {
            addedInTarget.push(`Field "${bf.label}" is ${tf.size.h > bf.size.h ? 'taller' : 'shorter'} in target (${bf.size.h}px → ${tf.size.h}px height)`);
          }
          if (wDiff > 20) {
            addedInTarget.push(`Field "${bf.label}" is ${tf.size.w > bf.size.w ? 'wider' : 'narrower'} in target (${bf.size.w}px → ${tf.size.w}px width)`);
          }
        }
      }
      for (const [key, tf] of targetFieldMap) {
        if (!baseFieldMap.has(key)) {
          addedInTarget.push(`Form field "${tf.label}" added in target`);
        }
      }

      // Buttons — compare labels and border presence
      const baseButtons: Array<{ label: string; hasBorder: boolean }> = baseline.buttons || [];
      const targetButtons: Array<{ label: string; hasBorder: boolean }> = target.buttons || [];
      const baseButtonMap = new Map(baseButtons.map(b => [b.label.toLowerCase().trim(), b]));
      const targetButtonMap = new Map(targetButtons.map(b => [b.label.toLowerCase().trim(), b]));

      for (const [key, bb] of baseButtonMap) {
        const tb = targetButtonMap.get(key);
        if (!tb) {
          missingInTarget.push(`Button "${bb.label}" missing in target`);
        } else if (bb.hasBorder !== tb.hasBorder) {
          if (bb.hasBorder && !tb.hasBorder) {
            missingInTarget.push(`Button "${bb.label}" has border in baseline but not in target`);
          } else {
            addedInTarget.push(`Button "${bb.label}" has border in target but not in baseline`);
          }
        }
      }
      for (const [key, tb] of targetButtonMap) {
        if (!baseButtonMap.has(key)) {
          addedInTarget.push(`Button "${tb.label}" added in target`);
        }
      }

      // Error messages
      compareStringArrays(baseline.errorMessages || [], target.errorMessages || [], 'Validation error');

      // Menu items
      compareStringArrays(baseline.menuItems || [], target.menuItems || [], 'Menu item');

      if (missingInTarget.length === 0 && addedInTarget.length === 0) {
        return { missingInTarget: [], addedInTarget: [], summary: 'All controls match — difference is visual only (styling, color, spacing)' };
      }

      const parts: string[] = [];
      if (missingInTarget.length > 0) parts.push(`${missingInTarget.length} issue(s) in target`);
      if (addedInTarget.length > 0) parts.push(`${addedInTarget.length} addition(s) in target`);
      const summary = parts.join('; ');

      return { missingInTarget, addedInTarget, summary };
    } catch {
      return undefined;
    }
  }

  /**
   * Find unmatched screenshots between baseline and target sets.
   */
  findUnmatched(
    baselineFiles: string[],
    targetFiles: string[]
  ): { newScreens: string[]; missingInTarget: string[] } {
    const baselineKeys = new Set(baselineFiles.map(f => this.getScreenshotKey(f)));
    const targetKeys = new Set(targetFiles.map(f => this.getScreenshotKey(f)));

    // Files in target but not in baseline → new screens
    const newScreens = targetFiles.filter(f => !baselineKeys.has(this.getScreenshotKey(f)));

    // Files in baseline but not in target → missing in target
    const missingInTarget = baselineFiles.filter(f => !targetKeys.has(this.getScreenshotKey(f)));

    return { newScreens, missingInTarget };
  }

  /**
   * Strip the environment prefix from a screenshot filename.
   * e.g., "std-f1_Announcements_form_empty.png" → "Announcements_form_empty.png"
   *
   * CRITICAL: Must use known env names to strip prefix — NOT indexOf('_').
   * Reason: "std-f1" contains a hyphen, so indexOf('_') strips only "std",
   * leaving "f1_Announcements_form_empty.png" which never matches the target key.
   * This causes ALL comparisons to show 0% diff (nothing ever matches).
   */
  private getScreenshotKey(filename: string): string {
    for (const env of [this.baselineEnv, this.targetEnv]) {
      const prefix = `${env}_`;
      if (filename.startsWith(prefix)) {
        return filename.substring(prefix.length);
      }
    }
    // Fallback for unknown envs
    const underscoreIdx = filename.indexOf('_');
    if (underscoreIdx === -1) {
      return filename;
    }
    return filename.substring(underscoreIdx + 1);
  }

  /**
   * Parse a screenshot key (module_stage.png or module_stage_scroll1.png) into module and stage parts.
   */
  private parseScreenshotKey(key: string): { module: string; stage: ScreenshotStage } {
    const withoutExt = key.replace('.png', '');

    // Valid stages including scroll variants: list_page, form_empty, form_empty_scroll1, etc.
    const validStages: ScreenshotStage[] = ['list_page', 'form_empty', 'form_validation', 'form_filled', 'form_saved'];

    // Check scroll variants first (e.g. form_empty_scroll1)
    for (const stage of validStages) {
      const scrollMatch = withoutExt.match(new RegExp(`^(.+)_(${stage}_scroll\\d+)$`));
      if (scrollMatch) {
        return { module: scrollMatch[1], stage: scrollMatch[2] as ScreenshotStage };
      }
      if (withoutExt.endsWith(`_${stage}`)) {
        const module = withoutExt.substring(0, withoutExt.length - stage.length - 1);
        return { module, stage };
      }
    }

    // Fallback
    const lastUnderscore = withoutExt.lastIndexOf('_');
    if (lastUnderscore === -1) return { module: withoutExt, stage: 'list_page' };
    return {
      module: withoutExt.substring(0, lastUnderscore),
      stage: withoutExt.substring(lastUnderscore + 1) as ScreenshotStage,
    };
  }

  /**
   * Load .png filenames from a directory, excluding non-PNG files like navigation-log.json.
   */
  private loadPngFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) {
      console.log(`[COMPARATOR] Directory not found: ${dir}`);
      return [];
    }
    return fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  }
}
