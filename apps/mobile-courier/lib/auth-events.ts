/** Oturum geçersiz (401) — kök layout dinleyip login’e yönlendirir. */
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeLoginRequired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitLoginRequired(): void {
  for (const fn of [...listeners]) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}
