import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

function Home() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentColor = neonColors[colorIndex];
  return (
    <div className="min-h-screen bg-white text-black">
      <header
        style={{
          borderColor: currentColor,
          transition: "border-color 1s ease",
        }}
        className="border-b px-4 pt-6 pb-3 flex justify-between items-center"
      >
        <h1
          style={{ color: currentColor, transition: "color 1s ease" }}
          className="text-xl font-bold tracking-widest"
        >
          Phameme
        </h1>

        <button
          style={{
            borderColor: currentColor,
            color: currentColor,
            transition: "border-color 1s ease, color 1s ease",
          }}
          className="border px-4 rounded-full transition"
          onClick={() => navigate("/login")}
        >
          로그인
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        <div
          style={{
            borderColor: currentColor,
            transition: "border-color 1s ease",
          }}
          className="border-2 rounded-xl p-4 mb-6 text-center shadow-md"
        >
          <p style={{ color: currentColor }} className="text-sm font-bold">
            오늘의 착샷을 올려보세요
          </p>
          <button
            style={{
              borderColor: currentColor,
              color: currentColor,
              transition: "border-color 1s ease, color 1s ease",
            }}
            className="mt-2 border px-6 py-2 rounded-full text-sm font-bold transition"
          >
            업로드
          </button>
        </div>

        <div className="space-y-6">
          <div
            style={{
              borderColor: currentColor,
              transition: "border-color 1s ease",
            }}
            className="border rounded-xl overflow-hidden shadow-md"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <div
                className="w-8 h-8 rounded-full bg-white border"
                style={{ borderColor: currentColor }}
              />
              <span style={{ color: currentColor }}>@user1</span>
            </div>

            <div className="w-full h-64 bg-white flex items-center justify-center">
              <span style={{ color: currentColor }} className="text-sm">
                사진영역
              </span>
            </div>
            <div className="p-4 py-3 flex justify-between items-center">
              <span style={{ color: currentColor }} className="text-sm">
                AI점수: 8.5
              </span>
              <span className="text-gray-400 text-xs">조회수 1,234</span>
            </div>
          </div>

          <div
            style={{
              borderColor: currentColor,
              transition: "border-color 1s ease",
            }}
            className="border rounded-xl overflow-hidden shadow-md"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <div
                className="w-8 h-8 rounded-full bg-white border"
                style={{ borderColor: currentColor }}
              />
              <span style={{ color: currentColor }} className="text-sm">
                @user2
              </span>
            </div>
            <div className="w-full h-64 bg-white flex items-center justify-center">
              <span style={{ color: currentColor }}>사진영역</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span style={{ color: currentColor }} className="text-sm">
                AI점수 7.2
              </span>
              <span className="text-gray-400 text-xs">조회수</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
