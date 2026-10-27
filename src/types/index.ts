export interface Donation {
  id: string;
  donorName: string;
  amount: number;
  date: string;
  purpose: string;
  receiptNo?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface PaymentSettings {
  id?: string;
  bkashNumber?: string;
  bkashAccountType?: 'personal' | 'merchant';
  bkashActive: boolean;
  bkashInstructions?: string;
  nagadNumber?: string;
  nagadAccountType?: 'personal' | 'merchant';
  nagadActive: boolean;
  nagadInstructions?: string;
  updatedAt?: string;
}

export interface DonationSubmission {
  id: string;
  referenceNo: string;
  donorName: string;
  donorPhone: string;
  amount: number;
  method: 'bkash' | 'nagad';
  recipientNumber: string;
  transactionId: string;
  purpose: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  linkedTransactionId?: string;
  linkedDonationId?: string;
}

export interface ApprovedTrxId {
  id?: string;
  trxId: string;
  method: 'bkash' | 'nagad';
  submissionId: string;
  referenceNo: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Member {
  id: string;
  name: string;
  memberId: string;
  registrationNo?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  occupation?: string;
  phone?: string;
  emergencyContact?: string;
  village?: string;
  area?: string;
  wardNo?: string;
  union?: string;
  upazila?: string;
  district?: string;
  designation: string;
  memberType?: string;
  category?: string;
  joinDate: string;
  status: 'active' | 'inactive';
  subscriptionType?: 'monthly' | 'yearly' | 'none';
  subscriptionAmount?: number;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberFeePayment {
  id: string;
  memberDocId?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  receiptNo?: string;
  recordedBy?: string;
  remarks?: string;
  linkedTransactionId?: string;
  createdAt?: string;
}

export interface MemberSubscriptionSummary {
  totalPayable: number;
  totalPaid: number;
  totalDue: number;
  advanceAmount: number;
  lastPaymentDate: string | null;
  status: 'paid' | 'advance' | 'due' | 'none';
  statusLabel: string;
  elapsedPeriods: number;
  periodLabel: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  voucherNo?: string;
  sourceSubmissionId?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  photoUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  isPublished: boolean;
  createdAt?: string;
}

export interface Policy {
  id: string;
  title: string;
  category?: string;
  content: string;
  orderNumber?: number;
  isPublished: boolean;
  createdAt?: string;
}

export interface FoundationInfo {
  id?: string;
  name: string;
  address: string;
  establishedDate: string;
  motto?: string;
  introduction?: string;
  mission?: string;
  vision?: string;
  futurePlans?: string;
  logoUrl?: string;
  profilePhotoUrl?: string;
  photoUpdatedAt?: string;
  photoUpdatedBy?: string;
  contactEmail?: string;
  contactPhone?: string;
  updatedAt?: string;
}

export interface Advisor {
  id: string;
  name: string;
  designation: string;
  organization?: string;
  photoUrl?: string;
  bio?: string;
  orderNumber?: number;
  createdAt?: string;
}

export interface Executive {
  id: string;
  name: string;
  designation: string;
  role?: string;
  photoUrl?: string;
  bio?: string;
  orderNumber?: number;
  createdAt?: string;
}

export interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  area: string;
  lastDonationDate?: string;
  contactNumber?: string;
  hasConsent: boolean;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface Admin {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  createdAt?: string;
}
