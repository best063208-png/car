import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_QUOTATION_DESIGN,
  DOWN_PERCENT_TIERS,
  JIN_MOTOR_LOGO_PATH,
  QUOTATION_DESIGN_PRESETS,
  QUOTATION_FONT_OPTIONS,
  TENOR_OPTIONS,
} from '../data/defaultCatalog';
import {
  CalculatedQuote,
  DealerSettings,
  LogoPosition,
  QuotationDesignConfig,
  QuotationFontFamily,
  QuoteState,
  RateTableType,
  SavedQuotationTheme,
  VehicleTrim,
} from '../types/dealer';
import { calculateQuote } from '../utils/finance';
import { QuotationSheet } from './QuotationSheet';

export type SettingsTab = 'design' | 'showroom' | 'pricing' | 'rates' | 'benefits';

interface SettingsViewProps {
  settings: DealerSettings;
  theme: 'light' | 'dark';
  lastSavedAt: string | null;
  initialTab?: SettingsTab;
  previewState: QuoteState;
  onChangeTheme: (theme: 'light' | 'dark') => void;
  onSaveSettings: (nextSettings: DealerSettings) => void;
  onResetDefaults: () => void;
  onNotify: (message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings: savedSettings,
  theme,
  lastSavedAt,
  initialTab = 'showroom',
  previewState,
  onChangeTheme,
  onSaveSettings,
  onResetDefaults,
  onNotify,
}) => {
  const [settings, setDraftSettings] = useState<DealerSettings>(savedSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [rateMatrixTab, setRateMatrixTab] = useState<RateTableType>('standard');
  const [editingTrimId, setEditingTrimId] = useState<string>(
    savedSettings.trims[0]?.id || ''
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [themeSaveName, setThemeSaveName] = useState('');

  useEffect(() => {
    setDraftSettings(savedSettings);
  }, [savedSettings]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const onUpdateSettings = setDraftSettings;

  const activeDesign: QuotationDesignConfig = useMemo(
    () => ({
      ...DEFAULT_QUOTATION_DESIGN,
      ...(settings.quotationDesign || {}),
    }),
    [settings.quotationDesign]
  );

  const livePreviewCalc: CalculatedQuote = useMemo(
    () => calculateQuote(settings, previewState),
    [settings, previewState]
  );

  const updateDesign = (patch: Partial<QuotationDesignConfig>) => {
    onUpdateSettings((prev) => ({
      ...prev,
      quotationDesign: {
        ...DEFAULT_QUOTATION_DESIGN,
        ...(prev.quotationDesign || {}),
        ...patch,
      },
    }));
  };

  const handleSaveNamedTheme = () => {
    const cleanName = themeSaveName.trim() || `ธีมที่ออกแบบ ${(settings.savedDesigns?.length || 0) + 1}`;
    const newSaved: SavedQuotationTheme = {
      id: `theme-${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      design: { ...activeDesign },
    };
    const nextSettings: DealerSettings = {
      ...settings,
      savedDesigns: [newSaved, ...(settings.savedDesigns || [])],
    };
    setDraftSettings(nextSettings);
    onSaveSettings(nextSettings);
    setThemeSaveName('');
    onNotify(`บันทึกธีม "${cleanName}" เพื่อใช้ครั้งต่อไปเรียบร้อยแล้ว`);
  };

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );

  const formattedSavedTime = useMemo(() => {
    if (!lastSavedAt) return null;
    try {
      return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastSavedAt));
    } catch {
      return null;
    }
  }, [lastSavedAt]);

  const selectedBenefitTrim =
    settings.trims.find((t) => t.id === editingTrimId) || settings.trims[0];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateSettings((prev) => ({
          ...prev,
          showroom: { ...prev.showroom, logoUrl: reader.result as string },
        }));
        onNotify('อัปโหลดโลโก้โชว์รูมเรียบร้อยแล้ว');
      }
    };
    reader.readAsDataURL(file);
  };

  const updateTrim = (
    trimId: string,
    patch: Partial<VehicleTrim>
  ) => {
    onUpdateSettings((prev) => ({
      ...prev,
      trims: prev.trims.map((t) => (t.id === trimId ? { ...t, ...patch } : t)),
    }));
  };

  const addNewTrim = () => {
    const newId = `custom-trim-${Date.now()}`;
    const newTrim: VehicleTrim = {
      id: newId,
      modelId: `custom-model-${Date.now()}`,
      brand: 'DEEPAL',
      modelName: 'DEEPAL รุ่นใหม่',
      trimName: 'Standard',
      powertrain: 'BEV',
      normalPrice: 999000,
      specialPrice: 999000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'Standard Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty: 'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: ['ฟรีสายชาร์จฉุกเฉิน'],
      },
    };
    onUpdateSettings((prev) => ({
      ...prev,
      trims: [...prev.trims, newTrim],
    }));
    setEditingTrimId(newId);
    onNotify('เพิ่มรุ่นรถใหม่แล้ว สามารถแก้ไขชื่อและราคาได้ทันที');
  };

  const updateRateCell = (
    matrixType: RateTableType,
    tier: (typeof DOWN_PERCENT_TIERS)[number],
    months: (typeof TENOR_OPTIONS)[number]['months'],
    rawValue: string
  ) => {
    const trimmed = rawValue.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    if (parsed !== null && Number.isNaN(parsed)) return;

    onUpdateSettings((prev) => ({
      ...prev,
      rateMatrices: {
        ...prev.rateMatrices,
        [matrixType]: {
          ...prev.rateMatrices[matrixType],
          [tier]: {
            ...prev.rateMatrices[matrixType][tier],
            [months]: parsed,
          },
        },
      },
    }));
  };

  const addFreebiePreset = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      freebiePresets: [
        ...prev.freebiePresets,
        {
          id: `freebie-${Date.now()}`,
          label: 'รายการของแถมใหม่',
          defaultChecked: false,
        },
      ],
    }));
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="card-premium rounded-2xl p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white">
            ตั้งค่าระบบขายและใบเสนอราคา
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            แก้ไขราคา ส่วนลด อัตราดอกเบี้ย สิทธิประโยชน์ โปรโมชั่น ธีมหน้าจอ และข้อมูลโชว์รูม แล้วกดบันทึกเพื่อจำการตั้งค่า
          </p>
          <div className="mt-2 text-xs font-medium">
            {hasUnsavedChanges ? (
              <span className="text-amber-700 dark:text-amber-400 font-semibold">
                มีการแก้ไขที่ยังไม่บันทึก · กรุณากดปุ่ม &quot;บันทึกการตั้งค่า&quot;
              </span>
            ) : formattedSavedTime ? (
              <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                บันทึกและจำการตั้งค่าล่าสุดเมื่อ {formattedSavedTime}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                ระบบพร้อมจดจำการตั้งค่าที่บันทึกไว้ในอุปกรณ์นี้
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Light / Dark Theme Toggle for Day & Night Shift Consultants */}
          <div
            role="group"
            aria-label="ธีมการแสดงผล"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
          >
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => onChangeTheme('light')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              โหมดสว่าง
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => onChangeTheme('dark')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-[#0c1733] to-[#162652] text-amber-300 shadow-sm border border-amber-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              โหมดกลางคืน
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSaveSettings(settings)}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              hasUnsavedChanges
                ? 'btn-gold-copper shadow-md'
                : 'btn-midnight border border-transparent dark:border-amber-400/35 text-amber-300'
            }`}
          >
            <Save className="w-4 h-4" />
            {hasUnsavedChanges ? 'บันทึกการตั้งค่า' : 'บันทึกแล้ว'}
          </button>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={() => {
                setDraftSettings(savedSettings);
                onNotify('ยกเลิกการแก้ไขที่ยังไม่บันทึกแล้ว');
              }}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl whitespace-nowrap cursor-pointer"
            >
              ยกเลิกการแก้ไข
            </button>
          )}

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-gradient-to-b from-white to-slate-100 hover:to-slate-200 dark:from-slate-800 dark:to-slate-900 dark:hover:from-slate-700 dark:hover:to-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              คืนค่าเริ่มต้น
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefaults();
                  setConfirmReset(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl whitespace-nowrap shadow-sm cursor-pointer"
              >
                ยืนยันคืนค่าเริ่มต้น
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl whitespace-nowrap cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900/90 border border-transparent dark:border-slate-800 rounded-2xl overflow-x-auto">
        {(
          [
            { id: 'design', label: 'ปรับแต่งดีไซน์ใบเสนอราคา' },
            { id: 'showroom', label: 'ข้อมูลโชว์รูมและเซลส์' },
            { id: 'pricing', label: 'ราคารถและส่วนลด' },
            { id: 'rates', label: 'ตารางอัตราดอกเบี้ย' },
            { id: 'benefits', label: 'สิทธิประโยชน์และของแถม' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-400 dark:text-amber-300 border border-transparent dark:border-amber-400/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 0: Quotation Design & Theme Customization Studio with Live Preview */}
      {activeTab === 'design' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Controls */}
          <div className="xl:col-span-5 space-y-5">
            {/* Presets & Saved Custom Themes */}
            <div className="card-premium rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ธีมสำเร็จรูปและธีมที่บันทึกไว้
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    updateDesign({ ...DEFAULT_QUOTATION_DESIGN });
                    onNotify('คืนค่าดีไซน์ใบเสนอราคาเริ่มต้นแล้ว');
                  }}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  ค่าเริ่มต้น
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUOTATION_DESIGN_PRESETS.map((preset) => {
                  const isActive = activeDesign.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateDesign({ ...preset.design })}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-slate-950 dark:bg-[#162652] text-white border-amber-400 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <span className="flex items-center gap-0.5 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-white/40"
                          style={{ backgroundColor: preset.design.primaryColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/40 -ml-1.5"
                          style={{ backgroundColor: preset.design.tableHeaderBgColor }}
                        />
                      </span>
                      <span className="text-xs font-bold truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Save Current Theme as Named Preset */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  บันทึกธีมปัจจุบันไว้ใช้ครั้งต่อไป
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={themeSaveName}
                    placeholder="ตั้งชื่อธีม เช่น ธีมโชว์รูมหลัก"
                    onChange={(e) => setThemeSaveName(e.target.value)}
                    className="flex-1 min-h-[42px] px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNamedTheme}
                    className="btn-gold-copper min-h-[42px] px-3.5 py-2 text-xs font-extrabold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    บันทึกธีม
                  </button>
                </div>

                {(settings.savedDesigns || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      ธีมส่วนตัวที่บันทึกไว้
                    </div>
                    <div className="space-y-1.5">
                      {(settings.savedDesigns || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              updateDesign({ ...item.design, presetId: item.id });
                              onNotify(`ใช้ธีม "${item.name}" แล้ว`);
                            }}
                            className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                          >
                            <span
                              className="w-4 h-4 rounded-full shrink-0 border border-slate-300"
                              style={{ backgroundColor: item.design.primaryColor }}
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {item.name}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSettings((prev) => ({
                                ...prev,
                                savedDesigns: (prev.savedDesigns || []).filter(
                                  (d) => d.id !== item.id
                                ),
                              }))
                            }
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            aria-label="ลบธีมที่บันทึก"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Color Customization Pickers */}
            <div className="card-premium rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                ปรับแต่งสีใบเสนอราคา
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { key: 'primaryColor', label: 'สีหลัก (แถบเน้น / ป้ายหัวข้อ)' },
                    { key: 'headerBgColor', label: 'สีหัวกระดาษ (พื้นหลัง)' },
                    { key: 'headerTextColor', label: 'สีตัวอักษรหัวกระดาษ' },
                    { key: 'backgroundColor', label: 'สีพื้นหลังใบเสนอราคา' },
                    { key: 'textColor', label: 'สีตัวอักษรเนื้อหา' },
                    { key: 'tableHeaderBgColor', label: 'สีแถบตารางราคาและสรุป' },
                    { key: 'tableHeaderTextColor', label: 'สีตัวอักษรแถบตารางราคา' },
                    { key: 'sectionTitleColor', label: 'สีหัวข้อและยอดรวม' },
                  ] as const
                ).map(({ key, label }) => {
                  const val = activeDesign[key];
                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(val) ? val : '#0f172a'}
                          onChange={(e) =>
                            updateDesign({ [key]: e.target.value, presetId: 'custom' })
                          }
                          aria-label={label}
                          className="w-10 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            updateDesign({ [key]: e.target.value, presetId: 'custom' })
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-mono-num uppercase bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Typography & Font Size */}
            <div className="card-premium rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                รูปแบบและขนาดตัวอักษร
              </h3>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  เลือกรูปแบบตัวอักษร (Font)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {QUOTATION_FONT_OPTIONS.map((fontOpt) => {
                    const active = activeDesign.fontFamily === fontOpt.id;
                    return (
                      <button
                        key={fontOpt.id}
                        type="button"
                        onClick={() =>
                          updateDesign({
                            fontFamily: fontOpt.id as QuotationFontFamily,
                          })
                        }
                        style={{ fontFamily: `'${fontOpt.id}', sans-serif` }}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/70 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold">{fontOpt.label}</div>
                          <div
                            className={`text-[11px] ${
                              active
                                ? 'text-slate-300'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {fontOpt.desc}
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ขนาดตัวอักษรพื้นฐาน
                  </label>
                  <span className="text-xs font-mono-num font-bold text-amber-700 dark:text-amber-300">
                    {activeDesign.fontSizePx} px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={17}
                  step={1}
                  value={activeDesign.fontSizePx}
                  onChange={(e) =>
                    updateDesign({ fontSizePx: Number(e.target.value) || 14 })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { px: 12, label: 'เล็ก (12)' },
                    { px: 14, label: 'กลาง (14)' },
                    { px: 15, label: 'ใหญ่ (15)' },
                    { px: 16, label: 'ใหญ่มาก (16)' },
                  ].map((s) => (
                    <button
                      key={s.px}
                      type="button"
                      onClick={() => updateDesign({ fontSizePx: s.px })}
                      className={`min-h-[36px] py-1 px-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                        activeDesign.fontSizePx === s.px
                          ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/60'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logo Upload & Position */}
            <div className="card-premium rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                โลโก้บริษัท / โชว์รูม และตำแหน่งโลโก้
              </h3>

              <div className="flex items-center gap-3">
                {settings.showroom.logoUrl ? (
                  <img
                    src={settings.showroom.logoUrl}
                    alt={settings.showroom.showroomName}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[11px] text-slate-400 shrink-0">
                    ไม่มีโลโก้
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <label className="min-h-[40px] px-3 py-2 text-xs font-bold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] text-amber-300 rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    เพิ่ม/เปลี่ยนโลโก้
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings((prev) => ({
                        ...prev,
                        showroom: {
                          ...prev.showroom,
                          logoUrl: JIN_MOTOR_LOGO_PATH,
                        },
                      }));
                      onNotify('ใช้โลโก้ JIN MOTOR เริ่มต้นแล้ว');
                    }}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer"
                  >
                    โลโก้เดิม
                  </button>
                  {settings.showroom.logoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          showroom: { ...prev.showroom, logoUrl: '' },
                        }))
                      }
                      className="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl cursor-pointer"
                    >
                      ซ่อนโลโก้
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ตำแหน่งโลโก้บนหัวกระดาษ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'left', label: 'ชิดซ้าย' },
                      { id: 'center', label: 'กึ่งกลาง' },
                      { id: 'right', label: 'ชิดขวา' },
                    ] as { id: LogoPosition; label: string }[]
                  ).map((pos) => {
                    const active = activeDesign.logoPosition === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => updateDesign({ logoPosition: pos.id })}
                        className={`min-h-[42px] py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/60 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Real-Time Live Quotation Preview */}
          <div className="xl:col-span-7 xl:sticky xl:top-20 space-y-3">
            <div className="card-premium rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
                    ตัวอย่างใบเสนอราคาแบบเรียลไทม์
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    สี ตัวอักษร ขนาด และตำแหน่งโลโก้จะอัปเดตทันที ก่อนกดปุ่ม &quot;บันทึกการตั้งค่า&quot;
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSaveSettings(settings)}
                  className="btn-gold-copper min-h-[42px] px-4 py-2 text-xs font-extrabold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  บันทึกดีไซน์นี้
                </button>
              </div>

              <QuotationSheet
                settings={settings}
                state={previewState}
                calc={livePreviewCalc}
                designOverride={activeDesign}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Showroom & Sales Advisor */}
      {activeTab === 'showroom' && (
        <div className="card-premium rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <img
              src={settings.showroom.logoUrl}
              alt={settings.showroom.showroomName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 shadow-xs shrink-0"
            />
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                โลโก้โชว์รูมในใบเสนอราคา
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-slate-950 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-[#162652] dark:to-[#1e336b] dark:hover:from-[#1e336b] dark:hover:to-[#243d7d] text-amber-400 dark:text-amber-300 border border-transparent dark:border-amber-400/35 rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  อัปโหลดโลโก้ใหม่
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings((prev) => ({
                      ...prev,
                      showroom: {
                        ...prev.showroom,
                        logoUrl: JIN_MOTOR_LOGO_PATH,
                      },
                    }));
                    onNotify('ใช้โลโก้ JIN MOTOR เริ่มต้นแล้ว');
                  }}
                  className="px-3.5 py-2 text-xs font-medium bg-gradient-to-b from-white to-slate-100 hover:to-slate-200 dark:from-slate-800 dark:to-slate-900 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                >
                  ใช้โลโก้ JIN MOTOR
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อโชว์รูม / ดีลเลอร์
              </label>
              <input
                type="text"
                value={settings.showroom.showroomName}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, showroomName: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สาขา / คำอธิบายโชว์รูม
              </label>
              <input
                type="text"
                value={settings.showroom.branchName}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, branchName: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ที่อยู่โชว์รูม
              </label>
              <input
                type="text"
                value={settings.showroom.address}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, address: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อที่ปรึกษาการขาย (เซลส์)
              </label>
              <input
                type="text"
                value={settings.showroom.salesName}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, salesName: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                เบอร์โทรเซลส์
              </label>
              <input
                type="text"
                value={settings.showroom.salesPhone}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, salesPhone: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                เบอร์โทรโชว์รูม
              </label>
              <input
                type="text"
                value={settings.showroom.phone}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, phone: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                LINE ID / Line OA
              </label>
              <input
                type="text"
                value={settings.showroom.lineId}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showroom: { ...prev.showroom, lineId: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.defaultAnonymousMode)}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      defaultAnonymousMode: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4 accent-slate-950 dark:accent-amber-400 shrink-0 cursor-pointer"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    เปิดใช้งานโหมดไม่ระบุตัวตนเป็นค่าเริ่มต้น
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    เมื่อสร้างใบเสนอราคาใหม่ จะซ่อนโลโก้ ชื่อโชว์รูม และข้อมูลติดต่อเซลส์โดยอัตโนมัติ (แสดงเฉพาะใบเสนอราคาอย่างเดียว)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vehicle Prices & Discounts */}
      {activeTab === 'pricing' && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                แก้ไขราคาปกติ ราคาพิเศษ และส่วนลดเริ่มต้นของแต่ละรุ่น
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ค่าที่แก้ไขจะอัปเดตในหน้าคำนวณราคาทันที
              </p>
            </div>
            <button
              type="button"
              onClick={addNewTrim}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] dark:hover:bg-[#1e336b] text-white dark:text-amber-300 border border-transparent dark:border-amber-400/35 rounded-lg inline-flex items-center gap-1.5 self-start whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรุ่นรถใหม่
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-semibold">แบรนด์ / รุ่น</th>
                  <th className="py-3 px-4 font-semibold">รุ่นย่อย</th>
                  <th className="py-3 px-4 font-semibold">ราคาปกติ (บาท)</th>
                  <th className="py-3 px-4 font-semibold">ราคาพิเศษ (บาท)</th>
                  <th className="py-3 px-4 font-semibold">ส่วนลดตัวรถเริ่มต้น</th>
                  <th className="py-3 px-4 font-semibold">ซับดาวน์เริ่มต้น</th>
                  <th className="py-3 px-4 font-semibold text-center">เปิดขาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.trims.map((trim) => (
                  <tr key={trim.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 min-w-[170px]">
                      <input
                        type="text"
                        value={trim.modelName}
                        onChange={(e) =>
                          updateTrim(trim.id, { modelName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="py-2.5 px-4 min-w-[140px]">
                      <input
                        type="text"
                        value={trim.trimName}
                        onChange={(e) =>
                          updateTrim(trim.id, { trimName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="py-2.5 px-4 min-w-[130px]">
                      <input
                        type="number"
                        step={1000}
                        value={trim.normalPrice}
                        onChange={(e) =>
                          updateTrim(trim.id, {
                            normalPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono-num text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="py-2.5 px-4 min-w-[130px]">
                      <input
                        type="number"
                        step={1000}
                        value={trim.specialPrice}
                        onChange={(e) =>
                          updateTrim(trim.id, {
                            specialPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono-num text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="py-2.5 px-4 min-w-[130px]">
                      <input
                        type="number"
                        step={1000}
                        value={trim.defaultVehicleDiscount}
                        onChange={(e) =>
                          updateTrim(trim.id, {
                            defaultVehicleDiscount: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono-num text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="py-2.5 px-4 min-w-[130px]">
                      <input
                        type="number"
                        step={1000}
                        value={trim.defaultDownSubsidy}
                        onChange={(e) =>
                          updateTrim(trim.id, {
                            defaultDownSubsidy: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono-num text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={trim.active}
                        onChange={(e) =>
                          updateTrim(trim.id, { active: e.target.checked })
                        }
                        className="w-4 h-4 accent-slate-950 dark:accent-amber-400 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Interest Rate Matrices */}
      {activeTab === 'rates' && (
        <div className="card-premium rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                แก้ไขตารางอัตราดอกเบี้ย (ปลายงวด)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เว้นว่างไว้หากต้องการตั้งค่าเป็น &quot;ไม่เปิดรับ&quot;
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setRateMatrixTab('standard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  rateMatrixTab === 'standard'
                    ? 'bg-white dark:bg-[#162652] text-slate-950 dark:text-amber-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                ตารางปกติ (ทุกรุ่นยกเว้น Lumin)
              </button>
              <button
                type="button"
                onClick={() => setRateMatrixTab('lumin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  rateMatrixTab === 'lumin'
                    ? 'bg-white dark:bg-[#162652] text-slate-950 dark:text-amber-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Lumin L DC
              </button>
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ส่วนลดดอกเบี้ยเมื่อชำระงวดแรกวันรับรถ (%)
            </label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.01}
              value={settings.earlyPaymentDiscount}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  earlyPaymentDiscount: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                }))
              }
              className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-semibold">% ดาวน์</th>
                  {TENOR_OPTIONS.map((t) => (
                    <th key={t.months} className="py-3 px-3 font-semibold text-center">
                      {t.months} งวด ({t.years} ปี)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {DOWN_PERCENT_TIERS.map((tier) => (
                  <tr key={tier}>
                    <td className="py-2.5 px-4 font-bold font-mono-num text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/50">
                      {tier}%{tier === 5 ? '**' : ''}
                    </td>
                    {TENOR_OPTIONS.map((t) => {
                      const val =
                        settings.rateMatrices[rateMatrixTab][tier][t.months];
                      return (
                        <td key={t.months} className="py-2 px-2">
                          <input
                            type="number"
                            step={0.01}
                            placeholder="ไม่เปิดรับ"
                            value={val === null ? '' : val}
                            onChange={(e) =>
                              updateRateCell(
                                rateMatrixTab,
                                tier,
                                t.months,
                                e.target.value
                              )
                            }
                            className="w-full min-w-[82px] px-2.5 py-1.5 text-xs font-mono-num text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Benefits, Freebies & Delivery Defaults */}
      {activeTab === 'benefits' && (
        <div className="space-y-6">
          {/* Model Benefits Editor */}
          {selectedBenefitTrim && (
            <div className="card-premium rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    แก้ไขสิทธิประโยชน์รายรุ่น
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    เลือกรุ่นรถที่ต้องการแก้ไขรายละเอียดแพ็กเกจ
                  </p>
                </div>
                <select
                  value={selectedBenefitTrim.id}
                  onChange={(e) => setEditingTrimId(e.target.value)}
                  className="px-3.5 py-2 text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {settings.trims.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.modelName} — {t.trimName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อแพ็กเกจ (เช่น NEVO Care / Premium Care)
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.packageTitle}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        packageTitle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ประกันภัยชั้น 1 และ พ.ร.บ.
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.benefits.insuranceAndAct}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          insuranceAndAct: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    โฮมชาร์จเจอร์
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.benefits.homeCharger}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          homeCharger: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รับประกันตัวรถ
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.benefits.vehicleWarranty}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          vehicleWarranty: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รับประกันแบตเตอรี่
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.benefits.batteryWarranty}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          batteryWarranty: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lifetime Battery Warranty
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.benefits.lifetimeBatteryWarranty}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          lifetimeBatteryWarranty: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    บริการช่วยเหลือฉุกเฉิน
                  </label>
                  <input
                    type="text"
                    value={selectedBenefitTrim.benefits.roadsideAssistance}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          roadsideAssistance: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    สิทธิประโยชน์เพิ่มเติม (แยกบรรทัดละ 1 รายการ)
                  </label>
                  <textarea
                    rows={3}
                    value={selectedBenefitTrim.benefits.extraItems.join('\n')}
                    onChange={(e) =>
                      updateTrim(selectedBenefitTrim.id, {
                        benefits: {
                          ...selectedBenefitTrim.benefits,
                          extraItems: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Freebies & Delivery Defaults */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-premium rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  รายการของแถมและโปรโมชั่นตัวเลือกด่วน
                </h3>
                <button
                  type="button"
                  onClick={addFreebiePreset}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-[#162652] dark:hover:bg-[#1e336b] text-white dark:text-amber-300 border border-transparent dark:border-amber-400/35 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มรายการ
                </button>
              </div>
              <div className="space-y-2.5">
                {settings.freebiePresets.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      title="เลือกเป็นค่าเริ่มต้น"
                      checked={item.defaultChecked}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          freebiePresets: prev.freebiePresets.map((f) =>
                            f.id === item.id
                              ? { ...f, defaultChecked: e.target.checked }
                              : f
                          ),
                        }))
                      }
                      className="w-4 h-4 accent-slate-950 dark:accent-amber-400 shrink-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          freebiePresets: prev.freebiePresets.map((f) =>
                            f.id === item.id
                              ? { ...f, label: e.target.value }
                              : f
                          ),
                        }))
                      }
                      className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          freebiePresets: prev.freebiePresets.filter(
                            (f) => f.id !== item.id
                          ),
                        }))
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      aria-label="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">
                ค่าใช้จ่ายวันรับรถเริ่มต้น
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าจดทะเบียนเริ่มต้น (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={settings.deliveryDefaults.registrationFee}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        deliveryDefaults: {
                          ...prev.deliveryDefaults,
                          registrationFee: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่ามัดจำป้ายแดงเริ่มต้น (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={settings.deliveryDefaults.redPlateDeposit}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        deliveryDefaults: {
                          ...prev.deliveryDefaults,
                          redPlateDeposit: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เงินจองหักวันรับรถเริ่มต้น (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={settings.deliveryDefaults.bookingDeposit}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        deliveryDefaults: {
                          ...prev.deliveryDefaults,
                          bookingDeposit: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save & Remember Bar */}
      <div className="card-premium rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs sm:text-sm">
          {hasUnsavedChanges ? (
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              มีการแก้ไขที่ยังไม่บันทึก กด &quot;บันทึกการตั้งค่า&quot; เพื่อบันทึกและใช้งานในใบเสนอราคา
            </span>
          ) : (
            <span className="text-slate-600 dark:text-slate-400">
              {formattedSavedTime
                ? `บันทึกและจำการตั้งค่าไว้แล้ว (${formattedSavedTime})`
                : 'การตั้งค่าปัจจุบันถูกจดจำไว้ในอุปกรณ์นี้แล้ว'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={() => {
                setDraftSettings(savedSettings);
                onNotify('ยกเลิกการแก้ไขที่ยังไม่บันทึกแล้ว');
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl whitespace-nowrap cursor-pointer"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
          <button
            type="button"
            onClick={() => onSaveSettings(settings)}
            className="btn-gold-copper px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4" />
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
};
