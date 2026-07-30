import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconClose } from "./icons";

/* ---------- Toast ---------- */

interface Toast {
  id: number;
  text: string;
}

const ToastContext = createContext<(text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((text: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-wrap" role="status">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              {t.text}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/* ---------- Modal / alt sayfa ---------- */

export function Sheet({
  title,
  onClose,
  children,
  center = false,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  center?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`modal-overlay${center ? " center" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="sheet-header">
            <div className="sheet-title">{title}</div>
            <button className="icon-btn" onClick={onClose} aria-label="Kapat">
              <IconClose size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------- Anahtar (switch) ---------- */

export function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? " on" : ""}`}
      onClick={onToggle}
    />
  );
}

/* ---------- Basit durum ekranı ---------- */

export function StateScreen({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-screen">
      {icon}
      <div className="state-title">{title}</div>
      {text && <div>{text}</div>}
      {action}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" aria-label="Yükleniyor" />;
}
