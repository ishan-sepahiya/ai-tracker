import { sendEmailConfirmation, sendPasswordReset, sendTeamInvitation } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, email, confirmationUrl, resetUrl, inviterName, acceptUrl, userName } = body;

    // Validate request has required fields
    if (!type || !email) {
      return Response.json(
        { error: "Missing required fields: type, email" },
        { status: 400 }
      );
    }

    // Send email confirmation
    if (type === "confirmation") {
      if (!confirmationUrl) {
        return Response.json(
          { error: "Missing confirmationUrl for confirmation email" },
          { status: 400 }
        );
      }
      await sendEmailConfirmation(email, confirmationUrl, userName);
      return Response.json({ success: true, message: "Confirmation email sent" });
    }

    // Send password reset
    if (type === "password-reset") {
      if (!resetUrl) {
        return Response.json(
          { error: "Missing resetUrl for password reset email" },
          { status: 400 }
        );
      }
      await sendPasswordReset(email, resetUrl, userName);
      return Response.json({ success: true, message: "Password reset email sent" });
    }

    // Send team invitation
    if (type === "team-invitation") {
      if (!inviterName || !acceptUrl) {
        return Response.json(
          { error: "Missing inviterName or acceptUrl for team invitation email" },
          { status: 400 }
        );
      }
      await sendTeamInvitation(email, inviterName, acceptUrl);
      return Response.json({ success: true, message: "Team invitation email sent" });
    }

    return Response.json(
      { error: "Invalid email type. Must be one of: confirmation, password-reset, team-invitation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Email API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
