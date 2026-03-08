import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

function Home() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();
  // 게시물 목록
  const [posts, setPosts] = useState([]);
  // 유저 프로필 사진 목록
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Firestore에서 게시물 + 유저 프로필 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      // posts 컬렉션 최신순으로 가져오기
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      // 각 게시물 데이터 배열로 변환
      const postList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postList);

      // 각 게시물 유저 프로필 사진 가져오기
      const profiles = {};
      for (const post of postList) {
        // users 컬렉션에서 유저 정보 가져오기
        const userDoc = await getDoc(doc(db, "users", post.userId));
        if (userDoc.exists()) {
          // 유저 프로필 사진 URL 저장
          profiles[post.userId] = userDoc.data().photoURL;
        }
      }
      setUserProfiles(profiles);
    };
    fetchPosts();
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
          onClick={() => navigate("/login")}
        >
          로그인
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* 업로드 유도 카드 */}
        <div
          style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
          className="border-2 rounded-xl p-4 mb-6 text-center shadow-md"
        >
          <p style={{ color: currentColor }} className="text-sm font-bold">
            오늘의 착샷을 올려보세요
          </p>
          <button
            onClick={() => navigate("/mypage")}
            style={{ borderColor: currentColor, color: currentColor, transition: "border-color 1s ease, color 1s ease" }}
            className="mt-2 border px-6 py-2 rounded-full text-sm font-bold transition"
          >
            업로드
          </button>
        </div>

        {/* 게시물 목록 */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            // 게시물 없을때
            <p style={{ color: currentColor }} className="text-center text-sm">
              아직 게시물이 없어요!
            </p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
                className="border rounded-xl overflow-hidden shadow-md"
              >
                {/* 유저 정보 */}
                <div className="flex items-center gap-2 px-4 py-3">
                  {/* 프로필 사진 */}
                  <div
                    className="w-8 h-8 rounded-full bg-white border overflow-hidden"
                    style={{ borderColor: currentColor }}
                  >
                    {userProfiles[post.userId] ? (
                      <img src={userProfiles[post.userId]} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  {/* 유저 이메일 */}
                  <span style={{ color: currentColor }} className="text-sm">
                    @{post.userEmail?.split("@")[0]}
                  </span>
                </div>

                {/* 게시물 사진 */}
                <div className="w-full h-64 bg-white overflow-hidden">
                  <img src={post.photoURL} className="w-full h-full object-cover" />
                </div>

                {/* 하단 정보 */}
                <div className="px-4 py-3 flex justify-between items-center">
                  <span style={{ color: currentColor }} className="text-sm">AI점수: -</span>
                  <span className="text-gray-400 text-xs">조회수 -</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;