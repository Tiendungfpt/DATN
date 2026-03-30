import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            // SỬA ĐIỂM NÀY - Backend không có data.success
            if (res.ok && data.user && data.token) {
                // Lưu user và token
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);

                console.log("Đăng nhập thành công:", data.user);

                alert("Đăng nhập thành công!");
                navigate("/"); 
            } else {
                const errorMsg = data.message || "Email hoặc mật khẩu không đúng";
                setError(errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error("Login error:", error);
            setError("Lỗi kết nối với server. Vui lòng thử lại sau.");
            alert("Lỗi kết nối với server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.background} />

            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Chào mừng trở lại</h1>
                    <p style={styles.subtitle}>Đăng nhập để khám phá thiên đường biển</p>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                <form onSubmit={handleSubmit} style={styles.form}>
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

                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? "Đang đăng nhập..." : "Đăng nhập ngay"}
                    </button>
                </form>

                <p style={styles.register}>
                    Chưa có tài khoản?{" "}
                    <Link to="/register" style={styles.link}>
                        Đăng ký miễn phí
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
        padding: "45px 40px",
        borderRadius: "20px",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.25)",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        textAlign: "center",
        color: "white",
    },

    header: {
        marginBottom: "35px",
    },

    title: {
        fontSize: "32px",
        fontWeight: "700",
        margin: "0 0 8px 0",
        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
    },

    subtitle: {
        fontSize: "15.5px",
        opacity: 0.9,
        margin: 0,
    },

    error: {
        color: "#ff6b6b",
        background: "rgba(255, 107, 107, 0.2)",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "20px",
        textAlign: "center",
    },

    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },

    inputGroup: {
        textAlign: "left",
    },

    label: {
        display: "block",
        marginBottom: "7px",
        fontSize: "14px",
        fontWeight: "600",
        opacity: 0.95,
    },

    input: {
        width: "100%",
        padding: "14px 16px",
        background: "rgba(255, 255, 255, 0.25)",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        borderRadius: "10px",
        fontSize: "16px",
        color: "white",
        outline: "none",
    },

    button: {
        marginTop: "10px",
        padding: "15px",
        background: "linear-gradient(135deg, #f59e0b, #ea580c)",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "17px",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(245, 158, 11, 0.4)",
    },

    register: {
        marginTop: "30px",
        fontSize: "14.5px",
        opacity: 0.9,
    },

    link: {
        color: "#fde047",
        fontWeight: "700",
        textDecoration: "none",
    },
};