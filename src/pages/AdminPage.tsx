import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  Lock,
  LogOut,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  ArrowLeft,
  HeartHandshake,
  Users,
  Scale,
  CalendarCheck,
  FileText,
  Building2,
  Droplet,
  ShieldAlert,
  CreditCard,
  Settings,
  Check,
  RotateCcw,
  Clock,
  Phone,
  Search,
  Copy,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { useAuth } from '../context/AuthContext';
import {
  Donation,
  Member,
  Transaction,
  Activity,
  Policy,
  FoundationInfo,
  Advisor,
  Executive,
  BloodDonor,
  DonationSubmission,
  PaymentSettings,
} from '../types';
import { formatTaka, formatBengaliDate, toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MemberDetailModal } from '../components/members/MemberDetailModal';
import {
  approveDonationSubmission,
  rejectDonationSubmission,
  revokeApprovedDonation,
} from '../firebase/donationService';

interface AdminPageProps {
  onNavigate: (path: string) => void;
  info?: FoundationInfo | null;
}

type TabType =
  | 'submissions'
  | 'paymentSettings'
  | 'donations'
  | 'members'
  | 'accounts'
  | 'activities'
  | 'policies'
  | 'foundation'
  | 'blood'
  | 'admins';

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate, info }) => {
  const { user, isAdmin, signInWithGoogle, signOutUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('submissions');

  // Real-time collections data
  const [submissions, setSubmissions] = useState<DonationSubmission[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [bloodDonors, setBloodDonors] = useState<BloodDonor[]>([]);

  // Payment settings state from Firestore collection 'paymentSettings'
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkashNumber: '',
    bkashAccountType: 'personal',
    bkashActive: false,
    bkashInstructions: '',
    nagadNumber: '',
    nagadAccountType: 'personal',
    nagadActive: false,
    nagadInstructions: '',
  });

  // Dedicated form state for adding/editing payment settings
  const [paymentForm, setPaymentForm] = useState<PaymentSettings>({
    bkashNumber: '',
    bkashAccountType: 'personal',
    bkashActive: false,
    bkashInstructions: '',
    nagadNumber: '',
    nagadAccountType: 'personal',
    nagadActive: false,
    nagadInstructions: '',
  });
  const [isSavingPayment, setIsSavingPayment] = useState<boolean>(false);
  const [copiedPaymentKey, setCopiedPaymentKey] = useState<string | null>(null);

  // Filter for submissions
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [submissionSearch, setSubmissionSearch] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);

  // Donation direct form state
  const [donationForm, setDonationForm] = useState({
    donorName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    receiptNo: '',
  });

  // Comprehensive Member form state
  const [memberForm, setMemberForm] = useState({
    name: '',
    memberId: '',
    registrationNo: '',
    designation: '',
    category: 'সাধারণ সদস্য',
    memberType: 'সাধারণ সদস্য',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    subscriptionType: 'monthly' as 'monthly' | 'yearly' | 'none',
    subscriptionAmount: '500',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    bloodGroup: 'A+',
    occupation: '',
    phone: '',
    emergencyContact: '',
    village: 'কোদালপুর',
    wardNo: '',
    union: 'কোদালপুর',
    upazila: 'গোসাইরহাট',
    district: 'শরীয়তপুর',
    photoUrl: '',
  });

  const [adminSelectedMember, setAdminSelectedMember] = useState<Member | null>(null);

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    voucherNo: '',
  });

  // Activity form state
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    photoUrl: '',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed',
    isPublished: true,
  });

  // Policy form state
  const [policyForm, setPolicyForm] = useState({
    title: '',
    category: '',
    content: '',
    orderNumber: 1,
    isPublished: true,
  });

  // Foundation Info form state
  const [foundationForm, setFoundationForm] = useState({
    name: 'কোদালপুর মানবিক ফাউন্ডেশন',
    address: 'কোদালপুর, গোসাইরহাট, শরীয়তপুর, বাংলাদেশ।',
    establishedDate: '১ জুন ২০২৬',
    motto: '',
    introduction: '',
    mission: '',
    vision: '',
    futurePlans: '',
    logoUrl: '',
  });

  // Advisor form state
  const [advisorForm, setAdvisorForm] = useState({
    name: '',
    designation: '',
    organization: '',
    photoUrl: '',
    bio: '',
    orderNumber: 1,
  });

  // Executive form state
  const [executiveForm, setExecutiveForm] = useState({
    name: '',
    designation: '',
    role: '',
    photoUrl: '',
    bio: '',
    orderNumber: 1,
  });

  // Blood Donor form state
  const [donorForm, setDonorForm] = useState({
    name: '',
    bloodGroup: 'A+' as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
    area: '',
    lastDonationDate: '',
    contactNumber: '',
    hasConsent: true,
    isAvailable: true,
  });

  // Admin invitation form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUid, setAdminUid] = useState('');

  // Auto-fill foundation form when info updates
  useEffect(() => {
    if (info) {
      setFoundationForm({
        name: info.name || 'কোদালপুর মানবিক ফাউন্ডেশন',
        address: info.address || 'কোদালপুর, গোসাইরহাট, শরীয়তপুর, বাংলাদেশ।',
        establishedDate: info.establishedDate || '১ জুন ২০২৬',
        motto: info.motto || '',
        introduction: info.introduction || '',
        mission: info.mission || '',
        vision: info.vision || '',
        futurePlans: info.futurePlans || '',
        logoUrl: info.logoUrl || '',
      });
    }
  }, [info]);

  // Real-time listeners when admin is logged in
  useEffect(() => {
    if (!isAdmin) return;

    const unsubs = [
      // Submissions listener
      onSnapshot(collection(db, 'donationSubmissions'), (snap) => {
        const list: DonationSubmission[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DonationSubmission, 'id'>) }));
        list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
        setSubmissions(list);
      }),
      // Payment settings listener
      onSnapshot(doc(db, 'paymentSettings', 'main'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as PaymentSettings;
          setPaymentSettings(data);
          setPaymentForm(data);
        }
      }),
      // Donations listener
      onSnapshot(collection(db, 'donations'), (snap) => {
        const list: Donation[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Donation, 'id'>) }));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setDonations(list);
      }),
      // Members listener
      onSnapshot(collection(db, 'members'), (snap) => {
        const list: Member[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }));
        setMembers(list);
      }),
      // Transactions listener
      onSnapshot(collection(db, 'transactions'), (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setTransactions(list);
      }),
      // Activities listener
      onSnapshot(collection(db, 'activities'), (snap) => {
        const list: Activity[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) }));
        setActivities(list);
      }),
      // Policies listener
      onSnapshot(collection(db, 'policies'), (snap) => {
        const list: Policy[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Policy, 'id'>) }));
        list.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        setPolicies(list);
      }),
      // Advisors listener
      onSnapshot(collection(db, 'advisors'), (snap) => {
        const list: Advisor[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Advisor, 'id'>) }));
        setAdvisors(list);
      }),
      // Executives listener
      onSnapshot(collection(db, 'executives'), (snap) => {
        const list: Executive[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Executive, 'id'>) }));
        setExecutives(list);
      }),
      // Blood Donors listener
      onSnapshot(collection(db, 'bloodDonors'), (snap) => {
        const list: BloodDonor[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BloodDonor, 'id'>) }));
        setBloodDonors(list);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [isAdmin]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Helper for image upload to base64
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) {
      showFeedback('error', 'ছবির আকার ৮০০ কিলোবাইটের কম হতে হবে।');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // ==================== MANUAL SUBMISSIONS APPROVAL / REJECTION ====================
  const handleApproveSubmission = async (sub: DonationSubmission) => {
    if (!window.confirm(`রেফারেন্স ${sub.referenceNo}-এর ${formatTaka(sub.amount)} টাকার অনুদানটি কি অনুমোদন করবেন? এটি চূড়ান্ত আর্থিক আয়ে যুক্ত হবে।`)) {
      return;
    }
    setActionLoadingId(sub.id);
    try {
      await approveDonationSubmission(sub);
      showFeedback('success', `অনুদানটি (${sub.referenceNo}) সফলভাবে অনুমোদিত হয়েছে এবং আর্থিক আয়ে যুক্ত হয়েছে।`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুমোদন ব্যর্থ হয়েছে।';
      showFeedback('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmission = async (sub: DonationSubmission) => {
    const reason = window.prompt('আবেদনটি বাতিল করার কারণ লিখুন (ঐচ্ছিক):', 'টাকা প্রাপ্তির তথ্য মিল পাওয়া যায়নি।');
    if (reason === null) return;

    setActionLoadingId(sub.id);
    try {
      await rejectDonationSubmission(sub.id, reason);
      showFeedback('success', `আবেদনটি (${sub.referenceNo}) বাতিল হিসেবে চিহ্নিত করা হয়েছে।`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'বাতিল করতে সমস্যা হয়েছে।';
      showFeedback('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeSubmission = async (sub: DonationSubmission) => {
    if (!window.confirm(`সতর্কতা: ইতিপূর্বে অনুমোদিত ${sub.referenceNo} অনুদানের অনুমোদন প্রত্যাহার করতে চান? এটি আয়-ব্যয় ও অনুদান তালিকা থেকে সম্পূর্ণ অপসারিত হবে।`)) {
      return;
    }
    setActionLoadingId(sub.id);
    try {
      await revokeApprovedDonation(sub);
      showFeedback('success', `অনুমোদন সফলভাবে প্রত্যাহার করা হয়েছে এবং হিসাব সমন্বয় করা হয়েছে।`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'প্রত্যাহার ব্যর্থ হয়েছে।';
      showFeedback('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==================== PAYMENT SETTINGS HANDLERS ====================
  const handlePaymentSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayment(true);
    try {
      const payload: PaymentSettings = {
        bkashNumber: paymentForm.bkashNumber?.trim() || '',
        bkashAccountType: paymentForm.bkashAccountType || 'personal',
        bkashActive: !!paymentForm.bkashActive,
        bkashInstructions: paymentForm.bkashInstructions?.trim() || '',
        nagadNumber: paymentForm.nagadNumber?.trim() || '',
        nagadAccountType: paymentForm.nagadAccountType || 'personal',
        nagadActive: !!paymentForm.nagadActive,
        nagadInstructions: paymentForm.nagadInstructions?.trim() || '',
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'paymentSettings', 'main'), payload);
      setPaymentSettings(payload);
      showFeedback('success', "Firestore-এর 'paymentSettings' কালেকশনে বিকাশ ও নগদ সেটিংস সফলভাবে আপডেট হয়েছে।");
    } catch (err) {
      showFeedback('error', 'পেমেন্ট সেটিংস সংরক্ষণে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'paymentSettings/main');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleCopyPaymentNumber = (num: string | undefined, key: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedPaymentKey(key);
    setTimeout(() => setCopiedPaymentKey(null), 2500);
  };

  const handleResetPaymentForm = () => {
    setPaymentForm(paymentSettings);
    showFeedback('success', 'ফর্মের মানসমূহ ডেটাবেজের পূর্বাবস্থায় ফিরিয়ে নেওয়া হয়েছে।');
  };

  // Direct manual donation add
  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountNum = parseFloat(donationForm.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        showFeedback('error', 'অনুগ্রহ করে সঠিক অনুদানের পরিমাণ লিখুন');
        return;
      }
      const data: Record<string, any> = {
        donorName: donationForm.donorName.trim(),
        amount: amountNum,
        date: donationForm.date,
        purpose: donationForm.purpose.trim(),
      };
      if (donationForm.receiptNo.trim()) {
        data.receiptNo = donationForm.receiptNo.trim();
      }

      if (editingId) {
        await updateDoc(doc(db, 'donations', editingId), data);
        showFeedback('success', 'অনুদান সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        const newId = 'don_' + Date.now();
        await setDoc(doc(db, 'donations', newId), data);
        showFeedback('success', 'নতুন অনুদান সফলভাবে সংরক্ষিত হয়েছে।');
      }
      setDonationForm({ donorName: '', amount: '', date: new Date().toISOString().split('T')[0], purpose: '', receiptNo: '' });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'অনুদান সংরক্ষণ ব্যর্থ হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'donations');
    }
  };

  const resetMemberForm = () => {
    setMemberForm({
      name: '',
      memberId: '',
      registrationNo: '',
      designation: '',
      category: 'সাধারণ সদস্য',
      memberType: 'সাধারণ সদস্য',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      subscriptionType: 'monthly',
      subscriptionAmount: '500',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      bloodGroup: 'A+',
      occupation: '',
      phone: '',
      emergencyContact: '',
      village: 'কোদালপুর',
      wardNo: '',
      union: 'কোদালপুর',
      upazila: 'গোসাইরহাট',
      district: 'শরীয়তপুর',
      photoUrl: '',
    });
  };

  const handleEditMemberClick = (m: Member) => {
    setEditingId(m.id);
    setMemberForm({
      name: m.name || '',
      memberId: m.memberId || '',
      registrationNo: m.registrationNo || '',
      designation: m.designation || '',
      category: m.category || m.memberType || 'সাধারণ সদস্য',
      memberType: m.memberType || m.category || 'সাধারণ সদস্য',
      joinDate: m.joinDate || new Date().toISOString().split('T')[0],
      status: m.status || 'active',
      subscriptionType: m.subscriptionType || 'monthly',
      subscriptionAmount: m.subscriptionAmount !== undefined ? String(m.subscriptionAmount) : '500',
      fatherName: m.fatherName || '',
      motherName: m.motherName || '',
      dateOfBirth: m.dateOfBirth || '',
      bloodGroup: m.bloodGroup || 'A+',
      occupation: m.occupation || '',
      phone: m.phone || '',
      emergencyContact: m.emergencyContact || '',
      village: m.village || 'কোদালপুর',
      wardNo: m.wardNo || '',
      union: m.union || 'কোদালপুর',
      upazila: m.upazila || 'গোসাইরহাট',
      district: m.district || 'শরীয়তপুর',
      photoUrl: m.photoUrl || '',
    });
  };

  // Member Submit
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedCat = memberForm.category || memberForm.memberType || 'সাধারণ সদস্য';
      const data: Record<string, any> = {
        name: memberForm.name.trim(),
        memberId: memberForm.memberId.trim(),
        designation: memberForm.designation.trim(),
        category: selectedCat,
        memberType: memberForm.memberType.trim() || selectedCat,
        joinDate: memberForm.joinDate,
        status: memberForm.status,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'অ্যাডমিন',
      };

      if (memberForm.registrationNo.trim()) data.registrationNo = memberForm.registrationNo.trim();
      if (memberForm.memberType.trim()) data.memberType = memberForm.memberType.trim();
      if (memberForm.fatherName.trim()) data.fatherName = memberForm.fatherName.trim();
      if (memberForm.motherName.trim()) data.motherName = memberForm.motherName.trim();
      if (memberForm.dateOfBirth.trim()) data.dateOfBirth = memberForm.dateOfBirth.trim();
      if (memberForm.bloodGroup.trim()) data.bloodGroup = memberForm.bloodGroup.trim();
      if (memberForm.occupation.trim()) data.occupation = memberForm.occupation.trim();
      if (memberForm.phone.trim()) data.phone = memberForm.phone.trim();
      if (memberForm.emergencyContact.trim()) data.emergencyContact = memberForm.emergencyContact.trim();
      if (memberForm.village.trim()) data.village = memberForm.village.trim();
      if (memberForm.wardNo.trim()) data.wardNo = memberForm.wardNo.trim();
      if (memberForm.union.trim()) data.union = memberForm.union.trim();
      if (memberForm.upazila.trim()) data.upazila = memberForm.upazila.trim();
      if (memberForm.district.trim()) data.district = memberForm.district.trim();
      if (memberForm.photoUrl) data.photoUrl = memberForm.photoUrl;

      data.subscriptionType = memberForm.subscriptionType;
      const subAmt = parseFloat(memberForm.subscriptionAmount);
      data.subscriptionAmount = isNaN(subAmt) ? 0 : subAmt;

      if (editingId) {
        await updateDoc(doc(db, 'members', editingId), data);
        showFeedback('success', 'সদস্যের সম্পূর্ণ তথ্য ও চাঁদার হার সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        const newId = 'mem_' + Date.now();
        data.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'members', newId), data);
        showFeedback('success', 'নতুন সদস্য সফলভাবে নিবন্ধিত হয়েছে।');
      }
      resetMemberForm();
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'সদস্যের তথ্য সংরক্ষণে ত্রুটি।');
      handleFirestoreError(err, OperationType.WRITE, 'members');
    }
  };

  // Transaction Submit
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountNum = parseFloat(transactionForm.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        showFeedback('error', 'অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।');
        return;
      }
      const data: Record<string, any> = {
        type: transactionForm.type,
        category: transactionForm.category.trim(),
        amount: amountNum,
        date: transactionForm.date,
        description: transactionForm.description.trim(),
      };
      if (transactionForm.voucherNo.trim()) {
        data.voucherNo = transactionForm.voucherNo.trim();
      }

      if (editingId) {
        await updateDoc(doc(db, 'transactions', editingId), data);
        showFeedback('success', 'হিসাবের লেনদেন সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        const newId = 'tx_' + Date.now();
        await setDoc(doc(db, 'transactions', newId), data);
        showFeedback('success', 'নতুন লেনদেন রেকর্ড সফলভাবে সংরক্ষিত হয়েছে।');
      }
      setTransactionForm({ type: 'income', category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', voucherNo: '' });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'হিসাব সংরক্ষণ ব্যর্থ হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    }
  };

  // Activity Submit
  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = {
        title: activityForm.title.trim(),
        date: activityForm.date,
        location: activityForm.location.trim(),
        description: activityForm.description.trim(),
        status: activityForm.status,
        isPublished: activityForm.isPublished,
      };
      if (activityForm.photoUrl) {
        data.photoUrl = activityForm.photoUrl;
      }

      if (editingId) {
        await updateDoc(doc(db, 'activities', editingId), data);
        showFeedback('success', 'কার্যক্রম সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        const newId = 'act_' + Date.now();
        await setDoc(doc(db, 'activities', newId), data);
        showFeedback('success', 'নতুন কার্যক্রম সফলভাবে যোগ করা হয়েছে।');
      }
      setActivityForm({ title: '', date: new Date().toISOString().split('T')[0], location: '', description: '', photoUrl: '', status: 'upcoming', isPublished: true });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'কার্যক্রম সংরক্ষণে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    }
  };

  // Policy Submit
  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = {
        title: policyForm.title.trim(),
        content: policyForm.content.trim(),
        orderNumber: Number(policyForm.orderNumber) || 1,
        isPublished: policyForm.isPublished,
      };
      if (policyForm.category.trim()) {
        data.category = policyForm.category.trim();
      }

      if (editingId) {
        await updateDoc(doc(db, 'policies', editingId), data);
        showFeedback('success', 'নীতিমালা সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        const newId = 'pol_' + Date.now();
        await setDoc(doc(db, 'policies', newId), data);
        showFeedback('success', 'নতুন নীতিমালা সংরক্ষিত হয়েছে।');
      }
      setPolicyForm({ title: '', category: '', content: '', orderNumber: policies.length + 1, isPublished: true });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'নীতিমালা সংরক্ষণ ব্যর্থ হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'policies');
    }
  };

  // Foundation Info & Logo Submit
  const handleFoundationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = {
        name: foundationForm.name.trim(),
        address: foundationForm.address.trim(),
        establishedDate: foundationForm.establishedDate.trim(),
      };
      if (foundationForm.motto.trim()) data.motto = foundationForm.motto.trim();
      if (foundationForm.introduction.trim()) data.introduction = foundationForm.introduction.trim();
      if (foundationForm.mission.trim()) data.mission = foundationForm.mission.trim();
      if (foundationForm.vision.trim()) data.vision = foundationForm.vision.trim();
      if (foundationForm.futurePlans.trim()) data.futurePlans = foundationForm.futurePlans.trim();
      if (foundationForm.logoUrl) data.logoUrl = foundationForm.logoUrl;

      await setDoc(doc(db, 'foundationInfo', 'main'), data);
      showFeedback('success', 'প্রতিষ্ঠানের পরিচিতি ও লোগো সফলভাবে সংরক্ষিত হয়েছে।');
    } catch (err) {
      showFeedback('error', 'প্রতিষ্ঠানের তথ্য সংরক্ষণে ত্রুটি।');
      handleFirestoreError(err, OperationType.WRITE, 'foundationInfo');
    }
  };

  // Executive & Advisor Submit
  const handleExecutiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = {
        name: executiveForm.name.trim(),
        designation: executiveForm.designation.trim(),
      };
      if (executiveForm.role.trim()) data.role = executiveForm.role.trim();
      if (executiveForm.photoUrl) data.photoUrl = executiveForm.photoUrl;
      if (executiveForm.bio.trim()) data.bio = executiveForm.bio.trim();
      data.orderNumber = Number(executiveForm.orderNumber) || 1;

      if (editingId) {
        await updateDoc(doc(db, 'executives', editingId), data);
        showFeedback('success', 'দায়িত্বশীল ব্যক্তির তথ্য হালনাগাদ হয়েছে।');
      } else {
        const newId = 'exec_' + Date.now();
        await setDoc(doc(db, 'executives', newId), data);
        showFeedback('success', 'নতুন দায়িত্বশীল ব্যক্তি যুক্ত করা হয়েছে।');
      }
      setExecutiveForm({ name: '', designation: '', role: '', photoUrl: '', bio: '', orderNumber: 1 });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'তথ্য সংরক্ষণে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'executives');
    }
  };

  const handleAdvisorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = {
        name: advisorForm.name.trim(),
        designation: advisorForm.designation.trim(),
      };
      if (advisorForm.organization.trim()) data.organization = advisorForm.organization.trim();
      if (advisorForm.photoUrl) data.photoUrl = advisorForm.photoUrl;
      if (advisorForm.bio.trim()) data.bio = advisorForm.bio.trim();
      data.orderNumber = Number(advisorForm.orderNumber) || 1;

      if (editingId) {
        await updateDoc(doc(db, 'advisors', editingId), data);
        showFeedback('success', 'উপদেষ্টার তথ্য হালনাগাদ হয়েছে।');
      } else {
        const newId = 'adv_' + Date.now();
        await setDoc(doc(db, 'advisors', newId), data);
        showFeedback('success', 'নতুন উপদেষ্টা যুক্ত করা হয়েছে।');
      }
      setAdvisorForm({ name: '', designation: '', organization: '', photoUrl: '', bio: '', orderNumber: 1 });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'উপদেষ্টার তথ্য সংরক্ষণে ত্রুটি।');
      handleFirestoreError(err, OperationType.WRITE, 'advisors');
    }
  };

  // Blood Donor Submit
  const handleBloodDonorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = {
        name: donorForm.name.trim(),
        bloodGroup: donorForm.bloodGroup,
        area: donorForm.area.trim(),
        hasConsent: donorForm.hasConsent,
        isAvailable: donorForm.isAvailable,
      };
      if (donorForm.lastDonationDate.trim()) data.lastDonationDate = donorForm.lastDonationDate.trim();
      if (donorForm.contactNumber.trim()) data.contactNumber = donorForm.contactNumber.trim();

      if (editingId) {
        await updateDoc(doc(db, 'bloodDonors', editingId), data);
        showFeedback('success', 'রক্তদাতার তথ্য সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        const newId = 'donor_' + Date.now();
        await setDoc(doc(db, 'bloodDonors', newId), data);
        showFeedback('success', 'নতুন রক্তদাতা যুক্ত করা হয়েছে।');
      }
      setDonorForm({ name: '', bloodGroup: 'A+', area: '', lastDonationDate: '', contactNumber: '', hasConsent: true, isAvailable: true });
      setEditingId(null);
    } catch (err) {
      showFeedback('error', 'রক্তদাতার তথ্য সংরক্ষণে ত্রুটি।');
      handleFirestoreError(err, OperationType.WRITE, 'bloodDonors');
    }
  };

  // Admin invite
  const handleAdminAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!adminUid.trim() || !adminEmail.trim()) {
        showFeedback('error', 'অনুগ্রহ করে অ্যাডমিনের UID এবং ইমেইল দুটোই প্রদান করুন।');
        return;
      }
      await setDoc(doc(db, 'admins', adminUid.trim()), {
        email: adminEmail.trim(),
        role: 'admin',
      });
      showFeedback('success', 'নতুন অ্যাডমিন সফলভাবে অনুমোদিত হয়েছে।');
      setAdminEmail('');
      setAdminUid('');
    } catch (err) {
      showFeedback('error', 'অ্যাডমিন যুক্ত করতে ব্যর্থ হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, 'admins');
    }
  };

  // Deletion helper with prompt confirmation
  const confirmAndDelete = async (collectionName: string, id: string, label: string) => {
    const isFinancial = collectionName === 'transactions' || collectionName === 'donations';
    const message = isFinancial
      ? `সতর্কতা: এটি একটি আর্থিক রেকর্ড (${label})। মুছে ফেলার পর আয়-ব্যয়ের হিসাব পুনরায় গণনা হবে। আপনি কি নিশ্চিত?`
      : `আপনি কি নিশ্চিতভাবে "${label}" মুছে ফেলতে চান?`;

    if (window.confirm(message)) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        showFeedback('success', `"${label}" সফলভাবে মুছে ফেলা হয়েছে।`);
      } catch (err) {
        showFeedback('error', 'মুছে ফেলতে ব্যর্থ হয়েছে।');
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      }
    }
  };

  // Filtered submissions
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const filteredSubmissions = submissions.filter((s) => {
    const matchesStatus = submissionStatusFilter === 'all' || s.status === submissionStatusFilter;
    const matchesSearch =
      s.referenceNo.toLowerCase().includes(submissionSearch.toLowerCase()) ||
      s.donorName.toLowerCase().includes(submissionSearch.toLowerCase()) ||
      s.donorPhone.toLowerCase().includes(submissionSearch.toLowerCase()) ||
      s.transactionId.toLowerCase().includes(submissionSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Login view if not logged in
  if (authLoading) {
    return <LoadingSpinner text="প্রবেশাধিকার যাচাই করা হচ্ছে..." />;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-950 border border-blue-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-blue-950 mb-2">অ্যাডমিন প্রবেশ</h2>
          <p className="text-sm text-slate-600 mb-6">
            কোদালপুর মানবিক ফাউন্ডেশন ব্যবস্থাপনায় প্রবেশ করতে আপনার অনুমোদিত গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
          </p>
          <button
            onClick={() => signInWithGoogle()}
            className="w-full py-3 px-4 rounded-xl bg-blue-950 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-900 transition-colors cursor-pointer shadow-xs"
          >
            <Lock className="w-4 h-4" />
            <span>গুগল অ্যাকাউন্ট দিয়ে লগইন</span>
          </button>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('/')}
              className="text-xs font-semibold text-slate-500 hover:text-blue-950 cursor-pointer"
            >
              ← সাধারণ ওয়েবসাইটে ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not authorized view
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">অনুমোদন নেই</h2>
          <p className="text-sm text-slate-600 mb-2">
            আপনার লগইনকৃত ইমেইল: <span className="font-semibold text-slate-800">{user.email}</span>
          </p>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            এই অ্যাকাউন্টটি অ্যাডমিন হিসেবে তালিকাভুক্ত নয়। ফাউন্ডেশনের ডেটাবেজ ও আর্থিক নিরাপত্তা রক্ষার্থে শুধুমাত্র অনুমোদিত ব্যক্তিবর্গ পরিবর্তন করতে পারেন।
          </p>
          <div className="space-y-2">
            <button
              onClick={() => signOutUser()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              লগআউট করুন
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-950 text-white font-semibold text-xs hover:bg-blue-900 transition-colors cursor-pointer"
            >
              ওয়েবসাইটে ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-950 mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>মূল ওয়েবসাইটে দেখুন</span>
          </button>
          <h2 className="text-2xl font-black text-blue-950">ফাউন্ডেশন অ্যাডমিন ড্যাশবোর্ড</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            লগইনকৃত অ্যাডমিন: <span className="font-medium text-emerald-700">{user.email}</span>
          </p>
        </div>

        <button
          onClick={() => signOutUser()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>লগআউট</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl mb-6 text-sm flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => { setActiveTab('submissions'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'submissions' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>পেমেন্ট যাচাই</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black">
              {toBengaliNumber(pendingCount)}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('paymentSettings'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'paymentSettings' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 text-blue-600" />
          <span>বিকাশ ও নগদ সেটিংস</span>
          {(paymentSettings.bkashActive || paymentSettings.nagadActive) ? (
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
              সক্রিয়
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-full text-[10px]">
              বন্ধ
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('donations'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'donations' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-teal-600" />
          <span>অনুমোদিত অনুদান ({toBengaliNumber(donations.length)})</span>
        </button>

        <button
          onClick={() => { setActiveTab('accounts'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'accounts' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>আয়-ব্যয় ({toBengaliNumber(transactions.length)})</span>
        </button>

        <button
          onClick={() => { setActiveTab('members'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'members' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>সদস্য ({toBengaliNumber(members.length)})</span>
        </button>

        <button
          onClick={() => { setActiveTab('activities'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'activities' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-teal-600" />
          <span>কার্যক্রম ({toBengaliNumber(activities.length)})</span>
        </button>

        <button
          onClick={() => { setActiveTab('policies'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'policies' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-600" />
          <span>নীতিমালা ({toBengaliNumber(policies.length)})</span>
        </button>

        <button
          onClick={() => { setActiveTab('foundation'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'foundation' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-950" />
          <span>পরিচিতি ও লোগো</span>
        </button>

        <button
          onClick={() => { setActiveTab('blood'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'blood' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Droplet className="w-4 h-4 text-rose-600" />
          <span>রক্তদাতা ({toBengaliNumber(bloodDonors.length)})</span>
        </button>

        <button
          onClick={() => { setActiveTab('admins'); setEditingId(null); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'admins' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-600" />
          <span>অ্যাডমিন অনুমতি</span>
        </button>
      </div>

      {/* ==================== TAB: SUBMISSIONS VERIFICATION ==================== */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">অনলাইন অনুদান আবেদন যাচাই ও অনুমোদন</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                বিকাশ ও নগদে পাঠানো অনুদানকারীর TrxID যাচাই করে অনুমোদন বা বাতিল করুন
              </p>
            </div>

            {/* Quick Payment Settings Info Card */}
            <div className="w-full bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Firestore 'paymentSettings' লাইভ নম্বর:</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono border border-emerald-500/30">
                      paymentSettings/main
                    </span>
                  </div>
                  <div className="text-slate-300 flex items-center gap-2 flex-wrap">
                    <span>
                      বিকাশ:{' '}
                      {paymentSettings.bkashNumber ? (
                        <span className="font-mono font-bold text-rose-300">
                          {paymentSettings.bkashNumber} ({paymentSettings.bkashActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'})
                        </span>
                      ) : (
                        <span className="text-slate-400">নির্ধারিত নেই</span>
                      )}
                    </span>
                    <span>|</span>
                    <span>
                      নগদ:{' '}
                      {paymentSettings.nagadNumber ? (
                        <span className="font-mono font-bold text-orange-300">
                          {paymentSettings.nagadNumber} ({paymentSettings.nagadActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'})
                        </span>
                      ) : (
                        <span className="text-slate-400">নির্ধারিত নেই</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('paymentSettings')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white text-blue-950 hover:bg-blue-50 transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-blue-900" />
                <span>নম্বর যোগ বা পরিবর্তন করুন →</span>
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setSubmissionStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                  submissionStatusFilter === 'all'
                    ? 'bg-blue-950 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                সকল ({toBengaliNumber(submissions.length)})
              </button>
              <button
                onClick={() => setSubmissionStatusFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                  submissionStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                অপেক্ষমাণ ({toBengaliNumber(submissions.filter((s) => s.status === 'pending').length)})
              </button>
              <button
                onClick={() => setSubmissionStatusFilter('approved')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                  submissionStatusFilter === 'approved'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                অনুমোদিত ({toBengaliNumber(submissions.filter((s) => s.status === 'approved').length)})
              </button>
              <button
                onClick={() => setSubmissionStatusFilter('rejected')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                  submissionStatusFilter === 'rejected'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                বাতিল ({toBengaliNumber(submissions.filter((s) => s.status === 'rejected').length)})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="রেফারেন্স নম্বর, দাতার নাম, মোবাইল অথবা TrxID দিয়ে খুঁজুন..."
              value={submissionSearch}
              onChange={(e) => setSubmissionSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500">
              <Clock className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">কোনো অনুদানের আবেদন পাওয়া যায়নি।</p>
              <p className="text-xs text-slate-400 mt-0.5">নতুন আবেদন জমা হলে এখানে সরাসরি প্রদর্শিত হবে।</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((sub) => {
                const isPending = sub.status === 'pending';
                const isApproved = sub.status === 'approved';
                const isRejected = sub.status === 'rejected';

                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                      isPending
                        ? 'border-amber-300 ring-2 ring-amber-400/10'
                        : isApproved
                        ? 'border-emerald-200'
                        : 'border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Donor & Payment Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {sub.referenceNo}
                          </span>

                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                              sub.method === 'bkash'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}
                          >
                            {sub.method === 'bkash' ? 'বিকাশ' : 'নগদ'}
                          </span>

                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : isApproved
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isPending ? 'যাচাই অপেক্ষমাণ' : isApproved ? 'অনুমোদিত ও আয়ভুক্ত' : 'বাতিলকৃত'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <h4 className="text-base font-bold text-slate-900">{sub.donorName}</h4>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {sub.donorPhone}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                          <p>
                            <span className="text-slate-400">Transaction ID:</span>{' '}
                            <strong className="font-mono text-blue-950 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              {sub.transactionId}
                            </strong>
                          </p>
                          <p>
                            <span className="text-slate-400">প্রাপক অ্যাকাউন্ট:</span>{' '}
                            <span className="font-mono text-slate-700">{sub.recipientNumber}</span>
                          </p>
                          <p>
                            <span className="text-slate-400">অনুদানের উদ্দেশ্য:</span> {sub.purpose}
                          </p>
                          <p>
                            <span className="text-slate-400">আবেদনের সময়:</span> {sub.submittedAt.slice(0, 16).replace('T', ' ')}
                          </p>
                        </div>

                        {sub.note && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                            মন্তব্য: {sub.note}
                          </p>
                        )}

                        {sub.rejectionReason && (
                          <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                            বাতিলের কারণ: {sub.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="lg:text-right">
                          <span className="text-xl sm:text-2xl font-black text-emerald-700">
                            {formatTaka(sub.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                disabled={actionLoadingId === sub.id}
                                onClick={() => handleApproveSubmission(sub)}
                                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>অনুমোদন করুন</span>
                              </button>

                              <button
                                disabled={actionLoadingId === sub.id}
                                onClick={() => handleRejectSubmission(sub)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                <span>বাতিল</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              disabled={actionLoadingId === sub.id}
                              onClick={() => handleRevokeSubmission(sub)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                              title="পূর্বের অনুমোদন প্রত্যাহার ও হিসাব থেকে বাদ দিন"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>প্রত্যাহার</span>
                            </button>
                          )}

                          <button
                            onClick={() => confirmAndDelete('donationSubmissions', sub.id, sub.referenceNo)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="রেকর্ড মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: PAYMENT SETTINGS ('paymentSettings' collection) ==================== */}
      {activeTab === 'paymentSettings' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-950 text-white flex items-center justify-center shadow-xs shrink-0">
                <CreditCard className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-950">বিকাশ ও নগদ পেমেন্ট সেটিংস</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Firestore-এর <code className="font-mono bg-blue-50 text-blue-900 font-bold px-1.5 py-0.5 rounded border border-blue-200">'paymentSettings'</code> কালেকশনে সরাসরি সংরক্ষিত ও পরিচালিত
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700 border border-slate-200 flex items-center gap-1.5 font-mono">
                <Settings className="w-3.5 h-3.5 text-blue-900" />
                <span>Doc: paymentSettings/main</span>
              </span>
            </div>
          </div>

          {/* SECTION 1: CURRENT FIRESTORE DATA DISPLAY CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-900"></span>
                <span>বর্তমানে ডেটাবেজে সংরক্ষিত পেমেন্ট তথ্য ('paymentSettings' কালেকশন)</span>
              </h4>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                লাইভ সিঙ্ক চালু
              </span>
            </div>

            {/* Display empty warning if neither number is set */}
            {!paymentSettings.bkashNumber && !paymentSettings.nagadNumber && (
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Firestore-এ এখনও কোনো বিকাশ বা নগদ নম্বর সংরক্ষণ করা হয়নি।</p>
                  <p className="text-amber-700 mt-0.5">
                    নিচের ফর্ম ব্যবহার করে আপনার প্রতিষ্ঠানের বিকাশ ও নগদ নম্বর যুক্ত করুন এবং সংরক্ষণ করুন।
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* bKash Display Card */}
              <div className="bg-white rounded-2xl border-2 border-rose-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                      <h5 className="font-bold text-rose-950 text-base">বিকাশ (bKash) অ্যাকাউন্ট</h5>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        paymentSettings.bkashActive && paymentSettings.bkashNumber
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {paymentSettings.bkashActive && paymentSettings.bkashNumber ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় / বন্ধ'}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">সংরক্ষিত বিকাশ নম্বর:</span>
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-lg font-mono font-black text-slate-900 tracking-wider">
                          {paymentSettings.bkashNumber || 'কোনো নম্বর সেট করা নেই'}
                        </span>
                        {paymentSettings.bkashNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentNumber(paymentSettings.bkashNumber, 'bkash')}
                            className="p-1.5 text-slate-500 hover:text-blue-950 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="নম্বরটি কপি করুন"
                          >
                            {copiedPaymentKey === 'bkash' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">কপি হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                <span>কপি</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400">অ্যাকাউন্টের ধরন:</span>
                      <span className="font-bold text-slate-800 bg-rose-50 text-rose-950 px-2 py-0.5 rounded border border-rose-100">
                        {paymentSettings.bkashAccountType === 'merchant'
                          ? 'মার্চেন্ট একাউন্ট (Make Payment)'
                          : 'ব্যক্তিগত একাউন্ট (Personal - Send Money)'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block mb-1">প্রদর্শিত নির্দেশনা:</span>
                      <p className="text-slate-700 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 leading-relaxed text-[11px]">
                        {paymentSettings.bkashInstructions ||
                          (paymentSettings.bkashAccountType === 'merchant'
                            ? 'বিকাশ অ্যাপ থেকে "পেমেন্ট" অপশনে নম্বরটি দিয়ে অনুদানের টাকা পাঠাবেন।'
                            : 'বিকাশ অ্যাপ বা ডায়াল করে "সেন্ড মানি" অপশনে অনুদানের টাকা পাঠাবেন।')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-rose-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {paymentSettings.updatedAt ? `আপডেট: ${formatBengaliDate(paymentSettings.updatedAt)}` : 'ডিফল্ট মান'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm((prev) => ({
                        ...prev,
                        bkashNumber: paymentSettings.bkashNumber,
                        bkashAccountType: paymentSettings.bkashAccountType,
                        bkashActive: paymentSettings.bkashActive,
                        bkashInstructions: paymentSettings.bkashInstructions,
                      }));
                    }}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>ফর্মে এই তথ্য আনুন</span>
                  </button>
                </div>
              </div>

              {/* Nagad Display Card */}
              <div className="bg-white rounded-2xl border-2 border-orange-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-orange-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-600"></span>
                      <h5 className="font-bold text-orange-950 text-base">নগদ (Nagad) অ্যাকাউন্ট</h5>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        paymentSettings.nagadActive && paymentSettings.nagadNumber
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {paymentSettings.nagadActive && paymentSettings.nagadNumber ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় / বন্ধ'}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">সংরক্ষিত নগদ নম্বর:</span>
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-lg font-mono font-black text-slate-900 tracking-wider">
                          {paymentSettings.nagadNumber || 'কোনো নম্বর সেট করা নেই'}
                        </span>
                        {paymentSettings.nagadNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentNumber(paymentSettings.nagadNumber, 'nagad')}
                            className="p-1.5 text-slate-500 hover:text-blue-950 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="নম্বরটি কপি করুন"
                          >
                            {copiedPaymentKey === 'nagad' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">কপি হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                <span>কপি</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400">অ্যাকাউন্টের ধরন:</span>
                      <span className="font-bold text-slate-800 bg-orange-50 text-orange-950 px-2 py-0.5 rounded border border-orange-100">
                        {paymentSettings.nagadAccountType === 'merchant'
                          ? 'মার্চেন্ট একাউন্ট (Payment)'
                          : 'ব্যক্তিগত একাউন্ট (Personal - Send Money)'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block mb-1">প্রদর্শিত নির্দেশনা:</span>
                      <p className="text-slate-700 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100 leading-relaxed text-[11px]">
                        {paymentSettings.nagadInstructions ||
                          (paymentSettings.nagadAccountType === 'merchant'
                            ? 'নগদ অ্যাপ থেকে "পেমেন্ট" অপশনে নম্বরটি দিয়ে অনুদানের টাকা পাঠাবেন।'
                            : 'নগদ অ্যাপ বা ডায়াল করে "সেন্ড মানি" অপশনে অনুদানের টাকা পাঠাবেন।')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-orange-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {paymentSettings.updatedAt ? `আপডেট: ${formatBengaliDate(paymentSettings.updatedAt)}` : 'ডিফল্ট মান'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm((prev) => ({
                        ...prev,
                        nagadNumber: paymentSettings.nagadNumber,
                        nagadAccountType: paymentSettings.nagadAccountType,
                        nagadActive: paymentSettings.nagadActive,
                        nagadInstructions: paymentSettings.nagadInstructions,
                      }));
                    }}
                    className="text-xs font-bold text-orange-700 hover:text-orange-900 cursor-pointer flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>ফর্মে এই তথ্য আনুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ADD / UPDATE FORM */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs">
            <div className="pb-4 mb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-900" />
                  <span>বিকাশ ও নগদ নম্বর যোগ ও পরিবর্তনের ফর্ম</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  নিচের ফিল্ডে নম্বর, অ্যাকাউন্টের ধরন ও নির্দেশাবলী লিখুন এবং সংরক্ষণ করুন।
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetPaymentForm}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>সংরক্ষিত অবস্থায় রিসেট</span>
              </button>
            </div>

            <form onSubmit={handlePaymentSettingsSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* bKash Edit Fields */}
                <div className="p-5 rounded-2xl bg-rose-50/40 border-2 border-rose-200/80 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                      <h5 className="font-bold text-rose-950 text-sm">বিকাশ ফিল্ডসমূহ</h5>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-900 bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={paymentForm.bkashActive}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, bkashActive: e.target.checked })
                        }
                        className="w-4 h-4 text-rose-600 rounded cursor-pointer accent-rose-600"
                      />
                      <span>{paymentForm.bkashActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিকাশ নম্বর *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bkashNumber || ''}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, bkashNumber: e.target.value })
                      }
                      placeholder="যেমন: 017xxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">অনুদানকারী এই নম্বরে বিকাশ করবেন।</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      অ্যাকাউন্টের ধরন *
                    </label>
                    <select
                      value={paymentForm.bkashAccountType || 'personal'}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          bkashAccountType: e.target.value as 'personal' | 'merchant',
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="personal">ব্যক্তিগত একাউন্ট (Personal - Send Money)</option>
                      <option value="merchant">মার্চেন্ট একাউন্ট (Merchant - Make Payment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিশেষ নির্দেশাবলী (ঐচ্ছিক)
                    </label>
                    <textarea
                      rows={3}
                      value={paymentForm.bkashInstructions || ''}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, bkashInstructions: e.target.value })
                      }
                      placeholder="যেমন: রেফারেন্সে অবশ্যই আপনার নাম বা রেফ নং লিখবেন..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Nagad Edit Fields */}
                <div className="p-5 rounded-2xl bg-orange-50/40 border-2 border-orange-200/80 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-orange-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                      <h5 className="font-bold text-orange-950 text-sm">নগদ ফিল্ডসমূহ</h5>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-orange-950 bg-white px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={paymentForm.nagadActive}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, nagadActive: e.target.checked })
                        }
                        className="w-4 h-4 text-orange-600 rounded cursor-pointer accent-orange-600"
                      />
                      <span>{paymentForm.nagadActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      নগদ নম্বর *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.nagadNumber || ''}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, nagadNumber: e.target.value })
                      }
                      placeholder="যেমন: 018xxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">অনুদানকারী এই নম্বরে নগদ করবেন।</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      অ্যাকাউন্টের ধরন *
                    </label>
                    <select
                      value={paymentForm.nagadAccountType || 'personal'}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          nagadAccountType: e.target.value as 'personal' | 'merchant',
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      <option value="personal">ব্যক্তিগত একাউন্ট (Personal - Send Money)</option>
                      <option value="merchant">মার্চেন্ট একাউন্ট (Merchant - Make Payment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিশেষ নির্দেশাবলী (ঐচ্ছিক)
                    </label>
                    <textarea
                      rows={3}
                      value={paymentForm.nagadInstructions || ''}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, nagadInstructions: e.target.value })
                      }
                      placeholder="যেমন: ক্যাশ-ইন নয়, শুধুমাত্র সেন্ড মানি করবেন..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  * পরিবর্তন সংরক্ষণ করার সাথে সাথেই জনসাধারণের অনুদান পেজে লাইভ নম্বর কার্যকর হবে।
                </p>
                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSavingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Firestore-এ সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Firestore 'paymentSettings' কালেকশনে সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TAB: DIRECT DONATIONS ==================== */}
      {activeTab === 'donations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <h3 className="font-bold text-slate-900 text-lg mb-4">
              {editingId ? 'অনুদান সম্পাদনা' : 'সরাসরি অনুদান এন্ট্রি'}
            </h3>
            <form onSubmit={handleDonationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">অনুদানকারীর নাম *</label>
                <input
                  type="text"
                  required
                  value={donationForm.donorName}
                  onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })}
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={donationForm.amount}
                  onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                  placeholder="যেমন: ৫০০০"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                <input
                  type="date"
                  required
                  value={donationForm.date}
                  onChange={(e) => setDonationForm({ ...donationForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">অনুদানের উদ্দেশ্য / বিবরণ *</label>
                <input
                  type="text"
                  required
                  value={donationForm.purpose}
                  onChange={(e) => setDonationForm({ ...donationForm, purpose: e.target.value })}
                  placeholder="যেমন: শীতবস্ত্র তহবিল / সাধারণ তহবিল"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">রসিদ নম্বর (যদি থাকে)</label>
                <input
                  type="text"
                  value={donationForm.receiptNo}
                  onChange={(e) => setDonationForm({ ...donationForm, receiptNo: e.target.value })}
                  placeholder="যেমন: REC-102"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  {editingId ? 'হালনাগাদ করুন' : 'সংরক্ষণ করুন'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDonationForm({ donorName: '', amount: '', date: new Date().toISOString().split('T')[0], purpose: '', receiptNo: '' });
                    }}
                    className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    বাতিল
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 text-lg mb-2">সংরক্ষিত অনুদানের তালিকা</h3>
            {donations.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                এখনও কোনো অনুদান যুক্ত করা হয়নি।
              </p>
            ) : (
              donations.map((d) => (
                <div
                  key={d.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{d.donorName}</h4>
                      {d.receiptNo && (
                        <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                          #{d.receiptNo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{d.purpose}</p>
                    <p className="text-[11px] text-slate-400">তারিখ: {d.date}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-emerald-700 text-base">{formatTaka(d.amount)}</span>
                    <button
                      onClick={() => {
                        setEditingId(d.id);
                        setDonationForm({
                          donorName: d.donorName,
                          amount: d.amount.toString(),
                          date: d.date,
                          purpose: d.purpose,
                          receiptNo: d.receiptNo || '',
                        });
                      }}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmAndDelete('donations', d.id, `${d.donorName} - ${formatTaka(d.amount)}`)}
                      className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: MEMBERS ==================== */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Comprehensive Member Registration & Edit Form */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {editingId ? 'সদস্যের তথ্য সম্পাদনা' : 'নতুন সদস্য নিবন্ধন'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    সদস্যের ব্যক্তিগত, ঠিকানা ও চাঁদার হার সংক্রান্ত পূর্ণাঙ্গ তথ্য
                  </p>
                </div>
                {editingId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                    এডিটিং মোড
                  </span>
                )}
              </div>

              <form onSubmit={handleMemberSubmit} className="space-y-5">
                {/* 1. Identity & Foundation Info */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                    ১. প্রাতিষ্ঠানিক তথ্য
                  </span>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের পূর্ণ নাম *</label>
                    <input
                      type="text"
                      required
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                      placeholder="যেমন: মোঃ কামরুল হাসান"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্য আইডি *</label>
                      <input
                        type="text"
                        required
                        value={memberForm.memberId}
                        onChange={(e) => setMemberForm({ ...memberForm, memberId: e.target.value })}
                        placeholder="যেমন: KHF-001"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">নিবন্ধন নম্বর</label>
                      <input
                        type="text"
                        value={memberForm.registrationNo}
                        onChange={(e) => setMemberForm({ ...memberForm, registrationNo: e.target.value })}
                        placeholder="যেমন: REG-2026-12"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পদবি / দায়িত্ব *</label>
                      <input
                        type="text"
                        required
                        value={memberForm.designation}
                        onChange={(e) => setMemberForm({ ...memberForm, designation: e.target.value })}
                        placeholder="যেমন: সাধারণ সদস্য"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        সদস্য ক্যাটাগরি (পরিষদ / বিভাগ) *
                      </label>
                      <select
                        value={memberForm.category || memberForm.memberType}
                        onChange={(e) => setMemberForm({ ...memberForm, category: e.target.value, memberType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900 bg-white"
                      >
                        <option value="উপদেষ্টা পরিষদ">উপদেষ্টা পরিষদ</option>
                        <option value="কার্যনির্বাহী পরিষদ">কার্যনির্বাহী পরিষদ</option>
                        <option value="সাধারণ সদস্য">সাধারণ সদস্য</option>
                        <option value="সম্মানিত সদস্য">সম্মানিত সদস্য</option>
                        <option value="দাতা সদস্য">দাতা সদস্য</option>
                        <option value="আজীবন সদস্য">আজীবন সদস্য</option>
                        <option value="প্রতিষ্ঠাতা সদস্য">প্রতিষ্ঠাতা সদস্য</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">যোগদানের তারিখ *</label>
                      <input
                        type="date"
                        required
                        value={memberForm.joinDate}
                        onChange={(e) => setMemberForm({ ...memberForm, joinDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">বর্তমান অবস্থা *</label>
                      <select
                        value={memberForm.status}
                        onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      >
                        <option value="active">সক্রিয় (Active)</option>
                        <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Subscription Settings */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                    ২. চাঁদার হার ও চক্র নির্ধারণ
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">চাঁদার ধরন / চক্র *</label>
                      <select
                        value={memberForm.subscriptionType}
                        onChange={(e) =>
                          setMemberForm({
                            ...memberForm,
                            subscriptionType: e.target.value as 'monthly' | 'yearly' | 'none',
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-900"
                      >
                        <option value="monthly">মাসিক চাঁদা</option>
                        <option value="yearly">বার্ষিক চাঁদা</option>
                        <option value="none">চাঁদা প্রযোজ্য নয়</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">নির্ধারিত পরিমাণ (৳) *</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={memberForm.subscriptionAmount}
                        onChange={(e) => setMemberForm({ ...memberForm, subscriptionAmount: e.target.value })}
                        placeholder="যেমন: 500"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Personal & Contact Info */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                    ৩. ব্যক্তিগত তথ্য (গোপনীয়)
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পিতার নাম</label>
                      <input
                        type="text"
                        value={memberForm.fatherName}
                        onChange={(e) => setMemberForm({ ...memberForm, fatherName: e.target.value })}
                        placeholder="পিতার নাম"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">মাতার নাম</label>
                      <input
                        type="text"
                        value={memberForm.motherName}
                        onChange={(e) => setMemberForm({ ...memberForm, motherName: e.target.value })}
                        placeholder="মাতার নাম"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">জন্মতারিখ</label>
                      <input
                        type="date"
                        value={memberForm.dateOfBirth}
                        onChange={(e) => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">রক্তের গ্রুপ</label>
                      <select
                        value={memberForm.bloodGroup}
                        onChange={(e) => setMemberForm({ ...memberForm, bloodGroup: e.target.value })}
                        className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পেশা</label>
                      <input
                        type="text"
                        value={memberForm.occupation}
                        onChange={(e) => setMemberForm({ ...memberForm, occupation: e.target.value })}
                        placeholder="যেমন: ব্যবসা"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                      <input
                        type="text"
                        value={memberForm.phone}
                        onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                        placeholder="যেমন: 017xxxxxxxx"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">জরুরি যোগাযোগ</label>
                      <input
                        type="text"
                        value={memberForm.emergencyContact}
                        onChange={(e) => setMemberForm({ ...memberForm, emergencyContact: e.target.value })}
                        placeholder="যেমন: 018xxxxxxxx"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Address */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                    ৪. ঠিকানা
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">গ্রাম</label>
                      <input
                        type="text"
                        value={memberForm.village}
                        onChange={(e) => setMemberForm({ ...memberForm, village: e.target.value })}
                        placeholder="গ্রামের নাম"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ওয়ার্ড নং</label>
                      <input
                        type="text"
                        value={memberForm.wardNo}
                        onChange={(e) => setMemberForm({ ...memberForm, wardNo: e.target.value })}
                        placeholder="যেমন: ৩"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ইউনিয়ন</label>
                      <input
                        type="text"
                        value={memberForm.union}
                        onChange={(e) => setMemberForm({ ...memberForm, union: e.target.value })}
                        placeholder="ইউনিয়ন"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">উপজেলা</label>
                      <input
                        type="text"
                        value={memberForm.upazila}
                        onChange={(e) => setMemberForm({ ...memberForm, upazila: e.target.value })}
                        placeholder="উপজেলা"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">জেলা</label>
                      <input
                        type="text"
                        value={memberForm.district}
                        onChange={(e) => setMemberForm({ ...memberForm, district: e.target.value })}
                        placeholder="জেলা"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Photo Upload */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের ছবি (ঐচ্ছিক)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFile(e, (url) => setMemberForm({ ...memberForm, photoUrl: url }))}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-900 cursor-pointer"
                  />
                  {memberForm.photoUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={memberForm.photoUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border" />
                      <button
                        type="button"
                        onClick={() => setMemberForm({ ...memberForm, photoUrl: '' })}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        ছবি সরান
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer shadow-xs"
                  >
                    {editingId ? 'হালনাগাদ সংরক্ষণ করুন' : 'সদস্য নিবন্ধন সম্পন্ন করুন'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        resetMemberForm();
                      }}
                      className="py-3 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                    >
                      বাতিল
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right: Registered Members List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">তালিকাভুক্ত সদস্যবৃন্দ</h3>
                  <p className="text-xs text-slate-500">
                    মোট {toBengaliNumber(members.length)} জন সদস্যের তথ্য ও চাঁদা লেজার
                  </p>
                </div>
              </div>

              {members.length === 0 ? (
                <p className="text-sm text-slate-500 bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                  এখনও কোনো সদস্য যুক্ত করা হয়নি। বামপাশের ফর্ম পূরণ করে প্রথম সদস্য নিবন্ধন করুন।
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-900/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={m.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-950 border border-blue-200 flex items-center justify-center font-bold text-base shrink-0">
                            {m.name.charAt(0)}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-base">{m.name}</h4>
                            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {m.memberId}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                m.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-emerald-700">{m.designation}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              {m.category || m.memberType || 'সাধারণ সদস্য'}
                            </span>
                            {m.phone && <span className="font-mono text-slate-500">📞 {m.phone}</span>}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>যোগদান: {formatBengaliDate(m.joinDate)}</span>
                            {m.subscriptionAmount ? (
                              <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.2 rounded font-semibold border border-emerald-100">
                                {m.subscriptionType === 'monthly' ? 'মাসিক' : 'বার্ষিক'} {formatTaka(m.subscriptionAmount)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Profile & Fees Modal Button */}
                        <button
                          type="button"
                          onClick={() => setAdminSelectedMember(m)}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                          title="সদস্যের সম্পূর্ণ প্রোফাইল ও চাঁদার হিসাব দেখুন"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>প্রোফাইল ও চাঁদা</span>
                        </button>

                        <button
                          onClick={() => handleEditMemberClick(m)}
                          className="p-2 text-blue-700 hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                          title="তথ্য সম্পাদনা"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => confirmAndDelete('members', m.id, m.name)}
                          className="p-2 text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Member Detail Modal in Admin Panel */}
          {adminSelectedMember && (
            <MemberDetailModal
              member={adminSelectedMember}
              onClose={() => setAdminSelectedMember(null)}
              onEditMember={(m) => {
                setAdminSelectedMember(null);
                handleEditMemberClick(m);
              }}
            />
          )}
        </div>
      )}

      {/* ==================== TAB: ACCOUNTS ==================== */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <h3 className="font-bold text-slate-900 text-lg mb-4">
              {editingId ? 'লেনদেন সম্পাদনা' : 'নতুন আয় / ব্যয় রেকর্ড'}
            </h3>
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">লেনদেনের ধরন *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: 'income' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      transactionForm.type === 'income'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + আয় (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: 'expense' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      transactionForm.type === 'expense'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    - ব্যয় (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">খাত / ক্যাটাগরি *</label>
                <input
                  type="text"
                  required
                  value={transactionForm.category}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                  placeholder="যেমন: শীতবস্ত্র ক্রয় / অফিস খরচ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  placeholder="যেমন: ২০০০"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                <input
                  type="date"
                  required
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ *</label>
                <textarea
                  required
                  rows={2}
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  placeholder="লেনদেনের বিস্তারিত উদ্দেশ্য ও বিবরণ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ভাউচার / রসিদ নং (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={transactionForm.voucherNo}
                  onChange={(e) => setTransactionForm({ ...transactionForm, voucherNo: e.target.value })}
                  placeholder="যেমন: VOUCH-08"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-indigo-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-950 transition-colors cursor-pointer"
                >
                  {editingId ? 'হালনাগাদ করুন' : 'রেকর্ড সংরক্ষণ করুন'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setTransactionForm({ type: 'income', category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', voucherNo: '' });
                    }}
                    className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    বাতিল
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 text-lg mb-2">সংরক্ষিত আর্থিক লেনদেন</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                এখনও কোনো লেনদেনের হিসাব যুক্ত করা হয়নি।
              </p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          tx.type === 'income' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {tx.type === 'income' ? 'আয়' : 'ব্যয়'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">খাত: {tx.category}</span>
                      {tx.voucherNo && (
                        <span className="text-xs text-slate-400 font-mono">#{tx.voucherNo}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-900 font-medium mt-1">{tx.description}</p>
                    <p className="text-[11px] text-slate-400">তারিখ: {tx.date}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-bold text-base ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatTaka(tx.amount)}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(tx.id);
                        setTransactionForm({
                          type: tx.type,
                          category: tx.category,
                          amount: tx.amount.toString(),
                          date: tx.date,
                          description: tx.description,
                          voucherNo: tx.voucherNo || '',
                        });
                      }}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmAndDelete('transactions', tx.id, `${tx.category} - ${formatTaka(tx.amount)}`)}
                      className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: ACTIVITIES ==================== */}
      {activeTab === 'activities' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <h3 className="font-bold text-slate-900 text-lg mb-4">
              {editingId ? 'কার্যক্রম সম্পাদনা' : 'নতুন কার্যক্রম যোগ'}
            </h3>
            <form onSubmit={handleActivitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কার্যক্রমের শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="যেমন: শীতবস্ত্র বিতরণ কর্মসূচি ২০২৬"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                <input
                  type="date"
                  required
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">স্থান *</label>
                <input
                  type="text"
                  required
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                  placeholder="যেমন: কোদালপুর স্কুল মাঠ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কার্যক্রমের অবস্থা *</label>
                <select
                  value={activityForm.status}
                  onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                >
                  <option value="upcoming">আসন্ন (Upcoming)</option>
                  <option value="ongoing">চলমান (Ongoing)</option>
                  <option value="completed">সম্পন্ন (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিস্তারিত বিবরণ *</label>
                <textarea
                  required
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="কার্যক্রমের লক্ষ্য ও বিবরণ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ছবি (ঐচ্ছিক)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e, (url) => setActivityForm({ ...activityForm, photoUrl: url }))}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-900 cursor-pointer"
                />
                {activityForm.photoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={activityForm.photoUrl} alt="Preview" className="w-14 h-10 object-cover rounded-md" />
                    <button
                      type="button"
                      onClick={() => setActivityForm({ ...activityForm, photoUrl: '' })}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      ছবি সরান
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="act_publish"
                  checked={activityForm.isPublished}
                  onChange={(e) => setActivityForm({ ...activityForm, isPublished: e.target.checked })}
                  className="w-4 h-4 text-blue-900 rounded cursor-pointer"
                />
                <label htmlFor="act_publish" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  ওয়েবসাইটে সরাসরি প্রকাশ করুন
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-900 transition-colors cursor-pointer"
                >
                  {editingId ? 'হালনাগাদ করুন' : 'কার্যক্রম প্রকাশ করুন'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setActivityForm({ title: '', date: new Date().toISOString().split('T')[0], location: '', description: '', photoUrl: '', status: 'upcoming', isPublished: true });
                    }}
                    className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    বাতিল
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 text-lg mb-2">সকল কার্যক্রমের তালিকা</h3>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                এখনও কোনো কার্যক্রম যোগ করা হয়নি।
              </p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {act.photoUrl && (
                      <img src={act.photoUrl} alt={act.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 truncate">{act.title}</h4>
                        {!act.isPublished && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                            অপ্রকাশিত
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{act.location} | {act.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(act.id);
                        setActivityForm({
                          title: act.title,
                          date: act.date,
                          location: act.location,
                          description: act.description,
                          photoUrl: act.photoUrl || '',
                          status: act.status,
                          isPublished: act.isPublished,
                        });
                      }}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmAndDelete('activities', act.id, act.title)}
                      className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: POLICIES ==================== */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <h3 className="font-bold text-slate-900 text-lg mb-4">
              {editingId ? 'নীতিমালা সম্পাদনা' : 'নতুন নীতিমালা যোগ'}
            </h3>
            <form onSubmit={handlePolicySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নীতিমালার শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={policyForm.title}
                  onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })}
                  placeholder="যেমন: সদস্য হওয়ার নিয়মাবলী"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিভাগ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={policyForm.category}
                  onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                  placeholder="যেমন: সদস্যপদ / আর্থিক স্বচ্ছতা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ক্রম নম্বর</label>
                <input
                  type="number"
                  min="1"
                  value={policyForm.orderNumber}
                  onChange={(e) => setPolicyForm({ ...policyForm, orderNumber: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নীতিমালার পূর্ণ বিষয়বস্তু *</label>
                <textarea
                  required
                  rows={6}
                  value={policyForm.content}
                  onChange={(e) => setPolicyForm({ ...policyForm, content: e.target.value })}
                  placeholder="ধারাসমূহ ও নিয়মাবলী..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pol_publish"
                  checked={policyForm.isPublished}
                  onChange={(e) => setPolicyForm({ ...policyForm, isPublished: e.target.checked })}
                  className="w-4 h-4 text-blue-900 rounded cursor-pointer"
                />
                <label htmlFor="pol_publish" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  ওয়েবসাইটে দৃশ্যমান করুন
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  {editingId ? 'হালনাগাদ করুন' : 'নীতিমালা সংরক্ষণ করুন'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setPolicyForm({ title: '', category: '', content: '', orderNumber: policies.length + 1, isPublished: true });
                    }}
                    className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    বাতিল
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 text-lg mb-2">প্রকাশিত ও সংরক্ষিত নীতিমালা</h3>
            {policies.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                এখনও কোনো নীতিমালা যোগ করা হয়নি।
              </p>
            ) : (
              policies.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{toBengaliNumber(idx + 1)}</span>
                      <h4 className="font-bold text-slate-900">{p.title}</h4>
                      {!p.isPublished && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                          অপ্রকাশিত
                        </span>
                      )}
                    </div>
                    {p.category && <p className="text-xs text-emerald-700">বিভাগ: {p.category}</p>}
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.content}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setPolicyForm({
                          title: p.title,
                          category: p.category || '',
                          content: p.content,
                          orderNumber: p.orderNumber || idx + 1,
                          isPublished: p.isPublished,
                        });
                      }}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmAndDelete('policies', p.id, p.title)}
                      className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: FOUNDATION & LOGO & COMMITTEE ==================== */}
      {activeTab === 'foundation' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-lg mb-4">প্রতিষ্ঠানের তথ্য ও অফিসিয়াল লোগো আপলোড</h3>
            <form onSubmit={handleFoundationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতিষ্ঠানের নাম *</label>
                  <input
                    type="text"
                    required
                    value={foundationForm.name}
                    onChange={(e) => setFoundationForm({ ...foundationForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা *</label>
                  <input
                    type="text"
                    required
                    value={foundationForm.address}
                    onChange={(e) => setFoundationForm({ ...foundationForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতিষ্ঠার তারিখ *</label>
                  <input
                    type="text"
                    required
                    value={foundationForm.establishedDate}
                    onChange={(e) => setFoundationForm({ ...foundationForm, establishedDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মূল বাণী / স্লোগান</label>
                  <input
                    type="text"
                    value={foundationForm.motto}
                    onChange={(e) => setFoundationForm({ ...foundationForm, motto: e.target.value })}
                    placeholder="যেমন: আর্তমানবতার সেবায় আমরা ঐক্যবদ্ধ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-blue-900" />
                  <span>প্রতিষ্ঠানের অফিসিয়াল লোগো আপলোড</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  আপনার প্রতিষ্ঠানের প্রকৃত লোগো নির্বাচন করুন (সর্বোচ্চ ৮০০ KB)। লোগো না থাকলে কোনো কাল্পনিক লোগো দেখানো হবে না।
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e, (url) => setFoundationForm({ ...foundationForm, logoUrl: url }))}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-950 file:text-white cursor-pointer"
                />
                {foundationForm.logoUrl && (
                  <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 w-fit">
                    <img src={foundationForm.logoUrl} alt="Logo preview" className="w-12 h-12 object-contain" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">বর্তমান লোগো প্রিভিউ</p>
                      <button
                        type="button"
                        onClick={() => setFoundationForm({ ...foundationForm, logoUrl: '' })}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        লোগো মুছে ফেলুন
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">হোম পেজের পরিচিতিমূলক অংশ</label>
                <textarea
                  rows={3}
                  value={foundationForm.introduction}
                  onChange={(e) => setFoundationForm({ ...foundationForm, introduction: e.target.value })}
                  placeholder="হোম পেজের শীর্ষ নামের নিচে প্রদর্শিত হবে..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মূল লক্ষ্য ও উদ্দেশ্য</label>
                  <textarea
                    rows={3}
                    value={foundationForm.mission}
                    onChange={(e) => setFoundationForm({ ...foundationForm, mission: e.target.value })}
                    placeholder="লক্ষ্য ও উদ্দেশ্য..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ভবিষ্যৎ পরিকল্পনা</label>
                  <textarea
                    rows={3}
                    value={foundationForm.futurePlans}
                    onChange={(e) => setFoundationForm({ ...foundationForm, futurePlans: e.target.value })}
                    placeholder="ভবিষ্যৎ উন্নয়ন ও জনকল্যাণমূলক পরিকল্পনা..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer"
              >
                প্রতিষ্ঠানের তথ্য ও লোগো সংরক্ষণ করুন
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Executives Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-slate-900 text-base mb-3">প্রতিষ্ঠাতা ও কার্যনির্বাহী সদস্য যোগ</h4>
              <form onSubmit={handleExecutiveSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="ব্যক্তির নাম *"
                  value={executiveForm.name}
                  onChange={(e) => setExecutiveForm({ ...executiveForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="পদবি *"
                  value={executiveForm.designation}
                  onChange={(e) => setExecutiveForm({ ...executiveForm, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e, (url) => setExecutiveForm({ ...executiveForm, photoUrl: url }))}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-slate-100"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-800"
                >
                  দায়িত্বশীল ব্যক্তি যুক্ত করুন
                </button>
              </form>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {executives.map((ex) => (
                  <div key={ex.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{ex.name}</p>
                      <p className="text-slate-500">{ex.designation}</p>
                    </div>
                    <button
                      onClick={() => confirmAndDelete('executives', ex.id, ex.name)}
                      className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisors Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-slate-900 text-base mb-3">উপদেষ্টামণ্ডলীর সদস্য যোগ</h4>
              <form onSubmit={handleAdvisorSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="উপদেষ্টার নাম *"
                  value={advisorForm.name}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="পরিচিতি *"
                  value={advisorForm.designation}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e, (url) => setAdvisorForm({ ...advisorForm, photoUrl: url }))}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-slate-100"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-950 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-900"
                >
                  উপদেষ্টা যুক্ত করুন
                </button>
              </form>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {advisors.map((ad) => (
                  <div key={ad.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{ad.name}</p>
                      <p className="text-slate-500">{ad.designation}</p>
                    </div>
                    <button
                      onClick={() => confirmAndDelete('advisors', ad.id, ad.name)}
                      className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: BLOOD DONORS ==================== */}
      {activeTab === 'blood' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <h3 className="font-bold text-slate-900 text-lg mb-4">
              {editingId ? 'রক্তদাতার তথ্য সম্পাদনা' : 'নতুন রক্তদাতা যুক্ত করুন'}
            </h3>
            <form onSubmit={handleBloodDonorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">রক্তদাতার নাম *</label>
                <input
                  type="text"
                  required
                  value={donorForm.name}
                  onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })}
                  placeholder="রক্তদাতার পুরো নাম"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">রক্তের গ্রুপ *</label>
                <select
                  value={donorForm.bloodGroup}
                  onChange={(e) => setDonorForm({ ...donorForm, bloodGroup: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900 font-bold text-rose-700"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">এলাকা / ইউনিয়ন / গ্রাম *</label>
                <input
                  type="text"
                  required
                  value={donorForm.area}
                  onChange={(e) => setDonorForm({ ...donorForm, area: e.target.value })}
                  placeholder="যেমন: কোদালপুর বাজার / গোসাইরহাট"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={donorForm.contactNumber}
                  onChange={(e) => setDonorForm({ ...donorForm, contactNumber: e.target.value })}
                  placeholder="যেমন: 017xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সর্বশেষ রক্তদানের তারিখ</label>
                <input
                  type="date"
                  value={donorForm.lastDonationDate}
                  onChange={(e) => setDonorForm({ ...donorForm, lastDonationDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="donor_consent"
                    checked={donorForm.hasConsent}
                    onChange={(e) => setDonorForm({ ...donorForm, hasConsent: e.target.checked })}
                    className="w-4 h-4 text-rose-700 rounded cursor-pointer"
                  />
                  <label htmlFor="donor_consent" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    রক্তদাতার প্রকাশে স্পষ্ট সম্মতি রয়েছে *
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="donor_avail"
                    checked={donorForm.isAvailable}
                    onChange={(e) => setDonorForm({ ...donorForm, isAvailable: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded cursor-pointer"
                  />
                  <label htmlFor="donor_avail" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    রক্তদানে প্রস্তুত (Available)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-rose-700 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition-colors cursor-pointer"
                >
                  {editingId ? 'হালনাগাদ করুন' : 'রক্তদাতা যুক্ত করুন'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDonorForm({ name: '', bloodGroup: 'A+', area: '', lastDonationDate: '', contactNumber: '', hasConsent: true, isAvailable: true });
                    }}
                    className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    বাতিল
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 text-lg mb-2">সংরক্ষিত রক্তদাতাদের তালিকা</h3>
            {bloodDonors.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                এখনও কোনো রক্তদাতা যোগ করা হয়নি।
              </p>
            ) : (
              bloodDonors.map((d) => (
                <div
                  key={d.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 font-black text-sm border border-rose-200 flex items-center justify-center shrink-0">
                      {d.bloodGroup}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900">{d.name}</h4>
                      <p className="text-xs text-slate-600">এলাকা: {d.area}</p>
                      {d.contactNumber && (
                        <p className="text-xs text-emerald-700 font-mono">মোবাইল: {d.contactNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(d.id);
                        setDonorForm({
                          name: d.name,
                          bloodGroup: d.bloodGroup,
                          area: d.area,
                          lastDonationDate: d.lastDonationDate || '',
                          contactNumber: d.contactNumber || '',
                          hasConsent: d.hasConsent,
                          isAvailable: d.isAvailable !== false,
                        });
                      }}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmAndDelete('bloodDonors', d.id, d.name)}
                      className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: ADMIN ROLES ==================== */}
      {activeTab === 'admins' && (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-lg mb-2">অনুমোদিত অ্যাডমিন ব্যবস্থাপনা</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            কোনো নতুন বিশ্বস্ত সদস্যকে অ্যাডমিন অ্যাক্সেস দিতে তাঁর Firebase Auth User ID (UID) এবং ইমেইল যোগ করুন।
          </p>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-6 text-xs text-blue-900">
            <p className="font-bold mb-1">প্রধান অ্যাডমিন (Default Owner):</p>
            <p className="font-mono">newt34441@gmail.com</p>
          </div>

          <form onSubmit={handleAdminAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">অ্যাডমিনের ইমেইল *</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Firebase Auth User ID (UID) *</label>
              <input
                type="text"
                required
                value={adminUid}
                onChange={(e) => setAdminUid(e.target.value)}
                placeholder="ব্যবহারকারীর Firebase Auth UID"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer"
            >
              নতুন অ্যাডমিন অনুমোদন দিন
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
