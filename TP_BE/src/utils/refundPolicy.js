import dayjs from "dayjs";

/**
 * Tính hệ số hoàn tiền (0–1) theo số đêm/ngày còn đến check-in (cùng múi giờ cục bộ).
 * Việt hóa nghiệp vụ YC:
 * - Trước check-in đủ 7 ngày trở lên → hoàn 100%
 * - Trước 3–6 ngày → hoàn 70%
 * - Trước 1–2 ngày → hoàn 30%
 * - Cùng ngày check-in hoặc đã qua check-in → hoàn 0%
 *
 * @param {Date | string | number} now
 * @param {Date | string | number} checkInDate
 * @returns {number}
 */
export function computeRefundRateByDaysUntilCheckIn(now, checkInDate) {
  const today = dayjs(now).startOf("day");
  const ci = dayjs(checkInDate).startOf("day");
  const d = ci.diff(today, "day");
  if (d >= 7) return 1;
  if (d >= 3) return 0.7;
  if (d >= 1) return 0.3;
  return 0;
}

/**
 * Áp dụng rate lên giá trị gốc, làm tròn theo đồng (Math.round).
 *
 * @param {Date | string | number} now
 * @param {Date | string | number} checkInDate
 * @param {number} originalAmountRaw
 * @returns {{ refundAmount: number, cancellationFee: number, originalAmount: number, rate: number }}
 */
export function computeRefundBreakdown(now, checkInDate, originalAmountRaw) {
  const originalAmount = Math.max(0, Math.round(Number(originalAmountRaw) || 0));
  const rate = computeRefundRateByDaysUntilCheckIn(now, checkInDate);
  const refundAmount = Math.round(originalAmount * rate);
  const cancellationFee = Math.round(originalAmount - refundAmount);
  return { refundAmount, cancellationFee, originalAmount, rate };
}
