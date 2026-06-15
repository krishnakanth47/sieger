import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function AlertBanner() {
  const { alertMessage, clearAlert } = useAppStore();

  useEffect(() => {
    if (!alertMessage) return;
    const t = setTimeout(clearAlert, 6000);
    return () => clearTimeout(t);
  }, [alertMessage, clearAlert]);

  if (!alertMessage) return null;

  return (
    <div
      className="alert-banner mx-4 mt-3"
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle size={16} className="text-red-400 shrink-0" />
      <span className="flex-1">{alertMessage}</span>
      <button
        onClick={clearAlert}
        className="text-red-400 hover:text-red-300 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
