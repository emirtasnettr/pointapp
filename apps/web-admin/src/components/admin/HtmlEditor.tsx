'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
  /** Alt kısımdaki HTML önizleme paneli (kampanya/hizmet için kapalı) */
  showPreview?: boolean;
};

export function HtmlEditor({
  value,
  onChange,
  disabled,
  minHeight = 280,
  showPreview = true,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [source, setSource] = useState(value);

  useEffect(() => {
    setSource(value);
    if (mode === 'visual' && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value, mode]);

  const syncFromEditor = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setSource(html);
    onChange(html);
  }, [onChange]);

  const exec = (cmd: string, val?: string) => {
    if (disabled) return;
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncFromEditor();
  };

  const applySource = () => {
    onChange(source);
    if (editorRef.current) editorRef.current.innerHTML = source;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/90 px-2 py-1.5">
        <ModeBtn active={mode === 'visual'} onClick={() => setMode('visual')} label="Görsel" />
        <ModeBtn active={mode === 'source'} onClick={() => setMode('source')} label="HTML" />
        {mode === 'visual' ? (
          <>
            <span className="mx-1 h-5 w-px bg-zinc-200" />
            <ToolBtn onClick={() => exec('bold')} label="B" title="Kalın" bold />
            <ToolBtn onClick={() => exec('italic')} label="I" title="İtalik" italic />
            <ToolBtn onClick={() => exec('underline')} label="U" title="Altı çizili" underline />
            <span className="mx-1 h-5 w-px bg-zinc-200" />
            <ToolBtn onClick={() => exec('formatBlock', 'h2')} label="H2" title="Başlık" />
            <ToolBtn onClick={() => exec('formatBlock', 'p')} label="P" title="Paragraf" />
            <ToolBtn onClick={() => exec('insertUnorderedList')} label="•" title="Liste" />
            <ToolBtn
              onClick={() => {
                const url = window.prompt('Bağlantı URL');
                if (url) exec('createLink', url);
              }}
              label="🔗"
              title="Bağlantı"
            />
          </>
        ) : null}
      </div>

      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          className={cn(
            'prose prose-sm max-w-none px-4 py-3 text-zinc-800 outline-none',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          style={{ minHeight }}
        />
      ) : (
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onBlur={applySource}
          disabled={disabled}
          spellCheck={false}
          className="block w-full resize-y border-0 bg-white px-4 py-3 font-mono text-xs text-zinc-800 outline-none focus:ring-0"
          style={{ minHeight }}
        />
      )}

      {mode === 'source' && showPreview ? (
        <div className="border-t border-zinc-100 px-3 py-2">
          <button
            type="button"
            onClick={applySource}
            disabled={disabled}
            className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
          >
            HTML’i önizlemeye uygula
          </button>
        </div>
      ) : null}

      {showPreview ? (
        <div className="border-t border-zinc-200 bg-zinc-50/50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Önizleme</p>
          <div
            className="prose prose-sm mt-2 max-w-none text-zinc-800"
            dangerouslySetInnerHTML={{ __html: source || '<p class="text-zinc-400">İçerik yok</p>' }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-semibold',
        active ? 'bg-brand/15 text-brand' : 'text-zinc-600 hover:bg-zinc-100',
      )}
    >
      {label}
    </button>
  );
}

function ToolBtn({
  onClick,
  label,
  title,
  bold: b,
  italic: i,
  underline: u,
}: {
  onClick: () => void;
  label: string;
  title: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'min-w-[28px] rounded-md px-1.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/80',
        b && 'font-bold',
        i && 'italic',
        u && 'underline',
      )}
    >
      {label}
    </button>
  );
}
