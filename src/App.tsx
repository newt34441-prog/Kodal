import { lazy, Suspense, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase/config';
import { AuthProvider } from './context/AuthContext';
import { useRouter } from './hooks/useRouter';
import { FoundationInfo, Headline, SiteAsset } from './types';
import { Header } from './components/common/Header';
import { HeadlineTicker } from './components/common/HeadlineTicker';
import { Footer } from './components/common/Footer';
import { AppUpdatePrompt } from './components/common/AppUpdatePrompt';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { HomePage } from './pages/HomePage';
import { DonationsPage } from './pages/DonationsPage';
import { MembersPage } from './pages/MembersPage';
import { AccountsPage } from './pages/AccountsPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { AboutPage } from './pages/AboutPage';
import { BloodDonorsPage } from './pages/BloodDonorsPage';
import { handleFirestoreError, OperationType, onQuotaExceededChange } from './firebase/errorHandler';
import { AlertCircle } from 'lucide-react';

const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);

function MainApp() {
  const { currentPath, navigate } = useRouter();
  const [foundationInfo, setFoundationInfo] = useState<FoundationInfo | null>(null);
  const [heroBanner, setHeroBanner] = useState<SiteAsset | null>(() => {
    try {
      const cached = localStorage.getItem('kmf_cached_hero_banner');
      return cached ? (JSON.parse(cached) as SiteAsset) : null;
    } catch {
      return null;
    }
  });
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const unsubQuota = onQuotaExceededChange((exceeded) => {
      setQuotaExceeded(exceeded);
    });
    return () => unsubQuota();
  }, []);

  useEffect(() => {
    // Check if the app was automatically refreshed with a new code/design build
    if (sessionStorage.getItem('kmf_app_just_updated') === 'true') {
      sessionStorage.removeItem('kmf_app_just_updated');
      setUpdateNotification('অ্যাপ্লিকেশনটি সর্বশেষ সংস্করণে সফলভাবে অটো-আপডেট হয়েছে।');
      const timer = setTimeout(() => setUpdateNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Listen for foundation information (name, logo, address, motto, intro)
    const unsub = onSnapshot(
      doc(db, 'foundationInfo', 'main'),
      (docSnap) => {
        if (docSnap.exists()) {
          setFoundationInfo(docSnap.data() as FoundationInfo);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.READ, 'foundationInfo/main');
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    // Listen for live updates to homepage hero banner
    const unsubHero = onSnapshot(
      doc(db, 'siteAssets', 'heroBanner'),
      (docSnap) => {
        if (docSnap.exists()) {
          const asset = docSnap.data() as SiteAsset;
          setHeroBanner(asset);
          try {
            localStorage.setItem('kmf_cached_hero_banner', JSON.stringify(asset));
          } catch {
            // ignore storage quota errors
          }
        } else {
          setHeroBanner(null);
          try {
            localStorage.removeItem('kmf_cached_hero_banner');
          } catch {
            // ignore storage errors
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.READ, 'siteAssets/heroBanner');
      }
    );

    return () => unsubHero();
  }, []);

  useEffect(() => {
    // Listen for published headlines for the scrolling ticker bar
    const q = query(collection(db, 'headlines'), where('isPublished', '==', true));
    const unsubHeadlines = onSnapshot(
      q,
      (snapshot) => {
        const list: Headline[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Headline, 'id'>) });
        });
        list.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        setHeadlines(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'headlines');
      }
    );

    return () => unsubHeadlines();
  }, []);

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return <HomePage onNavigate={navigate} info={foundationInfo} heroBanner={heroBanner} />;
      case '/donations':
        return <DonationsPage onNavigate={navigate} />;
      case '/members':
        return <MembersPage onNavigate={navigate} />;
      case '/accounts':
        return <AccountsPage onNavigate={navigate} />;
      case '/activities':
        return <ActivitiesPage onNavigate={navigate} />;
      case '/policies':
        return <PoliciesPage onNavigate={navigate} />;
      case '/about':
        return <AboutPage onNavigate={navigate} info={foundationInfo} />;
      case '/blood-donors':
        return <BloodDonorsPage onNavigate={navigate} />;
      case '/admin':
        return (
          <Suspense
            fallback={
              <div className="py-20">
                <LoadingSpinner text="অ্যাডমিন প্যানেল লোড হচ্ছে..." />
              </div>
            }
          >
            <AdminPage onNavigate={navigate} info={foundationInfo} heroBanner={heroBanner} />
          </Suspense>
        );
      default:
        return <HomePage onNavigate={navigate} info={foundationInfo} heroBanner={heroBanner} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FC] text-slate-900 selection:bg-[#0B376B] selection:text-white relative">
      {quotaExceeded && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm z-50">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            ফায়ারবেস ফ্রি রিড কোটা সাময়িকভাবে পূর্ণ হয়েছে (Daily Quota Limit)। সর্বশেষ সংরক্ষিত তথ্য প্রদর্শিত হচ্ছে এবং আগামীকাল কোটা স্বয়ংক্রিয়ভাবে রিসেট হবে।
          </span>
        </div>
      )}
      <Header currentPath={currentPath} onNavigate={navigate} info={foundationInfo} />
      {currentPath !== '/admin' && (
        <HeadlineTicker headlines={headlines} onNavigate={navigate} />
      )}
      <main className="flex-1">{renderCurrentPage()}</main>
      <Footer onNavigate={navigate} info={foundationInfo} />

      {/* Interactive update prompt for installed APK/PWA & web */}
      <AppUpdatePrompt />

      {/* Auto-update confirmation toast */}
      {updateNotification && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 bg-[#0B376B] text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-emerald-400/40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-5 h-5 rounded-full bg-[#078747] flex items-center justify-center text-white shrink-0">
            ✓
          </div>
          <span>{updateNotification}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
