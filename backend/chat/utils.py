import os
import socket
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

socket.setdefaulttimeout(15)


def send_email_otp(recipient_email, otp_code, username=None):
    """
    Send OTP via email using SMTP.
    Falls back to console logging if email is not configured.
    Returns True if sent successfully, False otherwise.
    """
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = os.getenv('SMTP_PORT', '587')
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_pass = os.getenv('SMTP_PASS', '')
    from_email = os.getenv('FROM_EMAIL', smtp_user)

    if not smtp_host or not smtp_user or not smtp_pass:
        logger.info(f"Email not configured. OTP for {recipient_email}: {otp_code}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Your OTP Code - Civil_2026 Chatting'
        msg['From'] = from_email
        msg['To'] = recipient_email

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
        html_content = f"""
<!DOCTYPE html>
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
        <div class="header">
            <h1>💬 Civil_2026 Chatting</h1>
        </div>
        <div class="body">
            <p>{greeting}</p>
            <p>Your One-Time Password (OTP) is:</p>
            <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
            </div>
            <p>This code is valid for <strong>10 minutes</strong>.</p>
            <p>If you did not request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Civil_2026 Chatting - Secure Messaging Platform</p>
        </div>
    </div>
</body>
</html>
"""
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)

        port = int(smtp_port)
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=15)
        else:
            server = smtplib.SMTP(smtp_host, port, timeout=15)
            server.starttls()
        
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"OTP email sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
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