import {
  DealerSettings,
  DownPercentTier,
  QuoteSession,
  QuoteState,
  TenorMonths,
} from '../types/dealer';

export const JIN_MOTOR_LOGO_PATH =
  '/assets/aistudio/902979375_1773518383723265_6688874981857316286_n_2ad35ffc.jpg';

export const TENOR_OPTIONS: { months: TenorMonths; years: number; label: string }[] = [
  { months: 36, years: 3, label: '36 งวด (3 ปี)' },
  { months: 48, years: 4, label: '48 งวด (4 ปี)' },
  { months: 60, years: 5, label: '60 งวด (5 ปี)' },
  { months: 72, years: 6, label: '72 งวด (6 ปี)' },
  { months: 84, years: 7, label: '84 งวด (7 ปี)' },
];

export const DOWN_PERCENT_TIERS: DownPercentTier[] = [30, 25, 20, 15, 10, 5];

export const DEFAULT_SETTINGS: DealerSettings = {
  showroom: {
    showroomName: 'JIN MOTOR',
    branchName: 'โชว์รูมและศูนย์บริการมาตรฐาน DEEPAL & CHANGAN',
    address: 'ติดต่อสอบถามและทดลองขับได้ที่โชว์รูม JIN MOTOR',
    phone: '02-XXX-XXXX',
    lineId: '@jinmotor',
    salesName: 'ที่ปรึกษาการขาย JIN MOTOR',
    salesPhone: '08X-XXX-XXXX',
    logoUrl: JIN_MOTOR_LOGO_PATH,
    quoteValidityDays: 15,
  },
  earlyPaymentDiscount: 0.10,
  deliveryDefaults: {
    registrationFee: 0,
    redPlateDeposit: 3000,
    bookingDeposit: 4000,
  },
  defaultAnonymousMode: false,
  freebiePresets: [
    { id: 'film', label: 'ฟิล์มกรองแสงเซรามิกรอบคัน + บานหน้า', defaultChecked: true },
    { id: 'mat', label: 'พรมปูพื้นเข้ารูปเต็มคัน', defaultChecked: true },
    { id: 'plate', label: 'กรอบป้ายทะเบียนกันน้ำ', defaultChecked: true },
    { id: 'coating', label: 'เคลือบสี / ขัดเงาก่อนส่งมอบ', defaultChecked: true },
    { id: 'dashcam', label: 'กล้องบันทึกภาพหน้ารถ', defaultChecked: false },
    { id: 'cargo', label: 'ถาดรองสัมภาระท้ายรถ', defaultChecked: false },
  ],
  rateMatrices: {
    standard: {
      30: { 36: 1.98, 48: 1.98, 60: 2.55, 72: 3.09, 84: 3.79 },
      25: { 36: 1.98, 48: 1.98, 60: 2.79, 72: 3.19, 84: 3.89 },
      20: { 36: 2.79, 48: 2.79, 60: 2.99, 72: 3.39, 84: 3.99 },
      15: { 36: 3.29, 48: 3.29, 60: 3.59, 72: 3.79, 84: 4.49 },
      10: { 36: 3.89, 48: 3.89, 60: 4.19, 72: 4.49, 84: 4.79 },
      5: { 36: 4.29, 48: 4.29, 60: 4.59, 72: 4.89, 84: 5.19 },
    },
    lumin: {
      30: { 36: null, 48: 2.25, 60: 2.49, 72: 2.99, 84: 3.59 },
      25: { 36: null, 48: 2.29, 60: 2.69, 72: 3.09, 84: 3.69 },
      20: { 36: null, 48: 2.79, 60: 2.99, 72: 3.19, 84: 3.89 },
      15: { 36: null, 48: 3.19, 60: 3.49, 72: 3.89, 84: 4.39 },
      10: { 36: null, 48: 3.79, 60: 4.09, 72: 4.39, 84: 4.69 },
      5: { 36: null, 48: null, 60: null, 72: null, 84: null },
    },
  },
  trims: [
    // 1.1 DEEPAL S05 (EV)
    {
      id: 'deepal-s05-ev-max',
      modelId: 'deepal-s05-ev',
      brand: 'DEEPAL',
      modelName: 'DEEPAL S05 (EV)',
      trimName: 'Max',
      powertrain: 'BEV',
      normalPrice: 899000,
      specialPrice: 899000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'S05 BEV Max Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty:
          'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร (แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน)',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: [
          'ฟรีสายชาร์จฉุกเฉิน (Portable Charger)',
          'ฟรีบำรุงรักษาครั้งที่ 1',
        ],
      },
    },
    {
      id: 'deepal-s05-ev-max-lr',
      modelId: 'deepal-s05-ev',
      brand: 'DEEPAL',
      modelName: 'DEEPAL S05 (EV)',
      trimName: 'Max Long Range',
      powertrain: 'BEV',
      normalPrice: 999000,
      specialPrice: 999000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'S05 BEV Max Long Range Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty:
          'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร (แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน)',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: [
          'ฟรีสายชาร์จฉุกเฉิน (Portable Charger)',
          'ฟรีบำรุงรักษาครั้งที่ 1 สำหรับ BEV มูลค่า 300 บาท',
        ],
      },
    },

    // 1.2 DEEPAL S05 REEV
    {
      id: 'deepal-s05-reev-max',
      modelId: 'deepal-s05-reev',
      brand: 'DEEPAL',
      modelName: 'DEEPAL S05 REEV',
      trimName: 'REEV Max',
      powertrain: 'REEV',
      normalPrice: 999000,
      specialPrice: 999000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'S05 REEV Max Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty:
          'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร (แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน)',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: [
          'ฟรีสายชาร์จฉุกเฉิน (Portable Charger)',
          'ฟรีบำรุงรักษาครั้งที่ 1',
        ],
      },
    },

    // 1.3 DEEPAL NEW S07
    {
      id: 'deepal-new-s07-bev',
      modelId: 'deepal-new-s07',
      brand: 'DEEPAL',
      modelName: 'DEEPAL NEW S07',
      trimName: 'BEV',
      powertrain: 'BEV',
      normalPrice: 1219000,
      specialPrice: 1219000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'Premium Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty:
          'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร (แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน)',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: [
          'ฟรีสายชาร์จฉุกเฉิน (Portable Charger)',
          'ฟรีบำรุงรักษาครั้งที่ 1',
        ],
      },
    },

    // 1.4 DEEPAL E07
    {
      id: 'deepal-e07-plus',
      modelId: 'deepal-e07',
      brand: 'DEEPAL',
      modelName: 'DEEPAL E07',
      trimName: 'Plus',
      powertrain: 'BEV',
      normalPrice: 1699000,
      specialPrice: 1699000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'Premium Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty: 'รับประกันแบตเตอรี่ตามเงื่อนไขผู้ผลิต',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: [
          'ฟรีสายชาร์จฉุกเฉิน (Portable Charger)',
          'ฟรีอินเทอร์เน็ตสำหรับระบบรถยนต์ 10 ปี (จำกัด 1 GB/เดือน สำหรับระบบรถยนต์ และ 1 GB/เดือน สำหรับสื่อบันเทิง)',
          'ส่วนลดสูงสุด 100,000 บาท พร้อม Lifestyle Package มูลค่า 60,000 บาท',
        ],
      },
    },
    {
      id: 'deepal-e07-perf-awd',
      modelId: 'deepal-e07',
      brand: 'DEEPAL',
      modelName: 'DEEPAL E07',
      trimName: 'Performance AWD',
      powertrain: 'BEV',
      normalPrice: 2099000,
      specialPrice: 2099000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'Premium Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty: 'รับประกันแบตเตอรี่ตามเงื่อนไขผู้ผลิต',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: [
          'ฟรีสายชาร์จฉุกเฉิน (Portable Charger)',
          'ฟรีอินเทอร์เน็ตสำหรับระบบรถยนต์ 10 ปี (จำกัด 1 GB/เดือน สำหรับระบบรถยนต์ และ 1 GB/เดือน สำหรับสื่อบันเทิง)',
          'ส่วนลดสูงสุด 100,000 บาท พร้อม Lifestyle Package มูลค่า 60,000 บาท',
        ],
      },
    },

    // 1.6 DEEPAL HUNTER K50
    {
      id: 'deepal-hunter-k50-plus',
      modelId: 'deepal-hunter-k50',
      brand: 'DEEPAL',
      modelName: 'DEEPAL HUNTER K50',
      trimName: 'REEV Plus AWD',
      powertrain: 'REEV',
      normalPrice: 1099000,
      specialPrice: 1099000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'Hunter K50 Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง (ตามเงื่อนไขแคมเปญ)',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty: 'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: ['ฟรีสายชาร์จฉุกเฉิน (Portable Charger)'],
      },
    },
    {
      id: 'deepal-hunter-k50-max',
      modelId: 'deepal-hunter-k50',
      brand: 'DEEPAL',
      modelName: 'DEEPAL HUNTER K50',
      trimName: 'REEV Max AWD',
      powertrain: 'REEV',
      normalPrice: 1249000,
      specialPrice: 1249000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'Hunter K50 Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ฟรี Home Charger พร้อมติดตั้ง (ตามเงื่อนไขแคมเปญ)',
        vehicleWarranty: 'รับประกันตัวรถ 5 ปี หรือ 120,000 กิโลเมตร',
        batteryWarranty: 'รับประกันแบตเตอรี่ 8 ปี หรือ 160,000 กิโลเมตร',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง นาน 8 ปี',
        extraItems: ['ฟรีสายชาร์จฉุกเฉิน (Portable Charger)'],
      },
    },

    // 2.1 CHANGAN NEVO Q05
    {
      id: 'changan-nevo-q05-max',
      modelId: 'changan-nevo-q05',
      brand: 'CHANGAN',
      modelName: 'CHANGAN NEVO Q05',
      trimName: 'Max',
      powertrain: 'BEV',
      normalPrice: 629900,
      specialPrice: 629900,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'NEVO Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยรถยนต์ชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ไม่รวม Home Charger (สอบถามแคมเปญเพิ่มเติมหน้าโชว์รูม)',
        vehicleWarranty:
          'รับประกันตัวรถ 5 ปี หรือ 150,000 กิโลเมตร แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน',
        batteryWarranty: 'รับประกันแบตเตอรี่ตามเงื่อนไข NEVO Care',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉินบนท้องถนนฟรี 24 ชั่วโมง นาน 8 ปี',
        extraItems: ['ฟรีสายชาร์จฉุกเฉิน'],
      },
    },
    {
      id: 'changan-nevo-q05-ultra',
      modelId: 'changan-nevo-q05',
      brand: 'CHANGAN',
      modelName: 'CHANGAN NEVO Q05',
      trimName: 'Ultra',
      powertrain: 'BEV',
      normalPrice: 709900,
      specialPrice: 709900,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'standard',
      packageTitle: 'NEVO Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยรถยนต์ชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ.',
        homeCharger: 'ไม่รวม Home Charger (สอบถามแคมเปญเพิ่มเติมหน้าโชว์รูม)',
        vehicleWarranty:
          'รับประกันตัวรถ 5 ปี หรือ 150,000 กิโลเมตร แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน',
        batteryWarranty: 'รับประกันแบตเตอรี่ตามเงื่อนไข NEVO Care',
        lifetimeBatteryWarranty: 'รับประกันแบตเตอรี่ตลอดอายุการใช้งาน (Lifetime Battery Warranty)',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉินบนท้องถนนฟรี 24 ชั่วโมง นาน 8 ปี',
        extraItems: ['ฟรีสายชาร์จฉุกเฉิน'],
      },
    },

    // 2.2 CHANGAN LUMIN
    {
      id: 'changan-lumin-ldc',
      modelId: 'changan-lumin',
      brand: 'CHANGAN',
      modelName: 'CHANGAN LUMIN',
      trimName: 'L DC',
      powertrain: 'BEV',
      normalPrice: 499000,
      specialPrice: 499000,
      defaultVehicleDiscount: 0,
      defaultDownSubsidy: 0,
      rateTable: 'lumin',
      packageTitle: 'LUMIN Care',
      active: true,
      benefits: {
        insuranceAndAct: 'ประกันภัยชั้น 1 ฟรี 1 ปี พร้อม พ.ร.บ. (ตามแคมเปญ)',
        homeCharger: 'รองรับการชาร์จไฟบ้าน AC และ DC Fast Charge',
        vehicleWarranty: 'รับประกันตัวรถตามเงื่อนไข CHANGAN Thailand',
        batteryWarranty: 'รับประกันแบตเตอรี่ 8 ปี หรือ 120,000 กิโลเมตร',
        lifetimeBatteryWarranty: 'สอบถามเงื่อนไขการรับประกันแบตเตอรี่เพิ่มเติม',
        roadsideAssistance: 'บริการช่วยเหลือฉุกเฉิน 24 ชั่วโมง',
        extraItems: ['ฟรีสายชาร์จฉุกเฉิน (Portable Charger)'],
      },
    },
  ],
};

export function createInitialQuoteState(settings: DealerSettings): QuoteState {
  const firstTrim = settings.trims.find((t) => t.active) || settings.trims[0];
  return {
    selectedTrimId: firstTrim.id,
    purchaseType: 'finance',
    vehicleDiscount: firstTrim.defaultVehicleDiscount,
    downPaymentSubsidy: firstTrim.defaultDownSubsidy,
    vatMode: 'included_with_subsidy_vat',
    includeVat: true,
    downMode: 'percent',
    downPercentInput: 25,
    downAmountInput: Math.round(firstTrim.specialPrice * 0.25),
    tenorMonths: firstTrim.rateTable === 'lumin' ? 48 : 60,
    payFirstInstallmentOnDelivery: false,
    customInterestRate: null,
    registrationFee: settings.deliveryDefaults.registrationFee,
    redPlateDeposit: settings.deliveryDefaults.redPlateDeposit,
    bookingDeposit: settings.deliveryDefaults.bookingDeposit,
    customDeliveryItems: [
      { id: 'custom-1', category: 'accessory', label: '', amount: '' },
      { id: 'custom-2', category: 'other', label: '', amount: '' },
    ],
    selectedFreebieIds: settings.freebiePresets
      .filter((f) => f.defaultChecked)
      .map((f) => f.id),
    customFreebieNote: '',
    promotionNote: '',
    benefitsOverride: null,
    customerName: '',
    customerPhone: '',
    bookingDetails: '',
    quoteNote: '',
    anonymousMode: Boolean(settings.defaultAnonymousMode),
  };
}

export function createQuoteSession(
  settings: DealerSettings,
  sequenceNumber = 1
): QuoteSession {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(now.getDate()).padStart(2, '0')}`;
  const seqPart = String(sequenceNumber).padStart(2, '0');
  return {
    id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    quoteNumber: `QT-${datePart}-${seqPart}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    currentStep: 1,
    hasVisitedPreview: false,
    state: createInitialQuoteState(settings),
  };
}
