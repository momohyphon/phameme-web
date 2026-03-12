import { auth } from "../firebase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

function EditProfile() {
  // 네온 색상 배열 - 2초마다 순환
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  // 현재 색상 인덱스
  const [colorIndex, setColorIndex] = useState(0);
  // 페이지 이동
  const navigate = useNavigate();
  // 현재 로그인한 유저
  const [currentUser, setCurrentUser] = useState(null);
  // 별명 입력값 - Firestore name 필드와 연동
  const [name, setName] = useState("");
  // 성별 입력값
  const [gender, setGender] = useState("");
  // 프로필 사진 URL - 상단 프로필 표시용
  const [profilePhoto, setProfilePhoto] = useState("");
  // 현재 비밀번호 - 재인증용
  const [currentPassword, setCurrentPassword] = useState("");
  // 새 비밀번호
  const [newPassword, setNewPassword] = useState("");
  // 새 비밀번호 확인
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  // 저장 성공 메시지
  const [success, setSuccess] = useState("");
  // 오류 메시지
  const [error, setError] = useState("");
  // 회원탈퇴 섹션 표시 여부
  const [showDeleteTab, setShowDeleteTab] = useState(false);
  // 회원탈퇴 확인용 비밀번호
  const [deletePassword, setDeletePassword] = useState("");

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
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setName(docSnap.data().name || "");
          setGender(docSnap.data().gender || "");
          setProfilePhoto(docSnap.data().photoURL || "");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const currentColor = neonColors[colorIndex];

  // 저장 처리 - 별명 + 비밀번호 변경
  const handleSave = async () => {
    if (newPassword || newPasswordConfirm) {
      if (newPassword !== newPasswordConfirm) {
        setError("새 비밀번호가 일치하지 않습니다.");
        return;
      }
      if (newPassword.length < 6) {
        setError("비밀번호는 6자리 이상이어야 합니다.");
        return;
      }
      if (!currentPassword) {
        setError("비밀번호 변경을 위해 현재 비밀번호를 입력해 주세요.");
        return;
      }
    }
    try {
      // Firestore name 필드 업데이트 - merge: true로 기존 데이터 유지
      await setDoc(doc(db, "users", currentUser.uid), {
        name: name,
        gender: gender,
      }, { merge: true });

      // 비밀번호 변경 요청시 재인증 후 변경
      if (newPassword) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
      }

      setSuccess("저장되었습니다!");
      setTimeout(() => { navigate("/mypage"); }, 2000);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("현재 비밀번호가 틀렸습니다.");
      } else {
        setError("저장 실패. 다시 시도해 주세요.");
      }
    }
  };

  // 회원탈퇴 처리 - 재인증 후 Firestore + Auth 계정 삭제
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Firestore users 문서 삭제
      await deleteDoc(doc(db, "users", currentUser.uid));

      // 내 카테고리 전부 삭제
      const catSnap = await getDocs(query(collection(db, "categories"), where("userId", "==", currentUser.uid)));
      for (const d of catSnap.docs) await deleteDoc(doc(db, "categories", d.id));

      // 내 팔로우 데이터 전부 삭제
      const followSnap = await getDocs(collection(db, "follows"));
      for (const d of followSnap.docs) {
        const fdata = d.data();
        if (fdata.followerId === currentUser.uid || fdata.followingId === currentUser.uid) {
          await deleteDoc(doc(db, "follows", d.id));
        }
      }

      // Firebase Auth 계정 삭제
      await deleteUser(currentUser);
      alert("회원탈퇴가 완료되었습니다.");
      navigate("/");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("비밀번호가 틀렸습니다.");
      } else {
        setError("탈퇴 실패. 다시 시도해 주세요.");
      }
    }
  };

  return (
    // 수정됨: 상하폭 축소 + 스크롤 가능하게 - 모바일에서 BottomNav에 안 가리게
    <div className="bg-white flex items-center justify-center py-4 overflow-y-auto" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-sm px-6 py-4">
        <div
          style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
          className="border rounded-2xl p-6 shadow-lg"
        >
          {/* 상단 프로필 - 사진 + 아이디 */}
          <div className="flex items-center gap-4 mb-6">
            <div
              style={{ borderColor: currentColor }}
              className="w-14 h-14 rounded-full border-2 overflow-hidden flex items-center justify-center flex-shrink-0"
            >
              {profilePhoto ? (
                <img src={profilePhoto} className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: currentColor }} className="text-xs">사진</span>
              )}
            </div>
            {/* 이메일 @ 앞부분을 아이디로 표시 */}
            <p style={{ color: currentColor }} className="text-lg font-bold">
              @{currentUser?.email?.split("@")[0]}
            </p>
          </div>

          {/* 성공 메시지 */}
          {success && (
            <p style={{ color: currentColor }} className="text-center font-bold mb-3">{success}</p>
          )}

          {/* 오류 메시지 */}
          {error && (
            <p className="text-red-400 text-sm text-center mb-3">{error}</p>
          )}

          {/* 별명 입력 - Firestore name 필드 연동 */}
          <p style={{ color: currentColor }} className="text-xs font-bold mb-1 px-1">별명</p>
          <input
            type="text"
            placeholder="별명"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ borderColor: currentColor }}
            className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
          />

          {/* 비밀번호 변경 섹션 */}
          <p style={{ color: currentColor }} className="text-xs font-bold mb-1 px-1">비밀번호 변경</p>
          {/* 현재 비밀번호 - 재인증용 */}
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ borderColor: currentColor }}
            className="w-full bg-white border text-black px-4 py-2 rounded-full mb-2 outline-none"
          />
          {/* 새 비밀번호 */}
          <input
            type="password"
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ borderColor: currentColor }}
            className="w-full bg-white border text-black px-4 py-2 rounded-full mb-2 outline-none"
          />
          {/* 새 비밀번호 확인 */}
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            style={{ borderColor: currentColor }}
            className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
          />

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            style={{ backgroundColor: currentColor }}
            className="w-full text-white py-2 rounded-full mb-2"
          >
            저장
          </button>

          {/* 취소 버튼 */}
          <button
            onClick={() => navigate("/mypage")}
            style={{ borderColor: currentColor, color: currentColor }}
            className="w-full border py-2 rounded-full mb-4"
          >
            취소
          </button>

          {/* 회원탈퇴 토글 버튼 */}
          <button
            onClick={() => setShowDeleteTab((prev) => !prev)}
            className="w-full text-xs text-center text-gray-400 underline mb-2"
          >
            회원탈퇴
          </button>

          {/* 회원탈퇴 섹션 - 토글시 표시 */}
          {showDeleteTab && (
            <div className="border-t pt-3 mt-1" style={{ borderColor: currentColor }}>
              {/* 안내 문구 */}
              <p className="text-xs text-gray-500 text-center mb-3">
                회원탈퇴시 기존 정보는 모두 삭제되오니 확인하시고 탈퇴 진행바랍니다.
              </p>
              {/* 탈퇴 확인용 비밀번호 */}
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={{ borderColor: currentColor }}
                className="w-full bg-white border text-black px-4 py-2 rounded-full mb-2 outline-none text-sm"
              />
              {/* 탈퇴 실행 버튼 */}
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-red-500 text-white py-2 rounded-full text-sm"
              >
                탈퇴 확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditProfile;