import { get, getFull, post, streamChat } from '../api.js';
import { esc, icon, $, md, toastError, toast } from '../ui.js';

const QUICK = [
  ['Check my symptoms', "I'm feeling unwell. Can you help me understand my symptoms and whether I should see a doctor?"],
  ['Manage stress & anxiety', 'I need practical tips for managing stress and anxiety in my daily life.'],
  ['Meal ideas for my goals', 'Based on my fitness goal and dietary preference, suggest some healthy meal ideas for today.'],
  ['Suggest a workout', 'Suggest a workout routine suited to my fitness level and the time I have available today.'],
  ['Improve my sleep', 'How can I improve my sleep quality based on my recent sleep patterns?'],
  ['Explain my BMI', 'Can you explain my current BMI and what it means for my health?'],
  ['Review my week', 'Can you summarize my health and habits from this past week and give me some tips?'],
];
const EMERGENCY = ['chest pain', 'heart attack', "can't breathe", 'shortness of breath', 'palpitations', 'stroke', 'sudden headache', "can't speak", 'facial drooping', 'arm weakness', 'severe allergic reaction', 'anaphylaxis', 'throat swelling', "can't swallow", 'self-harm', 'self harm', 'hurt myself', 'want to die', 'suicide', 'end my life', 'kill myself', 'overdose', 'took too many pills', 'poisoning', 'unconscious', 'not breathing', 'severe bleeding'];

export async function render(ctx) {
  const { root } = ctx;
  let conversationId = null;
  let busy = false;
  let status = { enabled: false };
  try { status = await get('/ai/status'); } catch { /* ignore */ }

  root.innerHTML = `
    <div class="page-head"><div><h1 class="row" style="gap:12px"><img class="avatar tiara lg" src="/tiara.svg" alt="">Chat with Tiara</h1><p>Your wellness chat assistant — ask about meals, workouts, sleep, stress and your habits.</p></div>
      <div class="row"><span class="badge ${status.enabled ? 'violet' : ''}">${status.enabled ? 'Claude AI' : 'Rule-based mode'}</span><button class="btn btn-secondary btn-sm" id="newchat">${icon('refresh')}New chat</button></div></div>
    <div class="banner warn">${icon('alert')}<div>Tiara is an AI assistant, <strong>not a healthcare professional</strong>. It can't diagnose conditions or prescribe treatment. In an emergency call <strong>112</strong> (India) or your local emergency number.</div></div>
    ${status.enabled ? '' : `<div class="banner info mt-s">${icon('info')}<div>Tiara is using built-in answers for common topics. To let it understand and answer <strong>any</strong> question, connect Claude in <a href="/settings/ai">Settings → Tiara (AI)</a> (takes 2 minutes).</div></div>`}
    <div class="card mt chat">
      <div class="chat-log" id="log" aria-live="polite"></div>
      <div class="chips" id="quick" style="padding:8px 0"></div>
      <form class="chat-input" id="cf">
        <label class="sr-only" for="msg">Message</label>
        <textarea class="input" id="msg" rows="1" maxlength="2000" placeholder="Message Tiara…"></textarea>
        <button class="btn btn-primary" id="send" aria-label="Send">${icon('send')}</button>
      </form>
    </div>`;

  const log = $('#log');
  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const timeStr = (iso) => new Date(iso || Date.now()).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const addBubble = (role, content, opts = {}) => {
    const row = document.createElement('div');
    row.className = `msg-row ${role === 'user' ? 'me' : ''}`;
    const div = document.createElement('div');
    div.className = `bubble ${role === 'user' ? 'me' : 'bot'} ${opts.emergency ? 'emergency' : ''}`;
    div.innerHTML = (role === 'user' ? esc(content).replace(/\n/g, '<br>') : md(content)) + (opts.streaming ? '' : `<div class="time">${timeStr(opts.at)}</div>`);
    if (role !== 'user') row.innerHTML = '<img class="avatar tiara" src="/tiara.svg" alt="" title="Tiara">';
    row.appendChild(div);
    if (role !== 'user' && opts.feedback) {
      div.insertAdjacentHTML('beforeend', `<div class="meta">${opts.source === 'rule_based' ? 'Built-in guidance' : opts.source === 'ai' ? 'AI' : ''}<span style="flex:1"></span>
        <button class="icon-btn sm" data-fb="up" aria-label="Helpful">${icon('thumbsUp')}</button><button class="icon-btn sm" data-fb="down" aria-label="Not helpful">${icon('thumbsDown')}</button></div>`);
      div.querySelectorAll('[data-fb]').forEach((b) => b.addEventListener('click', async () => {
        try { await post('/ai/feedback', { rating: b.dataset.fb, context: 'chat' }); toast('Thanks for the feedback'); div.querySelector('.meta').querySelectorAll('button').forEach((x) => { x.disabled = true; }); } catch (e) { toastError(e); }
      }));
    }
    log.appendChild(row); scroll();
    return div;
  };
  const drawQuick = () => {
    $('#quick').innerHTML = QUICK.map(([l], i) => `<button class="chip" data-q="${i}">${esc(l)}</button>`).join('');
    $('#quick').querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => send(QUICK[Number(b.dataset.q)][1])));
  };

  const loadConversation = async (fresh) => {
    log.innerHTML = '';
    if (fresh) {
      const c = await post('/ai/conversations/new');
      conversationId = c.id; addBubble('assistant', c.greeting);
    } else {
      const res = await getFull('/ai/conversations/latest');
      if (res.data) { conversationId = res.data.id; for (const m of res.data.messages) addBubble(m.role, m.content, { emergency: m.source === 'emergency', at: m.created_at }); }
      else { addBubble('assistant', res.meta.greeting); }
    }
    drawQuick();
  };

  async function send(text) {
    const message = text.trim();
    if (!message || busy) return;
    busy = true; $('#send').disabled = true;
    $('#msg').value = '';
    addBubble('user', message);
    const isEmergency = EMERGENCY.some((k) => message.toLowerCase().includes(k));
    const bubble = addBubble('assistant', '', { emergency: isEmergency, streaming: true });
    bubble.innerHTML = '<span class="typing" aria-label="Tiara is typing"><span></span><span></span><span></span></span>';
    let acc = '';
    try {
      await streamChat({ message, conversation_id: conversationId }, {
        onMeta: (m) => { conversationId = m.conversation_id; },
        onDelta: (t) => { acc += t; bubble.innerHTML = `<div class="cursor">${md(acc)}</div>`; scroll(); },
        onDone: (d) => {
          bubble.parentElement.remove();
          addBubble('assistant', acc, { emergency: d.source === 'emergency', feedback: d.source === 'ai' || d.source === 'rule_based', source: d.source });
        },
      });
    } catch (e) {
      bubble.parentElement?.remove();
      addBubble('assistant', `Sorry — ${e.message}`);
    } finally { busy = false; $('#send').disabled = false; $('#msg').focus(); }
  }

  $('#cf').addEventListener('submit', (e) => { e.preventDefault(); send($('#msg').value); });
  $('#msg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('#msg').value); } });
  $('#msg').addEventListener('input', (e) => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`; });
  $('#newchat').addEventListener('click', () => loadConversation(true).catch(toastError));
  try { await loadConversation(false); } catch (e) { toastError(e); }
  const q = ctx.query?.get('q');
  if (q) { history.replaceState(null, '', '/coach'); send(q.slice(0, 2000)); }
}
