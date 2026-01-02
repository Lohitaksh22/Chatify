import CenterChat from "./CenterChat"
import LeftBar from "./LeftBar"
import RightBar from "./RightBar"

const ChatLayout = () => {
  return (
    <div className=" bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] h-screen overflow-hidden p-6">
      <div className="mx-auto h-full max-w-[1400px] rounded-xl shadow-xl bg-white overflow-hidden">
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: "minmax(260px,300px) 1fr minmax(260px,300px)",
          }}
        >
         
          <div className=" border-r border-r-gray-500 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100">
            <LeftBar />
          </div>

          
          <div className=" border-r border-r-gray-500 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
            <CenterChat />
          </div>

          
          <div className="flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100">
            <RightBar />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatLayout
