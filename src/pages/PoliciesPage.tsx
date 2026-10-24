import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { ArrowLeft, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Policy } from '../types';
import { toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

interface PoliciesPageProps {
  onNavigate: (path: string) => void;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ onNavigate }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Only published policies
    const q = query(
      collection(db, 'policies'),
      where('isPublished', '==', true)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Policy[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Policy, 'id'>) });
        });
        // Sort by orderNumber or title
        docs.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        setPolicies(docs);
        if (docs.length > 0 && !expandedId) {
          setExpandedId(docs[0].id);
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'policies');
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">ফাউন্ডেশনের নীতিমালা</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            প্রাতিষ্ঠানিক আচরণবিধি, নিয়মনীতি ও কার্যপরিচালনা নির্দেশিকা
          </p>
        </div>
      </div>

      {/* Policies List */}
      {loading ? (
        <LoadingSpinner text="নীতিমালা লোড হচ্ছে..." />
      ) : policies.length === 0 ? (
        <EmptyState
          message="এখনও কোনো নীতিমালা প্রকাশ করা হয়নি।"
          subMessage="প্রতিষ্ঠানের অনুমোদিত নীতিমালা অ্যাডমিন প্যানেল থেকে প্রকাশের পর এখানে পাওয়া যাবে।"
        />
      ) : (
        <div className="space-y-3.5">
          {policies.map((policy, index) => {
            const isExpanded = expandedId === policy.id;
            return (
              <div
                key={policy.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                <button
                  onClick={() => toggleExpand(policy.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {toBengaliNumber(index + 1)}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {policy.title}
                      </h3>
                      {policy.category && (
                        <span className="text-xs text-emerald-700 font-medium">
                          বিভাগ: {policy.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-400 shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50">
                    {policy.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
