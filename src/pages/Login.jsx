import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const [showSignup, setShowSignup] = useState(false);
  // 수정됨: Firestore 저장 필드는 name 유지 - 기존 계정 호환, 화면 표시만 별명으로 변경
  const [signupName, setSignupName] = useState("");
  const [signupGender, setSignupGender] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [signupPhoto, setSignupPhoto] = useState(null);
  const [signupPhotoPreview, setSignupPhotoPreview] = useState("");

  // 2초마다 네온 색상 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentColor = neonColors[colorIndex];

  // 로그인 처리 - Firebase Auth 이메일/비밀번호 인증
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/mypage");
    } catch (err) {
      setError("이메일 또는 비밀번호가 틀렸습니다.");
    }
  };

  // 회원가입 처리 - Firebase Auth 계정 생성 + Firestore users 문서 생성
  const handleSignup = async () => {
    if (signupPassword !== signupPasswordConfirm) {
      setSignupError("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);

      // 프로필 사진 선택했으면 Cloudinary 업로드
      let photoURL = "";
      if (signupPhoto) {
        const formData = new FormData();
        formData.append("file", signupPhoto);
        formData.append("upload_preset", "phameme_upload");
        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dgibdjbtj/image/upload",
          { method: "POST", body: formData }
        );
        const data = await res.json();
        photoURL = data.secure_url;
      }

      // Firestore users 문서 생성 - name 필드 유지로 기존 계정과 호환
      const user = auth.currentUser;
      await setDoc(doc(db, "users", user.uid), {
        name: signupName,
        gender: signupGender,
        email: signupEmail,
        photoURL: photoURL,
      });

      setSignupSuccess(`${signupName}님 환영합니다.`);
      setTimeout(() => {
        setShowSignup(false);
        setSignupSuccess("");
        setSignupName("");
        setSignupGender("");
        setSignupEmail("");
        setSignupPassword("");
        setSignupPasswordConfirm("");
      }, 2000);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setSignupError("이미 사용중인 이메일 입니다.");
      } else if (err.code === "auth/weak-password") {
        setSignupError("비밀번호는 6자리 이상이어야 합니다.");
      } else if (err.code === "auth/invalid-email") {
        setSignupError("회원가입 실패. 이메일 형식을 확인해 주세요.");
      } else {
        setSignupError("회원가입 실패. 다시 시도해 주세요.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* 로그인 카드 */}
      <div
        style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
        className="border rounded-2xl p-8 w-full max-w-sm shadow-lg"
      >
        <h1
          style={{ color: currentColor, transition: "color 1s ease" }}
          className="text-3xl font-bold tracking-widest text-center mb-8"
        >
          Phameme
        </h1>
        {/* 이메일 입력 */}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
          className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
        />
        {/* 비밀번호 입력 */}
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
          className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
        />
        {/* 로그인 오류 메시지 */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}
        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          style={{ backgroundColor: currentColor, transition: "background-color 1s ease" }}
          className="w-full text-white py-2 rounded-full transition mb-4"
        >
          로그인
        </button>
        {/* 회원가입 링크 */}
        <p style={{ color: currentColor }} className="text-sm text-center">
          계정이 없으신가요?{" "}
          <span
            onClick={() => setShowSignup(true)}
            style={{ color: currentColor }}
            className="cursor-pointer hover:underline font-bold"
          >
            회원가입
          </span>
        </p>
      </div>

      {/* 회원가입 팝업 */}
      {showSignup && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div
            style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
            className="border rounded-2xl p-8 w-full max-w-sm shadow-lg bg-white"
          >
            <h1
              style={{ color: currentColor, transition: "color 1s ease" }}
              className="text-3xl font-bold tracking-widest text-center mb-8"
            >
              Phameme
            </h1>
            {/* 가입 성공 메시지 */}
            {signupSuccess && (
              <p style={{ color: currentColor }} className="text-center font-bold mb-4">
                {signupSuccess}
              </p>
            )}
            {/* 프로필 사진 업로드 */}
            <div className="flex flex-col items-center mb-4">
              <div
                style={{ borderColor: currentColor }}
                className="w-20 h-20 rounded-full border-2 overflow-hidden mb-2 flex items-center justify-center cursor-pointer"
                onClick={() => document.getElementById("photoInput").click()}
              >
                {signupPhotoPreview ? (
                  <img src={signupPhotoPreview} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: currentColor }} className="text-xs cursor-pointer">사진 추가</span>
                )}
              </div>
              <input
                id="photoInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setSignupPhoto(file);
                  setSignupPhotoPreview(URL.createObjectURL(file));
                }}
              />
            </div>

            {/* 수정됨: 이름 인풋 placeholder만 별명으로 변경 - Firestore name 필드는 유지 */}
            <input
              type="text"
              placeholder="별명"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
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
                  checked={signupGender === "남"}
                  onChange={(e) => setSignupGender(e.target.value)}
                />
                남
              </label>
              <label style={{ color: currentColor }} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="여"
                  checked={signupGender === "여"}
                  onChange={(e) => setSignupGender(e.target.value)}
                />
                여
              </label>
            </div>

            {/* 이메일 입력 */}
            <input
              type="email"
              placeholder="이메일"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
              className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
            />
            {/* 비밀번호 입력 */}
            <input
              type="password"
              placeholder="비밀번호"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              style={{ borderColor: currentColor }}
              className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
            />
            {/* 비밀번호 확인 */}
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={signupPasswordConfirm}
              onChange={(e) => setSignupPasswordConfirm(e.target.value)}
              style={{ borderColor: currentColor }}
              className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
            />
            {/* 회원가입 오류 메시지 */}
            {signupError && (
              <p className="text-red-400 text-sm text-center mb-4">{signupError}</p>
            )}
            {/* 회원가입 버튼 */}
            <button
              onClick={handleSignup}
              style={{ backgroundColor: currentColor, transition: "background-color 1s ease" }}
              className="w-full text-white py-2 rounded-full transition mb-4"
            >
              회원가입
            </button>
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowSignup(false)}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border py-2 rounded-full transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;