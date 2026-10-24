import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import {
  HeartHandshake,
  Search,
  Receipt,
  Calendar,
  ArrowLeft,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Donation, PaymentSettings } from '../types';
import { formatTaka, formatBengaliDate, toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  submitManualDonation,
  generateDonationReference,
} from '../firebase/donationService';

interface DonationsPageProps {
  onNavigate: (path: string) => void;
}

export const DonationsPage: React.FC<DonationsPageProps> = ({ onNavigate }) => {
  // Public verified donations list
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Payment configuration from Firebase
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true);

  // Manual Donation Flow State
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [donorName, setDonorName] = useState<string>('');
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('সাধারণ মানবিক কল্যাণ তহবিল');
  const [transactionId, setTransactionId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // UI state
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: input info, 2: view instructions & TrxID form, 3: success reference
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [currentReference] = useState<string>(() => generateDonationReference());

  // Listen for verified donations
  useEffect(() => {
    const q = query(collection(db, 'donations'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Donation[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Donation, 'id'>) });
        });
        setDonations(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'donations');
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen for Payment Settings in Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'paymentSettings', 'main'),
      (docSnap) => {
        if (docSnap.exists()) {
          setPaymentSettings(docSnap.data() as PaymentSettings);
        } else {
          setPaymentSettings(null);
        }
        setSettingsLoading(false);
      },
      (err) => {
        setSettingsLoading(false);
        console.warn('Payment settings fetch notice:', err);
      }
    );

    return () => unsub();
  }, []);

  const totalAmount = donations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const filtered = donations.filter(
    (d) =>
      d.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.receiptNo && d.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Active method details
  const isBkash = method === 'bkash';
  const isMethodActive = isBkash
    ? !!(paymentSettings?.bkashActive && paymentSettings?.bkashNumber)
    : !!(paymentSettings?.nagadActive && paymentSettings?.nagadNumber);

  const activeNumber = isBkash ? paymentSettings?.bkashNumber : paymentSettings?.nagadNumber;
  const activeAccountType = isBkash
    ? paymentSettings?.bkashAccountType || 'personal'
    : paymentSettings?.nagadAccountType || 'personal';
  const activeCustomInstructions = isBkash
    ? paymentSettings?.bkashInstructions
    : paymentSettings?.nagadInstructions;

  const handleCopyNumber = () => {
    if (activeNumber) {
      navigator.clipboard.writeText(activeNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGoToInstructions = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক অনুদানের পরিমাণ লিখুন।');
      return;
    }
    if (!donorName.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার নাম প্রদান করুন।');
      return;
    }
    if (!donorPhone.trim()) {
      setErrorMessage('অনুগ্রহ করে যোগাযোগের মোবাইল নম্বর দিন।');
      return;
    }
    setStep(2);
  };

  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTrxId = transactionId.trim().toUpperCase();
    if (!cleanTrxId) {
      setErrorMessage('অনুগ্রহ করে টাকা পাঠানোর Transaction ID (TrxID) লিখুন।');
      return;
    }

    if (cleanTrxId.length < 5) {
      setErrorMessage('Transaction ID অত্যন্ত ছোট। অনুগ্রহ করে সঠিক TrxID দিন।');
      return;
    }

    if (!activeNumber) {
      setErrorMessage('নির্বাচিত পেমেন্ট নম্বর সক্রিয় নয়।');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitManualDonation({
        referenceNo: currentReference,
        donorName: donorName.trim(),
        donorPhone: donorPhone.trim(),
        amount: parseFloat(amount),
        method,
        recipientNumber: activeNumber,
        transactionId: cleanTrxId,
        purpose: purpose.trim() || 'সাধারণ কল্যাণ তহবিল',
        note: note.trim(),
      });

      setSubmittedRef(result.referenceNo);
      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুদান জমা দিতে সমস্যা হয়েছে।';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setAmount('');
    setDonorName('');
    setDonorPhone('');
    setTransactionId('');
    setNote('');
    setSubmittedRef(null);
    setErrorMessage(null);
    setStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Title & Back */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-950 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>প্রধান পাতা</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">অনুদান ব্যবস্থাপনা ও প্রদান</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            সহজ ও বিশ্বস্ত মাধ্যমে আপনার অনুদান পাঠিয়ে এলাকার সেবামূলক কাজে অংশ নিন
          </p>
        </div>
      </div>

      {/* Summary Card: Total Verified Donations */}
      <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-2xl p-6 sm:p-7 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
              <HeartHandshake className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium">মোট অনুমোদিত সংগৃহীত অনুদান</p>
              <p className="text-2xl sm:text-4xl font-black tracking-tight mt-0.5">
                {formatTaka(totalAmount)}
              </p>
              <p className="text-xs text-emerald-200 mt-0.5">
                যাচাইকৃত অনুদানকারীর সংখ্যা: {toBengaliNumber(donations.length)} জন
              </p>
            </div>
          </div>

          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs text-xs text-emerald-100 max-w-xs">
            <p className="font-semibold text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              শতভাগ স্বচ্ছতা নিশ্চিত
            </p>
            <p className="mt-0.5 leading-relaxed">
              বিকাশ ও নগদে পাঠানো প্রতিটি অনুদান অ্যাডমিন কর্তৃক যাচাইয়ের পরই হিসাবের স্থিতিতে যুক্ত হয়।
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION: MANUAL DONATION PAYMENT SYSTEM (বিকাশ ও নগদ) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-blue-900/15 p-6 sm:p-8 mb-10 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 text-white flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-950">অনুদান প্রদান করুন (বিকাশ / নগদ)</h3>
              <p className="text-xs text-slate-500">
                ম্যানুয়াল পেমেন্ট সম্পন্ন করে নিচের ফর্মে Transaction ID জমা দিন
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
            ধাপ {toBengaliNumber(step)} / ৩
          </span>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: INITIAL DETAILS & METHOD SELECTION */}
        {step === 1 && (
          <form onSubmit={handleGoToInstructions} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  অনুদানের পরিমাণ (টাকা) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="যেমন: ১০০০"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  পেমেন্ট পদ্ধতি নির্বাচন করুন *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMethod('bkash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      method === 'bkash'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-rose-600 inline-block"></span>
                    <span>বিকাশ (bKash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('nagad')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      method === 'nagad'
                        ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-orange-600 inline-block"></span>
                    <span>নগদ (Nagad)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  দাতার পুরো নাম *
                </label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="আপনার নাম লিখুন"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  দাতার মোবাইল নম্বর *
                </label>
                <input
                  type="tel"
                  required
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                অনুদানের উদ্দেশ্য বা সংক্ষিপ্ত বার্তা (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="যেমন: সাধারণ মানবিক তহবিল / এতিম ও শিক্ষা সহায়তা / চিকিৎসা ফান্ড"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-blue-950 text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>অনুদান দেওয়ার নির্দেশনা দেখুন</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: PAYMENT INSTRUCTIONS & SUBMISSION FORM */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Payment Number and Account Type Notification */}
            {settingsLoading ? (
              <LoadingSpinner text="পেমেন্ট অ্যাকাউন্টের তথ্য লোড হচ্ছে..." />
            ) : !isMethodActive ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 text-base">এই পেমেন্ট পদ্ধতি বর্তমানে চালু নেই</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  অ্যাডমিন কর্তৃক {isBkash ? 'বিকাশ' : 'নগদ'} অ্যাকাউন্ট নম্বর কনফিগার বা সক্রিয় করা হয়নি। অনুগ্রহ করে অন্য পদ্ধতি নির্বাচন করুন অথবা পরবর্তীতে চেষ্টা করুন।
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-4 px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ← পূর্বে ফিরে যান
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Account Details Box */}
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        নির্বাচিত পেমেন্ট গেটওয়ে
                      </span>
                      <h4 className="text-lg font-black text-blue-950 flex items-center gap-2 mt-0.5">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            isBkash ? 'bg-rose-600' : 'bg-orange-600'
                          }`}
                        ></span>
                        <span>{isBkash ? 'বিকাশ (bKash)' : 'নগদ (Nagad)'}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          {activeAccountType === 'merchant' ? 'মার্চেন্ট একাউন্ট' : 'ব্যক্তিগত (Personal)'}
                        </span>
                      </h4>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-xs font-medium text-slate-500">অনুদানের পরিমাণ</span>
                      <p className="text-xl font-black text-emerald-700">{formatTaka(parseFloat(amount))}</p>
                    </div>
                  </div>

                  {/* Number & Copy Box */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">নির্ধারিত প্রাপক নম্বর</p>
                      <p className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-wider">
                        {activeNumber}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-200"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-600" />
                          <span>নম্বর কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Step-by-Step Payment Instructions */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-blue-950 flex items-center gap-1.5 text-sm">
                      <HelpCircle className="w-4 h-4 text-blue-900" />
                      টাকা পাঠানোর সঠিক নিয়মাবলী:
                    </p>

                    {activeAccountType === 'merchant' ? (
                      <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed text-slate-700">
                        <li>আপনার {isBkash ? 'বিকাশ' : 'নগদ'} অ্যাপে প্রবেশ করুন।</li>
                        <li><strong>"পেমেন্ট" (Make Payment)</strong> অপশন নির্বাচন করুন।</li>
                        <li>প্রাপক মার্চেন্ট নম্বরে <strong>{activeNumber}</strong> দিন।</li>
                        <li>টাকার পরিমাণ <strong>{amount}</strong> টাকা লিখুন।</li>
                        <li>রেফারেন্স চাইলে <strong>{currentReference}</strong> লিখুন।</li>
                        <li>আপনার পিন দিয়ে লেনদেন সম্পন্ন করুন এবং পাওয়া <strong>Transaction ID (TrxID)</strong> কপি করে নিচের ফর্মে জমা দিন।</li>
                      </ol>
                    ) : (
                      <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed text-slate-700">
                        <li>আপনার {isBkash ? 'বিকাশ' : 'নগদ'} অ্যাপে প্রবেশ করুন অথবা ডায়াল করুন।</li>
                        <li><strong>"সেন্ড মানি" (Send Money)</strong> অপশন নির্বাচন করুন।</li>
                        <li>প্রাপক নম্বরে <strong>{activeNumber}</strong> দিন।</li>
                        <li>টাকার পরিমাণ <strong>{amount}</strong> টাকা লিখুন।</li>
                        <li>রেফারেন্স চাইলে <strong>{currentReference}</strong> লিখুন।</li>
                        <li>আপনার গোপন পিন দিয়ে টাকা পাঠানো সম্পন্ন করুন এবং ফিরতি মেসেজে পাওয়া <strong>Transaction ID (TrxID)</strong> কপি করে নিচের ফর্মে দিন।</li>
                      </ol>
                    )}

                    {activeCustomInstructions && (
                      <div className="mt-2 pt-2 border-t border-blue-200/60 font-medium text-blue-950">
                        বিশেষ নির্দেশনা: {activeCustomInstructions}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Form (TrxID) */}
                <form onSubmit={handleSubmitDonation} className="space-y-4 pt-2">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <span>
                      সিস্টেম রেফারেন্স নম্বর: <strong>{currentReference}</strong>
                    </span>
                    <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200 font-mono">
                      {currentReference}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Transaction ID (TrxID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="যেমন: BL98A2K9Z অথবা 7B9X4Y1"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-base uppercase font-bold focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isBkash ? 'বিকাশ' : 'নগদ'} থেকে টাকা পাঠানোর পর পাওয়া ৮-১০ অক্ষরের ট্রানজেকশন আইডি হুবহু লিখুন।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      অতিরিক্ত মন্তব্য (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="কোনো বিশেষ বার্তা বা মন্তব্য থাকলে লিখতে পারেন..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>যাচাই করে তথ্য জমা হচ্ছে...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>অনুদানের তথ্য নিশ্চিত করে জমা দিন</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      পূর্ববর্তী ধাপে যান
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SUCCESS & PENDING VERIFICATION NOTICE */}
        {step === 3 && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h4 className="text-xl font-black text-blue-950">
                আপনার অনুদানের তথ্য সফলভাবে জমা হয়েছে!
              </h4>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                কোদালপুর মানবিক ফাউন্ডেশনের পাশে দাঁড়ানোর জন্য আন্তরিক ধন্যবাদ।
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">রেফারেন্স নম্বর:</span>
                <span className="font-mono font-bold text-slate-800">{submittedRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">দাতার নাম:</span>
                <span className="font-semibold text-slate-800">{donorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">অনুদানের পরিমাণ:</span>
                <span className="font-bold text-emerald-700">{formatTaka(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">পদ্ধতি ও TrxID:</span>
                <span className="font-mono text-slate-700">{method.toUpperCase()} - {transactionId}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">বর্তমান স্ট্যাটাস:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Clock className="w-3 h-3" />
                  যাচাইয়ের অপেক্ষায় (Pending)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              * আপনার পেমেন্ট অ্যাডমিন কর্তৃক অ্যাকাউন্টের সাথে মিলিয়ে অনুমোদন করার সাথে সাথে এটি অফিসিয়াল অনুদানের তালিকায় ও প্রতিষ্ঠানের আয়-ব্যয়ের হিসাবে অন্তর্ভুক্ত হবে।
            </p>

            <button
              onClick={handleResetForm}
              className="mt-2 px-6 py-2.5 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer"
            >
              নতুন আরেকটি অনুদান প্রদান
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION: APPROVED OFFICIAL DONATIONS LIST */}
      {/* ======================================================== */}
      <div className="border-t border-slate-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-950 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-700" />
            <span>অনুমোদিত অনুদানের তালিকা</span>
          </h3>
          <span className="text-xs text-slate-500">
            মোট: {toBengaliNumber(donations.length)}টি
          </span>
        </div>

        {/* Search Bar */}
        {donations.length > 0 && (
          <div className="mb-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="অনুদানকারীর নাম, উদ্দেশ্য বা রসিদ/রেফারেন্স নম্বর দিয়ে অনুসন্ধান করুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all text-sm"
            />
          </div>
        )}

        {/* Donations Content */}
        {loading ? (
          <LoadingSpinner text="অনুদানের তথ্য লোড হচ্ছে..." />
        ) : donations.length === 0 ? (
          <EmptyState
            message="এখনও কোনো অনুদানের তথ্য প্রকাশ করা হয়নি।"
            subMessage="অনুমোদিত অ্যাডমিন কর্তৃক তথ্য প্রকাশের পর এখানে বিস্তারিত তালিকা দেখতে পাবেন।"
          />
        ) : filtered.length === 0 ? (
          <EmptyState message="অনুসন্ধানের ফলাফলে কোনো অনুদান পাওয়া যায়নি।" />
        ) : (
          <div className="space-y-3.5">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base sm:text-lg">
                      {item.donorName}
                    </h4>
                    {item.receiptNo && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        <Receipt className="w-3 h-3" />
                        রেফ নং: {toBengaliNumber(item.receiptNo)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{item.purpose}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>তারিখ: {formatBengaliDate(item.date)}</span>
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-lg sm:text-xl font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 inline-block">
                    {formatTaka(item.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
