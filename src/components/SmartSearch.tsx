/**
 * Search box with live suggestions: matching products (photo + price), matching categories,
 * recent searches and popular categories when empty. Arrow keys / Enter / Escape work.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, Clock, LayoutGrid, ArrowUpLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { thumb } from '../lib/api';
import { searchProducts, searchCategories, recentSearches, rememberSearch, clearRecentSearches } from '../lib/search';

type Row = { key: string; kind: 'product' | 'category' | 'recent' | 'all'; label: string; run: () => void };

export const SmartSearch: React.FC<{ className?: string; inputClass?: string; onSearch: (v: string) => void; autoFocus?: boolean }> = ({
  className = '',
  inputClass = '',
  onSearch,
  autoFocus,
}) => {
  const { products, categories, searchQuery, setSelectedProduct, setSelectedCategory, setSearchQuery } = useStore() as any;
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (!open) return;
    setRecent(recentSearches());
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  useEffect(() => setHi(-1), [searchQuery]);

  const q = searchQuery.trim();
  const found = useMemo(() => (q ? searchProducts(products, categories, q) : []), [q, products, categories]);
  const cats = useMemo(() => (q ? searchCategories(categories, q) : []), [q, categories]);

  const toCatalog = () => setTimeout(() => document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' }), 60);
  const finish = () => { setOpen(false); input.current?.blur(); };
  const showAll = () => { rememberSearch(q); finish(); toCatalog(); };
  const openProduct = (p: any) => { rememberSearch(q); finish(); setSelectedProduct(p); };
  const openCategory = (c: any) => { finish(); setSearchQuery(''); setSelectedCategory(c.id); toCatalog(); };
  const useRecent = (t: string) => { onSearch(t); rememberSearch(t); finish(); toCatalog(); };

  const rows: Row[] = q
    ? [
        ...found.slice(0, 5).map((p) => ({ key: 'p' + p.id, kind: 'product' as const, label: p.name, run: () => openProduct(p) })),
        ...cats.map((c: any) => ({ key: 'c' + c.id, kind: 'category' as const, label: c.name, run: () => openCategory(c) })),
        ...(found.length ? [{ key: 'all', kind: 'all' as const, label: `اعرض كل النتايج (${found.length})`, run: showAll }] : []),
      ]
    : [
        ...recent.map((t) => ({ key: 'r' + t, kind: 'recent' as const, label: t, run: () => useRecent(t) })),
        ...categories.slice(0, 6).map((c: any) => ({ key: 'c' + c.id, kind: 'category' as const, label: c.name, run: () => openCategory(c) })),
      ];

  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(rows.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(-1, h - 1)); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Enter' && hi >= 0 && rows[hi]) { e.preventDefault(); rows[hi].run(); }
  };

  const productById = (k: string) => found.find((p) => 'p' + p.id === k);

  return (
    <div ref={box} className={`relative ${className}`}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (q) showAll(); }}
        className={`w-full flex h-11 sm:h-12 rounded-xl overflow-hidden border-2 border-transparent focus-within:border-gold bg-white ${inputClass}`}
        role="search"
      >
        <input
          ref={input}
          type="search"
          placeholder="بتدور على إيه؟ كاتيل، مكواة، خلاط..."
          value={searchQuery}
          onChange={(e) => { onSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={key}
          className="flex-1 min-w-0 px-4 text-[15px] text-ink placeholder-steel/80 focus:outline-hidden bg-transparent"
          aria-label="ابحث في المنتجات"
          role="combobox"
          aria-expanded={open}
          aria-controls={id}
          aria-autocomplete="list"
          aria-activedescendant={hi >= 0 ? `${id}-${hi}` : undefined}
          autoComplete="off"
        />
        <button type="submit" className="btn-gold w-12 sm:w-14 flex items-center justify-center shrink-0" aria-label="بحث">
          <Search className="w-5 h-5" />
        </button>
      </form>

      {open && (q || rows.length > 0) && (
        <div id={id} role="listbox" className="absolute top-full inset-x-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-line overflow-hidden max-h-[70vh] overflow-y-auto" data-lenis-prevent>
          {!q && recent.length > 0 && (
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs font-bold text-steel">بحثت قبل كده</span>
              <button type="button" onClick={() => { clearRecentSearches(); setRecent([]); }} className="text-xs font-bold text-steel hover:text-sale">امسح</button>
            </div>
          )}
          {q && found.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="font-bold text-ink">مفيش منتج بالاسم ده</p>
              <p className="text-sm text-steel mt-1">جرّب كلمة تانية، أو اختار قسم:</p>
            </div>
          )}
          {!q && <p className="px-4 pt-3 pb-1 text-xs font-bold text-steel">{recent.length ? 'أو تصفّح قسم' : 'تصفّح الأقسام'}</p>}
          <ul className="pb-2">
            {rows.map((r, i) => {
              const p = r.kind === 'product' ? productById(r.key) : null;
              return (
                <li key={r.key} id={`${id}-${i}`} role="option" aria-selected={hi === i}>
                  <button
                    type="button"
                    onMouseEnter={() => setHi(i)}
                    onClick={r.run}
                    className={`w-full text-right px-4 py-2 flex items-center gap-3 ${hi === i ? 'bg-shelf' : ''} ${r.kind === 'all' ? 'border-t border-line mt-1 pt-3 font-extrabold text-gold-deep' : ''}`}
                  >
                    {p ? (
                      <>
                        <img src={thumb(p.image)} alt="" className="w-11 h-11 rounded-lg object-cover bg-shelf shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-ink truncate">{p.name}</span>
                          <span className="price text-sm font-extrabold text-gold-deep">{p.price.toLocaleString('en-US')} ج.م</span>
                          {p.stock < 1 && <span className="text-xs text-sale font-bold mr-2">نفد</span>}
                        </span>
                      </>
                    ) : r.kind === 'recent' ? (
                      <><Clock className="w-4 h-4 text-steel shrink-0" /><span className="flex-1 text-sm text-ink">{r.label}</span></>
                    ) : r.kind === 'category' ? (
                      <><LayoutGrid className="w-4 h-4 text-steel shrink-0" /><span className="flex-1 text-sm text-ink">{q ? <>قسم <b>{r.label}</b></> : r.label}</span></>
                    ) : (
                      <><span className="flex-1 text-sm">{r.label}</span><ArrowUpLeft className="w-4 h-4" /></>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

