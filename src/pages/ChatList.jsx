import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

function ChatList() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  // 채팅방 목록 - chatId, 상대방 정보, 마지막 메시지, 읽지 않은 메시지 수 포함
  const [chatRooms, setChatRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentColor = neonColors[colorIndex];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // 내가 참여한 채팅방 실시간 구독
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );

      const unsub = onSnapshot(q, async (snapshot) => {
        const rooms = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();
            const otherUid = data.participants.find((uid) => uid !== user.uid);
            const otherDoc = await getDoc(doc(db, "users", otherUid));
            const otherData = otherDoc.exists() ? otherDoc.data() : {};

            // [수정] 읽지 않은 메시지 수 - messages 서브컬렉션에서 카운트
            // senderId가 상대방이고 readBy 배열에 내 uid 없는 메시지 수
            const messagesSnap = await getDocs(
              collection(db, "chats", d.id, "messages")
            );
            const unreadCount = messagesSnap.docs.filter((m) => {
              const mdata = m.data();
              // 상대방이 보낸 메시지 중 내가 읽지 않은 것
              return mdata.senderId !== user.uid &&
                (!mdata.readBy || !mdata.readBy.includes(user.uid));
            }).length;

            return {
              chatId: d.id,
              otherUid,
              otherEmail: otherData.email || "",
              otherPhoto: otherData.photoURL || null,
              lastMessage: data.lastMessage || "",
              lastMessageAt: data.lastMessageAt || null,
              // [수정] 읽지 않은 메시지 수
              unreadCount,
            };
          })
        );

        // [수정] 실제 메시지가 있는 채팅방만 표시
        const filteredRooms = rooms.filter((r) => r.lastMessage !== "");

        // 마지막 메시지 시간 기준 최신순 정렬
        filteredRooms.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return b.lastMessageAt.toDate() - a.lastMessageAt.toDate();
        });

        setChatRooms(filteredRooms);
      });

      return () => unsub();
    });
    return () => unsubscribe();
  }, []);

  // 날짜 포맷 함수 - 오늘이면 시간만, 아니면 날짜만 표시
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="border-b px-4 py-3 flex justify-between items-center"
      >
        <h1
          style={{ color: currentColor, transition: "color 1s ease" }}
          className="text-2xl font-bold tracking-widest"
        >
          Messages
        </h1>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-32">
        {chatRooms.length === 0 ? (
          <p style={{ color: currentColor }} className="text-center text-sm mt-10">
            아직 대화가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {chatRooms.map((room) => (
              <div
                key={room.chatId}
                onClick={() => navigate(`/chatroom/${room.chatId}`)}
                style={{ borderColor: currentColor }}
                className="flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer hover:opacity-70 transition"
              >
                {/* 상대방 프로필 사진 */}
                <div
                  style={{ borderColor: currentColor }}
                  className="w-10 h-10 rounded-full border overflow-hidden flex-shrink-0 flex items-center justify-center"
                >
                  {room.otherPhoto ? (
                    <img src={room.otherPhoto} className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ color: currentColor }} className="text-xs">사진</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p style={{ color: currentColor }} className="text-sm font-bold truncate">
                    @{room.otherEmail?.split("@")[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{room.lastMessage}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* 마지막 메시지 시간 */}
                  <span style={{ color: currentColor }} className="text-xs">
                    {formatTime(room.lastMessageAt)}
                  </span>
                  {/* [수정] 읽지 않은 메시지 수 - 0보다 클때만 표시 */}
                  {room.unreadCount > 0 && (
                    <span
                      style={{ backgroundColor: currentColor }}
                      className="text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatList;