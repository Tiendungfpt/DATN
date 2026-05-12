import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./register.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        email: String(form.email || "")
          .trim()
          .toLowerCase(),
        name: String(form.name || "").trim(),
      };
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Đăng ký thành công!");
        navigate("/login");
      } else {
        alert(data.message || data || "Đăng ký thất bại!");
      }
    } catch (error) {
      alert("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page" style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Tạo tài khoản mới</h1>
          <p style={styles.subtitle}>
            Tham gia ngay để khám phá thiên đường biển
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="reg-name">
              Họ và tên
            </label>
            <input
              id="reg-name"
              type="text"
              name="name"
              placeholder="Nguyễn Văn A"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
              autoComplete="name"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              autoComplete="email"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="reg-password">
              Mật khẩu
            </label>
            <input
              id="reg-password"
              type="password"
              name="password"
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="reg-phone">
              Số điện thoại
            </label>
            <input
              id="reg-phone"
              type="tel"
              name="phone"
              placeholder="0123456789"
              value={form.phone}
              onChange={handleChange}
              style={styles.input}
              autoComplete="tel"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? "Đang đăng ký..." : "Đăng ký ngay"}
          </button>
        </form>

        <p style={styles.footer}>
          Đã có tài khoản?{" "}
          <Link to="/login" style={styles.link}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 180px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background:
      "radial-gradient(circle at 10% 10%, rgba(37,99,235,0.10), transparent 35%), radial-gradient(circle at 90% 0%, rgba(124,58,237,0.10), transparent 32%), #f8fafc",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  card: {
    background: "#ffffff",
    padding: "30px 26px",
    borderRadius: "16px",
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
    width: "100%",
    maxWidth: "460px",
    border: "1px solid rgba(15,23,42,0.10)",
    textAlign: "center",
    color: "#0f172a",
  },

  header: {
    marginBottom: "28px",
  },

  title: {
    fontSize: "30px",
    fontWeight: "900",
    margin: "0 0 8px 0",
    color: "#0f172a",
  },

  subtitle: {
    fontSize: "15px",
    color: "rgba(15,23,42,0.68)",
    margin: 0,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  inputGroup: {
    textAlign: "left",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.18)",
    borderRadius: "11px",
    fontSize: "15px",
    color: "#0f172a",
    outline: "none",
  },

  button: {
    marginTop: "8px",
    padding: "15px",
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    color: "#ffffff",
    border: "none",
    borderRadius: "11px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(234,88,12,0.28)",
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  footer: {
    marginTop: "22px",
    fontSize: "14px",
    color: "rgba(15,23,42,0.72)",
  },

  link: {
    color: "#1d4ed8",
    fontWeight: "700",
    textDecoration: "none",
  },
};
