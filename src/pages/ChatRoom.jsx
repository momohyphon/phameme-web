import { useState, useEffect, useRef } from "react";
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
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";

function ChatRoom() {
  // 네온 색상 배열 - 2초마다 순환하며 UI 색상 변경
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  // 현재 네온 색상 인덱스
  const [colorIndex, setColorIndex] = useState(0);
  // 현재 로그인한 유저 정보
  const [currentUser, setCurrentUser] = useState(null);
  // 메시지 목록 - Firestore messages 컬렉션에서 실시간으로 불러옴
  const [messages, setMessages] = useState([]);
  // 입력창 텍스트
  const [inputText, setInputText] = useState("");
  // 상대방 유저 정보 - 이메일/프로필 사진 표시용
  const [otherUser, setOtherUser] = useState(null);
  // 실제 채팅방 ID - new면 메시지 전송시 생성
  const [actualChatId, setActualChatId] = useState(null);
  // 상대방 uid - unreadBy 업데이트에 사용
  const [otherUid, setOtherUid] = useState(null);
  const navigate = useNavigate();
  // URL 파라미터에서 chatId 추출
  const { chatId } = useParams();
  // 쿼리파라미터에서 targetId 추출 - 새 채팅방일 때 상대방 uid
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get("targetId");
  // 메시지 맨 아래로 스크롤하기 위한 ref
  const bottomRef = useRef(null);

  // 네온 색상 2초마다 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 새 메시지 올 때 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 현재 적용할 네온 색상
  const currentColor = neonColors[colorIndex];

  // 로그인 상태 감지 + 채팅방 데이터 로드
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 비로그인 상태면 로그인 페이지로 이동
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // chatId가 new면 targetId로 상대방 정보만 불러옴
      if (chatId === "new") {
        if (!targetId) return;
        const otherDoc = await getDoc(doc(db, "users", targetId));
        if (otherDoc.exists()) {
          setOtherUser(otherDoc.data());
        }
        // 새 채팅방일 때 otherUid는 targetId
        setOtherUid(targetId);
        return;
      }

      // 기존 채팅방 진입시 채팅방 문서 불러오기
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (!chatDoc.exists()) return;

      setActualChatId(chatId);

      // 채팅방 진입시 unreadBy에서 내 uid 제거 - 읽음 처리
      await updateDoc(doc(db, "chats", chatId), {
        unreadBy: arrayRemove(user.uid),
      });

      // participants 배열에서 내 uid를 제외한 상대방 uid 추출
      const participants = chatDoc.data().participants;
      const foundOtherUid = participants.find((uid) => uid !== user.uid);
      setOtherUid(foundOtherUid);

      // 상대방 유저 정보 불러오기
      const otherDoc = await getDoc(doc(db, "users", foundOtherUid));
      if (otherDoc.exists()) {
        setOtherUser(otherDoc.data());
      }

      // messages 컬렉션 실시간 구독 - asc 정렬로 최신 메시지 아래 표시
      const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "asc"),
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);

        // 상대방이 보낸 메시지 읽음 처리 - readBy 배열에 내 uid 추가
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
    // 입력창 즉시 비우기
    setInputText("");

    let roomId = actualChatId;

    // chatId가 new면 메시지 전송시 채팅방 생성
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
        orderBy("createdAt", "asc"),
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
      // 보낸 사람은 자동으로 읽음 처리
      readBy: [currentUser.uid],
    });

    // 채팅방 문서 업데이트 - 마지막 메시지 + 상대방 unreadBy 추가
    await updateDoc(doc(db, "chats", roomId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      unreadBy: arrayUnion(otherUid),
    });
  };

  // 시간 포맷 함수 - HH:MM 형식
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="bg-white text-black flex flex-col" style={{ height: "100dvh" }}>
      {/* 헤더 - 스크롤해도 상단 고정 */}
      <header
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0"
      >
        {/* 뒤로가기 버튼 - 대화목록 텍스트 추가 */}
        <button
          onClick={() => navigate("/chatlist")}
          style={{ color: currentColor }}
          className="text-sm font-bold flex items-center gap-1"
        >
          ← <span>대화목록</span>
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
        <p style={{ color: currentColor }} className="text-sm font-bold flex-1">
          @{otherUser?.email?.split("@")[0]}
        </p>
        {/* 나가기 버튼 - leftBy 필드에 내 uid 추가
             participants 건드리지 않아서 데이터 보존 */}
        <button
          onClick={async () => {
            if (!currentUser || !actualChatId) return;
            const confirmed = window.confirm("나가기 버튼을 누르면 대화목록에서 삭제됩니다. 나가시겠습니까?");
            if (!confirmed) return;
            await deleteDoc(doc(db, "chats", actualChatId))
            navigate("/chatlist");
          }}
          style={{ color: currentColor }}
          className="text-xs font-bold"
        >
          나가기
        </button>
      </header>

      {/* 메시지 목록 - flex-1으로 남은 공간 채움 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          // 내가 보낸 메시지인지 여부
          const isMine = msg.senderId === currentUser?.uid;
          return (
            <div
              key={msg.id}
              // 내 메시지는 오른쪽, 상대방 메시지는 왼쪽 정렬
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              {/* 상대방 메시지 왼쪽에 프로필사진 + 아이디 표시 */}
              {!isMine && (
                <div className="flex flex-col items-center mr-2 flex-shrink-0">
                  <div
                    style={{ borderColor: currentColor }}
                    className="w-7 h-7 rounded-full border overflow-hidden flex items-center justify-center"
                  >
                    {otherUser?.photoURL ? (
                      <img src={otherUser.photoURL} className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ color: currentColor }} className="text-xs">사진</span>
                    )}
                  </div>
                  <span style={{ color: currentColor }} className="text-xs mt-1">
                    @{otherUser?.email?.split("@")[0]}
                  </span>
                </div>
              )}
              <div className={`max-w-xs flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                {/* 메시지 말풍선
                    내 메시지: 네온 컬러 배경 + 흰 글자
                    상대 메시지: 흰 배경 + 네온 컬러 테두리/글자 */}
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
                {/* 전송 시간 */}
                <span className="text-xs text-gray-400 mt-1">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        {/* 스크롤 앵커 - 새 메시지 올 때 여기로 스크롤 */}
        <div ref={bottomRef} />
      </div>

      {/* 메시지 입력창 - 하단 고정 */}
      <div
        style={{ borderColor: currentColor }}
        className="border-t bg-white px-4 py-2 flex gap-2 flex-shrink-0"
      >
        <input
          type="text"
          placeholder="메시지 입력"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          // 엔터키로도 전송 가능
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          style={{ borderColor: currentColor }}
          className="flex-1 border rounded-full px-3 py-3 text-xs outline-none"
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