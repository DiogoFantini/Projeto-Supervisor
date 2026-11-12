const SUPABASE_URL = 'https://tnlsqmrluxugwialhrej.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QaX1w_iFxZold_RnCkHtSA_z6hAbM-2';

// Cliente Supabase configurado com sessionStorage
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let tempo_inatividade;

function resetar_temporizador_inatividade() {
  clearTimeout(tempo_inatividade);
  // Encerra após 15 minutos sem interação (15 * 60 * 1000 ms)
  tempo_inatividade = setTimeout(() => {
    alert('Sua sessão foi encerrada por tempo de inatividade.');
    fazer_logout();
  }, 15 * 60 * 1000);
}

function iniciar_monitoramento_inatividade() {
  window.addEventListener('mousemove', resetar_temporizador_inatividade);
  window.addEventListener('keydown', resetar_temporizador_inatividade);
  window.addEventListener('click', resetar_temporizador_inatividade);
  resetar_temporizador_inatividade();
}

/**
 * Consulta a tabela 'usuarios' para identificar o nivel de acesso (role) do usuario logado.
 */
async function obter_usuario_logado() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session || !session.user) return null;

  // Se já temos a role armazenada na sessão, podemos utilizá-la
  const role_salva = sessionStorage.getItem('usuario_role');
  if (role_salva) {
    return { ...session.user, role: role_salva };
  }

  // Consulta a tabela 'usuarios' no Supabase
  const { data: usuarioDados, error } = await _supabase
    .from('usuarios')
    .select('role, funcionario_id')
    .eq('email', session.user.email)
    .maybeSingle();

  const role = (usuarioDados && usuarioDados.role) ? usuarioDados.role : 'funcionario';
  
  sessionStorage.setItem('usuario_role', role);
  if (usuarioDados?.funcionario_id) {
    sessionStorage.setItem('funcionario_id', usuarioDados.funcionario_id);
  }

  return { ...session.user, role: role, funcionario_id: usuarioDados?.funcionario_id };
}

/**
 * Função utilitária para ser chamada no topo de páginas exclusivas de administradores.
 */
async function proteger_pagina_admin() {
  const usuario = await obter_usuario_logado();
  if (!usuario || usuario.role !== 'admin') {
    alert('Acesso restrito a administradores.');
    window.location.href = 'folgas_abonos.html';
  }
}

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();
  const caminho_atual = window.location.pathname.toLowerCase();

  // Verifica se a URL é a página de login
  const e_pagina_login = caminho_atual.endsWith('login.html') || caminho_atual.endsWith('/login') || caminho_atual === '/' || caminho_atual === '';

  if (e_pagina_login) {
    if (session) {
      window.location.href = 'unidades.html';
    }
  } else {
    if (!session) {
      window.location.href = 'login.html';
    } else {
      // Carrega os dados do usuario logado e inicia a contagem de inatividade
      await obter_usuario_logado();
      iniciar_monitoramento_inatividade();
    }
  }
}

async function fazer_logout() {
  await _supabase.auth.signOut();
  sessionStorage.clear();
  window.location.href = 'login.html';
}

/**
 * Sanitiza texto para inserção segura em HTML e atributos,
 * protegendo contra injeção de tags e quebra de aspas.
 */
function sanitizar_texto(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza URLs bloqueando protocolos perigosos (javascript:, data:, vbscript:).
 */
function sanitizar_url(url) {
  if (!url) return '';
  const limpa = String(url).trim();
  if (/^(javascript|data|vbscript):/i.test(limpa)) {
    console.warn('URL potencialmente perigosa bloqueada:', limpa);
    return '#';
  }
  return limpa;
}

// Expõe no escopo global para compatibilidade com módulos e scripts auxiliares
window._supabase = _supabase;
window.obter_usuario_logado = obter_usuario_logado;
window.proteger_pagina_admin = proteger_pagina_admin;
window.fazer_logout = fazer_logout;
window.sanitizar_texto = sanitizar_texto;
window.sanitizar_url = sanitizar_url;

document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();
});
