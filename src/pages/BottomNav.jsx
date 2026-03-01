import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [float, setFloat] = useState(false);

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
        className="flex justify-around items-center mx-4 mb-2 bg-purple-950 border border-purple-500 rounded-2xl px-4 py-3 shadow-lg shadow-purple-900"
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
      <div className="border-t border-purple-900 px-4 py-2 text-center">
        <p className="text-white text-xs">
          @ 2025 Phameme Corp. All rights reserved
        </p>
        <p className="text-white text-xs">
          contact@phameme.com | 서울툭별시 강남구 테헤란로 123
        </p>
      </div>
    </div>
  );
}

export default BottomNav;
