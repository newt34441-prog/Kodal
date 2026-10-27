import {
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from './config';
import { DonationSubmission } from '../types';
import { handleFirestoreError, OperationType } from './errorHandler';

// Helper to generate a unique human-friendly donation reference number
export function generateDonationReference(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KHF-${dateStr}-${randomSuffix}`;
}

// 1. Public Donor Submission (Stored as 'pending')
export async function submitManualDonation(
  data: Omit<
    DonationSubmission,
    'id' | 'status' | 'submittedAt' | 'referenceNo'
  > & { referenceNo?: string }
): Promise<{ id: string; referenceNo: string }> {
  const referenceNo = data.referenceNo || generateDonationReference();
  const submissionId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const cleanTrxId = data.transactionId.trim().toUpperCase();
  const cleanPhone = data.donorPhone.trim();
  const cleanName = data.donorName.trim();
  const amount = Number(data.amount);

  if (isNaN(amount) || amount <= 0) {
    throw new Error('অনুগ্রহ করে সঠিক অনুদানের পরিমাণ (টাকা) প্রদান করুন।');
  }

  if (!cleanTrxId) {
    throw new Error('Transaction ID (TrxID) প্রদান করা বাধ্যতামূলক।');
  }

  const payload: DonationSubmission = {
    id: submissionId,
    referenceNo,
    donorName: cleanName,
    donorPhone: cleanPhone,
    amount,
    method: data.method,
    recipientNumber: data.recipientNumber,
    transactionId: cleanTrxId,
    purpose: data.purpose || 'সাধারণ কল্যাণ তহবিল',
    note: data.note?.trim() || '',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'donationSubmissions', submissionId), payload);
    return { id: submissionId, referenceNo };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `donationSubmissions/${submissionId}`);
    throw error;
  }
}

// 2. Admin Atomic Approval (Guarantees unique Transaction ID & single Income record)
export async function approveDonationSubmission(
  submission: DonationSubmission
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('শুধুমাত্র অনুমোদিত অ্যাডমিন অনুমোদন করতে পারেন।');
  }

  const cleanTrxId = submission.transactionId.trim().toUpperCase();
  const trxLockId = `${submission.method}_${cleanTrxId}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  const submissionRef = doc(db, 'donationSubmissions', submission.id);
  const trxLockRef = doc(db, 'approvedTrxIds', trxLockId);
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split('T')[0];

  const newTxId = 'tx_' + Date.now();
  const newDonationId = 'don_' + Date.now();
  const txRef = doc(db, 'transactions', newTxId);
  const donationRef = doc(db, 'donations', newDonationId);

  await runTransaction(db, async (transaction) => {
    // 1. Read current submission
    const subSnap = await transaction.get(submissionRef);
    if (!subSnap.exists()) {
      throw new Error('অনুদানের আবেদনটি পাওয়া যায়নি।');
    }
    const currentSub = subSnap.data() as DonationSubmission;
    if (currentSub.status === 'approved') {
      throw new Error('এই অনুদানটি ইতিপূর্বে ইতিমধ্যে অনুমোদিত হয়েছে।');
    }

    // 2. Read unique TrxID lock to prevent duplicate approval
    const lockSnap = await transaction.get(trxLockRef);
    if (lockSnap.exists()) {
      throw new Error(
        `এই Transaction ID (${cleanTrxId}) ইতিমধ্যে অন্য একটি অনুদানে অনুমোদিত হয়েছে! একই TrxID দুইবার গ্রহণযোগ্য নয়।`
      );
    }

    // 3. Create unique TrxID lock document
    transaction.set(trxLockRef, {
      trxId: cleanTrxId,
      method: submission.method,
      submissionId: submission.id,
      referenceNo: submission.referenceNo,
      approvedAt: nowIso,
      approvedBy: currentUser.email || currentUser.uid,
    });

    // 4. Create financial income transaction
    const methodBangla = submission.method === 'bkash' ? 'বিকাশ' : 'নগদ';
    transaction.set(txRef, {
      type: 'income',
      category: `অনলাইন অনুদান (${methodBangla})`,
      amount: submission.amount,
      date: todayDate,
      description: `অনলাইন অনুদান - ${submission.donorName} (TrxID: ${cleanTrxId}, রেফ: ${submission.referenceNo})`,
      voucherNo: submission.referenceNo,
      sourceSubmissionId: submission.id,
      createdAt: nowIso,
      createdBy: currentUser.email || currentUser.uid,
    });

    // 5. Create public verified donation record
    transaction.set(donationRef, {
      donorName: submission.donorName,
      amount: submission.amount,
      date: todayDate,
      purpose: submission.purpose,
      receiptNo: submission.referenceNo,
      createdAt: nowIso,
      createdBy: currentUser.email || currentUser.uid,
    });

    // 6. Update submission status to 'approved' and link references
    transaction.update(submissionRef, {
      status: 'approved',
      reviewedAt: nowIso,
      reviewedBy: currentUser.email || currentUser.uid,
      linkedTransactionId: newTxId,
      linkedDonationId: newDonationId,
    });
  });
}

// 3. Admin Rejection with reason
export async function rejectDonationSubmission(
  submissionId: string,
  reason: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('শুধুমাত্র অনুমোদিত অ্যাডমিন বাতিল করতে পারেন।');
  }

  await updateDoc(doc(db, 'donationSubmissions', submissionId), {
    status: 'rejected',
    rejectionReason: reason || 'তথ্য যাচাইয়ে অসঙ্গতি পরিলক্ষিত হয়েছে।',
    reviewedAt: new Date().toISOString(),
    reviewedBy: currentUser.email || currentUser.uid,
  });
}

// 4. Admin Revocation (Reverts an approved donation, removes from Income & ledger)
export async function revokeApprovedDonation(
  submission: DonationSubmission
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('অনুমোদিত অ্যাডমিন ছাড়া বাতিল করা যাবে না।');
  }

  const cleanTrxId = submission.transactionId.trim().toUpperCase();
  const trxLockId = `${submission.method}_${cleanTrxId}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  const submissionRef = doc(db, 'donationSubmissions', submission.id);
  const trxLockRef = doc(db, 'approvedTrxIds', trxLockId);

  await runTransaction(db, async (transaction) => {
    // Read submission
    const subSnap = await transaction.get(submissionRef);
    if (!subSnap.exists()) return;
    const currentSub = subSnap.data() as DonationSubmission;

    // Delete linked transaction if exists
    if (currentSub.linkedTransactionId) {
      transaction.delete(doc(db, 'transactions', currentSub.linkedTransactionId));
    }

    // Delete linked donation if exists
    if (currentSub.linkedDonationId) {
      transaction.delete(doc(db, 'donations', currentSub.linkedDonationId));
    }

    // Delete lock document
    transaction.delete(trxLockRef);

    // Update submission status to rejected
    transaction.update(submissionRef, {
      status: 'rejected',
      rejectionReason: 'অ্যাডমিন কর্তৃক পূর্বের অনুমোদন প্রত্যাহার করা হয়েছে।',
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser.email || currentUser.uid,
      linkedTransactionId: null,
      linkedDonationId: null,
    });
  });
}
