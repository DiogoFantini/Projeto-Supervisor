let equipe_atual = null;
let lista_equipes_todas = [];
let lista_unidades_todas = [];
let membros_adicionar = new Set();
let membros_remover = new Set();
let lista_funcionarios_todos = [];

async function carregar_equipes() {
  const { data, error } = await _supabase
    .from('equipes')
    .select('*, unidades(id, nome), funcionarios(id, nome, cargo)')
    .order('created_at', { ascending: false });

  if (error) return console.error('Erro ao buscar equipes:', error);

  lista_equipes_todas = data || [];
  exibir_equipes(lista_equipes_todas);
}

function exibir_equipes(lista) {
  const tbody = document.getElementById('tabela_equipes');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">Nenhuma equipe encontrada.</td></tr>';
    return;
  }

  lista.forEach(eq => {
    const nome_seguro = sanitizar_texto(eq.nome);
    const descricao_segura = sanitizar_texto(eq.descricao || '-');
    const nome_unidade_seguro = sanitizar_texto(eq.unidades?.nome || '-');

    tbody.innerHTML += `
      <tr>
        <td><strong>${nome_seguro}</strong></td>
        <td>${descricao_segura}</td>
        <td>${nome_unidade_seguro}</td>
        <td class="coluna-acoes">
          <button class="btn-olho" onclick='abrir_modal_detalhes(${JSON.stringify(eq)})' title="Visualizar detalhes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </td>
      </tr>
    `;
  });
}

function filtrar_equipes() {
  const campoBusca = document.getElementById('campo_busca_equipe');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtradas = lista_equipes_todas.filter(eq => {
    const nome_unidade = eq.unidades?.nome || '';

    const bate_nome = eq.nome ? eq.nome.toLowerCase().includes(termo) : false;
    const bate_descricao = eq.descricao ? eq.descricao.toLowerCase().includes(termo) : false;
    const bate_unidade = nome_unidade ? nome_unidade.toLowerCase().includes(termo) : false;
    const bate_membro = eq.funcionarios && Array.isArray(eq.funcionarios)
      ? eq.funcionarios.some(f => f.nome && f.nome.toLowerCase().includes(termo))
      : false;

    return bate_nome || bate_descricao || bate_unidade || bate_membro;
  });

  exibir_equipes(filtradas);
}

async function carregar_unidades_select(selectElementId, valorSelecionado = '') {
  const selectUnidade = document.getElementById(selectElementId);
  if (!selectUnidade) return;

  selectUnidade.innerHTML = '<option value="">Carregando unidades...</option>';

  const { data: unidades, error } = await _supabase
    .from('unidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar unidades:', error);
    selectUnidade.innerHTML = '<option value="">Erro ao carregar unidades</option>';
    return;
  }

  lista_unidades_todas = unidades || [];
  selectUnidade.innerHTML = '<option value="">-- Selecione a unidade (opcional) --</option>';

  lista_unidades_todas.forEach(u => {
    const nome_seguro = sanitizar_texto(u.nome);
    selectUnidade.innerHTML += `<option value="${u.id}">${nome_seguro}</option>`;
  });

  if (valorSelecionado) {
    selectUnidade.value = valorSelecionado;
  }
}

async function abrir_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_equipe');
  if (modal) modal.classList.remove('oculto');
  await carregar_unidades_select('novo_unidade_equipe');
}

function fechar_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_equipe');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_equipe');
  if (form) form.reset();
}

async function abrir_modal_detalhes(equipe) {
  equipe_atual = equipe;
  document.getElementById('modal_nome_equipe').innerText = equipe.nome;
  document.getElementById('modal_descricao_equipe').innerText = equipe.descricao || 'Sem descrição cadastrada.';
  document.getElementById('modal_unidade_equipe').innerText = equipe.unidades?.nome || 'Nenhuma unidade vinculada';
  document.getElementById('modal_data_criacao').innerText = new Date(equipe.created_at).toLocaleDateString('pt-BR');

  document.getElementById('modo_visualizacao').classList.remove('oculto');
  document.getElementById('modo_edicao').classList.add('oculto');
  document.getElementById('modal_equipe').classList.remove('oculto');

  await carregar_membros_visualizacao();
}

async function carregar_membros_visualizacao() {
  const lista = document.getElementById('modal_lista_membros_vis');
  if (!lista) return;
  lista.innerHTML = '<li>Carregando...</li>';

  const { data: membros } = await _supabase
    .from('funcionarios')
    .select('nome, cargo')
    .eq('equipe_id', equipe_atual.id);

  lista.innerHTML = '';
  if (!membros || membros.length === 0) {
    lista.innerHTML = '<li style="background: none; padding: 0;">Nenhum funcionário nesta equipe.</li>';
  } else {
    membros.forEach(m => {
      const nome_seguro = sanitizar_texto(m.nome);
      const cargo_seguro = sanitizar_texto(m.cargo || '-');
      lista.innerHTML += `<li><span><strong>${nome_seguro}</strong> (${cargo_seguro})</span></li>`;
    });
  }
}

async function ativar_modo_edicao() {
  document.getElementById('edit_nome_equipe').value = equipe_atual.nome;
  document.getElementById('edit_descricao_equipe').value = equipe_atual.descricao || '';

  await carregar_unidades_select('edit_unidade_equipe', equipe_atual.unidade_id || equipe_atual.unidades?.id || '');

  membros_adicionar.clear();
  membros_remover.clear();

  document.getElementById('modo_visualizacao').classList.add('oculto');
  document.getElementById('modo_edicao').classList.remove('oculto');

  const { data: funcionarios } = await _supabase
    .from('funcionarios')
    .select('id, nome, cargo, equipe_id');

  lista_funcionarios_todos = funcionarios || [];
  renderizar_editores_membros();
}

function renderizar_editores_membros() {
  const lista = document.getElementById('modal_lista_membros_edit');
  const select = document.getElementById('select_funcionarios_disponiveis');

  const membros_atuais = lista_funcionarios_todos.filter(f => 
    (f.equipe_id === equipe_atual.id || membros_adicionar.has(f.id)) && !membros_remover.has(f.id)
  );

  const disponiveis = lista_funcionarios_todos.filter(f => 
    (!f.equipe_id && !membros_adicionar.has(f.id)) || membros_remover.has(f.id)
  );

  lista.innerHTML = '';
  if (membros_atuais.length === 0) {
    lista.innerHTML = '<li style="background: none; padding: 0;">Nenhum funcionário nesta equipe.</li>';
  } else {
    membros_atuais.forEach(m => {
      const nome_seguro = sanitizar_texto(m.nome);
      const cargo_seguro = sanitizar_texto(m.cargo || '-');
      lista.innerHTML += `
        <li>
          <span><strong>${nome_seguro}</strong> - ${cargo_seguro}</span>
          <button class="btn-remover-membro" onclick="marcar_remover_membro('${m.id}')">Remover</button>
        </li>
      `;
    });
  }

  select.innerHTML = '<option value="">-- Selecione um funcionário --</option>';
  if (disponiveis.length > 0) {
    disponiveis.forEach(f => {
      const nome_seguro = sanitizar_texto(f.nome);
      const cargo_seguro = sanitizar_texto(f.cargo || '-');
      select.innerHTML += `<option value="${f.id}">${nome_seguro} (${cargo_seguro})</option>`;
    });
  } else {
    select.innerHTML = '<option value="">Nenhum funcionário disponível sem equipe</option>';
  }
}

function adicionar_membro_equipe() {
  const select = document.getElementById('select_funcionarios_disponiveis');
  const id = select.value;
  if (!id) return alert('Selecione um funcionário da lista.');

  if (membros_remover.has(id)) {
    membros_remover.delete(id);
  } else {
    membros_adicionar.add(id);
  }
  renderizar_editores_membros();
}

function marcar_remover_membro(id) {
  if (membros_adicionar.has(id)) {
    membros_adicionar.delete(id);
  } else {
    membros_remover.add(id);
  }
  renderizar_editores_membros();
}

async function salvar_alteracoes_equipe() {
  const novo_nome = document.getElementById('edit_nome_equipe').value;
  const nova_descricao = document.getElementById('edit_descricao_equipe').value;
  const nova_unidade_id = document.getElementById('edit_unidade_equipe').value || null;

  if (!novo_nome) return alert('O nome da equipe é obrigatório.');

  const { error: err_equipe } = await _supabase
    .from('equipes')
    .update({ 
      nome: novo_nome, 
      descricao: nova_descricao,
      unidade_id: nova_unidade_id
    })
    .eq('id', equipe_atual.id);

  if (err_equipe) return alert('Erro ao atualizar equipe: ' + err_equipe.message);

  if (membros_adicionar.size > 0) {
    await _supabase
      .from('funcionarios')
      .update({ equipe_id: equipe_atual.id })
      .in('id', Array.from(membros_adicionar));
  }

  if (membros_remover.size > 0) {
    await _supabase
      .from('funcionarios')
      .update({ equipe_id: null })
      .in('id', Array.from(membros_remover));
  }

  fechar_modal_detalhes();
  carregar_equipes();
}

async function excluir_equipe() {
  if (!confirm(`Tem certeza que deseja excluir a equipe "${equipe_atual.nome}"?`)) return;

  const { error } = await _supabase
    .from('equipes')
    .delete()
    .eq('id', equipe_atual.id);

  if (error) {
    alert('Erro ao excluir equipe: ' + error.message);
  } else {
    fechar_modal_detalhes();
    carregar_equipes();
  }
}

function cancelar_edicao() {
  membros_adicionar.clear();
  membros_remover.clear();
  document.getElementById('modo_edicao').classList.add('oculto');
  document.getElementById('modo_visualizacao').classList.remove('oculto');
  carregar_membros_visualizacao();
}

function fechar_modal_detalhes() {
  const modal = document.getElementById('modal_equipe');
  if (modal) modal.classList.add('oculto');
  membros_adicionar.clear();
  membros_remover.clear();
  equipe_atual = null;
}

document.addEventListener('DOMContentLoaded', () => {
  carregar_equipes();

  const formCadastro = document.getElementById('form_cadastro_equipe');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('novo_nome_equipe').value;
      const descricao = document.getElementById('nova_descricao_equipe').value;
      const unidadeId = document.getElementById('novo_unidade_equipe').value || null;

      const { error } = await _supabase.from('equipes').insert([{ 
        nome, 
        descricao, 
        unidade_id: unidadeId 
      }]);

      if (error) {
        alert('Erro ao cadastrar equipe: ' + error.message);
      } else {
        fechar_modal_cadastro();
        carregar_equipes();
      }
    });
  }

  window.addEventListener('click', (event) => {
    const modal_detalhes = document.getElementById('modal_equipe');
    const modal_cadastro = document.getElementById('modal_cadastro_equipe');
    if (event.target === modal_detalhes) fechar_modal_detalhes();
    if (event.target === modal_cadastro) fechar_modal_cadastro();
  });
});