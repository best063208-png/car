import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileCheck2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  ALL_BENEFIT_KEYS,
  DOWN_PERCENT_TIERS,
  TENOR_OPTIONS,
} from '../data/defaultCatalog';
import {
  BenefitCategories,
  BenefitSelectionKey,
  BrandId,
  CalculatedQuote,
  CustomDeliveryItem,
  DealerSettings,
  QuoteSession,
  QuoteState,
  VatMode,
  VehicleTrim,
  WizardStep,
} from '../types/dealer';
import {
  formatRate,
  formatTHB,
  formatTHBDecimal,
} from '../utils/finance';

interface StepWizardProps {
  settings: DealerSettings;
  session: QuoteSession;
  calc: CalculatedQuote;
  onUpdateState: (updater: (prev: QuoteState) => QuoteState) => void;
  onSelectTrim: (trim: VehicleTrim) => void;
  onChangeStep: (step: WizardStep) => void;
  onSaveBenefitsToModel: (trimId: string, benefits: BenefitCategories) => void;
  onOpenBenefitsPage: () => void;
  onCopyLineText?: () => void;
}

const DISCOUNT_PRESETS = [0, 20000, 30000, 50000, 100000];
const SUBSIDY_PRESETS = [0, 20000, 30000, 50000, 80000, 100000];
const INTEREST_RATE_PRESETS = [1.99, 2.49, 2.99, 3.5];
const BOOKING_PRESETS = [0, 4000, 5000, 10000];

const CORE_BENEFIT_FIELDS: { key: BenefitSelectionKey; label: string }[] = [
  { key: 'insuranceAndAct', label: 'ประกันภัยและการคุ้มครอง' },
  { key: 'homeCharger', label: 'อุปกรณ์ชาร์จ (Home Charger)' },
  { key: 'vehicleWarranty', label: 'การรับประกันรถยนต์' },
  { key: 'batteryWarranty', label: 'การรับประกันแบตเตอรี่' },
  { key: 'lifetimeBatteryWarranty', label: 'Lifetime Battery Warranty' },
  { key: 'roadsideAssistance', label: 'บริการช่วยเหลือฉุกเฉินและบริการอื่น ๆ' },
];

const CARD_SURFACE = 'card-premium rounded-2xl';

const WIZARD_STEPS: { step: Exclude<WizardStep, 'preview'>; title: string; shortTitle: string }[] = [
  { step: 1, title: '1. เลือกรุ่นรถยนต์', shortTitle: 'เลือกรุ่นรถ' },
  { step: 2, title: '2. ราคาและส่วนลด', shortTitle: 'ราคา & VAT' },
  { step: 3, title: '3. ซื้อสด / เงินดาวน์และผ่อน', shortTitle: 'ซื้อสด / ผ่อน' },
  { step: 4, title: '4. ค่าใช้จ่ายวันรับรถ', shortTitle: 'ยอดวันรับรถ' },
  { step: 5, title: '5. ลูกค้าและโปรโมชั่น', shortTitle: 'ลูกค้า & โปร' },
];

const VAT_MODES: { value: VatMode; title: string; desc: string }[] = [
  {
    value: 'included_with_subsidy_vat',
    title: 'ราคารถรวม VAT 7% แล้ว + คิด VAT 7% กรณีซับดาวน์',
    desc: 'มาตรฐานดีลเลอร์: ราคารถรวม VAT 7% และเก็บ VAT 7% ของยอดซับดาวน์ในวันรับรถ',
  },
  {
    value: 'included_no_subsidy_vat',
    title: 'ราคารถรวม VAT 7% แล้ว + ไม่เก็บ VAT กรณีซับดาวน์',
    desc: 'ราคารถรวม VAT 7% และไม่เรียกเก็บ VAT จากส่วนลดซับดาวน์เพิ่มจากลูกค้า',
  },
];

export const StepWizard: React.FC<StepWizardProps> = ({
  settings,
  session,
  calc,
  onUpdateState,
  onSelectTrim,
  onChangeStep,
  onSaveBenefitsToModel,
  onOpenBenefitsPage,
  onCopyLineText,
}) => {
  const { state } = session;
  const currentStep = session.currentStep === 'preview' ? 1 : session.currentStep;
  const [brandFilter, setBrandFilter] = useState<'ALL' | BrandId>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [autoAdvanceOnSelect, setAutoAdvanceOnSelect] = useState<boolean>(true);
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const [specialDiscountDraft, setSpecialDiscountDraft] = useState<string | null>(
    null
  );
  const [specialAfterRateDraft, setSpecialAfterRateDraft] = useState<
    string | null
  >(null);
  const [firstInstallmentDraft, setFirstInstallmentDraft] = useState<
    string | null
  >(null);

  const brandFilteredTrims = useMemo(
    () =>
      settings.trims.filter(
        (t) => t.active && (brandFilter === 'ALL' || t.brand === brandFilter)
      ),
    [settings.trims, brandFilter]
  );

  const availableModels = useMemo(() => {
    const map = new Map<string, string>();
    brandFilteredTrims.forEach((trim) => {
      if (!map.has(trim.modelId)) {
        map.set(trim.modelId, trim.modelName);
      }
    });
    return Array.from(map.entries()).map(([modelId, modelName]) => ({
      modelId,
      modelName,
    }));
  }, [brandFilteredTrims]);

  const activeTrims = useMemo(
    () =>
      brandFilteredTrims.filter(
        (t) => modelFilter === 'ALL' || t.modelId === modelFilter
      ),
    [brandFilteredTrims, modelFilter]
  );

  const modelGroups = useMemo(() => {
    const map = new Map<string, VehicleTrim[]>();
    activeTrims.forEach((trim) => {
      const list = map.get(trim.modelId) || [];
      list.push(trim);
      map.set(trim.modelId, list);
    });
    return Array.from(map.values());
  }, [activeTrims]);

  const activeMatrix =
    calc.trim.rateTable === 'lumin'
      ? settings.rateMatrices.lumin
      : settings.rateMatrices.standard;

  const toggleFreebie = (id: string) => {
    onUpdateState((prev) => {
      const exists = prev.selectedFreebieIds.includes(id);
      return {
        ...prev,
        selectedFreebieIds: exists
          ? prev.selectedFreebieIds.filter((item) => item !== id)
          : [...prev.selectedFreebieIds, id],
      };
    });
  };

  const updateBenefitField = <K extends keyof BenefitCategories>(
    key: K,
    value: BenefitCategories[K]
  ) => {
    onUpdateState((prev) => ({
      ...prev,
      benefitsOverride: {
        ...(prev.benefitsOverride ?? calc.trim.benefits),
        [key]: value,
      },
    }));
  };

  const selectedBenefitKeys = state.selectedBenefitKeys ?? ALL_BENEFIT_KEYS;
  const disabledExtraIndices = state.disabledExtraBenefitIndices ?? [];

  const toggleBenefitKey = (key: BenefitSelectionKey) => {
    onUpdateState((prev) => {
      const current = prev.selectedBenefitKeys ?? ALL_BENEFIT_KEYS;
      const exists = current.includes(key);
      return {
        ...prev,
        selectedBenefitKeys: exists
          ? current.filter((k) => k !== key)
          : [...current, key],
      };
    });
  };

  const toggleExtraBenefit = (idx: number) => {
    onUpdateState((prev) => {
      const current = prev.disabledExtraBenefitIndices ?? [];
      const isDisabled = current.includes(idx);
      return {
        ...prev,
        disabledExtraBenefitIndices: isDisabled
          ? current.filter((i) => i !== idx)
          : [...current, idx],
      };
    });
  };

  const selectAllBenefits = () => {
    onUpdateState((prev) => ({
      ...prev,
      selectedBenefitKeys: [...ALL_BENEFIT_KEYS],
      disabledExtraBenefitIndices: [],
    }));
  };

  const clearAllBenefits = () => {
    onUpdateState((prev) => ({
      ...prev,
      selectedBenefitKeys: [],
      disabledExtraBenefitIndices: calc.activeBenefits.extraItems.map(
        (_, i) => i
      ),
    }));
  };

  const addDeliveryItem = (category: 'accessory' | 'other') => {
    const newItem: CustomDeliveryItem = {
      id: `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      label: '',
      amount: '',
    };
    onUpdateState((prev) => ({
      ...prev,
      customDeliveryItems: [...(prev.customDeliveryItems || []), newItem],
    }));
  };

  const updateDeliveryItem = (
    id: string,
    patch: Partial<CustomDeliveryItem>
  ) => {
    onUpdateState((prev) => ({
      ...prev,
      customDeliveryItems: (prev.customDeliveryItems || []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const removeDeliveryItem = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      customDeliveryItems: (prev.customDeliveryItems || []).filter(
        (item) => item.id !== id
      ),
    }));
  };

  const handleVatModeChange = (mode: VatMode) => {
    onUpdateState((prev) => ({
      ...prev,
      vatMode: mode,
      includeVat: mode !== 'included_no_subsidy_vat',
    }));
  };

  const goNext = () => {
    if (currentStep < 5) {
      onChangeStep((currentStep + 1) as WizardStep);
    } else {
      onChangeStep('preview');
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      onChangeStep((currentStep - 1) as WizardStep);
    }
  };

  const progressPercent = Math.round((currentStep / 5) * 100);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 5-Step Progress Navigation Bar (Mobile-First + Desktop) */}
      <div className={`${CARD_SURFACE} p-3 sm:p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-extrabold text-slate-900 dark:text-white">
            ขั้นตอนที่ {currentStep} จาก 5 ·{' '}
            <span className="text-amber-700 dark:text-amber-400">
              {WIZARD_STEPS[currentStep - 1]?.shortTitle}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono-num font-bold text-slate-500 dark:text-slate-400">
              {progressPercent}%
            </span>
            <button
              type="button"
              onClick={() => onChangeStep('preview')}
              className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-400/50 bg-amber-50/80 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 text-[11px] font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              ดูใบเสนอราคา
            </button>
          </div>
        </div>

        {/* Continuous Progress Bar */}
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full gold-copper-bar rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Mobile 5-column zero-scroll step selector */}
        <div className="grid grid-cols-5 gap-1.5 sm:hidden">
          {WIZARD_STEPS.map((item) => {
            const isActive = currentStep === item.step;
            const isPassed = currentStep > item.step || session.hasVisitedPreview;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => onChangeStep(item.step)}
                className={`min-h-[48px] px-1 py-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-b from-[#070d1f] to-[#162652] text-white border-amber-400/70 shadow-sm'
                    : isPassed
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-slate-800 dark:text-slate-200 border-emerald-200 dark:border-emerald-800/70'
                    : 'bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md text-[11px] font-extrabold inline-flex items-center justify-center ${
                    isActive
                      ? 'btn-gold-copper text-slate-950'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isPassed && !isActive ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    item.step
                  )}
                </span>
                <span
                  className={`text-[10px] font-bold leading-tight truncate max-w-full ${
                    isActive ? 'text-amber-300' : ''
                  }`}
                >
                  {item.shortTitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop 5-step pill row */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-0.5">
          {WIZARD_STEPS.map((item) => {
            const isActive = currentStep === item.step;
            const isPassed = currentStep > item.step || session.hasVisitedPreview;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => onChangeStep(item.step)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#070d1f] to-[#162652] text-white border-amber-400/60 shadow-sm'
                    : isPassed
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-slate-800 dark:text-slate-200 border-emerald-200 dark:border-emerald-800/70 hover:border-amber-400'
                    : 'bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-extrabold inline-flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'btn-gold-copper text-slate-950'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isPassed && !isActive ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    item.step
                  )}
                </span>
                <div>
                  <div className="text-xs font-bold leading-tight">
                    ขั้นตอนที่ {item.step}
                  </div>
                  <div
                    className={`text-[11px] leading-tight mt-0.5 ${
                      isActive
                        ? 'text-amber-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.shortTitle}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onChangeStep('preview')}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/50 bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            ดูใบเสนอราคา
          </button>
        </div>
      </div>

      {/* Mobile Compact Live Summary Strip */}
      <div className="lg:hidden card-midnight-hero text-white rounded-2xl px-4 py-3 border border-amber-400/30 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-amber-300 font-bold truncate">
            {calc.trim.modelName} · {calc.trim.trimName}
          </div>
          <div className="text-xs text-slate-300 font-mono-num mt-0.5">
            {calc.isCashPurchase
              ? `ซื้อเงินสด · สุทธิ ${formatTHB(calc.netCarPrice)} ฿`
              : `${formatTHB(calc.monthlyInstallment)} ฿/ด. · ${calc.tenorMonths} งวด`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-slate-300">วันรับรถสุทธิ</div>
          <div className="text-sm font-extrabold font-mono-num text-emerald-400">
            {formatTHB(calc.totalDeliveryCashDue)} ฿
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Left: Active Step Form */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 sm:space-y-6">
          {/* STEP 1: Vehicle Selection */}
          {currentStep === 1 && (
            <section className={`${CARD_SURFACE} p-4 sm:p-7 space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    ขั้นตอนที่ 1 จาก 5
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                    เลือกรุ่นรถยนต์ และรุ่นย่อย
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    แตะเลือกรุ่นย่อยที่ต้องการ ระบบจะพาไปยังขั้นตอนที่ 2 อัตโนมัติ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl">
                    {(['ALL', 'DEEPAL', 'CHANGAN'] as const).map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => {
                          setBrandFilter(brand);
                          setModelFilter('ALL');
                        }}
                        className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          brandFilter === brand
                            ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-400 dark:text-amber-300 border border-transparent dark:border-amber-400/40 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {brand === 'ALL' ? 'ทุกยี่ห้อ' : brand}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Model Quick-Filter Pills + Auto-Advance Switch */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    เลือกรุ่นรถ (กรองด่วน)
                  </span>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAdvanceOnSelect}
                      onChange={(e) => setAutoAdvanceOnSelect(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                    แตะรุ่นย่อยแล้วไปขั้นตอนถัดไปอัตโนมัติ
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModelFilter('ALL')}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      modelFilter === 'ALL'
                        ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/60'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                    }`}
                  >
                    ทุกรุ่น
                  </button>
                  {availableModels.map((m) => (
                    <button
                      key={m.modelId}
                      type="button"
                      onClick={() => setModelFilter(m.modelId)}
                      className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        modelFilter === m.modelId
                          ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/60'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                      }`}
                    >
                      {m.modelName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model & Trim Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modelGroups.map((group) => {
                  const first = group[0];
                  const isDeepal = first.brand === 'DEEPAL';
                  return (
                    <div
                      key={first.modelId}
                      className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900/75 dark:to-[#0a1224]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-sm font-bold text-slate-950 dark:text-white">
                          {first.modelName}
                        </span>
                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            isDeepal
                              ? 'text-sky-700 dark:text-sky-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {first.brand} · {first.powertrain}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {group.map((trim) => {
                          const isSelected = trim.id === calc.trim.id;
                          const hasSpecial = trim.specialPrice < trim.normalPrice;
                          return (
                            <button
                              key={trim.id}
                              type="button"
                              onClick={() => {
                                onSelectTrim(trim);
                                if (autoAdvanceOnSelect) {
                                  onChangeStep(2);
                                }
                              }}
                              className={`w-full min-h-[52px] text-left px-3.5 py-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#070d1f] via-[#0d1a3a] to-[#162652] text-white border-amber-400/60 shadow-md'
                                  : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold truncate">
                                  {trim.trimName}
                                </span>
                                <span
                                  className={`text-sm font-bold font-mono-num whitespace-nowrap ${
                                    isSelected
                                      ? 'text-amber-300'
                                      : 'text-slate-950 dark:text-white'
                                  }`}
                                >
                                  {formatTHB(trim.specialPrice)} ฿
                                </span>
                              </div>
                              {hasSpecial && (
                                <div
                                  className={`text-xs font-mono-num mt-0.5 ${
                                    isSelected
                                      ? 'text-slate-300'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  ราคาปกติ {formatTHB(trim.normalPrice)} บาท
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 2: Pricing, Discounts & VAT */}
          {currentStep === 2 && (
            <section className={`${CARD_SURFACE} p-5 sm:p-7 space-y-6`}>
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  ขั้นตอนที่ 2 จาก 5
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                  กำหนดราคา ส่วนลด และรูปแบบการคำนวณ VAT
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ตรวจสอบราคารถยนต์ปกติ กรอกส่วนลดตัวรถ ซับดาวน์ และเลือกรูปแบบภาษีมูลค่าเพิ่ม 7%
                </p>
              </div>

              {/* Base Price Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ราคารถยนต์ปกติ
                  </div>
                  <div className="text-xl font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                    {formatTHB(calc.normalPrice)}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      บาท
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ราคาหลังหักส่วนลดตัวรถ
                  </div>
                  <div className="text-xl font-extrabold font-mono-num text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatTHB(calc.priceAfterDiscount)}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      บาท
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 mt-1">
                    ส่วนลดตัวรถ {formatTHB(calc.vehicleDiscount)} บาท
                  </div>
                </div>
              </div>

              {/* Vehicle Discount & Down Payment Subsidy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ส่วนลดราคาตัวรถ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={state.vehicleDiscount === 0 ? '' : state.vehicleDiscount}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        vehicleDiscount: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-4 py-3 text-base font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {DISCOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          onUpdateState((p) => ({ ...p, vehicleDiscount: preset }))
                        }
                        className={`px-2.5 py-1 text-xs font-mono-num font-semibold rounded-lg border transition-colors cursor-pointer ${
                          state.vehicleDiscount === preset
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/50'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                        }`}
                      >
                        {preset === 0 ? 'ไม่มี' : formatTHB(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ส่วนลดเพิ่มเป็นเงินดาวน์ / ซับดาวน์ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={
                      state.downPaymentSubsidy === 0 ? '' : state.downPaymentSubsidy
                    }
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        downPaymentSubsidy: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-4 py-3 text-base font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {SUBSIDY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          onUpdateState((p) => ({
                            ...p,
                            downPaymentSubsidy: preset,
                          }))
                        }
                        className={`px-2.5 py-1 text-xs font-mono-num font-semibold rounded-lg border transition-colors cursor-pointer ${
                          state.downPaymentSubsidy === preset
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/50'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                        }`}
                      >
                        {preset === 0 ? 'ไม่มี' : formatTHB(preset)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* VAT Mode Selector */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  รูปแบบการคำนวณ VAT 7%
                </label>
                <div className="space-y-2.5">
                  {VAT_MODES.map((mode) => {
                    const active = calc.vatMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => handleVatModeChange(mode.value)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          active
                            ? 'bg-slate-950 dark:bg-[#162652] text-white border-amber-400/60 shadow-sm'
                            : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            active
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                          )}
                        </span>
                        <div>
                          <div
                            className={`text-xs sm:text-sm font-bold ${
                              active ? 'text-amber-300' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {mode.title}
                          </div>
                          <div
                            className={`text-xs mt-0.5 ${
                              active ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {mode.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Net Price Summary after VAT */}
              <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 space-y-2 text-sm">
                {calc.downPaymentSubsidy > 0 && (
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      VAT 7% กรณีซับดาวน์ (ชำระวันรับรถ)
                    </span>
                    <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                      {calc.includeVat
                        ? `${formatTHB(calc.subsidyVatAmount)} บาท`
                        : 'ไม่เก็บ (0 บาท)'}
                    </span>
                  </div>
                )}
                <div
                  className={`${
                    calc.downPaymentSubsidy > 0
                      ? 'pt-2 border-t border-amber-200/80 dark:border-amber-400/20 '
                      : ''
                  }flex justify-between items-baseline gap-4`}
                >
                  <span className="font-bold text-slate-950 dark:text-white">
                    ราคารถสุทธิ
                  </span>
                  <span className="text-lg font-extrabold font-mono-num text-slate-950 dark:text-amber-300">
                    {formatTHB(calc.netCarPrice)} บาท
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: Payment Type (Cash / Finance), Down Payment, Tenor & Installments */}
          {currentStep === 3 && (
            <section className={`${CARD_SURFACE} p-5 sm:p-7 space-y-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    ขั้นตอนที่ 3 จาก 5
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                    รูปแบบการชำระเงิน (ซื้อสด / จัดไฟแนนซ์)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    เลือกซื้อเงินสด หรือปรับเงินดาวน์ ระยะเวลาผ่อน และดอกเบี้ย ระบบจะคำนวณใหม่ทันที
                  </p>
                </div>

                {!calc.isCashPurchase && (
                  <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl self-start">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState((p) => ({
                          ...p,
                          downMode: 'percent',
                          downPercentInput: Number(calc.downPercentActual.toFixed(1)),
                        }))
                      }
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        state.downMode === 'percent'
                          ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-400 dark:text-amber-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      คำนวณจาก % ดาวน์
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState((p) => ({
                          ...p,
                          downMode: 'amount',
                          downAmountInput: calc.downPaymentGross,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        state.downMode === 'amount'
                          ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-400 dark:text-amber-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      ระบุยอดเงินดาวน์
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Mode Switcher: Finance vs Cash */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState((p) => ({ ...p, purchaseType: 'finance' }))
                  }
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    !calc.isCashPurchase
                      ? 'bg-gradient-to-r from-[#070d1f] to-[#162652] text-white border-amber-400/70 shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">
                      จัดไฟแนนซ์ (ผ่อนชำระ)
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        !calc.isCashPurchase
                          ? 'bg-amber-400 text-slate-950'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {!calc.isCashPurchase && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      !calc.isCashPurchase
                        ? 'text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    คำนวณเงินดาวน์ ระยะเวลาผ่อน และยอดผ่อนต่อเดือน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateState((p) => ({ ...p, purchaseType: 'cash' }))
                  }
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    calc.isCashPurchase
                      ? 'bg-gradient-to-r from-[#070d1f] to-[#162652] text-white border-amber-400/70 shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">
                      ซื้อสด (ชำระเงินสด)
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        calc.isCashPurchase
                          ? 'bg-amber-400 text-slate-950'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {calc.isCashPurchase && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      calc.isCashPurchase
                        ? 'text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ชำระเต็มจำนวน ไม่มีดอกเบี้ยและค่างวดรายเดือน
                  </div>
                </button>
              </div>

              {calc.isCashPurchase ? (
                <div className="space-y-4">
                  <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                    <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">
                      สรุปรายการซื้อเงินสด (ชำระเต็มจำนวน)
                    </div>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
                      ระบบจะนำราคารถสุทธิ {formatTHB(calc.netCarPrice)} บาท ไปคำนวณรวมกับค่าจดทะเบียน ค่ามัดจำป้ายแดง ค่าอุปกรณ์ตกแต่ง และหักเงินจองในขั้นตอนที่ 4 โดยอัตโนมัติ (ไม่มีดอกเบี้ยและยอดผ่อนรายเดือน)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        ราคารถสุทธิ
                      </div>
                      <div className="text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                        {formatTHB(calc.netCarPrice)} ฿
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        ยอดจัดไฟแนนซ์
                      </div>
                      <div className="text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                        0 ฿
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        ดอกเบี้ยทั้งหมด
                      </div>
                      <div className="text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                        0 ฿
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#070d1f] to-[#162652] text-white border border-amber-400/50">
                      <div className="text-[11px] font-semibold text-slate-300">
                        รูปแบบการซื้อ
                      </div>
                      <div className="text-lg font-extrabold text-amber-300 mt-1">
                        ซื้อเงินสด
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {/* Down Payment Tiers & Input */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {DOWN_PERCENT_TIERS.map((tier) => {
                    const isDisabled = calc.trim.rateTable === 'lumin' && tier === 5;
                    const active =
                      state.downMode === 'percent' &&
                      Math.abs(state.downPercentInput - tier) < 0.05;
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={isDisabled}
                        onClick={() =>
                          onUpdateState((p) => ({
                            ...p,
                            downMode: 'percent',
                            downPercentInput: tier,
                            downAmountInput: Math.round(calc.netCarPrice * (tier / 100)),
                          }))
                        }
                        className={`px-3.5 py-2 text-xs sm:text-sm font-bold font-mono-num rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          active
                            ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-300 border-amber-400/60 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {tier}%
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {state.downMode === 'percent'
                        ? 'เปอร์เซ็นต์เงินดาวน์ (%)'
                        : 'จำนวนเงินดาวน์ (บาท)'}
                    </label>
                    {state.downMode === 'percent' ? (
                      <input
                        type="number"
                        min={0}
                        max={95}
                        step={1}
                        value={state.downPercentInput}
                        onChange={(e) =>
                          onUpdateState((p) => ({
                            ...p,
                            downPercentInput: Math.min(
                              95,
                              Math.max(0, Number(e.target.value) || 0)
                            ),
                          }))
                        }
                        className="w-full px-4 py-2.5 text-base font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={state.downAmountInput}
                        onChange={(e) =>
                          onUpdateState((p) => ({
                            ...p,
                            downAmountInput: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-4 py-2.5 text-base font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num mt-1">
                      เงินดาวน์เต็ม: {formatTHB(calc.downPaymentGross)} บาท (
                      {calc.downPercentActual.toFixed(1)}%)
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        อัตราดอกเบี้ยต่อปี (%)
                      </label>
                      {state.customInterestRate !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setRateDraft(null);
                            onUpdateState((p) => ({
                              ...p,
                              customInterestRate: null,
                            }));
                          }}
                          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          ใช้ค่าตามตาราง
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={25}
                      step={0.01}
                      value={
                        rateDraft !== null
                          ? rateDraft
                          : state.customInterestRate !== null
                          ? String(state.customInterestRate)
                          : calc.tableRate !== null
                          ? String(calc.tableRate)
                          : ''
                      }
                      placeholder={
                        calc.isRateUnavailable
                          ? 'ระบุอัตราดอกเบี้ย เช่น 1.99'
                          : 'เช่น 1.99, 2.49, 2.99'
                      }
                      onFocus={() => {
                        const initial =
                          state.customInterestRate !== null
                            ? String(state.customInterestRate)
                            : calc.tableRate !== null
                            ? String(calc.tableRate)
                            : '';
                        setRateDraft(initial);
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRateDraft(raw);
                        const trimmed = raw.trim();
                        if (trimmed === '') {
                          return;
                        }
                        const parsed = Number(trimmed);
                        if (!Number.isNaN(parsed)) {
                          onUpdateState((p) => ({
                            ...p,
                            customInterestRate: Math.min(25, Math.max(0, parsed)),
                          }));
                        }
                      }}
                      onBlur={() => {
                        if (rateDraft !== null && rateDraft.trim() === '') {
                          onUpdateState((p) => ({
                            ...p,
                            customInterestRate: null,
                          }));
                        }
                        setRateDraft(null);
                      }}
                      className="w-full px-4 py-2.5 text-base font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRateDraft(null);
                          onUpdateState((p) => ({
                            ...p,
                            customInterestRate: null,
                          }));
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          state.customInterestRate === null
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/50'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                        }`}
                      >
                        ตามตาราง
                      </button>
                      {INTEREST_RATE_PRESETS.map((presetRate) => {
                        const active =
                          state.customInterestRate !== null &&
                          Math.abs(state.customInterestRate - presetRate) < 0.001;
                        return (
                          <button
                            key={presetRate}
                            type="button"
                            onClick={() => {
                              setRateDraft(null);
                              onUpdateState((p) => ({
                                ...p,
                                customInterestRate: presetRate,
                              }));
                            }}
                            className={`px-2.5 py-1 text-xs font-mono-num font-semibold rounded-lg border transition-colors cursor-pointer ${
                              active
                                ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/50'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                            }`}
                          >
                            {presetRate.toFixed(2)}%
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      {state.customInterestRate !== null
                        ? `กำหนดอัตราดอกเบี้ยเอง: ${state.customInterestRate.toFixed(2)}% ต่อปี`
                        : calc.isRateUnavailable
                        ? 'ตารางไม่เปิดรับเงื่อนไขนี้ สามารถเลือกหรือกรอกอัตราดอกเบี้ยเองได้'
                        : `ตาราง ${calc.trim.rateTable === 'lumin' ? 'Lumin L DC' : 'มาตรฐาน'}: ${formatRate(
                            calc.tableRate
                          )}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenor Options */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ระยะเวลาผ่อนชำระ
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {TENOR_OPTIONS.map((t) => {
                    const matchedRate = calc.tierMatched
                      ? activeMatrix[calc.tierMatched][t.months]
                      : null;
                    const active = state.tenorMonths === t.months;
                    return (
                      <button
                        key={t.months}
                        type="button"
                        onClick={() =>
                          onUpdateState((p) => ({ ...p, tenorMonths: t.months }))
                        }
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          active
                            ? 'bg-gradient-to-b from-[#070d1f] to-[#162652] text-white border-amber-400/60 shadow-md'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <div className="text-sm font-extrabold font-mono-num">
                          {t.months} เดือน
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${
                            active ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {t.years} ปี
                        </div>
                        <div
                          className={`text-xs font-mono-num font-bold mt-1 ${
                            active
                              ? 'text-amber-300'
                              : matchedRate === null
                              ? 'text-slate-400 dark:text-slate-500'
                              : 'text-sky-700 dark:text-sky-400'
                          }`}
                        >
                          {formatRate(matchedRate)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paired Finance Adjustments: Special Interest Discount & Early First Installment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch pt-1">
                {/* Left: Special Interest Rate Discount (Customizable, Can Hide/Disable) */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3.5 transition-all ${
                    state.enableSpecialInterestDiscount
                      ? 'bg-amber-50/60 dark:bg-amber-500/10 border-amber-300 dark:border-amber-400/50'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white">
                          ส่วนลดดอกเบี้ยพิเศษ
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          กรอกหัวข้อ ดอกเบี้ยก่อนลด % ส่วนลด และดอกเบี้ยหลังลดได้เอง
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialDiscountDraft(null);
                          setSpecialAfterRateDraft(null);
                          onUpdateState((p) => ({
                            ...p,
                            enableSpecialInterestDiscount:
                              !p.enableSpecialInterestDiscount,
                          }));
                        }}
                        className={`min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg border shrink-0 transition-colors cursor-pointer ${
                          state.enableSpecialInterestDiscount
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/60'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {state.enableSpecialInterestDiscount
                          ? 'เปิดแสดงรายการ'
                          : 'ปิดอยู่'}
                      </button>
                    </div>

                    {state.enableSpecialInterestDiscount ? (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ข้อความ / ชื่อรายการส่วนลดดอกเบี้ย (แก้ไขได้อิสระ)
                          </label>
                          <input
                            type="text"
                            value={state.specialInterestLabel ?? ''}
                            placeholder="ระบุข้อความ เช่น ส่วนลดดอกเบี้ยพิเศษ"
                            onChange={(e) =>
                              onUpdateState((p) => ({
                                ...p,
                                specialInterestLabel: e.target.value,
                              }))
                            }
                            className="w-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              ดอกเบี้ยก่อนลด (%)
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={25}
                              step={0.01}
                              value={
                                rateDraft !== null
                                  ? rateDraft
                                  : state.customInterestRate !== null
                                  ? String(state.customInterestRate)
                                  : calc.tableRate !== null
                                  ? String(calc.tableRate)
                                  : ''
                              }
                              placeholder="เช่น 2.49"
                              onFocus={() => {
                                const initial =
                                  state.customInterestRate !== null
                                    ? String(state.customInterestRate)
                                    : calc.tableRate !== null
                                    ? String(calc.tableRate)
                                    : '';
                                setRateDraft(initial);
                              }}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setRateDraft(raw);
                                const trimmed = raw.trim();
                                if (trimmed === '') return;
                                const parsed = Number(trimmed);
                                if (!Number.isNaN(parsed)) {
                                  onUpdateState((p) => ({
                                    ...p,
                                    customInterestRate: Math.min(
                                      25,
                                      Math.max(0, parsed)
                                    ),
                                  }));
                                }
                              }}
                              onBlur={() => {
                                if (
                                  rateDraft !== null &&
                                  rateDraft.trim() === ''
                                ) {
                                  onUpdateState((p) => ({
                                    ...p,
                                    customInterestRate: null,
                                  }));
                                }
                                setRateDraft(null);
                              }}
                              className="w-full min-h-[40px] px-2.5 py-1.5 text-sm font-bold font-mono-num bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              ส่วนลดดอกเบี้ย (%)
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={25}
                              step={0.01}
                              value={
                                specialDiscountDraft !== null
                                  ? specialDiscountDraft
                                  : state.specialInterestDiscountMode ===
                                    'target_rate'
                                  ? String(calc.specialInterestDiscountApplied)
                                  : String(
                                      state.specialInterestDiscountRate ?? 0
                                    )
                              }
                              placeholder="เช่น 0.25"
                              onFocus={() => {
                                const initial =
                                  state.specialInterestDiscountMode ===
                                  'target_rate'
                                    ? String(calc.specialInterestDiscountApplied)
                                    : String(
                                        state.specialInterestDiscountRate ?? 0
                                      );
                                setSpecialDiscountDraft(initial);
                              }}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setSpecialDiscountDraft(raw);
                                const trimmed = raw.trim();
                                if (trimmed === '') return;
                                const parsed = Number(trimmed);
                                if (!Number.isNaN(parsed)) {
                                  setSpecialAfterRateDraft(null);
                                  onUpdateState((p) => ({
                                    ...p,
                                    specialInterestDiscountMode: 'discount_rate',
                                    specialInterestDiscountRate: Math.min(
                                      25,
                                      Math.max(0, parsed)
                                    ),
                                    specialInterestTargetRate: null,
                                  }));
                                }
                              }}
                              onBlur={() => {
                                if (
                                  specialDiscountDraft !== null &&
                                  specialDiscountDraft.trim() === ''
                                ) {
                                  onUpdateState((p) => ({
                                    ...p,
                                    specialInterestDiscountMode: 'discount_rate',
                                    specialInterestDiscountRate: 0,
                                    specialInterestTargetRate: null,
                                  }));
                                }
                                setSpecialDiscountDraft(null);
                              }}
                              className="w-full min-h-[40px] px-2.5 py-1.5 text-sm font-bold font-mono-num bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              ดอกเบี้ยหลังลด (%)
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={25}
                              step={0.01}
                              value={
                                specialAfterRateDraft !== null
                                  ? specialAfterRateDraft
                                  : String(calc.rateAfterSpecialDiscount)
                              }
                              placeholder="เช่น 1.99"
                              onFocus={() => {
                                setSpecialAfterRateDraft(
                                  String(calc.rateAfterSpecialDiscount)
                                );
                              }}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setSpecialAfterRateDraft(raw);
                                const trimmed = raw.trim();
                                if (trimmed === '') return;
                                const parsed = Number(trimmed);
                                if (!Number.isNaN(parsed)) {
                                  const target = Math.min(
                                    25,
                                    Math.max(0, parsed)
                                  );
                                  setSpecialDiscountDraft(null);
                                  onUpdateState((p) => ({
                                    ...p,
                                    specialInterestDiscountMode: 'target_rate',
                                    specialInterestTargetRate: target,
                                  }));
                                }
                              }}
                              onBlur={() => {
                                if (
                                  specialAfterRateDraft !== null &&
                                  specialAfterRateDraft.trim() === ''
                                ) {
                                  onUpdateState((p) => ({
                                    ...p,
                                    specialInterestDiscountMode: 'discount_rate',
                                    specialInterestTargetRate: null,
                                  }));
                                }
                                setSpecialAfterRateDraft(null);
                              }}
                              className="w-full min-h-[40px] px-2.5 py-1.5 text-sm font-bold font-mono-num bg-white dark:bg-slate-950 text-amber-700 dark:text-amber-300 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        ปิดการแสดงรายการนี้ไว้ (หากไม่มีส่วนลดดอกเบี้ยพิเศษ ระบบจะไม่แสดงในใบเสนอราคา)
                      </div>
                    )}
                  </div>

                  {state.enableSpecialInterestDiscount && (
                    <div className="pt-2 border-t border-amber-200/80 dark:border-amber-400/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {calc.specialDiscountLabel}
                      </span>
                      <span className="font-mono-num font-bold text-slate-900 dark:text-amber-300">
                        {calc.baseInterestRate.toFixed(2)}% →{' '}
                        {calc.rateAfterSpecialDiscount.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Early First Installment Payment (Enable/Disable + Custom Amount) */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3.5 transition-all ${
                    state.payFirstInstallmentOnDelivery
                      ? 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white">
                          ชำระค่างวดงวดแรกวันรับรถ (ต้นงวด)
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          ลดอัตราดอกเบี้ยทันที{' '}
                          {settings.earlyPaymentDiscount.toFixed(2)}% ต่อปี
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFirstInstallmentDraft(null);
                          onUpdateState((p) => ({
                            ...p,
                            payFirstInstallmentOnDelivery:
                              !p.payFirstInstallmentOnDelivery,
                          }));
                        }}
                        className={`min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg border shrink-0 transition-colors cursor-pointer ${
                          state.payFirstInstallmentOnDelivery
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {state.payFirstInstallmentOnDelivery
                          ? 'เปิดใช้งาน'
                          : 'ปิดอยู่'}
                      </button>
                    </div>

                    {state.payFirstInstallmentOnDelivery ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            ยอดชำระงวดแรกวันรับรถ (บาท)
                          </label>
                          {state.customFirstInstallmentAmount !== null &&
                            state.customFirstInstallmentAmount !== undefined && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFirstInstallmentDraft(null);
                                  onUpdateState((p) => ({
                                    ...p,
                                    customFirstInstallmentAmount: null,
                                  }));
                                }}
                                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                เท่าค่างวด ({formatTHB(calc.monthlyInstallment)} ฿)
                              </button>
                            )}
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={
                            firstInstallmentDraft !== null
                              ? firstInstallmentDraft
                              : state.customFirstInstallmentAmount !== null &&
                                state.customFirstInstallmentAmount !== undefined
                              ? String(state.customFirstInstallmentAmount)
                              : String(calc.monthlyInstallment)
                          }
                          placeholder={String(calc.monthlyInstallment)}
                          onFocus={() => {
                            const init =
                              state.customFirstInstallmentAmount !== null &&
                              state.customFirstInstallmentAmount !== undefined
                                ? String(state.customFirstInstallmentAmount)
                                : String(calc.monthlyInstallment);
                            setFirstInstallmentDraft(init);
                          }}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setFirstInstallmentDraft(raw);
                            const trimmed = raw.trim();
                            if (trimmed === '') return;
                            const parsed = Number(trimmed);
                            if (!Number.isNaN(parsed)) {
                              onUpdateState((p) => ({
                                ...p,
                                customFirstInstallmentAmount: Math.max(
                                  0,
                                  Math.round(parsed)
                                ),
                              }));
                            }
                          }}
                          onBlur={() => {
                            if (
                              firstInstallmentDraft !== null &&
                              firstInstallmentDraft.trim() === ''
                            ) {
                              onUpdateState((p) => ({
                                ...p,
                                customFirstInstallmentAmount: null,
                              }));
                            }
                            setFirstInstallmentDraft(null);
                          }}
                          className="w-full min-h-[42px] px-3 py-2 text-sm font-bold font-mono-num bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-emerald-300 dark:border-emerald-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {state.customFirstInstallmentAmount !== null &&
                          state.customFirstInstallmentAmount !== undefined
                            ? 'กำหนดยอดชำระงวดแรกเอง — นำไปคำนวณยอดวันรับรถแล้ว'
                            : 'คำนวณอัตโนมัติเท่ากับค่างวด 1 เดือน (สามารถแก้ไขยอดเองได้)'}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        ยังไม่ได้เปิดใช้ชำระงวดแรกวันรับรถ (กดเปิดเพื่อลดดอกเบี้ยและกำหนดยอดชำระงวดแรก)
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      อัตราดอกเบี้ยสุทธิที่ใช้คำนวณ
                    </span>
                    <span className="font-mono-num font-extrabold text-emerald-700 dark:text-emerald-400">
                      {calc.effectiveInterestRate.toFixed(2)}% ต่อปี
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Metric Real-Time Finance Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    ยอดจัดไฟแนนซ์
                  </div>
                  <div className="text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                    {formatTHB(calc.financeAmount)} ฿
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    ดอกเบี้ยทั้งหมด ({calc.tenorYears} ปี)
                  </div>
                  <div className="text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                    {formatTHBDecimal(calc.totalInterest)} ฿
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    ยอดชำระรวม
                  </div>
                  <div className="text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-1">
                    {formatTHBDecimal(calc.totalPayable)} ฿
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#070d1f] to-[#162652] text-white border border-amber-400/50">
                  <div className="text-[11px] font-semibold text-slate-300">
                    ยอดผ่อนต่อเดือน
                  </div>
                  <div className="text-lg font-extrabold font-mono-num text-amber-300 mt-1">
                    {formatTHB(calc.monthlyInstallment)} ฿
                  </div>
                </div>
              </div>
                </>
              )}
            </section>
          )}

          {/* STEP 4: Delivery Day Expenses */}
          {currentStep === 4 && (
            <section className={`${CARD_SURFACE} p-5 sm:p-7 space-y-6`}>
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  ขั้นตอนที่ 4 จาก 5
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                  ค่าใช้จ่ายและยอดชำระวันรับรถ
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  กำหนดเงินจอง มัดจำป้ายแดง ค่าจดทะเบียน อุปกรณ์ตกแต่ง และค่าใช้จ่ายอื่น ๆ
                </p>
              </div>

              {/* Standard Delivery Fees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    หักเงินจองรถยนต์ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={state.bookingDeposit === 0 ? '' : state.bookingDeposit}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        bookingDeposit: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BOOKING_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          onUpdateState((p) => ({ ...p, bookingDeposit: preset }))
                        }
                        className={`px-2 py-0.5 text-[11px] font-mono-num font-semibold rounded border cursor-pointer ${
                          state.bookingDeposit === preset
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/50'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {preset === 0 ? '0' : formatTHB(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ค่ามัดจำป้ายแดง (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={state.redPlateDeposit === 0 ? '' : state.redPlateDeposit}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        redPlateDeposit: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    ได้คืนเมื่อรับป้ายขาว
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ค่าจดทะเบียน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={state.registrationFee === 0 ? '' : state.registrationFee}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        registrationFee: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    ระบุ 0 หากฟรีค่าจดทะเบียน
                  </p>
                </div>
              </div>

              {/* Dynamic Accessories & Other Expenses */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                      ค่าอุปกรณ์ตกแต่งเพิ่มเติม และค่าใช้จ่ายอื่น ๆ
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      เพิ่ม แก้ไข หรือลบรายการค่าใช้จ่ายได้ไม่จำกัด
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addDeliveryItem('accessory')}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] dark:hover:bg-[#1e336b] text-amber-300 border border-transparent dark:border-amber-400/35 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มอุปกรณ์ตกแต่ง
                    </button>
                    <button
                      type="button"
                      onClick={() => addDeliveryItem('other')}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มค่าใช้จ่ายอื่น ๆ
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {(state.customDeliveryItems || []).length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      ยังไม่มีรายการอุปกรณ์ตกแต่งหรือค่าใช้จ่ายเพิ่มเติม
                    </div>
                  )}

                  {(state.customDeliveryItems || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="sm:col-span-3">
                        <select
                          value={item.category === 'accessory' ? 'accessory' : 'other'}
                          onChange={(e) =>
                            updateDeliveryItem(item.id, {
                              category: e.target.value as 'accessory' | 'other',
                            })
                          }
                          className="w-full px-2.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="accessory">อุปกรณ์ตกแต่ง</option>
                          <option value="other">ค่าใช้จ่ายอื่น ๆ</option>
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={item.label}
                          placeholder={
                            item.category === 'accessory'
                              ? `ชื่ออุปกรณ์ตกแต่ง #${idx + 1}`
                              : `รายละเอียดค่าใช้จ่าย #${idx + 1}`
                          }
                          onChange={(e) =>
                            updateDeliveryItem(item.id, { label: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={item.amount}
                          placeholder="0 บาท"
                          onChange={(e) =>
                            updateDeliveryItem(item.id, { amount: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm font-bold font-mono-num text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeDeliveryItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          aria-label="ลบรายการค่าใช้จ่าย"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Day Live Breakdown */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800 space-y-2 text-sm">
                {calc.isCashPurchase ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400">
                      ราคารถสุทธิ (ซื้อสด)
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatTHB(calc.netCarPrice)} บาท
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600 dark:text-slate-400">
                        เงินดาวน์คงเหลือ (หลังหักซับดาวน์)
                      </span>
                      <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                        {formatTHB(calc.netDownPayment)} บาท
                      </span>
                    </div>
                    {calc.includeVat && calc.subsidyVatAmount > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600 dark:text-slate-400">
                          VAT 7% กรณีซับดาวน์
                        </span>
                        <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                          {formatTHB(calc.subsidyVatAmount)} บาท
                        </span>
                      </div>
                    )}
                  </>
                )}
                {calc.registrationFee > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400">
                      ค่าจดทะเบียน
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatTHB(calc.registrationFee)} บาท
                    </span>
                  </div>
                )}
                {calc.redPlateDeposit > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400">
                      ค่ามัดจำป้ายแดง
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatTHB(calc.redPlateDeposit)} บาท
                    </span>
                  </div>
                )}
                {calc.firstInstallmentDueOnDelivery > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400">
                      ค่างวดงวดแรกวันรับรถ
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatTHB(calc.firstInstallmentDueOnDelivery)} บาท
                    </span>
                  </div>
                )}
                {calc.customDeliveryItemsParsed.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.category === 'accessory'
                        ? `ค่าอุปกรณ์ตกแต่ง: ${item.label || `#${idx + 1}`}`
                        : item.label || `ค่าใช้จ่ายอื่น ๆ #${idx + 1}`}
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatTHB(item.amount)} บาท
                    </span>
                  </div>
                ))}
                {calc.bookingDeposit > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>หักเงินจองรถยนต์</span>
                    <span className="font-mono-num">
                      -{formatTHB(calc.bookingDeposit)} บาท
                    </span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline gap-4">
                  <span className="font-bold text-slate-950 dark:text-white">
                    ยอดชำระสุทธิในวันรับรถ
                  </span>
                  <span className="text-xl font-extrabold font-mono-num text-emerald-700 dark:text-emerald-400">
                    {formatTHB(calc.totalDeliveryCashDue)} บาท
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* STEP 5: Customer Info, Promotions & Benefits */}
          {currentStep === 5 && (
            <section className={`${CARD_SURFACE} p-5 sm:p-7 space-y-6`}>
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  ขั้นตอนที่ 5 จาก 5
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                  ข้อมูลลูกค้า โปรโมชั่น และสิทธิประโยชน์
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  กรอกข้อมูลลูกค้า รายละเอียดการจอง โปรโมชั่น ของแถม ประกันภัย และบริการต่าง ๆ
                </p>
              </div>

              {/* Customer & Booking Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ชื่อลูกค้า
                  </label>
                  <input
                    type="text"
                    value={state.customerName}
                    placeholder="เช่น สมชาย ใจดี"
                    onChange={(e) =>
                      onUpdateState((p) => ({ ...p, customerName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={state.customerPhone}
                    placeholder="08X-XXX-XXXX"
                    onChange={(e) =>
                      onUpdateState((p) => ({ ...p, customerPhone: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    รายละเอียดการจอง (กำหนดส่งมอบ / เลขที่จอง / เงื่อนไขพิเศษ)
                  </label>
                  <input
                    type="text"
                    value={state.bookingDetails}
                    placeholder="เช่น จองรับรถเดือนนี้ / รอไฟแนนซ์อนุมัติ 3 วันทำการ"
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        bookingDetails: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Promotion & Freebies */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    รายละเอียดโปรโมชั่นประจำรุ่นรถยนต์
                  </label>
                  <input
                    type="text"
                    value={state.promotionNote}
                    placeholder="เช่น แคมเปญดอกเบี้ยพิเศษ + ฟรีประกันภัยชั้น 1 + วอลล์ชาร์จ"
                    onChange={(e) =>
                      onUpdateState((p) => ({ ...p, promotionNote: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    รายการของแถม
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {settings.freebiePresets.map((freebie) => {
                      const checked = state.selectedFreebieIds.includes(freebie.id);
                      return (
                        <button
                          key={freebie.id}
                          type="button"
                          onClick={() => toggleFreebie(freebie.id)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            checked
                              ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-white border-amber-400/50 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              checked
                                ? 'bg-amber-400 text-slate-950'
                                : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span className="truncate">{freebie.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ของแถมเพิ่มเติม (ระบุเอง)
                  </label>
                  <input
                    type="text"
                    value={state.customFreebieNote}
                    placeholder="ระบุของแถมเพิ่มเติม..."
                    onChange={(e) =>
                      onUpdateState((p) => ({
                        ...p,
                        customFreebieNote: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Editable & Selectable Insurance, Warranty, Charger & Benefits */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      เลือกและแก้ไขสิทธิประโยชน์ที่ลูกค้าได้รับ
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ติ๊กเลือกสิทธิประโยชน์ที่ต้องการมอบให้ลูกค้ารายนี้ (เลือกแล้ว{' '}
                      {calc.enabledBenefitTexts.length} รายการ)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllBenefits}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg cursor-pointer"
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={clearAllBenefits}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                    >
                      ไม่เลือกเลย
                    </button>
                    {state.benefitsOverride && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateState((p) => ({ ...p, benefitsOverride: null }))
                        }
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        คืนค่าเดิมของรุ่น
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onSaveBenefitsToModel(calc.trim.id, calc.activeBenefits)
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold bg-amber-400/90 hover:bg-amber-400 text-slate-950 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      บันทึกเป็นค่าเริ่มต้นรุ่น
                    </button>
                    <button
                      type="button"
                      onClick={onOpenBenefitsPage}
                      className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      เทียบทุกรุ่น
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {CORE_BENEFIT_FIELDS.map((field) => {
                    const isChecked = selectedBenefitKeys.includes(field.key);
                    return (
                      <div
                        key={field.key}
                        className={`p-3 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-amber-50/40 dark:bg-slate-900/90 border-amber-300/80 dark:border-amber-400/40'
                            : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-65'
                        }`}
                      >
                        <label className="flex items-center justify-between gap-2 mb-2 cursor-pointer select-none">
                          <span className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleBenefitKey(field.key)}
                              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {field.label}
                            </span>
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isChecked
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isChecked ? 'แสดงในใบเสนอราคา' : 'ไม่รวม'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={calc.activeBenefits[field.key]}
                          onChange={(e) =>
                            updateBenefitField(field.key, e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Extra Benefit Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      สิทธิประโยชน์เพิ่มเติมอื่น ๆ (ติ๊กเลือกเพื่อรวมในใบเสนอราคา)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateBenefitField('extraItems', [
                          ...calc.activeBenefits.extraItems,
                          '',
                        ])
                      }
                      className="px-3 py-1 text-xs font-semibold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] text-amber-300 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มสิทธิประโยชน์
                    </button>
                  </div>
                  {calc.activeBenefits.extraItems.map((item, idx) => {
                    const isChecked = !disabledExtraIndices.includes(idx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleExtraBenefit(idx)}
                          aria-label={`เลือกสิทธิประโยชน์เพิ่มเติมข้อที่ ${idx + 1}`}
                          className="w-4 h-4 rounded accent-amber-500 shrink-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={item}
                          placeholder={`สิทธิประโยชน์เพิ่มเติมข้อที่ ${idx + 1}`}
                          onChange={(e) => {
                            const next = [...calc.activeBenefits.extraItems];
                            next[idx] = e.target.value;
                            updateBenefitField('extraItems', next);
                          }}
                          className={`flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                            !isChecked ? 'opacity-60' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateState((prev) => {
                              const currentBenefits =
                                prev.benefitsOverride ?? calc.trim.benefits;
                              const nextExtras =
                                currentBenefits.extraItems.filter(
                                  (_, i) => i !== idx
                                );
                              const nextDisabled = (
                                prev.disabledExtraBenefitIndices ?? []
                              )
                                .filter((i) => i !== idx)
                                .map((i) => (i > idx ? i - 1 : i));
                              return {
                                ...prev,
                                benefitsOverride: {
                                  ...currentBenefits,
                                  extraItems: nextExtras,
                                },
                                disabledExtraBenefitIndices: nextDisabled,
                              };
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          aria-label="ลบสิทธิประโยชน์"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    หมายเหตุท้ายใบเสนอราคา
                  </label>
                  <textarea
                    rows={2}
                    value={state.quoteNote}
                    placeholder="ระบุหมายเหตุเพิ่มเติมสำหรับลูกค้า..."
                    onChange={(e) =>
                      onUpdateState((p) => ({ ...p, quoteNote: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Anonymous Quote-Only Mode Toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateState((p) => ({
                        ...p,
                        anonymousMode: !p.anonymousMode,
                      }))
                    }
                    className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      state.anonymousMode
                        ? 'bg-slate-950 dark:bg-[#162652] text-white border-amber-400/60 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          state.anonymousMode
                            ? 'btn-gold-copper text-slate-950'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <EyeOff className="w-4 h-4" />
                      </span>
                      <div>
                        <div
                          className={`text-xs sm:text-sm font-bold ${
                            state.anonymousMode
                              ? 'text-amber-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          โหมดไม่ระบุตัวตน (ใบเสนอราคาอย่างเดียว)
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${
                            state.anonymousMode
                              ? 'text-slate-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          ซ่อนโลโก้ ชื่อโชว์รูม และข้อมูลติดต่อเซลส์ทั้งในใบเสนอราคาและข้อความ LINE
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold whitespace-nowrap ${
                        state.anonymousMode
                          ? 'text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {state.anonymousMode ? 'เปิดใช้งาน' : 'ปิดอยู่'}
                    </span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Step Footer Navigation Controls */}
          <div className={`${CARD_SURFACE} p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3`}>
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="min-h-[46px] px-4 py-2.5 text-sm font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ย้อนกลับ
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {session.hasVisitedPreview && currentStep < 5 && (
                <button
                  type="button"
                  onClick={() => onChangeStep('preview')}
                  className="min-h-[46px] px-4 py-2.5 text-sm font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/40 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  กลับไปดูใบเสนอราคา
                </button>
              )}

              <button
                type="button"
                onClick={goNext}
                className="min-h-[46px] btn-gold-copper px-5 py-2.5 text-sm font-extrabold rounded-xl inline-flex items-center gap-2 cursor-pointer"
              >
                {currentStep < 5 ? (
                  <>
                    ถัดไป
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    สร้างใบเสนอราคา
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sticky Live Summary Sidebar */}
        <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-5">
          <div className="card-midnight-hero text-white rounded-2xl overflow-hidden border border-amber-400/30">
            <div className="h-1.5 gold-copper-bar" />
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="text-base font-extrabold text-white">
                    {calc.trim.modelName} · {calc.trim.trimName}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {state.customerName.trim()
                      ? `ลูกค้า: คุณ${state.customerName.trim()}`
                      : 'ยังไม่ได้ระบุชื่อลูกค้า'}
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-300 whitespace-nowrap">
                  ขั้นที่ {currentStep}/5
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {calc.isCashPurchase ? (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-slate-300">รูปแบบการซื้อ</div>
                    <div className="text-xl font-extrabold text-amber-300 mt-0.5">
                      ซื้อเงินสด
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ชำระเต็มจำนวน · ไม่มีดอกเบี้ย
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-slate-300">ค่างวดรายเดือน</div>
                    <div className="text-xl font-extrabold font-mono-num text-amber-300 mt-0.5">
                      {formatTHB(calc.monthlyInstallment)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-num">
                      {calc.tenorMonths} งวด · {calc.effectiveInterestRate.toFixed(2)}%
                    </div>
                  </div>
                )}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-slate-300">ยอดชำระวันรับรถ</div>
                  <div className="text-xl font-extrabold font-mono-num text-emerald-400 mt-0.5">
                    {formatTHB(calc.totalDeliveryCashDue)}
                  </div>
                  <div className="text-[11px] text-slate-400">บาท (สุทธิ)</div>
                </div>
              </div>

              <dl className="space-y-2 text-xs sm:text-sm pt-1">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-300">ราคารถสุทธิ</dt>
                  <dd className="font-mono-num font-bold text-white">
                    {formatTHB(calc.netCarPrice)} ฿
                  </dd>
                </div>
                {calc.isCashPurchase ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">รูปแบบการชำระ</dt>
                      <dd className="font-semibold text-amber-300">ซื้อเงินสด</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">ยอดจัดไฟแนนซ์</dt>
                      <dd className="font-mono-num font-semibold text-white">0 ฿</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">ดอกเบี้ยทั้งหมด</dt>
                      <dd className="font-mono-num text-slate-200">0 ฿</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">
                        เงินดาวน์ ({calc.downPercentActual.toFixed(1)}%)
                      </dt>
                      <dd className="font-mono-num font-semibold text-white">
                        {formatTHB(calc.downPaymentGross)} ฿
                      </dd>
                    </div>
                    {calc.downPaymentSubsidy > 0 && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-emerald-300">หักซับดาวน์</dt>
                        <dd className="font-mono-num font-semibold text-emerald-300">
                          -{formatTHB(calc.downPaymentSubsidy)} ฿
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">ยอดจัดไฟแนนซ์</dt>
                      <dd className="font-mono-num font-semibold text-white">
                        {formatTHB(calc.financeAmount)} ฿
                      </dd>
                    </div>
                    {calc.specialDiscountActive && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-amber-300 truncate">
                          {calc.specialDiscountLabel}
                        </dt>
                        <dd className="font-mono-num font-semibold text-amber-300 whitespace-nowrap">
                          {calc.baseInterestRate.toFixed(2)}% →{' '}
                          {calc.rateAfterSpecialDiscount.toFixed(2)}%
                        </dd>
                      </div>
                    )}
                    {state.payFirstInstallmentOnDelivery &&
                      calc.firstInstallmentDueOnDelivery > 0 && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-emerald-300">ชำระงวดแรกวันรับรถ</dt>
                          <dd className="font-mono-num font-semibold text-emerald-300">
                            {formatTHB(calc.firstInstallmentDueOnDelivery)} ฿
                          </dd>
                        </div>
                      )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">ดอกเบี้ยทั้งหมด</dt>
                      <dd className="font-mono-num text-slate-200">
                        {formatTHBDecimal(calc.totalInterest)} ฿
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-300">ยอดชำระรวมไฟแนนซ์</dt>
                      <dd className="font-mono-num text-slate-200">
                        {formatTHBDecimal(calc.totalPayable)} ฿
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onChangeStep('preview')}
                  className="w-full btn-gold-copper py-2.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  เปิดหน้าใบเสนอราคา (Preview)
                </button>
                {onCopyLineText && (
                  <button
                    type="button"
                    onClick={onCopyLineText}
                    className="w-full py-2 px-4 text-xs font-bold bg-[#06C755]/20 hover:bg-[#06C755]/30 text-emerald-300 border border-[#06C755]/50 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    คัดลอกข้อความส่ง LINE ทันที
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
