import { auth } from "../firebase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function EditProfile() {
  // 네온 색상 배열
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  // 현재 색상 인덱스
  const [colorIndex, setColorIndex] = useState(0);
  // 페이지 이동
  const navigate = useNavigate();
  // 현재 로그인한 유저
  const [currentUser, setCurrentUser] = useState(null);
  // 이름 입력값
  const [name, setName] = useState("");
  // 성별 입력값
  const [gender, setGender] = useState("");
  // 프로필 사진 URL
  const [profilePhoto, setProfilePhoto] = useState("");
  // 사진 미리보기 URL
  const [photoPreview, setPhotoPreview] = useState("");
  // 새로 선택한 사진 파일
  const [photoFile, setPhotoFile] = useState(null);
  // 저장 성공 메시지
  const [success, setSuccess] = useState("");
  // 오류 메시지
  const [error, setError] = useState("");

  // 2초마다 색상 변경
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 로그인 유저 정보 + Firestore 데이터 가져오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Firestore에서 기존 정보 가져오기
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // 기존 이름 표시
          setName(docSnap.data().name || "");
          // 기존 성별 표시
          setGender(docSnap.data().gender || "");
          // 기존 사진 표시
          setProfilePhoto(docSnap.data().photoURL || "");
          setPhotoPreview(docSnap.data().photoURL || "");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const currentColor = neonColors[colorIndex];

  // 사진 변경 처리
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    // 파일 상태 저장
    setPhotoFile(file);
    // 미리보기 URL 생성
    setPhotoPreview(URL.createObjectURL(file));
  };

  // 저장 처리
  const handleSave = async () => {
    try {
      let photoURL = profilePhoto;

      // 새 사진 선택했으면 Cloudinary에 업로드
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("upload_preset", "phameme_upload");
        const res = await fetch("https://api.cloudinary.com/v1_1/dgibdjbtj/image/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        // 새 사진 URL 저장
        photoURL = data.secure_url;
      }

      // Firestore에 업데이트 (merge: true = 기존 데이터 유지)
      await setDoc(doc(db, "users", currentUser.uid), {
        name: name,
        gender: gender,
        photoURL: photoURL,
      }, { merge: true });

      setSuccess("저장되었습니다!");
      // 2초 후 마이페이지로 이동
      setTimeout(() => {
        navigate("/mypage");
      }, 2000);
    } catch (err) {
      setError("저장 실패. 다시 시도해 주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="border rounded-2xl p-8 w-full max-w-sm shadow-lg"
      >
        {/* 로고 */}
        <h1
          style={{ color: currentColor, transition: "color 1s ease" }}
          className="text-3xl font-bold tracking-widest text-center mb-8"
        >
          회원정보 수정
        </h1>

        {/* 성공 메시지 */}
        {success && (
          <p style={{ color: currentColor }} className="text-center font-bold mb-4">{success}</p>
        )}

        {/* 프로필 사진 */}
        <div className="flex flex-col items-center mb-4">
          <div
            style={{ borderColor: currentColor }}
            className="w-20 h-20 rounded-full border-2 overflow-hidden mb-2 flex items-center justify-center cursor-pointer"
            onClick={() => document.getElementById("editPhotoInput").click()}
          >
            {photoPreview ? (
              <img src={photoPreview} className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: currentColor }} className="text-xs">사진 추가</span>
            )}
          </div>
          <input
            id="editPhotoInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* 이름 입력 */}
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
          className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
        />

        {/* 성별 선택 */}
        <div className="flex gap-6 mb-4 px-2">
          <label style={{ color: currentColor }} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="남"
              checked={gender === "남"}
              onChange={(e) => setGender(e.target.value)}
            />
            남
          </label>
          <label style={{ color: currentColor }} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="여"
              checked={gender === "여"}
              onChange={(e) => setGender(e.target.value)}
            />
            여
          </label>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          style={{ backgroundColor: currentColor, transition: "background-color 1s ease" }}
          className="w-full text-white py-2 rounded-full transition mb-4"
        >
          저장
        </button>

        {/* 취소 버튼 */}
        <button
          onClick={() => navigate("/mypage")}
          style={{ borderColor: currentColor, color: currentColor }}
          className="w-full border py-2 rounded-full transition"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export default EditProfile;