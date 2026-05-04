import * as fs from 'fs';
import * as path from 'path';

// --- Interfaces ---

export interface DiscoverOptions {
  env: string;
}

export interface ScanOptions {
  env: string;
  module?: string;
}

export interface CompareOptions {
  baseline: string;
  target: string;
  module?: string;
  threshold: number;
}

// --- Helpers ---

/**
 * Extract the value after a flag from an args array.
 * Returns undefined if the flag is not found or has no value.
 */
export function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) {
    return undefined;
  }
  return args[index + 1];
}

/**
 * Scan for .env.* files in the project root and return environment names.
 */
export function listAvailableEnvs(): string[] {
  const projectRoot = process.cwd();
  const files = fs.readdirSync(projectRoot);
  return files
    .filter((f) => f.startsWith('.env.') && f !== '.env.example')
    .map((f) => f.replace('.env.', ''));
}

// --- Validation Helpers ---

/**
 * Check if .env.{env} file exists in project root.
 * If not, list available .env.* files and exit with code 1.
 */
export function validateEnvExists(env: string): void {
  const projectRoot = process.cwd();
  const envFile = path.join(projectRoot, `.env.${env}`);
  if (!fs.existsSync(envFile)) {
    const available = listAvailableEnvs();
    console.error(`Error: Environment file ".env.${env}" not found.`);
    if (available.length > 0) {
      console.error(`Available environments: ${available.join(', ')}`);
    } else {
      console.error('No .env.* files found in project root.');
    }
    process.exit(1);
  }
}

/**
 * Check if module exists in visual-regression/config/modules.json.
 * If not, list available module names and exit with code 1.
 */
export function validateModuleExists(moduleName: string): void {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, 'visual-regression', 'config', 'modules.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: Module config file not found at visual-regression/config/modules.json');
    console.error('Run "npm run visual:discover" first to generate the module config.');
    process.exit(1);
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw);
  const modules: { name: string }[] = config.modules || [];
  const moduleNames = modules.map((m) => m.name);
  if (!moduleNames.includes(moduleName)) {
    console.error(`Error: Module "${moduleName}" not found in modules.json.`);
    if (moduleNames.length > 0) {
      console.error(`Available modules: ${moduleNames.join(', ')}`);
    } else {
      console.error('No modules found in config. Run "npm run visual:discover" first.');
    }
    process.exit(1);
  }
}

/**
 * Check if visual-regression/screenshots/{env}/ folder exists.
 * If not, show expected path and exit with code 1.
 */
export function validateScreenshotFolder(env: string): void {
  const projectRoot = process.cwd();
  const screenshotDir = path.join(projectRoot, 'visual-regression', 'screenshots', env);
  if (!fs.existsSync(screenshotDir)) {
    console.error(`Error: Screenshot folder not found for environment "${env}".`);
    console.error(`Expected path: visual-regression/screenshots/${env}/`);
    console.error('Run "npm run visual:scan --env ' + env + '" first to capture screenshots.');
    process.exit(1);
  }
}

/**
 * Validate that threshold is between 0 and 100.
 * Exit with code 1 if invalid.
 */
export function validateThreshold(value: number): void {
  if (isNaN(value) || value < 0 || value > 100) {
    console.error(`Error: Threshold must be a number between 0 and 100. Got: ${value}`);
    process.exit(1);
  }
}

// --- Argument Parsing Functions ---

/**
 * Parse --env from process.argv. Required.
 */
export function parseDiscoverArgs(): DiscoverOptions {
  const args = process.argv.slice(2);
  const env = getArg(args, '--env');

  if (!env) {
    console.error('Usage: visual:discover --env <environment>');
    console.error('  --env    (required) Environment name (e.g., qa, std-f1)');
    const available = listAvailableEnvs();
    if (available.length > 0) {
      console.error(`\nAvailable environments: ${available.join(', ')}`);
    }
    process.exit(1);
  }

  validateEnvExists(env);

  return { env };
}

/**
 * Parse --env (required) and --module (optional) from process.argv.
 */
export function parseScanArgs(): ScanOptions {
  const args = process.argv.slice(2);
  const env = getArg(args, '--env');
  const moduleName = getArg(args, '--module');

  if (!env) {
    console.error('Usage: visual:scan --env <environment> [--module <moduleName>]');
    console.error('  --env     (required) Environment name (e.g., qa, std-f1)');
    console.error('  --module  (optional) Specific module to scan');
    const available = listAvailableEnvs();
    if (available.length > 0) {
      console.error(`\nAvailable environments: ${available.join(', ')}`);
    }
    process.exit(1);
  }

  validateEnvExists(env);

  if (moduleName) {
    validateModuleExists(moduleName);
  }

  const options: ScanOptions = { env };
  if (moduleName) {
    options.module = moduleName;
  }
  return options;
}

/**
 * Parse --baseline (required), --target (required), --module (optional),
 * and --threshold (optional, default 0.5) from process.argv.
 */
export function parseCompareArgs(): CompareOptions {
  const args = process.argv.slice(2);
  const baseline = getArg(args, '--baseline');
  const target = getArg(args, '--target');
  const moduleName = getArg(args, '--module');
  const thresholdStr = getArg(args, '--threshold');

  if (!baseline || !target) {
    console.error('Usage: visual:compare --baseline <env> --target <env> [--module <moduleName>] [--threshold <percentage>]');
    console.error('  --baseline   (required) Baseline environment name');
    console.error('  --target     (required) Target environment name');
    console.error('  --module     (optional) Specific module to compare');
    console.error('  --threshold  (optional) Diff percentage threshold (0-100, default: 0.5)');
    process.exit(1);
  }

  validateScreenshotFolder(baseline);
  validateScreenshotFolder(target);

  const threshold = thresholdStr !== undefined ? parseFloat(thresholdStr) : 0.5;
  validateThreshold(threshold);

  if (moduleName) {
    validateModuleExists(moduleName);
  }

  const options: CompareOptions = { baseline, target, threshold };
  if (moduleName) {
    options.module = moduleName;
  }
  return options;
}
