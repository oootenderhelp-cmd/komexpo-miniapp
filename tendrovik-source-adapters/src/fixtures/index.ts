export interface EisRawTender {
  format: "eis";
  registryNumber: string;
  purchaseObjectInfo: string;
  customerInfo: { fullName: string; inn: string };
  region: string;
  federalLaw: "44-ФЗ" | "223-ФЗ";
  maxPrice: { amount: number; currency: string };
  publishDate: string;
  endDate: string;
  state: string;
  attachments: { fileName: string; url: string; size: number }[];
  lots: { lotNumber: number; subject: string; price: number }[];
}

export interface B2bCenterRawTender {
  format: "b2b_center";
  id: string;
  name: string;
  organizer: { company: string; inn?: string };
  area?: string;
  budget?: { value: number; currency: string };
  published?: string;
  deadline?: string;
  status: string;
  docs: { name: string; link: string }[];
}

export interface SberbankAstRawTender {
  format: "sberbank_ast";
  tradeId: string;
  tradeName: string;
  customer: { name: string; inn: string; region: string };
  nmck: number;
  currency: string;
  publicationDate: string;
  submissionDeadline: string;
  procedureStatus: string;
  documentation: { title: string; downloadUrl: string; contentType: string; bytes: number }[];
}

export type RawTenderPayload = EisRawTender | B2bCenterRawTender | SberbankAstRawTender;

export const FIXTURE_EIS: EisRawTender = {
  format: "eis",
  registryNumber: "0373100011924000042",
  purchaseObjectInfo: "Капитальный ремонт кровли здания школы №15",
  customerInfo: { fullName: "ГБОУ Школа №15", inn: "7707083893" },
  region: "Москва",
  federalLaw: "44-ФЗ",
  maxPrice: { amount: 12_500_000, currency: "RUB" },
  publishDate: "2026-06-01T10:00:00Z",
  endDate: "2026-07-15T09:00:00Z",
  state: "Подача заявок",
  attachments: [
    { fileName: "ТЗ_кровля.pdf", url: "https://zakupki.gov.ru/docs/tz_krovla.pdf", size: 2_400_000 },
    { fileName: "Смета.xlsx", url: "https://zakupki.gov.ru/docs/smeta.xlsx", size: 150_000 },
  ],
  lots: [
    { lotNumber: 1, subject: "Демонтаж старого покрытия", price: 3_000_000 },
    { lotNumber: 2, subject: "Монтаж нового покрытия", price: 9_500_000 },
  ],
};

export const FIXTURE_B2B_CENTER: B2bCenterRawTender = {
  format: "b2b_center",
  id: "B2B-2026-88431",
  name: "Поставка серверного оборудования для ЦОД",
  organizer: { company: "ООО «ЦОД-Инвест»", inn: "5027265570" },
  area: "Московская область",
  budget: { value: 8_750_000, currency: "RUB" },
  published: "2026-05-20T08:00:00Z",
  deadline: "2026-06-25T18:00:00Z",
  status: "active",
  docs: [
    { name: "Техническое задание", link: "https://www.b2b-center.ru/docs/tz_server.pdf" },
    { name: "Спецификация", link: "https://www.b2b-center.ru/docs/spec.xlsx" },
  ],
};

export const FIXTURE_SBERBANK_AST: SberbankAstRawTender = {
  format: "sberbank_ast",
  tradeId: "SBAST-44-2026-991204",
  tradeName: "Реконструкция системы вентиляции больницы",
  customer: { name: "ГБУЗ «Городская больница №3»", inn: "6316050580", region: "Самара" },
  nmck: 5_200_000,
  currency: "RUB",
  publicationDate: "2026-06-10T06:00:00Z",
  submissionDeadline: "2026-07-01T12:00:00Z",
  procedureStatus: "Приём заявок",
  documentation: [
    { title: "Проектная документация", downloadUrl: "https://www.sberbank-ast.ru/docs/project.pdf", contentType: "application/pdf", bytes: 5_100_000 },
    { title: "Локальная смета", downloadUrl: "https://www.sberbank-ast.ru/docs/local_smeta.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: 320_000 },
  ],
};
