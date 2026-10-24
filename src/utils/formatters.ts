// Bengali numeral converter
export function toBengaliNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const str = num.toString();
  return str.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

// Bengali currency formatting
export function formatTaka(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '৳ ০';
  const formattedEn = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  return `৳ ${toBengaliNumber(formattedEn)}`;
}

// Bengali date string formatter
export function formatBengaliDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  // Convert standard YYYY-MM-DD or DD/MM/YYYY numbers to Bengali
  return toBengaliNumber(dateStr);
}

// Translate Activity Status
export function getActivityStatusLabel(status: 'upcoming' | 'ongoing' | 'completed'): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case 'upcoming':
      return { label: 'আসন্ন', bgClass: 'bg-amber-50 border-amber-200', textClass: 'text-amber-800' };
    case 'ongoing':
      return { label: 'চলমান', bgClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-800' };
    case 'completed':
      return { label: 'সম্পন্ন', bgClass: 'bg-slate-100 border-slate-200', textClass: 'text-slate-700' };
    default:
      return { label: status, bgClass: 'bg-slate-100 border-slate-200', textClass: 'text-slate-700' };
  }
}

// Translate Member Status
export function getMemberStatusLabel(status: 'active' | 'inactive'): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  if (status === 'active') {
    return { label: 'সক্রিয় সদস্য', bgClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-700' };
  }
  return { label: 'নিষ্ক্রিয় সদস্য', bgClass: 'bg-slate-100 border-slate-200', textClass: 'text-slate-600' };
}
