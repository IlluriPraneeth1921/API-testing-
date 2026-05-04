import * as fs from 'fs';
import * as path from 'path';
import type { ComparisonResult, IssueCategory } from './visual-comparator';
import type { NavigationLogEntry } from './visual-scanner';

// --- Interfaces ---

export interface ReportData {
  baseline: string;
  target: string;
  threshold: number;
  timestamp: string;
  toolVersion: string;
  results: ComparisonResult[];
  navigationLogs: {
    baseline: NavigationLogEntry[];
    target: NavigationLogEntry[];
  };
  summary: {
    totalPairs: number;
    flaggedIssues: number;
    newScreens: number;
    missingScreens: number;
  };
}

// --- ReportGenerator ---

export class ReportGenerator {
  /**
   * Generate a self-contained HTML report and write to outputPath.
   * Creates parent directories if needed.
   */
  generate(data: ReportData, outputPath: string): void {
    console.log(`[REPORT] Generating report for ${data.baseline} vs ${data.target}`);
    const html = this.buildHTML(data);

    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`[REPORT] Report written to ${outputPath}`);
  }

  /**
   * Read an image file and return a base64 data URI.
   * Returns empty string if file doesn't exist or is empty.
   */
  private imageToBase64(filePath: string): string {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return '';
      }
      const buffer = fs.readFileSync(filePath);
      if (buffer.length === 0) {
        return '';
      }
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch {
      return '';
    }
  }

  /**
   * Build the full self-contained HTML string with inline CSS and JS.
   */
  private buildHTML(data: ReportData): string {
    const sortedResults = [...data.results].sort((a, b) => {
      // Flagged items first, sorted by diffPercentage descending
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      return b.diffPercentage - a.diffPercentage;
    });

    // Collect unique module names and stages for filter dropdowns
    const moduleNames = [...new Set(data.results.map(r => r.module))].sort();
    const stages = [...new Set(data.results.map(r => r.stage))].sort();

    const resultCards = sortedResults.map(result => this.buildResultCard(result, data)).join('\n');
    const moduleOptions = moduleNames.map(m => `<option value="${this.escapeHtml(m)}">${this.escapeHtml(m)}</option>`).join('');
    const stageOptions = stages.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('');

    const uiIssuesSummary = this.buildUIIssuesSummary(sortedResults);
    const issuesSummaryTable = this.buildIssuesSummaryTable(sortedResults);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a1a; }
    .header { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header-meta { color: #666; font-size: 14px; margin-top: 4px; }
    .summary { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 24px; flex-wrap: wrap; }
    .summary-item { text-align: center; min-width: 120px; }
    .summary-item .value { font-size: 32px; font-weight: 700; color: #1a1a1a; }
    .summary-item .label { font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-item.flagged .value { color: #e53e3e; }
    .summary-item.new .value { color: #3182ce; }
    .summary-item.missing .value { color: #d69e2e; }
    .filters { background: #fff; border-radius: 8px; padding: 16px 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .filters label { font-size: 13px; font-weight: 600; color: #555; }
    .filters select { padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: #fff; }
    .card { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .card-title { font-size: 18px; font-weight: 600; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge.flagged { background: #fed7d7; color: #c53030; }
    .badge.matched { background: #c6f6d5; color: #276749; }
    .badge.new_screen { background: #bee3f8; color: #2a4365; }
    .badge.missing_in_target { background: #fefcbf; color: #744210; }
    .badge.dimension_mismatch { background: #e9d8fd; color: #553c9a; }
    .badge.unreadable { background: #fed7d7; color: #9b2c2c; }
    .diff-pct { font-size: 14px; color: #666; }
    .image-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .image-grid.single { grid-template-columns: 1fr; max-width: 500px; }
    .image-col { text-align: center; }
    .image-col img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; }
    .image-col .img-label { font-size: 12px; color: #888; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; }
    .nav-steps { margin-top: 12px; padding: 12px; background: #f7fafc; border-radius: 4px; font-size: 13px; }
    .nav-steps h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #555; }
    .nav-steps ul { list-style: none; padding: 0; }
    .nav-steps li { padding: 2px 0; color: #555; }
    .nav-steps li::before { content: "→ "; color: #a0aec0; }
    .region-info { margin-top: 8px; padding: 8px 12px; background: #fffbeb; border-left: 3px solid #d69e2e; border-radius: 0 4px 4px 0; font-size: 13px; color: #744210; }
    .no-image { display: flex; align-items: center; justify-content: center; min-height: 100px; background: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 4px; color: #a0aec0; font-size: 13px; }
    #ui-issues-summary { margin-bottom: 24px; padding: 16px; background: #f7fafc; border-radius: 6px; }
    #ui-issues-summary h2 { margin: 0 0 12px; font-size: 18px; }
    .ui-category-group { margin-bottom: 12px; padding: 10px 14px; border-left: 4px solid; border-radius: 0 4px 4px 0; }
    .ui-category-group.ui-category--red { border-color: #c0392b; background: #fdf2f2; }
    .ui-category-group.ui-category--orange { border-color: #c0762b; background: #fdf6f0; }
    .ui-category-group.ui-category--yellow { border-color: #b8860b; background: #fdfdf0; }
    .ui-category-group.ui-category--grey { border-color: #718096; background: #f4f6f8; }
    .ui-category-badge { font-weight: 700; margin-right: 8px; }
    .ui-category-count { font-size: 12px; color: #555; }
    .ui-category-group ul { margin: 6px 0 0 16px; padding: 0; }
    .ui-category-group li { font-size: 13px; }
    .ui-no-issues { color: #2d7a4f; font-weight: 600; }
    .issues-summary-section { margin-bottom: 24px; }
    .issues-summary-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    .issues-summary-table th, .issues-summary-table td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
    .issues-summary-table th { background: #edf2f7; font-weight: 600; }
    .issues-summary-table tr:hover { background: #f7fafc; }
    .ui-pattern-callout { margin-bottom: 12px; padding: 12px 16px; border-left: 4px solid; border-radius: 0 4px 4px 0; font-size: 13px; }
    .ui-pattern-callout h4 { margin: 0 0 4px; font-size: 14px; }
    .ui-pattern-callout p { margin: 0 0 4px; }
    .ui-pattern-callout .ui-pattern-region { font-size: 12px; color: #555; }
    .ui-pattern-callout--red { border-color: #c0392b; background: #fdf2f2; }
    .ui-pattern-callout--orange { border-color: #c0762b; background: #fdf6f0; }
    .ui-pattern-callout--yellow { border-color: #b8860b; background: #fdfdf0; }
    .ui-pattern-callout--grey { border-color: #718096; background: #f4f6f8; }
    /* Tab styles */
    .tab-container { margin-bottom: 12px; }
    .tab-buttons { display: flex; gap: 4px; margin-bottom: 8px; }
    .tab-btn { padding: 6px 16px; border: 1px solid #cbd5e0; border-radius: 4px 4px 0 0; background: #edf2f7; cursor: pointer; font-size: 13px; font-weight: 600; color: #555; }
    .tab-btn.active { background: #fff; border-bottom-color: #fff; color: #1a1a1a; }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .tab-panel img { width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; cursor: zoom-in; transition: opacity 0.15s; }
    .tab-panel img:hover { opacity: 0.9; }
    /* Fullscreen overlay */
    #fullscreen-overlay { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.88); z-index: 9999; align-items: center; justify-content: center; cursor: zoom-out; }
    #fullscreen-overlay.visible { display: flex; }
    #fullscreen-overlay img { max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 4px; cursor: default; }
    #fullscreen-close { position: fixed; top: 16px; right: 24px; color: #fff; font-size: 32px; cursor: pointer; z-index: 10000; line-height: 1; background: rgba(0,0,0,0.5); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
    #fullscreen-close:hover { background: rgba(255,255,255,0.2); }
    /* Diff description — muted blue-grey instead of harsh green */
    .diff-description { margin-top: 10px; padding: 10px 14px; background: #f0f4f8; border-left: 3px solid #4a6fa5; border-radius: 0 4px 4px 0; font-size: 13px; color: #2d3748; }
    .diff-description strong { display: block; margin-bottom: 4px; font-size: 14px; color: #1a202c; }
    /* Semantic diff — distinct from pixel diff */
    .semantic-diff { margin-top: 10px; padding: 10px 14px; background: #fffbf0; border-left: 3px solid #b8860b; border-radius: 0 4px 4px 0; font-size: 13px; color: #2d3748; }
    .semantic-diff strong { display: block; margin-bottom: 6px; font-size: 14px; color: #1a202c; }
    .semantic-diff ul { margin: 4px 0 0 16px; padding: 0; }
    .semantic-diff li { margin: 2px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${uiIssuesSummary}

    <div class="header">
      <h1>Visual Regression Report</h1>
      <div class="header-meta">${this.escapeHtml(data.baseline)} vs ${this.escapeHtml(data.target)}</div>
      <div class="header-meta">Generated: ${this.escapeHtml(data.timestamp)}</div>
      <div class="header-meta">Tool Version: ${this.escapeHtml(data.toolVersion)}</div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="value">${data.summary.totalPairs}</div>
        <div class="label">Total Pairs</div>
      </div>
      <div class="summary-item flagged">
        <div class="value">${data.summary.flaggedIssues}</div>
        <div class="label">Flagged Issues</div>
      </div>
      <div class="summary-item new">
        <div class="value">${data.summary.newScreens}</div>
        <div class="label">New Screens</div>
      </div>
      <div class="summary-item missing">
        <div class="value">${data.summary.missingScreens}</div>
        <div class="label">Missing Screens</div>
      </div>
      <div class="summary-item">
        <div class="value">${data.threshold}%</div>
        <div class="label">Diff Threshold</div>
      </div>
    </div>

    ${issuesSummaryTable}

    <div class="filters">
      <div>
        <label for="filter-module">Module:</label>
        <select id="filter-module" onchange="applyFilters()">
          <option value="">All Modules</option>
          ${moduleOptions}
        </select>
      </div>
      <div>
        <label for="filter-stage">Stage:</label>
        <select id="filter-stage" onchange="applyFilters()">
          <option value="">All Stages</option>
          ${stageOptions}
        </select>
      </div>
      <div>
        <label for="filter-status">Status:</label>
        <select id="filter-status" onchange="applyFilters()">
          <option value="">All</option>
          <option value="flagged">Flagged Only</option>
          <option value="unflagged">Unflagged Only</option>
        </select>
      </div>
    </div>

    <div id="results">
      ${resultCards}
    </div>
  </div>

  <!-- Fullscreen overlay -->
  <div id="fullscreen-overlay" onclick="closeFullscreen()">
    <span id="fullscreen-close" onclick="closeFullscreen()">&#x2715;</span>
    <img id="fullscreen-img" src="" alt="Fullscreen view" onclick="event.stopPropagation()" />
  </div>

  <script>
    function applyFilters() {
      var moduleFilter = document.getElementById('filter-module').value;
      var stageFilter = document.getElementById('filter-stage').value;
      var statusFilter = document.getElementById('filter-status').value;
      var cards = document.querySelectorAll('.card[data-module]');
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var show = true;
        if (moduleFilter && card.getAttribute('data-module') !== moduleFilter) show = false;
        if (stageFilter && card.getAttribute('data-stage') !== stageFilter) show = false;
        if (statusFilter === 'flagged' && card.getAttribute('data-flagged') !== 'true') show = false;
        if (statusFilter === 'unflagged' && card.getAttribute('data-flagged') === 'true') show = false;
        card.style.display = show ? '' : 'none';
      }
    }
    function switchTab(btn, panelId) {
      var container = btn.closest('.tab-container');
      container.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      container.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById(panelId).classList.add('active');
    }
    function openFullscreen(src) {
      document.getElementById('fullscreen-img').src = src;
      document.getElementById('fullscreen-overlay').classList.add('visible');
    }
    function closeFullscreen() {
      document.getElementById('fullscreen-overlay').classList.remove('visible');
      document.getElementById('fullscreen-img').src = '';
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeFullscreen();
    });
  </script>
</body>
</html>`;
  }

  /**
   * Build a single result card HTML.
   */
  private buildResultCard(result: ComparisonResult, data: ReportData): string {
    const baselineImg = result.baselinePath ? this.imageToBase64(result.baselinePath) : '';
    const targetImg = result.targetPath ? this.imageToBase64(result.targetPath) : '';
    const diffImg = result.diffPath ? this.imageToBase64(result.diffPath) : '';

    const badgeClass = result.status;
    const badgeLabel = result.status.replace(/_/g, ' ');

    // Build tabbed image view based on status
    let imageGrid = '';
    const cardId = `card-${result.module}-${result.stage}`;

    if (result.status === 'new_screen') {
      imageGrid = `
        <div class="tab-container">
          <div class="tab-buttons">
            <button class="tab-btn active" onclick="switchTab(this, '${cardId}-target')">Target (New)</button>
          </div>
          <div id="${cardId}-target" class="tab-panel active">
            ${targetImg ? `<img src="${targetImg}" alt="Target screenshot" onclick="openFullscreen(this.src)" title="Click to enlarge" />` : '<div class="no-image">No image</div>'}
          </div>
        </div>`;
    } else if (result.status === 'missing_in_target') {
      imageGrid = `
        <div class="tab-container">
          <div class="tab-buttons">
            <button class="tab-btn active" onclick="switchTab(this, '${cardId}-baseline')">Baseline (Missing)</button>
          </div>
          <div id="${cardId}-baseline" class="tab-panel active">
            ${baselineImg ? `<img src="${baselineImg}" alt="Baseline screenshot" onclick="openFullscreen(this.src)" title="Click to enlarge" />` : '<div class="no-image">No image</div>'}
          </div>
        </div>`;
    } else {
      const defaultTab2: 'baseline' | 'diff' = result.flagged ? 'diff' : 'baseline';
      const baselineActive = defaultTab2 === 'baseline' ? 'active' : '';
      const diffActive = defaultTab2 === 'diff' ? 'active' : '';
      imageGrid = `
        <div class="tab-container">
          <div class="tab-buttons">
            <button class="tab-btn ${baselineActive}" onclick="switchTab(this, '${cardId}-baseline')">Baseline (${this.escapeHtml(data.baseline)})</button>
            <button class="tab-btn" onclick="switchTab(this, '${cardId}-target')">Target (${this.escapeHtml(data.target)})</button>
            <button class="tab-btn ${diffActive}" onclick="switchTab(this, '${cardId}-diff')">Diff ⚠</button>
          </div>
          <div id="${cardId}-baseline" class="tab-panel ${baselineActive}">
            ${baselineImg ? `<img src="${baselineImg}" alt="Baseline screenshot" onclick="openFullscreen(this.src)" title="Click to enlarge" />` : '<div class="no-image">No image</div>'}
          </div>
          <div id="${cardId}-target" class="tab-panel">
            ${targetImg ? `<img src="${targetImg}" alt="Target screenshot" onclick="openFullscreen(this.src)" title="Click to enlarge" />` : '<div class="no-image">No image</div>'}
          </div>
          <div id="${cardId}-diff" class="tab-panel ${diffActive}">
            ${diffImg ? `<img src="${diffImg}" alt="Diff — red pixels show differences" onclick="openFullscreen(this.src)" title="Click to enlarge — red = changed pixels" />` : '<div class="no-image">No diff</div>'}
          </div>
        </div>`;
    }

    // Plain English diff description for flagged results
    let diffDescription = '';
    if (result.flagged && result.differenceDescription) {
      const dd = result.differenceDescription;
      const regionLabel = dd.affectedRegion.replace(/-/g, ' ');
      const stageContext: Record<string, string> = {
        form_empty: 'The empty form dialog looks different between environments',
        form_validation: 'Validation error messages or field highlighting differ',
        form_filled: 'The filled form content or layout differs',
        form_saved: 'The post-save result screen differs',
        list_page: 'The list/table page content or layout differs',
        more_options_menu: 'The more-options menu items or styling differ',
        more_options_edit: 'The edit dialog opened from the menu differs',
        more_options_delete: 'The delete confirmation dialog differs',
        row_expanded: 'The expanded row detail view differs',
        column_options: 'The column options panel differs',
        search_filtered: 'The search-filtered results view differs',
        pagination_next: 'The next page of results differs',
      };
      const stageDesc = stageContext[result.stage] ?? `The "${result.stage}" screen differs`;
      diffDescription = `<div class="diff-description">
        <strong>What differs: ${stageDesc}</strong>
        ${dd.diffPercentage.toFixed(2)}% of pixels changed (${dd.diffPixelCount.toLocaleString()} pixels) — 
        most differences concentrated in the <strong>${regionLabel}</strong> area of the screen.
        ${dd.affectedGridCells.length > 1 ? `Also affected: ${dd.affectedGridCells.filter(c => c !== dd.affectedRegion).map(c => c.replace(/-/g, ' ')).join(', ')}.` : ''}
        Click the <strong>Diff tab</strong> above to see red-highlighted changed pixels, or click any image to view fullscreen.
      </div>`;
    }

    // Navigation steps for this module
    const navSteps = this.getNavigationSteps(result.module, data.navigationLogs);

    // Affected region description
    let regionInfo = '';
    if (result.flagged && result.affectedRegion) {
      const regionDescriptions: Record<string, string> = {
        top: 'Most differences found in the top region of the screen',
        bottom: 'Most differences found in the bottom region of the screen',
        left: 'Most differences found in the left region of the screen',
        right: 'Most differences found in the right region of the screen',
        center: 'Most differences found in the center region of the screen',
      };
      regionInfo = `<div class="region-info">${regionDescriptions[result.affectedRegion] || ''}</div>`;
    }

    // UI Pattern callout box (Task 17.9)
    const uiPatternCallout = this.buildUIPatternCallout(result);

    // Semantic diff — control-level differences
    const semanticDiffHtml = this.buildSemanticDiff(result);

    return `
      <div class="card" id="card-${this.escapeHtml(result.module)}-${this.escapeHtml(result.stage)}" data-module="${this.escapeHtml(result.module)}" data-stage="${this.escapeHtml(result.stage)}" data-flagged="${result.flagged}">
        <div class="card-header">
          <div>
            <span class="card-title">${this.escapeHtml(result.module)}</span>
            <span class="diff-pct"> — ${this.escapeHtml(result.stage)}</span>
          </div>
          <div>
            <span class="badge ${badgeClass}">${this.escapeHtml(badgeLabel)}</span>
            <span class="diff-pct">${result.diffPercentage.toFixed(2)}% diff</span>
          </div>
        </div>
        ${uiPatternCallout}
        ${semanticDiffHtml}
        ${diffDescription}
        ${imageGrid}
        ${regionInfo}
        ${navSteps}
      </div>`;
  }

  /**
   * Build navigation steps HTML for a given module.
   */
  private getNavigationSteps(moduleName: string, logs: ReportData['navigationLogs']): string {
    const baselineSteps = logs.baseline.filter(e => e.module === moduleName);
    const targetSteps = logs.target.filter(e => e.module === moduleName);

    if (baselineSteps.length === 0 && targetSteps.length === 0) {
      return '';
    }

    let html = '<div class="nav-steps"><h4>Navigation Steps</h4>';

    if (baselineSteps.length > 0) {
      html += '<ul>';
      for (const step of baselineSteps) {
        html += `<li>[Baseline] ${this.escapeHtml(step.action)} (${this.escapeHtml(step.stage)}, ${this.escapeHtml(step.url)})</li>`;
      }
      html += '</ul>';
    }

    if (targetSteps.length > 0) {
      html += '<ul>';
      for (const step of targetSteps) {
        html += `<li>[Target] ${this.escapeHtml(step.action)} (${this.escapeHtml(step.stage)}, ${this.escapeHtml(step.url)})</li>`;
      }
      html += '</ul>';
    }

    html += '</div>';
    return html;
  }

    /**
     * Map an IssueCategory to a CSS color modifier class.
     */
    private uiPatternColorClass(category: IssueCategory): string {
      switch (category) {
        case 'Missing Scrollbar':
        case 'Error List Visibility':
          return 'red';
        case 'Grid/Table Layout Shift':
        case 'Modal/Dialog Size Change':
          return 'orange';
        case 'Button/Control Missing':
          return 'yellow';
        case 'General Layout Change':
        case 'Content Truncation':
        default:
          return 'grey';
      }
    }

    /**
     * Build semantic diff block — shows missing/added controls by name.
     */
    private buildSemanticDiff(result: ComparisonResult): string {
      if (!result.flagged || !result.semanticDiff) return '';
      const sd = result.semanticDiff;

      if (sd.missingInTarget.length === 0 && sd.addedInTarget.length === 0) {
        return `<div class="semantic-diff">
          <strong>Control Analysis: ${this.escapeHtml(sd.summary)}</strong>
        </div>`;
      }

      let html = `<div class="semantic-diff">
        <strong>Control Analysis: ${this.escapeHtml(sd.summary)}</strong>`;

      if (sd.missingInTarget.length > 0) {
        html += `<ul>`;
        for (const item of sd.missingInTarget) {
          html += `<li>⚠ ${this.escapeHtml(item)}</li>`;
        }
        html += `</ul>`;
      }
      if (sd.addedInTarget.length > 0) {
        html += `<ul>`;
        for (const item of sd.addedInTarget) {
          html += `<li>+ ${this.escapeHtml(item)}</li>`;
        }
        html += `</ul>`;
      }

      html += `</div>`;
      return html;
    }

    /**
     * Build the UI Pattern callout box for a flagged result (Task 17.9).
     */
    private buildUIPatternCallout(result: ComparisonResult): string {      if (!result.flagged || !result.uiPatternAnalysis) return '';
      const { category, description, affectedRegion } = result.uiPatternAnalysis;
      const color = this.uiPatternColorClass(category);
      return `<div class="ui-pattern-callout ui-pattern-callout--${color}">
    <h4>${this.escapeHtml(category)}</h4>
    <p>${this.escapeHtml(description)}</p>
    <span class="ui-pattern-region">Affected region: ${this.escapeHtml(affectedRegion)}</span>
  </div>`;
    }

    /**
     * Build the Issues Summary table (Task 17.10).
     * Placed after summary stats, before individual cards.
     */
    private buildIssuesSummaryTable(sortedResults: ComparisonResult[]): string {
      const flagged = sortedResults.filter(r => r.flagged);
      if (flagged.length === 0) return '';

      const stageDescriptions: Record<string, string> = {
        form_validation: 'Validation error messages differ',
        list_page: 'Table/list content differs',
        more_options_menu: 'Menu items or styling differ',
        form_empty: 'Empty form layout or fields differ',
        form_filled: 'Filled form content differs',
        form_saved: 'Post-save state differs',
      };

      const rows = flagged.map(r => {
        const issueDesc = r.uiPatternAnalysis?.description
          ?? stageDescriptions[r.stage]
          ?? 'Visual difference detected';
        const cardId = `card-${r.module}-${r.stage}`;
        return `<tr>
          <td><a href="#${this.escapeHtml(cardId)}">${this.escapeHtml(r.module)}</a></td>
          <td>${this.escapeHtml(r.stage)}</td>
          <td>${this.escapeHtml(issueDesc)}</td>
          <td>${r.diffPercentage.toFixed(2)}%</td>
        </tr>`;
      }).join('\n');

      return `<section class="issues-summary-section">
    <h2>Issues Summary</h2>
    <table class="issues-summary-table">
      <thead>
        <tr><th>Module</th><th>Stage</th><th>Issue Description</th><th>Diff %</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </section>`;
    }

    /**
     * Build the UI Issues Summary section (Task 17.12).
     * Placed at the very top of the report body.
     */
    private buildUIIssuesSummary(sortedResults: ComparisonResult[]): string {
      const withPattern = sortedResults.filter(r => r.flagged && r.uiPatternAnalysis);

      if (withPattern.length === 0) {
        return `<section id="ui-issues-summary">
    <h2>UI Issues Summary</h2>
    <p class="ui-no-issues">No UI pattern issues detected</p>
  </section>`;
      }

      // Group by category
      const groups = new Map<IssueCategory, ComparisonResult[]>();
      for (const r of withPattern) {
        const cat = r.uiPatternAnalysis!.category;
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat)!.push(r);
      }

      const groupHtml = [...groups.entries()].map(([category, results]) => {
        const color = this.uiPatternColorClass(category);
        const count = results.length;
        const items = results.map(r => {
          const cardId = `card-${r.module}-${r.stage}`;
          const label = `${r.module} — ${r.stage}`;
          return `<li><a href="#${this.escapeHtml(cardId)}" onclick="document.getElementById('${this.escapeHtml(cardId)}').scrollIntoView({behavior:'smooth'});return false;">${this.escapeHtml(label)}</a></li>`;
        }).join('\n');
        return `<div class="ui-category-group ui-category--${color}">
    <span class="ui-category-badge">${this.escapeHtml(category)}</span>
    <span class="ui-category-count">${count} screen${count !== 1 ? 's' : ''} affected</span>
    <ul>
      ${items}
    </ul>
  </div>`;
      }).join('\n');

      return `<section id="ui-issues-summary">
    <h2>UI Issues Summary</h2>
    ${groupHtml}
  </section>`;
    }


  /**
   * Escape HTML special characters to prevent XSS in report output.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
