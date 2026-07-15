/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  Terminal, ShieldCheck, Bell, Wifi, WifiOff, LogOut, LayoutDashboard, 
  ShoppingCart, Package, Truck, CreditCard, History, Settings, Check, 
  Activity, Menu, Lock 
} from 'lucide-react';

// Components
import Dashboard from './components/Dashboard';
import POSScreen from './components/POSScreen';
import ReceiptModal from './components/ReceiptModal';
import ProductCatalog from './components/ProductCatalog';
import InventoryManager from './components/InventoryManager';
import UtangManager from './components/UtangManager';
import SupplierProfiles from './components/SupplierProfiles';
import SuperAdminPanel from './components/SuperAdminPanel';

// Types
import { 
  User, Product, Category, Supplier, Order, HeldTransaction, 
  Expense, SystemSettings, SystemNotification, AuditLog, SentEmail, CreditRecord
} from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 3000
    }
  }
});

function AppContent() {
  const [activeView, setActiveView] = useState<string>('Dashboard');

  // Prevent navigation changes while receipt modal is visible.
  // This stops the UI from switching back to Dashboard right after finalize.
  const setActiveViewWhileReceiptGuard = (next: string) => {
    if (showReceipt) return;
    setActiveView(next);
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Auth state
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem('activeUser');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [isForgotPin, setIsForgotPin] = useState(false);
  const [is2FAVisible, setIs2FAVisible] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  // Offline Mode state
  const [offlineMode, setOfflineMode] = useState(false);

  // Notifications drawer toggler
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Active loaded data state
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [creditRecords, setCreditRecords] = useState<CreditRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'Red Ant Store',
    address: '88 Earth Tone Boulevard, Design District, Manila',
    phone: '+63 2 8123 4567',
    email: 'hello@terracottacafe.com',
    taxRate: 12,
    serviceChargeRate: 5,
    currency: '₱',
    timezone: 'Asia/Manila',
    language: 'English',
    storeLogoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100',
    receiptLogoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100',
    receiptFooter: 'Thank you for supporting sustainable design and single-origin craft.',
    enableSMS: true,
    enableEmail: true,
    enable2FA: false,
    printerIp: '192.168.1.250',
    barcodeFormat: 'EAN-13'
  });
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    cards: {
      todaySales: 0,
      todayProfit: 0,
      monthlySales: 0,
      monthlyProfit: 0,
      totalOrdersCount: 0,
      pendingOrdersCount: 0,
      totalProductsCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalSuppliersCount: 0,
      inventoryValue: 0,
      totalExpenses: 0
    },
    topSellingProducts: [],
    categoryBreakdown: [],
    historicalChartPoints: [],
    recentTransactions: []
  });

  // Modal receipt state — use ref to prevent stale closure wipes
  const receiptRef = useRef<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // App-level Toast messages list
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'error' }>>([]);
  
  // Simulated automated email system outbox state
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev: Array<{ id: string; message: string; type: 'success' | 'info' | 'error' }>) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev: Array<{ id: string; message: string; type: 'success' | 'info' | 'error' }>) => prev.filter((t: { id: string }) => t.id !== id));
    }, 4000);
  };

  // Fetch initial data from APIs
  const fetchWithAuth = (url: string, options: RequestInit = {}) => {
    const role = activeUser?.role || 'Cashier';
    const id = activeUser?.id || '';
    const headers = {
      ...(options.headers || {}),
      'x-user-role': role,
      'x-user-id': id
    };

    return fetch(url, { ...options, headers });
  };

  const fetchAllData = async () => {
    try {
      const safeJson = async (url: string) => {
        try {
          const r = await fetchWithAuth(url);
          return r.ok ? r.json() : null;
        } catch { return null; }
      };

      const [usersRes, productsRes, categoriesRes, suppliersRes, ordersRes,
        heldRes, expensesRes, creditsRes, settingsRes,
        notificationsRes, logsRes, analyticsRes, sentEmailsRes] = await Promise.all([
        safeJson('/api/auth/users'), safeJson('/api/products'),
        safeJson('/api/categories'), safeJson('/api/suppliers'),
        safeJson('/api/orders'), safeJson('/api/held-transactions'),
        safeJson('/api/expenses'), safeJson('/api/credits'),
        safeJson('/api/settings'),
        safeJson('/api/notifications'), safeJson('/api/audit-logs'),
        safeJson('/api/reports/analytics'), safeJson('/api/sent-emails')
      ]);

      if (usersRes) { setUsers(usersRes); if (!loginEmail && usersRes.length > 0) setLoginEmail(usersRes[0].email); }
      if (productsRes) setProducts(productsRes);
      if (categoriesRes) setCategories(categoriesRes);
      if (suppliersRes) setSuppliers(suppliersRes);
      if (ordersRes) setOrders(ordersRes);
      if (heldRes) setHeldTransactions(heldRes);
      if (expensesRes) setExpenses(expensesRes);
      if (creditsRes) setCreditRecords(creditsRes);
      if (settingsRes) setSettings(settingsRes);
      if (notificationsRes) setNotifications(notificationsRes);
      if (logsRes) setAuditLogs(logsRes);
      if (analyticsRes) setAnalytics(analyticsRes);
      setSentEmails(sentEmailsRes || []);
    } catch (err) {
      console.warn('fetchAllData error:', err);
    }
  };

  useEffect(() => {
    fetch('/api/auth/users').then(r => r.ok ? r.json() : []).then(data => {
      if (data.length > 0) {
        setUsers(data);
        setLoginEmail(data[0].email);
      }
    }).catch(() => {});
  }, []);

  // Sync back to online state handler
  const handleOfflineToggle = () => {
    setOfflineMode((prev: boolean) => {
      const next = !prev;
      if (!next) {
        showToast('Online connection restored. Synchronized register sales with terminal database.', 'success');
        fetchAllData(); // Refresh datasets
      } else {
        showToast('Offline Mode Activated. Sales logged locally inside terminal cache.', 'info');
      }
      return next;
    });
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPin) {
      showToast('PIN security credential required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, pin: loginPin })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Check if 2FA is needed
        if (data.user.is2FAEnabled) {
          setIs2FAVisible(true);
          showToast('Authentication PIN correct. OTP code dispatched.', 'info');
        } else {
          sessionStorage.setItem('activeUser', JSON.stringify(data.user));
          setActiveUser(data.user);
          showToast(`Welcome back, ${data.user.name}! Session initialized.`, 'success');
          if (data.user.role === 'Cashier') {
            setActiveView('POS');
          } else if (data.user.role === 'Accountant') {
            setActiveView('Utang');
          } else {
            setActiveView('Dashboard');
          }
        }
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      showToast('Login server connection failed.', 'error');
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFACode.length === 4) {
      const matchedUser = { id: 'usr_1', name: 'Melliza Perlayo', email: loginEmail, role: 'Super Admin' as any, pin: '', avatarUrl: '', is2FAEnabled: true };
      sessionStorage.setItem('activeUser', JSON.stringify(matchedUser));
      setActiveUser(matchedUser);
      setIs2FAVisible(false);
      setTwoFACode('');
      showToast(`Welcome ${matchedUser.name}!`, 'success');
      setActiveView('Dashboard');
    } else {
      showToast('Enter a valid 4-digit OTP.', 'error');
    }
  };

  // Log Out
  const handleLogout = () => {
    sessionStorage.removeItem('activeUser');
    setActiveUser(null);
    setLoginPin('');
    setIs2FAVisible(false);
    setTwoFACode('');
    showToast('Secure terminal session cleared.', 'info');
  };

  // API operations wrapper
  const handleAddProduct = async (prodPayload: any) => {
    const res = await fetchWithAuth('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prodPayload)
    });
    if (res.ok) {
      fetchAllData();
      return await res.json();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || `Failed to add product (${res.status}).`, 'error');
    }
  };

  const handleUpdateProduct = async (id: string, prodPayload: any) => {
    const res = await fetchWithAuth(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prodPayload)
    });
    if (res.ok) {
      fetchAllData();
      return await res.json();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || `Failed to update product (${res.status}).`, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetchWithAuth(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAllData();
      return await res.json();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || `Failed to delete product (${res.status}).`, 'error');
    }
  };

  const handleAddCategory = async (catPayload: any) => {
    const res = await fetchWithAuth('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catPayload)
    });
    if (res.ok) {
      fetchAllData();
      return await res.json();
    }
  };

  const handleRecordSale = async (salePayload: any) => {
    // If offline, simulate local record
    if (offlineMode) {
      const simulatedReceipt = `TR-${100000 + orders.length + 1}`;
      const mockOrder: Order = {
        id: `ord_offline_${Date.now()}`,
        receiptNumber: simulatedReceipt,
        timestamp: new Date().toISOString(),
        cashierId: activeUser?.id || 'usr_3',
        cashierName: activeUser?.name || 'Elena Rostova',
        branchId: 'BR-01',
        items: salePayload.items,
        subtotal: salePayload.subtotal,
        taxTotal: salePayload.taxTotal,
        serviceCharge: salePayload.serviceCharge,
        discountTotal: salePayload.discountTotal,
        grandTotal: salePayload.grandTotal,
        payments: salePayload.payments,
        amountPaid: salePayload.amountPaid,
        changeAmount: salePayload.changeAmount,
        status: 'Completed',
        notes: salePayload.notes
      };

      setOrders(prev => [mockOrder, ...prev]);
      showToast(`Logged Offline Sale: ${simulatedReceipt}`, 'success');
      return mockOrder;
    }

    const res = await fetchWithAuth('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...salePayload,
        cashierId: activeUser?.id,
        cashierName: activeUser?.name
      })
    });
    if (res.ok) {
      const registeredOrder = await res.json();
      // Important: do not refresh navigation state here.
      // Receipt modal visibility is controlled only by `showReceipt`.
      return registeredOrder;
    }
  };

  const handleHoldTransaction = async (items: any[], notes?: string) => {
    const res = await fetchWithAuth('/api/held-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        notes,
        cashierName: activeUser?.name
      })
    });
    if (res.ok) {
      showToast('Cart transaction placed on hold.', 'success');
      fetchAllData();
    }
  };

  const handleResumeTransaction = async (heldId: string) => {
    const res = await fetchWithAuth(`/api/held-transactions/${heldId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAllData();
    }
  };

  const handleUpdateStock = async (prodId: string, finalStock: number, reason: string) => {
    const res = await fetchWithAuth(`/api/products/${prodId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: finalStock })
    });
    if (res.ok) {
      fetchAllData();
    }
  };

  const handleAddExpense = async (expPayload: any) => {
    const res = await fetchWithAuth('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expPayload)
    });
    if (res.ok) {
      fetchAllData();
    }
  };

  const handleBackupDB = async () => {
    const res = await fetchWithAuth('/api/settings/backup', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      showToast(`Database backup generated: ${data.filename}`, 'success');
      fetchAllData();
    }
  };

  const handleUpdateSettings = async (settingsPayload: any) => {
    const res = await fetchWithAuth('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsPayload)
    });
    if (res.ok) {
      showToast('Store metadata updated successfully.', 'success');
      fetchAllData();
    }
  };

  // Super Admin specific handlers
  const handleUpdateOrderStatus = async (orderId: string, status: string, refundReason?: string) => {
    const res = await fetchWithAuth(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        refundReason,
        cashierId: activeUser?.id,
        cashierName: activeUser?.name,
        role: activeUser?.role
      })
    });
    if (res.ok) {
      showToast(`Order ${status.toLowerCase()} successfully.`, 'success');
      fetchAllData();
    }
  };

  const handleUpdateUser = async (userId: string, userPayload: any) => {
    const res = await fetchWithAuth(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    if (res.ok) {
      showToast('User updated successfully.', 'success');
      fetchAllData();
      fetchStaff();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const res = await fetchWithAuth(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('User deleted.', 'info');
      fetchAllData();
      fetchStaff();
    }
  };

  const [staffList, setStaffList] = useState<User[]>([]);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'Cashier', pin: '' });
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [showPinFor, setShowPinFor] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      const res = await fetchWithAuth('/api/users');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.warn('fetchStaff error:', err);
    }
  };

  // Load all data once when activeUser is set
  useEffect(() => {
    if (activeUser) {
      fetchAllData();
      fetchStaff();
    }
  }, [activeUser?.id]);

  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.email || !staffForm.pin) {
      showToast('Name, email and PIN are required.', 'error'); return;
    }
    if (staffForm.pin.length !== 4 || !/^\d{4}$/.test(staffForm.pin)) {
      showToast('PIN must be exactly 4 digits.', 'error'); return;
    }
    if (editingStaff) {
      await fetchWithAuth(`/api/users/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStaff.name,
          email: editingStaff.email,
          role: editingStaff.role,
          ...(editingStaff.pin ? { pin: editingStaff.pin } : {})
        })
      });
      showToast('Staff updated successfully.', 'success');
    } else {
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error, 'error'); return; }
      showToast('Staff account created.', 'success');
    }
    setStaffForm({ name: '', email: '', role: 'Cashier', pin: '' });
    setEditingStaff(null);
    fetchStaff();
    fetchAllData();
  };

  const handleDeleteStaff = async (id: string) => {
    if (id === activeUser?.id) { showToast('Cannot delete your own account.', 'error'); return; }
    await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
    showToast('Staff removed.', 'info');
    fetchStaff();
    fetchAllData();
  };

  const markAllNotificationsRead = async () => {
    await fetchWithAuth('/api/notifications/read-all', { method: 'PUT' });
    fetchAllData();
    setIsNotificationsOpen(false);
  };

  // Nav configuration based on employee permission role
  const checkPermission = (viewName: string) => {
    if (!activeUser) return false;
    const role = activeUser.role;

    if (role === 'Super Admin' || role === 'Admin') {
      if (viewName === 'Super Admin') return true;
      return ['Dashboard', 'POS', 'Products', 'Inventory', 'Suppliers', 'Utang', 'Audit Logs', 'Settings'].includes(viewName);
    }
    if (role === 'Cashier') {
      return ['POS', 'Utang'].includes(viewName);
    }
    if (role === 'Inventory Manager') {
      return ['Dashboard', 'Products', 'Inventory', 'Suppliers', 'AuditLogs'].includes(viewName);
    }
    if (role === 'Accountant') {
      return ['Dashboard', 'Utang', 'Suppliers', 'AuditLogs'].includes(viewName);
    }
    return false;
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'POS', icon: ShoppingCart },
    { name: 'Products', icon: Package },
    { name: 'Inventory', icon: Activity },
    { name: 'Suppliers', icon: Truck },
    { name: 'Utang', icon: CreditCard },
    { name: 'Audit Logs', icon: History },
    { name: 'Super Admin', icon: ShieldCheck },
    { name: 'Settings', icon: Settings }
  ];

  // If user is not logged in, render the Gorgeous Earth Tone Login Screen!
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center p-4 selection:bg-amber-100 selection:text-amber-900 font-sans">
        
        {/* Toast notifications container */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
          {toasts.map((t: { id: string; message: string; type: 'success' | 'info' | 'error' }) => (
            <div 
              key={t.id} 
              className={`p-3.5 rounded-xl border shadow-md flex items-start gap-2.5 animate-fade-in ${
                t.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                t.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                'bg-amber-50 border-amber-100 text-amber-800'
              }`}
            >
              <div className="flex-1 text-xs font-semibold">{t.message}</div>
            </div>
          ))}
        </div>

        {/* Corporate branding header */}
        <div className="text-center mb-6 max-w-md">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="p-2 bg-amber-800 text-amber-50 rounded-xl shadow-xs">
              <Terminal className="w-6 h-6 stroke-1.5" />
            </span>
            <h1 className="text-xl font-black text-amber-950 uppercase tracking-tight">Red Ant Store</h1>
          </div>
          <p className="text-xs text-stone-500 font-medium leading-tight">Artisanal Sourcing & Specialty POS System Terminal</p>
        </div>

        {/* Glassmorphic Login card */}
        <div className="bg-white border border-stone-200/80 shadow-md rounded-2xl max-w-sm w-full p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-800 via-stone-700 to-amber-700"></div>

          {!isForgotPin && !is2FAVisible && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-stone-900">Sign In to Register</h3>
                <p className="text-[11px] text-stone-400 mt-0.5">Please select your account and enter security PIN</p>
              </div>

              {/* Account selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Select Employee Roster</label>
                <select 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:outline-none"
                >
                  {users.length > 0 ? users.map(u => (
                    <option key={u.id} value={u.email}>{u.name} ({u.role})</option>
                  )) : (
                    <option value="melliza@redantstore.com">Melliza Perlayo (Super Admin)</option>
                  )}
                </select>
              </div>

              {/* Pin code entry */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Security PIN Code</label>
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPin(true)}
                    className="text-[10px] text-amber-800 hover:underline font-bold"
                  >
                    Forgot PIN?
                  </button>
                </div>
                
                <input 
                  type="password" 
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••"
                  className="bg-stone-50 border border-stone-200 rounded-xl py-3 text-center text-lg font-black tracking-widest text-amber-950 focus:outline-none font-mono"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-800 hover:bg-amber-900 text-stone-100 font-bold py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1"
              >
                Unlock POS Terminal <Check className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Forgot PIN Flow */}
          {isForgotPin && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-stone-900">PIN Code Recoveries</h3>
                <p className="text-[11px] text-stone-400 mt-0.5">Please contact Sofia Loren (Super Admin) or input corporate recovery email</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Recovery Email</label>
                <input 
                  type="email" 
                  placeholder="sofia@terracotta.com"
                  className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <button 
                onClick={() => {
                  showToast('Verification email dispatched to corporate inbox.', 'success');
                  setIsForgotPin(false);
                }}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Send Verification Link
              </button>
              
              <button 
                onClick={() => setIsForgotPin(false)}
                className="w-full text-stone-500 hover:text-stone-900 text-xs font-semibold py-1 transition"
              >
                Go Back
              </button>
            </div>
          )}

          {/* 2FA OTP Code Verify screen */}
          {is2FAVisible && (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-stone-900 flex items-center justify-center gap-1.5">
                  <Lock className="w-5 h-5 text-amber-800" /> 2-Factor Authentication
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">Enter the 4-digit code dispatched to your registered email</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase">4-Digit OTP Code</label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  placeholder="0000"
                  className="bg-stone-50 border border-stone-200 rounded-xl py-2.5 text-center text-lg font-mono font-black tracking-widest text-stone-900 focus:outline-none"
                  required
                />
              </div>

              <div className="text-[10px] text-stone-400 text-center">
                Didn't get code? <button type="button" onClick={() => showToast('Simulated SMS gateway: code re-dispatched to email.', 'success')} className="text-amber-800 font-bold hover:underline">Resend OTP</button>
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm"
              >
                Verify & Initialize Terminal
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // Active user's interface
  return (
    <div className={`min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900`}>
      
      {/* Toast notifications container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {toasts.map((t: { id: string; message: string; type: 'success' | 'info' | 'error' }) => (
          <div 
            key={t.id} 
            className={`p-3.5 rounded-xl border shadow-md flex items-start gap-2.5 animate-fade-in ${
              t.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
              t.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
              'bg-amber-50 border-amber-100 text-amber-800'
            }`}
          >
            <div className="flex-1 text-xs font-semibold">{t.message}</div>
          </div>
        ))}
      </div>

      {/* TOP HEADER NAVIGATION BAR */}
      <header className="bg-white border-b border-stone-200/80 px-4 py-3 shrink-0 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarCollapsed((prev: boolean) => !prev)}
            className="text-stone-500 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-50 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 bg-amber-800 text-amber-50 rounded-lg shadow-xs shrink-0">
              <Terminal className="w-4 h-4" />
            </span>
            <h1 className="text-sm font-black text-amber-950 uppercase tracking-tight hidden sm:block">Red Ant Store</h1>
          </div>

          <span className="text-xs text-stone-300 hidden md:inline">|</span>

          {/* Connection Status & Offline Toggle */}
          <button 
            onClick={handleOfflineToggle}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition ${
              offlineMode 
                ? 'bg-red-50 text-red-700 border border-red-100' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}
            title="Toggle Offline mode simulator"
          >
            {offlineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5" /> Offline Sandbox
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" /> Terminal Sync Online
              </>
            )}
          </button>
        </div>

        {/* RIGHT METRICS: cashier profile, logs switcher, notification */}
        <div className="flex items-center gap-3">
          
          {/* Notification Center */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen((prev: boolean) => !prev)}
              className="p-1.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition text-stone-600 relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black font-mono text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Notifications drop menu */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2.5 bg-white border border-stone-200 p-4 rounded-xl shadow-xl w-72 z-40 space-y-3">
                <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                  <span className="text-xs font-bold text-stone-900">Notifications ({notifications.filter(n => !n.isRead).length})</span>
                  <button onClick={markAllNotificationsRead} className="text-[10px] text-amber-800 font-bold hover:underline">Mark read</button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="text-[10px] space-y-0.5 leading-normal border-b border-stone-50 pb-1.5">
                      <p className={`font-bold ${n.isRead ? 'text-stone-500' : 'text-stone-900'}`}>{n.title}</p>
                      <p className="text-stone-500">{n.message}</p>
                      <p className="text-[8px] text-stone-400">{new Date(n.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-center text-xs text-stone-400 py-4">No recent alerts.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cashier profile avatar */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <h4 className="text-xs font-bold text-stone-900 leading-none">{activeUser.name}</h4>
              <span className="text-[9px] text-stone-500 font-semibold">{activeUser.role}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-600 hover:text-red-700 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER WITH SIDEBAR & VIEWPORT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLLAPSIBLE SIDEBAR PANEL */}
        <aside 
          className={`bg-white border-r border-stone-250 transition-all duration-300 flex flex-col justify-between shrink-0 ${
            isSidebarCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          {/* Nav Links */}
          <nav className="p-3.5 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const hasAccess = checkPermission(item.name);
              const isActive = activeView === item.name;

              if (!hasAccess) return null;

              return (
                <button 
                  key={item.name}
                  onClick={() => {
                    setActiveView(item.name);
                    setIsNotificationsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive 
                      ? 'bg-amber-800 text-stone-50 shadow-xs' 
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </button>
              );
            })}
          </nav>

          {/* Footer of sidebar */}
          <div className="p-4 border-t border-stone-100 text-center">
            <p className="text-[9px] font-mono font-medium text-stone-400">
              {isSidebarCollapsed ? 'v1.4' : 'Red Ant Store POS v1.4'}
            </p>
          </div>
        </aside>

        {/* VIEWPORT CONTROLLER */}
        <main className="flex-1 overflow-y-auto p-6 bg-stone-50 selection:bg-amber-100">
          
          {/* VIEW ROUTER */}
          {activeView === 'Dashboard' && checkPermission('Dashboard') && (
            <Dashboard 
              analytics={analytics} 
              products={products}
              currency={settings.currency}
              onNavigate={(view) => setActiveView(view)}
              userRole={activeUser.role}
              auditLogs={auditLogs}
              onRefresh={fetchAllData}
            />
          )}

          {activeView === 'POS' && checkPermission('POS') && (
            <POSScreen 
              products={products}
              categories={categories}
              heldTransactions={heldTransactions}
              currency={settings.currency}
              taxRate={settings.taxRate}
              serviceChargeRate={settings.serviceChargeRate}
              cashierName={activeUser.name}
              cashierId={activeUser.id}
              onRecordSale={handleRecordSale}
              onHoldTransaction={handleHoldTransaction}
              onResumeTransaction={handleResumeTransaction}
              onShowReceipt={(order) => { receiptRef.current = order; setShowReceipt(true); }}
              showToast={showToast}
            />
          )}

          {activeView === 'Products' && checkPermission('Products') && (
            <ProductCatalog 
              products={products}
              categories={categories}
              suppliers={suppliers}
              currency={settings.currency}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              showToast={showToast}
            />
          )}

          {activeView === 'Inventory' && checkPermission('Inventory') && (
            <InventoryManager 
              products={products}
              suppliers={suppliers}
              currency={settings.currency}
              onUpdateStock={handleUpdateStock}
              showToast={showToast}
              sentEmails={sentEmails}
              onTriggerTestEmail={async () => {
                const res = await fetchWithAuth('/api/sent-emails/test', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  showToast(data.message || 'Simulated low stock priority report triggered!', 'success');
                  fetchAllData();
                } else {
                  showToast('Failed to trigger simulated low stock alert email.', 'error');
                }
              }}
            />
          )}

          {activeView === 'Suppliers' && checkPermission('Suppliers') && (
            <SupplierProfiles 
              suppliers={suppliers}
              currency={settings.currency}
              onAddSupplier={async (sup) => {
                const res = await fetchWithAuth('/api/suppliers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sup)
                });
                if (res.ok) fetchAllData();
              }}
              showToast={showToast}
            />
          )}

          {activeView === 'Utang' && checkPermission('Utang') && (
            <UtangManager
              creditRecords={creditRecords}
              currency={settings.currency}
              onAddCredit={async (data) => {
                const res = await fetchWithAuth('/api/credits', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) { fetchAllData(); return await res.json(); }
              }}
              onAddPayment={async (id, amount) => {
                const res = await fetchWithAuth(`/api/credits/${id}/payment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ amount })
                });
                if (res.ok) { fetchAllData(); return await res.json(); }
              }}
              showToast={showToast}
            />
          )}

          {activeView === 'Audit Logs' && checkPermission('Audit Logs') && (
            <div className="space-y-4 animate-fade-in bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <History className="w-5 h-5 text-amber-800" />
                  <h4 className="text-base font-bold text-stone-900">System Security Audit Logs</h4>
                </div>
                <button 
                  onClick={() => showToast('Dispatched audit records spreadsheet download.', 'success')}
                  className="bg-stone-900 hover:bg-stone-850 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] transition"
                >
                  Export Logs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead>
                    <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400">
                      <th className="py-2.5">Timestamp</th>
                      <th className="py-2.5">User Details</th>
                      <th className="py-2.5">Action Log</th>
                      <th className="py-2.5">Operation Specs</th>
                      <th className="py-2.5">IP Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-2.5 font-mono text-stone-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 font-medium text-stone-950">
                          {log.userName} <span className="text-[9px] text-stone-400 font-semibold">({log.userRole})</span>
                        </td>
                        <td className="py-2.5">
                          <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 text-stone-700 max-w-sm truncate">{log.details}</td>
                        <td className="py-2.5 font-mono text-[10px] text-stone-400">{log.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'Super Admin' && checkPermission('Super Admin') && (
            <SuperAdminPanel
              orders={orders}
              products={products}
              users={users}
              categories={categories}
              suppliers={suppliers}
              currency={settings.currency}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              showToast={showToast}
            />
          )}

          {activeView === 'Settings' && checkPermission('Settings') && (
            <div className="space-y-6 animate-fade-in">
              {/* Staff Management */}
              <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h4 className="text-base font-bold text-stone-900">Staff Accounts & PIN Management</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Create staff accounts and assign secure 4-digit PINs</p>
                </div>

                {/* Staff Form */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Full Name</label>
                    <input type="text" value={editingStaff ? editingStaff.name : staffForm.name}
                      onChange={e => editingStaff ? setEditingStaff({...editingStaff, name: e.target.value}) : setStaffForm({...staffForm, name: e.target.value})}
                      placeholder="e.g. Juan dela Cruz"
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Email</label>
                    <input type="email" value={editingStaff ? editingStaff.email : staffForm.email}
                      onChange={e => editingStaff ? setEditingStaff({...editingStaff, email: e.target.value}) : setStaffForm({...staffForm, email: e.target.value})}
                      placeholder="juan@yourstore.com"
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Role</label>
                    <select value={editingStaff ? editingStaff.role : staffForm.role}
                      onChange={e => editingStaff ? setEditingStaff({...editingStaff, role: e.target.value as any}) : setStaffForm({...staffForm, role: e.target.value})}
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                      <option>Super Admin</option>
                      <option>Admin</option>
                      <option>Cashier</option>
                      <option>Inventory Manager</option>
                      <option>Accountant</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">4-Digit PIN</label>
                    <input type="password" maxLength={4}
                      value={editingStaff ? (editingStaff.pin || '') : staffForm.pin}
                      onChange={e => editingStaff ? setEditingStaff({...editingStaff, pin: e.target.value}) : setStaffForm({...staffForm, pin: e.target.value})}
                      placeholder="••••"
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-mono tracking-widest focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleSaveStaff}
                    className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
                    {editingStaff ? 'Update Staff' : 'Add Staff'}
                  </button>
                  {editingStaff && (
                    <button onClick={() => { setEditingStaff(null); setStaffForm({ name: '', email: '', role: 'Cashier', pin: '' }); }}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-4 py-2 rounded-xl transition">
                      Cancel
                    </button>
                  )}
                </div>

                {/* Staff Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400">
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Role</th>
                        <th className="py-2">PIN</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {staffList.map(s => (
                        <tr key={s.id} className="hover:bg-stone-50">
                          <td className="py-2 font-semibold text-stone-900">{s.name}</td>
                          <td className="py-2 text-stone-500">{s.email}</td>
                          <td className="py-2">
                            <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">{s.role}</span>
                          </td>
                          <td className="py-2 font-mono">
                            <button onClick={() => setShowPinFor(showPinFor === s.id ? null : s.id)}
                              className="text-[10px] text-stone-400 hover:text-stone-700 transition">
                              {showPinFor === s.id ? (s.pin || '••••') : '••••'}
                            </button>
                          </td>
                          <td className="py-2 flex gap-2">
                            <button onClick={() => { setEditingStaff({...s, pin: ''}); }}
                              className="text-[10px] text-amber-800 font-bold hover:underline">Edit</button>
                            <button onClick={() => handleDeleteStaff(s.id)}
                              className="text-[10px] text-red-600 font-bold hover:underline">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Store Settings */}
              <div className="max-w-2xl bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="border-b border-stone-100 pb-3">
                <h4 className="text-base font-bold text-stone-900">POS Metadata & Printing Configuration</h4>
                <p className="text-xs text-stone-500 mt-0.5">Customize currency parameters, VAT taxes, thermal output and trigger system backups</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Registered Company Name</label>
                  <input 
                    type="text" 
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Sourcing Location Phone</label>
                  <input 
                    type="text" 
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Sourcing Location Address</label>
                  <input 
                    type="text" 
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Default VAT rate (%)</label>
                  <input 
                    type="number" 
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Service Charge Rate (%)</label>
                  <input 
                    type="number" 
                    value={settings.serviceChargeRate}
                    onChange={(e) => setSettings({ ...settings, serviceChargeRate: parseFloat(e.target.value) || 0 })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Active ISO Currency Indicator</label>
                  <select 
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="₱">₱ (PhP Peso)</option>
                    <option value="$">$ (USD Dollar)</option>
                    <option value="€">€ (Euro)</option>
                    <option value="¥">¥ (Yen)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Thermal Print IP</label>
                  <input 
                    type="text" 
                    value={settings.printerIp}
                    onChange={(e) => setSettings({ ...settings, printerIp: e.target.value })}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                <button 
                  onClick={handleBackupDB}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-850 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Generate DB Backup File
                </button>
                <button 
                  onClick={() => handleUpdateSettings(settings)}
                  className="bg-amber-800 hover:bg-amber-900 text-stone-50 text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition"
                >
                  Save Store Configurations
                </button>
              </div>
            </div>
          </div>
          )}

        </main>
      </div>

      {/* COMPREHENSIVE THERMAL RECEIPT SUCCESS MODAL popup */}
      {showReceipt && receiptRef.current && (
        <ReceiptModal 
          order={receiptRef.current}
          settings={settings}
          // Keep receipt open until the user explicitly closes it.
          // fetchAllData() causes the active view/state to refresh and can make the receipt disappear.
          onClose={() => { setShowReceipt(false); receiptRef.current = null; }}
          showToast={showToast}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
