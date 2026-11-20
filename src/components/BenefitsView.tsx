import React from 'react';
import {
  Check,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  BenefitCategories,
  CalculatedQuote,
  DealerSettings,
  QuoteState,
  VehicleTrim,
} from '../types/dealer';
import { formatTHB } from '../utils/finance';

interface BenefitsViewProps {
  settings: DealerSettings;
  state: QuoteState;
  calc: CalculatedQuote;
  onUpdateState: (updater: (prev: QuoteState) => QuoteState) => void;
  onSelectTrim: (trim: VehicleTrim) => void;
  onSaveBenefitsToModel: (trimId: string, benefits: BenefitCategories) => void;
  onGoToCalculator: () => void;
}

const CARD_SURFACE = 'card-premium rounded-2xl';

export const BenefitsView: React.FC<BenefitsViewProps> = ({
  settings,
  state,
  calc,
  onUpdateState,
  onSelectTrim,
  onSaveBenefitsToModel,
  onGoToCalculator,
}) => {
  const { trim, activeBenefits } = calc;
  const activeTrims = settings.trims.filter((t) => t.active);

  const updateBenefitField = <K extends keyof BenefitCategories>(
    key: K,
    value: BenefitCategories[K]
  ) => {
    onUpdateState((prev) => ({
      ...prev,
      benefitsOverride: {
        ...(prev.benefitsOverride ?? trim.benefits),
        [key]: value,
      },
    }));
  };

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

  const benefitFields: {
    key: Exclude<keyof BenefitCategories, 'extraItems'>;
    label: string;
  }[] = [
    { key: 'insuranceAndAct', label: 'ประกันภัยชั้น 1 และ พ.ร.บ.' },
    { key: 'homeCharger', label: 'โฮมชาร์จเจอร์ (Home Charger)' },
    { key: 'vehicleWarranty', label: 'รับประกันตัวรถ' },
    { key: 'batteryWarranty', label: 'รับประกันแบตเตอรี่' },
    { key: 'lifetimeBatteryWarranty', label: 'Lifetime Battery Warranty' },
    { key: 'roadsideAssistance', label: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง' },
  ];

  return (
    <div className="space-y-7">
      {/* Header & Model Switcher */}
      <div className={`${CARD_SURFACE} p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4`}>
        <div>
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            แก้ไขสิทธิประโยชน์ ของแถม โปรโมชั่น และข้อมูลลูกค้า
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-0.5">
            {trim.modelName} ({trim.trimName}) — {trim.packageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            แก้ไขข้อความสิทธิประโยชน์ด้านล่างได้ทันที ระบบจะอัปเดตในใบเสนอราคาและข้อความ LINE อัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={trim.id}
            onChange={(e) => {
              const found = activeTrims.find((t) => t.id === e.target.value);
              if (found) onSelectTrim(found);
            }}
            className="px-3.5 py-2 text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {activeTrims.map((item) => (
              <option key={item.id} value={item.id}>
                {item.modelName} — {item.trimName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onGoToCalculator}
            className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-[#162652] dark:to-[#1e336b] text-amber-400 dark:text-amber-300 border border-transparent dark:border-amber-400/40 rounded-xl transition-all whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            กลับหน้าคำนวณราคา
          </button>
        </div>
      </div>

      {/* Editable 6 Core Benefits + Extra Items */}
      <div className={`${CARD_SURFACE} p-5 sm:p-7 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              สิทธิประโยชน์มาตรฐาน ({trim.packageTitle})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {state.benefitsOverride
                ? 'กำลังใช้ข้อความที่แก้ไขสำหรับใบเสนอราคานี้'
                : 'กำลังใช้ข้อความมาตรฐานของรุ่น'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.benefitsOverride && (
              <button
                type="button"
                onClick={() =>
                  onUpdateState((p) => ({ ...p, benefitsOverride: null }))
                }
                className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-b from-white to-slate-100 hover:to-slate-200 dark:from-slate-800 dark:to-slate-900 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                คืนค่าเดิมของรุ่นนี้
              </button>
            )}
            <button
              type="button"
              onClick={() => onSaveBenefitsToModel(trim.id, activeBenefits)}
              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl inline-flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกเป็นค่าเริ่มต้นของรุ่นนี้
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefitFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {field.label}
              </label>
              <input
                type="text"
                value={activeBenefits[field.key]}
                onChange={(e) => updateBenefitField(field.key, e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          ))}
        </div>

        {/* Extra Benefit Items */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              สิทธิประโยชน์พิเศษเพิ่มเติม
            </label>
            <button
              type="button"
              onClick={() =>
                updateBenefitField('extraItems', [
                  ...activeBenefits.extraItems,
                  '',
                ])
              }
              className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-slate-950 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-[#162652] dark:to-[#1e336b] text-white border border-transparent dark:border-amber-400/35 rounded-xl inline-flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              เพิ่มสิทธิประโยชน์
            </button>
          </div>

          <div className="space-y-2">
            {activeBenefits.extraItems.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                ยังไม่มีรายการเพิ่มเติม กดปุ่ม &quot;เพิ่มสิทธิประโยชน์&quot; เพื่อเพิ่มรายการ
              </p>
            )}
            {activeBenefits.extraItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  placeholder={`สิทธิประโยชน์เพิ่มเติมข้อที่ ${idx + 1}`}
                  onChange={(e) => {
                    const next = [...activeBenefits.extraItems];
                    next[idx] = e.target.value;
                    updateBenefitField('extraItems', next);
                  }}
                  className="flex-1 px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = activeBenefits.extraItems.filter(
                      (_, i) => i !== idx
                    );
                    updateBenefitField('extraItems', next);
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                  aria-label="ลบรายการ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Freebies, Promotions & Customer Info + Delivery Day Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <div className={`${CARD_SURFACE} p-5 sm:p-7 space-y-4`}>
          <h3 className="text-base font-bold text-slate-950 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            ของแถม โปรโมชั่น และข้อมูลลูกค้า
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อลูกค้า
              </label>
              <input
                type="text"
                value={state.customerName}
                placeholder="เช่น สมชาย ใจดี"
                onChange={(e) =>
                  onUpdateState((p) => ({ ...p, customerName: e.target.value }))
                }
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                เบอร์โทรลูกค้า
              </label>
              <input
                type="tel"
                value={state.customerPhone}
                placeholder="08X-XXX-XXXX"
                onChange={(e) =>
                  onUpdateState((p) => ({
                    ...p,
                    customerPhone: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {settings.freebiePresets.map((freebie) => {
              const checked = state.selectedFreebieIds.includes(freebie.id);
              return (
                <button
                  key={freebie.id}
                  type="button"
                  onClick={() => toggleFreebie(freebie.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    checked
                      ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-white border-slate-950 dark:border-amber-400/50 shadow-xs'
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              โปรโมชั่นพิเศษ (ระบุเอง)
            </label>
            <input
              type="text"
              value={state.promotionNote}
              placeholder="ระบุโปรโมชั่นแคมเปญ..."
              onChange={(e) =>
                onUpdateState((p) => ({
                  ...p,
                  promotionNote: e.target.value,
                }))
              }
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Delivery Day Cash Summary */}
        <div className={`${CARD_SURFACE} p-5 sm:p-7`}>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              สรุปยอดชำระวันรับรถ (รุ่นที่เลือก)
            </h3>
            <span className="text-base font-extrabold font-mono-num text-emerald-700 dark:text-emerald-400">
              {formatTHB(calc.totalDeliveryCashDue)} บาท
            </span>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            {calc.isCashPurchase ? (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">
                  ราคารถสุทธิ (ซื้อสด)
                </dt>
                <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatTHB(calc.netCarPrice)} บาท
                </dd>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">
                    เงินดาวน์คงเหลือ ({calc.downPercentActual.toFixed(1)}%)
                  </dt>
                  <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                    {formatTHB(calc.netDownPayment)} บาท
                  </dd>
                </div>
                {calc.downPaymentSubsidy > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">ค่า VAT 7% (กรณีซับดาวน์)</dt>
                    <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                      {calc.includeVat
                        ? `${formatTHB(calc.subsidyVatAmount)} บาท`
                        : '0 บาท'}
                    </dd>
                  </div>
                )}
              </>
            )}
            {calc.registrationFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">ค่าจดทะเบียน</dt>
                <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatTHB(calc.registrationFee)} บาท
                </dd>
              </div>
            )}
            {calc.redPlateDeposit > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">ค่ามัดจำป้ายแดง</dt>
                <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatTHB(calc.redPlateDeposit)} บาท
                </dd>
              </div>
            )}
            {calc.firstInstallmentDueOnDelivery > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">ค่างวดงวดแรก</dt>
                <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatTHB(calc.firstInstallmentDueOnDelivery)} บาท
                </dd>
              </div>
            )}
            {calc.customDeliveryItemsParsed.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">
                  {item.label || `รายการเพิ่มเติม ${idx + 1}`}
                </dt>
                <dd className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatTHB(item.amount)} บาท
                </dd>
              </div>
            ))}
            {calc.bookingDeposit > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                <dt>หักเงินจอง</dt>
                <dd className="font-mono-num">
                  -{formatTHB(calc.bookingDeposit)} บาท
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Quick Comparison Table Across All Active Trims */}
      <div className={`${CARD_SURFACE} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <h3 className="text-base font-bold text-slate-950 dark:text-white">
            ตารางเปรียบเทียบสิทธิประโยชน์ทุกรุ่น
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">รุ่นรถ</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">แพ็กเกจ</th>
                <th className="py-3 px-4 font-semibold">โฮมชาร์จเจอร์</th>
                <th className="py-3 px-4 font-semibold">รับประกันตัวรถ</th>
                <th className="py-3 px-4 font-semibold">ช่วยเหลือฉุกเฉิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeTrims.map((item) => {
                const isCurrent = item.id === trim.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectTrim(item)}
                    className={`cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-amber-50/70 dark:bg-amber-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-950 dark:text-white whitespace-nowrap">
                      {item.modelName} ({item.trimName})
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.packageTitle}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 min-w-[180px]">
                      {item.benefits.homeCharger}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 min-w-[200px]">
                      {item.benefits.vehicleWarranty}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 min-w-[180px]">
                      {item.benefits.roadsideAssistance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
