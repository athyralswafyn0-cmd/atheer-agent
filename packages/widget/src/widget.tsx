import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './widget.css';

interface WidgetConfig {
  botId: string;
  apiUrl: string;
  cdnUrl: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  language?: string; // Any BCP 47 language code (e.g., 'ar', 'en', 'fr', 'es', 'de', 'zh', 'ja', 'ko', 'pt', 'it', 'ru', 'tr', 'hi', 'bn', 'ur', etc.)
  model?: string; // AI model to use (e.g., 'gpt-4-turbo-preview', 'gpt-4o', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'gemini-pro')
  onLeadCapture?: (lead: any) => void;
  onMessage?: (message: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface BotConfig {
  id: string;
  name: string;
  welcomeMessage: string;
  placeholder: string;
  primaryColor: string;
  secondaryColor: string;
  position: string;
  showBranding: boolean;
  language: string;
  supportedLanguages: string[];
  collectLeads: boolean;
  leadFields: Array<{ key: string; label: string; type: string; required: boolean }>;
  avatar?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

const translations: Record<string, Record<string, string>> = {
  ar: {
    welcome: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
    placeholder: 'اكتب رسالتك هنا...',
    send: 'إرسال',
    typing: 'يكتب...',
    error: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
    offline: 'نحن غير متصلين حالياً. سيعود فريقنا قريباً.',
    minimize: 'تصغير',
    maximize: 'تكبير',
    close: 'إغلاق',
    newChat: 'محادثة جديدة',
    leadName: 'الاسم',
    leadEmail: 'البريد الإلكتروني',
    leadPhone: 'الهاتف',
    leadCompany: 'الشركة',
    leadSubmit: 'إرسال',
    leadSuccess: 'شكراً! سنتواصل معك قريباً.',
    leadError: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    leadFormTitle: 'لنتواصل معك',
    poweredBy: 'مدعوم بالذكاء الاصطناعي',
  },
  en: {
    welcome: 'Hello! How can I help you today?',
    placeholder: 'Type your message...',
    send: 'Send',
    typing: 'Typing...',
    error: 'Sorry, an error occurred. Please try again.',
    offline: 'We are currently offline. Our team will be back soon.',
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',
    newChat: 'New Chat',
    leadName: 'Name',
    leadEmail: 'Email',
    leadPhone: 'Phone',
    leadCompany: 'Company',
    leadSubmit: 'Submit',
    leadSuccess: 'Thank you! We\'ll be in touch soon.',
    leadError: 'An error occurred. Please try again.',
    leadFormTitle: 'Let\'s stay in touch',
    poweredBy: 'Powered by AI',
  },
  fr: {
    welcome: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
    placeholder: 'Tapez votre message...',
    send: 'Envoyer',
    typing: 'Écrit...',
    error: 'Désolé, une erreur est survenue. Veuillez réessayer.',
    offline: 'Nous sommes actuellement hors ligne. Notre équipe reviendra bientôt.',
    minimize: 'Réduire',
    maximize: 'Agrandir',
    close: 'Fermer',
    newChat: 'Nouvelle conversation',
    leadName: 'Nom',
    leadEmail: 'E-mail',
    leadPhone: 'Téléphone',
    leadCompany: 'Entreprise',
    leadSubmit: 'Envoyer',
    leadSuccess: 'Merci ! Nous vous contacterons bientôt.',
    leadError: 'Une erreur est survenue. Veuillez réessayer.',
    leadFormTitle: 'Restons en contact',
    poweredBy: 'Propulsé par l\'IA',
  },
  es: {
    welcome: '¡Hola! ¿Cómo puedo ayudarte hoy?',
    placeholder: 'Escribe tu mensaje...',
    send: 'Enviar',
    typing: 'Escribiendo...',
    error: 'Lo siento, ocurrió un error. Por favor, inténtalo de nuevo.',
    offline: 'Actualmente estamos desconectados. Nuestro equipo volverá pronto.',
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    close: 'Cerrar',
    newChat: 'Nuevo chat',
    leadName: 'Nombre',
    leadEmail: 'Correo electrónico',
    leadPhone: 'Teléfono',
    leadCompany: 'Empresa',
    leadSubmit: 'Enviar',
    leadSuccess: '¡Gracias! Nos pondremos en contacto pronto.',
    leadError: 'Ocurrió un error. Por favor, inténtalo de nuevo.',
    leadFormTitle: 'Mantengámonos en contacto',
    poweredBy: 'Impulsado por IA',
  },
  de: {
    welcome: 'Hallo! Wie kann ich Ihnen heute helfen?',
    placeholder: 'Nachricht eingeben...',
    send: 'Senden',
    typing: 'Tippt...',
    error: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    offline: 'Wir sind derzeit offline. Unser Team wird bald zurück sein.',
    minimize: 'Minimieren',
    maximize: 'Maximieren',
    close: 'Schließen',
    newChat: 'Neuer Chat',
    leadName: 'Name',
    leadEmail: 'E-Mail',
    leadPhone: 'Telefon',
    leadCompany: 'Unternehmen',
    leadSubmit: 'Senden',
    leadSuccess: 'Danke! Wir melden uns bald bei Ihnen.',
    leadError: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    leadFormTitle: 'Bleiben wir in Kontakt',
    poweredBy: 'Angetrieben von KI',
  },
  zh: {
    welcome: '您好！今天我能为您做些什么？',
    placeholder: '输入您的消息...',
    send: '发送',
    typing: '正在输入...',
    error: '抱歉，发生了错误。请重试。',
    offline: '我们目前不在线。我们的团队稍后将回来。',
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭',
    newChat: '新对话',
    leadName: '姓名',
    leadEmail: '邮箱',
    leadPhone: '电话',
    leadCompany: '公司',
    leadSubmit: '提交',
    leadSuccess: '谢谢！我们会尽快与您联系。',
    leadError: '发生错误。请重试。',
    leadFormTitle: '让我们保持联系',
    poweredBy: '由AI驱动',
  },
  ja: {
    welcome: 'こんにちは！今日はどのようにお手伝いできますか？',
    placeholder: 'メッセージを入力...',
    send: '送信',
    typing: '入力中...',
    error: '申し訳ありません、エラーが発生しました。再度お試しください。',
    offline: '現在オフラインです。チームがまもなく戻ります。',
    minimize: '最小化',
    maximize: '最大化',
    close: '閉じる',
    newChat: '新しいチャット',
    leadName: '名前',
    leadEmail: 'メール',
    leadPhone: '電話',
    leadCompany: '会社',
    leadSubmit: '送信',
    leadSuccess: 'ありがとうございます！近日中にご連絡いたします。',
    leadError: 'エラーが発生しました。再度お試しください。',
    leadFormTitle: 'ご連絡をお待ちしています',
    poweredBy: 'AI搭載',
  },
  ko: {
    welcome: '안녕하세요! 오늘 어떻게 도와드릴까요?',
    placeholder: '메시지를 입력하세요...',
    send: '보내기',
    typing: '입력 중...',
    error: '죄송합니다, 오류가 발생했습니다. 다시 시도해 주세요.',
    offline: '현재 오프라인입니다. 팀이 곧 돌아옵니다.',
    minimize: '최소화',
    maximize: '최대화',
    close: '닫기',
    newChat: '새 채팅',
    leadName: '이름',
    leadEmail: '이메일',
    leadPhone: '전화',
    leadCompany: '회사',
    leadSubmit: '제출',
    leadSuccess: '감사합니다! 곧 연락드리겠습니다.',
    leadError: '오류가 발생했습니다. 다시 시도해 주세요.',
    leadFormTitle: '연락을 기다리겠습니다',
    poweredBy: 'AI 기반',
  },
  pt: {
    welcome: 'Olá! Como posso ajudar você hoje?',
    placeholder: 'Digite sua mensagem...',
    send: 'Enviar',
    typing: 'Digitando...',
    error: 'Desculpe, ocorreu um erro. Tente novamente.',
    offline: 'Estamos offline no momento. Nossa equipe voltará em breve.',
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    close: 'Fechar',
    newChat: 'Novo chat',
    leadName: 'Nome',
    leadEmail: 'E-mail',
    leadPhone: 'Telefone',
    leadCompany: 'Empresa',
    leadSubmit: 'Enviar',
    leadSuccess: 'Obrigado! Entraremos em contato em breve.',
    leadError: 'Ocorreu um erro. Tente novamente.',
    leadFormTitle: 'Vamos manter contato',
    poweredBy: 'Impulsionado por IA',
  },
  it: {
    welcome: 'Ciao! Come posso aiutarti oggi?',
    placeholder: 'Scrivi il tuo messaggio...',
    send: 'Invia',
    typing: 'Sta scrivendo...',
    error: 'Mi dispiace, si è verificato un errore. Riprova.',
    offline: 'Siamo attualmente offline. Il nostro team tornerà presto.',
    minimize: 'Minimizza',
    maximize: 'Massimizza',
    close: 'Chiudi',
    newChat: 'Nuova chat',
    leadName: 'Nome',
    leadEmail: 'Email',
    leadPhone: 'Telefono',
    leadCompany: 'Azienda',
    leadSubmit: 'Invia',
    leadSuccess: 'Grazie! Ti contatteremo presto.',
    leadError: 'Si è verificato un errore. Riprova.',
    leadFormTitle: 'Restiamo in contatto',
    poweredBy: 'Alimentato da AI',
  },
  ru: {
    welcome: 'Здравствуйте! Чем могу помочь сегодня?',
    placeholder: 'Введите сообщение...',
    send: 'Отправить',
    typing: 'Печатает...',
    error: 'Извините, произошла ошибка. Попробуйте еще раз.',
    offline: 'Мы сейчас офлайн. Наша команда скоро вернется.',
    minimize: 'Свернуть',
    maximize: 'Развернуть',
    close: 'Закрыть',
    newChat: 'Новый чат',
    leadName: 'Имя',
    leadEmail: 'Email',
    leadPhone: 'Телефон',
    leadCompany: 'Компания',
    leadSubmit: 'Отправить',
    leadSuccess: 'Спасибо! Мы свяжемся с вами в ближайшее время.',
    leadError: 'Произошла ошибка. Попробуйте еще раз.',
    leadFormTitle: 'Остаемся на связи',
    poweredBy: 'На базе ИИ',
  },
  tr: {
    welcome: 'Merhaba! Bugün size nasıl yardımcı olabilirim?',
    placeholder: 'Mesajınızı yazın...',
    send: 'Gönder',
    typing: 'Yazıyor...',
    error: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
    offline: 'Şu anda çevrimdışıyız. Ekibimiz yakında dönecek.',
    minimize: 'Küçült',
    maximize: 'Büyüt',
    close: 'Kapat',
    newChat: 'Yeni sohbet',
    leadName: 'Ad',
    leadEmail: 'E-posta',
    leadPhone: 'Telefon',
    leadCompany: 'Şirket',
    leadSubmit: 'Gönder',
    leadSuccess: 'Teşekkürler! En kısa sürede size ulaşacağız.',
    leadError: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    leadFormTitle: 'İletişimde kalalım',
    poweredBy: 'AI destekli',
  },
  hi: {
    welcome: 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूँ?',
    placeholder: 'अपना संदेश टाइप करें...',
    send: 'भेजें',
    typing: 'टाइप कर रहा है...',
    error: 'क्षमा करें, एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    offline: 'हम वर्तमान में ऑफ़लाइन हैं। हमारी टीम जल्द ही वापस आएगी।',
    minimize: 'न्यूनतम करें',
    maximize: 'अधिकतम करें',
    close: 'बंद करें',
    newChat: 'नई चैट',
    leadName: 'नाम',
    leadEmail: 'ईमेल',
    leadPhone: 'फोन',
    leadCompany: 'कंपनी',
    leadSubmit: 'भेजें',
    leadSuccess: 'धन्यवाद! हम जल्द ही आपसे संपर्क करेंगे।',
    leadError: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    leadFormTitle: 'संपर्क में रहें',
    poweredBy: 'AI द्वारा संचालित',
  },
};

// Helper to get translation with fallback chain: requested -> en -> ar -> first available
function getTranslation(lang: string, key: string): string {
  const langTranslations = translations[lang];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key];
  }
  // Fallback to English
  if (translations.en[key]) {
    return translations.en[key];
  }
  // Fallback to Arabic
  if (translations.ar[key]) {
    return translations.ar[key];
  }
  // Fallback to first available translation
  const firstLang = Object.keys(translations)[0];
  return translations[firstLang]?.[key] || key;
}

const Widget = ({ config }: { config: WidgetConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [leadForm, setLeadForm] = useState<Record<string, string>>({});
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [language, setLanguage] = useState(config.language || 'ar');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Use getTranslation function for all translations with fallback support
  const t = (key: string) => getTranslation(language, key);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchBotConfig = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/widget/bots/${config.botId}/config`);
      if (response.ok) {
        const data = await response.json();
        setBotConfig(data);
        if (data.welcomeMessage) {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: data.welcomeMessage,
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bot config:', error);
    }
  };

  useEffect(() => {
    fetchBotConfig();
  }, [config.botId, config.apiUrl]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${config.apiUrl}/widget/bots/${config.botId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          sessionId: localStorage.getItem(`chat_session_${config.botId}`) || '',
          language,
          model: config.model,
        }),
      });

      const data = await response.json();

      if (data.sessionId) {
        localStorage.setItem(`chat_session_${config.botId}`, data.sessionId);
      }

      if (data.message) {
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        config.onMessage?.(assistantMessage);
      }

      if (data.showLeadForm && botConfig?.collectLeads) {
        setShowLeadForm(true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: t('error'),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const submitLead = async () => {
    if (leadSubmitting) return;
    setLeadSubmitting(true);

    try {
      const response = await fetch(`${config.apiUrl}/widget/bots/${config.botId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm),
      });

      if (response.ok) {
        setShowLeadForm(false);
        setLeadForm({});
        const successMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: t('leadSuccess'),
                timestamp: new Date().toISOString(),
              };
        setMessages(prev => [...prev, successMessage]);
        config.onLeadCapture?.(leadForm);
      } else {
        throw new Error('Failed to submit lead');
      }
    } catch (error) {
      console.error('Lead submission error:', error);
      alert(t('leadError'));
    } finally {
      setLeadSubmitting(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        config.onOpen?.();
      } else {
        config.onClose?.();
      }
      return next;
    });
  };

  const startNewChat = () => {
    setMessages(botConfig ? [{ id: 'welcome', role: 'assistant', content: botConfig.welcomeMessage, timestamp: new Date().toISOString() }] : []);
    localStorage.removeItem(`chat_session_${config.botId}`);
  };

  const positionStyles = {
    position: 'fixed' as const,
    zIndex: 9999,
    [config.position?.split('-')[1] || 'right']: '20px',
    [config.position?.split('-')[0] || 'bottom']: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    direction: language === 'ar' ? 'rtl' : 'ltr',
  };

  const primaryColor = botConfig?.primaryColor || config.primaryColor || '#2563eb';

  if (!isOpen) {
    return (
      <div style={positionStyles} ref={widgetContainerRef}>
        <button
          onClick={toggleChat}
          className="ai-assistant-toggle"
          style={{
            background: primaryColor,
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'; }}
          aria-label={t('maximize')}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={positionStyles} ref={widgetContainerRef}>
      <div
        className="ai-assistant-window"
        style={{
          width: '380px',
          height: '580px',
          background: botConfig?.secondaryColor || '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="ai-assistant-header"
          style={{
            background: primaryColor,
            color: 'white',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {botConfig?.avatar && <img src={botConfig.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{botConfig?.name || 'Assistant'}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={startNewChat}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              title={t('newChat')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12H5"></path>
              </svg>
            </button>
            <button
              onClick={toggleChat}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              aria-label={t('minimize')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {showLeadForm && botConfig?.collectLeads && (
          <div className="ai-assistant-lead-form" style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>{t('leadFormTitle')}</h4>
            {botConfig.leadFields.map((field) => (
              <div key={field.key} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                  value={leadForm[field.key] || ''}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.label}
                  required={field.required}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
            ))}
            <button
              onClick={submitLead}
              disabled={leadSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                background: leadSubmitting ? '#9ca3af' : primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: leadSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {leadSubmitting ? 'جاري الإرسال...' : t('leadSubmit')}
            </button>
          </div>
        )}

        <div
          className="ai-assistant-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease-out',
            }}>
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? primaryColor : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : '#1f2937',
                fontSize: '14px',
                lineHeight: 1.5,
                wordWrap: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                background: '#f3f4f6',
                borderRadius: '18px 18px 18px 4px',
                display: 'flex',
                gap: '4px',
              }}>
                <span className="typing-dot" style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', animation: 'typing 1.4s infinite' }}></span>
                <span className="typing-dot" style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', animation: 'typing 1.4s infinite 0.2s' }}></span>
                <span className="typing-dot" style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', animation: 'typing 1.4s infinite 0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-assistant-input" style={{ padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            disabled={isLoading || showLeadForm}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '24px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              minHeight: '48px',
              maxHeight: '120px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            aria-label="Message input"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || showLeadForm}
            style={{
              background: input.trim() && !isLoading && !showLeadForm ? primaryColor : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: input.trim() && !isLoading && !showLeadForm ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s',
            }}
            onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'scale(1)')}
            aria-label={t('send')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        {(botConfig?.showBranding !== false) && (
          <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>
            {t('poweredBy')}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};

declare global {
  interface Window {
    AICustomerAssistant: {
      init: (config: WidgetConfig) => void;
      destroy: () => void;
    };
  }
}

let widgetRoot: any = null;
let widgetContainer: HTMLDivElement | null = null;

export function init(config: WidgetConfig) {
  if (widgetRoot) {
    console.warn('Widget already initialized');
    return;
  }

  widgetContainer = document.createElement('div');
  widgetContainer.id = 'ai-customer-assistant-widget';
  document.body.appendChild(widgetContainer);

  widgetRoot = createRoot(widgetContainer);
  widgetRoot.render(<Widget config={config} />);

  window.AICustomerAssistant = {
    init,
    destroy: () => {
      widgetRoot?.unmount();
      widgetContainer?.remove();
      widgetRoot = null;
      widgetContainer = null;
    },
  };
}

if (typeof window !== 'undefined') {
  (window as any).AICustomerAssistant = window.AICustomerAssistant || { init };
}

export default Widget;