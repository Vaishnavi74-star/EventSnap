import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafbfc]">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

