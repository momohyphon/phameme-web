import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import {useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';


function Login() {
    const[email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
    const [colorIndex, setColorIndex] = useState(0);
    const [showSignup, setShowSignup] = useState(false);
    const [signupName ,setSignupName] = useState("");
    const [signupGender, setSignupGender] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
    const [signupError, setSignupError] = useState("");
    const [signupSuccess, setSignupSuccess] = useState("");

    useEffect(()=>{
       
        const interval = setInterval(() => {
            setColorIndex((prev) => (prev+1)% neonColors.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const currentColor = neonColors[colorIndex]

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/mypage")
        } catch (ree) {
            setError ("이메일 또는 비밀번호가 틀렸습니다.");
        }
    
    };

    const handleSignup = async () => {
        if (signupPassword !== signupPasswordConfirm) {
            setSignupError("비밀번호가 일치하지 않습니다.");
            return
        }
        try {
            await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);

            setSignupSuccess(`${signupName}님 환영합니다.`);

            setTimeout(() => {
                setShowSignup(false);
                setSignupSuccess("");
                setSignupName("");
                setSignupGender("");
                setSignupEmail("");
                setSignupPasswordConfirm("");
            }, 2000);
        } catch (err) {
            setSignupError("회원가입실패.이메일 형식을 확인해 주세요")
        }
    };

    
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div 
                style={{ borderColor: currentColor, transition: "border-color 1s ease"}}
                className="border rounded-2xl p-8 w-full max-w-sm shadow-lg"
                
            >
                <h1 
                    style ={{color: currentColor, transition: "color 1s ease"}}
                    className="text-3xl font-bold tracking-widest text-center mb-8"
                >
                    Phameme
                </h1>
                    <input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange ={(e)=> setEmail(e.target.value)}
                        style={{ borderColor: currentColor, transition: "border-color 1s ease"}}
                        className ="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e)=> setPassword(e.target.value)}
                        style={{ borderColor:currentColor, transition: "border-color 1s ease"}}
                        className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
                    />
                
                {error && (
                    <p className="text-red-400 text-sm text-center mb-4">{error}</p>
                )}

                <button
                    onClick={handleLogin}
                    style={{ backgroundColor: currentColor, transition: "background-color 1s ease"}}
                    className="w-full text-white py-2 rounded-full transition mb-4"
                >
                    로그인
                </button>
                <p style={{ color: currentColor }} className="text-sm text-center">
                    계정이 없으신가요?{""}
                    <span 
                    onClick={() => setShowSignup(true)}
                    style={{ color: currentColor}}
                    className="cursor-pointer hover:underline font-bold">
                        회원가입
                    </span>
                </p>
            </div>
        {showSignup && (
            <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
                <div
                    style={{ borderColor: currentColor, transition: "border-color 1s ease"}}
                    className="border rounded-2xl p-8 w-full max-w-sm shadow-lg bg-white"
                >
                    <h1
                        style={{ color: currentColor, transition: "color 1s ease"}}
                        className="text-3xl font-bold tracking-widest text-center mb-8"
                    >
                        Phameme
                    </h1>
                    {signupSuccess && (
                        <p style={{ color: currentColor }} className="text-center font-bold mb-4">
                            {signupSuccess}
                        </p>
                    )}
                    <input
                       type="text"
                       placeholder="이름"
                       value={signupName}
                       onChange={(e) => setSignupName(e.target.value)}
                       style={{ borderColor: currentColor, transition: "border-color 1s ease"}}
                       className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none" 
                    />
                    <div className="flex gap-6 mb-4 px-2">
                        <label style={{color: currentColor }} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="gender"
                                value="남"
                                checked={signupGender === "남"}
                                onChange={(e) => setSignupGender(e.target.value)}
                            />
                            남
                        </label>
                        <label style={{color: currentColor }} className="flex-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="gender"
                                value="여"
                                checked={signupGender === "여"}
                                onChange={(e) => setSignupGender(e.target.value)}
                            />
                            여
                        </label>

                    </div>
                    <input
                        type="email"
                        placeholder="이메일"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        style={{ borderColor: currentColor, transition:"borderColor 1s ease"}}
                        className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={signupPasswordConfirm}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={signupPasswordConfirm}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
                    />
                    {signupError && (
                        <p className="text-red-400 text-sm text-center mb-4">{signupError}</p>
                    )}
                    <button
                        onClick={handleSignup}
                        style={{ backgroundColor: currentColor, transition: "background-color 1s ease"}}
                        className="w-full text-white py-2 rounded full transition mb-4"
                    >
                        회원가입
                    </button>

                    <button
                        onClick={() => setShowSignup(false)}
                        style={{ borderColor: currentColor, color: currentColor}}
                        className="w-full border py-2 rounded-full transition"
                    >
                        닫기
                    </button>
                </div>

            </div>
                
            )}
        </div>
    );
}

export default Login;