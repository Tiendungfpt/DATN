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

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Đăng ký thành công!");
        navigate("/login");
      } else {
        alert(data);
      }
    } catch (error) {
      alert("Lỗi server");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đăng ký</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          name="name"
          placeholder="Tên"
          onChange={handleChange}
          style={styles.input}
        /><br /><br />

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

        <input
          name="phone"
          placeholder="SĐT"
          onChange={handleChange}
          style={styles.input}
        /><br /><br />

        <button style={styles.button}>Đăng ký</button>
      </form>

      <p style={styles.text}>
        Đã có tài khoản?{" "}
        <Link to="/login" style={styles.link}>
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

// 🎨 CSS trong JS
const styles = {
  container: {
    textAlign: "center",
    background: "linear-gradient(135deg, rgb(27, 70, 213), #9face6)",
    height: "100vh",
    paddingTop: "50px",
  },
  title: {
    color: "#333",
  },
  form: {
    background: "#fff",
    width: "320px",
    margin: "auto",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.2)",
  },
  input: {
    width: "90%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    outline: "none",
  },
  button: {
    width: "95%",
    padding: "10px",
    background: "#6c63ff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  text: {
    marginTop: "10px",
  },
  link: {
    color: "#6c63ff",
    textDecoration: "none",
  },
};