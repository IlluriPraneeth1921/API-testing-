import * as fs from 'fs';
import * as path from 'path';
import { VisualComparator } from './visual-comparator';
import { ReportGenerator, ReportData } from './report-generator';
import { parseCompareArgs } from './cli-parser';
import type { NavigationLogEntry } from './visual-scanner';

async function main() {
  const args = parseCompareArgs();
  console.log(`[COMPARE] Comparing: ${args.baseline} vs ${args.target} (threshold: ${args.threshold}%)`);
  if (args.module) {
    console.log(`[COMPARE] Filtering to module: ${args.module}`);
  }

  // Run comparison
  const comparator = new VisualComparator(args.baseline, args.target, args.threshold);
  const results = await comparator.compare(args.module);

  // Load navigation logs
  const baselineLog = loadNavigationLog(args.baseline);
  const targetLog = loadNavigationLog(args.target);

  // Build report data
  const reportData: ReportData = {
    baseline: args.baseline,
    target: args.target,
    threshold: args.threshold,
    timestamp: new Date().toISOString(),
    toolVersion: '1.0.0',
    results,
    navigationLogs: {
      baseline: baselineLog,
      target: targetLog,
    },
    summary: {
      totalPairs: results.filter(r => r.status === 'matched' || r.status === 'flagged').length,
      flaggedIssues: results.filter(r => r.flagged).length,
      newScreens: results.filter(r => r.status === 'new_screen').length,
      missingScreens: results.filter(r => r.status === 'missing_in_target').length,
    },
  };

  // Generate report
  const reportDir = path.join('visual-regression', 'reports', `${args.baseline}_vs_${args.target}`);
  const reportPath = path.join(reportDir, 'report.html');
  const generator = new ReportGenerator();
  generator.generate(reportData, reportPath);

  // Output summary
  console.log(`[COMPARE] === Comparison Summary ===`);
  console.log(`[COMPARE]   Total pairs compared: ${reportData.summary.totalPairs}`);
  console.log(`[COMPARE]   Flagged issues:       ${reportData.summary.flaggedIssues}`);
  console.log(`[COMPARE]   New screens:          ${reportData.summary.newScreens}`);
  console.log(`[COMPARE]   Missing screens:      ${reportData.summary.missingScreens}`);
  console.log(`[COMPARE]   Report: ${reportPath}`);
}

/**
 * Load navigation log from a screenshot environment folder.
 */
function loadNavigationLog(envName: string): NavigationLogEntry[] {
  const logPath = path.join('visual-regression', 'screenshots', envName, `${envName}_navigation-log.json`);
  try {
    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, 'utf-8');
      return JSON.parse(raw) as NavigationLogEntry[];
    }
  } catch (error) {
    console.error(`[COMPARE] Failed to load navigation log for ${envName}: ${(error as Error).message}`);
  }
  return [];
}

main().catch((err) => {
  console.error('[COMPARE] Unexpected error:', err);
  process.exit(1);
});
