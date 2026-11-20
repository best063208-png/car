import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { BenefitsView } from './components/BenefitsView';
import { QuotationPreviewView } from './components/QuotationPreviewView';
import { QuotationSheet } from './components/QuotationSheet';
import { SettingsView } from './components/SettingsView';
import { StepWizard } from './components/StepWizard';
import {
  createInitialQuoteState,
  createQuoteSession,
  DEFAULT_SETTINGS,
} from './data/defaultCatalog';
import {
  BenefitCategories,
  DealerSettings,
  QuoteSession,
  QuoteState,
  VehicleTrim,
  WizardStep,
} from './types/dealer';
import {
  exportQuotationAsImage,
  exportQuotationAsPdf,
  shareQuotationImage,
} from './utils/exportQuote';
import {
  buildLineShareText,
  calculateQuote,
  getLineShareUrl,
} from './utils/finance';

type AppView = 'calculator' | 'benefits' | 'quotation' | 'settings';
export type ThemeMode = 'light' | 'dark';

const SETTINGS_STORAGE_KEY = 'jin_motor_dealer_settings_v2';
const SETTINGS_SAVED_AT_KEY = 'jin_motor_settings_saved_at_v1';
const QUOTES_STORAGE_KEY = 'jin_motor_quotes_v1';
const ACTIVE_QUOTE_STORAGE_KEY = 'jin_motor_active_quote_v1';
const THEME_STORAGE_KEY = 'jin_motor_theme_v1';

function loadSavedTimestamp(): string | null {
  try {
    return localStorage.getItem(SETTINGS_SAVED_AT_KEY);
  } catch {
    return null;
  }
}

function loadSavedTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function loadSavedSettings(): DealerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DealerSettings>;
    const mergedTrims =
      Array.isArray(parsed.trims) && parsed.trims.length > 0
        ? parsed.trims
        : DEFAULT_SETTINGS.trims;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      showroom: { ...DEFAULT_SETTINGS.showroom, ...(parsed.showroom || {}) },
      deliveryDefaults: {
        ...DEFAULT_SETTINGS.deliveryDefaults,
        ...(parsed.deliveryDefaults || {}),
      },
      rateMatrices: {
        standard: {
          ...DEFAULT_SETTINGS.rateMatrices.standard,
          ...(parsed.rateMatrices?.standard || {}),
        },
        lumin: {
          ...DEFAULT_SETTINGS.rateMatrices.lumin,
          ...(parsed.rateMatrices?.lumin || {}),
        },
      },
      trims: mergedTrims,
      freebiePresets: Array.isArray(parsed.freebiePresets)
        ? parsed.freebiePresets
        : DEFAULT_SETTINGS.freebiePresets,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function normalizeQuoteState(
  rawState: Partial<QuoteState> | undefined,
  settings: DealerSettings
): QuoteState {
  const base = createInitialQuoteState(settings);
  if (!rawState) return base;

  const customItems = Array.isArray(rawState.customDeliveryItems)
    ? rawState.customDeliveryItems.map((item, idx) => ({
        id: item?.id || `delivery-${idx}-${Date.now()}`,
        category: (item?.category === 'accessory' ? 'accessory' : 'other') as
          | 'accessory'
          | 'other',
        label: typeof item?.label === 'string' ? item.label : '',
        amount: item?.amount !== undefined ? String(item.amount) : '',
      }))
    : base.customDeliveryItems;

  return {
    ...base,
    ...rawState,
    purchaseType: rawState.purchaseType === 'cash' ? 'cash' : 'finance',
    vatMode:
      rawState.vatMode === 'included_no_subsidy_vat'
        ? 'included_no_subsidy_vat'
        : rawState.vatMode === 'included_with_subsidy_vat'
        ? 'included_with_subsidy_vat'
        : rawState.includeVat === false
        ? 'included_no_subsidy_vat'
        : 'included_with_subsidy_vat',
    anonymousMode:
      typeof rawState.anonymousMode === 'boolean'
        ? rawState.anonymousMode
        : Boolean(settings.defaultAnonymousMode),
    bookingDetails:
      typeof rawState.bookingDetails === 'string'
        ? rawState.bookingDetails
        : '',
    customDeliveryItems: customItems,
  };
}

function loadSavedQuoteSessions(settings: DealerSettings): QuoteSession[] {
  try {
    const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
    if (!raw) return [createQuoteSession(settings, 1)];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createQuoteSession(settings, 1)];
    }
    return parsed.map((item: Partial<QuoteSession>, index: number) => {
      const fallback = createQuoteSession(settings, index + 1);
      return {
        ...fallback,
        ...item,
        id: item.id || fallback.id,
        quoteNumber: item.quoteNumber || fallback.quoteNumber,
        currentStep: item.currentStep ?? 1,
        hasVisitedPreview: Boolean(item.hasVisitedPreview),
        state: normalizeQuoteState(item.state, settings),
      };
    });
  } catch {
    return [createQuoteSession(settings, 1)];
  }
}

export default function App() {
  const [settings, setSettings] = useState<DealerSettings>(() =>
    loadSavedSettings()
  );
  const [quoteSessions, setQuoteSessions] = useState<QuoteSession[]>(() =>
    loadSavedQuoteSessions(loadSavedSettings())
  );
  const [activeQuoteId, setActiveQuoteId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_QUOTE_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [activeView, setActiveView] = useState<AppView>('calculator');
  const [theme, setTheme] = useState<ThemeMode>(() => loadSavedTheme());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() =>
    loadSavedTimestamp()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportSheetRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const activeSession = useMemo(() => {
    return (
      quoteSessions.find((q) => q.id === activeQuoteId) || quoteSessions[0]
    );
  }, [quoteSessions, activeQuoteId]);

  useEffect(() => {
    if (activeSession && activeSession.id !== activeQuoteId) {
      setActiveQuoteId(activeSession.id);
    }
  }, [activeSession, activeQuoteId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quoteSessions));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [quoteSessions]);

  useEffect(() => {
    if (!activeSession) return;
    try {
      localStorage.setItem(ACTIVE_QUOTE_STORAGE_KEY, activeSession.id);
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [activeSession]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const updateActiveSession = (
    updater: (prev: QuoteSession) => QuoteSession
  ) => {
    if (!activeSession) return;
    setQuoteSessions((prevList) =>
      prevList.map((item) =>
        item.id === activeSession.id
          ? { ...updater(item), updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const updateActiveQuoteState = (
    updater: (prev: QuoteState) => QuoteState
  ) => {
    updateActiveSession((session) => ({
      ...session,
      state: updater(session.state),
    }));
  };

  const calc = useMemo(
    () => calculateQuote(settings, activeSession.state),
    [settings, activeSession.state]
  );

  const lineShareText = useMemo(
    () => buildLineShareText(settings, activeSession.state, calc),
    [settings, activeSession.state, calc]
  );

  const lineShareUrl = useMemo(
    () => getLineShareUrl(lineShareText),
    [lineShareText]
  );

  const handleSelectTrim = (trim: VehicleTrim) => {
    updateActiveQuoteState((prev) => {
      const nextTenor =
        trim.rateTable === 'lumin' && prev.tenorMonths === 36
          ? 48
          : prev.tenorMonths;
      const nextDownPercent =
        trim.rateTable === 'lumin' &&
        prev.downMode === 'percent' &&
        prev.downPercentInput < 10
          ? 15
          : prev.downPercentInput;

      return {
        ...prev,
        selectedTrimId: trim.id,
        vehicleDiscount: trim.defaultVehicleDiscount,
        downPaymentSubsidy: trim.defaultDownSubsidy,
        tenorMonths: nextTenor,
        downPercentInput: nextDownPercent,
        customInterestRate: null,
        benefitsOverride: null,
      };
    });
  };

  const handleChangeWizardStep = (step: WizardStep) => {
    if (step === 'preview') {
      updateActiveSession((session) => ({
        ...session,
        currentStep: 'preview',
        hasVisitedPreview: true,
      }));
      setActiveView('quotation');
    } else {
      updateActiveSession((session) => ({
        ...session,
        currentStep: step,
      }));
      setActiveView('calculator');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateNewQuote = () => {
    const nextSeq = quoteSessions.length + 1;
    const newSession = createQuoteSession(settings, nextSeq);
    setQuoteSessions((prev) => [newSession, ...prev]);
    setActiveQuoteId(newSession.id);
    setActiveView('calculator');
    showToast(`สร้างใบเสนอราคาใหม่ (${newSession.quoteNumber}) แล้ว`);
  };

  const handleDuplicateActiveQuote = () => {
    if (!activeSession) return;
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}${String(now.getDate()).padStart(2, '0')}`;
    const seqPart = String(quoteSessions.length + 1).padStart(2, '0');
    const cloned: QuoteSession = {
      ...activeSession,
      id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      quoteNumber: `QT-${datePart}-${seqPart}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      currentStep: 3,
      hasVisitedPreview: false,
      state: {
        ...activeSession.state,
        customerName: activeSession.state.customerName
          ? `${activeSession.state.customerName} (เทียบเงื่อนไข)`
          : '',
        customDeliveryItems: activeSession.state.customDeliveryItems.map(
          (item) => ({ ...item })
        ),
        benefitsOverride: activeSession.state.benefitsOverride
          ? {
              ...activeSession.state.benefitsOverride,
              extraItems: [...activeSession.state.benefitsOverride.extraItems],
            }
          : null,
      },
    };
    setQuoteSessions((prev) => [cloned, ...prev]);
    setActiveQuoteId(cloned.id);
    setActiveView('calculator');
    showToast(`คัดลอกใบเสนอราคาเป็น ${cloned.quoteNumber} เพื่อแก้ไขเทียบเงื่อนไขแล้ว`);
  };

  const handleEditQuoteSession = (
    sessionId: string,
    step: Exclude<WizardStep, 'preview'>
  ) => {
    setQuoteSessions((prevList) =>
      prevList.map((item) =>
        item.id === sessionId ? { ...item, currentStep: step } : item
      )
    );
    setActiveQuoteId(sessionId);
    setActiveView('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveBenefitsToModel = (
    trimId: string,
    benefits: BenefitCategories
  ) => {
    const cleanedBenefits: BenefitCategories = {
      ...benefits,
      extraItems: benefits.extraItems.map((s) => s.trim()).filter(Boolean),
    };
    setSettings((prev) => ({
      ...prev,
      trims: prev.trims.map((t) =>
        t.id === trimId ? { ...t, benefits: cleanedBenefits } : t
      ),
    }));
    updateActiveQuoteState((prev) => ({
      ...prev,
      benefitsOverride: null,
    }));
    showToast('บันทึกสิทธิประโยชน์เป็นค่าเริ่มต้นของรุ่นนี้เรียบร้อยแล้ว');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(lineShareText);
      showToast('คัดลอกข้อความใบเสนอราคาสำหรับส่ง LINE เรียบร้อยแล้ว');
    } catch {
      showToast('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const buildSafeFilename = () => {
    return `${activeSession.quoteNumber}_${calc.trim.modelName}_${calc.trim.trimName}`
      .replace(/\s+/g, '_')
      .replace(/[^\w\u0E00-\u0E7F-]/g, '');
  };

  const handleShareImage = async () => {
    if (!exportSheetRef.current) return;
    setIsExporting(true);
    try {
      const result = await shareQuotationImage(
        exportSheetRef.current,
        buildSafeFilename(),
        `ใบเสนอราคา ${calc.trim.modelName} ${calc.trim.trimName}`
      );
      showToast(
        result === 'shared'
          ? 'เปิดหน้าต่างแชร์รูปภาพเข้า LINE เรียบร้อยแล้ว'
          : 'ดาวน์โหลดรูปภาพใบเสนอราคาแล้ว สามารถส่งต่อเข้า LINE ได้ทันที'
      );
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        showToast('เกิดข้อผิดพลาดในการสร้างรูปภาพสำหรับแชร์');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    if (!exportSheetRef.current) return;
    setIsExporting(true);
    try {
      await exportQuotationAsImage(exportSheetRef.current, buildSafeFilename());
      showToast('บันทึกใบเสนอราคาเป็นรูปภาพ PNG เรียบร้อยแล้ว');
    } catch {
      showToast('เกิดข้อผิดพลาดในการสร้างรูปภาพ');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!exportSheetRef.current) return;
    setIsExporting(true);
    try {
      await exportQuotationAsPdf(exportSheetRef.current, buildSafeFilename());
      showToast('สร้างไฟล์ PDF ใบเสนอราคาเรียบร้อยแล้ว');
    } catch {
      showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSettings = (nextSettings: DealerSettings) => {
    const savedAt = new Date().toISOString();
    setSettings(nextSettings);
    setLastSavedAt(savedAt);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      localStorage.setItem(SETTINGS_SAVED_AT_KEY, savedAt);
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors gracefully
    }
    showToast('บันทึกและจำการตั้งค่าเรียบร้อยแล้ว');
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setLastSavedAt(null);
    const fresh = createQuoteSession(DEFAULT_SETTINGS, 1);
    setQuoteSessions([fresh]);
    setActiveQuoteId(fresh.id);
    setActiveView('calculator');
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_SAVED_AT_KEY);
    localStorage.removeItem(QUOTES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_QUOTE_STORAGE_KEY);
    showToast('คืนค่าข้อมูลเริ่มต้นทั้งหมดเรียบร้อยแล้ว');
  };

  const navItems: { id: AppView; label: string }[] = [
    { id: 'calculator', label: 'กรอก 5 ขั้นตอน' },
    { id: 'benefits', label: 'สิทธิประโยชน์' },
    { id: 'quotation', label: 'ใบเสนอราคา' },
    { id: 'settings', label: 'ตั้งค่า' },
  ];

  const handleNavClick = (viewId: AppView) => {
    setActiveView(viewId);
    if (viewId === 'calculator' && activeSession.currentStep === 'preview') {
      updateActiveSession((s) => ({ ...s, currentStep: 1 }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-midnight-canvas text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Bar Contract: 3 Zones Only */}
      <header className="no-print sticky top-0 z-30 header-midnight border-b border-amber-400/25">
        <div className="h-1 gold-copper-bar" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('calculator')}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {activeSession.state.anonymousMode
              ? 'ใบเสนอราคารถยนต์'
              : settings.showroom.showroomName || 'JIN MOTOR'}
          </button>

          {/* Zone 2: 4 Single-line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    isActive
                      ? 'text-amber-300 font-bold border-amber-400'
                      : 'text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleCreateNewQuote}
              className="btn-gold-copper px-4 py-2 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              ใบเสนอราคาใหม่
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Non-Sticky Navigation Strip */}
      <div className="no-print md:hidden bg-[#0c1733] border-b border-slate-800 px-3 py-2.5">
        <div className="grid grid-cols-4 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap truncate cursor-pointer ${
                  isActive
                    ? 'btn-gold-copper font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {activeView === 'calculator' && (
          <StepWizard
            settings={settings}
            session={activeSession}
            calc={calc}
            onUpdateState={updateActiveQuoteState}
            onSelectTrim={handleSelectTrim}
            onChangeStep={handleChangeWizardStep}
            onSaveBenefitsToModel={handleSaveBenefitsToModel}
            onOpenBenefitsPage={() => setActiveView('benefits')}
          />
        )}

        {activeView === 'benefits' && (
          <BenefitsView
            settings={settings}
            state={activeSession.state}
            calc={calc}
            onUpdateState={updateActiveQuoteState}
            onSelectTrim={handleSelectTrim}
            onSaveBenefitsToModel={handleSaveBenefitsToModel}
            onGoToCalculator={() => {
              if (activeSession.currentStep === 'preview') {
                updateActiveSession((s) => ({ ...s, currentStep: 5 }));
              }
              setActiveView('calculator');
            }}
          />
        )}

        {activeView === 'quotation' && (
          <QuotationPreviewView
            settings={settings}
            session={activeSession}
            quoteSessions={quoteSessions}
            calc={calc}
            lineShareText={lineShareText}
            lineShareUrl={lineShareUrl}
            isExporting={isExporting}
            onJumpToStep={(step) => handleChangeWizardStep(step)}
            onEditQuoteSession={handleEditQuoteSession}
            onCreateNewQuote={handleCreateNewQuote}
            onDuplicateActiveQuote={handleDuplicateActiveQuote}
            onToggleAnonymousMode={() => {
              const nextVal = !activeSession.state.anonymousMode;
              updateActiveQuoteState((prev) => ({
                ...prev,
                anonymousMode: nextVal,
              }));
              showToast(
                nextVal
                  ? 'เปิดโหมดไม่ระบุตัวตน (แสดงเฉพาะใบเสนอราคา)'
                  : 'ปิดโหมดไม่ระบุตัวตน (แสดงข้อมูลโชว์รูมและเซลส์)'
              );
            }}
            onCopyText={handleCopyText}
            onShareImage={handleShareImage}
            onExportImage={handleExportImage}
            onExportPdf={handleExportPdf}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            theme={theme}
            lastSavedAt={lastSavedAt}
            onChangeTheme={(nextTheme) => {
              setTheme(nextTheme);
              try {
                localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
              } catch {
                // Ignore storage quota errors gracefully
              }
              showToast(
                nextTheme === 'dark'
                  ? 'เปลี่ยนเป็นโหมดกลางคืน (Dark Mode) แล้ว'
                  : 'เปลี่ยนเป็นโหมดสว่าง (Light Mode) แล้ว'
              );
            }}
            onSaveSettings={handleSaveSettings}
            onResetDefaults={handleResetDefaults}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Dedicated Fixed-800px Export Sheet */}
      <div
        aria-hidden="true"
        className="no-print fixed left-0 top-0 w-0 h-0 overflow-hidden pointer-events-none -z-50"
      >
        <div className="w-[800px]">
          <QuotationSheet
            forExport
            sheetRef={exportSheetRef}
            settings={settings}
            state={activeSession.state}
            calc={calc}
            quoteNumber={activeSession.quoteNumber}
          />
        </div>
      </div>

      {/* Clean Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 right-5 z-50 card-midnight-hero text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl border border-amber-400/40"
        >
          {toastMessage}
        </div>
      )}

      <footer className="no-print bg-[#070d1f] text-slate-300 border-t border-amber-400/20 mt-auto">
        {activeSession.state.anonymousMode ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>ใบเสนอราคารถยนต์ (โหมดไม่ระบุตัวตน)</span>
            <span>ไม่แสดงโลโก้ ชื่อโชว์รูม และข้อมูลติดต่อเซลส์</span>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-amber-300">
                {settings.showroom.showroomName}
              </span>{' '}
              · {settings.showroom.branchName}
            </div>
            <div className="font-mono-num text-slate-400">
              {settings.showroom.salesName} · {settings.showroom.salesPhone}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
