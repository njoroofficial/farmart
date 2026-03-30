"""
app/services/email_service.py
─────────────────────────────────────────────────────────────────────────────
Transactional email service powered by SendGrid.

DESIGN PRINCIPLE — INTENT OVER MECHANICS:
  Routes call high-level functions like send_verification_email(user, token).
  All SendGrid mechanics are hidden in this file. If you ever switch
  providers, only this file changes — no routes are touched.
─────────────────────────────────────────────────────────────────────────────
"""
import logging
from flask import current_app
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logger = logging.getLogger(__name__)


def _build_client() -> SendGridAPIClient:
    """Create a SendGrid client using the API key from Flask config."""
    return SendGridAPIClient(current_app.config["SENDGRID_API_KEY"])


def _send(mail: Mail) -> bool:
    """
    Internal dispatcher — sends a Mail object via SendGrid.

    Returns True on success, False on any failure.
    We never let an email failure crash the API request — a user who registers
    should still see 201 Created even if SendGrid hiccups. We log every
    failure with the full SendGrid error body so you can diagnose problems
    without guessing.

    ERROR BODY LOGGING:
      SendGrid's Python library raises urllib.error.HTTPError on 4xx/5xx
      responses. The exception carries a .body attribute containing the full
      JSON error payload — e.g. "The from address does not match a verified
      Sender Identity." We log this body explicitly so you see the real reason
      instead of just a status code.

    In TESTING mode we skip SendGrid entirely and log what would be sent.
    """
    # Skip real sending during automated tests
    if current_app.config.get("TESTING_EMAIL") or current_app.config.get("TESTING"):
        logger.info("[TEST MODE] Email not sent — SendGrid call skipped.")
        return True

    if not current_app.config.get("SENDGRID_API_KEY"):
        logger.warning(
            "SENDGRID_API_KEY is not set in your environment. "
            "Check your .env file — email not sent."
        )
        return False

    try:
        client   = _build_client()
        response = client.send(mail)

        if response.status_code in (200, 202):
            logger.info(f"Email sent successfully (HTTP {response.status_code}).")
            return True
        else:
            logger.error(
                f"SendGrid returned unexpected status {response.status_code}. "
                f"Body: {response.body}"
            )
            return False

    except Exception as e:
        # Log the full SendGrid error body — this is what tells you exactly
        # what is wrong (wrong sender, invalid recipient, malformed payload…).
        body = getattr(e, "body", None)
        if body:
            logger.error(
                f"SendGrid rejected the request ({type(e).__name__}). "
                f"Full error body: {body}"
            )
        else:
            logger.error(f"Email send failed ({type(e).__name__}): {e}")
        return False


def _build_mail(to_email: str, subject: str, html_body: str) -> Mail:
    """
    Construct a SendGrid Mail object using the simple constructor form.

    WHY NOT THE HELPER CLASSES (From, To, Subject, HtmlContent)?
      The SendGrid Python library offers two ways to build a Mail object.
      The helper-class approach — assigning From(), To(), Subject() objects
      as attributes — is granular but fragile. Small mistakes in usage order
      produce 400 errors with unhelpful messages.

      The positional-argument constructor below is what SendGrid's own
      quickstart guide recommends. It handles all internal wiring correctly
      and is much less likely to produce a malformed request.

    SENDER IDENTITY:
      from_email is passed as a (address, display_name) tuple so that
      recipients see "Farmart <noreply@farmart.co.ke>" in their inbox
      rather than a bare email address. Both values come from your .env
      and must exactly match your verified SendGrid sender.
    """
    from_email = current_app.config["MAIL_FROM_EMAIL"]
    from_name  = current_app.config.get("MAIL_FROM_NAME", "Farmart")

    return Mail(
        from_email=(from_email, from_name),
        to_emails=to_email,
        subject=subject,
        html_content=html_body,
    )


# ─── Email: Verification ──────────────────────────────────────────────────────

def send_verification_email(user, token_string: str) -> bool:
    """
    Send the 2-step email verification link to a newly registered user.

    The link points to your React frontend's /verify-email page, which
    reads the token from the URL and calls POST /api/v1/auth/verify-email.
    """
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    verify_url   = f"{frontend_url}/verify-email?token={token_string}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
      <h1 style="color: #1B4332; font-size: 26px; margin-bottom: 6px;">
        Welcome to Farmart
      </h1>
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">
        Hi {user.first_name}, you are almost there.
        Verify your email address to activate your account.
      </p>
      <a href="{verify_url}"
         style="display: inline-block; background: #1B4332; color: #ffffff;
                padding: 12px 28px; border-radius: 8px; text-decoration: none;
                font-size: 15px; font-weight: 600;">
        Verify my email
      </a>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
        This link expires in 24 hours.
        If you did not create an account, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
      <p style="color: #9CA3AF; font-size: 11px;">
        Farmart — Farm to buyer, no middlemen.
      </p>
    </div>
    """

    mail = _build_mail(
        to_email=user.email,
        subject="Verify your Farmart account",
        html_body=html,
    )
    return _send(mail)


# ─── Email: Password Reset ────────────────────────────────────────────────────

def send_password_reset_email(user, token_string: str) -> bool:
    """
    Send a password reset link valid for 1 hour.

    We use a deliberately vague subject line to avoid confirming to an
    attacker that a given email address is registered on the platform.
    """
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    reset_url    = f"{frontend_url}/reset-password?token={token_string}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
      <h1 style="color: #1B4332; font-size: 26px; margin-bottom: 6px;">
        Reset your password
      </h1>
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">
        Hi {user.first_name}, we received a request to reset your Farmart password.
        Click the button below to choose a new one.
      </p>
      <a href="{reset_url}"
         style="display: inline-block; background: #D97706; color: #ffffff;
                padding: 12px 28px; border-radius: 8px; text-decoration: none;
                font-size: 15px; font-weight: 600;">
        Reset my password
      </a>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
        This link expires in 1 hour. If you did not request a password reset,
        your password has not changed — you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
      <p style="color: #9CA3AF; font-size: 11px;">
        Farmart — Farm to buyer, no middlemen.
      </p>
    </div>
    """

    mail = _build_mail(
        to_email=user.email,
        subject="Reset your Farmart password",
        html_body=html,
    )
    return _send(mail)


# ─── Email: Order Notification to Farmer ─────────────────────────────────────

def send_order_notification_to_farmer(farmer_user, order) -> bool:
    """
    Notify a farmer that a buyer has placed an order for their animal.
    Called from the orders route after an order is successfully created.
    """
    dashboard_url = (
        f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}"
        f"/farmer/orders/{order.id}"
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
      <h1 style="color: #1B4332; font-size: 24px; margin-bottom: 6px;">
        New order received
      </h1>
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">
        Hi {farmer_user.first_name}, a buyer has placed an order.
        Please confirm or reject it within 48 hours.
      </p>
      <div style="background: #F0FAF3; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #374151;">
          <strong>Order ID:</strong> {order.id[:8].upper()}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #374151;">
          <strong>Total:</strong> KSh {order.total_amount:,.2f}
        </p>
        <p style="margin: 0; font-size: 13px; color: #374151;">
          <strong>Delivery to:</strong> {order.delivery_address}
        </p>
      </div>
      <a href="{dashboard_url}"
         style="display: inline-block; background: #1B4332; color: #ffffff;
                padding: 12px 28px; border-radius: 8px; text-decoration: none;
                font-size: 15px; font-weight: 600;">
        View order and respond
      </a>
      <p style="color: #9CA3AF; font-size: 11px; margin-top: 24px;">Farmart</p>
    </div>
    """

    mail = _build_mail(
        to_email=farmer_user.email,
        subject=f"New order — KSh {order.total_amount:,.0f}",
        html_body=html,
    )
    return _send(mail)


# ─── Email: Order Confirmation to Buyer ──────────────────────────────────────

def send_order_confirmation_to_buyer(buyer_user, order) -> bool:
    """
    Confirm to the buyer that their order was received and is awaiting farmer action.
    """
    track_url = (
        f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}"
        f"/orders/{order.id}"
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
      <h1 style="color: #1B4332; font-size: 24px; margin-bottom: 6px;">
        Order placed successfully
      </h1>
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 20px;">
        Hi {buyer_user.first_name}, your order has been placed.
        The farmer will confirm it shortly.
      </p>
      <div style="background: #FFFBEB; border-radius: 10px; padding: 16px; margin-bottom: 20px;
                  border: 1px solid #FEF3C7;">
        <p style="margin: 0 0 4px; font-size: 13px;">
          <strong>Total paid:</strong> KSh {order.total_amount:,.2f}
        </p>
        <p style="margin: 0; font-size: 13px;">
          <strong>Status:</strong> Awaiting farmer confirmation
        </p>
      </div>
      <a href="{track_url}"
         style="display: inline-block; background: #D97706; color: #ffffff;
                padding: 12px 28px; border-radius: 8px; text-decoration: none;
                font-size: 15px; font-weight: 600;">
        Track my order
      </a>
      <p style="color: #9CA3AF; font-size: 11px; margin-top: 24px;">Farmart</p>
    </div>
    """

    mail = _build_mail(
        to_email=buyer_user.email,
        subject="Your Farmart order has been placed",
        html_body=html,
    )
    return _send(mail)