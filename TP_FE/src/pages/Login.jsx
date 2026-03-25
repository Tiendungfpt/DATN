import React, { useState } from 'react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dữ liệu đăng nhập:", formData);
    // Gọi API ở đây
  };

  return (
    <div className="login-container">
      <h2>Đăng Nhập</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <button type="submit">Đăng nhập</button>
      </form>
    </div>
  );
};

export default Login;
