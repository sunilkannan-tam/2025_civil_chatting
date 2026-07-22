import os
import logging
import json
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

logger = logging.getLogger(__name__)

EMAIL_PROVIDER = os.getenv('EMAIL_PROVIDER', 'resend')


def _send_via_sendgrid(api_key, from_email, recipient_email, subject, text, html, headers=None):
    payload = {
        "personalizations": [{"to": [{"email": recipient_email}]}],
        "from": {"email": from_email, "name": "Civil_2026 Chatting"},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text},
            {"type": "text/html", "value": html},
        ],
    }
    data = json.dumps(payload).encode('utf-8')
    hdrs = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'Civil2026-Chatting/1.0',
    }
    if headers:
        hdrs.update(headers)
    req = Request('https://api.sendgrid.com/v3/mail/send', data=data, headers=hdrs, method='POST')
    resp = urlopen(req, timeout=15)
    return resp.status


def _send_via_resend(api_key, from_email, recipient_email, subject, text, html, headers=None):
    payload = {
        "from": from_email,
        "to": [recipient_email],
        "subject": subject,
        "text": text,
        "html": html,
    }
    data = json.dumps(payload).encode('utf-8')
    hdrs = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'Civil2026-Chatting/1.0',
    }
    if headers:
        hdrs.update(headers)
    req = Request('https://api.resend.com/emails', data=data, headers=hdrs, method='POST')
    resp = urlopen(req, timeout=15)
    return resp.status


def _send_via_brevo(api_key, from_email, recipient_email, subject, text, html, headers=None):
    payload = {
        "sender": {"email": from_email, "name": "Civil_2026 Chatting"},
        "to": [{"email": recipient_email}],
        "subject": subject,
        "textContent": text,
        "htmlContent": html,
    }
    data = json.dumps(payload).encode('utf-8')
    hdrs = {
        'api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Civil2026-Chatting/1.0',
    }
    if headers:
        hdrs.update(headers)
    req = Request('https://api.brevo.com/v3/smtp/email', data=data, headers=hdrs, method='POST')
    resp = urlopen(req, timeout=15)
    return resp.status


def send_email_otp(recipient_email, otp_code, username=None):
    """
    Send OTP via email using HTTP API (works on Render free tier).
    Supports: resend, sendgrid, brevo
    Falls back to logging if not configured.
    """
    provider = os.getenv('EMAIL_PROVIDER', 'resend')
    api_key = os.getenv('SENDGRID_API_KEY', '') or os.getenv('RESEND_API_KEY', '') or os.getenv('BREVO_API_KEY', '')
    from_email = os.getenv('FROM_EMAIL', '')

    if not api_key or not from_email:
        logger.info(f"No email API configured. OTP for {recipient_email}: {otp_code}")
        return False

    # Resend free tier requires onboarding@resend.dev (can't use gmail.com)
    if provider == 'resend' and 'gmail.com' in from_email.lower():
        from_email = 'onboarding@resend.dev'

    greeting = f"Hi {username}," if username else "Hi there,"

    text_content = f"""
{greeting}

Your One-Time Password (OTP) for Civil_2026 Chatting is:

    {otp_code}

This code is valid for 10 minutes.

If you did not request this code, please ignore this email.

Best regards,
Civil_2026 Chatting Team
"""
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background: #f7f8fc; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
        .header h1 {{ color: white; margin: 0; font-size: 24px; }}
        .body {{ padding: 30px; }}
        .otp-box {{ background: #f0f4ff; border: 2px dashed #667eea; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
        .otp-code {{ font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace; }}
        .footer {{ text-align: center; padding: 20px; color: #718096; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>Civil_2026 Chatting</h1></div>
        <div class="body">
            <p>{greeting}</p>
            <p>Your One-Time Password (OTP) is:</p>
            <div class="otp-box"><div class="otp-code">{otp_code}</div></div>
            <p>This code is valid for <strong>10 minutes</strong>.</p>
            <p>If you did not request this code, please ignore this email.</p>
        </div>
        <div class="footer"><p>Civil_2026 Chatting - Secure Messaging Platform</p></div>
    </div>
</body>
</html>"""

    subject = 'Your OTP Code - Civil_2026 Chatting'
    from_addr = f"Civil_2026 Chatting <{from_email}>"

    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Civil2026-Chatting/1.0',
        }

        if provider == 'resend':
            from_addr = f"Civil_2026 Chatting <{from_email}>" if 'resend.dev' not in from_email else from_email
            status = _send_via_resend(api_key, from_addr, recipient_email, subject, text_content, html_content, headers)
        elif provider == 'sendgrid':
            status = _send_via_sendgrid(api_key, from_email, recipient_email, subject, text_content, html_content, headers)
        elif provider == 'brevo':
            status = _send_via_brevo(api_key, from_email, recipient_email, subject, text_content, html_content, headers)
        else:
            logger.error(f"Unknown email provider: {provider}")
            return False

        logger.info(f"OTP email sent to {recipient_email} via {provider} (status: {status})")
        return True
    except HTTPError as e:
        body = e.read().decode('utf-8', errors='replace') if hasattr(e, 'read') else ''
        logger.error(f"{provider} HTTP error {e.code} for {recipient_email}: {body[:500]}")
        return False
    except URLError as e:
        logger.error(f"{provider} request failed for {recipient_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {type(e).__name__}: {e}")
        return False


def send_sms_otp(phone_number, otp_code, country_code='+1'):
    """
    Send OTP via SMS using Twilio.
    Falls back to console logging if Twilio is not configured.
    Returns True if sent successfully, False otherwise.
    """
    twilio_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
    twilio_token = os.getenv('TWILIO_AUTH_TOKEN', '')
    twilio_from = os.getenv('TWILIO_PHONE_NUMBER', '')

    if not twilio_sid or not twilio_token or not twilio_from:
        logger.info(f"SMS not configured. OTP for {country_code}{phone_number}: {otp_code}")
        return False

    try:
        from twilio.rest import Client
        client = Client(twilio_sid, twilio_token)
        full_number = f"{country_code}{phone_number}"

        message = client.messages.create(
            body=f"Your OTP for Civil_2026 Chatting is: {otp_code}. Valid for 10 minutes.",
            from_=twilio_from,
            to=full_number
        )
        logger.info(f"SMS OTP sent to {full_number}, SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS to {country_code}{phone_number}: {e}")
        return False
