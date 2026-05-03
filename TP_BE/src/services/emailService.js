import nodemailer from "nodemailer";

const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP chưa được cấu hình đầy đủ");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

export const sendResetPasswordEmail = async ({ to, name, resetUrl }) => {
  const smtpUser = process.env.SMTP_USER;
  const mailFrom = process.env.MAIL_FROM || smtpUser;
  const transporter = createTransporter();

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2>Yeu cau dat lai mat khau</h2>
      <p>Xin chao ${name || "ban"},</p>
      <p>Chung toi da nhan yeu cau dat lai mat khau cho tai khoan cua ban.</p>
      <p>
        Nhan vao lien ket duoi day de dat lai mat khau (hieu luc trong 15 phut):
      </p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;">
          Dat lai mat khau
        </a>
      </p>
      <p>Hoac mo lien ket nay:</p>
      <p>${resetUrl}</p>
      <p>Neu ban khong yeu cau, vui long bo qua email nay.</p>
    </div>
  `;

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: "Dat lai mat khau",
    text: `Dat lai mat khau tai: ${resetUrl}. Lien ket hieu luc trong 15 phut.`,
    html,
  });
};

export const sendRefundStatusEmail = async ({
  to,
  guestName,
  bookingId,
  stage,
  amount = 0,
  reason = "",
}) => {
  const smtpUser = process.env.SMTP_USER;
  const mailFrom = process.env.MAIL_FROM || smtpUser;
  const transporter = createTransporter();
  const shortId = String(bookingId || "").slice(-6).toUpperCase();
  const amountVi = `${Number(amount || 0).toLocaleString("vi-VN")} VND`;
  const who = guestName || "quy khach";

  let subject = "Cap nhat yeu cau hoan tien";
  let title = "Cap nhat yeu cau hoan tien";
  let body = "Yeu cau hoan tien cua ban da duoc cap nhat.";
  if (stage === "pending_refund") {
    subject = "Yeu cau hoan tien dang cho xu ly";
    title = "Yeu cau hoan tien dang cho xu ly";
    body = `Booking #${shortId} da huy. So tien du kien hoan: ${amountVi}.`;
  } else if (stage === "refunded") {
    subject = "Hoan tien thanh cong";
    title = "Hoan tien thanh cong";
    body = `Booking #${shortId} da duoc hoan ${amountVi}.`;
  } else if (stage === "rejected") {
    subject = "Yeu cau hoan tien bi tu choi";
    title = "Yeu cau hoan tien bi tu choi";
    body = `Booking #${shortId} khong du dieu kien hoan tien.${reason ? ` Ly do: ${reason}` : ""}`;
  } else if (stage === "forfeited") {
    subject = "Tien coc bi giu lai theo chinh sach";
    title = "Tien coc bi giu lai";
    body = `Booking #${shortId} bi ap dung giu coc theo chinh sach hien hanh.`;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2>${title}</h2>
      <p>Xin chao ${who},</p>
      <p>${body}</p>
      ${reason ? `<p><strong>Ghi chu:</strong> ${reason}</p>` : ""}
      <p>Cam on ban da su dung dich vu cua Thinh Phat Hotel.</p>
    </div>
  `;

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text: `${title}. ${body}`,
    html,
  });
};

export const sendContactReplyEmail = async ({ to, name, subject, reply }) => {
  const smtpUser = process.env.SMTP_USER;
  const mailFrom = process.env.MAIL_FROM || smtpUser;
  const transporter = createTransporter();

  const safeTo = String(to || "").trim();
  if (!safeTo) throw new Error("Missing recipient email");

  const who = name || "quý khách";
  const contactSubject = subject || "Yêu cầu liên hệ";
  const replyText = String(reply || "").trim();

  const emailSubject = `Thịnh Phát Hotel - Phản hồi: ${contactSubject}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;">Xin chào ${who},</h2>
      <p style="margin:0 0 10px;">Chúng tôi đã nhận và gửi phản hồi cho yêu cầu của bạn.</p>
      <div style="border-left:4px solid #f59e0b;padding:10px 12px;background:#fff7ed;margin:12px 0;">
        <div style="font-weight:800;margin-bottom:6px;">Chủ đề: ${contactSubject}</div>
        <div style="white-space:pre-wrap;">${replyText}</div>
      </div>
      <p style="margin:0 0 8px;">Trân trọng,</p>
      <p style="margin:0;">Thịnh Phát Hotel</p>
    </div>
  `;

  await transporter.sendMail({
    from: mailFrom,
    to: safeTo,
    subject: emailSubject,
    text: `Xin chào ${who},\n\nChủ đề: ${contactSubject}\n\nNội dung phản hồi:\n${replyText}\n\nTrân trọng,\nThịnh Phát Hotel`,
    html,
  });
};
