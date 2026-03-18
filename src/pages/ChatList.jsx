import { useState, useEffect, useRef } from "react";
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
} from "firebase/firestore";

function ChatList() {
  // 네온 색상 배열 - 2초마다 순환하며 UI 색상 변경
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];

  // 현재 네온 색상 인덱스 상태값
  const [colorIndex, setColorIndex] = useState(0);

  // 현재 로그인한 유저 정보 상태값
  const [currentUser, setCurrentUser] = useState(null);

  // 채팅방 목록 상태값 - chatId, 상대방 정보, 마지막 메시지, 읽지 않음 여부 포함
  const [chatRooms, setChatRooms] = useState([]);

  const navigate = useNavigate();

  // onSnapshot unsub를 useEffect 외부에서 관리하기 위한 ref
  // onAuthStateChanged 콜백 내부에서 return () => unsub() 하면
  // React useEffect 클린업으로 등록되지 않아 리스너가 중복 등록되는 버그 방지
  const roomsUnsubRef = useRef(null);

  // 네온 색상 2초마다 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 현재 적용할 네온 색상
  const currentColor = neonColors[colorIndex];

  // 로그인 상태 감지 + 내 채팅방 목록 실시간 구독
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // 비로그인 상태면 로그인 페이지로 이동
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // 이전 onSnapshot 구독이 남아있으면 먼저 해제
      if (roomsUnsubRef.current) {
        roomsUnsubRef.current();
        roomsUnsubRef.current = null;
      }

      // chats 컬렉션에서 내가 참여한 채팅방 실시간 구독
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );

      // unsub를 ref에 저장하여 useEffect 클린업에서 정상 해제 가능하게 함
      roomsUnsubRef.current = onSnapshot(q, async (snapshot) => {
        const rooms = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();

            // participants 배열에서 내 uid를 제외한 상대방 uid 추출
            const otherUid = data.participants.find((uid) => uid !== user.uid);

            // otherUid가 없으면 해당 채팅방 스킵 - undefined 방어 처리
            if (!otherUid) return null;

            // 상대방 유저 정보 Firestore에서 불러오기
            const otherDoc = await getDoc(doc(db, "users", otherUid));
            const otherData = otherDoc.exists() ? otherDoc.data() : {};

            // unreadBy 배열에 내 uid가 포함되어 있으면 읽지 않은 메시지 있음으로 판단
            // Array.isArray()로 먼저 배열 여부 확인 - 기존 문서에 필드가 없거나
            // 잘못된 타입으로 저장된 경우 .includes() 호출 시 TypeError 방지
            const unreadCount =
              Array.isArray(data.unreadBy) && data.unreadBy.includes(user.uid)
                ? 1
                : 0;

            return {
              chatId: d.id,
              otherUid,
              otherEmail: otherData.email || "",
              otherPhoto: otherData.photoURL || null,
              lastMessage: data.lastMessage || "",
              lastMessageAt: data.lastMessageAt || null,
              // 읽지 않은 메시지 존재 여부 - 1이면 뱃지 표시
              unreadCount,
            };
          })
        );

        // null 제거 - otherUid가 없는 채팅방 제외
        const validRooms = rooms.filter((r) => r !== null);

        // 실제 메시지가 있는 채팅방만 표시
        const filteredRooms = validRooms.filter((r) => r.lastMessage !== "");

        // 마지막 메시지 시간 기준 최신순 정렬
        filteredRooms.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return b.lastMessageAt.toDate() - a.lastMessageAt.toDate();
        });

        setChatRooms(filteredRooms);
      });
    });

    // useEffect 클린업: onAuthStateChanged 해제 + onSnapshot 해제
    return () => {
      unsubscribe();
      if (roomsUnsubRef.current) {
        roomsUnsubRef.current();
        roomsUnsubRef.current = null;
      }
    };
  }, []);

  // 날짜 포맷 함수 - 오늘이면 시간만, 아니면 날짜만 표시
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    // 오늘 날짜와 같으면 시간만 표시
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      // HH:MM 형식
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    // 오늘이 아니면 MM.DD 형식
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="border-b px-4 py-3 flex items-center gap-3"
      >
        {/* 뒤로가기 버튼 - 홈으로 이동 */}
        <button
          onClick={() => navigate("/")}
          style={{ color: currentColor }}
          className="text-sm font-bold"
        >
          ←
        </button>
        <p style={{ color: currentColor }} className="text-sm font-bold">Home</p>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-32">
        {chatRooms.length === 0 ? (
          // 채팅방 없을 때 안내 문구
          <p style={{ color: currentColor }} className="text-center text-sm mt-10">
            아직 대화가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {chatRooms.map((room) => (
              // 채팅방 항목 클릭시 해당 채팅방으로 이동
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
                  {/* 상대방 아이디 */}
                  <p style={{ color: currentColor }} className="text-sm font-bold truncate">
                    @{room.otherEmail?.split("@")[0]}
                  </p>
                  {/* 마지막 메시지 미리보기 */}
                  <p className="text-xs text-gray-400 truncate">{room.lastMessage}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* 마지막 메시지 시간 */}
                  <span style={{ color: currentColor }} className="text-xs">
                    {formatTime(room.lastMessageAt)}
                  </span>
                  {/* 읽지 않은 메시지 뱃지 - unreadCount가 1 이상일 때만 표시 */}
                  {room.unreadCount > 0 && (
                    <span
                      style={{ backgroundColor: currentColor }}
                      className="text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      N
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