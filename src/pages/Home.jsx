import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, query, getDoc, doc, setDoc, deleteDoc, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function Home() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [activeIndex, setActiveIndex] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [followMap, setFollowMap] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

  // 채팅방 이동 함수 - DM 버튼 클릭시 실행
  // 기존 채팅방 있으면 이동, 없으면 new 경로로 이동하여 메시지 전송시 생성
  const handleChat = async (targetUserId) => {
    if (!currentUser) { navigate("/login"); return; }
    const chatsSnap = await getDocs(
      query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      )
    );
    const existing = chatsSnap.docs.find((d) =>
      d.data().participants.includes(targetUserId)
    );
    if (existing) {
      navigate(`/chatroom/${existing.id}`);
    } else {
      navigate(`/chatroom/new?targetId=${targetUserId}`);
    }
  };

  // 날짜 포맷 함수 - createdAt을 YYYY.MM.DD 형식으로 변환
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

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

      const cardsWithPhotos = cardList.map((card) => {
        const photos = (card.slots || []).filter((slot) => slot !== null && typeof slot === "string");
        return {
          ...card,
          photos,
          profilePhoto: profiles[card.userId] || null,
        };
      }).filter((card) => card.photos.length > 0);

      setCards(cardsWithPhotos);

      if (currentUser) {
        const followSnap = await getDocs(collection(db, "follows"));
        const map = {};
        followSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.followerId === currentUser.uid) {
            map[data.followingId] = true;
          }
        });
        setFollowMap(map);
      }
    };
    fetchCards();
  }, [currentUser]);

  const currentColor = neonColors[colorIndex];

  return (
    <div className="min-h-screen bg-white text-black">
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
          onClick={() => currentUser ? signOut(auth) : navigate("/login")}
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
              const currentIdx = activeIndex[card.id] ?? 0;
              return (
                <div
                  key={card.id}
                  className="overflow-hidden shadow-md rounded-xl"
                >
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ backgroundColor: "white" }}
                  >
                    {/* 왼쪽 - 프로필사진 + 아이디 + 팔로우 + DM */}
                    <div className="flex items-center gap-2">
                      {/* 프로필사진 */}
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {card.profilePhoto && (
                          <img src={card.profilePhoto} className="w-full h-full object-cover" />
                        )}
                      </div>
                      {/* 아이디 */}
                      <span style={{ color: currentColor }} className="text-sm font-semibold">
                        @{card.userEmail?.split("@")[0]}
                      </span>
                      {/* [수정] 팔로우버튼 - DM버튼과 동일한 크기/스타일
                           내 게시물에는 표시 안함 */}
                      {currentUser?.uid !== card.userId && (
                        <button
                          onClick={() => handleFollow(card.userId)}
                          style={{
                            borderColor: currentColor,
                            color: followMap[card.userId] ? "white" : currentColor,
                            backgroundColor: followMap[card.userId] ? currentColor : "transparent",
                            // [수정] DM버튼과 동일한 크기
                            minWidth: "3.5rem",
                            textAlign: "center",
                          }}
                          className="border px-2 py-0.5 rounded-full text-xs transition"
                        >
                          {followMap[card.userId] ? "팔로잉" : "팔로우"}
                        </button>
                      )}
                      {/* [수정] DM 버튼 - 팔로우버튼과 동일한 크기/스타일 */}
                      <button
                        onClick={() =>
                          currentUser?.uid === card.userId
                            ? navigate("/chatlist")
                            : handleChat(card.userId)
                        }
                        style={{
                          backgroundColor: currentColor,
                          color: "white",
                          borderColor: currentColor,
                          // [수정] 팔로우버튼과 동일한 크기
                          minWidth: "3.5rem",
                          textAlign: "center",
                        }}
                        className="border px-2 py-0.5 rounded-full text-xs transition"
                      >
                        DM
                      </button>
                    </div>

                    {/* 오른쪽 - 업로드 날짜 */}
                    <span style={{ color: currentColor }} className="text-xs">
                      {formatDate(card.createdAt)}
                    </span>
                  </div>

                  <div className="relative">
                    {/* 사진 영역 - 스와이프로 사진 전환 */}
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

                    {/* 사진이 2장 이상일 때 오른쪽 썸네일 표시 */}
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

                    {/* [수정] 하단 오버레이 - AI/조회수 색상 네온 컬러로 변경 */}
                    <div
                      className="absolute bottom-0 left-0 z-10 w-full px-4 py-3 flex justify-between items-center"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }}
                    >
                      <span style={{ color: currentColor }} className="text-sm drop-shadow font-semibold">AI</span>
                      <span style={{ color: currentColor }} className="text-xs drop-shadow font-semibold">조회수 -</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;