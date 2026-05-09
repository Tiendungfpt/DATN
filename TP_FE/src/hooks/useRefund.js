import { useState, useCallback } from "react";
import axios from "axios";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Custom hook: requestRefund, getMyRefunds, getRefundDetail + { data, loading, error }.
 */
export function useRefund() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestRefund = useCallback(
    async (
      bookingId,
      reason,
      payout = {
        payoutMethod: "",
        payoutPhone: "",
        payoutBankName: "",
        payoutBankAccountName: "",
        payoutBankAccountNumber: "",
      },
    ) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        "/api/refunds/request",
        {
          bookingId,
          reason,
          payoutMethod: payout?.payoutMethod || "",
          payoutPhone: payout?.payoutPhone || "",
          payoutBankName: payout?.payoutBankName || "",
          payoutBankAccountName: payout?.payoutBankAccountName || "",
          payoutBankAccountNumber: payout?.payoutBankAccountNumber || "",
        },
        { headers: authHeaders() },
      );
      setData(res.data);
      return res.data;
    } catch (e) {
      const msg = e?.response?.data?.message || "Không tạo được yêu cầu hoàn tiền";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  },
    [],
  );

  const getMyRefunds = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/refunds/my", { headers: authHeaders() });
      setData(res.data);
      return res.data;
    } catch (e) {
      const msg = e?.response?.data?.message || "Không tải được lịch sử hoàn tiền";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRefundDetail = useCallback(async (refundId) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`/api/refunds/${refundId}`, { headers: authHeaders() });
      setData(res.data);
      return res.data;
    } catch (e) {
      const msg = e?.response?.data?.message || "Không tải được chi tiết hoàn tiền";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => setError(""), []);

  return {
    data,
    loading,
    error,
    requestRefund,
    getMyRefunds,
    getRefundDetail,
    resetError,
  };
}
