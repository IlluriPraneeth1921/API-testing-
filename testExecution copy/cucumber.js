module.exports = {
  default: {
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/**/*.feature"],
    format: [
      "progress-bar",
      "json:reports/cucumber-report.json"
    ],
    publishQuiet: true
  }
};