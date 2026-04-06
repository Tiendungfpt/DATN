import { useEffect, useState } from "react";
import axios from "axios";

function AdminReviews() {
    const [reviews, setReviews] = useState([]);
    const [replyText, setReplyText] = useState({});

    const token = localStorage.getItem("token");

    const fetchReviews = async () => {
        const res = await axios.get(
            "http://localhost:3000/api/admin/reviews",
            {
                headers: {
                    Authorization: "Bearer " + token,
                },
            }
        );

        setReviews(res.data);
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    // toggle hide
    const toggleHide = async (id) => {
        await axios.patch(
            `http://localhost:3000/api/admin/reviews/${id}/toggle`,
            {},
            { headers: { Authorization: "Bearer " + token } }
        );

        fetchReviews();
    };

    // reply
    const sendReply = async (id) => {
        await axios.patch(
            `http://localhost:3000/api/admin/reviews/${id}/reply`,
            { reply: replyText[id] },
            { headers: { Authorization: "Bearer " + token } }
        );

        setReplyText({ ...replyText, [id]: "" });
        fetchReviews();
    };

    return (
        <div style={{ padding: 30 }}>
            <h2>Quản lý đánh giá khách hàng</h2>

            {reviews.map((r) => (
                <div key={r._id} style={styles.card}>
                    <h3>{r.user_id?.name}</h3>

                    <p>Loại phòng: {r.room_id?.name}</p>
                    <p>Phòng: {r.room_id?.room_no}</p>

                    <p>⭐ {r.rating}/5</p>

                    <p>{r.comment}</p>

                    {r.adminReply && (
                        <div style={styles.replyBox}>
                            Admin: {r.adminReply}
                        </div>
                    )}

                    <textarea
                        placeholder="Phản hồi khách..."
                        value={replyText[r._id] || ""}
                        onChange={(e) =>
                            setReplyText({
                                ...replyText,
                                [r._id]: e.target.value,
                            })
                        }
                        style={styles.textarea}
                    />

                    <div style={{ display: "flex", gap: 10 }}>
                        <button
                            onClick={() => toggleHide(r._id)}
                            style={{
                                ...styles.hideBtn,
                                background: r.isHidden
                                    ? "#22c55e"
                                    : "#ef4444",
                            }}
                        >
                            {r.isHidden
                                ? "Hiện đánh giá"
                                : "Ẩn đánh giá"}
                        </button>

                        <button
                            onClick={() => sendReply(r._id)}
                            style={styles.replyBtn}
                        >
                            Phản hồi
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

const styles = {
    card: {
        background: "#fff",
        padding: 20,
        marginBottom: 20,
        borderRadius: 12,
        boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    },

    textarea: {
        width: "100%",
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
    },

    hideBtn: {
        padding: "8px 14px",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
    },

    replyBtn: {
        padding: "8px 14px",
        background: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
    },

    replyBox: {
        background: "#f1f5f9",
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
};

export default AdminReviews;