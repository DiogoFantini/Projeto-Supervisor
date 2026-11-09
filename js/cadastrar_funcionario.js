let lista_funcionarios_todos = [];
let lista_unidades_todas = [];
let funcionario_atual = null;

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

function abrir_modal_detalhes(funcionario) {
  funcionario_atual = funcionario;

  const nome_unidade = funcionario.unidades?.nome || funcionario.equipes?.unidades?.nome || '-';

  document.getElementById('detalhe_nome').innerText = funcionario.nome || '-';
  document.getElementById('detalhe_numero_funcional').innerText = funcionario.numero_funcional || '-';
  document.getElementById('detalhe_cargo').innerText = funcionario.cargo || '-';
  document.getElementById('detalhe_classificacao').innerText = funcionario.regime || '-';
  document.getElementById('detalhe_registro').innerText = funcionario.registro_profissional || '-';
  document.getElementById('detalhe_especializacao').innerText = funcionario.especializacao || '-';
  document.getElementById('detalhe_equipe').innerText = funcionario.equipes?.nome || 'Sem equipe';
  document.getElementById('detalhe_unidade').innerText = nome_unidade;

  document.getElementById('modo_visualizacao_funcionario').classList.remove('oculto');
  document.getElementById('modo_edicao_funcionario').classList.add('oculto');

  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_detalhes() {
  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.add('oculto');
  funcionario_atual = null;
}

async function ativar_modo_edicao_funcionario() {
  if (!funcionario_atual) return;

  document.getElementById('edit_nome_funcionario').value = funcionario_atual.nome || '';
  document.getElementById('edit_numero_funcional_funcionario').value = funcionario_atual.numero_funcional || '';
  document.getElementById('edit_cargo_funcionario').value = funcionario_atual.cargo || '';
  document.getElementById('edit_classificacao_funcionario').value = funcionario_atual.regime || '';
  document.getElementById('edit_registro_funcionario').value = funcionario_atual.registro_profissional || '';
  document.getElementById('edit_especializacao_funcionario').value = funcionario_atual.especializacao || '';

  atualizar_campo_registro_edicao();

  document.getElementById('modo_visualizacao_funcionario').classList.add('oculto');
  document.getElementById('modo_edicao_funcionario').classList.remove('oculto');

  await carregar_unidades_select_edicao();
}

function cancelar_edicao_funcionario() {
  document.getElementById('modo_edicao_funcionario').classList.add('oculto');
  document.getElementById('modo_visualizacao_funcionario').classList.remove('oculto');
}

function atualizar_campo_registro() {
  const cargoSelect = document.getElementById('novo_cargo_funcionario');
  const container = document.getElementById('container_registro_profissional');
  const label = document.getElementById('label_registro_profissional');
  const input = document.getElementById('novo_registro_funcionario');

  if (!cargoSelect || !container || !label || !input) return;

  const cargo = cargoSelect.value;
  const mapeamentoRegistros = {
    'Médico(a)': { label: 'CRM (opcional):', placeholder: 'Ex: CRM/SP 123456' },
    'Enfermeiro(a)': { label: 'COREN (opcional):', placeholder: 'Ex: COREN-SP 123456' },
    'Técnico(a) de Enfermagem': { label: 'COREN (opcional):', placeholder: 'Ex: COREN-SP 123456' },
    'Auxiliar de Enfermagem': { label: 'COREN (opcional):', placeholder: 'Ex: COREN-SP 123456' },
    'Dentista': { label: 'CRO (opcional):', placeholder: 'Ex: CRO-SP 123456' }
  };

  if (mapeamentoRegistros[cargo]) {
    label.innerHTML = `<strong>${mapeamentoRegistros[cargo].label}</strong>`;
    input.placeholder = mapeamentoRegistros[cargo].placeholder;
    input.required = false;
    container.classList.remove('oculto');
  } else {
    input.value = '';
    input.required = false;
    container.classList.add('oculto');
  }
}

function atualizar_campo_registro_edicao() {
  const cargoSelect = document.getElementById('edit_cargo_funcionario');
  const container = document.getElementById('container_registro_profissional_edit');
  const label = document.getElementById('label_registro_profissional_edit');
  const input = document.getElementById('edit_registro_funcionario');

  if (!cargoSelect || !container || !label || !input) return;

  const cargo = cargoSelect.value;
  const mapeamentoRegistros = {
    'Médico(a)': { label: 'CRM (opcional):', placeholder: 'Ex: CRM/SP 123456' },
    'Enfermeiro(a)': { label: 'COREN (opcional):', placeholder: 'Ex: COREN-SP 123456' },
    'Técnico(a) de Enfermagem': { label: 'COREN (opcional):', placeholder: 'Ex: COREN-SP 123456' },
    'Auxiliar de Enfermagem': { label: 'COREN (opcional):', placeholder: 'Ex: COREN-SP 123456' },
    'Dentista': { label: 'CRO (opcional):', placeholder: 'Ex: CRO-SP 123456' }
  };

  if (mapeamentoRegistros[cargo]) {
    label.innerHTML = `<strong>${mapeamentoRegistros[cargo].label}</strong>`;
    input.placeholder = mapeamentoRegistros[cargo].placeholder;
    input.required = false;
    container.classList.remove('oculto');
  } else {
    input.value = '';
    input.required = false;
    container.classList.add('oculto');
  }
}

async function abrir_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.remove('oculto');
  await carregar_unidades_select();
}

function fechar_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_funcionario');
  if (form) form.reset();
  
  const containerEquipe = document.getElementById('container_equipe_funcionario');
  const selectEquipe = document.getElementById('novo_equipe_funcionario');
  if (containerEquipe) containerEquipe.classList.add('oculto');
  if (selectEquipe) selectEquipe.required = false;

  atualizar_campo_registro();
}

async function carregar_unidades_select() {
  const selectUnidade = document.getElementById('novo_unidade_funcionario');
  if (!selectUnidade) return;

  selectUnidade.innerHTML = '<option value="">Carregando unidades...</option>';

  const { data: unidades, error } = await _supabase
    .from('unidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) return console.error('Erro ao carregar unidades:', error);

  lista_unidades_todas = unidades || [];
  selectUnidade.innerHTML = '<option value="">-- Selecione a unidade (opcional) --</option>';

  lista_unidades_todas.forEach(u => {
    const nome_seguro = sanitizar_texto(u.nome);
    selectUnidade.innerHTML += `<option value="${u.id}">${nome_seguro}</option>`;
  });
}

async function carregar_equipes_da_unidade() {
  const unidadeId = document.getElementById('novo_unidade_funcionario').value;
  const containerEquipe = document.getElementById('container_equipe_funcionario');
  const selectEquipe = document.getElementById('novo_equipe_funcionario');

  if (!unidadeId) {
    containerEquipe.classList.add('oculto');
    selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
    selectEquipe.value = '';
    selectEquipe.required = false;
    return;
  }

  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  containerEquipe.classList.remove('oculto');
  selectEquipe.required = false;

  const { data: equipes, error } = await _supabase
    .from('equipes')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (error) return console.error('Erro ao carregar equipes:', error);

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

async function carregar_unidades_select_edicao() {
  const selectUnidade = document.getElementById('edit_unidade_funcionario');
  if (!selectUnidade) return;

  selectUnidade.innerHTML = '<option value="">Carregando unidades...</option>';

  const { data: unidades, error } = await _supabase
    .from('unidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) return console.error('Erro ao carregar unidades:', error);

  selectUnidade.innerHTML = '<option value="">-- Selecione a unidade (opcional) --</option>';

  (unidades || []).forEach(u => {
    const nome_seguro = sanitizar_texto(u.nome);
    selectUnidade.innerHTML += `<option value="${u.id}">${nome_seguro}</option>`;
  });

  const unidadeAtualId = funcionario_atual.unidade_id || funcionario_atual.equipes?.unidade_id || funcionario_atual.equipes?.unidades?.id;
  selectUnidade.value = unidadeAtualId || '';

  await carregar_equipes_da_unidade_edicao();
}

async function carregar_equipes_da_unidade_edicao() {
  const unidadeId = document.getElementById('edit_unidade_funcionario').value;
  const containerEquipe = document.getElementById('container_equipe_funcionario_edit');
  const selectEquipe = document.getElementById('edit_equipe_funcionario');

  if (!unidadeId) {
    containerEquipe.classList.add('oculto');
    selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
    selectEquipe.value = '';
    selectEquipe.required = false;
    return;
  }

  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  containerEquipe.classList.remove('oculto');
  selectEquipe.required = false;

  const { data: equipes, error } = await _supabase
    .from('equipes')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (error) return console.error('Erro ao carregar equipes:', error);

  selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';

  if (!equipes || equipes.length === 0) {
    selectEquipe.innerHTML = '<option value="">Nenhuma equipe cadastrada nesta unidade</option>';
  } else {
    equipes.forEach(eq => {
      const nome_seguro = sanitizar_texto(eq.nome);
      selectEquipe.innerHTML += `<option value="${eq.id}">${nome_seguro}</option>`;
    });

    if (funcionario_atual.equipe_id) {
      selectEquipe.value = funcionario_atual.equipe_id;
    }
  }
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

document.addEventListener('DOMContentLoaded', () => {
  carregar_funcionarios();

  const formCadastro = document.getElementById('form_cadastro_funcionario');
  if (formCadastro) {
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
  if (formEdicao) {
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

  window.addEventListener('click', (event) => {
    const modal_cadastro = document.getElementById('modal_cadastro_funcionario');
    const modal_detalhes = document.getElementById('modal_detalhes_funcionario');
    if (event.target === modal_cadastro) fechar_modal_cadastro();
    if (event.target === modal_detalhes) fechar_modal_detalhes();
  });
});