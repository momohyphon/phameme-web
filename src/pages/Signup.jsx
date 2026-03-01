import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useState } from "react";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/login");
    } catch (err) {
      setError("회원가입 실패. 이메일 형식을 확인해 주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="border border-purple-500 rounded-2xl p-8 w-full max-w-sm shadow-lg shadow-purple-900 ">
        <h1 className="text-3xl font-bold text-purple-400 tracking-widest text-center mb-8">
          PHAMEME
        </h1>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border border-purple-700 text-white px-4 py-2 rounded-full mb-4 outline-none focus:border-purple-400"
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border border-purple-700 text-white px-4 py-2 rounded-full mb-4 outline-none focus:border-purple-400"
        />
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}
        <button
          onClick={handleSignup}
          className="w-full bg-purple-600 hover:bg-purple-400 text-white py-2 rounded-full transition mb-4"
        >
          회원가입
        </button>
        <p className="text-purple-600 text-center">
          이미 계정이 있으신가요?{""}
          <span
            onClick={() => navigate("/login")}
            className="text-purple-400 cursor-pointer hover:underline"
          >
            로그인
          </span>
        </p>
      </div>
    </div>
  );
}

export default Signup;
