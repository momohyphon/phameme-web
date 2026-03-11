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
    <>
      {/* 탭 카드 - z-50으로 사진 위에 표시 */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50" style={{ bottom: "3rem" }}>
        <div
          style={{
            transform: float ? "translateY(-3px)" : "translateY(0px)",
            transition: "transform 0.8s ease-in-out",
            borderColor: currentColor,
          }}
          className="flex justify-around items-center bg-white border-2 rounded-2xl px-4 py-2 shadow-2xl"
        >
          <button onClick={() => navigate("/")} style={{ color: currentColor }} className="flex-1 text-center">
            <span className="text-xs">Home</span>
          </button>
          <button onClick={() => navigate("/notifications")} style={{ color: currentColor }} className="flex-1 text-center">
            <span className="text-xs">Alerts</span>
          </button>
          <button onClick={() => navigate("/mypage")} style={{ color: currentColor }} className="flex-1 text-center">
            <span className="text-xs">Upload</span>
          </button>
          <button onClick={() => navigate("/mypage")} style={{ color: currentColor }} className="flex-1 text-center">
            <span className="text-xs">Member</span>
          </button>
        </div>
      </div>

      {/* 하단 구분선 - z 없이 사진 뒤로 */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-lg px-4 text-center"
        style={{ bottom: "0", borderTop: `1px solid ${currentColor}`, paddingTop: "0.5rem", paddingBottom: "0.5rem", backgroundColor: "white" }}
      >
        <p className="text-black text-xs">@ 2025 Phameme Corp. All rights reserved</p>
      </div>
    </>
  );
}

export default BottomNav;