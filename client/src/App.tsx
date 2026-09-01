import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import StoreNavbar from './components/store/StoreNavbar';
import Home from './pages/Home';
import AuthGateway from './pages/AuthGateway';
import Dashboard from './pages/Dashboard';
import RedLightDistrict from './pages/RedLightDistrict';
import Vault from './pages/Vault';
import VaultMediaDetail from './pages/VaultMediaDetail';
import AdminDashboard from './pages/interpool/Admin';
import ForumHub from './pages/Forum';
import ForumThreadDetail from './pages/forum/ForumThreadDetails';
import Events from './pages/Events';
import GatekeeperScanner from './pages/interpool/GateKeeeperScanner';
import PaymentSuccess from './pages/events/PaymentSuccessful';
import Store from './pages/Store';
import ProductDetail from './pages/store/ProductDetails';
import StoreBag from './pages/store/StoreBag';
import ModeratorDashboard from './pages/interpool/ModeratorDashboard';

export type GuildType = 'blue' | 'red' | 'none'; 

function NavigationSwitcher({ guild, setGuild }: { guild: GuildType; setGuild: (g: GuildType) => void }) {
  const location = useLocation();
  const isStore = location.pathname.startsWith('/store');

  if (isStore) {
    return <StoreNavbar />;
  }
  return <Navbar guild={guild} setGuild={setGuild} />;
}

export default function App() {
  const [guild, setGuild] = useState<GuildType>('none');

  useEffect(() => {
    document.documentElement.setAttribute('data-guild', guild);
  }, [guild]);

  return (
    <Router>
      <div className="min-h-screen relative overflow-hidden transition-colors duration-500 bg-[#0f172a]">
        <div 
          className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen blur-[120px] opacity-20 animate-pulse pointer-events-none transition-colors duration-700" 
          style={{ backgroundColor: 'var(--guild-primary)' }} 
        />
        
        <div className="relative z-10 flex flex-col min-h-screen">
          <NavigationSwitcher guild={guild} setGuild={setGuild} />

          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<div className="pt-32 pb-20 flex flex-col gap-20"><Home guild={guild} /></div>} />
              <Route path="/auth" element={<AuthGateway guild={guild} />} />
              <Route path="/login" element={<AuthGateway guild={guild} />} />
              <Route path="/register" element={<AuthGateway guild={guild} />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/vault" element={<Vault />} />
              <Route path="/vault/:id" element={<VaultMediaDetail />} />
              <Route path="/forum" element={<ForumHub />} />
              <Route path="/forum/:id" element={<ForumThreadDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/interpool/gatekeeper" element={<GatekeeperScanner />} />
              <Route path="/events/payment-success" element={<PaymentSuccess />} />
              <Route path="/interpool/admin" element={<AdminDashboard />} />
              <Route path="/red-light-district" element={<RedLightDistrict />} />
              <Route path="/interpool/mod" element={<ModeratorDashboard />} />
              
              {/* Store & Bag Pages */}
              <Route path="/store" element={<Store />} />
              <Route path="/store/product/:slug" element={<ProductDetail />} />
              <Route path="/store/bag" element={<StoreBag />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}