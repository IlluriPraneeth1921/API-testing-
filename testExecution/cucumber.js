module.exports = {
  default: {
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    format: [
      "progress-bar",
      "json:reports/cucumber-report.json"
    ],
    publishQuiet: true
  },
  smoke: {
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/smoke.feature"],
    format: [
      "progress-bar",
      "json:reports/cucumber-report.json"
    ],
    publishQuiet: true
  },
  regression: {
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/smoke.feature", "features/navigation.feature", "features/organization.feature"],
    format: [
      "progress-bar",
      "json:reports/cucumber-report.json"
    ],
    publishQuiet: true
  },
  "bulk-assignment": {
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/bulk-assignment.feature"],
    format: [
      "progress-bar",
      "json:reports/cucumber-report.json"
    ],
    publishQuiet: true
  }
};