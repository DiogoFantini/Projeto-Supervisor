/**
 * Modulo ES6: Gerenciar Usuarios
 * Ciclo de vida: mount(container) / unmount()
 */

let abortController = null;
let containerAtual = null;
let lista_usuarios_cache = [];

export async function mount(container) {
  containerAtual = container;
  abortController = new AbortController();
  const { signal } = abortController;

  if (typeof window.proteger_pagina_admin === 'function') {
    await window.proteger_pagina_admin();
  }

  // Delegacao de cliques no container
  container.addEventListener('click', (e) => {
    const alvoAcao = e.target.closest('[data-acao]');
    if (!alvoAcao) return;

    const acao = alvoAcao.getAttribute('data-acao');
    if (acao === 'abrir-modal-cadastro') {
      abrir_modal_cadastro_usuario();
    } else if (acao === 'fechar-modal-cadastro') {
      fechar_modal_cadastro_usuario();
    } else if (acao === 'excluir-usuario') {
      const id = alvoAcao.getAttribute('data-id');
      const email = alvoAcao.getAttribute('data-email');
      excluir_usuario(id, email);
    }
  }, { signal });

  // Delegacao de busca (input)
  container.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'campo_busca_usuario') {
      filtrar_usuarios();
    }
  }, { signal });

  // Delegacao de submit do form
  container.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'form_cadastro_usuario') {
      salvar_novo_usuario(e);
    }
  }, { signal });

  // Tecla ESC e clique fora para fechar modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fechar_modal_cadastro_usuario();
  }, { signal });

  window.addEventListener('click', (e) => {
    const modal = document.getElementById('modal_cadastro_usuario');
    if (modal && e.target === modal) {
      fechar_modal_cadastro_usuario();
    }
  }, { signal });

  await carregar_usuarios();
}

export function unmount() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  containerAtual = null;
  lista_usuarios_cache = [];
}

async function carregar_usuarios() {
  if (!window._supabase) return;

  const { data: usuarios, error } = await window._supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar usuarios:', error);
    return;
  }

  lista_usuarios_cache = usuarios || [];
  renderizar_tabela_usuarios(lista_usuarios_cache);
}

function renderizar_tabela_usuarios(lista) {
  const tbody = document.getElementById('tabela_usuarios');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  const sanitizar = window.sanitizar_texto || ((t) => String(t ?? ''));

  const linhasHtml = lista.map((usr) => {
    const data_criacao = usr.created_at ? new Date(usr.created_at).toLocaleDateString('pt-BR') : '-';
    const badge_role = usr.role === 'admin'
      ? '<span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Admin</span>'
      : '<span style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Funcionário</span>';

    const emailLimpo = sanitizar(usr.email);
    const idLimpo = sanitizar(usr.id);

    return `
      <tr>
        <td>${emailLimpo}</td>
        <td>${badge_role}</td>
        <td>${data_criacao}</td>
        <td class="coluna-acoes">
          <button type="button" class="btn-x-remocao" data-acao="excluir-usuario" data-id="${idLimpo}" data-email="${emailLimpo}" title="Excluir usuário">&times;</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = linhasHtml;
}

function filtrar_usuarios() {
  const campo = document.getElementById('campo_busca_usuario');
  if (!campo) return;
  const termo = campo.value.toLowerCase().trim();
  const filtrados = lista_usuarios_cache.filter((u) =>
    (u.email || '').toLowerCase().includes(termo) ||
    (u.role || '').toLowerCase().includes(termo)
  );
  renderizar_tabela_usuarios(filtrados);
}

function abrir_modal_cadastro_usuario() {
  const modal = document.getElementById('modal_cadastro_usuario');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_cadastro_usuario() {
  const modal = document.getElementById('modal_cadastro_usuario');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_usuario');
  if (form) form.reset();
}

async function salvar_novo_usuario(e) {
  e.preventDefault();
  if (!window._supabase) return;

  const email = (document.getElementById('novo_email_usuario')?.value || '').trim();
  const senha = document.getElementById('nova_senha_usuario')?.value || '';
  const role = document.getElementById('novo_role_usuario')?.value || 'funcionario';

  const { data: auth_data, error: auth_error } = await window._supabase.auth.signUp({
    email,
    password: senha
  });

  if (auth_error) {
    alert('Erro ao criar credenciais no Supabase Auth: ' + auth_error.message);
    return;
  }

  const user_id = auth_data.user ? auth_data.user.id : null;

  const { error: db_error } = await window._supabase
    .from('usuarios')
    .upsert([
      {
        id: user_id,
        email,
        senha_hash: 'auth_managed',
        role
      }
    ]);

  if (db_error) {
    alert('Usuário criado no Auth, mas ocorreu um erro ao definir o perfil: ' + db_error.message);
  } else {
    alert('Usuário cadastrado com sucesso!');
    fechar_modal_cadastro_usuario();
    await carregar_usuarios();
  }
}

async function excluir_usuario(id, email) {
  if (!confirm(`Deseja realmente remover o usuário ${email}?`)) return;
  if (!window._supabase) return;

  const { error } = await window._supabase
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Erro ao excluir usuário: ' + error.message);
  } else {
    await carregar_usuarios();
  }
}
