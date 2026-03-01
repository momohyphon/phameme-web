function Home() {
    return (
        <div className="min-h-screen bg-black text-white">
            <header className="border-b border-purple-500 px-4 py-3 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-purple-400 tracking-widest">
                    PHAMEME
                </h1>

                <button className="border border-purple-500 text-purple-400 px-4 py-1 rounded-full hover:bg-purple-500 hover:text-black transition">
                    로그인
                </button>

            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                <div className="border border-purple-500 rounded-xl p-4 mb-6 text-center shadow-lg shadow-purple-900 ">
                    <p className="text-purple-300 text-sm">오늘의 착샷을 올려보세요</p>
                    <button className="mt-2 bg-purple-600 hover:bg-purple-400 text-white px-6 py-2 rounded-full text-sm transition">
                        업로드
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="border border-purple-800 rounded-xl overflow-hidden shadow-md shadow-purple-900">
                        <div className="flex items-center gap-2 px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500"/>
                            <span className="text-purple-300">@user1</span>
                            </div>
                            
                            <div className="w-full h-64 bg-purple-950 flex items-center justify-center">
                                <span className="text-purple-600 text-sm">사진영역</span>

                            </div>
                            <div className="p-4 py-3 flex justify-between items-center">
                                <span className="text-purple-400 text-sm">AI점수: 8.5</span>
                                <span className="text-purple-600 text-xs">조회수 1,234</span>
                            </div>


                        </div>

                        <div className="border border-purple-800 rounded-xl overflow-hidden shadow-md shadow-purple-900">
                            <div className="flex items-center gap-2 px-4 py-3">
                                <div className="w-8 h-8 rounded-full bg-purple-400" />
                                <span className="text-sm text-purple-300">@user2</span>
                            </div>
                            <div className="w-full h-64 bg-purple-950 flex items-center justify-center">
                                <span className="text-purple-600">사진영역</span>

                            </div>
                            <div className="px-4 py-3 flex justify-between items-center">
                                <span className="text-purple-400 text-sm">AI점수 7.2</span>
                                <span className="text-purple-600 text-xs">조회수</span>
                            </div>

                        </div>
                    </div>

                

            </main>

        </div>
    );
}

export default Home;