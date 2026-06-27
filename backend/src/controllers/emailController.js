const nodemailer = require('nodemailer')
const Lead = require('../models/Lead')
const EmailLog = require('../models/EmailLog')
const { logActivity } = require('./activityController')
const { successResponse, errorResponse } = require('../utils/apiResponse')

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 8_000,
    greetingTimeout:   5_000,
    socketTimeout:     8_000,
  })
}

function welcomeHtml(lead) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:36px 40px 28px;">
            <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">LeadFlow</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Lead Management Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;font-weight:600;">Hi ${lead.name}, welcome! 👋</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
              Thank you for showing interest in our services. Our team has received your enquiry and will be reaching out to you shortly.
            </p>
            <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
              In the meantime, if you have any urgent questions feel free to reply directly to this email or contact us @ +91 99942 25990.
            </p>

            <!-- Highlight box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf9;border-left:4px solid #14b8a6;border-radius:0 8px 8px 0;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;color:#0f766e;font-size:14px;font-weight:600;">What happens next?</p>
                  <p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.6;">
                    One of our team members will contact you within 1–2 business days to discuss your requirements in detail.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              This email was sent to <strong>${lead.email}</strong> because you recently submitted an enquiry with us.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function composeHtml(lead, subject, body) {
  // Safely convert plain text body → HTML (escape entities, preserve line breaks)
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:36px 40px 28px;">
            <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">LeadFlow</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Lead Management Platform</p>
          </td>
        </tr>

        <!-- Subject + Body -->
        <tr>
          <td style="padding:36px 40px 32px;">
            <h2 style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:600;line-height:1.3;">${subject}</h2>
            <div style="color:#475569;font-size:15px;line-height:1.8;">${escaped}</div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              This message was sent to <strong>${lead.email}</strong> via the LeadFlow platform.
              If you have questions, reply directly to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Internal helper — called on lead creation and by bulk endpoint
async function sendWelcomeMailToLead(lead, sentByUserId = null) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return

  const subject = `Welcome to LeadFlow, ${lead.name}!`
  const transporter = createTransporter()

  let status = 'sent'
  let smtpError = null

  try {
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      lead.email,
      subject,
      html:    welcomeHtml(lead),
    })
  } catch (err) {
    status = 'failed'
    smtpError = err.message
  }

  // Best-effort log — never throw
  await EmailLog.create({
    lead:    lead._id,
    to:      lead.email,
    subject,
    body:    `Welcome email sent to ${lead.name}`,
    sentBy:  sentByUserId || null,
    status,
    error:   smtpError || null,
  }).catch(() => {})

  return { status, error: smtpError }
}
exports.sendWelcomeMailToLead = sendWelcomeMailToLead

// POST /leads/email/welcome/bulk
exports.bulkSendWelcome = async (req, res, next) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return errorResponse(res, 503, 'Email service is not configured. Add SMTP credentials to .env')
    }

    const allLeads = await Lead.find({ isDeleted: false }).select('_id name email').lean()

    // Leads that already got a welcome email (sent successfully)
    const alreadySentIds = await EmailLog.distinct('lead', {
      subject: { $regex: /^Welcome to LeadFlow/i },
      status:  'sent',
    })
    const alreadySentSet = new Set(alreadySentIds.map(String))

    const pending = allLeads.filter((l) => !alreadySentSet.has(String(l._id)))

    if (!pending.length) {
      return successResponse(res, 200, 'All leads have already received a welcome email', {
        sent: 0, failed: 0, skipped: allLeads.length,
      })
    }

    let sent = 0
    let failed = 0
    for (const lead of pending) {
      const result = await sendWelcomeMailToLead(lead, req.user?._id)
      if (result?.status === 'sent') sent++
      else failed++
    }

    successResponse(res, 200,
      `Done — ${sent} sent, ${failed} failed, ${alreadySentSet.size} already sent`,
      { sent, failed, skipped: alreadySentSet.size }
    )
  } catch (err) {
    next(err)
  }
}

// POST /leads/:leadId/email
exports.sendEmail = async (req, res, next) => {
  try {
    const { to, subject, body } = req.body

    if (!to || !subject || !body) {
      return errorResponse(res, 400, 'to, subject, and body are required')
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return errorResponse(res, 503, 'Email service is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env')
    }

    const lead = await Lead.findOne({ _id: req.params.leadId, isDeleted: false })
    if (!lead) return errorResponse(res, 404, 'Lead not found')

    const transporter = createTransporter()
    let status = 'sent'
    let smtpError = null

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html: composeHtml(lead, subject, body),
        text: body,
      })
    } catch (err) {
      status = 'failed'
      smtpError = err.message
    }

    await EmailLog.create({
      lead: lead._id,
      to,
      subject,
      body,
      sentBy: req.user._id,
      status,
      error: smtpError,
    })

    if (status === 'failed') {
      return errorResponse(res, 502, `Email delivery failed: ${smtpError}`)
    }

    await logActivity({
      lead: lead._id,
      action: 'email_sent',
      performedBy: req.user._id,
      details: { to, subject, preview: body.substring(0, 120) },
    })

    successResponse(res, 200, 'Email sent successfully')
  } catch (err) {
    next(err)
  }
}

// GET /leads/:leadId/email
exports.getEmailsByLead = async (req, res, next) => {
  try {
    const logs = await EmailLog.find({ lead: req.params.leadId })
      .populate('sentBy', 'name email')
      .sort('-createdAt')
      .lean()

    successResponse(res, 200, 'Email logs fetched', logs)
  } catch (err) {
    next(err)
  }
}
