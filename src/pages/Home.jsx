import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,      // Firestore 컬렉션 참조 생성 함수
  getDocs,         // Firestore 컬렉션 전체 문서 1회 조회 함수
  query,           // Firestore 쿼리 생성 함수
  getDoc,          // Firestore 단일 문서 1회 조회 함수
  doc,             // Firestore 문서 참조 생성 함수
  setDoc,          // Firestore 문서 생성/덮어쓰기 함수
  deleteDoc,       // Firestore 문서 삭제 함수
  where,           // Firestore 쿼리 조건 함수
  onSnapshot,      // Firestore 실시간 구독 함수
  updateDoc,       // Firestore 문서 특정 필드만 업데이트 함수
} from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function Home() {
  // 네온 색상 배열 - 2초마다 순환하며 UI 전체 색상 변경에 사용
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  // 현재 네온 색상 배열의 인덱스
  const [colorIndex, setColorIndex] = useState(0);
  // React Router 페이지 이동 함수
  const navigate = useNavigate();
  // 피드 카드 목록
  const [cards, setCards] = useState([]);
  // 각 카드별 현재 표시 중인 사진 인덱스
  const [activeIndex, setActiveIndex] = useState({});
  // 현재 로그인한 Firebase Auth 유저 객체
  const [currentUser, setCurrentUser] = useState(null);
  // 팔로우 상태 맵
  const [followMap, setFollowMap] = useState({});
  // 읽지 않은 메시지가 있는 상대방 uid 목록
  const [unreadUids, setUnreadUids] = useState([]);
  // 판매 정보 모달 표시 여부 - true면 모달 표시
  const [showInfoModal, setShowInfoModal] = useState(false);
  // 모달에 표시할 카드 정보 - 클릭한 카드의 아이템 정보 저장
  const [modalCard, setModalCard] = useState(null);

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 네온 색상 2초마다 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 읽지 않은 메시지 실시간 구독
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const uids = snapshot.docs
        .filter((d) => d.data().unreadBy && d.data().unreadBy.includes(currentUser.uid))
        .map((d) => d.data().participants.find((uid) => uid !== currentUser.uid));
      setUnreadUids(uids);
    });
    return () => unsub();
  }, [currentUser]);

  // 팔로우/언팔로우 처리 함수
  const handleFollow = async (targetUserId) => {
    if (!currentUser) { navigate("/login"); return; }
    const followId = `${currentUser.uid}_${targetUserId}`;
    const followRef = doc(db, "follows", followId);
    if (followMap[targetUserId]) {
      await deleteDoc(followRef);
      setFollowMap((prev) => ({ ...prev, [targetUserId]: false }));
    } else {
      await setDoc(followRef, {
        followerId: currentUser.uid,
        followingId: targetUserId,
        createdAt: new Date(),
      });
      setFollowMap((prev) => ({ ...prev, [targetUserId]: true }));
    }
  };

  // 채팅방 이동 함수
  const handleChat = async (targetUserId) => {
    if (!currentUser) { navigate("/login"); return; }
    const chatsSnap = await getDocs(
      query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid))
    );
    const existing = chatsSnap.docs.find((d) => d.data().participants.includes(targetUserId));
    if (existing) {
      navigate(`/chatroom/${existing.id}`);
    } else {
      navigate(`/chatroom/new?targetId=${targetUserId}`);
    }
  };

  // 조회수 증가 함수 - 티커 영역 클릭시 호출
  const handleViewCount = async (cardId, currentViews) => {
    const newViews = (currentViews || 0) + 1;
    await updateDoc(doc(db, "categories", cardId), { views: newViews });
    // 로컬 state도 즉시 업데이트 - Firestore 재조회 없이 UI 반영
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, views: newViews } : c)));
  };

  // 날짜 포맷 함수
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  // 피드 카드 데이터 로드
  useEffect(() => {
    const fetchCards = async () => {
      const q = query(collection(db, "categories"));
      const snapshot = await getDocs(q);
      const cardList = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.());

      const profiles = {};
      for (const card of cardList) {
        if (!profiles[card.userId]) {
          const userDoc = await getDoc(doc(db, "users", card.userId));
          if (userDoc.exists()) {
            profiles[card.userId] = userDoc.data().photoURL;
          }
        }
      }

      const cardsWithPhotos = cardList
        .map((card) => {
          const photos = (card.slots || []).filter(
            (slot) => slot !== null && typeof slot === "string"
          );
          return { ...card, photos, profilePhoto: profiles[card.userId] || null };
        })
        .filter((card) => card.photos.length > 0);

      setCards(cardsWithPhotos);

      if (currentUser) {
        const followSnap = await getDocs(collection(db, "follows"));
        const map = {};
        followSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.followerId === currentUser.uid) map[data.followingId] = true;
        });
        setFollowMap(map);
      }
    };
    fetchCards();
  }, [currentUser]);

  // 현재 적용할 네온 색상
  const currentColor = neonColors[colorIndex];

  return (
    <div className="min-h-screen bg-white text-black">
      {/* marquee 애니메이션 CSS 전역 정의 */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-content { display: inline-block; animation: marquee 14s linear infinite; }
      `}</style>

      <header
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="border-b px-4 pt-6 pb-3 flex justify-between items-center"
      >
        <h1
          style={{ color: currentColor, transition: "color 1s ease" }}
          className="text-xl font-bold tracking-widest"
        >
          Phameme
        </h1>
        <button
          style={{ borderColor: currentColor, color: currentColor, transition: "border-color 1s ease, color 1s ease" }}
          className="border px-4 rounded-full transition"
          onClick={() => (currentUser ? signOut(auth) : navigate("/login"))}
        >
          {currentUser ? "로그아웃" : "로그인"}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        <div className="space-y-10">
          {cards.length === 0 ? (
            <p style={{ color: currentColor }} className="text-center text-sm">
              아직 게시물이 없어요!
            </p>
          ) : (
            cards.map((card) => {
              // 현재 카드에서 표시 중인 사진 인덱스
              const currentIdx = activeIndex[card.id] ?? 0;

              // Chat 버튼 배경색 여부 결정
              const hasDmAlert =
                currentUser?.uid === card.userId
                  ? unreadUids.length > 0
                  : unreadUids.includes(card.userId);

              // 티커에 표시할 텍스트 조합
              // 값 있는 항목만 표시, 기타사항은 "기타사항: 클릭시 열람" 고정 문구
              const tickerParts = [
                card.title ? `제목: ${card.title}` : "",
                card.productName ? `제품명: ${card.productName}` : "",
                card.modelName ? `모델명: ${card.modelName}` : "",
                card.purchaseYear ? `구입년도: ${card.purchaseYear}` : "",
                card.price ? `판매가격: ${Number(card.price).toLocaleString()}원` : "",
                card.notes ? "기타사항: 클릭시 열람" : "",
              ].filter(Boolean).join("   |   "); // | 구분자로 연결

              return (
                <div key={card.id} className="overflow-hidden shadow-md rounded-xl">

                  {/* 카드 상단 - 프로필사진, 아이디, 팔로우, Chat 버튼, 날짜 */}
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ backgroundColor: "white" }}
                  >
                    <div className="flex items-center gap-2">
                      {/* 프로필사진 */}
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {card.profilePhoto && (
                          <img src={card.profilePhoto} className="w-full h-full object-cover" />
                        )}
                      </div>
                      {/* 유저 아이디 */}
                      <span style={{ color: currentColor }} className="text-sm font-semibold">
                        @{card.userEmail?.split("@")[0]}
                      </span>
                      {/* 팔로우 버튼 - 내 게시물에는 표시 안함 */}
                      {currentUser?.uid !== card.userId && (
                        <button
                          onClick={() => handleFollow(card.userId)}
                          style={{
                            borderColor: currentColor,
                            color: followMap[card.userId] ? "white" : currentColor,
                            backgroundColor: followMap[card.userId] ? currentColor : "transparent",
                            minWidth: "3.5rem",
                            textAlign: "center",
                          }}
                          className="border px-2 py-0.5 rounded-full text-xs transition"
                        >
                          {followMap[card.userId] ? "팔로잉" : "팔로우"}
                        </button>
                      )}
                      {/* Chat 버튼 */}
                      <button
                        onClick={() =>
                          currentUser?.uid === card.userId
                            ? navigate("/chatlist")
                            : handleChat(card.userId)
                        }
                        style={
                          hasDmAlert
                            ? { backgroundColor: currentColor, color: "white", borderColor: currentColor, minWidth: "3.5rem", textAlign: "center" }
                            : { backgroundColor: "transparent", color: currentColor, borderColor: currentColor, minWidth: "3.5rem", textAlign: "center" }
                        }
                        className="border px-2 py-0.5 rounded-full text-xs transition"
                      >
                        Chat
                      </button>
                    </div>
                    {/* 업로드 날짜 */}
                    <span style={{ color: currentColor }} className="text-xs">
                      {formatDate(card.createdAt)}
                    </span>
                  </div>

                  <div className="relative">
                    {/* 이미지 컨테이너 - 4:5.8 비율 고정, 스와이프로 사진 전환 */}
                    <div
                      className="w-full overflow-hidden cursor-grab"
                      style={{ aspectRatio: "4/5.8" }}
                      onTouchStart={(e) => {
                        e.currentTarget.dataset.startX = e.touches[0].clientX;
                      }}
                      onTouchEnd={(e) => {
                        const startX = parseFloat(e.currentTarget.dataset.startX || 0);
                        const diff = startX - e.changedTouches[0].clientX;
                        if (Math.abs(diff) < 50) return;
                        setActiveIndex((prev) => {
                          const current = prev[card.id] ?? 0;
                          if (diff > 0) return { ...prev, [card.id]: Math.min(current + 1, card.photos.length - 1) };
                          else return { ...prev, [card.id]: Math.max(current - 1, 0) };
                        });
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.dataset.startX = e.clientX;
                        e.currentTarget.dataset.dragging = "true";
                      }}
                      onMouseUp={(e) => {
                        if (e.currentTarget.dataset.dragging !== "true") return;
                        e.currentTarget.dataset.dragging = "false";
                        const startX = parseFloat(e.currentTarget.dataset.startX || 0);
                        const diff = startX - e.clientX;
                        if (Math.abs(diff) < 50) return;
                        setActiveIndex((prev) => {
                          const current = prev[card.id] ?? 0;
                          if (diff > 0) return { ...prev, [card.id]: Math.min(current + 1, card.photos.length - 1) };
                          else return { ...prev, [card.id]: Math.max(current - 1, 0) };
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.dataset.dragging = "false";
                      }}
                    >
                      <img
                        src={card.photos[currentIdx]}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </div>

                    {/* 오른쪽 사이드 썸네일 - 사진 2장 이상일 때만 표시 */}
                    {card.photos.length > 1 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                        {card.photos.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveIndex((prev) => ({ ...prev, [card.id]: idx }))}
                            className="flex-shrink-0"
                          >
                            <div
                              style={{ border: idx === currentIdx ? `2px solid ${currentColor}` : "none" }}
                              className="w-10 h-10 rounded-full overflow-hidden"
                            >
                              <img src={url} className="w-full h-full object-cover" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 하단 그라데이션 오버레이 - AI 라벨과 조회수 표시 */}
                    <div
                      className="absolute bottom-0 left-0 z-10 w-full px-4 py-3 flex justify-between items-center"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }}
                    >
                      <span style={{ color: currentColor }} className="text-sm drop-shadow font-semibold">AI</span>
                      <span style={{ color: currentColor }} className="text-xs drop-shadow font-semibold">
                        조회수 {card.views || 0}
                      </span>
                    </div>
                  </div>

                  {/* 티커 영역 - 아이템 정보 있을때만 표시
                      클릭시 조회수 +1 + 판매 정보 모달 표시 */}
                  {tickerParts && (
                    <div
                      className="ticker-wrap px-2 py-2 cursor-pointer"
                      style={{ borderTop: `1px solid ${currentColor}` }}
                      onClick={() => {
                        // 조회수 증가
                        handleViewCount(card.id, card.views);
                        // 모달에 표시할 카드 정보 저장 후 모달 열기
                        setModalCard(card);
                        setShowInfoModal(true);
                      }}
                    >
                      <span
                        className="ticker-content text-xs font-semibold"
                        style={{ color: currentColor }}
                      >
                        {tickerParts}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 판매 정보 모달 - 티커 클릭시 표시
          네온 색상 테마로 디자인된 알림창 형태 */}
      {showInfoModal && modalCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-72 overflow-hidden"
            style={{ border: `2px solid ${currentColor}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 - 네온 배경색 */}
            <div
              className="px-5 py-3"
              style={{ backgroundColor: currentColor }}
            >
              <p className="text-white text-sm font-bold text-center">
                {modalCard.title || "판매 정보"}
              </p>
            </div>

            {/* 모달 본문 - 각 항목 행으로 표시 */}
            <div className="px-5 py-4 space-y-3">
              {/* 제품명 */}
              {modalCard.productName && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">제품명</span>
                  <span style={{ color: currentColor }} className="text-xs font-semibold">
                    {modalCard.productName}
                  </span>
                </div>
              )}
              {/* 모델명 */}
              {modalCard.modelName && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">모델명</span>
                  <span style={{ color: currentColor }} className="text-xs font-semibold">
                    {modalCard.modelName}
                  </span>
                </div>
              )}
              {/* 구입년도 */}
              {modalCard.purchaseYear && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">구입년도</span>
                  <span style={{ color: currentColor }} className="text-xs font-semibold">
                    {modalCard.purchaseYear}
                  </span>
                </div>
              )}
              {/* 판매가격 */}
              {modalCard.price && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">판매가격</span>
                  <span style={{ color: currentColor }} className="text-xs font-bold text-base">
                    {Number(modalCard.price).toLocaleString()}원
                  </span>
                </div>
              )}
              {/* 구분선 */}
              {modalCard.notes && (
                <div style={{ borderTop: `1px solid ${currentColor}` }} className="opacity-30" />
              )}
              {/* 기타사항 */}
              {modalCard.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">기타사항</p>
                  <p style={{ color: currentColor }} className="text-xs leading-relaxed">
                    {modalCard.notes}
                  </p>
                </div>
              )}
            </div>

            {/* 모달 하단 - 닫기 버튼 */}
            <div className="px-5 pb-4">
              <button
                onClick={() => setShowInfoModal(false)}
                style={{ backgroundColor: currentColor }}
                className="w-full text-white text-xs py-2 rounded-full"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;