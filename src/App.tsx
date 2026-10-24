import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';
import { AuthProvider } from './context/AuthContext';
import { useRouter } from './hooks/useRouter';
import { FoundationInfo } from './types';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { DonationsPage } from './pages/DonationsPage';
import { MembersPage } from './pages/MembersPage';
import { AccountsPage } from './pages/AccountsPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { AboutPage } from './pages/AboutPage';
import { BloodDonorsPage } from './pages/BloodDonorsPage';
import { AdminPage } from './pages/AdminPage';

function MainApp() {
  const { currentPath, navigate } = useRouter();
  const [foundationInfo, setFoundationInfo] = useState<FoundationInfo | null>(null);

  useEffect(() => {
    // Listen for foundation information (name, logo, address, motto, intro)
    const unsub = onSnapshot(doc(db, 'foundationInfo', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setFoundationInfo(docSnap.data() as FoundationInfo);
      }
    });

    return () => unsub();
  }, []);

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return <HomePage onNavigate={navigate} info={foundationInfo} />;
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
        return <AdminPage onNavigate={navigate} info={foundationInfo} />;
      default:
        return <HomePage onNavigate={navigate} info={foundationInfo} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FC] text-slate-900 selection:bg-[#0B376B] selection:text-white">
      <Header currentPath={currentPath} onNavigate={navigate} info={foundationInfo} />
      <main className="flex-1">{renderCurrentPage()}</main>
      <Footer onNavigate={navigate} />
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
