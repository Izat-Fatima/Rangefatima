require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---- CORS ----
// In production, set ALLOWED_ORIGIN in your .env to your real storefront domain,
// e.g. ALLOWED_ORIGIN=https://rangefatima.com
// Using '*' works for testing but allows any website to call this endpoint.
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

// ---- Mailer ----
// Uses Gmail SMTP with an App Password (not your normal Gmail password).
// Generate one at https://myaccount.google.com/apppasswords (requires 2-Step Verification).
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Rang-e-Fatima order backend is running.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/order', async (req, res) => {
  try {
    const order = req.body;

    if (!order || !order.customer || !order.items || !order.total) {
      return res.status(400).json({ ok: false, error: 'Missing required order fields.' });
    }

    const {
      id, customer, items, subtotal, deliveryCharge, total,
      notes, paymentMethod, paymentReference,
    } = order;

    const itemsList = (items || [])
      .map((it) => `  - ${it.title} x${it.qty || 1} — PKR ${Number(it.price * (it.qty || 1)).toLocaleString()}`)
      .join('\n');

    const textBody = [
      `NEW ORDER — Rang-e-Fatima`,
      ``,
      `Order ID: ${id || 'N/A'}`,
      `Customer: ${customer.name || ''}`,
      `Email: ${customer.email || ''}`,
      `Phone: ${customer.phone || ''}`,
      `Address: ${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''} ${customer.zip || ''}, ${customer.country || ''}`,
      ``,
      `Items:`,
      itemsList || '  (none)',
      ``,
      `Subtotal: PKR ${Number(subtotal || 0).toLocaleString()}`,
      `Delivery: ${deliveryCharge ? 'PKR ' + Number(deliveryCharge).toLocaleString() : 'Free'}`,
      `Total: PKR ${Number(total || 0).toLocaleString()}`,
      ``,
      `Payment Method: ${paymentMethod || 'N/A'}`,
      `Payment Reference: ${paymentReference || 'N/A'}`,
      notes ? `\nNotes: ${notes}` : '',
    ].join('\n');

    await transporter.sendMail({
      from: `"Rang-e-Fatima Orders" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      replyTo: customer.email || undefined,
      subject: `New Order from ${customer.name || 'a customer'} — Rang-e-Fatima`,
      text: textBody,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send order email:', err);
    res.status(500).json({ ok: false, error: 'Failed to send notification email.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rang-e-Fatima order backend listening on port ${PORT}`);
});
