export default function SearchBar() {
    return (
        <div className="search-a25">
            <div className="search-item">
                <input placeholder="Bạn muốn đi đâu?" />
            </div>
            <div className="search-item">
                <input type="date" />
            </div>
            <div className="search-item">
                <input type="date" />
            </div>
            <button className="btn-search-a25">Tìm phòng</button>
        </div>
    );
}
