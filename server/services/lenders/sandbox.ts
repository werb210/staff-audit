export async function sendToLenderSandbox(data: any) {
  return {
    status: "mocked-success",
    lendersMatched: ["LenderA", "LenderB", "LenderC"],
    approvedAmount: data.requestedAmount,
    mock: true,
  };
}