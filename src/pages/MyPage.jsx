import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";

function MyPage() {
  const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
  const [colorIndex, setColorIndex] = useState(0);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [categories, setCategories] = useState([[null, null, null, null, null, null]]);
  const [currentCategoryIdx, setCurrentCategoryIdx] = useState(0);
  const fileInputRef = useRef(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [categoryIds, setCategoryIds] = useState([null]);
  // 삭제 모드 상태 - true면 체크박스 표시
  const [deleteMode, setDeleteMode] = useState(false);
  // 선택된 삭제 슬롯 인덱스 목록
  const [selectedForDelete, setSelectedForDelete] = useState([]);

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
        } else {
          const cardList = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.createdAt?.toDate?.() - b.createdAt?.toDate?.());
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
          setCurrentCategoryIdx(loadedCategories.length - 1);
        }
       
    });
    return () => unsubscribe();
  }, []);

  const currentColor = neonColors[colorIndex];

  const handleSlotClick = (index) => {
    // 삭제 모드일 때는 체크박스 토글
    if (deleteMode) {
      setSelectedForDelete((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
      return;
    }
    setSelectedSlot(index);
    fileInputRef.current.click();
  };

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

  const handleAddCategory = () => {
    const lastCategory = categories[categories.length - 1];
    const isEmpty = lastCategory.every((slot) => slot === null);
    if (isEmpty) {
      alert("현재 카테고리에 사진을 먼저 추가하세요.");
      return;
    }
    setCategories((prev) => [...prev, [null, null, null, null, null, null]]);
    setCategoryIds((prev) => [...prev, null]);
    setCurrentCategoryIdx(categories.length);
  };

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
        const catRef = await addDoc(collection(db, "categories"), {
          slots: slotsToSave,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          createdAt: new Date(),
        });
        setCategoryIds((prev) => {
          const updated = [...prev];
          updated[currentCategoryIdx] = catRef.id;
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

  // Delete 버튼 클릭 - 삭제 모드 진입 또는 선택된 슬롯 삭제 실행
  const handleDeleteClick = async () => {
    if (!deleteMode) {
      // 첫 번째 클릭 - 삭제 모드 진입
      setDeleteMode(true);
      setSelectedForDelete([]);
      return;
    }
    // 두 번째 클릭 - 선택된 슬롯 삭제 실행
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
    // 삭제 모드 종료
    setDeleteMode(false);
    setSelectedForDelete([]);
  };

  const currentSlots = categories[currentCategoryIdx] || [null, null, null, null, null, null];

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
        <div className="flex items-center gap-6 mb-8">
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
          <div>
            <p style={{ color: currentColor }} className="text-xl font-bold mb-1">
              @{currentUser?.email?.split("@")[0]}님
            </p>
            <p style={{ color: currentColor }} className="text-sm">AI 평균점수 8.2</p>
            <p style={{ color: currentColor }} className="text-sm">총 조회수:12,345</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {categories.map((_, ci) => (
            <button
              key={ci}
              onClick={() => setCurrentCategoryIdx(ci)}
              style={{
                borderColor: currentColor,
                color: ci === currentCategoryIdx ? "white" : currentColor,
                backgroundColor: ci === currentCategoryIdx ? currentColor : "white",
              }}
              className="border px-3 py-1 rounded-full text-xs flex-shrink-0 transition"
            >
              {ci + 1}번 카테고리
            </button>
          ))}
          <button
            onClick={handleAddCategory}
            style={{ borderColor: currentColor, color: currentColor }}
            className="border px-3 py-1 rounded-full text-xs flex-shrink-0"
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

        <div className="grid grid-cols-3 gap-2">
          {currentSlots.map((slot, i) => (
            <div
              key={i}
              style={{ borderColor: currentColor, transition: "border-color 1s ease" }}
              className="aspect-square bg-white border rounded-lg overflow-hidden flex items-center justify-center cursor-pointer relative"
              onClick={() => handleSlotClick(i)}
            >
              {/* 삭제 모드일 때 사진 있는 슬롯에만 체크박스 표시 */}
              {deleteMode && slot && (
                <div className="absolute top-1 left-1 z-10">
                  <input
                    type="checkbox"
                    checked={selectedForDelete.includes(i)}
                    onChange={() => {}}
                    style={{ accentColor: currentColor }}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
              )}
              {uploadingSlot === i ? (
                <span style={{ color: currentColor }} className="text-xs">업로드 중...</span>
              ) : slot ? (
                <img src={slot} className="w-full h-full object-cover" />
              ) : i === 0 ? (
                <span style={{ color: currentColor }} className="text-xs font-bold">Main +</span>
              ) : (
                <span style={{ color: currentColor }} className="text-xs">+</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyPage;