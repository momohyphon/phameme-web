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
  const [categoryDates, setCategoryDates] = useState([null]);
  const [deleteMode, setDeleteMode] = useState(false);
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
        setCategoryDates([null]);
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
        setCategoryDates(cardList.map((c) => c.createdAt?.toDate?.() || null));
        setCurrentCategoryIdx(loadedCategories.length - 1);
      }
    });
    return () => unsubscribe();
  }, []);

  const currentColor = neonColors[colorIndex];

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

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
    setCategoryDates((prev) => [...prev, new Date()]);
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

        <div className="space-y-8">
          {categories.map((slots, ci) => (
            <div key={ci}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: currentColor }} className="text-sm font-bold whitespace-nowrap">
                  {formatDate(categoryDates[ci]) || "날짜 없음"}
                </span>
                <div style={{ backgroundColor: currentColor, height: "2px" }} className="flex-1 opacity-50" />
              </div>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyPage;