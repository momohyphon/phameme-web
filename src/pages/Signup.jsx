// import { auth } from "../firebase";
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { useNavigate } from "react-router-dom";

// import { useState, useEffect } from "react";

// function Signup() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();
//   const neonColors = ["#7C3AED", "#EC4899", "#F97316", "#3B82F6", "#10B981"];
//   const [colorIndex, setColorIndex] = useState(0);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setColorIndex((prev) => (prev + 1) % neonColors.length);
//     }, 2000);
//     return () => clearInterval(interval);
//   }, []);
//   const currentColor = neonColors[colorIndex];

//   const handleSignup = async () => {
//     try {
//       await createUserWithEmailAndPassword(auth, email, password);
//       navigate("/login");
//     } catch (err) {
//       setError("회원가입 실패. 이메일 형식을 확인해 주세요.");
//     }
//   };

//   return (
//     <div className="min-h-screen bg white flex items-center justify-center">
//       <div
//         style={{
//           borderColor: currentColor,
//           transition: "border-color 1s ease",
//         }}
//         className="border rounded-2xl p-8 w-full max w-sm shadow-lg"
//       >
//         {/* 로고 -글자색 변동 */}
//         <h1
//           style={{ color: currentColor, transition: "color 1s ease" }}
//           className="text-3xl font-bold tracking-widest text-center mb-8"
//         >
//           Phameme
//         </h1>
//         {/* 이메일 입력-외곽선 색상변동 */}
//         <input
//           type="email"
//           placeholder="이메일"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           style={{
//             borderColor: currentColor,
//             transition: "border-color 1s ease",
//           }}
//           className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
//         />
//         {/* 비밀번호 입력-외과선 색상 변동 */}
//         <input
//           type="password"
//           placeholder="비밀번호"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           style={{
//             borderColor: currentColorm,
//             transition: "border-color 1s ease",
//           }}
//           className="w-full bg-white border text-black px-4 py-2 rounded-full mb-4 outline-none"
//         />
//         {/* 오류 메시지-오류 있을때만 표시 */}
//         {error && (
//           <p className="text-red-400 text-sm text-center mb-4">{error}</p>
//         )}
//         {/* 회원 가입 버튼-배경색 버튼 */}
//         <button
//           onClick={handleSignup}
//           style={{
//             backgroundClolor: currentColor,
//             transition: "background-color 1s ease",
//           }}
//           className="w-full text-white py-2 rounded-full transition mb-4"
//         >
//           회원가입
//         </button>

//         {/* 로그인 링크 */}
//         <p className="text-purple-600 text-center">
//           이미 계정이 있으신가요?{""}
//           <span
//             onClick={() => navigate("/login")}
//             style={{ color: currentColor }}
//             className="cursor-pointer hover:underline font bold"
//           >
//             로그인
//           </span>
//         </p>
//       </div>
//     </div>
//   );
// }

// export default Signup;
