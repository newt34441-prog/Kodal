export interface FoundationInfo {
  name: string;
  englishName?: string;
  motto?: string;
  logoUrl?: string;
  profilePhotoUrl?: string;
  photoUpdatedAt?: string | number;
  photoUpdatedBy?: string;
  address?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  intro?: string;
  introduction?: string;
  establishedYear?: string;
  registrationNo?: string;
  bannerUrl?: string;
  aboutText?: string;
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
  village?: string;
  area?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  joiningDate?: string;
  joinDate?: string;
  photoUrl?: string;
  status?: 'active' | 'inactive' | 'pending';
  subscriptionStatus?: string;
  subscriptionType?: 'monthly' | 'yearly' | 'none' | string;
  subscriptionAmount?: number;
  monthlyPledge?: number;
  totalDonated?: number;
  facebook?: string;
  bio?: string;
  serialNo?: number;
  fatherName?: string;
  motherName?: string;
  occupation?: string;
}

export interface MemberFeePayment {
  id?: string;
  memberId: string;
  amount: number;
  date?: string;
  paymentDate?: string;
  monthYear?: string;
  paymentMethod?: string;
  transactionId?: string;
  recordedBy?: string;
  status?: string;
  notes?: string;
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
  phone?: string;
  photoUrl?: string;
  serialNo?: number;
}

export interface Executive {
  id: string;
  name: string;
  designation: string;
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
  paymentMethod: string;
  method?: string;
  transactionId: string;
  senderNumber?: string;
  fundType: string;
  status: 'pending' | 'approved' | 'rejected';
  referenceNo?: string;
  submittedAt?: string | number;
  createdAt?: string | number;
  reviewedAt?: string | number;
  reviewedBy?: string;
  rejectionReason?: string;
  donorEmail?: string;
  address?: string;
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
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  voucherNo?: string;
  recordedBy?: string;
  createdAt?: string | number;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl?: string;
  category?: string;
  status?: 'completed' | 'ongoing' | 'upcoming';
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
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | string;
  phone: string;
  contactNumber?: string;
  upazila: string;
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
