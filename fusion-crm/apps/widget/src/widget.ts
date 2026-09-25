const STYLES = `
:host {
  --primary: #0f172a;
  --bg: #ffffff;
  --text: #1e293b;
  --muted: #f1f5f9;
  --border: #e2e8f0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
#widget-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.left-position {
  right: auto !important;
  left: 24px !important;
  align-items: flex-start !important;
}
#bubble {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: var(--primary);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  border: none;
  outline: none;
}
#bubble:hover {
  transform: scale(1.05);
}
#window {
  display: none;
  width: 360px;
  height: 600px;
  max-height: calc(100vh - 100px);
  background: var(--bg);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid var(--border);
}
@media (max-width: 640px) {
  #window {
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
    bottom: 0;
    right: 0;
    position: fixed;
    margin-bottom: 0;
    border-radius: 0;
  }
}
#header {
  background: var(--primary);
  color: white;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#header-title {
  font-weight: 600;
  margin: 0;
}
#close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 20px;
}
#content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
#footer {
  padding: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 8px;
}
input, button {
  font-family: inherit;
}
#message-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 20px;
  outline: none;
}
#message-input:focus {
  border-color: var(--primary);
}
#send-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
}
#send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.message {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}
.message.bot {
  align-self: flex-start;
  background: var(--muted);
  color: var(--text);
  border-bottom-left-radius: 4px;
}
.message.user {
  align-self: flex-end;
  background: var(--primary);
  color: white;
  border-bottom-right-radius: 4px;
}
.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.quick-reply-btn {
  background: var(--bg);
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-reply-btn:hover {
  background: var(--primary);
  color: white;
}
.pre-chat-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  justify-content: center;
}
.pre-chat-form label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.pre-chat-form input {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.pre-chat-form button {
  background: var(--primary);
  color: white;
  padding: 12px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}
.consent-container {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  color: var(--text);
}
.whatsapp-btn {
  background: #25D366;
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  align-self: center;
  margin-top: 16px;
}
`;

class FusionWidget extends HTMLElement {
  private container: HTMLDivElement;
  private bubble: HTMLButtonElement;
  private window: HTMLDivElement;
  private content: HTMLDivElement;
  private footer: HTMLDivElement;
  private input: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  
  private isOpen = false;
  private publicKey = '';
  private config: any = null;
  private visitorToken = '';
  private isIdentified = false;
  private apiBase = window.location.origin;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = STYLES;
    this.shadowRoot!.appendChild(style);

    this.container = document.createElement('div');
    this.container.id = 'widget-container';

    // Build Window
    this.window = document.createElement('div');
    this.window.id = 'window';
    this.window.innerHTML = `
      <div id="header">
        <h3 id="header-title">Cargando...</h3>
        <button id="close-btn" aria-label="Cerrar chat">&times;</button>
      </div>
      <div id="content"></div>
      <div id="footer">
        <input type="text" id="message-input" placeholder="Escribe un mensaje..." aria-label="Mensaje" disabled />
        <button id="send-btn" disabled>Enviar</button>
      </div>
    `;

    // Build Bubble
    this.bubble = document.createElement('button');
    this.bubble.id = 'bubble';
    this.bubble.setAttribute('aria-label', 'Abrir chat');
    this.bubble.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
    
    this.container.appendChild(this.window);
    this.container.appendChild(this.bubble);
    this.shadowRoot!.appendChild(this.container);

    // Bind elements
    this.content = this.window.querySelector('#content') as HTMLDivElement;
    this.footer = this.window.querySelector('#footer') as HTMLDivElement;
    this.input = this.window.querySelector('#message-input') as HTMLInputElement;
    this.sendBtn = this.window.querySelector('#send-btn') as HTMLButtonElement;

    // Events
    this.bubble.addEventListener('click', () => this.toggle());
    this.window.querySelector('#close-btn')!.addEventListener('click', () => this.toggle());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  connectedCallback() {
    // Read config from script tag attribute
    const scriptTag = document.currentScript || document.querySelector('script[data-key]');
    if (scriptTag) {
      this.publicKey = scriptTag.getAttribute('data-key') || '';
      // We can allow overriding the API base via an attribute
      const customApi = scriptTag.getAttribute('data-api');
      if (customApi) this.apiBase = customApi;
    }
    
    this.visitorToken = localStorage.getItem('fusion_visitor_token') || '';
    this.isIdentified = localStorage.getItem('fusion_identified') === 'true';

    this.fetchConfig();
  }

  async fetchConfig() {
    try {
      const res = await fetch(`${this.apiBase}/api/widget/config?key=${this.publicKey}`);
      if (!res.ok) throw new Error('Config not found');
      this.config = await res.json();
      this.applyConfig();
    } catch (e) {
      console.error('Failed to load Fusion Widget config:', e);
      this.bubble.style.display = 'none';
    }
  }

  applyConfig() {
    this.container.style.setProperty('--primary', this.config.primaryColor);
    if (this.config.position === 'left') {
      this.container.classList.add('left-position');
    }
    const title = this.window.querySelector('#header-title') as HTMLHeadingElement;
    title.textContent = this.config.organizationName || 'Soporte';
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.window.style.display = this.isOpen ? 'flex' : 'none';
    if (this.isOpen) {
      this.input.focus();
      if (!this.visitorToken) {
        this.initSession();
      } else if (!this.isIdentified) {
        this.renderPreChatForm();
      } else if (this.content.children.length === 0) {
        this.renderChat();
        this.loadHistory();
      }
    }
  }

  async initSession() {
    try {
      const res = await fetch(`${this.apiBase}/api/widget/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: this.publicKey,
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent
        })
      });
      const data = await res.json();
      this.visitorToken = data.token;
      localStorage.setItem('fusion_visitor_token', this.visitorToken);
      this.renderPreChatForm();
    } catch (e) {
      console.error(e);
    }
  }

  renderPreChatForm() {
    this.content.innerHTML = `
      <div class="pre-chat-form">
        <h3>${this.config.greeting}</h3>
        <p style="font-size: 14px; color: var(--text);">Por favor, indícanos tus datos para comenzar:</p>
        
        <label for="name">Nombre</label>
        <input type="text" id="name" required />
        
        <label for="contact">Correo o Celular</label>
        <input type="text" id="contact" required />
        
        <div class="consent-container">
          <input type="checkbox" id="consent" />
          <label for="consent" style="font-weight: normal;">Acepto la Política de Tratamiento de Datos Personales.</label>
        </div>
        
        <button id="start-btn">Comenzar Chat</button>
      </div>
    `;
    this.footer.style.display = 'none';

    const startBtn = this.content.querySelector('#start-btn') as HTMLButtonElement;
    startBtn.addEventListener('click', async () => {
      const name = (this.content.querySelector('#name') as HTMLInputElement).value;
      const contact = (this.content.querySelector('#contact') as HTMLInputElement).value;
      const consent = (this.content.querySelector('#consent') as HTMLInputElement).checked;

      if (!name || !contact) return alert('Por favor completa los campos');
      if (!consent) return alert('Debes aceptar la política de datos');

      startBtn.disabled = true;
      startBtn.textContent = 'Verificando...';

      try {
        const res = await fetch(`${this.apiBase}/api/widget/identify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: this.visitorToken,
            name,
            contactInfo: contact
          })
        });
        if (res.ok) {
          this.isIdentified = true;
          localStorage.setItem('fusion_identified', 'true');
          this.renderChat();
          this.appendMessage('bot', this.config.greeting);
          this.renderQuickReplies();
          
          if (!this.config.isWithinHours) {
             this.appendMessage('bot', this.config.outOfHoursMessage);
          }
        }
      } catch (e) {
        console.error(e);
        startBtn.disabled = false;
        startBtn.textContent = 'Comenzar Chat';
      }
    });
  }

  renderChat() {
    this.content.innerHTML = '';
    this.footer.style.display = 'flex';
    this.input.disabled = false;
    this.sendBtn.disabled = false;
    
    // Polling simulation
    setInterval(() => this.pollMessages(), 30000);
  }
  
  renderQuickReplies() {
     if (!this.config.quickReplies || this.config.quickReplies.length === 0) return;
     
     const container = document.createElement('div');
     container.className = 'quick-replies';
     
     this.config.quickReplies.forEach((qr: string) => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = qr;
        btn.onclick = () => {
           this.input.value = qr;
           this.sendMessage();
           container.remove();
        };
        container.appendChild(btn);
     });
     this.content.appendChild(container);
     this.scrollToBottom();
  }

  appendMessage(role: 'bot' | 'user', text: string) {
    const el = document.createElement('div');
    el.className = `message ${role}`;
    el.textContent = text;
    this.content.appendChild(el);
    this.scrollToBottom();
  }
  
  appendWhatsAppButton() {
     const el = document.createElement('a');
     el.className = 'whatsapp-btn';
     el.href = `https://wa.me/573000000000?text=Hola,%20vengo%20del%20chat%20web.%20Token:%20${this.visitorToken.substring(0,8)}`;
     el.target = '_blank';
     el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Continuar en WhatsApp`;
     this.content.appendChild(el);
     this.scrollToBottom();
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text) return;

    this.input.value = '';
    this.appendMessage('user', text);

    try {
      const res = await fetch(`${this.apiBase}/api/widget/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.visitorToken,
          text
        })
      });
      const data = await res.json();
      if (data.reply) {
        this.appendMessage('bot', data.reply);
      }
      if (data.showWhatsappButton) {
         this.appendWhatsAppButton();
      }
    } catch (e) {
      console.error(e);
      this.appendMessage('bot', 'Hubo un error de conexión.');
    }
  }

  async pollMessages() {
     if (!this.isOpen || !this.isIdentified) return;
     try {
        // En una implementación real con websocket esto no sería necesario
        // Pero para el ejemplo hacemos polling de mensajes no leídos
        const res = await fetch(`${this.apiBase}/api/widget/messages?token=${this.visitorToken}`);
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
           data.messages.forEach((msg: any) => {
              this.appendMessage('bot', msg.text);
           });
        }
     } catch(e) {}
  }

  async loadHistory() {
    // Load past messages
  }

  scrollToBottom() {
    this.content.scrollTop = this.content.scrollHeight;
  }
}

customElements.define('fusion-widget', FusionWidget);

// Inject automatically
const widget = document.createElement('fusion-widget');
document.body.appendChild(widget);
