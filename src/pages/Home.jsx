import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
// setDoc: Firestore 문서 생성, deleteDoc: Firestore 문서 삭제 - 팔로우/언팔로우에 사용
import { collection, getDocs, query, getDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function Home() {
  // 네온 색상 배열 - 2초마다 순환하며 UI 색상 변경
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  // 현재 네온 색상 인덱스
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();
  // Firestore에서 불러온 카드(게시물) 목록
  const [cards, setCards] = useState([]);
  // 각 카드별 현재 보여주는 사진 인덱스 - {카드id: 인덱스} 형태
  const [activeIndex, setActiveIndex] = useState({});
  // 현재 로그인한 유저 정보
  const [currentUser, setCurrentUser] = useState(null);
  // 팔로우 상태 맵 - {유저id: true/false} 형태로 팔로우 여부 저장
  const [followMap, setFollowMap] = useState({});

  // 로그인 상태 감지 - 앱 시작시 한번만 실행
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 네온 색상 2초마다 순환 - 앱 시작시 한번만 실행
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 팔로우/언팔로우 처리 함수
  // follows 컬렉션에 {followerId}_{followingId} 형태로 문서 생성/삭제
  const handleFollow = async (targetUserId) => {
    // 비로그인 상태면 로그인 페이지로 이동
    if (!currentUser) { navigate("/login"); return; }
    // 팔로우 문서 ID - 내uid_상대uid 형태로 고유값 생성
    const followId = `${currentUser.uid}_${targetUserId}`;
    const followRef = doc(db, "follows", followId);
    if (followMap[targetUserId]) {
      // 이미 팔로우 중이면 문서 삭제(언팔로우)
      await deleteDoc(followRef);
      setFollowMap((prev) => ({ ...prev, [targetUserId]: false }));
    } else {
      // 팔로우 안한 상태면 문서 생성(팔로우)
      await setDoc(followRef, {
        followerId: currentUser.uid, // 팔로우 하는 사람
        followingId: targetUserId,   // 팔로우 받는 사람
        createdAt: new Date(),
      });
      setFollowMap((prev) => ({ ...prev, [targetUserId]: true }));
    }
  };

  // 카드 데이터 불러오기 - currentUser 바뀔 때마다 재실행(팔로우 상태 갱신 위해)
  useEffect(() => {
    const fetchCards = async () => {
      // categories 컬렉션 전체 조회
      const q = query(collection(db, "categories"));
      const snapshot = await getDocs(q);
      // 최신순 정렬
      const cardList = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.());

      // 유저별 프로필사진 불러오기 - 중복 요청 방지를 위해 profiles 객체에 캐싱
      const profiles = {};
      for (const card of cardList) {
        if (!profiles[card.userId]) {
          const userDoc = await getDoc(doc(db, "users", card.userId));
          if (userDoc.exists()) {
            profiles[card.userId] = userDoc.data().photoURL;
          }
        }
      }

      // slots 배열에서 null 제거하고 유효한 URL만 photos로 저장
      const cardsWithPhotos = cardList.map((card) => {
        const photos = (card.slots || []).filter((slot) => slot !== null && typeof slot === "string");
        return {
          ...card,
          photos,
          profilePhoto: profiles[card.userId] || null,
        };
      }).filter((card) => card.photos.length > 0); // 사진 없는 카드 제외

      setCards(cardsWithPhotos);

      // 로그인 상태일 때만 팔로우 상태 불러오기
      if (currentUser) {
        const followSnap = await getDocs(collection(db, "follows"));
        const map = {};
        followSnap.docs.forEach((d) => {
          const data = d.data();
          // 내가 팔로우한 사람만 map에 저장
          if (data.followerId === currentUser.uid) {
            map[data.followingId] = true;
          }
        });
        setFollowMap(map);
      }
    };
    fetchCards();
  }, [currentUser]); // currentUser 바뀔 때마다 재실행

  // 현재 적용할 네온 색상
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
        {/* 로그인 상태에 따라 버튼 텍스트 전환 */}
        <button
          style={{ borderColor: currentColor, color: currentColor, transition: "border-color 1s ease, color 1s ease" }}
          className="border px-4 rounded-full transition"
          onClick={() => currentUser ? signOut(auth) : navigate("/login")}
        >
          {currentUser ? "로그아웃" : "로그인"}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        <div className="space-y-6">
          {cards.length === 0 ? (
            <p style={{ color: currentColor }} className="text-center text-sm">
              아직 게시물이 없어요!
            </p>
          ) : (
            cards.map((card) => {
              // 현재 카드에서 보여줄 사진 인덱스
              const currentIdx = activeIndex[card.id] ?? 0;
              return (
                <div
                  key={card.id}
                  style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
                  className="border rounded-xl overflow-hidden shadow-md"
                >
                  <div className="relative">

                    {/* ─── 수정됨: 기존 flex 한줄 → 프로필+아이디 / 팔로우버튼 세로 분리
                         이유: flex items-center 한줄이면 팔로우버튼이 오른쪽으로 밀림
                         프로필+아이디를 별도 div로 묶고 팔로우버튼을 아래에 배치 ─── */}
                    <div
                      className="absolute top-0 left-0 z-10 w-full px-4 py-3"
                      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}
                    >
                      {/* 프로필사진 + 아이디 가로 한줄 */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* 프로필사진 원형 - Firestore users에서 불러온 photoURL */}
                        <div
                          className="w-8 h-8 rounded-full border overflow-hidden flex-shrink-0"
                          style={{ borderColor: currentColor }}
                        >
                          {card.profilePhoto && (
                            <img src={card.profilePhoto} className="w-full h-full object-cover" />
                          )}
                        </div>
                        {/* 이메일 @ 앞부분을 아이디로 표시 */}
                        <span className="text-sm text-white font-semibold drop-shadow">
                          @{card.userEmail?.split("@")[0]}
                        </span>
                      </div>
                      {/* 팔로우버튼 - 프로필+아이디 아래 별도줄
                           내 게시물에는 표시 안함 */}
                      {currentUser?.uid !== card.userId && (
                        <button
                          onClick={() => handleFollow(card.userId)}
                          style={{
                            borderColor: currentColor,
                            // 팔로잉이면 배경색 채움, 아니면 투명
                            color: followMap[card.userId] ? "white" : currentColor,
                            backgroundColor: followMap[card.userId] ? currentColor : "transparent",
                          }}
                          className="border px-2 py-0.5 rounded-full text-xs transition"
                        >
                          {/* 팔로잉 상태에 따라 텍스트 전환 */}
                          {followMap[card.userId] ? "팔로잉" : "팔로우"}
                        </button>
                      )}
                    </div>

                    {/* 사진 영역 - 스와이프로 사진 전환 */}
                    <div
                      className="w-full overflow-hidden cursor-grab"
                      style={{ aspectRatio: "4/5.8" }}
                      onTouchStart={(e) => {
                        // 터치 시작 X좌표 저장
                        e.currentTarget.dataset.startX = e.touches[0].clientX;
                      }}
                      onTouchEnd={(e) => {
                        const startX = parseFloat(e.currentTarget.dataset.startX || 0);
                        const diff = startX - e.changedTouches[0].clientX;
                        // 50px 미만 스와이프는 무시
                        if (Math.abs(diff) < 50) return;
                        setActiveIndex((prev) => {
                          const current = prev[card.id] ?? 0;
                          // 오른쪽 스와이프면 다음, 왼쪽이면 이전
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
                        // 마우스가 영역 벗어나면 드래그 종료
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
                            {/* 현재 보여주는 사진은 네온 테두리 표시 */}
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

                    {/* 하단 오버레이 - AI점수 / 조회수 표시 */}
                    <div
                      className="absolute bottom-0 left-0 z-10 w-full px-4 py-3 flex justify-between items-center"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }}
                    >
                      <span className="text-sm text-white drop-shadow">Analyzed by Gemini: -</span>
                      <span className="text-xs text-white drop-shadow">조회수 -</span>
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