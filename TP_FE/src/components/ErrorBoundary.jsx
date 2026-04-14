import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            maxWidth: 720,
            margin: "40px auto",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ color: "#b91c1c" }}>
            {"\u004c\u1ed7i giao di\u1ec7n"}
          </h1>
          <p>
            {
              "\u1ee9ng d\u1ee5ng g\u1eb7p l\u1ed7i khi hi\u1ec3n th\u1ecb. M\u1edf DevTools (F12), tab Console \u0111\u1ec3 xem chi ti\u1ebft."
            }
          </p>
          <pre
            style={{
              background: "#f3f4f6",
              padding: 12,
              borderRadius: 8,
              overflow: "auto",
              fontSize: 13,
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
          >
            {"T\u1ea3i l\u1ea1i trang"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
