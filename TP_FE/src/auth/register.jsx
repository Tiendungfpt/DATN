import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <div style={styles.container}>
      <div style={styles.background} />

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Tạo tài khoản mới</h1>
          <p style={styles.subtitle}>
            Tham gia ngay để khám phá thiên đường biển
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Họ và tên</label>
            <input
              type="text"
              name="name"
              placeholder="Nguyễn Văn A"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mật khẩu</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Số điện thoại</label>
            <input
              type="tel"
              name="phone"
              placeholder="0123456789"
              value={form.phone}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký ngay"}
          </button>
        </form>

        <p style={styles.register}>
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
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  background: {
    position: "absolute",
    inset: 0,
    backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.75) contrast(1.1)",
    zIndex: -1,
  },

  card: {
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    padding: "35px 32px", 
    borderRadius: "18px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
    width: "100%",
    maxWidth: "380px", 
    border: "1px solid rgba(255, 255, 255, 0.3)",
    textAlign: "center",
    color: "white",
  },

  header: {
    marginBottom: "28px",
  },

  title: {
    fontSize: "29px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    textShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },

  subtitle: {
    fontSize: "15px",
    opacity: 0.9,
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
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: "600",
    opacity: 0.95,
  },

  input: {
    width: "100%",
    padding: "13px 15px", 
    background: "rgba(255, 255, 255, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "10px",
    fontSize: "16px",
    color: "white",
    outline: "none",
    transition: "all 0.3s",
  },

  button: {
    marginTop: "8px",
    padding: "14px",
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16.5px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 8px 20px rgba(245, 158, 11, 0.4)",
  },

  register: {
    marginTop: "25px",
    fontSize: "14.5px",
    opacity: 0.9,
  },

  link: {
    color: "#fde047",
    fontWeight: "700",
    textDecoration: "none",
  },
};
