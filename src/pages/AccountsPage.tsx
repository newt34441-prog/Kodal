import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Search, Filter, Calendar, Receipt } from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Transaction } from '../types';
import { formatTaka, formatBengaliDate, toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

interface AccountsPageProps {
  onNavigate: (path: string) => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ onNavigate }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Transaction, 'id'>) });
        });
        setTransactions(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute exact financial metrics from real Firestore records
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // বর্তমান স্থিতি = মোট আয় − মোট ব্যয়
  const currentBalance = totalIncome - totalExpense;

  // Categories list
  const categories = Array.from(new Set(transactions.map((t) => t.category).filter(Boolean)));

  const filtered = transactions.filter((t) => {
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.voucherNo && t.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesCategory && matchesSearch;
  });

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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">আয়-ব্যয়ের হিসাব ও স্থিতি</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            প্রতিষ্ঠানের পূর্ণাঙ্গ আর্থিক স্বচ্ছতা ও হিসাব বিবরণী
          </p>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Income Card */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">মোট আয়</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">{formatTaka(totalIncome)}</p>
          <p className="text-xs text-slate-400 mt-1">
            মোট আয়ের এন্ট্রি: {toBengaliNumber(transactions.filter((t) => t.type === 'income').length)}টি
          </p>
        </div>

        {/* Expense Card */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">মোট ব্যয়</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700">{formatTaka(totalExpense)}</p>
          <p className="text-xs text-slate-400 mt-1">
            মোট ব্যয়ের এন্ট্রি: {toBengaliNumber(transactions.filter((t) => t.type === 'expense').length)}টি
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">বর্তমান স্থিতি</span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{formatTaka(currentBalance)}</p>
          <p className="text-xs text-blue-200 mt-1">
            (মোট আয় − মোট ব্যয়)
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      {transactions.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="বিবরণ, খাত বা ভাউচার নম্বর অনুসন্ধান..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all text-sm"
              />
            </div>

            {/* Type selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-blue-950 text-white border-blue-950'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                সকল বিবরণী
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  typeFilter === 'income'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                আয়
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  typeFilter === 'expense'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ব্যয়
              </button>
            </div>
          </div>

          {/* Category Dropdown if exists */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>খাত ফিল্টার:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="all">সকল খাত</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <LoadingSpinner text="হিসাবের বিবরণী লোড হচ্ছে..." />
      ) : transactions.length === 0 ? (
        <EmptyState
          message="এখনও কোনো আয় বা ব্যয়ের হিসাব প্রকাশ করা হয়নি।"
          subMessage="অ্যাডমিন কর্তৃক হিসাব যুক্ত করার পর এখানে পূর্ণ বিবরণী দেখা যাবে।"
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="অনুসন্ধানের শর্তে কোনো লেনদেন পাওয়া যায়নি।" />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isIncome = item.type === 'income';
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {isIncome ? 'আয়' : 'ব্যয়'}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      খাত: {item.category}
                    </span>
                    {item.voucherNo && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-slate-400" />
                        ভাউচার: {toBengaliNumber(item.voucherNo)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-slate-900">{item.description}</p>

                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>তারিখ: {formatBengaliDate(item.date)}</span>
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span
                    className={`text-lg sm:text-xl font-bold px-3 py-1 rounded-lg border inline-block ${
                      isIncome
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        : 'text-rose-700 bg-rose-50 border-rose-100'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatTaka(item.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
