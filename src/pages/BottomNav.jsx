import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { float, setFloat } = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFloat((prev) => !prev);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0">
      <div
        style={{
          transform: float ? "translateY(-6px)" : "translateY(0px)",
          transition: "transform 0.8s ease-in-out",
        }}
        className="flex justify-around items-center mx-4 mb-2 bg-purple-950 border border-purple-500 rounded-2xl px-4 py-3 shadow-purple-900"
      >
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center gap-1 ${
            location.pathname === "/" ? "text-purple-400" : "text-purple-700"
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs">홈</span>
        </button>

        {/* 업로드버튼 */}
        <button
          onClick={() => navigate("/upload")}
          className={`flex flex-col items-center gap-1 ${
            location.pathname === "/upload"
              ? "text-purple-400"
              : "text-purple-700"
          }`}
        >
          {/* 업로드 버튼 강조 */}
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500">
            <span className="text-xl text-white">+</span>
          </div>
        </button>

        {/* 마이페이지 버튼 */}
        <button
          onClick={() => navigate("/mypage")}
          className={`flex flex-col items-center gap-1 ${
            location.pathname === "/mypage"
              ? "text-purple-400"
              : "text-purple-700"
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs">마이페이지</span>
        </button>
      </div>

      {/* 하단 구분선 */}
      <div className></div>
    </div>
  );
}
