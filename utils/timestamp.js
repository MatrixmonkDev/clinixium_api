// Helper function to get current timestamp in the configured timezone
export function getCurrentTimestamp() {
  const now = new Date();
  // Get timezone offset from environment (default +05:30 for IST)
  const tzOffset = process.env.DB_TIMEZONE || '+05:30';
  
  // Parse timezone offset (e.g., +05:30)
  const sign = tzOffset[0];
  const hours = parseInt(tzOffset.substring(1, 3));
  const minutes = parseInt(tzOffset.substring(4, 6));
  const offsetMs = (sign === '+' ? 1 : -1) * (hours * 60 + minutes) * 60000;
  
  // Adjust time by timezone offset
  return new Date(now.getTime() + offsetMs);
}

// Helper function to format date for MySQL as string
export function formatMySQLDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper function to get current timestamp as MySQL-formatted string
export function getCurrentTimestampString() {
  return formatMySQLDate(getCurrentTimestamp());
}
