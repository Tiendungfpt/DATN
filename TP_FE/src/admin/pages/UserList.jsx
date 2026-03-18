import { useEffect, useState } from "react";
import {useNavigate } from "react-router-dom";
import "../components/User.css";


export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const limit = 5;

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    try {
      let url = "";

      if (search) {
        url = `http://localhost:3000/api/admin/search-users?search=${search}`;
      } else {
        url = `http://localhost:3000/api/admin/users-pagination?page=${page}&limit=${limit}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("API lỗi:", data);
        return;
      }

      if (search) {
        setUsers(data || []);
        setTotalPages(1);
      } else {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.log("Lỗi:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  // ================= DELETE =================
  const handleDelete = async (id) => {
    const myId = JSON.parse(
      atob(localStorage.getItem("token").split(".")[1])
    ).id;

    if (id === myId) {
      alert("Không thể xóa chính mình!");
      return;
    }

    if (!window.confirm("Bạn có chắc muốn xóa?")) return;

    try {
      const res = await fetch(
        `http://localhost:3000/api/admin/users/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (res.ok) fetchUsers();
    } catch (error) {
      console.log(error);
    }
  };

  // ================= CHANGE ROLE =================
  const handleChangeRole = async (id, role) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/admin/users/${id}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ role }),
        }
      );

      if (res.ok) fetchUsers();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="user-page">
      <h2 className="title">Danh sách người dùng</h2>

      {/* 🔍 SEARCH */}
      <input
        className="search-input"
        placeholder="Tìm email..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
      />

      {/* 📋 TABLE */}
      <table className="user-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên</th>
            <th>Email</th>
            <th>SĐT</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6">Không có dữ liệu</td>
            </tr>
          ) : (
            users.map((user, index) => (
              <tr key={user._id}>
                <td>{(page - 1) * limit + index + 1}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>

                {/* ROLE */}
                <td>
                  <span
                    className={
                      user.role === "admin" ? "role-admin" : "role-user"
                    }
                  >
                    {user.role}
                  </span>
                </td>

                {/* ACTION */}
                <td>
                  {user.role === "admin" ? (
                    <button
                      className="btn btn-role"
                      onClick={() =>
                        handleChangeRole(user._id, "user")
                      }
                    >
                      Thu hồi
                    </button>
                  ) : (
                    <button
                      className="btn btn-role"
                      onClick={() =>
                        handleChangeRole(user._id, "admin")
                      }
                    >
                      Cấp admin
                    </button>
                  )}

                  <button
                    className="btn btn-delete"
                    onClick={() => handleDelete(user._id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 📄 PAGINATION */}
      {!search && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>

          <span>
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}