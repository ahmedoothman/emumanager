import { useState, useEffect, useCallback } from 'react';
import './App.css';
import icon from '../../assets/icon.png';

// Types
interface EmulatorInfo {
  name: string;
  isRunning: boolean;
}

interface SdkStatus {
  found: boolean;
  path: string | null;
  emulatorFound: boolean;
  adbFound: boolean;
}

interface LaunchOptions {
  coldBoot?: boolean;
  wipeData?: boolean;
  noAudio?: boolean;
  gpuMode?: 'auto' | 'host' | 'swiftshader_indirect' | 'off';
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// Icons as SVG components
function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect width="14" height="14" x="5" y="5" rx="2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 16V9h14V16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M16 3l1 2" />
      <path d="M8 3L7 5" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
      <path d="M9 22v-4" />
      <path d="M15 22v-4" />
    </svg>
  );
}

// EmulatorCard Component
function EmulatorCard({
  emulator,
  isSelected,
  onSelect,
  onLaunch,
  onKill,
  isLaunching,
}: {
  emulator: EmulatorInfo;
  isSelected: boolean;
  onSelect: () => void;
  onLaunch: (options?: LaunchOptions) => void;
  onKill: () => void;
  isLaunching: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`emulator-card ${isSelected ? 'emulator-card--selected' : ''} ${emulator.isRunning ? 'emulator-card--running' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="emulator-card__header">
        <h3 className="emulator-card__name">{emulator.name}</h3>
        <div
          className={`emulator-card__checkbox ${isSelected ? 'emulator-card__checkbox--checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onSelect();
            }
          }}
          role="checkbox"
          aria-checked={isSelected}
          tabIndex={0}
        />
      </div>

      <div
        className={`emulator-card__status ${emulator.isRunning ? 'emulator-card__status--running' : 'emulator-card__status--stopped'}`}
      >
        <span className="emulator-card__status-dot" />
        {emulator.isRunning ? 'Running' : 'Stopped'}
      </div>

      <div className="emulator-card__actions">
        {emulator.isRunning ? (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              onKill();
            }}
            disabled={isLaunching}
          >
            <StopIcon /> Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              onLaunch();
            }}
            disabled={isLaunching}
          >
            <PlayIcon /> {isLaunching ? 'Starting...' : 'Launch'}
          </button>
        )}

        <div className={`dropdown ${showMenu ? 'dropdown--open' : ''}`}>
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--icon"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="More options"
          >
            <MoreIcon />
          </button>
          <div className="dropdown__menu">
            <button
              type="button"
              className="dropdown__item"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch({ coldBoot: true });
                setShowMenu(false);
              }}
              disabled={emulator.isRunning}
            >
              🧊 Cold Boot
            </button>
            <button
              type="button"
              className="dropdown__item"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch({ wipeData: true });
                setShowMenu(false);
              }}
              disabled={emulator.isRunning}
            >
              🗑️ Wipe Data
            </button>
            <button
              type="button"
              className="dropdown__item"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch({ noAudio: true });
                setShowMenu(false);
              }}
              disabled={emulator.isRunning}
            >
              🔇 No Audio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({
  sdkStatus,
  onRefresh,
}: {
  sdkStatus: SdkStatus | null;
  onRefresh: () => void;
}) {
  if (!sdkStatus?.found) {
    return (
      <div className="empty-state">
        <WarningIcon />
        <h2 className="empty-state__title">Android SDK Not Found</h2>
        <p className="empty-state__description">
          Please make sure the Android SDK is installed and the ANDROID_HOME
          environment variable is set correctly.
        </p>
        <button type="button" className="btn btn--primary" onClick={onRefresh}>
          <RefreshIcon /> Retry Detection
        </button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <AndroidIcon />
      <h2 className="empty-state__title">No Emulators Found</h2>
      <p className="empty-state__description">
        Create an Android Virtual Device (AVD) using Android Studio to get
        started.
      </p>
      <button type="button" className="btn btn--secondary" onClick={onRefresh}>
        <RefreshIcon /> Refresh List
      </button>
    </div>
  );
}

// Loading Component
function Loading() {
  return (
    <div className="loading">
      <div className="loading__spinner" />
      <p className="loading__text">Loading emulators...</p>
    </div>
  );
}

// Toast Component
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// Main App Component
export default function App() {
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([]);
  const [sdkStatus, setSdkStatus] = useState<SdkStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmulators, setSelectedEmulators] = useState<Set<string>>(
    new Set(),
  );
  const [launchingEmulators, setLaunchingEmulators] = useState<Set<string>>(
    new Set(),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load SDK status and emulators
  const loadEmulators = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check SDK status first
      const statusResult = await window.emulator.getSdkStatus();
      if (statusResult.success && statusResult.data) {
        setSdkStatus(statusResult.data);

        if (!statusResult.data.found) {
          setEmulators([]);
          setIsLoading(false);
          return;
        }
      }

      // Load emulators
      const result = await window.emulator.listEmulators();
      if (result.success && result.data) {
        setEmulators(result.data);
      } else {
        showToast(result.error || 'Failed to load emulators', 'error');
      }
    } catch (error) {
      showToast('Failed to connect to emulator service', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadEmulators();
    // Set up polling for status updates
    const interval = setInterval(loadEmulators, 10000);
    return () => clearInterval(interval);
  }, [loadEmulators]);

  // Theme toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle emulator selection
  const toggleSelection = useCallback((name: string) => {
    setSelectedEmulators((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Launch single emulator
  const launchEmulator = useCallback(
    async (name: string, options?: LaunchOptions) => {
      setLaunchingEmulators((prev) => new Set(prev).add(name));
      try {
        const result = await window.emulator.launchEmulator(name, options);
        if (result.success) {
          showToast(`Launching ${name}...`, 'success');
          // Refresh after a delay to update status
          setTimeout(loadEmulators, 2000);
        } else {
          showToast(result.error || `Failed to launch ${name}`, 'error');
        }
      } catch {
        showToast(`Failed to launch ${name}`, 'error');
      } finally {
        setLaunchingEmulators((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }
    },
    [loadEmulators, showToast],
  );

  // Kill emulator
  const killEmulator = useCallback(
    async (name: string) => {
      try {
        const result = await window.emulator.killEmulator(name);
        if (result.success) {
          showToast(`Stopping ${name}...`, 'success');
          setTimeout(loadEmulators, 2000);
        } else {
          showToast(result.error || `Failed to stop ${name}`, 'error');
        }
      } catch {
        showToast(`Failed to stop ${name}`, 'error');
      }
    },
    [loadEmulators, showToast],
  );

  // Launch selected emulators
  const launchSelected = useCallback(async () => {
    const names = Array.from(selectedEmulators);
    if (names.length === 0) return;

    for (const name of names) {
      setLaunchingEmulators((prev) => new Set(prev).add(name));
    }

    try {
      const result = await window.emulator.launchMultiple(names);
      if (result.success && result.data) {
        const successCount = result.data.filter((r) => r.success).length;
        const failCount = result.data.filter((r) => !r.success).length;

        if (successCount > 0) {
          showToast(`Launching ${successCount} emulator(s)...`, 'success');
        }
        if (failCount > 0) {
          showToast(`Failed to launch ${failCount} emulator(s)`, 'error');
        }

        setTimeout(loadEmulators, 2000);
      }
    } catch {
      showToast('Failed to launch emulators', 'error');
    } finally {
      setLaunchingEmulators(new Set());
      setSelectedEmulators(new Set());
    }
  }, [selectedEmulators, loadEmulators, showToast]);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__left">
          <img src={icon} alt="EmuManager" className="header__logo" />
          <h1 className="header__title">EmuManager</h1>
        </div>
        <div className="header__right">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={loadEmulators}
            disabled={isLoading}
            aria-label="Refresh"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* SDK Warning */}
        {sdkStatus && !sdkStatus.found && (
          <div className="sdk-warning">
            <div className="sdk-warning__icon">
              <WarningIcon />
            </div>
            <div className="sdk-warning__content">
              <h3 className="sdk-warning__title">Android SDK Not Detected</h3>
              <p className="sdk-warning__message">
                Set the ANDROID_HOME environment variable to your Android SDK
                path and restart the app.
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        {!isLoading && emulators.length > 0 && (
          <div className="toolbar">
            <div className="toolbar__left">
              <span className="toolbar__selected-count">
                {emulators.length} emulator
                {emulators.length !== 1 ? 's' : ''} available
              </span>
            </div>
            <div className="toolbar__right">
              {selectedEmulators.size > 0 && (
                <>
                  <span className="toolbar__selected-count">
                    {selectedEmulators.size} selected
                  </span>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={launchSelected}
                  >
                    <PlayIcon /> Launch Selected
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <Loading />
        ) : emulators.length === 0 ? (
          <EmptyState sdkStatus={sdkStatus} onRefresh={loadEmulators} />
        ) : (
          <div className="emulator-grid">
            {emulators.map((emulator) => (
              <EmulatorCard
                key={emulator.name}
                emulator={emulator}
                isSelected={selectedEmulators.has(emulator.name)}
                onSelect={() => toggleSelection(emulator.name)}
                onLaunch={(options) => launchEmulator(emulator.name, options)}
                onKill={() => killEmulator(emulator.name)}
                isLaunching={launchingEmulators.has(emulator.name)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
