import * as accounting from "accounting";

// Add more as requested by customers.
// See https://en.wikipedia.org/wiki/Decimal_mark
// (it's complicated, I just picked what seemed to be common)
//
// This seems to be more accurate: http://www.thefinancials.com/?SubSectionID=curformat
// NOTE: Do not remove any currency, it would break current proposals with that one
// NOTE2: don't forget to update the currency schema in the backend with all symbols/code
// when you add currencies
// There is a npm package (https://github.com/smirzaei/currency-formatter) that does that for us but
// I'm not sure it's really worth depending on it, since it has every possible currencies and we don't
// care about all of them
export const CURRENCY_OPTIONS = [
  { symbol: "£", code: "GBP", label: "Pound sterling (£)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "€", code: "EUR", label: "Euro (€)", precision: 2, decimal: ",", thousand: ".", format: "%s%v" },
  { symbol: "$", code: "USD", label: "US Dollar ($)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "Kn", code: "HRK", label: "Croatian kuna (kn)", precision: 2, decimal: ",", thousand: ".", format: "%v %s" },
  { symbol: "Kč", code: "CZK", label: "Czech koruna (Kč)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "CHF", code: "CHF", label: "Swiss Franc (CHF)", precision: 2, decimal: ".", thousand: "'", format: "%v %s" },
  { symbol: "kr.", code: "DKK", label: "Danish krone (kr.)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "kr", code: "NOK", label: "Norwegian krone (kr)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "kr", code: "SEK", label: "Swedish krona (kr)", precision: 2, decimal: ",", thousand: " ", format: "%s %v" },

  { symbol: "лв", code: "BGN", label: "Bulgarian Lev (лв)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "zł", code: "PLN", label: "Polish złoty (zł)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "lei", code: "RON", label: "Romanian leu (lei)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "₽", code: "RUB", label: "Russian ruble (₽)", precision: 2, decimal: ",", thousand: ".", format: "%v %s" },
  { symbol: "₴", code: "UAH", label: "Ukrainian hryvnia (₴)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "Rp", code: "IDR", label: "Indonesian Rupiah (Rp)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "฿", code: "THB", label: "Thailand Baht (฿)", precision: 2, decimal: ".", thousand: ",", format: "%s %v" },
  { symbol: "₺", code: "TRY", label: "Turkish Lira (₺)", precision: 2, decimal: ".", thousand: ",", format: "%s %v" },
  { symbol: "₪", code: "ILS", label: "Israeli new shekel (₪)", precision: 2, decimal: ".", thousand: ",", format: "%s %v" },

  { symbol: "¥", code: "JPY", label: "Japanese yen (¥)", precision: 0, thousand: ",", format: "%s%v" },
  { symbol: "RM", code: "MYR", label: "Malaysian ringgit (RM)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "₩", code: "KRW", label: "South Korea won (₩)", precision: 0, thousand: ",", format: "%s%v" },
  { symbol: "R", code: "ZAR", label: "South Africa Rand (R)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "¥", code: "CNY", label: "Chinese yuan (¥)", precision: 2, decimal: ".", thousand: ",", format: "%s %v" },
  { symbol: "$", code: "MXN", label: "Mexican peso ($)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "$", code: "ARS", label: "Argentinan peso ($)", precision: 2, decimal: ",", thousand: ".", format: "%s%v" },
  { symbol: "$", code: "CLP", label: "Chilean peso ($)", precision: 0, thousand: ".", format: "%s%v" },
  { symbol: "S/", code: "PEN", label: "Peru nuevo sol (S/)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "$", code: "SGD", label: "Singapore dollar ($)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "$", code: "HKD", label: "Hong Kong dollar ($)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "$", code: "AUD", label: "Australian dollar ($)", precision: 2, decimal: ".", thousand: " ", format: "%s%v" },
  { symbol: "$", code: "CAD", label: "Canadian dollar ($)", precision: 2, decimal: ".", thousand: " ", format: "%s%v" },
  { symbol: "$", code: "NZD", label: "New Zealand dollar ($)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "JA$", code: "JMD", label: "Jamaican Dollar (JA$)", precision: 2, decimal: ".", thousand: ",", format: "%s%v" },
  { symbol: "R$", code: "BRL", label: "Brazilian real (R$)", precision: 2, decimal: ",", thousand: ".", format: "%s %v" },
  { symbol: "₹", code: "INR", label: "Indian rupee (₹)", precision: 2, decimal: ".", thousand: ",", format: "%s %v" },
  { symbol: "AED ", code: "AED", label: "United Arab Emirates dirham (AED)", precision: 2, decimal: ".", thousand: ",", format: "%s %v" },
];

// Fast lookup of options by symbol.
const FORMAT_OPTIONS_BY_SYMBOL = {};
CURRENCY_OPTIONS.forEach(x => FORMAT_OPTIONS_BY_SYMBOL[x.symbol.toLowerCase()] = x);
// Fast lookup of options by code.
const FORMAT_OPTIONS_BY_CODE = {};
CURRENCY_OPTIONS.forEach(x => FORMAT_OPTIONS_BY_CODE[x.code] = x);


export function formatCurrency(amount: number, currency: string): string {
  // Fallback to the symbol if we can't find by code (for the proposals before we
  // used code)
  // This can somehow fail as FORMAT_OPTIONS_BY_SYMBOL will have overwritten
  // previous currency with same symbol but not that many users currently and
  // better to do that early
  currency = currency === "ZZZ" ? "USD" : currency;
  const curr = FORMAT_OPTIONS_BY_CODE[currency.trim()] || FORMAT_OPTIONS_BY_SYMBOL[currency.trim()];
  return accounting.formatMoney(amount, curr);
}


export function getCurrencyCode(currency: string): string {
  if (!currency) {
    //  default to GBP if something went wrong
    return "GBP";
  }

  const curr = FORMAT_OPTIONS_BY_CODE[currency.trim()] || FORMAT_OPTIONS_BY_SYMBOL[currency.trim()];
  return curr.code;
}

// Stripe wants amounts in cents so we give it that
export function toCents(amount: number): number {
  const formatted = accounting.formatMoney(amount, {format: "%v"})
    .replace(".", "")
    .replace(" ", "")
    .replace(",", "");
  return parseInt(formatted, 10);
}
