import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { ToastProvider, Button, Field, Input, Spinner, useToast } from './ui';
import { useOrderAlerts } from './useOrderAlerts';
import { ActivityLog } from './pages/ActivityLog';
import { Backups } from './pages/Backups';
import { Carts } from './pages/Carts';
import { Coupons } from './pages/Coupons';
import { Reviews } from './pages/Reviews';
import { Returns } from './pages/Returns';
import { Registries } from './pages/Registries';
import { Visitors } from './pages/Visitors';
import { Health } from './pages/Health';
import { StationAccess } from './pages/StationAccess';
import { LayoutDashboard, Package, ShoppingBag, Calculator, Settings, Users, LogOut, Menu, X, ExternalLink, Store, Images, FileText, Bell, BellOff, History, ScanBarcode, DatabaseBackup, ShoppingCart, TicketPercent, Star, QrCode, RotateCcw, Gift, ChartNoAxesColumn, Activity } from 'lucide-react';
import { Overview } from './pages/Overview';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Accounting } from './pages/Accounting';
import { StoreSettingsPage } from './pages/StoreSettings';
import { Team } from './pages/Team';
import { Dealers } from './pages/Dealers';
import { Banners } from './pages/Banners';
import { SitePages } from './pages/SitePages';
import { Inventory } from './pages/Inventory';

export interface Admin {
  id: number;
  name: string;
  username: string;
  role: 'owner' | 'staff';
}

type Page = 'overview' | 'visitors' | 'health' | 'products' | 'orders' | 'returns' | 'registries' | 'carts' | 'coupons' | 'reviews' | 'inventory' | 'banners' | 'pages' | 'dealers' | 'accounting' | 'settings' | 'team';

type SettingsTab = 'general' | 'pages' | 'team' | 'activity' | 'backups' | 'station';
const SETTINGS_TABS: { id: SettingsTab; label: string; short: string; Icon: React.FC<any> }[] = [
  { id: 'general', label: 'الإعدادات العامة', short: 'عام', Icon: Settings },
  { id: 'pages', label: 'صفحات الموقع', short: 'الصفحات', Icon: FileText },
  { id: 'team', label: 'المستخدمين والباسورد', short: 'المستخدمين', Icon: Users },
  { id: 'activity', label: 'سجل النشاطات', short: 'السجل', Icon: History },
  { id: 'backups', label: 'النسخ الاحتياطي', short: 'النسخ', Icon: DatabaseBackup },
  { id: 'station', label: 'محطة الباركود', short: 'الباركود', Icon: QrCode },
];

// Sidebar, grouped by what you're doing
const NAV_GROUPS: { title: string; items: { id: Page; label: string; Icon: React.FC<any>; owner?: boolean }[] }[] = [
  { title: '', items: [{ id: 'overview', label: 'الرئيسية', Icon: LayoutDashboard }] },
  { title: 'المبيعات', items: [
    { id: 'orders', label: 'الطلبات', Icon: ShoppingBag },
    { id: 'returns', label: 'الاسترجاع والاستبدال', Icon: RotateCcw },
    { id: 'carts', label: 'السلات المتروكة', Icon: ShoppingCart },
    { id: 'registries', label: 'قوايم العرايس', Icon: Gift },
  ] },
  { title: 'المنتجات والمخزن', items: [
    { id: 'products', label: 'المنتجات والأقسام', Icon: Package },
    { id: 'inventory', label: 'الكاشير والمخزن', Icon: ScanBarcode },
  ] },
  { title: 'التسويق', items: [
    { id: 'visitors', label: 'الزوار', Icon: ChartNoAxesColumn },
    { id: 'banners', label: 'البانرات', Icon: Images },
    { id: 'coupons', label: 'كوبونات الخصم', Icon: TicketPercent },
    { id: 'reviews', label: 'التقييمات', Icon: Star },
    { id: 'dealers', label: 'التجار المعتمدين', Icon: Store },
  ] },
  { title: 'الإدارة', items: [
    { id: 'accounting', label: 'الحسابات', Icon: Calculator },
    { id: 'health', label: 'صحة الموقع', Icon: Activity, owner: true },  // the homex account only (see isStationAdmin)
    { id: 'settings', label: 'إعدادات المتجر', Icon: Settings },
  ] },
];
const NAV = NAV_GROUPS.flatMap((g) => g.items);

export const AdminApp: React.FC = () => (
  <ToastProvider>
    <Gate />
  </ToastProvider>
);

const Gate: React.FC = () => {
  const [state, setState] = useState<{ loading: boolean; admin: Admin | null; needsSetup: boolean; error?: string }>({
    loading: true,
    admin: null,
    needsSetup: false,
  });

  const refresh = () =>
    api
      .get('me')
      .then((d) => setState({ loading: false, admin: d.admin, needsSetup: d.needsSetup }))
      .catch((e: ApiError) => setState({ loading: false, admin: null, needsSetup: false, error: e.message }));

  useEffect(() => {
    refresh();
  }, []);

  if (state.loading) return <Spinner />;
  if (state.error && !state.admin) return <AuthShell><p className="text-sale font-bold text-center">{state.error}</p></AuthShell>;
  if (!state.admin) return <Login setup={state.needsSetup} onDone={(d) => setState({ loading: false, admin: d.admin, needsSetup: false })} />;
  return <Shell admin={state.admin} onLogout={() => setState({ loading: false, admin: null, needsSetup: false })} />;
};

const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ag flex items-center justify-center p-4">
    <div className="ag-bg" aria-hidden="true"><i /><i /><i /></div>
    <div className="w-full max-w-sm ag-stagger">
      <img src="/logo-dark.png" alt="HOMEX" className="h-11 w-auto mx-auto mb-8" />
      <div className="glass-strong rounded-3xl p-6 shadow-2xl">{children}</div>
    </div>
  </div>
);

const Login: React.FC<{ setup: boolean; onDone: (d: any) => void }> = ({ setup, onDone }) => {
  const [f, setF] = useState({ name: '', username: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (setup && f.password !== f.confirm) return setErr('الباسورد والتأكيد مش زي بعض');
    setBusy(true);
    try {
      onDone(await api.post(setup ? 'setup' : 'login', f));
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-extrabold text-ink">{setup ? 'إنشاء حساب المالك' : 'دخول لوحة التحكم'}</h1>
      <p className="text-sm text-steel mt-1 mb-5">
        {setup ? 'أول مرة تفتح اللوحة. اعمل حسابك، وده هيكون الحساب الرئيسي.' : 'اكتب اسم المستخدم والباسورد.'}
      </p>
      <form onSubmit={submit} className="space-y-4">
        {setup && (
          <Field label="اسمك">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoComplete="name" />
          </Field>
        )}
        <Field label="اسم المستخدم">
          <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoComplete="username" dir="ltr" />
        </Field>
        <Field label="الباسورد" hint={setup ? '8 حروف أو أرقام على الأقل' : undefined}>
          <Input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            required
            autoComplete={setup ? 'new-password' : 'current-password'}
            dir="ltr"
          />
        </Field>
        {setup && (
          <Field label="تأكيد الباسورد">
            <Input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required autoComplete="new-password" dir="ltr" />
          </Field>
        )}
        {err && <p className="text-sm font-bold text-sale">{err}</p>}
        <Button type="submit" loading={busy} className="w-full h-12 text-base">
          {setup ? 'إنشاء الحساب والدخول' : 'دخول'}
        </Button>
      </form>
    </AuthShell>
  );
};

const Shell: React.FC<{ admin: Admin; onLogout: () => void }> = ({ admin, onLogout }) => {
  // «صفحات الموقع» and «المستخدمين والباسورد» live as tabs inside «إعدادات المتجر»
  const initial = location.hash.slice(1);
  const [page, setPage] = useState<Page>(() => (['pages', 'team'].includes(initial) ? 'settings' : (initial as Page)) || 'overview');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(() => (initial === 'pages' || initial === 'team' ? initial : 'general'));
  const [activityUser, setActivityUser] = useState<number | null>(null);
  const isOwner = admin.role === 'owner';
  // The barcode-station tab belongs to the main account only
  const isStationAdmin = isOwner && admin.username.toLowerCase() === 'homex';
  const toast = useToast();
  const alerts = useOrderAlerts((o, added) => {
    toast(o ? `🛒 طلب جديد ${o.code} من ${o.name} — ${Math.round(o.total).toLocaleString('en-US')} ج.م` : `🛒 وصلك ${added} طلب جديد`, 'ok', { silent: true });  // the order alert has its own sound
    window.dispatchEvent(new CustomEvent('homex:new-order'));
  });
  const bell = (
    <button
      onClick={() => (alerts.perm === 'default' ? alerts.askPermission() : alerts.setSound(!alerts.sound))}
      className="relative text-ink/70 hover:text-ink p-1.5 rounded-lg hover:bg-white/50"
      title={alerts.perm === 'default' ? 'فعّل إشعارات الطلبات الجديدة' : alerts.sound ? 'صوت الطلبات شغال — اضغط عشان تكتمه' : 'صوت الطلبات مكتوم — اضغط عشان تشغله'}
      aria-label="إشعارات الطلبات"
    >
      {alerts.sound ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
      {alerts.perm === 'default' && <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-gold" />}
    </button>
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    location.hash = page;
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [page]);

  const logout = async () => {
    await api.post('logout').catch(() => {});
    onLogout();
  };

  const badge = (n: number, tone: string) => (
    <span className={`mr-auto min-w-6 h-6 px-1.5 rounded-full ${tone} text-white text-xs font-black flex items-center justify-center price`}>{n}</span>
  );
  const nav = (
    <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="أقسام لوحة التحكم">
      {NAV_GROUPS.map((g) => (
        <div key={g.title || 'home'} className={g.title ? 'mt-2 pt-2 border-t border-ink/10' : ''}>
          {g.title && <p className="ag-lbl px-3 pb-1 text-[11px] font-bold text-ink/45 whitespace-nowrap">{g.title}</p>}
          <div className="space-y-0.5">
            {g.items.filter((it: any) => !it.owner || isStationAdmin).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`w-full h-9 px-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all duration-300 ${
                  page === id ? 'bg-white text-ink shadow-[0_6px_16px_-6px_rgba(80,30,10,.35)]' : 'text-ink/70 hover:bg-white/45 hover:text-ink'
                }`}
                aria-current={page === id ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${page === id ? 'text-gold-deep' : ''}`} />
                <span className="ag-lbl truncate" style={{ ['--i' as any]: NAV.findIndex((n) => n.id === id) }}>{label}</span>
                {id === 'orders' && alerts.pending > 0 && badge(alerts.pending, 'bg-sale')}
                {id === 'returns' && alerts.returns > 0 && badge(alerts.returns, 'bg-sale')}
                {id === 'carts' && alerts.carts > 0 && badge(alerts.carts, 'bg-gold-deep')}
                {id === 'health' && alerts.health > 0 && badge(alerts.health, 'bg-sale')}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="p-3 border-t border-ink/10 flex items-center gap-1">
      <p className="ag-lbl flex-1 min-w-0 px-2 text-xs text-ink/60 truncate">
        {admin.name} · {admin.role === 'owner' ? 'المالك' : 'موظف'}
      </p>
      <a href="/" target="_blank" title="فتح المتجر" aria-label="فتح المتجر" className="w-10 h-10 rounded-lg flex items-center justify-center text-ink/60 hover:bg-white/50 hover:text-ink">
        <ExternalLink className="w-4 h-4" />
      </a>
      <button onClick={logout} title="تسجيل خروج" aria-label="تسجيل خروج" className="w-10 h-10 rounded-lg flex items-center justify-center text-ink/60 hover:bg-white/50 hover:text-ink">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="ag lg:pr-[17rem]">
      <div className="ag-bg" aria-hidden="true"><i /><i /><i /></div>
      {/* Desktop sidebar: a floating glass panel that opens out of an icon rail */}
      <aside className="ag-side glass hidden lg:flex fixed top-3 right-3 bottom-3 w-64 rounded-3xl flex-col overflow-hidden z-30">
        <div className="h-16 flex items-center justify-between px-5 border-b border-ink/10 shrink-0">
          <img src="/logo-dark.png" alt="HOMEX" className="ag-lbl h-7 w-auto" />
          {bell}
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 glass-strong h-14 px-4 flex items-center justify-between border-x-0 border-t-0">
        <button onClick={() => setOpen(true)} className="text-ink p-1" aria-label="القائمة">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-ink font-extrabold">{NAV.find((n) => n.id === page)?.label}</span>
        <div className="flex items-center gap-1">
          {bell}
          <img src="/logo-dark.png" alt="HOMEX" className="h-6 w-auto" />
        </div>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button type="button" tabIndex={-1} aria-label="إغلاق القائمة" className="absolute inset-0 w-full h-full bg-black/30 backdrop-blur-[2px] cursor-pointer" onClick={() => setOpen(false)} />
          <aside className="glass-strong absolute top-2 right-2 bottom-2 w-72 max-w-[85%] rounded-3xl flex flex-col overflow-hidden">
            <div className="h-14 flex items-center justify-between px-4 border-b border-ink/10">
              <img src="/logo-dark.png" alt="HOMEX" className="h-7 w-auto" />
              <button onClick={() => setOpen(false)} className="text-ink p-1" aria-label="إغلاق">
                <X className="w-6 h-6" />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </aside>
        </div>
      )}

      <main className="ag-lens p-3 sm:p-6 max-w-6xl mx-auto">
       <div key={page + (page === 'settings' ? settingsTab : '')} className="ag-page">
        {page === 'overview' && <Overview go={setPage} name={admin.name} />}
        {page === 'orders' && <Orders isOwner={isOwner} />}
        {page === 'products' && <Products />}
        {page === 'carts' && <Carts />}
        {page === 'coupons' && <Coupons isOwner={isOwner} />}
        {page === 'reviews' && <Reviews isOwner={isOwner} />}
        {page === 'returns' && <Returns />}
        {page === 'registries' && <Registries />}
        {page === 'visitors' && <Visitors />}
        {page === 'health' && isStationAdmin && <Health />}
        {page === 'inventory' && <Inventory />}
        {page === 'banners' && <Banners />}
        {page === 'dealers' && <Dealers />}
        {page === 'accounting' && <Accounting />}
        {page === 'settings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:flex gap-1 p-1 bg-white border border-line rounded-xl">
              {SETTINGS_TABS.filter((t) => (t.id === 'station' ? isStationAdmin : !['activity', 'backups'].includes(t.id) || isOwner)).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSettingsTab(t.id)}
                  className={`sm:flex-1 min-w-0 h-10 px-2 sm:px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    settingsTab === t.id ? 'bg-ink text-white' : 'text-steel hover:text-ink hover:bg-shelf'
                  }`}
                  aria-pressed={settingsTab === t.id}
                >
                  <t.Icon className="w-4 h-4 shrink-0" /> <span className="lg:hidden">{t.short}</span><span className="hidden lg:inline">{t.label}</span>
                </button>
              ))}
            </div>
            {settingsTab === 'general' && <StoreSettingsPage admin={admin} />}
            {settingsTab === 'pages' && <SitePages />}
            {settingsTab === 'team' && <Team admin={admin} onShowActivity={(id) => { setActivityUser(id); setSettingsTab('activity'); }} />}
            {settingsTab === 'activity' && isOwner && <ActivityLog initialAdmin={activityUser} />}
            {settingsTab === 'backups' && isOwner && <Backups />}
            {settingsTab === 'station' && isStationAdmin && <StationAccess />}
          </div>
        )}
       </div>
      </main>
    </div>
  );
};
