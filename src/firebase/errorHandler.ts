export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  WRITE = 'write',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

export function handleFirestoreError(
  error: unknown,
  operation: OperationType,
  path?: string
): void {
  const err = error as { code?: string; message?: string };
  const errorInfo = {
    operation,
    path: path || 'unknown',
    code: err?.code || 'unknown',
    message: err?.message || String(error),
    timestamp: new Date().toISOString(),
  };

  console.error('Firestore Operation Error:', errorInfo);

  // If permission denied
  if (err?.code === 'permission-denied') {
    console.warn(`Permission denied for ${operation} on ${path}. Check Firestore rules.`);
  }
}
