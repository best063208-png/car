import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  Image as ImageIcon,
  Plus,
  Smartphone,
  X,
} from 'lucide-react';
import { BenefitsView } from './components/BenefitsView';
import { FinanceSubmissionView } from './components/FinanceSubmissionView';
import { QuotationPreviewView } from './components/QuotationPreviewView';
import { QuotationSheet } from './components/QuotationSheet';
import { SettingsTab, SettingsView } from './components/SettingsView';
import { StepWizard } from './components/StepWizard';
import {
  ALL_BENEFIT_KEYS,
  createInitialQuoteState,
  createQuoteSession,
  DEFAULT_QUOTATION_DESIGN,
  DEFAULT_SETTINGS,
} from './data/defaultCatalog';
import {
  BenefitCategories,
  DealerSettings,
  FinanceAttachment,
  QuoteSession,
  QuoteState,
  VehicleTrim,
  WizardStep,
} from './types/dealer';
import {
  ExportImageFormat,
  exportQuotationAsImage,
  exportQuotationAsPdf,
  isIosDevice,
  renderNodeToImageDataUrl,
  shareQuotationImage,
} from './utils/exportQuote';
import {
  buildLineShareText,
  calculateQuote,
  getLineShareUrl,
} from './utils/finance';

type AppView = 'calculator' | 'benefits' | 'quotation' | 'finance' | 'settings';
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
      quotationDesign: {
        ...DEFAULT_QUOTATION_DESIGN,
        ...(parsed.quotationDesign || {}),
      },
      savedDesigns: Array.isArray(parsed.savedDesigns)
        ? parsed.savedDesigns
        : [],
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
    selectedBenefitKeys: Array.isArray(rawState.selectedBenefitKeys)
      ? rawState.selectedBenefitKeys.filter((k) => ALL_BENEFIT_KEYS.includes(k))
      : [...ALL_BENEFIT_KEYS],
    disabledExtraBenefitIndices: Array.isArray(
      rawState.disabledExtraBenefitIndices
    )
      ? rawState.disabledExtraBenefitIndices.filter(
          (i) => typeof i === 'number' && Number.isInteger(i) && i >= 0
        )
      : [],
    bookingDetails:
      typeof rawState.bookingDetails === 'string'
        ? rawState.bookingDetails
        : '',
    customDeliveryItems: customItems,
    enableSpecialInterestDiscount: Boolean(
      rawState.enableSpecialInterestDiscount
    ),
    specialInterestLabel:
      typeof rawState.specialInterestLabel === 'string'
        ? rawState.specialInterestLabel
        : '',
    specialInterestDiscountMode:
      rawState.specialInterestDiscountMode === 'target_rate'
        ? 'target_rate'
        : 'discount_rate',
    specialInterestDiscountRate:
      typeof rawState.specialInterestDiscountRate === 'number' &&
      !Number.isNaN(rawState.specialInterestDiscountRate)
        ? Math.max(0, rawState.specialInterestDiscountRate)
        : 0,
    specialInterestTargetRate:
      rawState.specialInterestTargetRate !== null &&
      rawState.specialInterestTargetRate !== undefined &&
      !Number.isNaN(Number(rawState.specialInterestTargetRate))
        ? Math.max(0, Number(rawState.specialInterestTargetRate))
        : null,
    customFirstInstallmentAmount:
      rawState.customFirstInstallmentAmount !== null &&
      rawState.customFirstInstallmentAmount !== undefined &&
      !Number.isNaN(Number(rawState.customFirstInstallmentAmount))
        ? Math.max(0, Math.round(Number(rawState.customFirstInstallmentAmount)))
        : null,
    vehicleColor:
      typeof rawState.vehicleColor === 'string' ? rawState.vehicleColor : '',
    financeNote:
      typeof rawState.financeNote === 'string' ? rawState.financeNote : '',
  };
}

function loadSavedQuoteSessions(settings: DealerSettings): QuoteSession[] {
  try {
    const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
    if (!raw) return [createQuoteSession(settings)];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createQuoteSession(settings)];
    }
    return parsed.map((item: Partial<QuoteSession>) => {
      const fallback = createQuoteSession(settings);
      return {
        ...fallback,
        ...item,
        id: item.id || fallback.id,
        currentStep: item.currentStep ?? 1,
        hasVisitedPreview: Boolean(item.hasVisitedPreview),
        state: normalizeQuoteState(item.state, settings),
      };
    });
  } catch {
    return [createQuoteSession(settings)];
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
  const [settingsInitialTab, setSettingsInitialTab] =
    useState<SettingsTab>('showroom');
  const [theme, setTheme] = useState<ThemeMode>(() => loadSavedTheme());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() =>
    loadSavedTimestamp()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [financeAttachmentsByQuoteId, setFinanceAttachmentsByQuoteId] =
    useState<Record<string, FinanceAttachment[]>>({});
  const [galleryModal, setGalleryModal] = useState<{
    dataUrl: string | null;
    filename: string;
    permissionDenied: boolean;
  } | null>(null);

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
        disabledExtraBenefitIndices: [],
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
    const newSession = createQuoteSession(settings);
    setQuoteSessions((prev) => [newSession, ...prev]);
    setActiveQuoteId(newSession.id);
    setActiveView('calculator');
    showToast('สร้างใบเสนอราคาใหม่เรียบร้อยแล้ว');
  };

  const handleDuplicateActiveQuote = () => {
    if (!activeSession) return;
    const now = new Date();
    const cloned: QuoteSession = {
      ...activeSession,
      id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
    showToast('คัดลอกใบเสนอราคาเพื่อแก้ไขเทียบเงื่อนไขแล้ว');
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
    return `ใบเสนอราคา_${calc.trim.modelName}_${calc.trim.trimName}`
      .replace(/\s+/g, '_')
      .replace(/[^\w\u0E00-\u0E7F-]/g, '');
  };

  const handleShareImage = async () => {
    if (!exportSheetRef.current) return;
    setIsExporting(true);
    const filename = buildSafeFilename();
    try {
      const result = await shareQuotationImage(
        exportSheetRef.current,
        filename,
        `ใบเสนอราคา ${calc.trim.modelName} ${calc.trim.trimName}`
      );
      if (result === 'permission_denied') {
        const fallbackUrl = await renderNodeToImageDataUrl(
          exportSheetRef.current,
          'png'
        ).catch(() => null);
        setGalleryModal({
          dataUrl: fallbackUrl,
          filename: `${filename}.png`,
          permissionDenied: true,
        });
        showToast('สิทธิ์เข้าถึงรูปภาพ/การแชร์ถูกจำกัด กรุณาดูวิธีอนุญาตหรือกดค้างที่รูปเพื่อบันทึก');
      } else {
        showToast(
          result === 'shared'
            ? 'เปิดหน้าต่างแชร์รูปภาพเข้า LINE เรียบร้อยแล้ว'
            : 'บันทึกรูปภาพใบเสนอราคาแล้ว สามารถส่งต่อเข้า LINE ได้ทันที'
        );
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        showToast('เกิดข้อผิดพลาดในการสร้างรูปภาพสำหรับแชร์');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async (format: ExportImageFormat = 'png') => {
    if (!exportSheetRef.current) return;
    setIsExporting(true);
    const filename = buildSafeFilename();
    try {
      const result = await exportQuotationAsImage(
        exportSheetRef.current,
        filename,
        format,
        `ใบเสนอราคา ${calc.trim.modelName} ${calc.trim.trimName}`
      );
      if (result.method === 'share_sheet') {
        showToast(
          'เปิดเมนูแชร์ iPhone แล้ว — แตะ "บันทึกรูปภาพ" (Save Image) เพื่อลง Photos'
        );
      } else if (result.method === 'permission_denied') {
        setGalleryModal({
          dataUrl: result.dataUrl,
          filename: result.filename,
          permissionDenied: true,
        });
        showToast('ไม่สามารถบันทึกอัตโนมัติได้ กรุณาตรวจสอบสิทธิ์รูปภาพหรือกดค้างเพื่อบันทึก');
      } else if (isIosDevice()) {
        // On iPhone Safari inside embedded views, also display long-press save dialog
        setGalleryModal({
          dataUrl: result.dataUrl,
          filename: result.filename,
          permissionDenied: false,
        });
        showToast('สร้างรูปภาพแล้ว — สามารถกดค้างที่รูปเพื่อบันทึกลง Photos ได้ทันที');
      } else {
        showToast(`บันทึกรูปภาพ ${result.filename} เรียบร้อยแล้ว`);
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        showToast('เกิดข้อผิดพลาดในการสร้างรูปภาพ');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenGalleryGuide = async () => {
    const filename = `${buildSafeFilename()}.png`;
    let dataUrl: string | null = null;
    if (exportSheetRef.current) {
      try {
        dataUrl = await renderNodeToImageDataUrl(exportSheetRef.current, 'png');
      } catch {
        dataUrl = null;
      }
    }
    setGalleryModal({
      dataUrl,
      filename,
      permissionDenied: false,
    });
  };

  const handlePrintQuotation = () => {
    try {
      window.print();
    } catch {
      showToast('ไม่สามารถเปิดหน้าต่างพิมพ์ได้บนเบราว์เซอร์นี้ กรุณาลองกดปุ่มพิมพ์ของเบราว์เซอร์หรือบันทึกเป็น PDF');
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
    const fresh = createQuoteSession(DEFAULT_SETTINGS);
    setQuoteSessions([fresh]);
    setActiveQuoteId(fresh.id);
    setActiveView('calculator');
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_SAVED_AT_KEY);
    localStorage.removeItem(QUOTES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_QUOTE_STORAGE_KEY);
    showToast('คืนค่าข้อมูลเริ่มต้นทั้งหมดเรียบร้อยแล้ว');
  };

  const handleUpdateSessionStateById = (
    sessionId: string,
    updater: (prev: QuoteState) => QuoteState
  ) => {
    setQuoteSessions((prevList) =>
      prevList.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              state: updater(item.state),
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const handleAddFinanceAttachments = (sessionId: string, files: File[]) => {
    const newItems: FinanceAttachment[] = files.map((file, idx) => ({
      id: `att-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFinanceAttachmentsByQuoteId((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), ...newItems],
    }));
  };

  const handleReplaceFinanceAttachment = (
    sessionId: string,
    attachmentId: string,
    file: File
  ) => {
    setFinanceAttachmentsByQuoteId((prev) => {
      const list = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: list.map((item) => {
          if (item.id !== attachmentId) return item;
          URL.revokeObjectURL(item.previewUrl);
          return {
            id: item.id,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
            previewUrl: URL.createObjectURL(file),
          };
        }),
      };
    });
  };

  const handleRemoveFinanceAttachment = (
    sessionId: string,
    attachmentId: string
  ) => {
    setFinanceAttachmentsByQuoteId((prev) => {
      const list = prev[sessionId] || [];
      const target = list.find((item) => item.id === attachmentId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return {
        ...prev,
        [sessionId]: list.filter((item) => item.id !== attachmentId),
      };
    });
  };

  const handleClearFinanceAttachments = (sessionId: string) => {
    setFinanceAttachmentsByQuoteId((prev) => {
      const list = prev[sessionId] || [];
      list.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  };

  const navItems: { id: AppView; label: string }[] = [
    { id: 'calculator', label: 'กรอก 5 ขั้นตอน' },
    { id: 'benefits', label: 'สิทธิประโยชน์' },
    { id: 'quotation', label: 'ใบเสนอราคา' },
    { id: 'finance', label: 'ส่งงานไฟแนนซ์' },
    { id: 'settings', label: 'ตั้งค่า' },
  ];

  const handleNavClick = (viewId: AppView) => {
    if (viewId === 'settings') {
      setSettingsInitialTab('showroom');
    }
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('calculator')}
            className="text-base sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap truncate max-w-[55vw] cursor-pointer"
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
              className="btn-gold-copper min-h-[40px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ใบเสนอราคาใหม่</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Non-Sticky Navigation Strip */}
      <div className="no-print md:hidden bg-[#0c1733] border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto bg-white/5 p-1 rounded-xl border border-white/10">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`min-h-[42px] py-2 px-2.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex-1 flex items-center justify-center cursor-pointer ${
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
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
            onCopyLineText={handleCopyText}
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
            onPrintQuotation={handlePrintQuotation}
            onOpenGalleryGuide={handleOpenGalleryGuide}
            onOpenDesignSettings={() => {
              setSettingsInitialTab('design');
              setActiveView('settings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeView === 'finance' && (
          <FinanceSubmissionView
            settings={settings}
            quoteSessions={quoteSessions}
            activeQuoteId={activeSession.id}
            attachmentsByQuoteId={financeAttachmentsByQuoteId}
            onSelectQuoteSession={(sessionId) => setActiveQuoteId(sessionId)}
            onUpdateQuoteState={handleUpdateSessionStateById}
            onAddAttachments={handleAddFinanceAttachments}
            onReplaceAttachment={handleReplaceFinanceAttachment}
            onRemoveAttachment={handleRemoveFinanceAttachment}
            onClearAttachments={handleClearFinanceAttachments}
            onJumpToCalculatorStep={(sessionId, step) => {
              setActiveQuoteId(sessionId);
              handleEditQuoteSession(sessionId, step);
            }}
            onNotify={showToast}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            theme={theme}
            lastSavedAt={lastSavedAt}
            initialTab={settingsInitialTab}
            previewState={activeSession.state}
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
          />
        </div>
      </div>

      {/* Mobile Gallery Save & Permission Guide Modal */}
      {galleryModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="h-1 gold-copper-bar" />
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${
                      galleryModal.permissionDenied
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                    }`}
                  >
                    {galleryModal.permissionDenied ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
                      {galleryModal.permissionDenied
                        ? 'ระบบถูกปฏิเสธสิทธิ์บันทึกรูปภาพ'
                        : 'บันทึกรูปภาพลงแกลเลอรี (iPhone / Android)'}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      ชื่อไฟล์: <span className="font-mono-num">{galleryModal.filename}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGalleryModal(null)}
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center cursor-pointer"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {galleryModal.dataUrl && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-2 text-center">
                      กดค้างที่รูปภาพด้านล่าง แล้วเลือก &quot;บันทึกรูปภาพ&quot; / &quot;Add to Photos&quot;
                    </div>
                    <img
                      src={galleryModal.dataUrl}
                      alt={galleryModal.filename}
                      className="w-full max-h-64 object-contain rounded-lg mx-auto bg-white"
                    />
                  </div>
                  <a
                    href={galleryModal.dataUrl}
                    download={galleryModal.filename}
                    className="btn-gold-copper w-full min-h-[46px] px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลดไฟล์รูปภาพ ({galleryModal.filename.split('.').pop()?.toUpperCase()})
                  </a>
                </div>
              )}

              {/* Permission Guide for iPhone & Android */}
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  วิธีอนุญาตสิทธิ์เข้าถึงรูปภาพ / ดาวน์โหลด หากบันทึกไม่ได้
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    สำหรับ iPhone / iPad (iOS)
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                    <li>เปิดแอป <strong>การตั้งค่า (Settings)</strong> → <strong>แอป (Apps)</strong> → <strong>Safari</strong> (หรือ LINE / Chrome ที่ใช้อยู่)</li>
                    <li>แตะ <strong>รูปภาพ (Photos)</strong> แล้วเลือกอนุญาต <strong>เพิ่มรูปภาพเท่านั้น (Add Photos Only)</strong> หรือ <strong>ทั้งหมด</strong></li>
                    <li>หากกดปุ่มแชร์แล้ว ให้เลื่อนลงแล้วแตะ <strong>&quot;บันทึกรูปภาพ&quot; (Save Image)</strong> เพื่อลงแอป Photos ทันที</li>
                  </ol>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    สำหรับ Android (Chrome / LINE)
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                    <li>เปิด <strong>การตั้งค่า (Settings)</strong> → <strong>แอป (Apps)</strong> → เลือก <strong>Chrome</strong> หรือเบราว์เซอร์ที่ใช้งาน</li>
                    <li>แตะ <strong>การอนุญาต (Permissions)</strong> → <strong>รูปภาพและวิดีโอ (Photos and videos)</strong> → เลือก <strong>อนุญาต (Allow)</strong></li>
                    <li>ไฟล์รูปที่ดาวน์โหลดจะอยู่ในโฟลเดอร์ <strong>Downloads / Gallery</strong> ของเครื่องทันที</li>
                  </ol>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGalleryModal(null)}
                className="w-full min-h-[44px] px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 z-50 card-midnight-hero text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl border border-amber-400/40 shadow-xl"
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
