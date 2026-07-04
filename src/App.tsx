import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, useRouter, matchRoute, setParams } from './lib/router';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { queryClient } from './lib/query';
import { DesktopNav, BottomNav } from './components/Navigation';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SearchPage } from './pages/SearchPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { ChatListPage, ChatConversationPage } from './pages/ChatPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { ProfilePage } from './pages/ProfilePage';
import { SellerDashboard } from './pages/SellerDashboard';
import { CourierDashboard } from './pages/CourierDashboard';
import { StoreDetailPage } from './pages/StoreDetailPage';
import { SellerVouchersPage } from './pages/SellerVouchersPage';
import { WithdrawalPage } from './pages/WithdrawalPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

function Routes() {
  const { path } = useRouter();
  const { user, profile, loading } = useAuth();

  // Auth pages (no layout)
  if (path === '/login') return <LoginPage />;
  if (path === '/register') return <RegisterPage />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Protected routes
  const protectedRoutes = ['/cart', '/wishlist', '/chat', '/notifications', '/orders', '/profile', '/seller', '/courier', '/checkout'];
  const isProtected = protectedRoutes.some((r) => path === r || path.startsWith(r + '/'));
  if (isProtected && !user) return <LoginPage />;

  // Role-protected
  if ((path === '/seller' || path.startsWith('/seller/')) && profile?.role !== 'seller') return <HomePage />;
  if ((path === '/courier' || path.startsWith('/courier/')) && profile?.role !== 'courier') return <HomePage />;

  let page: React.ReactNode = <HomePage />;

  if (path === '/') page = <HomePage />;
  else if (path === '/search') page = <SearchPage />;
  else if (matchRoute('/product/:id', path)) {
    const params = matchRoute('/product/:id', path)!;
    setParams(params);
    page = <ProductDetailPage key={params.id} />;
  }
  else if (matchRoute('/store/:storeId', path)) {
    const params = matchRoute('/store/:storeId', path)!;
    setParams(params);
    page = <StoreDetailPage key={params.storeId} />;
  }
  else if (path === '/cart' || path === '/checkout') page = <CartPage />;
  else if (path === '/wishlist') page = <WishlistPage />;
  else if (path === '/chat') page = <ChatListPage />;
  else if (matchRoute('/chat/:id', path)) {
    const params = matchRoute('/chat/:id', path)!;
    setParams(params);
    page = <ChatConversationPage key={params.id} />;
  }
  else if (path === '/notifications') page = <NotificationsPage />;
  else if (path === '/orders') page = <OrdersPage />;
  else if (matchRoute('/orders/:id', path)) {
    const params = matchRoute('/orders/:id', path)!;
    setParams(params);
    page = <OrderTrackingPage key={params.id} />;
  }
  else if (path === '/profile') page = <ProfilePage />;
  else if (path === '/seller') page = <SellerDashboard />;
  else if (path === '/seller/vouchers') page = <SellerVouchersPage />;
  else if (path === '/seller/withdrawal') page = <WithdrawalPage role="seller" />;
  else if (path === '/courier') page = <CourierDashboard />;
  else if (path === '/courier/withdrawal') page = <WithdrawalPage role="courier" />;
  else if (path === '/admin/settings') page = <AdminSettingsPage />;
  else page = <HomePage />;

  // Chat conversation is full-screen, no nav
  const isChatConv = matchRoute('/chat/:id', path) !== null;

  if (isChatConv) return <>{page}</>;

  return (
    <div className="min-h-screen">
      <DesktopNav />
      <motion.main
        key={path}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {page}
      </motion.main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes />
          </ToastProvider>
        </AuthProvider>
      </RouterProvider>
    </QueryClientProvider>
  );
}
