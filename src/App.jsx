import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import Home from "./pages/Home";
import EditProfile from "./pages/EditProfile";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import BottomNav from "./pages/BottomNav";

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/editprofile" element={<EditProfile />} />
            <Route path="/chatlist" element={<ChatList />} />
            <Route path="/chatroom/:chatId" element={<ChatRoom />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
