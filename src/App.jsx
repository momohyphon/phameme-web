import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import Home from "./pages/Home";
import BottomNav from "./pages/BottomNav";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mypage" element={<MyPage />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
