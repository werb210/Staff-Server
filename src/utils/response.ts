export const ok = (data: any) => ({
  success: true,
  data,
});

export const fail = (error: string) => ({
  success: false,
  error,
});
