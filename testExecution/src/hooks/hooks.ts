import { Before, After, Status, AfterAll } from "@cucumber/cucumber";
import { launchBrowser } from "@src/core/browser";
import type { PWWorld } from "@src/core/world";
import { generateReport, recordScenario } from "@src/utils/report-generator";

Before(async function (this: PWWorld) {
  this.browser = await launchBrowser();
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
});

After(async function (this: PWWorld, scenario) {
  const duration = scenario.result?.duration?.nanos ? scenario.result.duration.nanos / 1000000 : 0;
  const status = scenario.result?.status === Status.PASSED ? "passed" : "failed";
  const error = scenario.result?.message;
  const featureName = scenario.gherkinDocument?.feature?.name || "Unknown Feature";
  
  // Capture step details
  const steps = scenario.pickle.steps.map((step) => {
    return {
      name: step.text,
      status: "passed",
      duration: 0,
      error: undefined
    };
  });
  
  recordScenario(featureName, scenario.pickle.name, status, duration, steps, error);
  
  if (scenario.result?.status === Status.FAILED) {
    const png = await this.page.screenshot({ fullPage: true });
    await this.attach(png, "image/png");
  }
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});

AfterAll(async function () {
  console.log("\n[HOOKS] Generating custom report...\n");
  await new Promise(resolve => setTimeout(resolve, 1000));
  await generateReport();
});