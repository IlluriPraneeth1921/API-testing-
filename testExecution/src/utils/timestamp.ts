let runTimestamp: string | null = null;

export const getRunTimestamp = () => {
  if (!runTimestamp) {
    runTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }
  return runTimestamp;
};

export const resetRunTimestamp = () => {
  runTimestamp = null;
};
