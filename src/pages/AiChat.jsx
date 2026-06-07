import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Trash, Plus, Search, ArrowLeft, MoreVertical, Check, X, Menu, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const SYSTEM_MESSAGE = "¿Hola! Soy QRide AI. Estoy aquí para ayudarte a entender tu historial médico, prepararte para emergencias o responder cualquier pregunta sobre tu salud. ¿En qué puedo asistirte hoy?";

// Custom hook para LocalStorage
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };
  return [storedValue, setValue];
}

export default function AiChat({ isPublic = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Guardamos un arreglo de conversaciones (chats)
  const [chats, setChats] = useLocalStorage(isPublic ? `qride_ai_chats_public_${id}` : 'qride_ai_chats', []);
  const [activeChatId, setActiveChatId] = useState(null);
  
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef(null);

  // Inicializar un chat si no hay ninguno
  useEffect(() => {
    if (chats.length === 0) {
      handleNewChat();
    } else if (!activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, []);

  // Auto-scroll al final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats, activeChatId]);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const handleNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'Nueva Conversación',
      date: new Date().toISOString(),
      messages: [
        { id: 'msg-1', sender: 'ai', text: SYSTEM_MESSAGE, timestamp: new Date().toISOString() }
      ]
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    if(window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: message.trim(),
      timestamp: new Date().toISOString()
    };

    // Respuesta simulada de la IA (Echo temporal / Placeholder)
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: "Entiendo. Sin embargo, como asistente en fase beta, mis respuestas están limitadas por ahora. Mantén actualizada tu ficha médica en el panel principal.",
      timestamp: new Date().toISOString()
    };

    const updatedChats = chats.map(chat => {
      if (chat.id === activeChatId) {
        // Actualizar el título en base al primer mensaje del usuario
        let newTitle = chat.title;
        if (chat.title === 'Nueva Conversación' && chat.messages.length === 1) {
          newTitle = userMessage.text.substring(0, 30) + (userMessage.text.length > 30 ? '...' : '');
        }
        return {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, userMessage, aiMessage]
        };
      }
      return chat;
    });

    setChats(updatedChats);
    setMessage('');
  };

  const handleDeleteChat = (id, e) => {
    e.stopPropagation();
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) {
      setActiveChatId(filtered.length > 0 ? filtered[0].id : null);
    }
    if (filtered.length === 0) {
      handleNewChat();
    }
  };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#F5F1F2] overflow-hidden font-sans">
      
      {/* Botón flotante para abrir sidebar en móviles */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md text-secondary"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar (Historial) */}
      <div className={`fixed inset-y-0 left-0 z-[60] w-[280px] bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}>
        {/* Header Sidebar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={() => isPublic && id ? navigate(`/p/${id}`) : navigate('/dashboard')} className="p-2 text-gray-500 hover:text-black rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          
          <button 
            onClick={handleNewChat}
            className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-secondary/90 transition-all active:scale-95"
          >
            <Plus size={16} /> Nuevo
          </button>

          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar historial..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Lista de Chats */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {filteredChats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => { setActiveChatId(chat.id); setIsSidebarOpen(false); }}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeChatId === chat.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              <div className="flex flex-col overflow-hidden w-full">
                <span className="font-bold text-sm truncate">{chat.title}</span>
                <span className="text-xs opacity-60 mt-0.5">{new Date(chat.date).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className={`p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ${activeChatId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0'}`}
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-10 font-medium">No se encontraron chats.</p>
          )}
        </div>
      </div>

      {/* Área Principal de Chat */}
      <div className="flex-1 flex flex-col relative w-full">
        {/* Header Chat */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 pl-16 md:pl-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="font-extrabold text-secondary leading-tight">QRide AI</h2>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> En línea
              </span>
            </div>
          </div>
        </header>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <AnimatePresence initial={false}>
            {activeChat?.messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex items-end gap-2 md:gap-4 max-w-3xl mx-auto ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-lg text-white">
                    <Bot size={16} />
                  </div>
                )}
                
                <div className={`p-4 rounded-2xl md:rounded-[1.5rem] shadow-sm relative ${
                  msg.sender === 'user' 
                  ? 'bg-primary text-white rounded-br-sm' 
                  : 'bg-white text-secondary rounded-bl-sm border border-gray-100'
                }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className={`text-[10px] absolute ${msg.sender === 'user' ? '-bottom-5 right-1' : '-bottom-5 left-1'} text-gray-400 font-bold`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Text */}
        <div className="p-4 md:p-6 bg-transparent shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pregúntale algo a QRide AI..." 
              className="w-full bg-white border border-gray-200 rounded-[1.5rem] pl-6 pr-16 py-4 text-secondary placeholder-gray-400 font-medium focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
            />
            <button 
              type="submit"
              disabled={!message.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-primary disabled:bg-gray-300 disabled:text-white/50 text-white rounded-xl flex items-center justify-center shadow-md transition-all active:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
      
      {/* Overlay para móvil al abrir sidebar */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/20 z-[55] backdrop-blur-sm"></div>
      )}
    </div>
  );
}
