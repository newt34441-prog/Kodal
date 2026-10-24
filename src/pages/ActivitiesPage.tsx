import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowLeft, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Activity } from '../types';
import { formatBengaliDate, getActivityStatusLabel } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

interface ActivitiesPageProps {
  onNavigate: (path: string) => void;
}

export const ActivitiesPage: React.FC<ActivitiesPageProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    // Only published activities for public view
    const q = query(collection(db, 'activities'), where('isPublished', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Activity[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Activity, 'id'>) });
        });
        // Sort by date descending
        docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setActivities(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'activities');
      }
    );

    return () => unsubscribe();
  }, []);

  const filtered = activities.filter((act) => {
    return statusFilter === 'all' || act.status === statusFilter;
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">আমাদের কার্যক্রম</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            মানবিক সহায়তা, উন্নয়ন ও কল্যাণমূলক পদক্ষেপসমূহ
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      {activities.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-950 text-white border-blue-950'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            সকল কার্যক্রম
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            সম্পন্ন
          </button>
          <button
            onClick={() => setStatusFilter('ongoing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'ongoing'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            চলমান
          </button>
          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'upcoming'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            আসন্ন
          </button>
        </div>
      )}

      {/* Activities Grid */}
      {loading ? (
        <LoadingSpinner text="কার্যক্রমের তথ্য লোড হচ্ছে..." />
      ) : activities.length === 0 ? (
        <EmptyState
          message="এখনও কোনো কার্যক্রম প্রকাশ করা হয়নি।"
          subMessage="ফাউন্ডেশনের মানবিক পদক্ষেপ এবং সেবা কার্যক্রম শীঘ্রই এখানে প্রকাশিত হবে।"
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="নির্বাচিত বিভাগে কোনো কার্যক্রম পাওয়া যায়নি।" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((activity) => {
            const statusStyle = getActivityStatusLabel(activity.status);
            return (
              <div
                key={activity.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {activity.photoUrl && (
                    <div className="h-48 w-full overflow-hidden bg-slate-100">
                      <img
                        src={activity.photoUrl}
                        alt={activity.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusStyle.bgClass} ${statusStyle.textClass}`}
                      >
                        {statusStyle.label}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatBengaliDate(activity.date)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg mb-2 leading-snug">
                      {activity.title}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{activity.location}</span>
                    </p>

                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => setSelectedActivity(activity)}
                    className="w-full py-2 px-3 text-xs font-semibold text-blue-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    বিস্তারিত দেখুন
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            {selectedActivity.photoUrl && (
              <img
                src={selectedActivity.photoUrl}
                alt={selectedActivity.title}
                className="w-full h-52 object-cover rounded-xl mb-4"
              />
            )}

            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  getActivityStatusLabel(selectedActivity.status).bgClass
                } ${getActivityStatusLabel(selectedActivity.status).textClass}`}
              >
                {getActivityStatusLabel(selectedActivity.status).label}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatBengaliDate(selectedActivity.date)}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {selectedActivity.title}
            </h3>

            <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>{selectedActivity.location}</span>
            </p>

            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-6">
              {selectedActivity.description}
            </div>

            <button
              onClick={() => setSelectedActivity(null)}
              className="w-full py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
