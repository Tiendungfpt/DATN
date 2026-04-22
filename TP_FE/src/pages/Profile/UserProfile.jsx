import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

import ProfileSidebar from "./Component/ProfileSidebar";
import ProfileInfo from "./Component/ProfileInfo";
import BookingHistory from "./Component/BookingHistory";
import NotificationList from "./Component/NotificationList";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setError("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Lỗi khi tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const changeTab = (tab) => {
    setSearchParams({ tab });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" style={{ width: "4rem", height: "4rem" }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center mt-5 mx-auto" style={{ maxWidth: "600px" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light py-5">
      <div className="container">
        <div className="row g-4">
          {/* Sidebar */}
          <div className="col-lg-3">
            <ProfileSidebar 
              user={user} 
              activeTab={activeTab} 
              onTabChange={changeTab} 
            />
          </div>

          <div className="col-lg-9">
            <div className="card shadow border-0 rounded-4">
              <div className="card-body p-5">
                {activeTab === "profile" && <ProfileInfo user={user} />}
                {activeTab === "history" && <BookingHistory />}
                {activeTab === "notifications" && <NotificationList />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;