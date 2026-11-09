const SUPABASE_URL = 'https://tnlsqmrluxugwialhrej.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QaX1w_iFxZold_RnCkHtSA_z6hAbM-2';

// Configurado para armazenar a sessão no sessionStorage (desloga automaticamente ao fechar o navegador/aba)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();

  const pagina_atual = window.location.pathname.split('/').pop();

  // Se estiver na página de login e já houver sessão ativa, redireciona para o sistema
  if (pagina_atual === 'login.html') {
    if (session) {
      window.location.href = 'unidades.html';
    }
    return;
  }

  // Se estiver em qualquer outra página e NÃO tiver sessão, redireciona para o login
  if (!session) {
    window.location.href = 'login.html';
  }
}

async function fazer_logout() {
  await _supabase.auth.signOut();
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// Executa a verificação automaticamente em todas as páginas que carregarem este script
document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();
});

// Adicionar ao final do arquivo js/autenticacao.js

function sanitizar_texto(texto) {
  if (texto === null || texto === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}