declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export type { Database, QueryExecResult, SqlJsStatic };

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
