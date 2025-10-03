// Simple logger wrapper
export const log = (...args: any[]) => {
  try {
    console.log(...args);
  } catch {}
};


