import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, query, getDoc, doc } from "firebase/firestore";
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
    };
    fetchCards();
  }, []);

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
        <div className="space-y-6">
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
                  style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
                  className="border rounded-xl overflow-hidden shadow-md"
                >
                  <div className="relative">
                    <div
                      className="absolute top-0 left-0 z-10 w-full flex items-center gap-2 px-4 py-3"
                      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full border overflow-hidden flex-shrink-0"
                        style={{ borderColor: currentColor }}
                      >
                        {card.profilePhoto && (
                          <img src={card.profilePhoto} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="text-sm text-white font-semibold drop-shadow">
                        @{card.userEmail?.split("@")[0]}
                      </span>
                    </div>

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