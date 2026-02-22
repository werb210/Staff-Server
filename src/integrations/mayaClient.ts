import axios from "axios";

export async function callMaya(
  endpoint: string,
  payload: Record<string, unknown>,
  correlationId: string
): Promise<unknown> {
  const response = await axios.post(
    `${process.env.MAYA_INTERNAL_URL}${endpoint}`,
    payload,
    {
      headers: {
        "X-Internal-Secret": process.env.ML_INTERNAL_SECRET,
        "X-Correlation-Id": correlationId,
      },
    }
  );

  return response.data;
}
