const driveFunctionBase =
  import.meta.env.VITE_DRIVE_FUNCTION_BASE ?? "/.netlify/functions";

export const env = {
  driveFunctionBase
} as const;

