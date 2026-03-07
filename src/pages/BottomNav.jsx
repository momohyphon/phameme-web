import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [float, setFloat] = useState(false);
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFloat((prev) => !prev);
    }, 800);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentColor = neonColors[colorIndex];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
      <div
        style={{
          transform: float ? "translateY(-6px)" : "translateY(0px)",
          transition: "transform 0.8s ease-in-out",
          borderColor: currentColor,
        }}
        className="flex justify-around items-center bg-white border-2 rounded-2xl px-4 py-2 shadow-2xl"
      >
        <button
          onClick={() => navigate("/")}
          style={{ color: currentColor }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs">Home</span>
        </button>
        <button
          onClick={() => navigate("/notifications")}
          style={{ color: currentColor }}
          className="flex-1 text-center"
        >
          <span className="text-xs">Alerts</span>
        </button>

        {/* 마이페이지 버튼 */}
        <button
          onClick={() => navigate("/mypage")}
          style={{ color: currentColor }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs">Profile</span>
        </button>
      </div>

      {/* 하단 구분선 */}
      <div
        style={{ borderColor: currentColor }}
        className="border-t  px-4 py-2 text-center bg-white"
      >
        <p className="text-blck text-xs">
          @ 2025 Phameme Corp. All rights reserved
        </p>
        <p className="text-black text-xs">
          contact@phameme.com | 서울툭별시 강남구 테헤란로 123
        </p>
      </div>
    </div>
  );
}

export default BottomNav;
