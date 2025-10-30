export async function sendToLenderSandbox(data) {
    return {
        status: "mocked-success",
        lendersMatched: ["LenderA", "LenderB", "LenderC"],
        approvedAmount: data.requestedAmount,
        mock: true,
    };
}
