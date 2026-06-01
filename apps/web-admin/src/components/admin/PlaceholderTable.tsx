export function PlaceholderTable({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-5 py-3">Alan</th>
            <th className="px-5 py-3">Özet</th>
            <th className="px-5 py-3">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 text-zinc-700">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="px-5 py-4">
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-24 rounded bg-zinc-200" />
                  <div className="h-3 w-40 rounded bg-zinc-200" />
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="h-3 w-28 rounded bg-zinc-200" />
              </td>
              <td className="px-5 py-4">
                <div className="h-3 w-28 rounded bg-zinc-200" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500">Placeholder satırlar — API bağlandığında gerçek veri.</p>
    </div>
  );
}
