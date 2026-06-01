'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export type DistrictOption = { id: string; name: string };

function normalizeForSearch(text: string) {
  return text.trim().toLocaleLowerCase('tr-TR');
}

type Props = {
  id?: string;
  label: string;
  hint: string;
  value: string;
  onChange: (districtId: string) => void;
  disabled?: boolean;
  districts: DistrictOption[];
  placeholder?: string;
};

export function DistrictSearchSelect({
  id: idProp,
  label,
  hint,
  value,
  onChange,
  disabled,
  districts,
  placeholder = 'İlçe seçin veya arayın',
}: Props) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const selected = districts.find((d) => d.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return districts;
    return districts.filter((d) => normalizeForSearch(d.name).includes(q));
  }, [districts, query]);

  useEffect(() => {
    if (!open) {
      setQuery(selected?.name ?? '');
      setHighlight(0);
    }
  }, [open, selected?.name]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(district: DistrictOption) {
    onChange(district.id);
    setQuery(district.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function openList() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    }
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-zinc-800">
          {label}
        </label>
        <span className="text-[10px] font-medium text-zinc-400">{hint}</span>
      </div>

      <div className="relative mt-2">
        <Search
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
            open ? 'text-brand' : 'text-zinc-400',
          )}
          aria-hidden
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (!open) setOpen(true);
            if (!v.trim()) onChange('');
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-[15px] font-medium text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:shadow-[0_0_0_2px_rgba(22,178,75,0.35),0_1px_2px_rgba(0,0,0,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="İlçe listesini aç"
          onClick={() => (open ? setOpen(false) : openList())}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:pointer-events-none"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.2)] ring-1 ring-black/5"
          >
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-zinc-500">Sonuç bulunamadı</li>
            ) : (
              filtered.map((d, i) => (
                <li key={d.id} role="option" aria-selected={d.id === value}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full px-3.5 py-2.5 text-left text-sm font-medium transition',
                      i === highlight ? 'bg-brand/10 text-brand' : 'text-zinc-800 hover:bg-zinc-50',
                      d.id === value && i !== highlight && 'text-brand',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(d)}
                  >
                    {d.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
