import React, { useState } from 'react';
import { DEFAULT_QUOTATION_DESIGN } from '../data/defaultCatalog';
import {
  CalculatedQuote,
  DealerSettings,
  QuotationDesignConfig,
  QuoteState,
} from '../types/dealer';
import { formatTHB, formatTHBDecimal } from '../utils/finance';

interface QuotationSheetProps {
  settings: DealerSettings;
  state: QuoteState;
  calc: CalculatedQuote;
  designOverride?: QuotationDesignConfig;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
  forExport?: boolean;
}

function hexLuminance(hex: string): number {
  const clean = (hex || '').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0.5;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function getReadableTextOn(bgHex: string): string {
  return hexLuminance(bgHex) > 0.45 ? '#0f172a' : '#ffffff';
}

function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = hexLuminance(hexA);
  const l2 = hexLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickAccentOnSurface(
  accentHex: string,
  surfaceHex: string,
  fallbackTextHex: string
): string {
  if (getContrastRatio(accentHex, surfaceHex) >= 3) {
    return accentHex;
  }
  return hexLuminance(surfaceHex) < 0.35 ? '#fbbf24' : fallbackTextHex;
}

export const QuotationSheet: React.FC<QuotationSheetProps> = ({
  settings,
  state,
  calc,
  designOverride,
  sheetRef,
  forExport = false,
}) => {
  const [logoError, setLogoError] = useState(false);
  const { showroom } = settings;
  const design: QuotationDesignConfig = {
    ...DEFAULT_QUOTATION_DESIGN,
    ...(settings.quotationDesign || {}),
    ...(designOverride || {}),
  };

  const selectedFreebies = settings.freebiePresets.filter((f) =>
    state.selectedFreebieIds.includes(f.id)
  );

  const isAnonymous = Boolean(state.anonymousMode);

  const baseFs = Math.min(18, Math.max(11, Number(design.fontSizePx) || 14));
  const fsXs = Math.max(10, baseFs - 2);
  const fsSm = Math.max(11, baseFs - 1);
  const fsLg = baseFs + 3;
  const fsXl = baseFs + 6;
  const fsHero = baseFs + 10;

  const badgeTextColor = getReadableTextOn(design.primaryColor);
  const headerAccentColor = pickAccentOnSurface(
    design.primaryColor,
    design.headerBgColor,
    design.headerTextColor
  );
  const heroAccentColor = pickAccentOnSurface(
    design.primaryColor,
    design.tableHeaderBgColor,
    design.tableHeaderTextColor
  );
  const heroHighlightPositive =
    hexLuminance(design.tableHeaderBgColor) < 0.45 ? '#34d399' : '#047857';
  const bodyAccentColor = pickAccentOnSurface(
    design.primaryColor,
    design.backgroundColor,
    design.textColor
  );
  const isBodyDark = hexLuminance(design.backgroundColor) < 0.35;
  const mutedBodyColor = isBodyDark ? 'rgba(241,245,249,0.75)' : '#475569';
  const subtleDividerColor = isBodyDark
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(15,23,42,0.1)';
  const rightPaneBg = isBodyDark
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(15,23,42,0.025)';
  const customerStripBg = `${design.primaryColor}12`;

  const logoElement = !isAnonymous ? (
    !logoError && showroom.logoUrl ? (
      <img
        src={showroom.logoUrl}
        alt={showroom.showroomName}
        referrerPolicy="no-referrer"
        onError={() => setLogoError(true)}
        className="h-14 w-14 object-contain rounded-xl border border-slate-200/80 bg-white p-1 shrink-0"
      />
    ) : (
      <div
        className="h-14 w-14 rounded-xl flex items-center justify-center font-extrabold text-sm tracking-tight shrink-0"
        style={{
          backgroundColor: design.tableHeaderBgColor,
          color: heroAccentColor,
        }}
      >
        {(showroom.showroomName || 'CAR').slice(0, 3).toUpperCase()}
      </div>
    )
  ) : null;

  const headerTitleBlock = (align: 'left' | 'center' | 'right') => (
    <div
      className={
        align === 'center'
          ? 'text-center'
          : align === 'left'
          ? 'text-left'
          : forExport
          ? 'text-right'
          : 'sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0'
      }
      style={{
        borderColor: subtleDividerColor,
      }}
    >
      <div className="font-bold" style={{ fontSize: `${baseFs}px` }}>
        ใบเสนอราคารถยนต์
      </div>
    </div>
  );

  return (
    <div
      ref={sheetRef}
      style={{
        fontFamily: `'${design.fontFamily}', 'Noto Sans Thai', sans-serif`,
        fontSize: `${baseFs}px`,
        backgroundColor: design.backgroundColor,
        color: design.textColor,
      }}
      className={`print-only-sheet border border-slate-200 dark:border-slate-700 overflow-hidden ${
        forExport
          ? 'w-[800px] rounded-none'
          : 'w-full max-w-[820px] mx-auto rounded-2xl shadow-sm dark:shadow-2xl'
      }`}
    >
      {/* Primary Accent Top Bar */}
      <div
        className="h-1.5"
        style={{ backgroundColor: design.primaryColor }}
      />

      {/* Top Header */}
      <div
        style={{
          backgroundColor: design.headerBgColor,
          color: design.headerTextColor,
          borderColor: subtleDividerColor,
        }}
        className={`border-b ${
          forExport ? 'px-7 py-5' : 'px-4 py-4 sm:px-7 sm:py-5'
        }`}
      >
        {design.logoPosition === 'center' ? (
          <div className="flex flex-col items-center text-center gap-3">
            {!isAnonymous ? (
              <>
                {logoElement}
                <div>
                  <h2
                    className="font-extrabold tracking-tight"
                    style={{ fontSize: `${fsXl}px` }}
                  >
                    {showroom.showroomName}
                  </h2>
                  <p
                    className="font-medium opacity-85 mt-0.5"
                    style={{ fontSize: `${fsXs}px` }}
                  >
                    {showroom.branchName}
                  </p>
                  {showroom.address && (
                    <p
                      className="opacity-70 mt-0.5"
                      style={{ fontSize: `${fsXs}px` }}
                    >
                      {showroom.address}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: `${fsXl}px` }}
                >
                  ใบเสนอราคารถยนต์
                </h2>
                <p
                  className="opacity-75 mt-0.5"
                  style={{ fontSize: `${fsXs}px` }}
                >
                  รายละเอียดราคา เงื่อนไขการชำระเงิน และสิทธิประโยชน์
                </p>
              </div>
            )}
            {!isAnonymous && (
              <div
                className="w-full pt-2.5 border-t"
                style={{ borderColor: subtleDividerColor }}
              >
                {headerTitleBlock('center')}
              </div>
            )}
          </div>
        ) : design.logoPosition === 'right' ? (
          <div
            className={`flex justify-between gap-4 ${
              forExport
                ? 'flex-row items-center'
                : 'flex-col sm:flex-row sm:items-center'
            }`}
          >
            <div className="space-y-1.5">
              {!isAnonymous && (
                <div>
                  <h2
                    className="font-extrabold tracking-tight"
                    style={{ fontSize: `${fsXl}px` }}
                  >
                    {showroom.showroomName}
                  </h2>
                  <p
                    className="font-medium opacity-85 mt-0.5"
                    style={{ fontSize: `${fsXs}px` }}
                  >
                    {showroom.branchName}
                  </p>
                  {showroom.address && (
                    <p
                      className="opacity-70 mt-0.5"
                      style={{ fontSize: `${fsXs}px` }}
                    >
                      {showroom.address}
                    </p>
                  )}
                </div>
              )}
              {headerTitleBlock('left')}
            </div>

            {!isAnonymous ? (
              <div className="self-start sm:self-center shrink-0">
                {logoElement}
              </div>
            ) : (
              <div>
                <p
                  className="opacity-75"
                  style={{ fontSize: `${fsXs}px` }}
                >
                  รายละเอียดราคา เงื่อนไขการชำระเงิน และสิทธิประโยชน์
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex justify-between gap-4 ${
              forExport
                ? 'flex-row items-center'
                : 'flex-col sm:flex-row sm:items-center'
            }`}
          >
            {!isAnonymous ? (
              <div className="flex items-center gap-4">
                {logoElement}
                <div>
                  <h2
                    className="font-extrabold tracking-tight"
                    style={{ fontSize: `${fsXl}px` }}
                  >
                    {showroom.showroomName}
                  </h2>
                  <p
                    className="font-medium opacity-85 mt-0.5"
                    style={{ fontSize: `${fsXs}px` }}
                  >
                    {showroom.branchName}
                  </p>
                  {showroom.address && (
                    <p
                      className="opacity-70 mt-0.5"
                      style={{ fontSize: `${fsXs}px` }}
                    >
                      {showroom.address}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: `${fsXl}px` }}
                >
                  ใบเสนอราคารถยนต์
                </h2>
                <p
                  className="opacity-75 mt-0.5"
                  style={{ fontSize: `${fsXs}px` }}
                >
                  รายละเอียดราคา เงื่อนไขการชำระเงิน และสิทธิประโยชน์
                </p>
              </div>
            )}

            {!isAnonymous && headerTitleBlock('right')}
          </div>
        )}
      </div>

      {/* Customer & Vehicle Headline */}
      <div
        style={{
          backgroundColor: customerStripBg,
          borderColor: subtleDividerColor,
        }}
        className={`border-b flex justify-between gap-3 ${
          forExport
            ? 'px-7 py-4 flex-row items-center'
            : 'px-4 py-3.5 sm:px-7 sm:py-4 flex-col sm:flex-row sm:items-center'
        }`}
      >
        <div>
          <div style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}>
            รุ่นรถยนต์ที่นำเสนอ
          </div>
          <div
            className="font-extrabold mt-0.5"
            style={{ fontSize: `${fsXl}px`, color: design.sectionTitleColor }}
          >
            {calc.trim.modelName} — {calc.trim.trimName}
          </div>
          <div
            className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5"
            style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
          >
            <span className="font-bold" style={{ color: bodyAccentColor }}>
              {calc.trim.brand}
            </span>
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
            <div style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}>
              ข้อมูลลูกค้าและการจอง
            </div>
            {state.customerName.trim() && (
              <div
                className="font-bold mt-0.5"
                style={{ fontSize: `${baseFs}px`, color: design.textColor }}
              >
                คุณ{state.customerName.trim()}
              </div>
            )}
            {state.customerPhone.trim() && (
              <div
                className="font-mono-num mt-0.5"
                style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
              >
                โทร: {state.customerPhone.trim()}
              </div>
            )}
            {state.bookingDetails?.trim() && (
              <div
                className="mt-0.5"
                style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
              >
                {state.bookingDetails.trim()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hero Strip (Customizable Table/Summary Header) */}
      <div
        style={{
          backgroundColor: design.tableHeaderBgColor,
          color: design.tableHeaderTextColor,
          borderColor: subtleDividerColor,
        }}
        className={`border-b grid gap-4 ${
          forExport
            ? 'px-7 py-5 grid-cols-3'
            : 'px-4 py-4 sm:px-7 sm:py-5 grid-cols-1 sm:grid-cols-3'
        }`}
      >
        {calc.isCashPurchase ? (
          <>
            <div>
              <div className="opacity-80" style={{ fontSize: `${fsXs}px` }}>
                รูปแบบการชำระเงิน
              </div>
              <div
                className="font-extrabold mt-1"
                style={{ fontSize: `${fsHero}px`, color: heroAccentColor }}
              >
                ซื้อเงินสด
              </div>
              <div className="opacity-80 mt-0.5" style={{ fontSize: `${fsXs}px` }}>
                ชำระเต็มจำนวน (ไม่มีดอกเบี้ย)
              </div>
            </div>
            <div>
              <div className="opacity-80" style={{ fontSize: `${fsXs}px` }}>
                ราคารถสุทธิ
              </div>
              <div
                className="font-bold font-mono-num mt-1.5"
                style={{ fontSize: `${fsXl}px` }}
              >
                {formatTHB(calc.netCarPrice)}{' '}
                <span className="font-normal opacity-80" style={{ fontSize: `${fsXs}px` }}>
                  บาท
                </span>
              </div>
              <div className="opacity-80 mt-0.5" style={{ fontSize: `${fsXs}px` }}>
                ไม่จัดไฟแนนซ์
              </div>
            </div>
            <div>
              <div className="opacity-80" style={{ fontSize: `${fsXs}px` }}>
                ยอดชำระวันรับรถสุทธิ
              </div>
              <div
                className="font-extrabold font-mono-num mt-1"
                style={{ fontSize: `${fsHero}px`, color: heroHighlightPositive }}
              >
                {formatTHB(calc.totalDeliveryCashDue)}{' '}
                <span className="font-normal opacity-80" style={{ fontSize: `${fsXs}px` }}>
                  บาท
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="opacity-80" style={{ fontSize: `${fsXs}px` }}>
                ค่างวดรายเดือน
              </div>
              <div
                className="font-extrabold font-mono-num mt-1"
                style={{ fontSize: `${fsHero}px`, color: heroAccentColor }}
              >
                {formatTHB(calc.monthlyInstallment)}{' '}
                <span className="font-normal opacity-80" style={{ fontSize: `${fsXs}px` }}>
                  บาท/เดือน
                </span>
              </div>
            </div>
            <div>
              <div className="opacity-80" style={{ fontSize: `${fsXs}px` }}>
                ระยะเวลาผ่อน &amp; ดอกเบี้ย
              </div>
              <div
                className="font-bold font-mono-num mt-1.5"
                style={{ fontSize: `${fsLg}px` }}
              >
                {calc.tenorMonths} งวด ({calc.tenorYears} ปี)
              </div>
              <div
                className="opacity-80 font-mono-num mt-0.5"
                style={{ fontSize: `${fsXs}px` }}
              >
                ดอกเบี้ย {calc.effectiveInterestRate.toFixed(2)}% ต่อปี
                {calc.specialDiscountActive
                  ? ` (${calc.specialDiscountLabel})`
                  : ''}
                {state.payFirstInstallmentOnDelivery ? ' · ชำระงวดแรกวันรับรถ' : ''}
              </div>
            </div>
            <div>
              <div className="opacity-80" style={{ fontSize: `${fsXs}px` }}>
                ยอดชำระวันรับรถสุทธิ
              </div>
              <div
                className="font-extrabold font-mono-num mt-1"
                style={{ fontSize: `${fsHero}px`, color: heroHighlightPositive }}
              >
                {formatTHB(calc.totalDeliveryCashDue)}{' '}
                <span className="font-normal opacity-80" style={{ fontSize: `${fsXs}px` }}>
                  บาท
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Two-Column Breakdown: Price/Finance & Delivery Expenses */}
      <div
        style={{ borderColor: subtleDividerColor }}
        className={`grid border-b ${
          forExport
            ? 'grid-cols-2 divide-x'
            : 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x'
        }`}
      >
        {/* Left: Vehicle Price & Finance Breakdown */}
        <div
          className={forExport ? 'p-6 space-y-5' : 'p-4 sm:p-6 space-y-5'}
          style={{ borderColor: subtleDividerColor }}
        >
          <div>
            <h3
              className="font-bold pb-2 border-b flex items-center gap-2"
              style={{
                fontSize: `${baseFs}px`,
                color: design.sectionTitleColor,
                borderColor: subtleDividerColor,
              }}
            >
              <span
                className="w-5 h-5 rounded font-extrabold inline-flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: design.primaryColor,
                  color: badgeTextColor,
                  fontSize: `${fsXs}px`,
                }}
              >
                1
              </span>
              สรุปราคารถและส่วนลด
            </h3>
            <dl className="mt-3 space-y-2" style={{ fontSize: `${baseFs}px` }}>
              <div className="flex justify-between gap-4">
                <dt style={{ color: mutedBodyColor }}>ราคาปกติ</dt>
                <dd className="font-mono-num font-medium">
                  {formatTHB(calc.normalPrice)} บาท
                </dd>
              </div>
              {calc.baseSpecialPrice !== calc.normalPrice && (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>ราคาพิเศษแคมเปญ</dt>
                  <dd className="font-mono-num font-medium">
                    {formatTHB(calc.baseSpecialPrice)} บาท
                  </dd>
                </div>
              )}
              {calc.vehicleDiscount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>ส่วนลดราคาตัวรถ</dt>
                  <dd className="font-mono-num font-medium text-emerald-700">
                    -{formatTHB(calc.vehicleDiscount)} บาท
                  </dd>
                </div>
              )}
              <div
                className="flex justify-between gap-4 pt-2 border-t font-semibold"
                style={{ borderColor: subtleDividerColor }}
              >
                <dt>ราคารถสุทธิ</dt>
                <dd className="font-mono-num font-bold">
                  {formatTHB(calc.netCarPrice)} บาท
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3
              className="font-bold pb-2 border-b flex items-center gap-2"
              style={{
                fontSize: `${baseFs}px`,
                color: design.sectionTitleColor,
                borderColor: subtleDividerColor,
              }}
            >
              <span
                className="w-5 h-5 rounded font-extrabold inline-flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: design.primaryColor,
                  color: badgeTextColor,
                  fontSize: `${fsXs}px`,
                }}
              >
                2
              </span>
              {calc.isCashPurchase
                ? 'รูปแบบการชำระเงิน (ซื้อสด)'
                : 'รายละเอียดการผ่อนและยอดจัด'}
            </h3>
            {calc.isCashPurchase ? (
              <dl className="mt-3 space-y-2" style={{ fontSize: `${baseFs}px` }}>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>รูปแบบการซื้อ</dt>
                  <dd className="font-bold text-emerald-700">
                    ซื้อเงินสด (ชำระเต็มจำนวน)
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>ราคารถสุทธิ</dt>
                  <dd className="font-mono-num font-semibold">
                    {formatTHB(calc.netCarPrice)} บาท
                  </dd>
                </div>
                <div
                  className="flex justify-between gap-4"
                  style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
                >
                  <dt>ยอดจัดไฟแนนซ์</dt>
                  <dd className="font-mono-num">0 บาท</dd>
                </div>
                <div
                  className="flex justify-between gap-4"
                  style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
                >
                  <dt>ดอกเบี้ยและค่างวด</dt>
                  <dd className="font-mono-num">ไม่มี (0 บาท)</dd>
                </div>
              </dl>
            ) : (
              <dl className="mt-3 space-y-2" style={{ fontSize: `${baseFs}px` }}>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>
                    เงินดาวน์ ({calc.downPercentActual.toFixed(1)}%)
                  </dt>
                  <dd className="font-mono-num font-medium">
                    {formatTHB(calc.downPaymentGross)} บาท
                  </dd>
                </div>
                {calc.downPaymentSubsidy > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt style={{ color: mutedBodyColor }}>หักส่วนลดเพิ่มเป็นเงินดาวน์</dt>
                    <dd className="font-mono-num font-medium text-emerald-700">
                      -{formatTHB(calc.downPaymentSubsidy)} บาท
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="font-medium">เงินดาวน์คงเหลือ</dt>
                  <dd className="font-mono-num font-semibold">
                    {formatTHB(calc.netDownPayment)} บาท
                  </dd>
                </div>
                <div
                  className="flex justify-between gap-4 pt-2 border-t"
                  style={{ borderColor: subtleDividerColor }}
                >
                  <dt className="font-semibold">ยอดจัดไฟแนนซ์</dt>
                  <dd className="font-mono-num font-bold">
                    {formatTHB(calc.financeAmount)} บาท
                  </dd>
                </div>
                <div
                  className="flex justify-between gap-4"
                  style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
                >
                  <dt>อัตราดอกเบี้ยสุทธิ</dt>
                  <dd className="font-mono-num font-semibold">
                    {calc.effectiveInterestRate.toFixed(2)}% ต่อปี
                  </dd>
                </div>
                {calc.specialDiscountActive && (
                  <div
                    className="flex justify-between gap-4 text-emerald-700"
                    style={{ fontSize: `${fsXs}px` }}
                  >
                    <dt>{calc.specialDiscountLabel}</dt>
                    <dd className="font-mono-num font-medium">
                      {calc.baseInterestRate.toFixed(2)}% →{' '}
                      {calc.rateAfterSpecialDiscount.toFixed(2)}%
                    </dd>
                  </div>
                )}
                <div
                  className="flex justify-between gap-4"
                  style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
                >
                  <dt>ดอกเบี้ยทั้งหมด ({calc.tenorYears} ปี)</dt>
                  <dd className="font-mono-num">
                    {formatTHBDecimal(calc.totalInterest)} บาท
                  </dd>
                </div>
                <div
                  className="flex justify-between gap-4"
                  style={{ fontSize: `${fsXs}px`, color: mutedBodyColor }}
                >
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
        <div
          style={{
            backgroundColor: rightPaneBg,
            borderColor: subtleDividerColor,
          }}
          className={`flex flex-col justify-between ${
            forExport ? 'p-6' : 'p-4 sm:p-6'
          }`}
        >
          <div>
            <h3
              className="font-bold pb-2 border-b flex items-center gap-2"
              style={{
                fontSize: `${baseFs}px`,
                color: design.sectionTitleColor,
                borderColor: subtleDividerColor,
              }}
            >
              <span
                className="w-5 h-5 rounded font-extrabold inline-flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: design.primaryColor,
                  color: badgeTextColor,
                  fontSize: `${fsXs}px`,
                }}
              >
                3
              </span>
              ยอดชำระวันรับรถ
            </h3>
            <dl className="mt-3 space-y-2.5" style={{ fontSize: `${baseFs}px` }}>
              {calc.isCashPurchase ? (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>ราคารถสุทธิ (ซื้อสด)</dt>
                  <dd className="font-mono-num font-medium">
                    {formatTHB(calc.netCarPrice)} บาท
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between gap-4">
                    <dt style={{ color: mutedBodyColor }}>เงินดาวน์คงเหลือ</dt>
                    <dd className="font-mono-num font-medium">
                      {formatTHB(calc.netDownPayment)} บาท
                    </dd>
                  </div>
                  {calc.downPaymentSubsidy > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt style={{ color: mutedBodyColor }}>ค่า VAT 7% (กรณีซับดาวน์)</dt>
                      <dd className="font-mono-num font-medium">
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
                  <dt style={{ color: mutedBodyColor }}>ค่าจดทะเบียน</dt>
                  <dd className="font-mono-num font-medium">
                    {formatTHB(calc.registrationFee)} บาท
                  </dd>
                </div>
              )}
              {calc.redPlateDeposit > 0 && (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>
                    ค่ามัดจำป้ายแดง (ได้คืนเมื่อรับป้ายขาว)
                  </dt>
                  <dd className="font-mono-num font-medium">
                    {formatTHB(calc.redPlateDeposit)} บาท
                  </dd>
                </div>
              )}
              {calc.firstInstallmentDueOnDelivery > 0 && (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>ค่างวดงวดแรก (วันรับรถ)</dt>
                  <dd className="font-mono-num font-medium">
                    {formatTHB(calc.firstInstallmentDueOnDelivery)} บาท
                  </dd>
                </div>
              )}

              {calc.customDeliveryItemsParsed.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <dt style={{ color: mutedBodyColor }}>
                    {item.category === 'accessory'
                      ? `ค่าอุปกรณ์ตกแต่ง: ${item.label || `รายการที่ ${idx + 1}`}`
                      : item.label || `ค่าใช้จ่ายอื่น ๆ ${idx + 1}`}
                  </dt>
                  <dd className="font-mono-num font-medium">
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

          <div
            className="mt-6 pt-3 border-t flex items-baseline justify-between gap-4"
            style={{ borderColor: subtleDividerColor }}
          >
            <span className="font-bold" style={{ fontSize: `${baseFs}px` }}>
              ยอดชำระวันรับรถสุทธิ
            </span>
            <span
              className="font-extrabold font-mono-num"
              style={{ fontSize: `${fsLg}px`, color: design.sectionTitleColor }}
            >
              {formatTHB(calc.totalDeliveryCashDue)} บาท
            </span>
          </div>
        </div>
      </div>

      {/* Benefits, Freebies & Promotions Section */}
      {(calc.enabledBenefitTexts.length > 0 ||
        selectedFreebies.length > 0 ||
        state.customFreebieNote.trim() ||
        state.promotionNote.trim() ||
        state.quoteNote.trim()) && (
        <div
          style={{ borderColor: subtleDividerColor }}
          className={`border-b space-y-5 ${
            forExport ? 'p-6 px-7' : 'p-4 sm:p-6 sm:px-7'
          }`}
        >
          {calc.enabledBenefitTexts.length > 0 && (
            <div>
              <h3
                className="font-bold flex items-center gap-2"
                style={{
                  fontSize: `${baseFs}px`,
                  color: design.sectionTitleColor,
                }}
              >
                <span
                  className="w-5 h-5 rounded font-extrabold inline-flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: design.primaryColor,
                    color: badgeTextColor,
                    fontSize: `${fsXs}px`,
                  }}
                >
                  4
                </span>
                สิทธิประโยชน์ที่ได้รับ ({calc.trim.packageTitle})
              </h3>
              <ul
                style={{ fontSize: `${fsSm}px` }}
                className={`mt-3 grid gap-x-6 gap-y-2 ${
                  forExport ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {calc.enabledBenefitTexts.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className="font-bold shrink-0"
                      style={{ color: bodyAccentColor }}
                    >
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(selectedFreebies.length > 0 ||
            state.customFreebieNote.trim() ||
            state.promotionNote.trim()) && (
            <div
              className={calc.enabledBenefitTexts.length > 0 ? 'pt-4 border-t' : ''}
              style={{ borderColor: subtleDividerColor }}
            >
              <h4
                className="font-bold"
                style={{
                  fontSize: `${fsXs}px`,
                  color: design.sectionTitleColor,
                }}
              >
                ของแถมและโปรโมชั่นเพิ่มเติมจากโชว์รูม
              </h4>
              <div
                style={{ fontSize: `${fsSm}px` }}
                className={`mt-2 grid gap-x-6 gap-y-1.5 ${
                  forExport ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
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
                    className={`flex items-start gap-2 font-medium ${
                      forExport ? 'col-span-2' : 'sm:col-span-2'
                    }`}
                  >
                    <span
                      className="font-bold shrink-0"
                      style={{ color: bodyAccentColor }}
                    >
                      ★
                    </span>
                    <span>โปรโมชั่น: {state.promotionNote.trim()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {state.quoteNote.trim() && (
            <div
              className="pt-3 border-t"
              style={{
                borderColor: subtleDividerColor,
                fontSize: `${fsXs}px`,
                color: mutedBodyColor,
              }}
            >
              <span className="font-semibold" style={{ color: design.textColor }}>
                หมายเหตุเพิ่มเติม:{' '}
              </span>
              {state.quoteNote.trim()}
            </div>
          )}
        </div>
      )}

      {/* Advisor Footer (hidden in anonymous quote-only mode) */}
      {!isAnonymous && (
        <div
          style={{
            backgroundColor: design.tableHeaderBgColor,
            color: design.tableHeaderTextColor,
            fontSize: `${fsXs}px`,
          }}
          className={`flex justify-between gap-2 ${
            forExport
              ? 'px-7 py-4 flex-row items-center'
              : 'px-4 py-3.5 sm:px-7 sm:py-4 flex-col sm:flex-row sm:items-center'
          }`}
        >
          <div>
            <span className="font-bold" style={{ color: heroAccentColor }}>
              {showroom.salesName}
            </span>
            <span className="mx-2 opacity-40">|</span>
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
