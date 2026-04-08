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
