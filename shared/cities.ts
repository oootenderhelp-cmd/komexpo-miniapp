/**
 * Города-миллионники России — база покрытия для агрегатора.
 *
 * Численность приблизительная, округлена до сотен тысяч: она нужна для
 * приоритета захода в город и грубой оценки спроса, а не для отчётности.
 * Перед планированием бюджета сверяйте с актуальными данными Росстата.
 */

export type MillionCity = {
  name: string;
  region: string;
  /** Приблизительная численность населения, млн человек. */
  population: number;
  /** Часовой пояс относительно Москвы — влияет на время обзвона. */
  mskOffset: number;
};

export const MILLION_CITIES: readonly MillionCity[] = [
  { name: "Москва", region: "Москва", population: 13.1, mskOffset: 0 },
  {
    name: "Санкт-Петербург",
    region: "Санкт-Петербург",
    population: 5.6,
    mskOffset: 0,
  },
  {
    name: "Новосибирск",
    region: "Новосибирская область",
    population: 1.6,
    mskOffset: 4,
  },
  {
    name: "Екатеринбург",
    region: "Свердловская область",
    population: 1.5,
    mskOffset: 2,
  },
  {
    name: "Казань",
    region: "Республика Татарстан",
    population: 1.3,
    mskOffset: 0,
  },
  {
    name: "Нижний Новгород",
    region: "Нижегородская область",
    population: 1.2,
    mskOffset: 0,
  },
  {
    name: "Красноярск",
    region: "Красноярский край",
    population: 1.2,
    mskOffset: 4,
  },
  {
    name: "Челябинск",
    region: "Челябинская область",
    population: 1.2,
    mskOffset: 2,
  },
  {
    name: "Самара",
    region: "Самарская область",
    population: 1.2,
    mskOffset: 1,
  },
  {
    name: "Уфа",
    region: "Республика Башкортостан",
    population: 1.1,
    mskOffset: 2,
  },
  {
    name: "Ростов-на-Дону",
    region: "Ростовская область",
    population: 1.1,
    mskOffset: 0,
  },
  {
    name: "Краснодар",
    region: "Краснодарский край",
    population: 1.1,
    mskOffset: 0,
  },
  { name: "Омск", region: "Омская область", population: 1.1, mskOffset: 3 },
  {
    name: "Воронеж",
    region: "Воронежская область",
    population: 1.0,
    mskOffset: 0,
  },
  { name: "Пермь", region: "Пермский край", population: 1.0, mskOffset: 2 },
  {
    name: "Волгоград",
    region: "Волгоградская область",
    population: 1.0,
    mskOffset: 1,
  },
] as const;

export const MILLION_CITY_NAMES = MILLION_CITIES.map(c => c.name);

const BY_NAME = new Map(MILLION_CITIES.map(c => [c.name.toLowerCase(), c]));

export const findCity = (name: string): MillionCity | undefined =>
  BY_NAME.get(name.trim().toLowerCase());

/** Регион подставляется автоматически, чтобы его не вбивали руками. */
export const regionOf = (city: string): string | undefined =>
  findCity(city)?.region;

/**
 * Грубая оценка ёмкости города по стоматологии в заявках в месяц.
 *
 * Считается от населения: доля людей, обращающихся к стоматологу в течение
 * месяца, умноженная на долю рынка, которую реально забрать платной рекламой.
 * Это ориентир для приоритета городов, а не прогноз — фактические цифры дают
 * только первые недели открутки.
 */
export function estimateMonthlyCapacity(
  city: MillionCity,
  opts: { monthlyDemandRate?: number; reachableShare?: number } = {}
): number {
  const demandRate = opts.monthlyDemandRate ?? 0.02; // ~2% населения в месяц
  const reachable = opts.reachableShare ?? 0.01; // ~1% этого спроса через рекламу
  return Math.round(city.population * 1_000_000 * demandRate * reachable);
}
