import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  arrayUnion,
} from "firebase/firestore";

function ChatRoom() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  // 메시지 목록 - Firestore messages 컬렉션에서 실시간으로 불러옴
  const [messages, setMessages] = useState([]);
  // 입력창 텍스트
  const [inputText, setInputText] = useState("");
  // 상대방 유저 정보 - 이메일/프로필 사진 표시용
  const [otherUser, setOtherUser] = useState(null);
  // 실제 채팅방 ID - new면 메시지 전송시 생성
  const [actualChatId, setActualChatId] = useState(null);
  const navigate = useNavigate();
  // URL 파라미터에서 chatId 추출
  const { chatId } = useParams();
  // [수정] 쿼리파라미터에서 targetId 추출 - 새 채팅방일 때 상대방 uid
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get("targetId");

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentColor = neonColors[colorIndex];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // [수정] chatId가 new면 targetId로 상대방 정보만 불러옴
      // 실제 채팅방은 메시지 전송시 생성
      if (chatId === "new") {
        if (!targetId) return;
        const otherDoc = await getDoc(doc(db, "users", targetId));
        if (otherDoc.exists()) {
          setOtherUser(otherDoc.data());
        }
        return;
      }

      // 기존 채팅방 진입시 상대방 정보 + 메시지 구독
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (!chatDoc.exists()) return;

      setActualChatId(chatId);

      const participants = chatDoc.data().participants;
      const otherUid = participants.find((uid) => uid !== user.uid);
      const otherDoc = await getDoc(doc(db, "users", otherUid));
      if (otherDoc.exists()) {
        setOtherUser(otherDoc.data());
      }

      // messages 실시간 구독 - desc 정렬로 최신 메시지 위에 표시
      const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "desc"),
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);

        // [수정] 채팅방 진입시 상대방이 보낸 메시지 읽음 처리
        // readBy 배열에 내 uid 추가
        snapshot.docs.forEach(async (d) => {
          const mdata = d.data();
          if (mdata.senderId !== user.uid &&
            (!mdata.readBy || !mdata.readBy.includes(user.uid))) {
            await updateDoc(doc(db, "chats", chatId, "messages", d.id), {
              readBy: arrayUnion(user.uid),
            });
          }
        });
      });

      return () => unsub();
    });
    return () => unsubscribe();
  }, [chatId]);

  // 메시지 전송 핸들러
  const handleSend = async () => {
    if (!inputText.trim() || !currentUser) return;

    const text = inputText.trim();
    setInputText("");

    let roomId = actualChatId;

    // [수정] chatId가 new면 메시지 전송시 채팅방 생성
    if (chatId === "new" && !actualChatId) {
      const chatRef = await addDoc(collection(db, "chats"), {
        participants: [currentUser.uid, targetId],
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
      });
      roomId = chatRef.id;
      setActualChatId(roomId);

      // 새로 생성된 채팅방 메시지 구독 시작
      const q = query(
        collection(db, "chats", roomId, "messages"),
        orderBy("createdAt", "desc"),
      );
      onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
      });
    }

    // messages 서브컬렉션에 메시지 추가
    await addDoc(collection(db, "chats", roomId, "messages"), {
      text,
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      // [수정] readBy 배열 - 보낸 사람은 자동으로 읽음 처리
      readBy: [currentUser.uid],
    });

    // 채팅방 문서 마지막 메시지 업데이트
    await updateDoc(doc(db, "chats", roomId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    });
  };

  // 시간 포맷 함수 - HH:MM 형식
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* 헤더 - 상대방 정보 표시 */}
      <header
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="border-b px-4 py-3 flex items-center gap-3"
      >
        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate("/chatlist")}
          style={{ color: currentColor }}
          className="text-sm font-bold"
        >
          ←
        </button>
        {/* 상대방 프로필 사진 */}
        <div
          style={{ borderColor: currentColor }}
          className="w-8 h-8 rounded-full border overflow-hidden flex items-center justify-center"
        >
          {otherUser?.photoURL ? (
            <img src={otherUser.photoURL} className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: currentColor }} className="text-xs">사진</span>
          )}
        </div>
        {/* 상대방 아이디 */}
        <p style={{ color: currentColor }} className="text-sm font-bold">
          @{otherUser?.email?.split("@")[0]}
        </p>
      </header>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser?.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-xs flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div
                  style={
                    isMine
                      ? { backgroundColor: currentColor }
                      : { borderColor: currentColor, border: `1px solid ${currentColor}` }
                  }
                  className={`px-3 py-2 rounded-2xl text-sm ${isMine ? "text-white" : ""}`}
                >
                  <p style={isMine ? {} : { color: currentColor }}>{msg.text}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 메시지 입력창 - 하단 고정 */}
      <div
        style={{ borderColor: currentColor }}
        className="fixed bottom-16 left-0 right-0 border-t bg-white px-4 py-2 flex gap-2"
      >
        <input
          type="text"
          placeholder="메시지 입력"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          style={{ borderColor: currentColor }}
          className="flex-1 border rounded-full px-3 py-1 text-xs outline-none"
        />
        <button
          onClick={handleSend}
          style={{ backgroundColor: currentColor }}
          className="text-white px-4 py-1 rounded-full text-xs"
        >
          전송
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;