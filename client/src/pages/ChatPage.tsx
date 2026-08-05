import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Send, User, Search, MoreVertical, Phone, Video, Info } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ChatPage() {
  const { userId } = useParams<{ userId?: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatList } = trpc.chat.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: messages, refetch, isLoading: messagesLoading } = trpc.chat.messages.useQuery(
    { otherUserId: Number(userId) },
    { enabled: !!userId && isAuthenticated, refetchInterval: 2000 }
  );

  const sendMsg = trpc.chat.send.useMutation({
    onSuccess: () => { 
      setMessage(""); 
      setTimeout(() => refetch(), 100);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auth guard
  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) return <Layout><div className="container py-16 text-center text-muted-foreground">Загрузка...</div></Layout>;

  const filteredChatList = chatList?.filter(partnerId => 
    String(partnerId).includes(searchQuery)
  ) || [];

  const currentChat = userId ? chatList?.find(id => id === Number(userId)) : null;

  const handleSendMessage = () => {
    if (!message.trim() || !userId) return;
    sendMsg.mutate({ receiverId: Number(userId), message });
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Сообщения</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
          {/* Chat List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-lg">Диалоги</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {/* Search */}
              <div className="p-3 border-b sticky top-0 bg-background">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Поиск..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>

              {/* Chat List Items */}
              {filteredChatList.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {chatList?.length === 0 ? "Нет диалогов" : "Диалоги не найдены"}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredChatList.map(partnerId => (
                    <button
                      key={partnerId}
                      onClick={() => navigate(`/chat/${partnerId}`)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-accent ${
                        Number(userId) === partnerId ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">Пользователь #{partnerId}</p>
                        <p className="text-xs text-muted-foreground truncate">Последнее сообщение...</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-3 flex flex-col overflow-hidden">
            {!userId ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p>Выберите диалог для начала общения</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Пользователь #{userId}</CardTitle>
                      <p className="text-xs text-muted-foreground">Онлайн</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost"><Phone className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"><Video className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"><Info className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-auto p-4 space-y-4 flex flex-col justify-end">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground">Загрузка сообщений...</div>
                  ) : messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">Начните беседу с этим пользователем</p>
                    </div>
                  ) : (
                    messages?.map((msg, idx) => {
                      const isOwn = msg.senderId === user?.id;
                      const showDate = idx === 0 || new Date(messages[idx - 1]?.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                      
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex items-center gap-2 my-4">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString('ru-RU')}</span>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[60%] rounded-2xl px-4 py-2 ${
                              isOwn 
                                ? 'bg-primary text-primary-foreground rounded-br-none' 
                                : 'bg-muted rounded-bl-none'
                            }`}>
                              <p className="text-sm break-words">{msg.message}</p>
                              <p className={`text-xs mt-1 ${isOwn ? 'opacity-70' : 'opacity-60'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Input Area */}
                <div className="border-t p-4 bg-background">
                  <div className="flex gap-2">
                    <Input 
                      value={message} 
                      onChange={e => setMessage(e.target.value)} 
                      placeholder="Введите сообщение..." 
                      onKeyDown={e => { 
                        if (e.key === 'Enter' && !e.shiftKey && message.trim()) { 
                          handleSendMessage();
                        } 
                      }}
                      className="flex-1"
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSendMessage} 
                      disabled={sendMsg.isPending || !message.trim()}
                      className="gap-1"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Нажмите Enter для отправки</p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
