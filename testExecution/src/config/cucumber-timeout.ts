import { setDefaultTimeout } from "@cucumber/cucumber";

// 5 minutes - allows retry loops (up to 5 persons × ~40s each)
setDefaultTimeout(300 * 1000);