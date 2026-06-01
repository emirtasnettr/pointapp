'use client';

export function GeoPickerModal({
  open,
  title,
  items,
  loading,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  items: { id: string; title: string }[];
  loading?: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-slate-900/45" aria-label="Kapat" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[72vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200/90 bg-white shadow-xl sm:rounded-2xl dark:border-white/10 dark:bg-zinc-900">
        <p className="px-[18px] pb-2 pt-4 text-[17px] font-extrabold text-zinc-900 dark:text-zinc-50">{title}</p>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <p className="px-[18px] py-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <p className="px-[18px] py-8 text-center text-sm text-zinc-500">Kayıt bulunamadı.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className="block w-full border-b border-zinc-100 px-[18px] py-3.5 text-left text-base font-extrabold text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                {item.title}
              </button>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="bg-zinc-50 py-3.5 text-center text-base font-extrabold text-[#16B24B] dark:bg-white/5"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
