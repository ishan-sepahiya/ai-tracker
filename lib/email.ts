import { Resend } from "resend";

export type AlertUser = {
  id?: string;
  email: string;
  full_name?: string | null;
};

function formatMoneyUSD(value: number) {
  if (!Number.isFinite(value)) return "$0.00";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  return new Resend(apiKey);
}

function getFromEmail() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("Missing RESEND_FROM_EMAIL");
  return from;
}

async function sendAlertEmail(params: {
  user: AlertUser;
  alertType: "green" | "amber" | "red";
  spend: number;
  limit: number;
  pct?: number;
}) {
  const resend = getResend();

  const { user, alertType, spend, limit, pct } = params;

  const subject =
    alertType === "red"
      ? "Usage alert: budget exceeded"
      : alertType === "amber"
        ? "Usage alert: budget approaching"
        : "Usage alert";

  const pctText =
    typeof pct === "number" && Number.isFinite(pct)
      ? ` (${pct.toFixed(0)}% of limit)`
      : "";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827;">
      <p style="margin:0 0 12px 0;">Hi ${user.full_name ?? "there"},</p>
      <p style="margin:0 0 12px 0;">
        This is a <b>${alertType.toUpperCase()}</b> usage alert.
      </p>
      <p style="margin:0 0 12px 0;">
        Spend: <b>${formatMoneyUSD(spend)}</b><br/>
        Monthly limit: <b>${formatMoneyUSD(limit)}</b><br/>
        Threshold: <b>${typeof pct === "number" ? pct.toFixed(0) : "N/A"}%</b>${pctText}
      </p>
      <p style="margin:0 0 12px 0;">
        You can review detailed usage in your dashboard.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: getFromEmail(),
    to: user.email,
    subject,
    html,
  });
}

export async function sendGreenAlert(user: AlertUser, spend: number, limit: number) {
  return sendAlertEmail({
    user,
    alertType: "green",
    spend,
    limit,
  });
}

export async function sendAmberAlert(
  user: AlertUser,
  spend: number,
  limit: number,
  pct: number
) {
  return sendAlertEmail({
    user,
    alertType: "amber",
    spend,
    limit,
    pct,
  });
}

export async function sendRedAlert(user: AlertUser, spend: number, limit: number) {
  return sendAlertEmail({
    user,
    alertType: "red",
    spend,
    limit,
  });
}

