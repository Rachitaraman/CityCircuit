# SMS OTP Setup for CityCircuit

## To Receive Real SMS OTP Messages

### 1. Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up for free trial (gets $15 credit)
3. Verify your own phone number during signup

### 2. Get Your Credentials
1. Go to Twilio Console: https://console.twilio.com/
2. Copy these values:
   - **Account SID** (starts with "AC" followed by 32 characters)
   - **Auth Token** (click to reveal)

### 3. Get Phone Number
1. In Twilio Console, go to Phone Numbers > Manage > Buy a number
2. Choose a number (free with trial)
3. Copy the phone number (format: +1234567890)

### 4. Update Environment Variables
In your `.env.local` file, replace the placeholder values:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here  
TWILIO_PHONE_NUMBER=your_twilio_number_here
NODE_ENV=production
```

### 5. Test SMS
1. Restart your development server: `npm run dev`
2. Try registering with your phone number
3. You should receive actual SMS!

## Current Status
- ✅ OTP system implemented
- ✅ UI components ready
- ✅ API endpoints working
- ❌ **Need Twilio credentials** (you need to add these)
- ❌ **Need NODE_ENV=production** (to enable SMS)

## How It Works
- **Development mode**: OTP shows in console only
- **Production mode**: Real SMS sent via Twilio

## Troubleshooting
- **No SMS received**: Check Twilio credentials and phone number format
- **Console OTP only**: Make sure `NODE_ENV=production` in .env.local
- **Twilio errors**: Check account balance and phone number verification

## Cost
- Twilio trial: $15 free credit
- SMS cost: ~$0.0075 per message
- Phone number: ~$1/month

Your $15 credit = ~2000 SMS messages!

## Alternative: Test with Console OTP
If you want to test immediately without Twilio setup:
1. Keep `NODE_ENV=development` in .env.local
2. Check browser console or terminal for OTP codes
3. Enter the 6-digit code shown in console