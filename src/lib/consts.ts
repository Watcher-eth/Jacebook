export const WORKER_URL = (() => {
    const v = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!v) throw new Error("Missing NEXT_PUBLIC_WORKER_URL in .env.local");
    return v.replace(/\/$/, "");
  })();