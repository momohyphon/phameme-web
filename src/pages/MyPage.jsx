import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

function MyPage() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  // 업로드 중 상태
  const [uploading, setUploading] = useState(false);
  // 내 게시물 목록
  const [myPosts, setMyPosts] = useState([]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
      navigate("/");
    } catch (err) {
      alert("로그아웃 실패");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfilePhoto(docSnap.data().photoURL);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const currentColor = neonColors[colorIndex];

  // 착샷 업로드 함수
  const handlePostUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // Cloudinary에 업로드
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "phameme_upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/dgibdjbtj/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      // Firestore posts 컬렉션에 저장
      await addDoc(collection(db, "posts"), {
        photoURL: data.secure_url,
        userEmail: currentUser.email,
        userId: currentUser.uid,
        createdAt: new Date(),
      });
      // 업로드한 사진 바로 화면에 추가
      setMyPosts((prev) => [data.secure_url, ...prev]);
      alert("업로드 완료!");
    } catch (err) {
      alert("업로드 실패");
    }
    setUploading(false);
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
          Phameme
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/editprofile")}
            style={{ borderColor: currentColor, color: currentColor, transition: "border-color 1s ease" }}
            className="border px-4 py-1 rounded-full transition"
          >
            회원정보 수정
          </button>
          <button
            onClick={handleLogout}
            style={{ borderColor: currentColor, color: currentColor, transition: "border-color 1s ease" }}
            className="border px-4 py-1 rounded-full transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* 프로필 정보 */}
        <div className="flex items-center gap-6 mb-8">
          {/* 프로필 사진 */}
          <div
            style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
            className="w-20 h-20 rounded-full border-2 bg-white overflow-hidden flex items-center justify-center"
          >
            {profilePhoto ? (
              <img src={profilePhoto} className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: currentColor }} className="text-xs">사진</span>
            )}
          </div>
          {/* 닉네임 및 통계 */}
          <div>
            <p style={{ color: currentColor }} className="text-xl font-bold mb-1">
              @{currentUser?.email?.split("@")[0]}님
            </p>
            <p style={{ color: currentColor }} className="text-sm">AI 평균점수 8.2</p>
            <p style={{ color: currentColor }} className="text-sm">총 조회수:12,345</p>
          </div>
        </div>

        {/* 내 착샷 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: currentColor }} className="text-sm">내 착샷</p>
          {/* 사진 추가 버튼 */}
          <button
            style={{ borderColor: currentColor, color: currentColor }}
            className="border px-3 py-1 rounded-full text-sm"
            onClick={() => document.getElementById("postUploadInput").click()}
          >
            {uploading ? "업로드 중..." : "+ 사진 추가"}
          </button>
          {/* 숨겨진 파일 input */}
          <input
            id="postUploadInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePostUpload}
          />
        </div>

        {/* 사진 그리드 */}
        <div className="grid grid-cols-3 gap-2">
          {myPosts.map((url, index) => (
            // 업로드한 사진 표시
            <div
              key={index}
              style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
              className="aspect-square bg-white border rounded-lg overflow-hidden"
            >
              <img src={url} className="w-full h-full object-cover" />
            </div>
          ))}
          {/* 사진 없을때 빈 칸 6개 */}
          {myPosts.length === 0 && [...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
              className="aspect-square bg-white border rounded-lg flex items-center justify-center"
            >
              <span style={{ color: currentColor }} className="text-xs">사진</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyPage;