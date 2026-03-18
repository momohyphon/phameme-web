import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [float, setFloat] = useState(false);
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  // 읽지 않은 메시지 수 - Alerts 버튼 위에 표시
  const [unreadCount, setUnreadCount] = useState(0);

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

  // 로그인 상태 감지 + 읽지 않은 메시지 수 실시간 구독
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      // chats 컬렉션에서 내가 참여한 채팅방 실시간 구독
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid),
      );

      const unsubscribeChats = onSnapshot(q, (snapshot) => {
        let count = 0;
        snapshot.docs.forEach((d) => {
          const data = d.data();
          // 마지막 메시지가 상대방이 보낸 것이고 읽지 않은 경우 카운트
          // unreadBy 배열에 내 uid가 포함된 경우 읽지 않은 메시지로 처리
          if (data.unreadBy && data.unreadBy.includes(user.uid)) {
            count++;
          }
        });
        setUnreadCount(count);
      });

      return () => unsubscribeChats();
    });
    return () => unsubscribeAuth();
  }, []);

  const currentColor = neonColors[colorIndex];
  if (location.pathname.startsWith("/chatroom")) return null;

  return (
    <>
      <div style={{ backgroundColor: "white" }}>
        {/* 탭 카드 - z-50으로 사진 위에 표시 */}
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50"
          style={{ bottom: "2rem", backgroundColor: "white" }}
        >
          <div
            style={{
              transform: float ? "translateY(-3px)" : "translateY(0px)",
              transition: "transform 0.8s ease-in-out",
              borderColor: currentColor,
            }}
            className="flex justify-around items-center bg-white border-2 rounded-2xl px-4 py-2 shadow-2xl"
          >
            <button
              onClick={() => navigate("/")}
              style={{ color: currentColor }}
              className="flex-1 text-center"
            >
              <span className="text-xs">Home</span>
            </button>

            {/* [수정] Alerts 버튼 - ChatList로 연결 + 읽지 않은 메시지 수 표시 */}
            <button
              onClick={() => navigate("/chatlist")}
              style={{ color: currentColor }}
              className="flex-1 text-center relative"
            >
              <span className="relative inline-block">
                <span className="text-xs">Alerts</span>
                {/* 읽지 않은 메시지 수 - 0보다 클 때만 표시 */}
                {unreadCount > 0 && (
                  <span
                    style={{ backgroundColor: currentColor, color: "white" }}
                    className="absolute -top-2 -right-0 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {unreadCount}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => navigate("/mypage")}
              style={{ color: currentColor }}
              className="flex-1 text-center"
            >
              <span className="text-xs">Upload</span>
            </button>
            <button
              onClick={() => navigate("/mypage")}
              style={{ color: currentColor }}
              className="flex-1 text-center"
            >
              <span className="text-xs">Member</span>
            </button>
          </div>
        </div>

        {/* 하단 구분선 */}
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-lg text-center px-4 z-50"
          style={{
            bottom: "0",
            backgroundColor: "white",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            borderTop: `1px solid ${currentColor}`,
          }}
        >
          <p className="text-black text-xs">
            @ 2025 Phameme Corp. All rights reserved
          </p>
        </div>
      </div>
    </>
  );
}

export default BottomNav;
