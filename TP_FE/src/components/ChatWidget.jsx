import "./ChatWidget.css";

export default function ChatWidget() {
  const zaloHref = "https://zalo.me/";
  const hotline = "19006925";
  return (
    <div className="hh-chat-widget" aria-label="Chat widget">
      <a className="hh-chat-btn hh-chat-btn--zalo" href={zaloHref} target="_blank" rel="noreferrer">
        <span className="hh-chat-ic" aria-hidden="true">Z</span>
        <span className="hh-chat-text">Zalo</span>
      </a>
      <a className="hh-chat-btn hh-chat-btn--hotline" href={`tel:${hotline}`}>
        <span className="hh-chat-ic" aria-hidden="true">☎</span>
        <span className="hh-chat-text">Hotline</span>
      </a>
    </div>
  );
}

