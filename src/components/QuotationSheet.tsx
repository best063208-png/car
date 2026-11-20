import React, { useState } from 'react';
import { CalculatedQuote, DealerSettings, QuoteState } from '../types/dealer';
import { formatThaiDate, formatTHB, formatTHBDecimal } from '../utils/finance';

interface QuotationSheetProps {
  settings: DealerSettings;
  state: QuoteState;
  calc: CalculatedQuote;
  quoteNumber?: string;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
  forExport?: boolean;
}

export const QuotationSheet: React.FC<QuotationSheetProps> = ({
  settings,
  state,
  calc,
  quoteNumber,
  sheetRef,
  forExport = false,
}) => {
  const [logoError, setLogoError] = useState(false);
  const { showroom } = settings;

  const selectedFreebies = settings.freebiePresets.filter((f) =>
    state.selectedFreebieIds.includes(f.id)
  );

  const todayText = formatThaiDate(new Date());
  const isAnonymous = Boolean(state.anonymousMode);

  return (
    <div
      ref={sheetRef}
      className={`print-only-sheet bg-white text-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden ${
        forExport
          ? 'w-[800px] rounded-none'
          : 'w-full max-w-[820px] mx-auto rounded-2xl shadow-sm dark:shadow-2xl'
      }`}
    >
      {/* Signature Gold-Copper Accent Bar */}
      <div className="h-1.5 gold-copper-bar" />

      {/* Top Header */}
      <div
        className={`px-7 py-5 border-b border-slate-200 flex justify-between gap-4 bg-white ${
          forExport ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center'
        }`}
      >
        {!isAnonymous ? (
          <div className="flex items-center gap-4">
            {!logoError && showroom.logoUrl ? (
              <img
                src={showroom.logoUrl}
                alt={showroom.showroomName}
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-14 w-14 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-extrabold text-sm tracking-tight shrink-0">
                JIN
              </div>
            )}
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
                {showroom.showroomName}
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                {showroom.branchName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{showroom.address}</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
              ใบเสนอราคารถยนต์
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รายละเอียดราคา เงื่อนไขการผ่อนชำระ และสิทธิประโยชน์
            </p>
          </div>
        )}

        <div
          className={
            forExport
              ? 'text-right'
              : 'sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100'
          }
        >
          <div className="text-sm font-bold text-slate-950">
            ใบเสนอราคาเบื้องต้น
          </div>
          {quoteNumber && (
            <div className="text-xs font-mono-num font-semibold text-slate-700 mt-0.5">
              เลขที่: {quoteNumber}
            </div>
          )}
          <div className="text-xs text-slate-500 mt-0.5">
            วันที่ออกเอกสาร: {todayText}
          </div>
          <div className="text-xs text-amber-700 font-medium mt-0.5">
            ยืนราคา {showroom.quoteValidityDays} วัน นับจากวันที่เสนอราคา
          </div>
        </div>
      </div>

      {/* Customer & Vehicle Headline */}
      <div
        className={`px-7 py-4 bg-amber-50/40 border-b border-slate-200 flex justify-between gap-3 ${
          forExport ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center'
        }`}
      >
        <div>
          <div className="text-xs font-medium text-slate-500">
            รุ่นรถยนต์ที่นำเสนอ
          </div>
          <div className="text-xl font-extrabold text-slate-950 mt-0.5">
            {calc.trim.modelName} — {calc.trim.trimName}
          </div>
          <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-sky-700">{calc.trim.brand}</span>
            <span aria-hidden="true">·</span>
            <span>ระบบขับเคลื่อน {calc.trim.powertrain}</span>
            <span aria-hidden="true">·</span>
            <span>แพ็กเกจ {calc.trim.packageTitle}</span>
          </div>
        </div>

        {(state.customerName.trim() ||
          state.customerPhone.trim() ||
          state.bookingDetails?.trim()) && (
          <div className={forExport ? 'text-right' : 'sm:text-right'}>
            <div className="text-xs text-slate-500">ข้อมูลลูกค้าและการจอง</div>
            {state.customerName.trim() && (
              <div className="text-sm font-bold text-slate-950 mt-0.5">
                คุณ{state.customerName.trim()}
              </div>
            )}
            {state.customerPhone.trim() && (
              <div className="text-xs font-mono-num text-slate-600 mt-0.5">
                โทร: {state.customerPhone.trim()}
              </div>
            )}
            {state.bookingDetails?.trim() && (
              <div className="text-xs text-slate-600 mt-0.5">
                {state.bookingDetails.trim()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hero Strip */}
      <div
        className={`px-7 py-5 border-b border-slate-200 grid gap-4 bg-gradient-to-r from-[#070d1f] via-[#0c1733] to-[#162652] text-white ${
          forExport ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'
        }`}
      >
        {calc.isCashPurchase ? (
          <>
            <div>
              <div className="text-xs text-slate-300">รูปแบบการชำระเงิน</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-1">
                ซื้อเงินสด
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                ชำระเต็มจำนวน (ไม่มีดอกเบี้ย)
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">ราคารถสุทธิ</div>
              <div className="text-xl font-bold font-mono-num text-white mt-1.5">
                {formatTHB(calc.netCarPrice)}{' '}
                <span className="text-xs font-normal text-slate-200">บาท</span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">ไม่จัดไฟแนนซ์</div>
            </div>
            <div>
              <div className="text-xs text-slate-300">ยอดชำระวันรับรถสุทธิ</div>
              <div className="text-2xl font-extrabold font-mono-num text-emerald-400 mt-1">
                {formatTHB(calc.totalDeliveryCashDue)}{' '}
                <span className="text-xs font-normal text-slate-200">บาท</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-xs text-slate-300">ค่างวดรายเดือน</div>
              <div className="text-2xl font-extrabold font-mono-num text-amber-400 mt-1">
                {formatTHB(calc.monthlyInstallment)}{' '}
                <span className="text-xs font-normal text-slate-200">บาท/เดือน</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">ระยะเวลาผ่อน &amp; ดอกเบี้ย</div>
              <div className="text-base font-bold font-mono-num text-white mt-1.5">
                {calc.tenorMonths} งวด ({calc.tenorYears} ปี)
              </div>
              <div className="text-xs text-slate-300 font-mono-num mt-0.5">
                ดอกเบี้ย {calc.effectiveInterestRate.toFixed(2)}% ต่อปี
                {state.payFirstInstallmentOnDelivery ? ' (ชำระงวดแรกวันรับรถ)' : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">ยอดชำระวันรับรถสุทธิ</div>
              <div className="text-2xl font-extrabold font-mono-num text-emerald-400 mt-1">
                {formatTHB(calc.totalDeliveryCashDue)}{' '}
                <span className="text-xs font-normal text-slate-200">บาท</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Two-Column Breakdown: Price/Finance & Delivery Expenses */}
      <div
        className={`grid divide-slate-200 border-b border-slate-200 ${
          forExport
            ? 'grid-cols-2 divide-x'
            : 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x'
        }`}
      >
        {/* Left: Vehicle Price & Finance Breakdown */}
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center shrink-0">
                1
              </span>
              สรุปราคารถและส่วนลด
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">ราคาปกติ</dt>
                <dd className="font-mono-num font-medium text-slate-900">
                  {formatTHB(calc.normalPrice)} บาท
                </dd>
              </div>
              {calc.baseSpecialPrice !== calc.normalPrice && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">ราคาพิเศษแคมเปญ</dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(calc.baseSpecialPrice)} บาท
                  </dd>
                </div>
              )}
              {calc.vehicleDiscount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">ส่วนลดราคาตัวรถ</dt>
                  <dd className="font-mono-num font-medium text-emerald-700">
                    -{formatTHB(calc.vehicleDiscount)} บาท
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-2 border-t border-slate-100 font-semibold">
                <dt className="text-slate-900">ราคารถสุทธิ</dt>
                <dd className="font-mono-num text-slate-950">
                  {formatTHB(calc.netCarPrice)} บาท
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center shrink-0">
                2
              </span>
              {calc.isCashPurchase
                ? 'รูปแบบการชำระเงิน (ซื้อสด)'
                : 'รายละเอียดการผ่อนและยอดจัด'}
            </h3>
            {calc.isCashPurchase ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">รูปแบบการซื้อ</dt>
                  <dd className="font-bold text-emerald-700">
                    ซื้อเงินสด (ชำระเต็มจำนวน)
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">ราคารถสุทธิ</dt>
                  <dd className="font-mono-num font-semibold text-slate-950">
                    {formatTHB(calc.netCarPrice)} บาท
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-xs text-slate-600">
                  <dt>ยอดจัดไฟแนนซ์</dt>
                  <dd className="font-mono-num">0 บาท</dd>
                </div>
                <div className="flex justify-between gap-4 text-xs text-slate-600">
                  <dt>ดอกเบี้ยและค่างวด</dt>
                  <dd className="font-mono-num">ไม่มี (0 บาท)</dd>
                </div>
              </dl>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    เงินดาวน์ ({calc.downPercentActual.toFixed(1)}%)
                  </dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(calc.downPaymentGross)} บาท
                  </dd>
                </div>
                {calc.downPaymentSubsidy > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">หักส่วนลดเพิ่มเป็นเงินดาวน์</dt>
                    <dd className="font-mono-num font-medium text-emerald-700">
                      -{formatTHB(calc.downPaymentSubsidy)} บาท
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-800 font-medium">เงินดาวน์คงเหลือ</dt>
                  <dd className="font-mono-num font-semibold text-slate-950">
                    {formatTHB(calc.netDownPayment)} บาท
                  </dd>
                </div>
                <div className="flex justify-between gap-4 pt-2 border-t border-slate-100">
                  <dt className="text-slate-800 font-semibold">ยอดจัดไฟแนนซ์</dt>
                  <dd className="font-mono-num font-bold text-slate-950">
                    {formatTHB(calc.financeAmount)} บาท
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-xs text-slate-600">
                  <dt>ดอกเบี้ยทั้งหมด ({calc.tenorYears} ปี)</dt>
                  <dd className="font-mono-num">
                    {formatTHBDecimal(calc.totalInterest)} บาท
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-xs text-slate-600">
                  <dt>ยอดชำระรวม</dt>
                  <dd className="font-mono-num">
                    {formatTHBDecimal(calc.totalPayable)} บาท
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Right: Delivery Day Expenses */}
        <div className="p-6 flex flex-col justify-between bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-950 pb-2 border-b border-slate-200/80 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center shrink-0">
                3
              </span>
              ยอดชำระวันรับรถ
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              {calc.isCashPurchase ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">ราคารถสุทธิ (ซื้อสด)</dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(calc.netCarPrice)} บาท
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">เงินดาวน์คงเหลือ</dt>
                    <dd className="font-mono-num font-medium text-slate-900">
                      {formatTHB(calc.netDownPayment)} บาท
                    </dd>
                  </div>
                  {calc.downPaymentSubsidy > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">ค่า VAT 7% (กรณีซับดาวน์)</dt>
                      <dd className="font-mono-num font-medium text-slate-900">
                        {calc.includeVat
                          ? `${formatTHB(calc.subsidyVatAmount)} บาท`
                          : 'ไม่เก็บ (0 บาท)'}
                      </dd>
                    </div>
                  )}
                </>
              )}
              {calc.registrationFee > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">ค่าจดทะเบียน</dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(calc.registrationFee)} บาท
                  </dd>
                </div>
              )}
              {calc.redPlateDeposit > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    ค่ามัดจำป้ายแดง (ได้คืนเมื่อรับป้ายขาว)
                  </dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(calc.redPlateDeposit)} บาท
                  </dd>
                </div>
              )}
              {calc.firstInstallmentDueOnDelivery > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">ค่างวดงวดแรก (วันรับรถ)</dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(calc.firstInstallmentDueOnDelivery)} บาท
                  </dd>
                </div>
              )}

              {calc.customDeliveryItemsParsed.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    {item.category === 'accessory'
                      ? `ค่าอุปกรณ์ตกแต่ง: ${item.label || `รายการที่ ${idx + 1}`}`
                      : item.label || `ค่าใช้จ่ายอื่น ๆ ${idx + 1}`}
                  </dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    {formatTHB(item.amount)} บาท
                  </dd>
                </div>
              ))}

              {calc.bookingDeposit > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-emerald-700 font-medium">หักเงินจอง</dt>
                  <dd className="font-mono-num font-medium text-emerald-700">
                    -{formatTHB(calc.bookingDeposit)} บาท
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 flex items-baseline justify-between gap-4">
            <span className="text-sm font-bold text-slate-900">
              ยอดชำระวันรับรถสุทธิ
            </span>
            <span className="text-lg font-extrabold font-mono-num text-slate-950">
              {formatTHB(calc.totalDeliveryCashDue)} บาท
            </span>
          </div>
        </div>
      </div>

      {/* Benefits, Freebies & Promotions Section */}
      <div className="p-6 px-7 border-b border-slate-200 space-y-5 bg-white">
        <div>
          <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center shrink-0">
              4
            </span>
            สิทธิประโยชน์ทั้งหมด ({calc.trim.packageTitle})
          </h3>
          <ul
            className={`mt-3 grid gap-x-6 gap-y-2 text-xs text-slate-700 ${
              forExport ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 sm:text-sm'
            }`}
          >
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">•</span>
              <span>{calc.activeBenefits.insuranceAndAct}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">•</span>
              <span>{calc.activeBenefits.homeCharger}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">•</span>
              <span>{calc.activeBenefits.vehicleWarranty}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">•</span>
              <span>{calc.activeBenefits.batteryWarranty}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">•</span>
              <span>{calc.activeBenefits.lifetimeBatteryWarranty}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">•</span>
              <span>{calc.activeBenefits.roadsideAssistance}</span>
            </li>
            {calc.activeBenefits.extraItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {(selectedFreebies.length > 0 ||
          state.customFreebieNote.trim() ||
          state.promotionNote.trim()) && (
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">
              ของแถมและโปรโมชั่นเพิ่มเติมจากโชว์รูม
            </h4>
            <div
              className={`mt-2 grid gap-x-6 gap-y-1.5 text-xs text-slate-700 ${
                forExport ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 sm:text-sm'
              }`}
            >
              {selectedFreebies.map((freebie) => (
                <div key={freebie.id} className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold shrink-0">+</span>
                  <span>{freebie.label}</span>
                </div>
              ))}
              {state.customFreebieNote.trim() && (
                <div
                  className={`flex items-start gap-2 ${
                    forExport ? 'col-span-2' : 'sm:col-span-2'
                  }`}
                >
                  <span className="text-emerald-700 font-bold shrink-0">+</span>
                  <span>{state.customFreebieNote.trim()}</span>
                </div>
              )}
              {state.promotionNote.trim() && (
                <div
                  className={`flex items-start gap-2 font-medium text-slate-900 ${
                    forExport ? 'col-span-2' : 'sm:col-span-2'
                  }`}
                >
                  <span className="text-amber-600 font-bold shrink-0">★</span>
                  <span>โปรโมชั่น: {state.promotionNote.trim()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {state.quoteNote.trim() && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">หมายเหตุเพิ่มเติม: </span>
            {state.quoteNote.trim()}
          </div>
        )}
      </div>

      {/* Advisor Footer (hidden in anonymous quote-only mode) */}
      {!isAnonymous && (
        <div
          className={`px-7 py-4 bg-[#070d1f] text-slate-200 flex justify-between gap-2 text-xs ${
            forExport ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center'
          }`}
        >
          <div>
            <span className="font-bold text-amber-300">{showroom.salesName}</span>
            <span className="mx-2 text-slate-600">|</span>
            <span>{showroom.showroomName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-num">
            <span>โทร: {showroom.salesPhone || showroom.phone}</span>
            <span>LINE: {showroom.lineId}</span>
          </div>
        </div>
      )}
    </div>
  );
};
