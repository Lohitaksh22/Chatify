export function dateCalc(date: Date | string) {
  const calc = typeof date === "string" ? new Date(date) : date
  const millisecondsDiff = Date.now() - calc?.getTime();

  const minutes = Math.floor(millisecondsDiff / 60000);
  const hours = Math.floor(millisecondsDiff / 3600000);
  const days = Math.floor(millisecondsDiff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days) return `${days}d ago`;
  if (days === 7) return "a week ago";
  if(!days) return
  return `read`;
}