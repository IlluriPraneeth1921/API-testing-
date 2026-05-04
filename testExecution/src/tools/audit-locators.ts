/**
 * Locator Audit Tool
 *
 * Scans all module locator files and classifies each locator according to RULES.md:
 *
 *   MOVE TO common.locators.ts if the selector is:
 *     - A generic Angular Material component (mat-table, mat-option, mat-dialog, etc.)
 *     - A generic pagination control (aria-label="Next page", etc.)
 *     - A generic button by text (Continue, Cancel, Save, Close, etc.)
 *     - A generic form element (input[type="text"], [role="combobox"], etc.)
 *     - A generic structural/overlay element
 *
 *   STAYS in module locator file if the selector is:
 *     - Has a screen-specific aria-label (e.g. [aria-label="Query Type"])
 *     - Has a screen-specific id pattern (e.g. input[id^="assignmentType"])
 *     - Has a screen-specific title attribute (e.g. button[title="Assign Location"])
 *     - Has a screen-specific CSS class (e.g. .mat-column-personName)
 *     - Has a screen-specific text (e.g. h1:has-text("Bulk Assignments"))
 *
 * OUTPUT: results/locator-audit_{timestamp}/audit-report.md
 *
 * USAGE: npx ts-node -r tsconfig-paths/register src/tools/audit-locators.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocatorEntry {
  key: string;
  value: string;
  comment?: string;
}

interface LocatorFile {
  filePath: string;
  exportName: string;
  locators: LocatorEntry[];
}

interface AuditResult {
  key: string;
  value: string;
  decision: 'MOVE_TO_COMMON' | 'STAYS_IN_MODULE' | 'ALREADY_IN_COMMON' | 'REVIEW';
  reason: string;
  alreadyInCommon?: string; // key name in CommonLocators if duplicate
}

// ─── Common locator patterns (from RULES.md) ─────────────────────────────────

const COMMON_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Generic Angular Material components
  { pattern: /^mat-(table|row|cell|header|option|select|checkbox|radio|dialog|snackbar|spinner|progress|icon|button|slide)/i, reason: 'Generic Angular Material component' },
  { pattern: /^(mat-table|mat-row|mat-cell|mat-header|mat-option|mat-select|mat-checkbox|mat-dialog|mat-snackbar|mat-spinner|mat-progress)/i, reason: 'Generic Angular Material selector' },
  // Generic pagination
  { pattern: /\[aria-label="(First|Previous|Next|Last) page"\]/i, reason: 'Generic pagination control' },
  { pattern: /mat-mdc-paginator/i, reason: 'Generic paginator element' },
  // Generic buttons by text only (no screen-specific context)
  { pattern: /^button:has-text\('(Continue|Cancel|Save|Submit|Close|Delete|Edit|Add|Search|Clear)'\)$/i, reason: 'Generic action button by text' },
  // Generic form elements
  { pattern: /^input\[type="(text|password|email|search)"\]$/, reason: 'Generic form input' },
  { pattern: /^\[role="(combobox|listbox|button|link|tab|tabpanel|menu|menuitem|dialog|alert|grid|row)"\]$/, reason: 'Generic ARIA role selector' },
  // Generic overlays/structural
  { pattern: /cdk-overlay-backdrop/i, reason: 'Generic CDK overlay' },
  { pattern: /loading-overlay/i, reason: 'Generic loading overlay' },
  { pattern: /mat-mdc-form-field-error/i, reason: 'Generic form error' },
];

const MODULE_SPECIFIC_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Screen-specific aria-labels
  { pattern: /\[aria-label="[^"]+"\]/, reason: 'Screen-specific aria-label' },
  // Screen-specific title attributes
  { pattern: /\[title="[^"]+"\]/, reason: 'Screen-specific title attribute' },
  // Screen-specific id patterns
  { pattern: /\[id\^?="[^"]+"\]/, reason: 'Screen-specific id pattern' },
  // Screen-specific CSS classes (mat-column-* is semantic but screen-specific)
  { pattern: /\.mat-column-/, reason: 'Screen-specific mat-column class' },
  // Screen-specific text content
  { pattern: /has-text\("[^"]+"\)/, reason: 'Screen-specific text content' },
  // Screen-specific class combinations
  { pattern: /\.(plr-|empty-list-message|side-navigation)/, reason: 'Screen-specific CSS class' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseLocatorFile(filePath: string): LocatorFile | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract export name
  const exportMatch = content.match(/export const (\w+Locators)\s*=/);
  if (!exportMatch) return null;
  const exportName = exportMatch[1];

  // Extract locator entries with optional preceding comment
  const locators: LocatorEntry[] = [];
  const lines = content.split('\n');

  let pendingComment = '';
  for (const line of lines) {
    const commentMatch = line.match(/\/\*\*\s*(.+?)\s*\*\//);
    if (commentMatch) {
      pendingComment = commentMatch[1].trim();
      continue;
    }
    // Match: key: 'value', or key: "value",
    const entryMatch = line.match(/^\s+(\w+):\s*['"`](.+?)['"`],?\s*$/);
    if (entryMatch) {
      locators.push({
        key: entryMatch[1],
        value: entryMatch[2],
        comment: pendingComment || undefined,
      });
      pendingComment = '';
    } else {
      pendingComment = '';
    }
  }

  return { filePath, exportName, locators };
}

function classifyLocator(entry: LocatorEntry, commonLocators: LocatorFile): AuditResult {
  const { key, value } = entry;

  // Check if already in CommonLocators
  const existingCommon = commonLocators.locators.find(
    cl => cl.value === value || cl.key === key
  );
  if (existingCommon) {
    return {
      key, value,
      decision: 'ALREADY_IN_COMMON',
      reason: `Already exists in CommonLocators as "${existingCommon.key}"`,
      alreadyInCommon: existingCommon.key,
    };
  }

  // Check module-specific patterns first (higher priority)
  for (const { pattern, reason } of MODULE_SPECIFIC_PATTERNS) {
    if (pattern.test(value)) {
      return { key, value, decision: 'STAYS_IN_MODULE', reason };
    }
  }

  // Check common patterns
  for (const { pattern, reason } of COMMON_PATTERNS) {
    if (pattern.test(value)) {
      return { key, value, decision: 'MOVE_TO_COMMON', reason };
    }
  }

  // Default: needs manual review
  return {
    key, value,
    decision: 'REVIEW',
    reason: 'No clear rule match — manual review needed',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const locatorsDir = path.join(__dirname, '../locators');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, '../../reports', `locator-audit_${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // Load CommonLocators as reference
  const commonFile = parseLocatorFile(path.join(locatorsDir, 'common.locators.ts'));
  if (!commonFile) {
    console.error('Could not parse common.locators.ts');
    process.exit(1);
  }

  // Find all module locator files (exclude common and index)
  const moduleFiles = fs.readdirSync(locatorsDir)
    .filter(f => f.endsWith('.locators.ts') && f !== 'common.locators.ts')
    .map(f => parseLocatorFile(path.join(locatorsDir, f)))
    .filter((f): f is LocatorFile => f !== null);

  console.log(`\n[AUDIT] Found ${moduleFiles.length} module locator files`);
  console.log(`[AUDIT] CommonLocators has ${commonFile.locators.length} entries\n`);

  // Audit each module file
  const allResults: Map<string, AuditResult[]> = new Map();
  let totalMoveToCommon = 0;
  let totalAlreadyInCommon = 0;
  let totalStaysInModule = 0;
  let totalReview = 0;

  for (const moduleFile of moduleFiles) {
    const fileName = path.basename(moduleFile.filePath);
    const results: AuditResult[] = moduleFile.locators.map(e => classifyLocator(e, commonFile));
    allResults.set(fileName, results);

    const moveCount = results.filter(r => r.decision === 'MOVE_TO_COMMON').length;
    const alreadyCount = results.filter(r => r.decision === 'ALREADY_IN_COMMON').length;
    const staysCount = results.filter(r => r.decision === 'STAYS_IN_MODULE').length;
    const reviewCount = results.filter(r => r.decision === 'REVIEW').length;

    totalMoveToCommon += moveCount;
    totalAlreadyInCommon += alreadyCount;
    totalStaysInModule += staysCount;
    totalReview += reviewCount;

    console.log(`  ${fileName} (${moduleFile.locators.length} locators):`);
    console.log(`    → MOVE to common: ${moveCount}`);
    console.log(`    → Already in common: ${alreadyCount}`);
    console.log(`    → Stays in module: ${staysCount}`);
    console.log(`    → Needs review: ${reviewCount}`);
  }

  // ─── Generate Markdown Report ───────────────────────────────────────────────

  let report = `# Locator Audit Report\n\nGenerated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `| Category | Count |\n|----------|-------|\n`;
  report += `| Move to common.locators.ts | ${totalMoveToCommon} |\n`;
  report += `| Already in common (duplicate) | ${totalAlreadyInCommon} |\n`;
  report += `| Stays in module file | ${totalStaysInModule} |\n`;
  report += `| Needs manual review | ${totalReview} |\n\n`;

  report += `## Rules Applied\n\n`;
  report += `**MOVE TO common.locators.ts** when selector is:\n`;
  report += `- Generic Angular Material component (no screen-specific context)\n`;
  report += `- Generic pagination control\n`;
  report += `- Generic button by text only (Continue, Cancel, Save, etc.)\n`;
  report += `- Generic form element or ARIA role\n\n`;
  report += `**STAYS in module file** when selector has:\n`;
  report += `- Screen-specific \`aria-label\` (e.g. \`[aria-label="Query Type"]\`)\n`;
  report += `- Screen-specific \`title\` attribute\n`;
  report += `- Screen-specific \`id\` pattern\n`;
  report += `- Screen-specific CSS class or text content\n\n`;

  for (const [fileName, results] of allResults) {
    report += `---\n\n## ${fileName}\n\n`;

    const toMove = results.filter(r => r.decision === 'MOVE_TO_COMMON');
    const alreadyIn = results.filter(r => r.decision === 'ALREADY_IN_COMMON');
    const stays = results.filter(r => r.decision === 'STAYS_IN_MODULE');
    const review = results.filter(r => r.decision === 'REVIEW');

    if (toMove.length > 0) {
      report += `### 🔄 Move to common.locators.ts (${toMove.length})\n\n`;
      report += `| Key | Selector | Reason |\n|-----|----------|--------|\n`;
      for (const r of toMove) {
        report += `| \`${r.key}\` | \`${r.value}\` | ${r.reason} |\n`;
      }
      report += '\n';
    }

    if (alreadyIn.length > 0) {
      report += `### ✅ Already in common.locators.ts — remove duplicate (${alreadyIn.length})\n\n`;
      report += `| Key | Selector | Common Key |\n|-----|----------|------------|\n`;
      for (const r of alreadyIn) {
        report += `| \`${r.key}\` | \`${r.value}\` | \`${r.alreadyInCommon}\` |\n`;
      }
      report += '\n';
    }

    if (stays.length > 0) {
      report += `### ✔ Stays in module file (${stays.length})\n\n`;
      report += `| Key | Selector | Reason |\n|-----|----------|--------|\n`;
      for (const r of stays) {
        report += `| \`${r.key}\` | \`${r.value}\` | ${r.reason} |\n`;
      }
      report += '\n';
    }

    if (review.length > 0) {
      report += `### ⚠ Needs manual review (${review.length})\n\n`;
      report += `| Key | Selector |\n|-----|----------|\n`;
      for (const r of review) {
        report += `| \`${r.key}\` | \`${r.value}\` |\n`;
      }
      report += '\n';
    }
  }

  // Write report
  const reportPath = path.join(outputDir, 'audit-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n[AUDIT] ✅ Report written to: ${reportPath}`);
  console.log(`[AUDIT] Open it to review what should move to common.locators.ts`);
  console.log(`[AUDIT] NOTE: This script is READ-ONLY — no files were modified.\n`);
}

main();
