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

/**
 * Send email confirmation link for signup verification
 */
export async function sendEmailConfirmation(
  email: string,
  confirmationUrl: string,
  userName?: string
) {
  const resend = getResend();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">Welcome to AI Tracker</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="margin:0 0 16px 0; color: #374151;">Hi ${userName ?? "there"},</p>
        <p style="margin:0 0 16px 0; color: #374151;">
          Thanks for signing up to AI Tracker! Please confirm your email address to get started.
        </p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${confirmationUrl}" style="
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
          ">Confirm Email</a>
        </div>
        
        <p style="margin:0 0 16px 0; color: #6b7280; font-size: 14px;">
          Or copy this link: <br/>
          <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px; word-break: break-all;">${confirmationUrl}</code>
        </p>
        
        <p style="margin:0 0 16px 0; color: #6b7280; font-size: 14px;">
          This link expires in 24 hours.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        
        <p style="margin:0; color: #9ca3af; font-size: 12px; text-align: center;">
          AI Tracker © 2026. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: getFromEmail(),
    to: email,
    subject: "Confirm your email - AI Tracker",
    html,
  });
}

/**
 * Send password reset link
 */
export async function sendPasswordReset(
  email: string,
  resetUrl: string,
  userName?: string
) {
  const resend = getResend();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">Reset Your Password</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="margin:0 0 16px 0; color: #374151;">Hi ${userName ?? "there"},</p>
        <p style="margin:0 0 16px 0; color: #374151;">
          We received a request to reset your AI Tracker password. Click the button below to set a new password.
        </p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
          ">Reset Password</a>
        </div>
        
        <p style="margin:0 0 16px 0; color: #6b7280; font-size: 14px;">
          Or copy this link: <br/>
          <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px; word-break: break-all;">${resetUrl}</code>
        </p>
        
        <p style="margin:0 0 16px 0; color: #6b7280; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        
        <p style="margin:0; color: #9ca3af; font-size: 12px; text-align: center;">
          AI Tracker © 2026. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: getFromEmail(),
    to: email,
    subject: "Reset your AI Tracker password",
    html,
  });
}

/**
 * Send team member invitation
 */
export async function sendTeamInvitation(
  inviteeEmail: string,
  inviterName: string,
  acceptUrl: string
) {
  const resend = getResend();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">Team Invitation</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="margin:0 0 16px 0; color: #374151;">
          <b>${inviterName}</b> has invited you to join their team on AI Tracker.
        </p>
        <p style="margin:0 0 16px 0; color: #374151;">
          Start tracking AI spending across all providers with your team.
        </p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${acceptUrl}" style="
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
          ">Accept Invitation</a>
        </div>
        
        <p style="margin:0 0 16px 0; color: #6b7280; font-size: 14px;">
          Or copy this link: <br/>
          <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px; word-break: break-all;">${acceptUrl}</code>
        </p>
        
        <p style="margin:0 0 16px 0; color: #6b7280; font-size: 14px;">
          This invitation expires in 7 days.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        
        <p style="margin:0; color: #9ca3af; font-size: 12px; text-align: center;">
          AI Tracker © 2026. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: getFromEmail(),
    to: inviteeEmail,
    subject: `${inviterName} invited you to join their team - AI Tracker`,
    html,
  });
}
