import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import Home from "./pages/Home";
import BottomNav from "./pages/BottomNav";
import EditProfile from "./pages/EditProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/editprofile" element={<EditProfile/>}/>
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
