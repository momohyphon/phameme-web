import { auth } from "../firebase";
import { signOut } from "firebase/auth";

function MyPage() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
    } catch (err) {
      alert("로그아웃 실패");
    }
  };
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-purple-500 px-4 py-3 flex justify-between items-center ">
        <h1 className="text-2xl font-bold text-purple-400 tracking-widest">
          PHAMEME
        </h1>
        <button
          onClick={handleLogout}
          className="border border-purple-500 text-purple-400 px-4 py-1 rounded-full hover:bg-purple-500 hover:text-black transition"
        >
          로그아웃
        </button>
      </header>
      {/* 프로필 양열 */}
      <div className="w-full max-w-2xl mx-auto px-4 py-20">
        {/* 프로필 정보 */}
        <div className="flex items-center gap-6 mb-8">
          {/* 프로필 사진 자리 */}
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center">
            <span className="text-2xl">사진</span>
          </div>
          {/* 닉네임 및 통계 */}
          <div>
            <p className="text-xl font-bold text-purple-300 mb-1">@username</p>
            <p className="text-purple-600 text-sm">AI 평균점수 8.2</p>
            <p className="text-purple-600 text-sm">총 조회수:12,345</p>
          </div>
        </div>
        {/* 칙샷 그리드 */}
        <p className="text-purple-400 text-sm mb-4">내 착샷</p>
        <div className="grid grid-cols-3 gap-2">
          {/* 샘플 그리드 아이템 */}
          <div className="aspect-square bg-purple-950 rounded-lg flex items-center justify-center">
            <span className="test-purple-700 text-xs">사진</span>
          </div>
          <div className="aspect-square bg-purple-950 rounded-lg flex items-center justify-center">
            <span className="test-purple-700 text-xs">사진</span>
          </div>
          <div className="aspect-square bg-purple-950 rounded-lg flex items-center justify-center">
            <span className="test-purple-700 text-xs">사진</span>
          </div>
          <div className="aspect-square bg-purple-950 rounded-lg flex items-center justify-center">
            <span className="test-purple-700 text-xs">사진</span>
          </div>
          <div className="aspect-square bg-purple-950 rounded-lg flex items-center justify-center">
            <span className="test-purple-700 text-xs">사진</span>
          </div>
          <div className="aspect-square bg-purple-950 rounded-lg flex items-center justify-center">
            <span className="test-purple-700 text-xs">사진</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyPage;
