import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";

function MyPage() {
  // 네온 색상 배열 - 2초마다 순환하며 UI 색상 변경
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  // 현재 네온 색상 인덱스
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();
  // 현재 로그인한 유저 정보
  const [currentUser, setCurrentUser] = useState(null);
  // 프로필 사진 URL - Firestore users에서 불러옴
  const [profilePhoto, setProfilePhoto] = useState("");
  // 현재 업로드 중인 슬롯 인덱스 - 업로드 중 표시용
  const [uploadingSlot, setUploadingSlot] = useState(null);
  // 카테고리 배열 - 각 카테고리는 6개의 슬롯(사진 URL 또는 null)으로 구성
  const [categories, setCategories] = useState([[null, null, null, null, null, null]]);
  // 현재 선택된 카테고리 인덱스
  const [currentCategoryIdx, setCurrentCategoryIdx] = useState(0);
  // 파일 input 참조 - 클릭으로 파일 선택 창 열기
  const fileInputRef = useRef(null);
  // 업로드할 슬롯 인덱스 - 파일 선택 후 어느 슬롯에 넣을지 결정
  const [selectedSlot, setSelectedSlot] = useState(null);
  // 각 카테고리의 Firestore 문서 ID - 수정/삭제시 사용
  const [categoryIds, setCategoryIds] = useState([null]);
  // 각 카테고리의 생성 날짜 - 날짜 구분선 표시용
  const [categoryDates, setCategoryDates] = useState([null]);
  // 삭제 모드 활성화 여부 - true면 체크박스 표시
  const [deleteMode, setDeleteMode] = useState(false);
  // 삭제할 슬롯 인덱스 목록 - 체크박스 선택시 추가
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  // 게시물수 - 내 카테고리 개수로 집계, 클릭 기능 없이 숫자만 표시
  const [postCount, setPostCount] = useState(0);
  // 팔로워수 - 나를 팔로우한 사람 수
  const [followerCount, setFollowerCount] = useState(0);
  // 팔로잉수 - 내가 팔로우한 사람 수
  const [followingCount, setFollowingCount] = useState(0);
  // 현재 열린 팝업 타입 - "followers"/"following"/null (posts 제거)
  const [popupType, setPopupType] = useState(null);
  // 팝업에 표시할 유저 목록
  const [popupUsers, setPopupUsers] = useState([]);
  // 팔로워 유저 목록 - 팔로워 버튼 클릭시 popupUsers에 전달
  const [followerUsers, setFollowerUsers] = useState([]);
  // 팔로잉 유저 목록 - 팔로잉 버튼 클릭시 popupUsers에 전달
  const [followingUsers, setFollowingUsers] = useState([]);

  // 로그아웃 함수 - Firebase auth 로그아웃 후 홈으로 이동
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
      navigate("/");
    } catch (err) {
      alert("로그아웃 실패");
    }
  };

  // 네온 색상 2초마다 순환 - 앱 시작시 한번만 실행
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 로그인 상태 감지 + 데이터 로드 - 앱 시작시 한번만 실행
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 비로그인 상태면 로그인 페이지로 이동
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // Firestore users 컬렉션에서 프로필사진 불러오기
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfilePhoto(docSnap.data().photoURL);
      }

      // 내 카테고리 목록 불러오기 - userId로 필터링
      const q = query(
        collection(db, "categories"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // 카테고리 없으면 빈 슬롯 1개로 초기화
        setCategories([[null, null, null, null, null, null]]);
        setCategoryIds([null]);
        setCategoryDates([null]);
      } else {
        // 생성일 오름차순 정렬
        const cardList = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.createdAt?.toDate?.() - b.createdAt?.toDate?.());

        // 각 카테고리의 slots 배열 6칸으로 정규화
        const loadedCategories = cardList.map((cat) => {
          const slots = [null, null, null, null, null, null];
          if (cat.slots) {
            cat.slots.forEach((slot, i) => {
              if (i < 6) slots[i] = slot || null;
            });
          }
          return slots;
        });

        setCategories(loadedCategories);
        setCategoryIds(cardList.map((c) => c.id));
        setCategoryDates(cardList.map((c) => c.createdAt?.toDate?.() || null));
        // 마지막 카테고리를 현재 카테고리로 설정
        setCurrentCategoryIdx(loadedCategories.length - 1);
        // 게시물수 - 카테고리 개수로 집계
        setPostCount(snapshot.docs.length);

        // follows 컬렉션 전체 조회해서 팔로워/팔로잉 집계
        const followSnap = await getDocs(collection(db, "follows"));
        let followers = 0;
        let following = 0;
        // state 변수명과 충돌 방지를 위해 지역변수명을 followerList/followingList로 선언
        const followerList = [];
        const followingList = [];

        for (const fd of followSnap.docs) {
          const fdata = fd.data();
          if (fdata.followingId === user.uid) {
            // 나를 팔로우한 사람 - 팔로워
            followers++;
            const uDoc = await getDoc(doc(db, "users", fdata.followerId));
            // 팔로워 유저 정보 저장 - uid/email/photoURL
            followerList.push({
              uid: fdata.followerId,
              email: uDoc.exists() ? uDoc.data().email : "",
              photoURL: uDoc.exists() ? uDoc.data().photoURL : null,
            });
          }
          if (fdata.followerId === user.uid) {
            // 내가 팔로우한 사람 - 팔로잉
            following++;
            const uDoc = await getDoc(doc(db, "users", fdata.followingId));
            // 팔로잉 유저 정보 저장 - uid/email/photoURL
            followingList.push({
              uid: fdata.followingId,
              email: uDoc.exists() ? uDoc.data().email : "",
              photoURL: uDoc.exists() ? uDoc.data().photoURL : null,
            });
          }
        }
        // 집계 완료 후 state에 저장
        setFollowerCount(followers);
        setFollowingCount(following);
        setFollowerUsers(followerList);
        setFollowingUsers(followingList);
      }
    });
    // 컴포넌트 언마운트시 리스너 해제
    return () => unsubscribe();
  }, []);

  // 현재 적용할 네온 색상
  const currentColor = neonColors[colorIndex];

  // 날짜 포맷 함수 - Date 객체를 "YYYY.MM.DD" 형식으로 변환
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 슬롯 클릭 핸들러
  // 삭제 모드면 체크박스 토글, 아니면 파일 선택 창 열기
  const handleSlotClick = (index) => {
    if (deleteMode) {
      setSelectedForDelete((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
      return;
    }
    setSelectedSlot(index);
    fileInputRef.current.click();
  };

  // Upload 버튼 클릭 - 현재 카테고리의 첫번째 빈 슬롯에 업로드
  const handleAddClick = () => {
    const currentSlots = categories[currentCategoryIdx];
    const firstEmpty = currentSlots.findIndex((c) => c === null);
    if (firstEmpty === -1) {
      alert("이 카테고리가 가득 찼습니다. 새 카테고리를 추가하세요.");
      return;
    }
    setSelectedSlot(firstEmpty);
    fileInputRef.current.click();
  };

  // 새 카테고리 추가 - 현재 카테고리에 사진이 있어야 추가 가능
  const handleAddCategory = () => {
    const lastCategory = categories[categories.length - 1];
    const isEmpty = lastCategory.every((slot) => slot === null);
    if (isEmpty) {
      alert("현재 카테고리에 사진을 먼저 추가하세요.");
      return;
    }
    setCategories((prev) => [...prev, [null, null, null, null, null, null]]);
    setCategoryIds((prev) => [...prev, null]);
    setCategoryDates((prev) => [...prev, new Date()]);
    setCurrentCategoryIdx(categories.length);
  };

  // 파일 선택 후 Cloudinary 업로드 + Firestore 저장
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || selectedSlot === null) return;
    setUploadingSlot(selectedSlot);

    try {
      // Cloudinary에 이미지 업로드
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("upload_preset", "phameme_upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/dgibdjbtj/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Cloudinary 업로드 실패");
      const uploadedURL = data.secure_url;

      // 해당 슬롯에 업로드된 URL 저장
      const newCategories = categories.map((cat, ci) => {
        if (ci !== currentCategoryIdx) return cat;
        const newSlots = [...cat];
        newSlots[selectedSlot] = uploadedURL;
        return newSlots;
      });
      setCategories(newCategories);

      const currentCatId = categoryIds[currentCategoryIdx];
      const slotsToSave = newCategories[currentCategoryIdx];

      if (currentCatId) {
        // 기존 카테고리면 slots 업데이트
        await updateDoc(doc(db, "categories", currentCatId), {
          slots: slotsToSave,
        });
      } else {
        // 새 카테고리면 Firestore에 문서 생성
        const now = new Date();
        const catRef = await addDoc(collection(db, "categories"), {
          slots: slotsToSave,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          createdAt: now,
        });
        setCategoryIds((prev) => {
          const updated = [...prev];
          updated[currentCategoryIdx] = catRef.id;
          return updated;
        });
        setCategoryDates((prev) => {
          const updated = [...prev];
          updated[currentCategoryIdx] = now;
          return updated;
        });
      }
      alert("업로드 완료!");
    } catch (err) {
      alert("업로드 실패: " + err.message);
    }

    e.target.value = "";
    setUploadingSlot(null);
    setSelectedSlot(null);
  };

  // Delete 버튼 클릭 핸들러
  // 1번 클릭: 삭제 모드 진입
  // 선택 없이 2번 클릭: 삭제 모드 취소
  // 선택 후 2번 클릭: 선택된 슬롯 삭제 실행
  const handleDeleteClick = async () => {
    if (!deleteMode) {
      setDeleteMode(true);
      setSelectedForDelete([]);
      return;
    }
    if (selectedForDelete.length === 0) {
      setDeleteMode(false);
      return;
    }
    const newCategories = categories.map((cat, ci) => {
      if (ci !== currentCategoryIdx) return cat;
      const newSlots = [...cat];
      selectedForDelete.forEach((idx) => {
        newSlots[idx] = null;
      });
      return newSlots;
    });
    setCategories(newCategories);

    const currentCatId = categoryIds[currentCategoryIdx];
    if (currentCatId) {
      await updateDoc(doc(db, "categories", currentCatId), {
        slots: newCategories[currentCategoryIdx],
      });
    }
    setDeleteMode(false);
    setSelectedForDelete([]);
  };

  return (
    // relative - 팝업 absolute 배치 기준점
    <div className="min-h-screen bg-white text-black relative" onClick={() => setPopupType(null)}>

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
          {/* 회원정보 수정 페이지 이동 버튼 */}
          <button
            onClick={() => navigate("/editprofile")}
            className="border px-2 py-0.5 rounded-full text-xs transition"
            style={{ borderColor: currentColor, color: currentColor, minWidth: "5rem", textAlign: "center" }}
          >
            회원정보 수정
          </button>
          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="border px-2 py-0.5 rounded-full text-xs transition"
            style={{ borderColor: currentColor, color: currentColor, minWidth: "5rem", textAlign: "center" }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-32">

        {/* 프로필 영역 - relative로 팝업 기준점 설정 */}
        <div className="flex items-center gap-6 mb-8 relative">
          {/* 프로필 사진 원형 */}
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

          <div className="flex-1">
            {/* 이메일 @ 앞부분을 아이디로 표시 */}
            <p style={{ color: currentColor }} className="text-xl font-bold mb-1">
              @{currentUser?.email?.split("@")[0]}님
            </p>
            <p style={{ color: currentColor }} className="text-sm">AI 평균점수 8.2</p>
            <p style={{ color: currentColor }} className="text-sm">총 조회수:12,345</p>

            {/* 게시물수/팔로워/팔로잉 통계 영역 */}
            <div className="flex gap-4 mt-2">
              {/* 게시물수 - 클릭 없이 숫자만 표시 */}
              <div style={{ color: currentColor }} className="text-xs text-center">
                <div className="font-bold text-sm">{postCount}</div>
                <div>게시물</div>
              </div>

              {/* 팔로워 버튼 - 클릭시 프로필 오른쪽에 팝업 표시 */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // 바깥 클릭 이벤트 차단
                  setPopupType("followers");
                  setPopupUsers(followerUsers);
                }}
                style={{ color: currentColor }}
                className="text-xs text-center"
              >
                <div className="font-bold text-sm">{followerCount}</div>
                <div>팔로워</div>
              </button>

              {/* 팔로잉 버튼 - 클릭시 프로필 오른쪽에 팝업 표시 */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // 바깥 클릭 이벤트 차단
                  setPopupType("following");
                  setPopupUsers(followingUsers);
                }}
                style={{ color: currentColor }}
                className="text-xs text-center"
              >
                <div className="font-bold text-sm">{followingCount}</div>
                <div>팔로잉</div>
              </button>
            </div>
          </div>

          {/* 팔로워/팔로잉 팝업 - popupType 있을때만 렌더링
              프로필 영역 오른쪽에 absolute로 붙어서 표시
              흰색 배경, 그림자로 카드 형태 */}
          {popupType && (
            <div
              className="absolute z-50 bg-white rounded-xl shadow-lg p-3 w-48 max-h-60 overflow-y-auto"
              style={{
                borderColor: currentColor,
                border: `1px solid ${currentColor}`,
                // 프로필 사진(w-20=5rem) + gap(gap-6=1.5rem) = 6.5rem 오른쪽에 위치
                left: "6.5rem",
                top: "0",
              }}
              onClick={(e) => e.stopPropagation()} // 팝업 내부 클릭시 닫힘 방지
            >
              {/* 유저 목록 표시 - popupUsers 배열 순회 */}
              {popupUsers.length === 0 ? (
                // 목록이 비어있을 때 표시
                <p style={{ color: currentColor }} className="text-xs text-center py-2">없음</p>
              ) : (
                popupUsers.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                    {/* 유저 프로필사진 - photoURL 없으면 텍스트로 대체 */}
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden border flex-shrink-0"
                      style={{ borderColor: currentColor }}
                    >
                      {u.photoURL
                        ? <img src={u.photoURL} className="w-full h-full object-cover" />
                        : <span style={{ color: currentColor }} className="text-xs flex items-center justify-center h-full">사진</span>
                      }
                    </div>
                    {/* 이메일 @ 앞부분을 아이디로 표시 */}
                    <span style={{ color: currentColor }} className="text-xs font-semibold truncate">
                      @{u.email?.split("@")[0]}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 새 카테고리 추가 버튼 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleAddCategory}
            style={{ borderColor: currentColor, color: currentColor }}
            className="border px-3 py-1 rounded-full text-xs"
          >
            + 새 카테고리
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p style={{ color: currentColor }} className="text-sm">내 착샷</p>
          <div className="flex gap-2">
            {/* Upload 버튼 - 첫번째 빈 슬롯에 사진 업로드 */}
            <button
              style={{ borderColor: currentColor, color: currentColor }}
              className="border px-2 py-1 rounded-full text-xs w-16 text-center"
              onClick={handleAddClick}
            >
              Upload
            </button>
            {/* Delete 버튼 - 삭제 모드 토글
                삭제 모드 활성화시 배경색 채움 */}
            <button
              style={{
                borderColor: currentColor,
                color: deleteMode ? "white" : currentColor,
                backgroundColor: deleteMode ? currentColor : "white",
              }}
              className="border px-2 py-1 rounded-full text-xs w-16 text-center"
              onClick={handleDeleteClick}
            >
              Delete
            </button>
          </div>
        </div>

        {/* 숨겨진 파일 input - 슬롯 클릭시 프로그래밍적으로 열림 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 카테고리 목록 - 날짜 구분선 + 6칸 그리드 */}
        <div className="space-y-8">
          {categories.map((slots, ci) => (
            <div key={ci}>
              {/* 날짜 구분선 - 카테고리 생성일 표시 */}
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: currentColor }} className="text-sm font-bold whitespace-nowrap">
                  {formatDate(categoryDates[ci]) || "날짜 없음"}
                </span>
                <div style={{ backgroundColor: currentColor, height: "2px" }} className="flex-1 opacity-50" />
              </div>
              {/* 사진 슬롯 3열 그리드 */}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
                    className="aspect-square bg-white border rounded-lg overflow-hidden flex items-center justify-center cursor-pointer relative"
                    onClick={() => {
                      // 클릭한 카테고리를 현재 카테고리로 설정 후 슬롯 클릭 처리
                      setCurrentCategoryIdx(ci);
                      handleSlotClick(i);
                    }}
                  >
                    {/* 삭제 모드이고 사진 있는 슬롯에만 체크박스 표시 */}
                    {deleteMode && slot && (
                      <div className="absolute top-1 left-1 z-10">
                        <input
                          type="checkbox"
                          // 현재 카테고리의 선택된 슬롯만 체크 표시
                          checked={ci === currentCategoryIdx && selectedForDelete.includes(i)}
                          onChange={() => {}}
                          style={{ accentColor: currentColor }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>
                    )}
                    {/* 슬롯 상태에 따라 다른 내용 표시
                        업로드 중 / 사진 있음 / 첫번째 빈칸 / 일반 빈칸 */}
                    {uploadingSlot === i && ci === currentCategoryIdx ? (
                      <span style={{ color: currentColor }} className="text-xs">업로드 중...</span>
                    ) : slot ? (
                      <img src={slot} className="w-full h-full object-cover" />
                    ) : i === 0 && ci === 0 ? (
                      <span style={{ color: currentColor }} className="text-xs font-bold">Main +</span>
                    ) : (
                      <span style={{ color: currentColor }} className="text-xs">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyPage;