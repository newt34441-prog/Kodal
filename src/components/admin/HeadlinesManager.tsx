import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  Megaphone,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { Headline } from '../../types';
import { toBengaliNumber } from '../../utils/formatters';
import { HeadlineTicker } from '../common/HeadlineTicker';

interface HeadlinesManagerProps {
  headlines: Headline[];
  onDelete: (collectionName: string, id: string, label: string) => Promise<void>;
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

const BADGE_PRESETS = ['ঘোষণা', 'জরুরি', 'সংবাদ', 'ইভেন্ট', 'বিজ্ঞপ্তি', 'রক্তদান', 'অনুদান'];

const LINK_OPTIONS = [
  { value: '', label: 'কোনো লিংক নেই (শুধু টেক্সট)' },
  { value: '/donations', label: 'অনলাইন অনুদান (/donations)' },
  { value: '/blood-donors', label: 'রক্তদাতা কর্নার (/blood-donors)' },
  { value: '/activities', label: 'কার্যক্রম (/activities)' },
  { value: '/members', label: 'সদস্যবৃন্দ (/members)' },
  { value: '/accounts', label: 'আয়-ব্যয়ের হিসাব (/accounts)' },
  { value: '/policies', label: 'গঠনতন্ত্র ও নীতিমালা (/policies)' },
  { value: '/about', label: 'আমাদের পরিচিতি (/about)' },
];

export const HeadlinesManager: React.FC<HeadlinesManagerProps> = ({
  headlines,
  onDelete,
  onFeedback,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    badge: 'ঘোষণা',
    linkPath: '',
    orderNumber: headlines.length + 1,
    isPublished: true,
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      badge: 'ঘোষণা',
      linkPath: '',
      orderNumber: headlines.length + 1,
      isPublished: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      onFeedback('error', 'অনুগ্রহ করে শিরোনামের লেখা লিখুন।');
      return;
    }
    if (trimmedTitle.length > 300) {
      onFeedback('error', 'শিরোনাম সর্বোচ্চ ৩০০ অক্ষরের মধ্যে হতে হবে।');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payload: Record<string, string | number | boolean> = {
        title: trimmedTitle,
        isPublished: Boolean(form.isPublished),
        orderNumber: Number(form.orderNumber) || 1,
        updatedAt: nowIso,
      };

      const trimmedBadge = form.badge.trim();
      if (trimmedBadge) {
        payload.badge = trimmedBadge.slice(0, 40);
      }
      const trimmedLink = form.linkPath.trim();
      if (trimmedLink) {
        payload.linkPath = trimmedLink.slice(0, 100);
      }

      if (editingId) {
        const existing = headlines.find((h) => h.id === editingId);
        payload.createdAt = existing?.createdAt || nowIso;
        await setDoc(doc(db, 'headlines', editingId), payload);
        onFeedback('success', 'শিরোনাম সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        payload.createdAt = nowIso;
        const newId = 'hl_' + Date.now();
        await setDoc(doc(db, 'headlines', newId), payload);
        onFeedback('success', 'নতুন শিরোনাম সফলভাবে যুক্ত করা হয়েছে।');
      }
      resetForm();
    } catch (err) {
      const msg = handleFirestoreError(err, OperationType.WRITE, 'headlines');
      onFeedback('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: Headline) => {
    setTogglingId(item.id);
    try {
      const nowIso = new Date().toISOString();
      const payload: Record<string, string | number | boolean> = {
        title: item.title,
        isPublished: !item.isPublished,
        orderNumber: Number(item.orderNumber) || 1,
        updatedAt: nowIso,
        createdAt: item.createdAt || nowIso,
      };
      if (item.badge) payload.badge = item.badge;
      if (item.linkPath) payload.linkPath = item.linkPath;

      await setDoc(doc(db, 'headlines', item.id), payload);
      onFeedback(
        'success',
        !item.isPublished
          ? 'শিরোনামটি ওয়েবসাইটে প্রকাশ করা হয়েছে।'
          : 'শিরোনামটি সাময়িকভাবে অপ্রকাশিত রাখা হয়েছে।'
      );
    } catch (err) {
      const msg = handleFirestoreError(err, OperationType.WRITE, `headlines/${item.id}`);
      onFeedback('error', msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (item: Headline, idx: number) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      badge: item.badge || '',
      linkPath: item.linkPath || '',
      orderNumber: item.orderNumber || idx + 1,
      isPublished: item.isPublished,
    });
  };

  const publishedCount = headlines.filter((h) => h.isPublished).length;

  return (
    <div className="space-y-6">
      {/* Live Preview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#DC2626]" />
            <h3 className="text-sm font-bold text-slate-900">লাইভ শিরোনাম বার প্রিভিউ</h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {publishedCount > 0
              ? `বর্তমানে ${toBengaliNumber(publishedCount)}টি প্রকাশিত শিরোনাম ওয়েবসাইটে চলছে`
              : 'কোনো প্রকাশিত শিরোনাম নেই — ওয়েবসাইটে ডিফল্ট স্বাগতম বার্তা চলছে'}
          </span>
        </div>
        <HeadlineTicker headlines={headlines} />
      </div>

      {/* Main CRUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add / Edit Headline */}
        <div className="lg:col-span-1 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
          <h3 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#078747]" />
            <span>{editingId ? 'শিরোনাম সম্পাদনা করুন' : 'নতুন শিরোনাম যুক্ত করুন'}</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Header-এর নিচে চলমান শিরোনাম বারে দেখানোর জন্য গুরুত্বপূর্ণ ঘোষণা বা খবর লিখুন।
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  শিরোনামের লেখা *
                </label>
                <span className="text-[11px] text-slate-400">
                  {toBengaliNumber(form.title.length)} / {toBengaliNumber(300)}
                </span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={300}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="যেমন: আগামী শুক্রবার কোদালপুর বাজারে ফ্রি মেডিকেল ক্যাম্প ও রক্তের গ্রুপ নির্ণয় কর্মসূচি অনুষ্ঠিত হবে।"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#078747]/30 focus:border-[#078747]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ছোট ব্যাজ / ট্যাগ (ঐচ্ছিক)
              </label>
              <input
                type="text"
                maxLength={40}
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="যেমন: ঘোষণা, জরুরি, সংবাদ"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#078747]/30 focus:border-[#078747]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BADGE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, badge: preset })}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                      form.badge === preset
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                {form.badge && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, badge: '' })}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    মুছুন
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ক্লিক করলে নির্দিষ্ট পেজ খুলবে (ঐচ্ছিক)
              </label>
              <select
                value={form.linkPath}
                onChange={(e) => setForm({ ...form, linkPath: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#078747]/30 focus:border-[#078747]"
              >
                {LINK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ক্রমিক নম্বর
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.orderNumber}
                  onChange={(e) => setForm({ ...form, orderNumber: Number(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#078747]/30 focus:border-[#078747]"
                />
              </div>

              <label className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-4 h-4 accent-[#078747] rounded"
                />
                <span className="text-xs font-semibold text-slate-700">প্রকাশিত রাখুন</span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 px-4 bg-[#078747] hover:bg-[#056032] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {saving
                  ? 'সংরক্ষণ হচ্ছে...'
                  : editingId
                  ? 'হালনাগাদ করুন'
                  : 'শিরোনাম যুক্ত করুন'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  বাতিল
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right List: Saved Headlines */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-900 text-lg">সংরক্ষিত শিরোনামের তালিকা</h3>
            <span className="text-xs font-semibold text-slate-500">
              মোট {toBengaliNumber(headlines.length)}টি
            </span>
          </div>

          {headlines.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                এখনও কোনো কাস্টম শিরোনাম যুক্ত করা হয়নি
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                বাম পাশের ফর্ম ব্যবহার করে নতুন শিরোনাম যুক্ত করুন। কোনো কাস্টম শিরোনাম না থাকলে ওয়েবসাইটে ডিফল্ট স্বাগতম বার্তা প্রদর্শিত হয়।
              </p>
            </div>
          ) : (
            headlines.map((item, idx) => (
              <div
                key={item.id}
                className={`bg-white p-4 rounded-xl border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  editingId === item.id
                    ? 'border-[#078747] ring-2 ring-[#078747]/15'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      #{toBengaliNumber(item.orderNumber || idx + 1)}
                    </span>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded bg-[#DC2626] text-white text-[11px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-[#078747] border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        প্রকাশিত
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                        <AlertCircle className="w-3 h-3" />
                        অপ্রকাশিত
                      </span>
                    )}
                    {item.linkPath && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                        <LinkIcon className="w-3 h-3" />
                        {item.linkPath}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-relaxed break-words">
                    {item.title}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={togglingId === item.id}
                    onClick={() => handleTogglePublish(item)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      item.isPublished
                        ? 'text-[#078747] hover:bg-emerald-50'
                        : 'text-amber-600 hover:bg-amber-50'
                    }`}
                    title={item.isPublished ? 'অপ্রকাশিত করুন' : 'প্রকাশ করুন'}
                  >
                    {item.isPublished ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(item, idx)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                    title="সম্পাদনা করুন"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete('headlines', item.id, item.title)}
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
    </div>
  );
};
