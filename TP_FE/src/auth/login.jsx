import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Đăng nhập thành công!");
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        alert(data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      alert("Lỗi server");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đăng nhập</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          style={styles.input}
        /><br /><br />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          style={styles.input}
        /><br /><br />

        <button style={styles.button}>Đăng nhập</button>
      </form>

      <p>
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </div>
  );
}

// 🎨 CSS viết trong JS
const styles = {
  container: {
    textAlign: "center",
    background: "linear-gradient(135deg, rgb(27, 70, 213), #9face6)",
    height: "100vh",
    paddingTop: "50px"
  },
  title: {
    color: "#333"
  },
  form: {
    background: "#fff",
    width: "300px",
    margin: "auto",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)"
  },
  input: {
    width: "90%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc"
  },
  button: {
    width: "95%",
    padding: "10px",
    background: "#6c63ff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  }
};