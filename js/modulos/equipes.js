let abortController = null;
let equipe_atual = null;
let lista_equipes_todas = [];
let lista_unidades_todas = [];
let membros_adicionar = new Set();
let membros_remover = new Set();
let lista_funcionarios_todos = [];
let salvando = false;

export async function mount(container) {
  abortController = new AbortController();
  const { signal } = abortController;

  equipe_atual = null;
  salvando = false;
  membros_adicionar.clear();
  membros_remover.clear();

  await carregar_equipes();

  // Delegação de eventos de clique com signal
  container.addEventListener('click', async (e) => {
    const acaoEl = e.target.closest('[data-acao]');
    if (!acaoEl) return;

    const acao = acaoEl.getAttribute('data-acao');

    if (acao === 'abrir-modal-cadastro') {
      await abrir_modal_cadastro();
    } else if (acao === 'fechar-modal-cadastro') {
      fechar_modal_cadastro();
    } else if (acao === 'abrir-detalhes-equipe') {
      const eqJson = acaoEl.getAttribute('data-equipe');
      if (eqJson) {
        await abrir_modal_detalhes(JSON.parse(eqJson));
      }
    } else if (acao === 'fechar-modal-detalhes') {
      fechar_modal_detalhes();
    } else if (acao === 'ativar-modo-edicao') {
      await ativar_modo_edicao();
    } else if (acao === 'cancelar-edicao') {
      cancelar_edicao();
    } else if (acao === 'adicionar-membro') {
      adicionar_membro_equipe();
    } else if (acao === 'marcar-remover-membro') {
      const id = acaoEl.getAttribute('data-id');
      if (id) marcar_remover_membro(id);
    } else if (acao === 'salvar-alteracoes-equipe') {
      await salvar_alteracoes_equipe();
    } else if (acao === 'excluir-equipe') {
      await excluir_equipe();
    }
  }, { signal });

  // Filtro de busca com signal
  container.addEventListener('input', (e) => {
    if (e.target.id === 'campo_busca_equipe') {
      filtrar_equipes(e.target.value);
    }
  }, { signal });

  // Formulário de cadastro com signal
  container.addEventListener('submit', async (e) => {
    if (e.target.id === 'form_cadastro_equipe') {
      e.preventDefault();
      await cadastrar_nova_equipe();
    }
  }, { signal });

  // Listeners globais no window com signal
  window.addEventListener('click', (e) => {
    const modal_detalhes = document.getElementById('modal_equipe');
    const modal_cadastro = document.getElementById('modal_cadastro_equipe');
    if (modal_detalhes && e.target === modal_detalhes) fechar_modal_detalhes();
    if (modal_cadastro && e.target === modal_cadastro) fechar_modal_cadastro();
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fechar_modal_detalhes();
      fechar_modal_cadastro();
    }
  }, { signal });
}

export function unmount() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  salvando = false;
  equipe_atual = null;
  lista_equipes_todas = [];
  lista_unidades_todas = [];
  membros_adicionar.clear();
  membros_remover.clear();
  lista_funcionarios_todos = [];
}

async function carregar_equipes() {
  const { data, error } = await window._supabase
    .from('equipes')
    .select('*, unidades(id, nome), funcionarios(id, nome, cargo)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar equipes:', error);
    return;
  }

  lista_equipes_todas = data || [];
  exibir_equipes(lista_equipes_todas);
}

function exibir_equipes(lista) {
  const tbody = document.getElementById('tabela_equipes');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">Nenhuma equipe encontrada.</td></tr>';
    return;
  }

  // Mutação única no DOM
  tbody.innerHTML = lista.map(eq => {
    const nome_seguro = window.sanitizar_texto(eq.nome);
    const descricao_segura = window.sanitizar_texto(eq.descricao || '-');
    const nome_unidade_seguro = window.sanitizar_texto(eq.unidades?.nome || '-');
    const eqJson = window.sanitizar_texto(JSON.stringify(eq));

    return `
      <tr>
        <td><strong>${nome_seguro}</strong></td>
        <td>${descricao_segura}</td>
        <td>${nome_unidade_seguro}</td>
        <td class="coluna-acoes">
          <button type="button" class="btn-olho" data-acao="abrir-detalhes-equipe" data-equipe='${eqJson}' title="Visualizar detalhes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrar_equipes(termoBruto) {
  const termo = (termoBruto || '').toLowerCase().trim();

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

async function carregar_unidades_select(selectId, valorSelecionado = '') {
  const selectUnidade = document.getElementById(selectId);
  if (!selectUnidade) return;

  selectUnidade.innerHTML = '<option value="">Carregando unidades...</option>';

  const { data: unidades, error } = await window._supabase
    .from('unidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar unidades:', error);
    selectUnidade.innerHTML = '<option value="">Erro ao carregar unidades</option>';
    return;
  }

  lista_unidades_todas = unidades || [];

  selectUnidade.innerHTML = '<option value="">-- Selecione a unidade (opcional) --</option>' +
    lista_unidades_todas.map(u => 
      `<option value="${encodeURIComponent(u.id)}">${window.sanitizar_texto(u.nome)}</option>`
    ).join('');

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

async function cadastrar_nova_equipe() {
  if (salvando) return;
  
  const form = document.getElementById('form_cadastro_equipe');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';

  const nome = document.getElementById('novo_nome_equipe').value;
  const descricao = document.getElementById('nova_descricao_equipe').value;
  const unidadeId = document.getElementById('novo_unidade_equipe').value || null;

  try {
    salvando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Salvando...';
    }

    const { error } = await window._supabase.from('equipes').insert([{ 
      nome: nome.trim(), 
      descricao: descricao.trim(), 
      unidade_id: unidadeId 
    }]);

    if (error) {
      alert('Erro ao cadastrar equipe: ' + error.message);
    } else {
      fechar_modal_cadastro();
      await carregar_equipes();
    }
  } finally {
    salvando = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;
    }
  }
}

async function abrir_modal_detalhes(equipe) {
  equipe_atual = equipe;
  const nomeEl = document.getElementById('modal_nome_equipe');
  if (nomeEl) nomeEl.innerText = equipe.nome;
  const descEl = document.getElementById('modal_descricao_equipe');
  if (descEl) descEl.innerText = equipe.descricao || 'Sem descrição cadastrada.';
  const unidEl = document.getElementById('modal_unidade_equipe');
  if (unidEl) unidEl.innerText = equipe.unidades?.nome || 'Nenhuma unidade vinculada';
  const dataEl = document.getElementById('modal_data_criacao');
  if (dataEl) dataEl.innerText = new Date(equipe.created_at).toLocaleDateString('pt-BR');

  const visEl = document.getElementById('modo_visualizacao');
  if (visEl) visEl.classList.remove('oculto');
  const editEl = document.getElementById('modo_edicao');
  if (editEl) editEl.classList.add('oculto');
  const modal = document.getElementById('modal_equipe');
  if (modal) modal.classList.remove('oculto');

  await carregar_membros_visualizacao();
}

async function carregar_membros_visualizacao() {
  const lista = document.getElementById('modal_lista_membros_vis');
  if (!lista || !equipe_atual) return;
  lista.innerHTML = '<li>Carregando...</li>';

  const { data: membros } = await window._supabase
    .from('funcionarios')
    .select('nome, cargo')
    .eq('equipe_id', equipe_atual.id);

  if (!membros || membros.length === 0) {
    lista.innerHTML = '<li style="background: none; padding: 0;">Nenhum funcionário nesta equipe.</li>';
  } else {
    lista.innerHTML = membros.map(m => {
      const nome_seguro = window.sanitizar_texto(m.nome);
      const cargo_seguro = window.sanitizar_texto(m.cargo || '-');
      return `<li><span><strong>${nome_seguro}</strong> (${cargo_seguro})</span></li>`;
    }).join('');
  }
}

async function ativar_modo_edicao() {
  if (!equipe_atual) return;
  document.getElementById('edit_nome_equipe').value = equipe_atual.nome;
  document.getElementById('edit_descricao_equipe').value = equipe_atual.descricao || '';

  await carregar_unidades_select('edit_unidade_equipe', equipe_atual.unidade_id || equipe_atual.unidades?.id || '');

  membros_adicionar.clear();
  membros_remover.clear();

  document.getElementById('modo_visualizacao').classList.add('oculto');
  document.getElementById('modo_edicao').classList.remove('oculto');

  const { data: funcionarios } = await window._supabase
    .from('funcionarios')
    .select('id, nome, cargo, equipe_id');

  lista_funcionarios_todos = funcionarios || [];
  renderizar_editores_membros();
}

function renderizar_editores_membros() {
  const lista = document.getElementById('modal_lista_membros_edit');
  const select = document.getElementById('select_funcionarios_disponiveis');
  if (!lista || !select) return;

  const membros_atuais = lista_funcionarios_todos.filter(f => 
    (f.equipe_id === equipe_atual.id || membros_adicionar.has(f.id)) && !membros_remover.has(f.id)
  );

  const disponiveis = lista_funcionarios_todos.filter(f => 
    (!f.equipe_id && !membros_adicionar.has(f.id)) || membros_remover.has(f.id)
  );

  if (membros_atuais.length === 0) {
    lista.innerHTML = '<li style="background: none; padding: 0;">Nenhum funcionário nesta equipe.</li>';
  } else {
    lista.innerHTML = membros_atuais.map(m => {
      const nome_seguro = window.sanitizar_texto(m.nome);
      const cargo_seguro = window.sanitizar_texto(m.cargo || '-');
      return `
        <li>
          <span><strong>${nome_seguro}</strong> - ${cargo_seguro}</span>
          <button type="button" class="btn-remover-membro" data-acao="marcar-remover-membro" data-id="${encodeURIComponent(m.id)}">Remover</button>
        </li>
      `;
    }).join('');
  }

  if (disponiveis.length > 0) {
    select.innerHTML = '<option value="">-- Selecione um funcionário --</option>' +
      disponiveis.map(f => {
        const nome_seguro = window.sanitizar_texto(f.nome);
        const cargo_seguro = window.sanitizar_texto(f.cargo || '-');
        return `<option value="${encodeURIComponent(f.id)}">${nome_seguro} (${cargo_seguro})</option>`;
      }).join('');
  } else {
    select.innerHTML = '<option value="">Nenhum funcionário disponível sem equipe</option>';
  }
}

function adicionar_membro_equipe() {
  const select = document.getElementById('select_funcionarios_disponiveis');
  if (!select) return;
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
  if (salvando) return;

  const novo_nome = document.getElementById('edit_nome_equipe').value;
  const nova_descricao = document.getElementById('edit_descricao_equipe').value;
  const nova_unidade_id = document.getElementById('edit_unidade_equipe').value || null;

  if (!novo_nome) return alert('O nome da equipe é obrigatório.');

  try {
    salvando = true;
    const { error: err_equipe } = await window._supabase
      .from('equipes')
      .update({ 
        nome: novo_nome.trim(), 
        descricao: nova_descricao ? nova_descricao.trim() : null,
        unidade_id: nova_unidade_id
      })
      .eq('id', equipe_atual.id);

    if (err_equipe) return alert('Erro ao atualizar equipe: ' + err_equipe.message);

    if (membros_adicionar.size > 0) {
      await window._supabase
        .from('funcionarios')
        .update({ equipe_id: equipe_atual.id })
        .in('id', Array.from(membros_adicionar));
    }

    if (membros_remover.size > 0) {
      await window._supabase
        .from('funcionarios')
        .update({ equipe_id: null })
        .in('id', Array.from(membros_remover));
    }

    fechar_modal_detalhes();
    await carregar_equipes();
  } finally {
    salvando = false;
  }
}

async function excluir_equipe() {
  if (!confirm(`Tem certeza que deseja excluir a equipe "${equipe_atual.nome}"?`)) return;

  const { error } = await window._supabase
    .from('equipes')
    .delete()
    .eq('id', equipe_atual.id);

  if (error) {
    alert('Erro ao excluir equipe: ' + error.message);
  } else {
    fechar_modal_detalhes();
    await carregar_equipes();
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
