import { ALL_BENEFIT_KEYS, DOWN_PERCENT_TIERS } from '../data/defaultCatalog';
import {
  CalculatedQuote,
  DealerSettings,
  DownPercentTier,
  QuoteState,
} from '../types/dealer';

export function formatTHB(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatTHBDecimal(value: number): string {
  const hasFraction = Math.abs(value - Math.round(value)) > 0.001;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRate(rate: number | null): string {
  if (rate === null || Number.isNaN(rate)) return 'ไม่เปิดรับ';
  return `${rate.toFixed(2)}%`;
}

export function formatThaiDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function matchDownPercentTier(percent: number): DownPercentTier | null {
  for (const tier of DOWN_PERCENT_TIERS) {
    if (percent >= tier - 0.01) {
      return tier;
    }
  }
  return null;
}

export function calculateQuote(
  settings: DealerSettings,
  state: QuoteState
): CalculatedQuote {
  const trim =
    settings.trims.find((t) => t.id === state.selectedTrimId) ||
    settings.trims.find((t) => t.active) ||
    settings.trims[0];

  const activeBenefits = state.benefitsOverride ?? trim.benefits;
  const isCashPurchase = state.purchaseType === 'cash';

  const normalPrice = trim.normalPrice;
  const baseSpecialPrice = trim.specialPrice;
  const vehicleDiscount = Math.max(0, state.vehicleDiscount);
  const priceAfterDiscount = Math.max(0, baseSpecialPrice - vehicleDiscount);

  const vatMode =
    state.vatMode === 'included_no_subsidy_vat'
      ? 'included_no_subsidy_vat'
      : state.vatMode === 'included_with_subsidy_vat'
      ? 'included_with_subsidy_vat'
      : state.includeVat
      ? 'included_with_subsidy_vat'
      : 'included_no_subsidy_vat';

  const netCarPrice = priceAfterDiscount;
  const priceBeforeVat = Math.round(netCarPrice / 1.07);
  const carVatAmount = Math.max(0, netCarPrice - priceBeforeVat);

  let downPaymentGross = 0;
  let downPercentActual = 0;

  if (state.downMode === 'percent') {
    downPercentActual = Math.min(99, Math.max(0, state.downPercentInput));
    downPaymentGross = Math.round(netCarPrice * (downPercentActual / 100));
  } else {
    downPaymentGross = Math.min(netCarPrice, Math.max(0, state.downAmountInput));
    downPercentActual =
      netCarPrice > 0 ? (downPaymentGross / netCarPrice) * 100 : 0;
  }

  const downPaymentSubsidy = Math.max(0, state.downPaymentSubsidy);
  const netDownPayment = Math.max(0, downPaymentGross - downPaymentSubsidy);
  const excessSubsidy = Math.max(0, downPaymentSubsidy - downPaymentGross);

  // VAT 7% กรณีซับดาวน์ (ส่วนลดเพิ่มเป็นเงินดาวน์)
  const includeSubsidyVat =
    vatMode === 'included_with_subsidy_vat' ||
    (vatMode !== 'included_no_subsidy_vat' && state.includeVat);
  const subsidyVatAmount = includeSubsidyVat
    ? Math.round(downPaymentSubsidy * 0.07)
    : 0;

  const financeAmount = Math.max(0, netCarPrice - downPaymentGross);

  const tierMatched = matchDownPercentTier(downPercentActual);
  const matrix =
    trim.rateTable === 'lumin'
      ? settings.rateMatrices.lumin
      : settings.rateMatrices.standard;

  const tableRate =
    tierMatched !== null ? matrix[tierMatched][state.tenorMonths] : null;

  const isRateUnavailable =
    state.customInterestRate === null && tableRate === null;

  const baseInterestRate =
    state.customInterestRate !== null
      ? state.customInterestRate
      : tableRate ?? 0;

  const specialDiscountActive = Boolean(state.enableSpecialInterestDiscount);
  const specialDiscountMode =
    state.specialInterestDiscountMode === 'target_rate'
      ? 'target_rate'
      : 'discount_rate';
  const specialDiscountLabel =
    (state.specialInterestLabel ?? '').trim() || 'ส่วนลดดอกเบี้ยพิเศษ';

  let specialInterestDiscountApplied = 0;
  let rateAfterSpecialDiscount = baseInterestRate;

  if (specialDiscountActive) {
    if (
      specialDiscountMode === 'target_rate' &&
      state.specialInterestTargetRate !== null &&
      state.specialInterestTargetRate !== undefined &&
      !Number.isNaN(Number(state.specialInterestTargetRate))
    ) {
      rateAfterSpecialDiscount = Math.max(
        0,
        Number(Number(state.specialInterestTargetRate).toFixed(2))
      );
      specialInterestDiscountApplied = Number(
        (baseInterestRate - rateAfterSpecialDiscount).toFixed(2)
      );
    } else {
      specialInterestDiscountApplied = Math.max(
        0,
        Number(Number(state.specialInterestDiscountRate || 0).toFixed(2))
      );
      rateAfterSpecialDiscount = Math.max(
        0,
        Number((baseInterestRate - specialInterestDiscountApplied).toFixed(2))
      );
    }
  }

  const earlyPaymentDiscountApplied = state.payFirstInstallmentOnDelivery
    ? settings.earlyPaymentDiscount
    : 0;

  const effectiveInterestRate = Math.max(
    0,
    Number((rateAfterSpecialDiscount - earlyPaymentDiscountApplied).toFixed(2))
  );

  const tenorYears = state.tenorMonths / 12;
  const totalInterest = Number(
    (financeAmount * (effectiveInterestRate / 100) * tenorYears).toFixed(2)
  );
  const totalPayable = Number((financeAmount + totalInterest).toFixed(2));
  const monthlyInstallment =
    state.tenorMonths > 0 ? Math.round(totalPayable / state.tenorMonths) : 0;

  const firstInstallmentDueOnDelivery = state.payFirstInstallmentOnDelivery
    ? state.customFirstInstallmentAmount !== null &&
      state.customFirstInstallmentAmount !== undefined &&
      !Number.isNaN(Number(state.customFirstInstallmentAmount))
      ? Math.max(0, Math.round(Number(state.customFirstInstallmentAmount)))
      : monthlyInstallment
    : 0;

  const registrationFee = Math.max(0, state.registrationFee);
  const redPlateDeposit = Math.max(0, state.redPlateDeposit);
  const bookingDeposit = Math.max(0, state.bookingDeposit);

  const customDeliveryItemsParsed = (state.customDeliveryItems || [])
    .map((item) => {
      const cleaned = String(item.amount).replace(/,/g, '').trim();
      const num = cleaned === '' ? 0 : Math.max(0, Number(cleaned) || 0);
      return {
        category: (item.category === 'accessory' ? 'accessory' : 'other') as
          | 'accessory'
          | 'other',
        label: item.label.trim(),
        amount: num,
      };
    })
    .filter((item) => item.label !== '' || item.amount > 0);

  const customDeliveryTotal = customDeliveryItemsParsed.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const downPaymentGrossFinal = isCashPurchase ? 0 : downPaymentGross;
  const downPercentActualFinal = isCashPurchase ? 0 : downPercentActual;
  const downPaymentSubsidyFinal = isCashPurchase ? 0 : downPaymentSubsidy;
  const netDownPaymentFinal = isCashPurchase ? 0 : netDownPayment;
  const excessSubsidyFinal = isCashPurchase ? 0 : excessSubsidy;
  const includeSubsidyVatFinal = isCashPurchase ? false : includeSubsidyVat;
  const subsidyVatAmountFinal = isCashPurchase ? 0 : subsidyVatAmount;
  const baseInterestRateFinal = isCashPurchase ? 0 : baseInterestRate;
  const specialDiscountActiveFinal = isCashPurchase
    ? false
    : specialDiscountActive;
  const specialInterestDiscountAppliedFinal = isCashPurchase
    ? 0
    : specialInterestDiscountApplied;
  const rateAfterSpecialDiscountFinal = isCashPurchase
    ? 0
    : rateAfterSpecialDiscount;
  const financeAmountFinal = isCashPurchase ? 0 : financeAmount;
  const effectiveInterestRateFinal = isCashPurchase ? 0 : effectiveInterestRate;
  const totalInterestFinal = isCashPurchase ? 0 : totalInterest;
  const totalPayableFinal = isCashPurchase ? 0 : totalPayable;
  const monthlyInstallmentFinal = isCashPurchase ? 0 : monthlyInstallment;
  const firstInstallmentDueOnDeliveryFinal = isCashPurchase
    ? 0
    : firstInstallmentDueOnDelivery;

  const totalDeliveryCashDue = Math.max(
    0,
    (isCashPurchase
      ? netCarPrice
      : netDownPaymentFinal + subsidyVatAmountFinal + firstInstallmentDueOnDeliveryFinal) +
      registrationFee +
      redPlateDeposit +
      customDeliveryTotal -
      bookingDeposit
  );

  const selectedBenefitKeys = state.selectedBenefitKeys ?? ALL_BENEFIT_KEYS;
  const disabledExtraIndices = state.disabledExtraBenefitIndices ?? [];
  const enabledBenefitTexts: string[] = [
    ...ALL_BENEFIT_KEYS.filter((key) => selectedBenefitKeys.includes(key))
      .map((key) => activeBenefits[key]?.trim() || '')
      .filter(Boolean),
    ...activeBenefits.extraItems
      .filter((_, idx) => !disabledExtraIndices.includes(idx))
      .map((item) => item.trim())
      .filter(Boolean),
  ];

  return {
    trim,
    activeBenefits,
    enabledBenefitTexts,
    isCashPurchase,
    normalPrice,
    baseSpecialPrice,
    vehicleDiscount,
    priceAfterDiscount,
    vatMode,
    carVatAmount,
    priceBeforeVat,
    netCarPrice,
    downPaymentGross: downPaymentGrossFinal,
    downPercentActual: downPercentActualFinal,
    downPaymentSubsidy: downPaymentSubsidyFinal,
    netDownPayment: netDownPaymentFinal,
    excessSubsidy: excessSubsidyFinal,
    includeVat: includeSubsidyVatFinal,
    subsidyVatAmount: subsidyVatAmountFinal,
    financeAmount: financeAmountFinal,
    tenorMonths: state.tenorMonths,
    tenorYears,
    tierMatched,
    tableRate,
    isRateUnavailable,
    baseInterestRate: baseInterestRateFinal,
    specialDiscountActive: specialDiscountActiveFinal,
    specialDiscountLabel,
    specialInterestDiscountApplied: specialInterestDiscountAppliedFinal,
    rateAfterSpecialDiscount: rateAfterSpecialDiscountFinal,
    earlyPaymentDiscountApplied,
    effectiveInterestRate: effectiveInterestRateFinal,
    totalInterest: totalInterestFinal,
    totalPayable: totalPayableFinal,
    monthlyInstallment: monthlyInstallmentFinal,
    firstInstallmentDueOnDelivery: firstInstallmentDueOnDeliveryFinal,
    registrationFee,
    redPlateDeposit,
    bookingDeposit,
    customDeliveryItemsParsed,
    customDeliveryTotal,
    totalDeliveryCashDue,
  };
}

export function buildLineShareText(
  settings: DealerSettings,
  state: QuoteState,
  calc: CalculatedQuote
): string {
  const { showroom } = settings;
  const selectedFreebies = settings.freebiePresets
    .filter((f) => state.selectedFreebieIds.includes(f.id))
    .map((f) => f.label);

  const downPctLabel = Number.isInteger(Number(calc.downPercentActual.toFixed(1)))
    ? `${Math.round(calc.downPercentActual)}%`
    : `${calc.downPercentActual.toFixed(1)}%`;

  const accessoryItems = calc.customDeliveryItemsParsed.filter(
    (item) => item.category === 'accessory'
  );
  const otherExpenseItems = calc.customDeliveryItemsParsed.filter(
    (item) => item.category !== 'accessory'
  );

  const lines: string[] = [
    `🚗 ใบเสนอราคา ${calc.trim.modelName} ${calc.trim.trimName}`,
    state.customerName.trim() ? `เรียน คุณ${state.customerName.trim()}` : '',
    state.customerPhone.trim() ? `📞 โทร: ${state.customerPhone.trim()}` : '',
    state.bookingDetails?.trim()
      ? `📋 รายละเอียดการจอง: ${state.bookingDetails.trim()}`
      : '',
    ``,
    calc.netCarPrice !== calc.normalPrice
      ? `💰 ราคาปกติ: ${formatTHB(calc.normalPrice)} บาท`
      : `💰 ราคารถ: ${formatTHB(calc.normalPrice)} บาท`,
    calc.vehicleDiscount > 0
      ? `🏷️ ส่วนลดตัวรถ: -${formatTHB(calc.vehicleDiscount)} บาท`
      : '',
    calc.netCarPrice !== calc.normalPrice
      ? `✨ ราคารถสุทธิ: ${formatTHB(calc.netCarPrice)} บาท`
      : '',
    !calc.isCashPurchase && calc.downPaymentSubsidy > 0
      ? `🎉 ส่วนลดเงินดาวน์ (ซับดาวน์): ${formatTHB(calc.downPaymentSubsidy)} บาท`
      : '',
    state.promotionNote.trim()
      ? `🔥 โปรโมชั่น: ${state.promotionNote.trim()}`
      : '',
    ``,
    `⸻`,
    ``,
    ...(calc.isCashPurchase
      ? [
          `📌 รูปแบบการชำระเงิน: ซื้อเงินสด (ชำระเต็มจำนวน ไม่มีดอกเบี้ย)`,
          `• ราคารถสุทธิ: ${formatTHB(calc.netCarPrice)} บาท`,
        ]
      : [
          `📌 รายละเอียดเงินดาวน์และค่างวด`,
          ``,
          `• เงินดาวน์ (${downPctLabel}): ${formatTHB(calc.downPaymentGross)} บาท`,
          `• ยอดจัดไฟแนนซ์: ${formatTHB(calc.financeAmount)} บาท`,
          `• ระยะเวลาผ่อน: ${calc.tenorMonths} เดือน (${calc.tenorYears} ปี)`,
          `• อัตราดอกเบี้ย: ${calc.effectiveInterestRate.toFixed(2)}% ต่อปี${
            state.payFirstInstallmentOnDelivery ? ' (หักส่วนลดชำระงวดแรกวันรับรถแล้ว)' : ''
          }`,
          calc.specialDiscountActive
            ? `• ${calc.specialDiscountLabel}: จาก ${calc.baseInterestRate.toFixed(2)}% เหลือ ${calc.rateAfterSpecialDiscount.toFixed(2)}%`
            : '',
          `• ดอกเบี้ยรวม: ${formatTHBDecimal(calc.totalInterest)} บาท`,
          `• ยอดชำระรวมไฟแนนซ์: ${formatTHBDecimal(calc.totalPayable)} บาท`,
          `• ค่างวดประมาณ: ${formatTHB(calc.monthlyInstallment)} บาท/เดือน`,
        ]),
    ``,
    `⸻`,
    ``,
    `💵 สรุปยอดชำระวันรับรถ`,
    ``,
    ...(calc.isCashPurchase
      ? [`ราคารถสุทธิ (ซื้อสด) = ${formatTHB(calc.netCarPrice)} บาท`]
      : [
          `เงินดาวน์ ${downPctLabel} = ${formatTHB(calc.downPaymentGross)} บาท`,
          calc.downPaymentSubsidy > 0
            ? `หักส่วนลดเงินดาวน์ (ซับดาวน์) = -${formatTHB(calc.downPaymentSubsidy)} บาท`
            : '',
          `➡️ เงินดาวน์คงเหลือ = ${formatTHB(calc.netDownPayment)} บาท`,
          calc.includeVat && calc.subsidyVatAmount > 0
            ? `ค่า VAT 7% (กรณีซับดาวน์) = ${formatTHB(calc.subsidyVatAmount)} บาท`
            : !calc.includeVat && calc.downPaymentSubsidy > 0
            ? `ค่า VAT 7% (กรณีซับดาวน์) = ไม่เก็บ (0 บาท)`
            : '',
        ]),
    calc.registrationFee > 0
      ? `ค่าจดทะเบียน = ${formatTHB(calc.registrationFee)} บาท`
      : '',
    calc.redPlateDeposit > 0
      ? `ค่ามัดจำป้ายแดง (คืนเมื่อรับป้ายขาว) = ${formatTHB(calc.redPlateDeposit)} บาท`
      : '',
    !calc.isCashPurchase && calc.firstInstallmentDueOnDelivery > 0
      ? `ค่างวดงวดแรก (วันรับรถ) = ${formatTHB(calc.firstInstallmentDueOnDelivery)} บาท`
      : '',
    ...accessoryItems.map(
      (item) =>
        `ค่าอุปกรณ์ตกแต่ง (${item.label || 'อุปกรณ์ตกแต่ง'}) = ${formatTHB(item.amount)} บาท`
    ),
    ...otherExpenseItems.map(
      (item) =>
        `${item.label || 'ค่าใช้จ่ายอื่น ๆ'} = ${formatTHB(item.amount)} บาท`
    ),
    calc.bookingDeposit > 0
      ? `หักเงินจองรถยนต์ = -${formatTHB(calc.bookingDeposit)} บาท`
      : '',
    ``,
    `✅ ยอดชำระวันรับรถสุทธิ${calc.isCashPurchase ? ' (ซื้อสด)' : ''} = ${formatTHB(calc.totalDeliveryCashDue)} บาท`,
  ];

  if (calc.enabledBenefitTexts.length > 0) {
    lines.push(``);
    lines.push(`⸻`);
    lines.push(``);
    lines.push(`🛡️ สิทธิประโยชน์และการรับประกัน (${calc.trim.packageTitle})`);
    calc.enabledBenefitTexts.forEach((b) => lines.push(`• ${b}`));
  }

  if (selectedFreebies.length > 0 || state.customFreebieNote.trim()) {
    lines.push(``);
    lines.push(`🎁 รายการของแถมเพิ่มเติม`);
    selectedFreebies.forEach((f) => lines.push(`• ${f}`));
    if (state.customFreebieNote.trim()) {
      lines.push(`• ${state.customFreebieNote.trim()}`);
    }
  }

  if (state.quoteNote.trim()) {
    lines.push(``);
    lines.push(`📝 หมายเหตุ: ${state.quoteNote.trim()}`);
  }

  if (!state.anonymousMode) {
    lines.push(``);
    lines.push(`สอบถามรายละเอียดเพิ่มเติม ติดต่อ ${showroom.salesName} (${showroom.showroomName})`);
    lines.push(`โทร: ${showroom.salesPhone || showroom.phone} | LINE: ${showroom.lineId}`);
  }

  // Collapse consecutive empty strings cleanly while preserving single blank lines
  const filtered: string[] = [];
  for (const line of lines) {
    if (line === '') {
      if (filtered.length > 0 && filtered[filtered.length - 1] !== '') {
        filtered.push('');
      }
    } else {
      filtered.push(line);
    }
  }
  return filtered.join('\n').trim();
}

export function getLineShareUrl(text: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

export function buildFinanceSubmissionLineText(
  state: QuoteState,
  calc: CalculatedQuote
): string {
  const downPctText = Number.isInteger(Number(calc.downPercentActual.toFixed(1)))
    ? String(Math.round(calc.downPercentActual))
    : calc.downPercentActual.toFixed(1);

  const lines: string[] = [
    'ส่งงานครับ',
    '',
    `คุณ: ${state.customerName.trim() || '-'}`,
    '',
    `เบอร์โทร: ${state.customerPhone.trim() || '-'}`,
    '',
    `รุ่น: ${calc.trim.modelName} ${calc.trim.trimName}`,
    '',
    `สี: ${(state.vehicleColor || '').trim() || '-'}`,
    '',
    `ราคา: ${formatTHB(calc.netCarPrice)} บาท`,
    '',
    `ดาวน์ ${downPctText}%: ${formatTHB(calc.downPaymentGross)} บาท`,
    '',
    `ยอดจัด: ${formatTHB(calc.financeAmount)} บาท`,
    '',
    `ดอกเบี้ย: ${calc.effectiveInterestRate.toFixed(2)}% ต่อปี`,
  ];

  if (
    !calc.isCashPurchase &&
    state.payFirstInstallmentOnDelivery &&
    calc.firstInstallmentDueOnDelivery > 0
  ) {
    lines.push('');
    lines.push(
      `ชำระงวดแรก จำนวน ${formatTHB(calc.firstInstallmentDueOnDelivery)} บาท`
    );
  }

  lines.push('');
  lines.push(
    `ผ่อน: ${calc.tenorMonths} งวด งวดละ ${formatTHB(calc.monthlyInstallment)} บาท`
  );
  lines.push('');
  lines.push(`หมายเหตุ: ${(state.financeNote || '').trim() || '-'}`);

  return lines.join('\n');
}
