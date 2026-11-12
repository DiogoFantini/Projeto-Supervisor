let lista_usuarios_cache = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof proteger_pagina_admin === 'function') {
    await proteger_pagina_admin();
  }
  carregar_usuarios();
});

async function carregar_usuarios() {
  const { data: usuarios, error } = await _supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return;
  }

  lista_usuarios_cache = usuarios || [];
  renderizar_tabela_usuarios(lista_usuarios_cache);
}

function renderizar_tabela_usuarios(lista) {
  const tbody = document.getElementById('tabela_usuarios');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  lista.forEach(usr => {
    const tr = document.createElement('tr');
    const data_criacao = usr.created_at ? new Date(usr.created_at).toLocaleDateString('pt-BR') : '-';
    const badge_role = usr.role === 'admin' 
      ? '<span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Admin</span>'
      : '<span style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Funcionário</span>';

    tr.innerHTML = `
      <td>${sanitizar_texto(usr.email)}</td>
      <td>${badge_role}</td>
      <td>${data_criacao}</td>
      <td class="coluna-acoes">
        <button type="button" class="btn-x-remocao" onclick="excluir_usuario('${usr.id}', '${usr.email}')" title="Excluir usuário">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrar_usuarios() {
  const termo = document.getElementById('campo_busca_usuario').value.toLowerCase();
  const filtrados = lista_usuarios_cache.filter(u => 
    u.email.toLowerCase().includes(termo) || 
    u.role.toLowerCase().includes(termo)
  );
  renderizar_tabela_usuarios(filtrados);
}

function abrir_modal_cadastro_usuario() {
  document.getElementById('modal_cadastro_usuario').classList.remove('oculto');
}

function fechar_modal_cadastro_usuario() {
  document.getElementById('modal_cadastro_usuario').classList.add('oculto');
  document.getElementById('form_cadastro_usuario').reset();
}

async function salvar_novo_usuario(e) {
  e.preventDefault();
  const email = document.getElementById('novo_email_usuario').value;
  const senha = document.getElementById('nova_senha_usuario').value;
  const role = document.getElementById('novo_role_usuario').value;

  // 1. Cria o usuário no auth do Supabase
  const { data: auth_data, error: auth_error } = await _supabase.auth.signUp({
    email: email,
    password: senha
  });

  if (auth_error) {
    alert('Erro ao criar credenciais no Supabase Auth: ' + auth_error.message);
    return;
  }

  const user_id = auth_data.user ? auth_data.user.id : null;

  // 2. Registra o papel e perfil na tabela 'usuarios'
  const { error: db_error } = await _supabase
    .from('usuarios')
    .upsert([
      { 
        id: user_id, 
        email: email, 
        senha_hash: 'auth_managed',
        role: role 
      }
    ]);

  if (db_error) {
    alert('Usuário criado no Auth, mas ocorreu um erro ao definir o perfil: ' + db_error.message);
  } else {
    alert('Usuário cadastrado com sucesso!');
    fechar_modal_cadastro_usuario();
    carregar_usuarios();
  }
}

async function excluir_usuario(id, email) {
  if (!confirm(`Deseja realmente remover o usuário ${email}?`)) return;

  const { error } = await _supabase
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Erro ao excluir usuário: ' + error.message);
  } else {
    carregar_usuarios();
  }
}