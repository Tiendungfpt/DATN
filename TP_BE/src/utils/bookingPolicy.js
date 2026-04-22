/**
 * HanoiHotel booking policy (from hanoihotel.com.vn terms & conditions).
 *
 * - Deposit required to secure/confirm a booking (cleared funds).
 * - Cancellation refund tiers based on time before arrival:
 *   >= 15 days: 100% deposit refund
 *   14 days to > 48h: 50% deposit refund
 *   <= 48h: 0% deposit refund, full booking amount due
 * - No-show: forfeit deposit, full booking amount due
 */
export function computeHoursUntilArrival(now, checkInDate) {
  const start = new Date(checkInDate);
  if (Number.isNaN(start.getTime())) return null;
  return (start.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function computeCancellationRefundRate(hoursUntilArrival) {
  if (hoursUntilArrival == null) return 0;
  const days = hoursUntilArrival / 24;
  if (days >= 15) return 1;
  if (hoursUntilArrival > 48) return 0.5;
  return 0;
}

export function computeRefundAmount({ depositPaidAmount, hoursUntilArrival }) {
  const paid = Math.max(0, Number(depositPaidAmount) || 0);
  const rate = computeCancellationRefundRate(hoursUntilArrival);
  return Math.round(paid * rate);
}

export function isDepositSufficient({ depositAmount, depositPaidAmount }) {
  const required = Math.max(0, Number(depositAmount) || 0);
  const paid = Math.max(0, Number(depositPaidAmount) || 0);
  if (required <= 0) return false;
  return paid + 1 >= required; // tolerate rounding
}

