import { getTwilioDevice } from "./twilioDevice";
export const call = {
    async dial(phoneNumber) {
        const device = await getTwilioDevice();
        return device.connect({ params: { To: phoneNumber } });
    },
    async hangup() {
        if (window.twilioDevice) {
            const calls = window.twilioDevice.calls;
            calls.forEach((call) => call.disconnect());
        }
    },
};
