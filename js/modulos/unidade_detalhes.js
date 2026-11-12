let abortController = null;
let unidade_id = null;
let lista_equipes_unidade = [];
let lista_funcs_sem_equipe = [];
let modo_desvincular_ativo = false;
let equipe_selecionada_para_desvincular = null;
let salvando = false;

export async function mount(container) {
  abortController = new AbortController();
  const { signal } = abortController;

  const parametros = new URLSearchParams(window.location.search);
  unidade_id = parametros.get('id');

  if (!unidade_id) {
    alert('Unidade não especificada.');
    window.location.href = 'unidades.html';
    return;
  }

  salvando = false;
  modo_desvincular_ativo = false;
  equipe_selecionada_para_desvincular = null;

  await carregar_dados_unidade();

  // Delegação de eventos de clique
  container.addEventListener('click', async (e) => {
    const acaoEl = e.target.closest('[data-acao]');
    if (!acaoEl) return;

    const acao = acaoEl.getAttribute('data-acao');

    if (acao === 'alternar-modo-desvincular') {
      alternar_modo_desvincular();
    } else if (acao === 'abrir-modal-vincular') {
      await abrir_modal_vincular_equipe();
    } else if (acao === 'fechar-modal-vincular') {
      fechar_modal_vincular_equipe();
    } else if (acao === 'iniciar-desvinculo-equipe') {
      const equipeJson = acaoEl.getAttribute('data-equipe');
      if (equipeJson) {
        confirmar_desvinculo_equipe(JSON.parse(equipeJson));
      }
    } else if (acao === 'fechar-modal-desvinculo') {
      fechar_modal_confirmar_desvinculo();
    } else if (acao === 'executar-desvinculo') {
      await executar_desvinculo_equipe();
    } else if (acao === 'alternar-dropdown-funcs') {
      alternar_dropdown_funcs_sem_equipe();
    }
  }, { signal });

  // Filtros de busca
  container.addEventListener('input', (e) => {
    if (e.target.id === 'campo_busca_equipe') {
      filtrar_equipes_unidade(e.target.value);
    } else if (e.target.id === 'campo_busca_funcs_sem_equipe') {
      filtrar_funcionarios_sem_equipe(e.target.value);
    }
  }, { signal });

  // Formulário de vínculo
  container.addEventListener('submit', async (e) => {
    if (e.target.id === 'form_vincular_equipe_unidade') {
      e.preventDefault();
      await salvar_vinculo_equipe();
    }
  }, { signal });

  // Listeners globais no window com signal
  window.addEventListener('click', (e) => {
    const modal_vincular = document.getElementById('modal_vincular_equipe_unidade');
    const modal_confirmar = document.getElementById('modal_confirmar_desvinculo_equipe');
    if (modal_vincular && e.target === modal_vincular) fechar_modal_vincular_equipe();
    if (modal_confirmar && e.target === modal_confirmar) fechar_modal_confirmar_desvinculo();
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fechar_modal_vincular_equipe();
      fechar_modal_confirmar_desvinculo();
    }
  }, { signal });
}

export function unmount() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  salvando = false;
  unidade_id = null;
  lista_equipes_unidade = [];
  lista_funcs_sem_equipe = [];
  modo_desvincular_ativo = false;
  equipe_selecionada_para_desvincular = null;
}

async function carregar_dados_unidade() {
  const { data: unidade, error: errUnidade } = await window._supabase
    .from('unidades')
    .select('nome')
    .eq('id', unidade_id)
    .single();

  const tituloEl = document.getElementById('titulo_unidade');
  if (errUnidade || !unidade) {
    console.error('Erro ao carregar unidade:', errUnidade);
    if (tituloEl) tituloEl.innerText = 'Unidade não encontrada';
    return;
  }

  if (tituloEl) tituloEl.innerText = unidade.nome;

  // Carrega equipes vinculadas
  const { data: equipes, error: errEquipes } = await window._supabase
    .from('equipes')
    .select('*')
    .eq('unidade_id', unidade_id)
    .order('created_at', { ascending: false });

  if (errEquipes) {
    console.error('Erro ao carregar equipes da unidade:', errEquipes);
    return;
  }

  lista_equipes_unidade = equipes || [];
  exibir_equipes_unidade(lista_equipes_unidade);

  // Carrega funcionários vinculados à unidade sem equipe
  const { data: funcionarios, error: errFuncs } = await window._supabase
    .from('funcionarios')
    .select('id, nome, cargo, numero_funcional, equipe_id, unidade_id')
    .eq('unidade_id', unidade_id)
    .is('equipe_id', null)
    .order('nome', { ascending: true });

  if (errFuncs) {
    console.error('Erro ao carregar funcionários sem equipe:', errFuncs);
    lista_funcs_sem_equipe = [];
  } else {
    lista_funcs_sem_equipe = funcionarios || [];
  }

  atualizar_estado_dropdown_funcionarios(lista_funcs_sem_equipe);
}

function atualizar_estado_dropdown_funcionarios(lista) {
  const btnDropdown = document.getElementById('btn_dropdown_funcs');
  const tituloDropdown = document.getElementById('titulo_dropdown_funcs');
  const conteudoDropdown = document.getElementById('conteudo_dropdown_funcs');

  if (tituloDropdown) tituloDropdown.innerText = `Funcionários sem equipe (${lista.length})`;

  if (lista.length > 0) {
    if (btnDropdown) btnDropdown.removeAttribute('disabled');
    renderizar_lista_funcs_dropdown(lista);
  } else {
    if (btnDropdown) btnDropdown.setAttribute('disabled', 'true');
    if (conteudoDropdown) conteudoDropdown.classList.add('oculto');
  }
}

function alternar_dropdown_funcs_sem_equipe() {
  const conteudoDropdown = document.getElementById('conteudo_dropdown_funcs');
  if (conteudoDropdown) {
    conteudoDropdown.classList.toggle('oculto');
  }
}

function renderizar_lista_funcs_dropdown(lista) {
  const ul = document.getElementById('lista_funcs_sem_equipe');
  if (!ul) return;

  if (lista.length === 0) {
    ul.innerHTML = '<li style="text-align: center; color: #64748b; padding: 8px;">Nenhum funcionário encontrado.</li>';
    return;
  }

  // Mutação única
  ul.innerHTML = lista.map(f => {
    const nome_seguro = window.sanitizar_texto(f.nome);
    const cargo_seguro = window.sanitizar_texto(f.cargo || 'Sem cargo');
    const nf_seguro = window.sanitizar_texto(f.numero_funcional ? `(NF: ${f.numero_funcional})` : '');

    return `
      <li class="item-func-dropdown">
        <span><strong>${nome_seguro}</strong> ${nf_seguro}</span>
        <span class="cargo">${cargo_seguro}</span>
      </li>
    `;
  }).join('');
}

function filtrar_funcionarios_sem_equipe(termoBruto) {
  const termo = (termoBruto || '').toLowerCase().trim();

  const filtrados = lista_funcs_sem_equipe.filter(f => {
    const bate_nome = f.nome ? f.nome.toLowerCase().includes(termo) : false;
    const bate_cargo = f.cargo ? f.cargo.toLowerCase().includes(termo) : false;
    const bate_nf = f.numero_funcional ? f.numero_funcional.toLowerCase().includes(termo) : false;
    return bate_nome || bate_cargo || bate_nf;
  });

  renderizar_lista_funcs_dropdown(filtrados);
}

function alternar_modo_desvincular() {
  modo_desvincular_ativo = !modo_desvincular_ativo;
  const btn = document.getElementById('btn_modo_desvincular');
  const thAcoes = document.getElementById('coluna_acoes_cabecalho');

  if (modo_desvincular_ativo) {
    if (btn) {
      btn.innerText = 'Concluir';
      btn.style.backgroundColor = '#64748b';
    }
    if (thAcoes) thAcoes.classList.remove('oculto');
  } else {
    if (btn) {
      btn.innerText = 'Desvincular equipe';
      btn.style.backgroundColor = '#ef4444';
    }
    if (thAcoes) thAcoes.classList.add('oculto');
  }

  exibir_equipes_unidade(lista_equipes_unidade);
}

function exibir_equipes_unidade(lista) {
  const tbody = document.getElementById('tabela_equipes_unidade');
  if (!tbody) return;

  const totalColunas = modo_desvincular_ativo ? 3 : 2;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align: center; color: #64748b;">Nenhuma equipe vinculada a esta unidade.</td></tr>`;
    return;
  }

  // Mutação única
  tbody.innerHTML = lista.map(eq => {
    const nome_seguro = window.sanitizar_texto(eq.nome);
    const descricao_segura = window.sanitizar_texto(eq.descricao || '-');
    const eqJson = window.sanitizar_texto(JSON.stringify(eq));
    const colunaAcaoHTML = modo_desvincular_ativo 
      ? `<td class="coluna-remocao"><button type="button" class="btn-x-remocao" data-acao="iniciar-desvinculo-equipe" data-equipe='${eqJson}' title="Desvincular equipe">&times;</button></td>`
      : '';

    return `
      <tr>
        <td>
          <a href="equipe_detalhes.html?id=${encodeURIComponent(eq.id)}&unidade_id=${encodeURIComponent(unidade_id)}" class="nome-equipe-link">
            ${nome_seguro}
          </a>
        </td>
        <td>${descricao_segura}</td>
        ${colunaAcaoHTML}
      </tr>
    `;
  }).join('');
}

function filtrar_equipes_unidade(termoBruto) {
  const termo = (termoBruto || '').toLowerCase().trim();

  const filtradas = lista_equipes_unidade.filter(eq => {
    const bate_nome = eq.nome ? eq.nome.toLowerCase().includes(termo) : false;
    const bate_descricao = eq.descricao ? eq.descricao.toLowerCase().includes(termo) : false;
    return bate_nome || bate_descricao;
  });

  exibir_equipes_unidade(filtradas);
}

function confirmar_desvinculo_equipe(equipe) {
  equipe_selecionada_para_desvincular = equipe;
  const nomeEl = document.getElementById('nome_equipe_desvincular');
  if (nomeEl) nomeEl.innerText = equipe.nome;
  const modal = document.getElementById('modal_confirmar_desvinculo_equipe');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_confirmar_desvinculo() {
  const modal = document.getElementById('modal_confirmar_desvinculo_equipe');
  if (modal) modal.classList.add('oculto');
  equipe_selecionada_para_desvincular = null;
}

async function executar_desvinculo_equipe() {
  if (!equipe_selecionada_para_desvincular) return;

  const { error } = await window._supabase
    .from('equipes')
    .update({ unidade_id: null })
    .eq('id', equipe_selecionada_para_desvincular.id);

  if (error) {
    alert('Erro ao desvincular equipe: ' + error.message);
  } else {
    fechar_modal_confirmar_desvinculo();
    await carregar_dados_unidade();
  }
}

async function abrir_modal_vincular_equipe() {
  const modal = document.getElementById('modal_vincular_equipe_unidade');
  if (modal) modal.classList.remove('oculto');
  await carregar_equipes_disponiveis();
}

function fechar_modal_vincular_equipe() {
  const modal = document.getElementById('modal_vincular_equipe_unidade');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_vincular_equipe_unidade');
  if (form) form.reset();
}

async function carregar_equipes_disponiveis() {
  const select = document.getElementById('select_equipe_disponivel');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando equipes...</option>';

  const { data: equipes, error } = await window._supabase
    .from('equipes')
    .select('id, nome, unidade_id')
    .is('unidade_id', null)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar equipes disponíveis:', error);
    select.innerHTML = '<option value="">Erro ao carregar lista</option>';
    return;
  }

  const disponiveis = equipes || [];

  if (disponiveis.length === 0) {
    select.innerHTML = '<option value="">Nenhuma equipe disponível sem unidade cadastrada</option>';
  } else {
    select.innerHTML = '<option value="">-- Selecione uma equipe --</option>' +
      disponiveis.map(eq => `<option value="${encodeURIComponent(eq.id)}">${window.sanitizar_texto(eq.nome)}</option>`).join('');
  }
}

async function salvar_vinculo_equipe() {
  if (salvando) return;

  const select = document.getElementById('select_equipe_disponivel');
  if (!select) return;
  const equipe_selecionada_id = select.value;

  if (!equipe_selecionada_id) {
    alert('Selecione uma equipe da lista.');
    return;
  }

  const form = document.getElementById('form_vincular_equipe_unidade');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';

  try {
    salvando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Vinculando...';
    }

    const { error } = await window._supabase
      .from('equipes')
      .update({ unidade_id: unidade_id })
      .eq('id', equipe_selecionada_id);

    if (error) {
      alert('Erro ao vincular equipe: ' + error.message);
    } else {
      fechar_modal_vincular_equipe();
      await carregar_dados_unidade();
    }
  } finally {
    salvando = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;
    }
  }
}
