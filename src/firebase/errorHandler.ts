/**
 * Error handling utility for Firebase Firestore and Storage operations
 */

export enum OperationType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  LIST = 'list',
}

interface FirestoreErrorLike {
  code?: string;
  message?: string;
}

// Global listener for quota state
type QuotaListener = (isExceeded: boolean) => void;
const quotaListeners = new Set<QuotaListener>();
let isQuotaExceededGlobal = false;

export function onQuotaExceededChange(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  listener(isQuotaExceededGlobal);
  return () => {
    quotaListeners.delete(listener);
  };
}

export function handleFirestoreError(
  error: unknown,
  operation: OperationType,
  path: string
): string {
  const err = error as FirestoreErrorLike;
  const code = err?.code || '';
  const message = err?.message || String(error);

  const isQuota =
    code.includes('resource-exhausted') ||
    message.includes('Quota exceeded') ||
    message.includes('Free daily read units');

  if (isQuota) {
    if (!isQuotaExceededGlobal) {
      isQuotaExceededGlobal = true;
      quotaListeners.forEach((l) => l(true));
    }
    console.warn('[Firestore Quota Limit] [' + operation.toUpperCase() + '] at ' + path + ': Free daily read units exceeded.');
    return 'আজকের জন্য ফায়ারবেস ফ্রি রিড কোটা পূর্ণ হয়েছে (Daily Free Quota Exceeded)। আগামীকাল স্বয়ংক্রিয়ভাবে রিসেট হবে অথবা কনসোল থেকে আপগ্রেড করা যাবে।';
  }

  console.error('[Firestore Error] [' + operation.toUpperCase() + '] at ' + path + ':', {
    code,
    message,
    original: error,
  });

  if (code.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    if (operation === OperationType.WRITE || operation === OperationType.DELETE) {
      return 'অনুমতি নেই! শুধুমাত্র অনুমোদিত অ্যাডমিন এই পরিবর্তন করতে পারেন। অনুগ্রহ করে অ্যাডমিন অ্যাকাউন্টে লগইন করুন।';
    }
    return 'এই তথ্যটি দেখার প্রয়োজনীয় অনুমতি নেই।';
  }

  if (code.includes('not-found')) {
    return 'অনুরোধকৃত তথ্যটি ডাটাবেজে খুঁজে পাওয়া যায়নি।';
  }

  if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
    return 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন বা দুর্বল। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।';
  }

  if (code.includes('unauthenticated')) {
    return 'আপনার লগইন মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।';
  }

  return 'কার্যক্রম সম্পন্ন করা যায়নি: ' + (message || 'অপ্রত্যাশিত সমস্যা হয়েছে');
}
