export default function SearchBar() {
  return (
    <div className="search-container mt-4">
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-4">
              <label className="form-label fw-medium text-muted">
                Điểm đến
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-geo-alt"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Bạn muốn đi đâu?"
                />
              </div>
            </div>

            <div className="col-lg-3">
              <label className="form-label fw-medium text-muted">
                Nhận phòng
              </label>
              <input type="date" className="form-control" />
            </div>

            <div className="col-lg-3">
              <label className="form-label fw-medium text-muted">
                Trả phòng
              </label>
              <input type="date" className="form-control" />
            </div>

            <div className="col-lg-2">
              <button className="btn btn-primary w-100 py-3 fw-semibold rounded-3">
                <i className="bi bi-search me-2"></i>
                Tìm phòng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
