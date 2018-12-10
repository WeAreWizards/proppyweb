const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Pull momentjs if we need more complex things
export function formatDDMMMYYYY(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatYYYYMMDD(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toISOString().substr(0, 10);
}

export function formatIsoDatetime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toISOString().substr(0, 16).replace("T", " ");
}

export function correctNow() {
  // TODO - use a ntp like protocol to make sure the browser has
  // something resembling a correct clock.
  //
  // We can interleave that into the protocol so that every request
  // adjusts the clock with new data from the server.
  return Date.now();
}

export function getNumberOfDaysUntil(timestamp: number): number {
  const now = Math.floor(Date.now() / 1000);

  return Math.round((timestamp - now) /  (60 * 60 * 24));
}
