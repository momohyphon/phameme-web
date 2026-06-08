const { onRequest } = require("firebase-functions/v2/https");
const fetch = require("node-fetch");

// Gemini API 키 - 서버에서 관리하므로 브라우저에 노출되지 않음
const GEMINI_KEY = "AIzaSyDURtlyHvWMED1Va9mnggtkylkpATTf8m8";

// getAiPrice - 이미지 URL을 받아 Gemini API로 중고가 추정 후 반환하는 함수
exports.getAiPrice = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    console.log("함수 진입 확인"); // 함수 실행 여부 확인
    console.log("req.body:", JSON.stringify(req.body)); // body 내용 확인

    try {
      const { imageUrl } = req.body;
      console.log("imageUrl 수신:", imageUrl); // 이미지 URL 확인용

      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.buffer();
      const base64 = buffer.toString("base64");
      const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "이 패션 아이템의 한국 중고 시세를 추정해줘. 반드시 최소금액 ~ 최대금액 형식으로만 답해줘. 예시: 30000 ~ 60000. 다른 설명은 절대 쓰지 마." },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            }],
          }),
        }
      );

      const data = await geminiRes.json();
      console.log("Gemini 응답:", JSON.stringify(data)); // Gemini 응답 전체 확인용
      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "분석 불가";
      res.json({ price: result });

    } catch (err) {
      console.error("getAiPrice error:", err); // 에러 내용 확인용
      res.status(500).json({ price: "오류" });
    }
  }
);