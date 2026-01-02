const CenterChat = () => {
  return (
    <main className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b p-4">
        Chat Header
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        Messages go here
      </div>

      {/* Input */}
      <div className="shrink-0 border-t p-4">
        Message Input
      </div>
    </main>
  )
}


export default CenterChat
