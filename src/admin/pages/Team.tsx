import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Input, Field, Button, Toggle, Select, Modal, useToast } from '../ui';
import { Plus, Trash2, History } from 'lucide-react';
import type { Admin } from '../AdminApp';

export const Team: React.FC<{ admin: Admin; onShowActivity?: (id: number) => void }> = ({ admin, onShowActivity }) => {
  const toast = useToast();
  const owner = admin.role === 'owner';
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<any[] | null>(null);
  const [edit, setEdit] = useState<any>(null);

  useEffect(() => {
    if (owner) api.get('admin/admins').then(setList).catch((e) => toast(e.message, 'err'));
  }, []);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return toast('الباسورد الجديد والتأكيد مش زي بعض', 'err');
    setBusy(true);
    try {
      await api.post('password', pw);
      toast('الباسورد اتغير');
      setPw({ current: '', next: '', confirm: '' });
    } catch (ex: any) {
      toast(ex.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const saveUser = async () => {
    setBusy(true);
    try {
      setList(await api.post('admin/admin', edit));
      toast(edit.id ? 'اتحفظ' : 'المستخدم اتضاف');
      setEdit(null);
    } catch (ex: any) {
      toast(ex.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const delUser = async (u: any) => {
    if (!confirm(`تمسح حساب ${u.name}؟`)) return;
    try {
      setList(await api.post('admin/admin-delete', { id: u.id }));
      toast('الحساب اتمسح');
    } catch (ex: any) {
      toast(ex.message, 'err');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">المستخدمين والباسورد</h1>

      <Card title="غيّر الباسورد بتاعك">
        <form onSubmit={changePw} className="grid sm:grid-cols-3 gap-3 items-end">
          <Field label="الباسورد الحالي">
            <Input type="password" dir="ltr" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          </Field>
          <Field label="الباسورد الجديد" hint="8 حروف أو أرقام على الأقل">
            <Input type="password" dir="ltr" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
          </Field>
          <Field label="تأكيد الجديد">
            <Input type="password" dir="ltr" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
          </Field>
          <Button type="submit" loading={busy} className="sm:col-span-3 sm:justify-self-start">غيّر الباسورد</Button>
        </form>
      </Card>

      {owner && (
        <Card
          title="حسابات اللوحة"
          action={<Button onClick={() => setEdit({ name: '', username: '', password: '', role: 'staff', active: true })}><Plus className="w-4 h-4" /> مستخدم جديد</Button>}
        >
          {!list ? (
            <Spinner />
          ) : (
            <ul className="divide-y divide-line -my-2">
              {list.map((u) => (
                <li key={u.id} className="py-3 flex items-center gap-3">
                  <button onClick={() => setEdit({ ...u, active: !!u.active, password: '' })} className="flex-1 text-right min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-ink">{u.name}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${u.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-shelf text-steel'}`}>
                        {u.role === 'owner' ? 'مالك' : 'موظف'}
                      </span>
                      {!u.active && <span className="text-xs font-bold text-sale">موقوف</span>}
                    </span>
                    <span className="block text-xs text-steel mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                      {u.username} {u.last_login ? `· آخر دخول ${u.last_login.slice(0, 16)}` : ''}
                    </span>
                  </button>
                  {onShowActivity && (
                    <Button variant="ghost" className="shrink-0 h-9 px-3 text-xs" onClick={() => onShowActivity(Number(u.id))}>
                      <History className="w-4 h-4" /> <span className="hidden sm:inline">سجل النشاط</span>
                    </Button>
                  )}
                  {u.id !== admin.id && (
                    <button onClick={() => delUser(u)} className="p-2 text-steel hover:text-sale" aria-label={`مسح ${u.name}`}><Trash2 className="w-4 h-4" /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-steel mt-4">
            المالك يقدر يعمل كل حاجة. الموظف يقدر يضيف منتجات ويتابع الطلبات والحسابات، بس مش يغيّر إعدادات المتجر أو المستخدمين.
          </p>
        </Card>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'تعديل مستخدم' : 'مستخدم جديد'}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>إلغاء</Button><Button onClick={saveUser} loading={busy}>حفظ</Button></>}
      >
        {edit && (
          <div className="space-y-4">
            <Field label="الاسم"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="اسم المستخدم (للدخول)"><Input dir="ltr" value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></Field>
            <Field label={edit.id ? 'باسورد جديد' : 'الباسورد'} hint={edit.id ? 'سيبها فاضية لو مش عايز تغيرها' : '8 حروف أو أرقام على الأقل'}>
              <Input type="password" dir="ltr" autoComplete="new-password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            </Field>
            <Field label="الصلاحية">
              <Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option value="staff">موظف</option>
                <option value="owner">مالك</option>
              </Select>
            </Field>
            <Toggle checked={!!edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="الحساب شغال" />
          </div>
        )}
      </Modal>
    </div>
  );
};
