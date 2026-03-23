export const wrap = (fn: any) => {
  return (...args: any[]) => fn(...args);
};
