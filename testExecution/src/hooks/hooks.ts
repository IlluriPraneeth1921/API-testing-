import { Before, After, AfterStep, Status, AfterAll } from "@cucumber/cucumber";
import { launchBrowser } from "@src/core/browser";
import type { PWWorld } from "@src/core/world";
import { generateReport, recordScenario } from "@src/utils/report-generator";
import { getTestData } from "@src/data/test-data";
import * as fs from 'fs';
import { getRunTimestamp } from '@src/utils/timestamp';

// Per-scenario step tracking — reset in Before, populated in AfterStep
let currentStepResults: Array<{ name: string; status: string; duration: number; error?: string; screenshotPath?: string }> = [];

// Rolling buffer: screenshot taken after the previous step (saved only if next step fails)
let prevStepScreenshot: Buffer | null = null;
let prevStepName: string = '';

Before(async function (this: PWWorld, scenario) {
  currentStepResults = [];
  prevStepScreenshot = null;
  prevStepName = '';

  this.browser = await launchBrowser();
  this.context = await this.browser.newContext({
    deviceScaleFactor: 1
  });
  this.page = await this.context.newPage();

  const tcTag = scenario.pickle.tags.find(t => /^@TC\d+$/i.test(t.name));
  if (tcTag) {
    this.tcId = tcTag.name.replace('@', '');
    this.testData = getTestData(this.tcId);
  }
});

AfterStep(async function (this: PWWorld, step) {
  const stepStatus = step.result?.status;
  const duration = step.result?.duration?.nanos ? step.result.duration.nanos / 1000000 : 0;
  const stepName = step.pickleStep?.text || 'Unknown step';

  let status = 'passed';
  let error: string | undefined;
  let screenshotPath: string | undefined;

  if (stepStatus === Status.FAILED) {
    status = 'failed';
    error = step.result?.message?.split('\n').slice(0, 5).join('\n');

    try {
      const reportsDir = `reports/${getRunTimestamp()}/screenshots`;
      fs.mkdirSync(reportsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = stepName.replace(/[^a-z0-9]/gi, '-').substring(0, 40);

      // Save the previous step screenshot (state just before failure)
      if (prevStepScreenshot && prevStepName) {
        const prevSafeName = prevStepName.replace(/[^a-z0-9]/gi, '-').substring(0, 40);
        const prevPath = `${reportsDir}/PRE-FAIL-${prevSafeName}-${timestamp}.png`;
        fs.writeFileSync(prevPath, prevStepScreenshot);
        console.log(`[HOOKS] Pre-failure screenshot: ${prevPath}`);
      }

      // Capture and save the failure screenshot
      const png = await this.page.screenshot({ fullPage: true });
      await this.attach(png, "image/png");
      screenshotPath = `${reportsDir}/FAIL-${safeName}-${timestamp}.png`;
      fs.writeFileSync(screenshotPath, png);
    } catch { /* page may be closed */ }

    prevStepScreenshot = null;
    prevStepName = '';
  } else if (stepStatus === Status.SKIPPED || stepStatus === Status.PENDING) {
    status = 'skipped';
    prevStepScreenshot = null;
    prevStepName = '';
  } else {
    // Passed — capture screenshot into rolling buffer (not saved unless next step fails)
    try {
      prevStepScreenshot = await this.page.screenshot({ fullPage: false });
      prevStepName = stepName;
    } catch { prevStepScreenshot = null; }
  }

  currentStepResults.push({ name: stepName, status, duration, error, screenshotPath });
});

After(async function (this: PWWorld, scenario) {
  const duration = scenario.result?.duration?.nanos ? scenario.result.duration.nanos / 1000000 : 0;
  const scenarioStatus = scenario.result?.status === Status.PASSED ? "passed" : "failed";
  const featureName = scenario.gherkinDocument?.feature?.name || "Unknown Feature";

  // Final screenshot on failure (catches cases where AfterStep didn't fire)
  if (scenario.result?.status === Status.FAILED) {
    try {
      const png = await this.page.screenshot({ fullPage: true });
      await this.attach(png, "image/png");
    } catch { /* page may be closed */ }
  }

  prevStepScreenshot = null;
  prevStepName = '';

  recordScenario(featureName, scenario.pickle.name, scenarioStatus, duration, currentStepResults, scenario.result?.message);

  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});

AfterAll(async function () {
  console.log("\n[HOOKS] Generating custom report...\n");
  await new Promise(resolve => setTimeout(resolve, 1000));
  await generateReport();
});