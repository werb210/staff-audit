# 📞 Inbound Call Proof - Evidence Package

## Test Overview
Testing inbound call functionality for BF and SLF silos with WebRTC integration.

## Phone Numbers Under Test
- **BF (Boreal Financial)**: (825) 451-1768
- **SLF (Site Level Financial)**: (775) 314-6801

## Required Evidence for Each Number
1. **Screen Recording (MP4)**: Incoming call popup → Accept → Audio working
2. **HAR Export**: Network traffic showing `/voice/token` 200 responses  
3. **Twilio Call Logs**: Screenshot from Twilio Console showing successful call

## Test Steps
1. Login to Staff App as authenticated user
2. Generate WebRTC token via `/api/voice/token`
3. Set up screen recording
4. Call the test number from external phone
5. Verify incoming call UI appears
6. Accept call and confirm audio works
7. Export HAR file and capture screenshots

## Expected Results
- ✅ Incoming call popup displays caller information
- ✅ Accept/Reject buttons functional  
- ✅ Audio connection established after accept
- ✅ WebRTC token generation successful (200 status)
- ✅ Twilio webhooks trigger properly

## Evidence Files
- `bf-call-test.mp4` - Screen recording of BF call
- `bf-call-test.har` - Network traffic for BF call
- `bf-twilio-logs.png` - Twilio console screenshot for BF
- `slf-call-test.mp4` - Screen recording of SLF call  
- `slf-call-test.har` - Network traffic for SLF call
- `slf-twilio-logs.png` - Twilio console screenshot for SLF

## Status
- [x] Security verification complete
- [x] Voice endpoints accessible  
- [ ] BF call test execution
- [ ] SLF call test execution
- [ ] Evidence package completion