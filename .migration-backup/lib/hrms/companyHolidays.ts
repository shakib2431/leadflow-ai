export type HolidayRow = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  category: 'national' | 'festival' | 'religious';
  optional?: boolean;
};

export const INDIAN_STANDARD_HOLIDAYS_2026: HolidayRow[] = [
  { id: 'republic-day',       name: 'Republic Day',             date: '2026-01-26', category: 'national' },
  { id: 'maha-shivaratri',    name: 'Maha Shivaratri',          date: '2026-02-15', category: 'religious', optional: true },
  { id: 'holi',               name: 'Holi',                     date: '2026-03-04', category: 'festival',  optional: true },
  { id: 'eid-al-fitr',        name: 'Eid al-Fitr',              date: '2026-03-20', category: 'religious', optional: true },
  { id: 'mahavir-jayanti',    name: 'Mahavir Jayanti',          date: '2026-04-02', category: 'religious', optional: true },
  { id: 'good-friday',        name: 'Good Friday',              date: '2026-04-03', category: 'religious', optional: true },
  { id: 'ambedkar-jayanti',   name: 'Ambedkar Jayanti',         date: '2026-04-14', category: 'national' },
  { id: 'buddha-purnima',     name: 'Buddha Purnima',           date: '2026-05-01', category: 'religious', optional: true },
  { id: 'bakrid',             name: 'Bakrid (Eid al-Adha)',     date: '2026-05-27', category: 'religious', optional: true },
  { id: 'muharram',           name: 'Muharram',                 date: '2026-06-26', category: 'religious', optional: true },
  { id: 'independence-day',   name: 'Independence Day',         date: '2026-08-15', category: 'national' },
  { id: 'janmashtami',        name: 'Janmashtami',              date: '2026-09-03', category: 'festival',  optional: true },
  { id: 'milad-un-nabi',      name: 'Milad-un-Nabi',           date: '2026-09-25', category: 'religious', optional: true },
  { id: 'gandhi-jayanti',     name: 'Gandhi Jayanti',           date: '2026-10-02', category: 'national' },
  { id: 'dussehra',           name: 'Dussehra (Vijayadashami)', date: '2026-10-20', category: 'festival',  optional: true },
  { id: 'diwali',             name: 'Diwali',                   date: '2026-11-08', category: 'festival',  optional: true },
  { id: 'guru-nanak-jayanti', name: 'Guru Nanak Jayanti',       date: '2026-11-24', category: 'religious', optional: true },
  { id: 'christmas',          name: 'Christmas Day',            date: '2026-12-25', category: 'religious' },
];

/** Returns holidays on or after the given YYYY-MM-DD date, sorted ascending. */
export function getUpcomingHolidays(fromDate: string): HolidayRow[] {
  return INDIAN_STANDARD_HOLIDAYS_2026
    .filter((h) => h.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}
