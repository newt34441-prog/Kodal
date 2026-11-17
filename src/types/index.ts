export interface FoundationInfo {
  name: string;
  englishName?: string;
  motto?: string;
  logoUrl?: string;
  profilePhotoUrl?: string;
  photoUpdatedAt?: string;
  photoUpdatedBy?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebook?: string;
  intro?: string;
  introduction?: string;
  mission?: string;
  vision?: string;
  futurePlans?: string;
  establishedYear?: string;
  establishedDate?: string;
  registrationNo?: string;
  bannerUrl?: string;
  aboutText?: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  name: string;
  englishName?: string;
  role: string;
  category?: string;
  memberType?: string;
  designation?: string;
  memberId?: string;
  registrationNo?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  village?: string;
  wardNo?: string;
  union?: string;
  upazila?: string;
  district?: string;
  area?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  joiningDate?: string;
  joinDate?: string;
  photoUrl?: string;
  status?: 'active' | 'inactive';
  subscriptionStatus?: string;
  subscriptionType?: 'monthly' | 'yearly' | 'none';
  subscriptionAmount?: number;
  monthlyPledge?: number;
  totalDonated?: number;
  facebook?: string;
  bio?: string;
  serialNo?: number;
  fatherName?: string;
  motherName?: string;
  occupation?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberFeePayment {
  id?: string;
  memberId?: string;
  memberDocId?: string;
  amount: number;
  date?: string;
  paymentDate?: string;
  monthYear?: string;
  paymentMethod?: string;
  receiptNo?: string;
  remarks?: string;
  linkedTransactionId?: string;
  transactionId?: string;
  recordedBy?: string;
  status?: string;
  notes?: string;
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

export interface Advisor {
  id: string;
  name: string;
  designation: string;
  organization?: string;
  bio?: string;
  orderNumber?: number;
  phone?: string;
  photoUrl?: string;
  serialNo?: number;
}

export interface Executive {
  id: string;
  name: string;
  designation: string;
  role?: string;
  bio?: string;
  orderNumber?: number;
  phone?: string;
  photoUrl?: string;
  serialNo?: number;
}

export interface Donation {
  id: string;
  donorName: string;
  amount: number;
  date: string;
  category?: string;
  purpose?: string;
  receiptNo?: string;
  paymentMethod?: string;
  transactionId?: string;
  phone?: string;
  notes?: string;
  anonymous?: boolean;
  verified?: boolean;
  createdAt?: string | number;
}

export interface DonationSubmission {
  id: string;
  donorName: string;
  donorPhone: string;
  amount: number;
  paymentMethod?: string;
  method?: 'bkash' | 'nagad' | string;
  recipientNumber?: string;
  transactionId: string;
  senderNumber?: string;
  fundType?: string;
  purpose?: string;
  status: 'pending' | 'approved' | 'rejected';
  referenceNo?: string;
  submittedAt?: string;
  createdAt?: string | number;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  linkedTransactionId?: string;
  linkedDonationId?: string;
  donorEmail?: string;
  address?: string;
  note?: string;
  notes?: string;
  verifiedDonationId?: string;
}

export interface PaymentSettings {
  bkashNumber?: string;
  bkashType?: string;
  bkashActive?: boolean;
  bkashAccountType?: string;
  bkashInstructions?: string;
  nagadNumber?: string;
  nagadType?: string;
  nagadActive?: boolean;
  nagadAccountType?: string;
  nagadInstructions?: string;
  rocketNumber?: string;
  rocketType?: string;
  rocketActive?: boolean;
  upayNumber?: string;
  upayType?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchName?: string;
  routingNumber?: string;
  instruction?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  title?: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  voucherNo?: string;
  sourceSubmissionId?: string;
  recordedBy?: string;
  createdAt?: string | number;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl?: string;
  photoUrl?: string;
  category?: string;
  status?: 'completed' | 'ongoing' | 'upcoming';
  isPublished?: boolean;
  location?: string;
  beneficiaries?: number;
  cost?: number;
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  category?: string;
  lastUpdated?: string;
  serialNo?: number;
  orderNumber?: number;
  isPublished?: boolean;
}

export interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  phone?: string;
  contactNumber?: string;
  upazila?: string;
  union?: string;
  area?: string;
  lastDonationDate?: string;
  isAvailable: boolean;
  hasConsent?: boolean;
  notes?: string;
  registeredAt?: string;
  gender?: string;
  age?: number;
}

export interface Headline {
  id: string;
  title: string;
  badge?: string;
  linkPath?: string;
  orderNumber?: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteAsset {
  imageUrl: string;
  altText?: string;
  updatedAt: string;
  updatedBy?: string;
  isDefault?: boolean;
}
