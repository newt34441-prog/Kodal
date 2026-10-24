import { Member, MemberFeePayment, MemberSubscriptionSummary } from '../types';

/**
 * Calculates member subscription metrics accurately according to foundation rules:
 * - Total Payable = Elapsed periods (months / years) * Subscription Amount
 * - Total Paid = Sum of all recorded fee payment records
 * - Total Due = Math.max(0, Total Payable - Total Paid) (never negative)
 * - Advance Amount = Math.max(0, Total Paid - Total Payable)
 */
export function calculateMemberSubscription(
  member: Member,
  payments: MemberFeePayment[]
): MemberSubscriptionSummary {
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // If subscription not applicable or rate is 0
  if (
    !member.subscriptionType ||
    member.subscriptionType === 'none' ||
    !member.subscriptionAmount ||
    member.subscriptionAmount <= 0
  ) {
    const advance = totalPaid;
    return {
      totalPayable: 0,
      totalPaid,
      totalDue: 0,
      advanceAmount: advance,
      lastPaymentDate: payments.length > 0 ? getLatestPaymentDate(payments) : null,
      status: totalPaid > 0 ? 'advance' : 'none',
      statusLabel: totalPaid > 0 ? 'ঐচ্ছিক জমা' : 'চাঁদা প্রযোজ্য নয়',
      elapsedPeriods: 0,
      periodLabel: 'প্রযোজ্য নয়',
    };
  }

  // Parse join date
  const joinDate = new Date(member.joinDate || Date.now());
  const now = new Date();

  let elapsedPeriods = 0;
  let periodLabel = '';

  if (member.subscriptionType === 'monthly') {
    if (joinDate <= now) {
      const monthDiff =
        (now.getFullYear() - joinDate.getFullYear()) * 12 +
        (now.getMonth() - joinDate.getMonth()) +
        1;
      elapsedPeriods = Math.max(1, monthDiff);
    } else {
      // Future joining date
      elapsedPeriods = 0;
    }
    periodLabel = `${elapsedPeriods} মাস`;
  } else if (member.subscriptionType === 'yearly') {
    if (joinDate <= now) {
      const yearDiff = now.getFullYear() - joinDate.getFullYear() + 1;
      elapsedPeriods = Math.max(1, yearDiff);
    } else {
      elapsedPeriods = 0;
    }
    periodLabel = `${elapsedPeriods} বছর`;
  }

  const totalPayable = elapsedPeriods * (member.subscriptionAmount || 0);
  const totalDue = Math.max(0, totalPayable - totalPaid);
  const advanceAmount = Math.max(0, totalPaid - totalPayable);

  let status: 'paid' | 'advance' | 'due' | 'none' = 'paid';
  let statusLabel = 'পরিশোধিত';

  if (totalPayable === 0) {
    status = totalPaid > 0 ? 'advance' : 'none';
    statusLabel = totalPaid > 0 ? 'অগ্রিম জমা' : 'নিয়মিত';
  } else if (totalPaid >= totalPayable) {
    if (advanceAmount > 0) {
      status = 'advance';
      statusLabel = 'অগ্রিম পরিশোধিত';
    } else {
      status = 'paid';
      statusLabel = 'পরিশোধিত ও নিয়মিত';
    }
  } else if (totalPaid > 0) {
    status = 'due';
    statusLabel = 'আংশিক বকেয়া';
  } else {
    status = 'due';
    statusLabel = 'সম্পূর্ণ বকেয়া';
  }

  return {
    totalPayable,
    totalPaid,
    totalDue,
    advanceAmount,
    lastPaymentDate: payments.length > 0 ? getLatestPaymentDate(payments) : null,
    status,
    statusLabel,
    elapsedPeriods,
    periodLabel,
  };
}

function getLatestPaymentDate(payments: MemberFeePayment[]): string | null {
  if (payments.length === 0) return null;
  const sorted = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return sorted[0]?.date || null;
}
