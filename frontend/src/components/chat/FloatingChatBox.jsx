import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Minus,
  Send,
  User,
  MessageSquare,
  MessageCircle,
  ArrowLeft,
  Search,
  Check,
  Clock,
  Inbox,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Building2,
} from 'lucide-react';

const FloatingChatBox = () => {
  const {
    isWidgetOpen,
    currentView,
    conversations,
    loadingConversations,
    activeChat,
    unreadTotal,
    toggleWidget,
    selectConversation,
    backToInbox,
    closeWidget,
    sendMessage,
    emitTyping,
  } = useChat();

  const { user: currentUser } = useAuth();
  const location = useLocation();

  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom in chat view
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    if (isWidgetOpen && currentView === 'chat') {
      scrollToBottom(false);
      inputRef.current?.focus();
    }
  }, [isWidgetOpen, currentView, activeChat?.conversationId]);

  useEffect(() => {
    if (isWidgetOpen && currentView === 'chat') {
      scrollToBottom(true);
    }
  }, [activeChat?.messages, activeChat?.isTyping]);

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    emitTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1500);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    sendMessage(inputMessage);
    setInputMessage('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    emitTyping(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // Filter conversations by search query
  const convList = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = convList.filter((c) => {
    if (!c) return false;
    if (!searchQuery.trim()) return true;
    const name = c.otherUser?.displayName || c.otherUser?.fullName || '';
    const email = c.otherUser?.email || '';
    const text = c.lastMessage?.text || '';
    const q = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      text.toLowerCase().includes(q)
    );
  });

  const targetUser = activeChat?.otherUser;
  const displayName = targetUser?.displayName || targetUser?.fullName || 'Người dùng';
  const avatarUrl = targetUser?.avatar;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  // If user is not logged in, OR user is ADMIN, OR on /admin pages: NEVER render chat widget
  if (!currentUser || currentUser?.role === 'ADMIN' || location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* 1. Persistent Floating Chat Trigger Button (Bottom Right) */}
      {!isWidgetOpen && (
        <div className="fixed bottom-5 right-5 sm:right-6 z-50">
          <button
            type="button"
            onClick={toggleWidget}
            className="relative group p-3.5 bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-600 hover:from-indigo-800 hover:to-violet-700 text-white rounded-full shadow-2xl transition transform hover:scale-110 active:scale-95 cursor-pointer border-2 border-white/80"
            title="Tin nhắn & Trao đổi"
          >
            <MessageSquare className="w-6 h-6" />

            {/* Unread message count badge */}
            {unreadTotal > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse shadow-md">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}

            {/* Tooltip on hover */}
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
              {unreadTotal > 0 ? `${unreadTotal} tin nhắn mới` : 'Tin nhắn'}
            </span>
          </button>
        </div>
      )}

      {/* 2. Floating Chat Drawer / Window */}
      {isWidgetOpen && (
        <div className="fixed bottom-4 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-fade-in-up">
          {/* ================= VIEW 1: INBOX / CONVERSATIONS LIST ================= */}
          {currentView === 'inbox' && (
            <>
              {/* Inbox Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <h3 className="text-sm font-black text-white tracking-tight">
                    Tin nhắn & Trao đổi
                  </h3>
                  {unreadTotal > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full">
                      {unreadTotal} mới
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={closeWidget}
                    className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Đóng khung chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên hoặc nội dung..."
                    className="w-full py-1.5 pl-8 pr-3 bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-indigo-400 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
                {loadingConversations ? (
                  <div className="p-8 flex flex-col items-center justify-center space-y-2.5">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Đang tải danh sách...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Không có tin nhắn nào'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                        {searchQuery
                          ? 'Vui lòng thử tìm kiếm với từ khóa khác.'
                          : 'Khi bạn trao đổi với giảng viên hoặc sinh viên, tin nhắn sẽ hiển thị tại đây.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const other = conv.otherUser;
                    const otherName = other?.displayName || other?.fullName || 'Người dùng';
                    const otherAvatar = other?.avatar;
                    const otherInitial = otherName.charAt(0).toUpperCase();
                    const hasUnread = (conv.unreadCount || 0) > 0;

                    return (
                      <div
                        key={conv._id}
                        onClick={() => selectConversation(conv)}
                        className={`p-3.5 flex items-center gap-3 hover:bg-indigo-50/50 transition cursor-pointer group ${
                          hasUnread ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {otherAvatar ? (
                            <img
                              src={otherAvatar}
                              alt={otherName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center border border-white shadow-2xs">
                              {otherInitial}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4
                              className={`text-xs truncate ${
                                hasUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'
                              }`}
                            >
                              {otherName}
                            </h4>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              {formatMessageTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-[11px] truncate ${
                                hasUnread
                                  ? 'font-bold text-indigo-700'
                                  : 'text-slate-500 group-hover:text-slate-700'
                              }`}
                            >
                              {conv.lastMessage?.text || 'Bắt đầu cuộc trò chuyện'}
                            </p>

                            {hasUnread && (
                              <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ================= VIEW 2: ACTIVE CHAT VIEW ================= */}
          {currentView === 'chat' && (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-xs select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={backToInbox}
                    className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                    title="Quay lại danh sách tin nhắn"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover border border-white/80 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-900 text-white font-bold text-xs flex items-center justify-center border border-white/80 shadow-2xs">
                        {initial}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate leading-snug">
                      {displayName}
                    </h4>
                    <div className="text-[10px] text-indigo-100/90 truncate">
                      {targetUser?.role === 'LECTURER'
                        ? 'Giảng Viên'
                        : targetUser?.role === 'STUDENT'
                        ? 'Sinh Viên'
                        : targetUser?.role === 'COMPANY'
                        ? 'Doanh Nghiệp'
                        : targetUser?.role === 'TBM'
                        ? 'Trưởng Bộ Môn'
                        : 'Trò chuyện'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={closeWidget}
                    className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Đóng khung chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50/70 space-y-3">
                {activeChat.loading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-2.5 py-12">
                    <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Đang kết nối hội thoại...</span>
                  </div>
                ) : activeChat.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Bắt đầu cuộc trò chuyện</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                        Gửi tin nhắn để trao đổi trực tiếp với{' '}
                        <strong className="text-slate-700">{displayName}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeChat.messages.map((msg, index) => {
                    const isMe = String(msg.sender?._id || msg.sender) === String(currentUser?._id);
                    const showAvatar =
                      !isMe &&
                      (index === 0 ||
                        String(activeChat.messages[index - 1]?.sender?._id || activeChat.messages[index - 1]?.sender) !==
                          String(msg.sender?._id || msg.sender));

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <div className="w-6 h-6 shrink-0 mb-1">
                            {showAvatar ? (
                              avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shadow-2xs" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                  {initial}
                                </div>
                              )
                            ) : null}
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] group ${
                            isMe ? 'items-end' : 'items-start'
                          } flex flex-col`}
                        >
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span
                            className={`text-[9px] text-slate-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isMe ? 'text-right' : 'text-left'
                            }`}
                          >
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing indicator */}
                {activeChat.isTyping && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {initial}
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 py-2 px-3.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-indigo-400 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center shrink-0 transition shadow-xs cursor-pointer"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChatBox;
