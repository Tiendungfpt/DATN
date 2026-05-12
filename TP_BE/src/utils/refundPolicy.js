import dayjs from "dayjs";

export function computeRefundRateByDaysUntilCheckIn(now, checkInDate) {
  const today = dayjs(now).startOf("day");
  const ci = dayjs(checkInDate).startOf("day");
  const d = ci.diff(today, "day");
  if (d >= 7) return 1;
  if (d >= 3) return 0.7;
  if (d >= 1) return 0.3;
  return 0;
}

export function computeRefundBreakdown(now, checkInDate, originalAmountRaw) {
  const originalAmount = Math.max(0, Math.round(Number(originalAmountRaw) || 0));
  const rate = computeRefundRateByDaysUntilCheckIn(now, checkInDate);
  const refundAmount = Math.round(originalAmount * rate);
  const cancellationFee = Math.round(originalAmount - refundAmount);
  return { refundAmount, cancellationFee, originalAmount, rate };
}
