import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ImageCarousel from "../components/ImageCarousel";
import "./style/About.css";

export default function About() {
  const heroImage = useMemo(
    () =>
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb210a2?auto=format&fit=crop&w=2200&q=80",
    [],
  );

  const highlights = useMemo(
    () => [
      {
        icon: "bi bi-stars",
        title: "Chất lượng dịch vụ",
        desc: "Quy trình vận hành nhất quán từ trước – trong – sau kỳ lưu trú.",
      },
      {
        icon: "bi bi-shield-check",
        title: "An tâm mỗi ngày",
        desc: "Môi trường sạch sẽ, tiêu chuẩn phục vụ rõ ràng và minh bạch.",
      },
      {
        icon: "bi bi-heart-fill",
        title: "Chạm đến trải nghiệm",
        desc: "Tinh chỉnh từng chi tiết nhỏ để bạn thấy thoải mái ngay từ giây đầu tiên.",
      },
      {
        icon: "bi bi-geo-alt-fill",
        title: "Vị trí thuận tiện",
        desc: "Tối ưu thời gian di chuyển, dễ dàng kết nối điểm đến nổi bật.",
      },
    ],
    [],
  );

  const values = useMemo(
    () => [
      {
        title: "Tôn trọng",
        desc: "Tôn trọng sự khác biệt của từng khách hàng, từng nhu cầu.",
      },
      {
        title: "Chuyên nghiệp",
        desc: "Hành động nhanh chóng, đúng cam kết, luôn đặt trải nghiệm lên trước.",
      },
      {
        title: "Cải tiến liên tục",
        desc: "Lắng nghe phản hồi và nâng cấp dịch vụ theo từng giai đoạn.",
      },
    ],
    [],
  );

  const timeline = useMemo(
    () => [
      {
        step: "01",
        title: "Thiết kế & Xây dựng",
        desc: "Không gian công năng, ánh sáng tự nhiên và cảm giác thư giãn.",
      },
      {
        step: "02",
        title: "Vận hành & Chăm sóc",
        desc: "Đội ngũ sẵn sàng hỗ trợ, quy trình rõ ràng và thân thiện.",
      },
      {
        step: "03",
        title: "Trải nghiệm & Tối ưu",
        desc: "Tinh chỉnh liên tục để mọi kỳ lưu trú đều trọn vẹn.",
      },
    ],
    [],
  );

  const gallery = useMemo(
    () => [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1569123719561-4a739d9f2c0b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1522778119026-d1f55b8b0b2f?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1541971875076-8f970e17f9f5?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80",
    ],
    [],
  );

  const faqs = useMemo(
    () => [
      {
        q: "Thịnh Phát Hotel có gì nổi bật?",
        a: "Chúng tôi tập trung vào sự thoải mái, tiêu chuẩn phục vụ ổn định và tối ưu trải nghiệm lưu trú.",
      },
      {
        q: "Có hỗ trợ đặt phòng trực tuyến không?",
        a: "Có. Bạn có thể đặt phòng theo từng hạng phòng và hoàn tất thanh toán ngay trên website.",
      },
      {
        q: "Tôi có thể liên hệ để được hỗ trợ thêm?",
        a: "Mọi thắc mắc, bạn có thể vào trang Liên hệ để gửi tin nhắn. Đội ngũ sẽ phản hồi sớm nhất có thể.",
      },
    ],
    [],
  );

  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <main className="about">
      <section className="about-hero">
        <div className="about-hero-bg" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="about-hero-overlay" />
        <div className="hh-container about-hero-inner">
          <div className="about-breadcrumb">
            <span className="about-badge">Thịnh Phát Hotel</span>
            <span className="about-sep">/</span>
            <span className="about-breadcrumb-text">Giới thiệu</span>
          </div>

          <h1 className="about-hero-title">Sang trọng, tinh gọn và đầy ấm áp</h1>
          <p className="about-hero-sub">
            Chúng tôi tin rằng một kỳ nghỉ tốt bắt đầu từ trải nghiệm rõ ràng: không gian đẹp, dịch vụ
            tận tâm và quy trình vận hành nhất quán.
          </p>

          <div className="about-hero-actions">
            <Link className="about-primary-btn" to="/book">
              Đặt phòng ngay
            </Link>
            <Link className="about-secondary-btn" to="/lien-he">
              Liên hệ với chúng tôi
            </Link>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="hh-container">
          <div className="about-section-head">
            <h2 className="about-section-title">Điểm chạm đáng nhớ</h2>
            <p className="about-section-sub">
              Một vài lý do khiến khách quay lại và giới thiệu cùng bạn bè.
            </p>
          </div>

          <div className="about-grid-4">
            {highlights.map((it) => (
              <div key={it.title} className="about-card">
                <div className="about-card-ic" aria-hidden="true">
                  <i className={it.icon} />
                </div>
                <div className="about-card-title">{it.title}</div>
                <div className="about-card-desc">{it.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-section--alt">
        <div className="hh-container">
          <div className="about-two-col">
            <div>
              <h2 className="about-section-title">Sứ mệnh - Tầm nhìn - Giá trị cốt lõi</h2>
              <p className="about-section-sub">
                Chúng tôi xây dựng Thịnh Phát Hotel dựa trên sứ mệnh mang lại trải nghiệm lưu trú dễ chịu
                và bền vững.
              </p>
              <div className="about-values">
                {values.map((v) => (
                  <div key={v.title} className="about-value">
                    <div className="about-value-title">{v.title}</div>
                    <div className="about-value-desc">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="about-photo">
              <div className="about-photo-bg" />
              <div className="about-photo-overlay">
                <div className="about-stamp">
                  <div className="about-stamp-big">4.9</div>
                  <div className="about-stamp-small">trung bình đánh giá</div>
                </div>
                <div className="about-stamp-sub">
                  Tập trung vào chất lượng và sự thoải mái của khách.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="hh-container">
          <div className="about-section-head">
            <h2 className="about-section-title">Hành trình chất lượng</h2>
            <p className="about-section-sub">Từ thiết kế, vận hành đến tối ưu trải nghiệm.</p>
          </div>

          <div className="about-timeline">
            {timeline.map((t) => (
              <div key={t.step} className="about-timeline-item">
                <div className="about-timeline-dot" aria-hidden="true" />
                <div className="about-timeline-step">{t.step}</div>
                <div className="about-timeline-body">
                  <div className="about-timeline-title">{t.title}</div>
                  <div className="about-timeline-desc">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-section--alt">
        <div className="hh-container">
          <div className="about-section-head">
            <h2 className="about-section-title">Không gian & khoảnh khắc</h2>
            <p className="about-section-sub">Một chuyến đi đẹp thường bắt đầu từ những hình ảnh.</p>
          </div>

          <div className="about-gallery">
            <ImageCarousel
              images={gallery}
              alt="Gallery Thịnh Phát Hotel"
              autoPlay={false}
              showArrows
              showDots
              intervalMs={3400}
              className="about-gallery-carousel"
            />

            <div className="about-gallery-rail">
              {gallery.slice(0, 5).map((src, idx) => (
                <div key={`${src}-${idx}`} className="about-gallery-thumb">
                  <img src={src} alt={`thumb-${idx + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="hh-container">
          <div className="about-stats">
            <div className="about-stat">
              <div className="about-stat-value">1900 6925</div>
              <div className="about-stat-label">Hotline hỗ trợ 24/7</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-value">An tâm</div>
              <div className="about-stat-label">Quy trình rõ ràng & minh bạch</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-value">Nhanh gọn</div>
              <div className="about-stat-label">Đặt phòng online trong vài phút</div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-section--alt">
        <div className="hh-container">
          <div className="about-section-head">
            <h2 className="about-section-title">FAQ nhanh</h2>
            <p className="about-section-sub">Những câu hỏi thường gặp trước khi bạn đặt phòng.</p>
          </div>

          <div className="about-faq" role="region" aria-label="FAQ accordion">
            {faqs.map((f, idx) => {
              const open = faqOpen === idx;
              return (
                <div key={f.q} className={`about-faq-item${open ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="about-faq-q"
                    onClick={() => setFaqOpen((v) => (v === idx ? -1 : idx))}
                    aria-expanded={open}
                  >
                    <span>{f.q}</span>
                    <span className="about-faq-ic" aria-hidden="true">
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? <div className="about-faq-a">{f.a}</div> : null}
                </div>
              );
            })}
          </div>

          <div className="about-cta">
            <div>
              <div className="about-cta-title">Sẵn sàng cho một kỳ nghỉ trọn vẹn?</div>
              <div className="about-cta-sub">
                Chọn hạng phòng phù hợp và hoàn tất đặt phòng ngay trên website.
              </div>
            </div>
            <Link className="about-cta-btn" to="/book">
              Đặt phòng
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

