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

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();
  const caminho_atual = window.location.pathname.toLowerCase();

  // Verifica se a URL é a página de login (trata /login.html, /login ou a raiz /)
  const e_pagina_login = caminho_atual.endsWith('login.html') || caminho_atual.endsWith('/login') || caminho_atual === '/' || caminho_atual === '';

  if (e_pagina_login) {
    if (session) {
      window.location.href = 'unidades.html';
    }
  } else {
    if (!session) {
      window.location.href = 'login.html';
    } else {
      // Inicia a contagem de inatividade apenas se o usuário estiver autenticado numa página interna
      iniciar_monitoramento_inatividade();
    }
  }
}

async function fazer_logout() {
  await _supabase.auth.signOut();
  sessionStorage.clear();
  window.location.href = 'login.html';
}

function sanitizar_texto(texto) {
  if (texto === null || texto === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();
});