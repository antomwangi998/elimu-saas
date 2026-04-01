// ============================================================
// M-Pesa Daraja API Service
// ============================================================
const axios = require('axios');
const logger = require('../config/logger');

const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// ── Generate Access Token ─────────────────────────────────────
const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const { data } = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
};

// ── STK Push ──────────────────────────────────────────────────
const stkPush = async ({ phone, amount, accountReference, transactionDesc, callbackUrl }) => {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl || process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference.substring(0, 12),
      TransactionDesc: transactionDesc.substring(0, 13),
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (data.ResponseCode !== '0') {
    throw new Error(data.ResponseDescription || 'STK push failed');
  }
  return data;
};

// ── Query STK Status ──────────────────────────────────────────
const queryStkStatus = async (checkoutRequestId) => {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

// ── C2B Register URLs ─────────────────────────────────────────
const registerC2BUrls = async (validationUrl, confirmationUrl) => {
  const token = await getAccessToken();
  const { data } = await axios.post(
    `${BASE_URL}/mpesa/c2b/v1/registerurl`,
    {
      ShortCode: process.env.MPESA_SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

module.exports = { getAccessToken, stkPush, queryStkStatus, registerC2BUrls };
