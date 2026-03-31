function ProfileSidebar({ user, activeTab, onTabChange }) {
  return (
    <div className="card shadow-sm border-0 rounded-4 h-100 sticky-top" style={{ top: "20px" }}>
      <div className="card-body p-4">
        <div className="text-center mb-4">
          <div
            className="mx-auto bg-primary text-white d-flex align-items-center justify-content-center rounded-circle mb-3 shadow"
            style={{ width: "90px", height: "90px", fontSize: "32px" }}
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <h5 className="fw-bold mb-1">{user?.name}</h5>
          <p className="text-muted small mb-0">{user?.email}</p>
        </div>

        <hr className="my-4" />

        <div className="nav flex-column nav-pills">
          <button
            className={`nav-link text-start py-3 px-4 mb-2 rounded-3 fw-semibold ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => onTabChange("profile")}
          >
            <i className="bi bi-person-circle me-3"></i>
            Thông tin cá nhân
          </button>

          <button
            className={`nav-link text-start py-3 px-4 mb-2 rounded-3 fw-semibold ${activeTab === "history" ? "active" : ""}`}
            onClick={() => onTabChange("history")}
          >
            <i className="bi bi-clock-history me-3"></i>
            Lịch sử đặt phòng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSidebar;