var lista_funcionarios_todos = [];
var lista_unidades_func = [];
var funcionario_atual = null;

async function carregar_funcionarios() {
  const { data, error } = await _supabase
    .from('funcionarios')
    .select('*, unidades(id, nome), equipes(id, nome, unidade_id, unidades(id, nome)))')
    .order('created_at', { ascending: false });

  if (error) return console.error('Erro ao buscar funcionários:', error);

  lista_funcionarios_todos = data || [];
  exibir_funcionarios(lista_funcionarios_todos);
}

function exibir_funcionarios(lista) {
  const tbody = document.getElementById('tabela_funcionarios');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">Nenhum funcionário encontrado.</td></tr>';
    return;
  }

  lista.forEach(f => {
    const nome_seguro = sanitizar_texto(f.nome);
    const num_funcional_seguro = sanitizar_texto(f.numero_funcional || '-');
    const cargo_seguro = sanitizar_texto(f.cargo || '-');
    const class_funcional_segura = sanitizar_texto(f.regime || '-');
    const esp_segura = sanitizar_texto(f.especializacao || '-');
    
    const nome_unidade_direta = f.unidades?.nome;
    const nome_unidade_equipe = f.equipes?.unidades?.nome;
    const nome_unidade_seguro = sanitizar_texto(nome_unidade_direta || nome_unidade_equipe || '-');
    
    const nome_equipe_seguro = sanitizar_texto(f.equipes?.nome || 'Sem equipe');

    tbody.innerHTML += `
      <tr>
        <td><strong>${nome_seguro}</strong></td>
        <td>${num_funcional_seguro}</td>
        <td>${cargo_seguro}</td>
        <td>${class_funcional_segura}</td>
        <td>${esp_segura}</td>
        <td>${nome_equipe_seguro}</td>
        <td>${nome_unidade_seguro}</td>
        <td class="coluna-acoes">
          <button class="btn-olho" onclick='abrir_modal_detalhes(${JSON.stringify(f)})' title="Visualizar detalhes">
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

function filtrar_funcionarios() {
  const campoBusca = document.getElementById('campo_busca_funcionario');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtrados = lista_funcionarios_todos.filter(f => {
    const nome_unidade = f.unidades?.nome || f.equipes?.unidades?.nome || '';
    const nome_equipe = f.equipes?.nome || '';

    const bate_nome = f.nome ? f.nome.toLowerCase().includes(termo) : false;
    const bate_num_funcional = f.numero_funcional ? f.numero_funcional.toLowerCase().includes(termo) : false;
    const bate_cargo = f.cargo ? f.cargo.toLowerCase().includes(termo) : false;
    const bate_regime = f.regime ? f.regime.toLowerCase().includes(termo) : false;
    const bate_especializacao = f.especializacao ? f.especializacao.toLowerCase().includes(termo) : false;
    const bate_equipe = nome_equipe ? nome_equipe.toLowerCase().includes(termo) : false;
    const bate_unidade = nome_unidade ? nome_unidade.toLowerCase().includes(termo) : false;

    return bate_nome || bate_num_funcional || bate_cargo || bate_regime || bate_especializacao || bate_equipe || bate_unidade;
  });

  exibir_funcionarios(filtrados);
}

function abrir_modal_detalhes_funcionario(funcionario) {
  funcionario_atual = funcionario;

  const nome_unidade = funcionario.unidades?.nome || funcionario.equipes?.unidades?.nome || '-';

  const setTexto = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val || '-';
  };

  setTexto('detalhe_nome', funcionario.nome);
  setTexto('detalhe_numero_funcional', funcionario.numero_funcional);
  setTexto('detalhe_cargo', funcionario.cargo);
  setTexto('detalhe_classificacao', funcionario.regime);
  setTexto('detalhe_registro', funcionario.registro_profissional);
  setTexto('detalhe_especializacao', funcionario.especializacao);
  setTexto('detalhe_equipe', funcionario.equipes?.nome || 'Sem equipe');
  setTexto('detalhe_unidade', nome_unidade);

  const modoVis = document.getElementById('modo_visualizacao_funcionario');
  if (modoVis) modoVis.classList.remove('oculto');
  const modoEdit = document.getElementById('modo_edicao_funcionario');
  if (modoEdit) modoEdit.classList.add('oculto');

  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_detalhes_funcionario() {
  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.add('oculto');
  funcionario_atual = null;
}

async function ativar_modo_edicao_funcionario() {
  if (!funcionario_atual) return;

  const setValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setValue('edit_nome_funcionario', funcionario_atual.nome);
  setValue('edit_numero_funcional_funcionario', funcionario_atual.numero_funcional);
  setValue('edit_cargo_funcionario', funcionario_atual.cargo);
  setValue('edit_classificacao_funcionario', funcionario_atual.regime);
  setValue('edit_registro_funcionario', funcionario_atual.registro_profissional);
  setValue('edit_especializacao_funcionario', funcionario_atual.especializacao);

  atualizar_campo_registro_edicao();

  const id_unidade_atual = funcionario_atual.unidade_id || funcionario_atual.equipes?.unidade_id || '';
  await carregar_unidades_select_funcionario('edit_unidade_funcionario', id_unidade_atual);

  if (id_unidade_atual) {
    await carregar_equipes_da_unidade_edicao(funcionario_atual.equipe_id || '');
  } else {
    const containerEq = document.getElementById('container_equipe_funcionario_edit');
    if (containerEq) containerEq.classList.add('oculto');
  }

  const modoVis = document.getElementById('modo_visualizacao_funcionario');
  if (modoVis) modoVis.classList.add('oculto');
  const modoEdit = document.getElementById('modo_edicao_funcionario');
  if (modoEdit) modoEdit.classList.remove('oculto');
}

function cancelar_edicao_funcionario() {
  const modoEdit = document.getElementById('modo_edicao_funcionario');
  if (modoEdit) modoEdit.classList.add('oculto');
  const modoVis = document.getElementById('modo_visualizacao_funcionario');
  if (modoVis) modoVis.classList.remove('oculto');
}

function atualizar_campo_registro() {
  const cargo = document.getElementById('novo_cargo_funcionario').value;
  const container = document.getElementById('container_registro_profissional');
  const label = document.getElementById('label_registro_profissional');

  if (cargo === 'Médico(a)') {
    container.classList.remove('oculto');
    label.innerText = 'CRM (opcional)';
  } else if (cargo === 'Enfermeiro(a)' || cargo === 'Técnico(a) de Enfermagem' || cargo === 'Auxiliar de Enfermagem') {
    container.classList.remove('oculto');
    label.innerText = 'COREN (opcional)';
  } else if (cargo === 'Dentista') {
    container.classList.remove('oculto');
    label.innerText = 'CRO (opcional)';
  } else {
    container.classList.add('oculto');
    document.getElementById('novo_registro_funcionario').value = '';
  }
}

function atualizar_campo_registro_edicao() {
  const cargo = document.getElementById('edit_cargo_funcionario').value;
  const container = document.getElementById('container_registro_profissional_edit');
  const label = document.getElementById('label_registro_profissional_edit');

  if (cargo === 'Médico(a)') {
    container.classList.remove('oculto');
    label.innerText = 'CRM (opcional)';
  } else if (cargo === 'Enfermeiro(a)' || cargo === 'Técnico(a) de Enfermagem' || cargo === 'Auxiliar de Enfermagem') {
    container.classList.remove('oculto');
    label.innerText = 'COREN (opcional)';
  } else if (cargo === 'Dentista') {
    container.classList.remove('oculto');
    label.innerText = 'CRO (opcional)';
  } else {
    container.classList.add('oculto');
    document.getElementById('edit_registro_funcionario').value = '';
  }
}

async function carregar_unidades_select_funcionario(selectElementId, valorSelecionado = '') {
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

  lista_unidades_func = unidades || [];
  selectUnidade.innerHTML = '<option value="">-- Selecione a unidade (opcional) --</option>';

  lista_unidades_func.forEach(u => {
    const nome_seguro = sanitizar_texto(u.nome);
    selectUnidade.innerHTML += `<option value="${u.id}">${nome_seguro}</option>`;
  });

  if (valorSelecionado) {
    selectUnidade.value = valorSelecionado;
  }
}

async function carregar_equipes_da_unidade() {
  const unidadeId = document.getElementById('novo_unidade_funcionario').value;
  const container = document.getElementById('container_equipe_funcionario');
  const selectEquipe = document.getElementById('novo_equipe_funcionario');

  if (!unidadeId) {
    container.classList.add('oculto');
    selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  container.classList.remove('oculto');

  const { data: equipes, error } = await _supabase
    .from('equipes')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar equipes da unidade:', error);
    selectEquipe.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
  if (!equipes || equipes.length === 0) {
    selectEquipe.innerHTML = '<option value="">Nenhuma equipe cadastrada nesta unidade</option>';
  } else {
    equipes.forEach(eq => {
      const nome_seguro = sanitizar_texto(eq.nome);
      selectEquipe.innerHTML += `<option value="${eq.id}">${nome_seguro}</option>`;
    });
  }
}

async function carregar_equipes_da_unidade_edicao(valorSelecionado = '') {
  const unidadeId = document.getElementById('edit_unidade_funcionario').value;
  const container = document.getElementById('container_equipe_funcionario_edit');
  const selectEquipe = document.getElementById('edit_equipe_funcionario');

  if (!unidadeId) {
    container.classList.add('oculto');
    selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  container.classList.remove('oculto');

  const { data: equipes, error } = await _supabase
    .from('equipes')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar equipes da unidade:', error);
    selectEquipe.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
  if (!equipes || equipes.length === 0) {
    selectEquipe.innerHTML = '<option value="">Nenhuma equipe cadastrada nesta unidade</option>';
  } else {
    equipes.forEach(eq => {
      const nome_seguro = sanitizar_texto(eq.nome);
      selectEquipe.innerHTML += `<option value="${eq.id}">${nome_seguro}</option>`;
    });
  }

  if (valorSelecionado) {
    selectEquipe.value = valorSelecionado;
  }
}

async function abrir_modal_cadastro_funcionario() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.remove('oculto');
  await carregar_unidades_select_funcionario('novo_unidade_funcionario');
}

function fechar_modal_cadastro_funcionario() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_funcionario');
  if (form) form.reset();
  const regContainer = document.getElementById('container_registro_profissional');
  if (regContainer) regContainer.classList.add('oculto');
  const eqContainer = document.getElementById('container_equipe_funcionario');
  if (eqContainer) eqContainer.classList.add('oculto');
}

async function excluir_funcionario() {
  if (!funcionario_atual) return;
  if (!confirm(`Tem certeza que deseja excluir o funcionário "${funcionario_atual.nome}"?`)) return;

  const { error } = await _supabase
    .from('funcionarios')
    .delete()
    .eq('id', funcionario_atual.id);

  if (error) {
    alert('Erro ao excluir funcionário: ' + error.message);
  } else {
    fechar_modal_detalhes();
    carregar_funcionarios();
  }
}

function iniciar_tela_funcionarios() {
  funcionario_atual = null;
  carregar_funcionarios();

  const formCadastro = document.getElementById('form_cadastro_funcionario');
  if (formCadastro && !formCadastro.dataset.eventoRegistrado) {
    formCadastro.dataset.eventoRegistrado = "true";
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('novo_nome_funcionario').value;
      const numero_funcional = document.getElementById('novo_numero_funcional_funcionario').value;
      const cargoSelecionado = document.getElementById('novo_cargo_funcionario').value;
      const classificacao = document.getElementById('novo_classificacao_funcionario').value;
      const registro = document.getElementById('novo_registro_funcionario').value;
      const especializacao = document.getElementById('nova_especializacao_funcionario').value;
      const unidadeId = document.getElementById('novo_unidade_funcionario').value || null;
      const equipeId = document.getElementById('novo_equipe_funcionario').value || null;

      const { error } = await _supabase.from('funcionarios').insert([{
        nome: nome.trim(),
        numero_funcional: numero_funcional.trim(),
        cargo: cargoSelecionado,
        regime: classificacao ? classificacao.trim() : null,
        registro_profissional: registro ? registro.trim() : null,
        especializacao: especializacao ? especializacao.trim() : null,
        unidade_id: unidadeId,
        equipe_id: equipeId
      }]);

      if (error) {
        alert('Erro ao cadastrar funcionário: ' + error.message);
      } else {
        fechar_modal_cadastro();
        carregar_funcionarios();
      }
    });
  }

  const formEdicao = document.getElementById('form_edicao_funcionario');
  if (formEdicao && !formEdicao.dataset.eventoRegistrado) {
    formEdicao.dataset.eventoRegistrado = "true";
    formEdicao.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!funcionario_atual) return;

      const nome = document.getElementById('edit_nome_funcionario').value;
      const numero_funcional = document.getElementById('edit_numero_funcional_funcionario').value;
      const cargoSelecionado = document.getElementById('edit_cargo_funcionario').value;
      const classificacao = document.getElementById('edit_classificacao_funcionario').value;
      const registro = document.getElementById('edit_registro_funcionario').value;
      const especializacao = document.getElementById('edit_especializacao_funcionario').value;
      const unidadeId = document.getElementById('edit_unidade_funcionario').value || null;
      const equipeId = document.getElementById('edit_equipe_funcionario').value || null;

      const { error } = await _supabase
        .from('funcionarios')
        .update({
          nome: nome.trim(),
          numero_funcional: numero_funcional.trim(),
          cargo: cargoSelecionado,
          regime: classificacao ? classificacao.trim() : null,
          registro_profissional: registro ? registro.trim() : null,
          especializacao: especializacao ? especializacao.trim() : null,
          unidade_id: unidadeId,
          equipe_id: equipeId
        })
        .eq('id', funcionario_atual.id);

      if (error) {
        alert('Erro ao atualizar funcionário: ' + error.message);
      } else {
        fechar_modal_detalhes();
        carregar_funcionarios();
      }
    });
  }

  if (!window.listenersModalFuncionariosInjetados) {
    window.listenersModalFuncionariosInjetados = true;
    window.addEventListener('click', (event) => {
      const modal_cadastro = document.getElementById('modal_cadastro_funcionario');
      const modal_detalhes = document.getElementById('modal_detalhes_funcionario');
      if (modal_cadastro && event.target === modal_cadastro) fechar_modal_cadastro();
      if (modal_detalhes && event.target === modal_detalhes) fechar_modal_detalhes();
    });
  }
}

// 1. Gatilho F5 / Acesso direto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tabela_funcionarios')) {
    iniciar_tela_funcionarios();
  }
});

// 2. Gatilho Navegação SPA
document.addEventListener('spa_tela_carregada', (e) => {
  const url_carregada = e.detail;
  if (url_carregada.includes('funcionarios.html')) {
    iniciar_tela_funcionarios();
  }
});
