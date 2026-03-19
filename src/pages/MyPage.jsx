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
  // 프로필 사진 URL
  const [profilePhoto, setProfilePhoto] = useState("");
  // 현재 업로드 중인 슬롯 인덱스
  const [uploadingSlot, setUploadingSlot] = useState(null);
  // 카테고리 배열 - 각 카테고리는 6개의 슬롯으로 구성
  const [categories, setCategories] = useState([[null, null, null, null, null, null]]);
  // 현재 선택된 카테고리 인덱스
  const [currentCategoryIdx, setCurrentCategoryIdx] = useState(0);
  // 파일 input 참조
  const fileInputRef = useRef(null);
  // 업로드할 슬롯 인덱스
  const [selectedSlot, setSelectedSlot] = useState(null);
  // 각 카테고리의 Firestore 문서 ID
  const [categoryIds, setCategoryIds] = useState([null]);
  // 각 카테고리의 생성 날짜
  const [categoryDates, setCategoryDates] = useState([null]);
  // 삭제 모드 활성화 여부
  const [deleteMode, setDeleteMode] = useState(false);
  // 삭제할 슬롯 인덱스 목록
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  // 게시물수
  const [postCount, setPostCount] = useState(0);
  // 팔로워수
  const [followerCount, setFollowerCount] = useState(0);
  // 팔로잉수
  const [followingCount, setFollowingCount] = useState(0);
  // 현재 열린 팝업 타입
  const [popupType, setPopupType] = useState(null);
  // 팝업에 표시할 유저 목록
  const [popupUsers, setPopupUsers] = useState([]);
  // 팔로워 유저 목록
  const [followerUsers, setFollowerUsers] = useState([]);
  // 팔로잉 유저 목록
  const [followingUsers, setFollowingUsers] = useState([]);
  // 각 카테고리별 아이템 정보 배열
  const [itemInfos, setItemInfos] = useState([
    { title: "", productName: "", modelName: "", purchaseYear: "", price: "", notes: "", priceHistory: [] }
  ]);
  // 아이템 정보 입력 모달 표시 여부
  const [showItemModal, setShowItemModal] = useState(false);
  // 모달에서 편집 중인 카테고리 인덱스
  const [modalCategoryIdx, setModalCategoryIdx] = useState(null);
  // 모달 입력값 임시 저장
  const [modalForm, setModalForm] = useState({
    title: "", productName: "", modelName: "", purchaseYear: "", price: "", notes: ""
  });
  // 모달 저장 후 파일 선택창 열기 플래그
  const [pendingUpload, setPendingUpload] = useState(false);

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
      navigate("/");
    } catch (err) {
      alert("로그아웃 실패");
    }
  };

  // 네온 색상 2초마다 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % neonColors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 로그인 상태 감지 + 데이터 로드
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfilePhoto(docSnap.data().photoURL);
      }

      const q = query(
        collection(db, "categories"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setCategories([[null, null, null, null, null, null]]);
        setCategoryIds([null]);
        setCategoryDates([null]);
      } else {
        const cardList = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.());

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
        setCurrentCategoryIdx(0);
        setPostCount(snapshot.docs.length);

        setItemInfos(cardList.map((cat) => ({
          title: cat.title || "",
          productName: cat.productName || "",
          modelName: cat.modelName || "",
          purchaseYear: cat.purchaseYear || "",
          price: cat.price || "",
          notes: cat.notes || "",
          priceHistory: cat.priceHistory || [],
        })));

        const followSnap = await getDocs(collection(db, "follows"));
        let followers = 0;
        let following = 0;
        const followerList = [];
        const followingList = [];

        for (const fd of followSnap.docs) {
          const fdata = fd.data();
          if (fdata.followingId === user.uid) {
            followers++;
            const uDoc = await getDoc(doc(db, "users", fdata.followerId));
            followerList.push({
              uid: fdata.followerId,
              email: uDoc.exists() ? uDoc.data().email : "",
              photoURL: uDoc.exists() ? uDoc.data().photoURL : null,
            });
          }
          if (fdata.followerId === user.uid) {
            following++;
            const uDoc = await getDoc(doc(db, "users", fdata.followingId));
            followingList.push({
              uid: fdata.followingId,
              email: uDoc.exists() ? uDoc.data().email : "",
              photoURL: uDoc.exists() ? uDoc.data().photoURL : null,
            });
          }
        }
        setFollowerCount(followers);
        setFollowingCount(following);
        setFollowerUsers(followerList);
        setFollowingUsers(followingList);
      }
    });
    return () => unsubscribe();
  }, []);

  // 현재 적용할 네온 색상
  const currentColor = neonColors[colorIndex];

  // 날짜 포맷 함수
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 슬롯 클릭 핸들러
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

  // Upload 버튼 클릭
  // 아이템 정보 없으면 모달 먼저, 있으면 바로 사진 선택
  const handleAddClick = () => {
    const currentSlots = categories[currentCategoryIdx];
    const firstEmpty = currentSlots.findIndex((c) => c === null);
    if (firstEmpty === -1) {
      alert("이 카테고리가 가득 찼습니다. 새 카테고리를 추가하세요.");
      return;
    }
    setSelectedSlot(firstEmpty);

    const hasInfo = itemInfos[currentCategoryIdx]?.title || itemInfos[currentCategoryIdx]?.productName;

    if (hasInfo) {
      // 이미 정보 입력된 카테고리면 바로 사진 선택
      fileInputRef.current.click();
    } else {
      // 정보 없으면 모달 먼저 표시
      setModalCategoryIdx(currentCategoryIdx);
      setModalForm({
        title: "", productName: "", modelName: "", purchaseYear: "", price: "", notes: "",
      });
      setPendingUpload(true);
      setShowItemModal(true);
    }
  };

  // 새 카테고리 추가
  const handleAddCategory = () => {
    const isEmpty = categories[0].every((slot) => slot === null);
    if (isEmpty) {
      alert("현재 카테고리에 사진을 먼저 추가하세요.");
      return;
    }
    setCategories((prev) => [[null, null, null, null, null, null], ...prev]);
    setCategoryIds((prev) => [null, ...prev]);
    setCategoryDates((prev) => [new Date(), ...prev]);
    setItemInfos((prev) => [
      { title: "", productName: "", modelName: "", purchaseYear: "", price: "", notes: "", priceHistory: [] },
      ...prev
    ]);
    setCurrentCategoryIdx(0);
  };

  // 파일 선택 후 Cloudinary 업로드 + Firestore 저장
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || selectedSlot === null) return;
    setUploadingSlot(selectedSlot);

    try {
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
        await updateDoc(doc(db, "categories", currentCatId), {
          slots: slotsToSave,
        });
      } else {
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

  // 모달 저장 버튼 클릭
  const handleModalSave = async () => {
    const ci = modalCategoryIdx;
    const catId = categoryIds[ci];

    const updated = itemInfos.map((info, i) =>
      i === ci ? { ...info, ...modalForm } : info
    );
    setItemInfos(updated);

    if (catId) {
      await updateDoc(doc(db, "categories", catId), {
        title: modalForm.title,
        productName: modalForm.productName,
        modelName: modalForm.modelName,
        purchaseYear: modalForm.purchaseYear,
        price: modalForm.price,
        notes: modalForm.notes,
      });
    }

    setShowItemModal(false);

    // Upload 버튼으로 열린 모달이면 저장 후 파일 선택창 열기
    if (pendingUpload) {
      setPendingUpload(false);
      fileInputRef.current.click();
    }
  };

  // Delete 버튼 클릭 핸들러
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
          <button
            onClick={() => navigate("/editprofile")}
            className="border px-2 py-0.5 rounded-full text-xs transition"
            style={{ borderColor: currentColor, color: currentColor, minWidth: "5rem", textAlign: "center" }}
          >
            회원정보 수정
          </button>
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

        {/* 프로필 영역 */}
        <div className="flex items-center gap-6 mb-8 relative">
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
            <p style={{ color: currentColor }} className="text-xl font-bold mb-1">
              @{currentUser?.email?.split("@")[0]}님
            </p>
            <p style={{ color: currentColor }} className="text-sm">AI 평균점수 8.2</p>
            <p style={{ color: currentColor }} className="text-sm">총 조회수:12,345</p>

            <div className="flex gap-4 mt-2">
              <div style={{ color: currentColor }} className="text-xs text-center">
                <div className="font-bold text-sm">{postCount}</div>
                <div>게시물</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopupType("followers");
                  setPopupUsers(followerUsers);
                }}
                style={{ color: currentColor }}
                className="text-xs text-center"
              >
                <div className="font-bold text-sm">{followerCount}</div>
                <div>팔로워</div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
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

          {/* 팔로워/팔로잉 팝업 */}
          {(popupType === "followers" || popupType === "following") && (
            <div
              className="absolute z-50 bg-white rounded-xl shadow-lg p-3 w-48 max-h-60 overflow-y-auto"
              style={{ borderColor: currentColor, border: `1px solid ${currentColor}`, left: "6.5rem", top: "0" }}
              onClick={(e) => e.stopPropagation()}
            >
              {popupUsers.length === 0 ? (
                <p style={{ color: currentColor }} className="text-xs text-center py-2">없음</p>
              ) : (
                popupUsers.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden border flex-shrink-0" style={{ borderColor: currentColor }}>
                      {u.photoURL
                        ? <img src={u.photoURL} className="w-full h-full object-cover" />
                        : <span style={{ color: currentColor }} className="text-xs flex items-center justify-center h-full">사진</span>
                      }
                    </div>
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
            <button
              style={{ borderColor: currentColor, color: currentColor }}
              className="border px-2 py-1 rounded-full text-xs w-16 text-center"
              onClick={handleAddClick}
            >
              Upload
            </button>
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 카테고리 목록 */}
        <div className="space-y-8">
          {categories.map((slots, ci) => (
            <div key={ci}>
              {/* 날짜 구분선 */}
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
                      setCurrentCategoryIdx(ci);
                      handleSlotClick(i);
                    }}
                  >
                    {deleteMode && slot && (
                      <div className="absolute top-1 left-1 z-10">
                        <input
                          type="checkbox"
                          checked={ci === currentCategoryIdx && selectedForDelete.includes(i)}
                          onChange={() => {}}
                          style={{ accentColor: currentColor }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>
                    )}
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

              {/* 아이템 정보 표시 - 로그인 사용자(본인)는 전체 정보 바로 표시 */}
              {(itemInfos[ci]?.title || itemInfos[ci]?.productName) && (
                <div
                  className="mt-2 px-3 py-2 rounded-lg space-y-1"
                  style={{ border: `1px solid ${currentColor}` }}
                >
                  {/* 1줄: 제목 + 수정 버튼 */}
                  <div className="flex justify-between items-center">
                    <span style={{ color: currentColor }} className="text-xs font-bold">
                      {itemInfos[ci]?.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalCategoryIdx(ci);
                        setModalForm({
                          title: itemInfos[ci]?.title || "",
                          productName: itemInfos[ci]?.productName || "",
                          modelName: itemInfos[ci]?.modelName || "",
                          purchaseYear: itemInfos[ci]?.purchaseYear || "",
                          price: itemInfos[ci]?.price || "",
                          notes: itemInfos[ci]?.notes || "",
                        });
                        setPendingUpload(false);
                        setShowItemModal(true);
                      }}
                      style={{ color: currentColor, borderColor: currentColor }}
                      className="text-xs border rounded-full px-2 py-0.5"
                    >
                      수정
                    </button>
                  </div>
                  {/* 2줄: 제품명 · 모델명 · 구입년도 · 판매가격 */}
                  <p style={{ color: currentColor }} className="text-xs">
                    {[
                      itemInfos[ci]?.productName,
                      itemInfos[ci]?.modelName,
                      itemInfos[ci]?.purchaseYear,
                      itemInfos[ci]?.price ? `${Number(itemInfos[ci].price).toLocaleString()}원` : "",
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {/* 3줄: 기타사항 - 본인은 바로 표시 */}
                  {itemInfos[ci]?.notes && (
                    <p style={{ color: currentColor }} className="text-xs">
                      기타: {itemInfos[ci].notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 아이템 정보 입력 모달 */}
      {showItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => {
            setShowItemModal(false);
            setPendingUpload(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-80 space-y-3"
            style={{ border: `2px solid ${currentColor}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: currentColor }} className="text-sm font-bold text-center">
              아이템 정보 입력
            </p>
            <input
              type="text"
              placeholder="제목"
              value={modalForm.title}
              onChange={(e) => setModalForm((prev) => ({ ...prev, title: e.target.value }))}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
            />
            <input
              type="text"
              placeholder="제품명"
              value={modalForm.productName}
              onChange={(e) => setModalForm((prev) => ({ ...prev, productName: e.target.value }))}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
            />
            <input
              type="text"
              placeholder="모델명"
              value={modalForm.modelName}
              onChange={(e) => setModalForm((prev) => ({ ...prev, modelName: e.target.value }))}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
            />
            <input
              type="text"
              placeholder="구입년도"
              value={modalForm.purchaseYear}
              onChange={(e) => setModalForm((prev) => ({ ...prev, purchaseYear: e.target.value }))}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
            />
            <input
              type="text"
              placeholder="판매가격"
              value={modalForm.price}
              onChange={(e) => setModalForm((prev) => ({ ...prev, price: e.target.value }))}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
            />
            <textarea
              placeholder="기타사항"
              value={modalForm.notes}
              onChange={(e) => setModalForm((prev) => ({ ...prev, notes: e.target.value }))}
              style={{ borderColor: currentColor, color: currentColor }}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none h-20 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleModalSave}
                style={{ backgroundColor: currentColor }}
                className="flex-1 text-white text-xs py-2 rounded-full"
              >
                {pendingUpload ? "저장 후 사진 선택" : "저장"}
              </button>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setPendingUpload(false);
                }}
                style={{ borderColor: currentColor, color: currentColor }}
                className="flex-1 border text-xs py-2 rounded-full"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPage;