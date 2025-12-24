import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set. Run: vercel env pull');
    }
    _sql = neon(url);
  }
  return _sql(strings, ...values);
}

export async function q<T extends Record<string, any>>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  const rows = await (sql as any)(strings, ...values);
  return rows as T[];
}