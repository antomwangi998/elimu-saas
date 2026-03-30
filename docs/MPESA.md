# M-Pesa Integration Guide

## Daraja API Setup
1. Register at developer.safaricom.co.ke
2. Create app and get credentials
3. Set `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET`
4. Configure STK Push callback URL

## Flow
1. Parent initiates payment
2. STK Push sent to phone
3. Parent enters PIN
4. Callback received
5. Fee record auto-updated
6. Receipt SMS sent
