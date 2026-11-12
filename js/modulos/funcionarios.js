let abortController = null;
let lista_funcionarios_todos = [];
let lista_unidades_todas = [];
let funcionario_atual = null;
let dados_prontos_para_importar = null;
let unidades_novas_para_criar = [];
let salvando = false;

export async function mount(container) {
  abortController = new AbortController();
  const { signal } = abortController;

  funcionario_atual = null;
  salvando = false;
  dados_prontos_para_importar = null;
  unidades_novas_para_criar = [];

  await carregar_funcionarios();

  // Delegação de eventos de clique
  container.addEventListener('click', async (e) => {
    const acaoEl = e.target.closest('[data-acao]');
    if (!acaoEl) return;

    const acao = acaoEl.getAttribute('data-acao');

    if (acao === 'abrir-modal-cadastro') {
      await abrir_modal_cadastro();
    } else if (acao === 'fechar-modal-cadastro') {
      fechar_modal_cadastro();
    } else if (acao === 'abrir-detalhes-funcionario') {
      const funcJson = acaoEl.getAttribute('data-func');
      if (funcJson) {
        abrir_modal_detalhes(JSON.parse(funcJson));
      }
    } else if (acao === 'fechar-modal-detalhes') {
      fechar_modal_detalhes();
    } else if (acao === 'ativar-modo-edicao') {
      await ativar_modo_edicao();
    } else if (acao === 'cancelar-edicao') {
      cancelar_edicao();
    } else if (acao === 'excluir-funcionario') {
      await excluir_funcionario();
    } else if (acao === 'abrir-modal-importacao') {
      abrir_modal_importacao();
    } else if (acao === 'fechar-modal-importacao') {
      fechar_modal_importacao();
    } else if (acao === 'confirmar-importacao') {
      await confirmar_importacao_banco();
    } else if (acao === 'exportar-excel') {
      await exportar_funcionarios_excel();
    }
  }, { signal });

  // Filtros de busca
  container.addEventListener('input', (e) => {
    if (e.target.id === 'campo_busca_funcionario') {
      filtrar_funcionarios(e.target.value);
    }
  }, { signal });

  // Mudanças em selects e inputs de arquivo
  container.addEventListener('change', async (e) => {
    if (e.target.id === 'novo_cargo_funcionario') {
      atualizar_campo_registro('novo');
    } else if (e.target.id === 'edit_cargo_funcionario') {
      atualizar_campo_registro('edit');
    } else if (e.target.id === 'novo_unidade_funcionario') {
      await carregar_equipes_da_unidade(e.target.value, 'novo_equipe_funcionario', 'container_equipe_funcionario');
    } else if (e.target.id === 'edit_unidade_funcionario') {
      await carregar_equipes_da_unidade(e.target.value, 'edit_equipe_funcionario', 'container_equipe_funcionario_edit');
    } else if (e.target.id === 'arquivo_excel_input') {
      await processar_arquivo_selecionado(e);
    }
  }, { signal });

  // Formulários
  container.addEventListener('submit', async (e) => {
    if (e.target.id === 'form_cadastro_funcionario') {
      e.preventDefault();
      await salvar_novo_funcionario();
    } else if (e.target.id === 'form_edicao_funcionario') {
      e.preventDefault();
      await salvar_edicao_funcionario();
    }
  }, { signal });

  // Listeners globais no window com signal
  window.addEventListener('click', (e) => {
    const modal_cadastro = document.getElementById('modal_cadastro_funcionario');
    const modal_detalhes = document.getElementById('modal_detalhes_funcionario');
    const modal_importacao = document.getElementById('modal_importacao_funcionarios');
    if (modal_cadastro && e.target === modal_cadastro) fechar_modal_cadastro();
    if (modal_detalhes && e.target === modal_detalhes) fechar_modal_detalhes();
    if (modal_importacao && e.target === modal_importacao) fechar_modal_importacao();
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fechar_modal_cadastro();
      fechar_modal_detalhes();
      fechar_modal_importacao();
    }
  }, { signal });
}

export function unmount() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  salvando = false;
  lista_funcionarios_todos = [];
  lista_unidades_todas = [];
  funcionario_atual = null;
  dados_prontos_para_importar = null;
  unidades_novas_para_criar = [];
}

async function carregar_funcionarios() {
  const { data, error } = await window._supabase
    .from('funcionarios')
    .select('*, unidades(id, nome), equipes(id, nome, unidade_id, unidades(id, nome)))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar funcionários:', error);
    return;
  }

  lista_funcionarios_todos = data || [];
  exibir_funcionarios(lista_funcionarios_todos);
}

function exibir_funcionarios(lista) {
  const tbody = document.getElementById('tabela_funcionarios');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">Nenhum funcionário encontrado.</td></tr>';
    return;
  }

  // Mutação única no DOM
  tbody.innerHTML = lista.map(f => {
    const nome_seguro = window.sanitizar_texto(f.nome);
    const num_funcional_seguro = window.sanitizar_texto(f.numero_funcional || '-');
    const cargo_seguro = window.sanitizar_texto(f.cargo || '-');
    const class_funcional_segura = window.sanitizar_texto(f.regime || '-');
    const esp_segura = window.sanitizar_texto(f.especializacao || '-');
    
    const nome_unidade_direta = f.unidades?.nome;
    const nome_unidade_equipe = f.equipes?.unidades?.nome;
    const nome_unidade_seguro = window.sanitizar_texto(nome_unidade_direta || nome_unidade_equipe || '-');
    const nome_equipe_seguro = window.sanitizar_texto(f.equipes?.nome || 'Sem equipe');
    const fJson = window.sanitizar_texto(JSON.stringify(f));

    return `
      <tr>
        <td><strong>${nome_seguro}</strong></td>
        <td>${num_funcional_seguro}</td>
        <td>${cargo_seguro}</td>
        <td>${class_funcional_segura}</td>
        <td>${esp_segura}</td>
        <td>${nome_equipe_seguro}</td>
        <td>${nome_unidade_seguro}</td>
        <td class="coluna-acoes">
          <button type="button" class="btn-olho" data-acao="abrir-detalhes-funcionario" data-func='${fJson}' title="Visualizar detalhes">
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

function filtrar_funcionarios(termoBruto) {
  const termo = (termoBruto || '').toLowerCase().trim();

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

function fechar_modal_detalhes() {
  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.add('oculto');
  funcionario_atual = null;
}

async function ativar_modo_edicao() {
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

  atualizar_campo_registro('edit');

  const id_unidade_atual = funcionario_atual.unidade_id || funcionario_atual.equipes?.unidade_id || '';
  await carregar_unidades_select('edit_unidade_funcionario', id_unidade_atual);

  if (id_unidade_atual) {
    await carregar_equipes_da_unidade(id_unidade_atual, 'edit_equipe_funcionario', 'container_equipe_funcionario_edit', funcionario_atual.equipe_id || '');
  } else {
    const containerEq = document.getElementById('container_equipe_funcionario_edit');
    if (containerEq) containerEq.classList.add('oculto');
  }

  const modoVis = document.getElementById('modo_visualizacao_funcionario');
  if (modoVis) modoVis.classList.add('oculto');
  const modoEdit = document.getElementById('modo_edicao_funcionario');
  if (modoEdit) modoEdit.classList.remove('oculto');
}

function cancelar_edicao() {
  const modoEdit = document.getElementById('modo_edicao_funcionario');
  if (modoEdit) modoEdit.classList.add('oculto');
  const modoVis = document.getElementById('modo_visualizacao_funcionario');
  if (modoVis) modoVis.classList.remove('oculto');
}

function atualizar_campo_registro(modo) {
  const cargoEl = document.getElementById(modo === 'novo' ? 'novo_cargo_funcionario' : 'edit_cargo_funcionario');
  const container = document.getElementById(modo === 'novo' ? 'container_registro_profissional' : 'container_registro_profissional_edit');
  const label = document.getElementById(modo === 'novo' ? 'label_registro_profissional' : 'label_registro_profissional_edit');
  const input = document.getElementById(modo === 'novo' ? 'novo_registro_funcionario' : 'edit_registro_funcionario');

  if (!cargoEl || !container || !label) return;
  const cargo = cargoEl.value;

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
    if (input) input.value = '';
  }
}

async function carregar_unidades_select(selectElementId, valorSelecionado = '') {
  const selectUnidade = document.getElementById(selectElementId);
  if (!selectUnidade) return;

  selectUnidade.innerHTML = '<option value="">Carregando unidades...</option>';

  const { data: unidades, error } = await window._supabase
    .from('unidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar unidades:', error);
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

async function carregar_equipes_da_unidade(unidadeId, selectId, containerId, valorSelecionado = '') {
  const container = document.getElementById(containerId);
  const selectEquipe = document.getElementById(selectId);
  if (!container || !selectEquipe) return;

  if (!unidadeId) {
    container.classList.add('oculto');
    selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  container.classList.remove('oculto');

  const { data: equipes, error } = await window._supabase
    .from('equipes')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar equipes da unidade:', error);
    selectEquipe.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    return;
  }

  if (!equipes || equipes.length === 0) {
    selectEquipe.innerHTML = '<option value="">Nenhuma equipe cadastrada nesta unidade</option>';
  } else {
    selectEquipe.innerHTML = '<option value="">-- Selecione a equipe (opcional) --</option>' +
      equipes.map(eq => `<option value="${encodeURIComponent(eq.id)}">${window.sanitizar_texto(eq.nome)}</option>`).join('');
  }

  if (valorSelecionado) {
    selectEquipe.value = valorSelecionado;
  }
}

async function abrir_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.remove('oculto');
  await carregar_unidades_select('novo_unidade_funcionario');
}

function fechar_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_funcionario');
  if (form) form.reset();
  const regContainer = document.getElementById('container_registro_profissional');
  if (regContainer) regContainer.classList.add('oculto');
  const eqContainer = document.getElementById('container_equipe_funcionario');
  if (eqContainer) eqContainer.classList.add('oculto');
}

async function salvar_novo_funcionario() {
  if (salvando) return;

  const form = document.getElementById('form_cadastro_funcionario');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';

  const nome = document.getElementById('novo_nome_funcionario').value;
  const numero_funcional = document.getElementById('novo_numero_funcional_funcionario').value;
  const cargoSelecionado = document.getElementById('novo_cargo_funcionario').value;
  const classificacao = document.getElementById('novo_classificacao_funcionario').value;
  const registro = document.getElementById('novo_registro_funcionario').value;
  const especializacao = document.getElementById('nova_especializacao_funcionario').value;
  const unidadeId = document.getElementById('novo_unidade_funcionario').value || null;
  const equipeId = document.getElementById('novo_equipe_funcionario').value || null;

  try {
    salvando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Salvando...';
    }

    const { error } = await window._supabase.from('funcionarios').insert([{
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
      await carregar_funcionarios();
    }
  } finally {
    salvando = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;
    }
  }
}

async function salvar_edicao_funcionario() {
  if (!funcionario_atual || salvando) return;

  const form = document.getElementById('form_edicao_funcionario');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';

  const nome = document.getElementById('edit_nome_funcionario').value;
  const numero_funcional = document.getElementById('edit_numero_funcional_funcionario').value;
  const cargoSelecionado = document.getElementById('edit_cargo_funcionario').value;
  const classificacao = document.getElementById('edit_classificacao_funcionario').value;
  const registro = document.getElementById('edit_registro_funcionario').value;
  const especializacao = document.getElementById('edit_especializacao_funcionario').value;
  const unidadeId = document.getElementById('edit_unidade_funcionario').value || null;
  const equipeId = document.getElementById('edit_equipe_funcionario').value || null;

  try {
    salvando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Salvando...';
    }

    const { error } = await window._supabase
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
      await carregar_funcionarios();
    }
  } finally {
    salvando = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;
    }
  }
}

async function excluir_funcionario() {
  if (!funcionario_atual) return;
  if (!confirm(`Tem certeza que deseja excluir o funcionário "${funcionario_atual.nome}"?`)) return;

  const { error } = await window._supabase
    .from('funcionarios')
    .delete()
    .eq('id', funcionario_atual.id);

  if (error) {
    alert('Erro ao excluir funcionário: ' + error.message);
  } else {
    fechar_modal_detalhes();
    await carregar_funcionarios();
  }
}

// ==========================================
// LÓGICA DE IMPORTAÇÃO & EXPORTAÇÃO XLSX
// ==========================================
function abrir_modal_importacao() {
  const modal = document.getElementById('modal_importacao_funcionarios');
  if (modal) modal.classList.remove('oculto');
  const arqInput = document.getElementById('arquivo_excel_input');
  if (arqInput) arqInput.value = '';
  const contRes = document.getElementById('container_resultado_importacao');
  if (contRes) contRes.classList.add('oculto');
  const btnConf = document.getElementById('btn_confirmar_importacao');
  if (btnConf) btnConf.setAttribute('disabled', 'true');
  dados_prontos_para_importar = null;
  unidades_novas_para_criar = [];
}

function fechar_modal_importacao() {
  const modal = document.getElementById('modal_importacao_funcionarios');
  if (modal) modal.classList.add('oculto');
  dados_prontos_para_importar = null;
  unidades_novas_para_criar = [];
}

async function processar_arquivo_selecionado(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  if (typeof XLSX === 'undefined') {
    alert('Biblioteca XLSX (SheetJS) não carregada.');
    return;
  }

  const leitor = new FileReader();
  leitor.onload = async function (e) {
    try {
      const dados_binarios = new Uint8Array(e.target.result);
      const workbook = XLSX.read(dados_binarios, { type: 'array' });
      const primeira_aba = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[primeira_aba];
      const linhas_brutas = XLSX.utils.sheet_to_json(worksheet);

      if (linhas_brutas.length === 0) {
        alert('O arquivo Excel está vazio.');
        return;
      }

      await validar_e_mapear_linhas(linhas_brutas);
    } catch (erro) {
      console.error('Erro ao ler arquivo Excel:', erro);
      alert('Erro ao processar o arquivo. Certifique-se de que é um Excel válido.');
    }
  };
  leitor.readAsArrayBuffer(arquivo);
}

async function validar_e_mapear_linhas(linhas_brutas) {
  const containerResultado = document.getElementById('container_resultado_importacao');
  const textoStatus = document.getElementById('status_importacao_texto');
  const listaErros = document.getElementById('lista_erros_importacao');
  const btnConfirmar = document.getElementById('btn_confirmar_importacao');

  containerResultado.classList.remove('oculto');
  listaErros.innerHTML = '';
  textoStatus.innerText = 'Analisando colunas, criando unidades e cruzando dados...';

  const { data: lista_unidades } = await window._supabase.from('unidades').select('id, nome');
  const { data: lista_equipes } = await window._supabase.from('equipes').select('id, nome, unidade_id');

  const mapa_unidades = new Map((lista_unidades || []).map(u => [u.nome.toLowerCase().trim(), u.id]));
  const mapa_equipes = new Map((lista_equipes || []).map(eq => [eq.nome.toLowerCase().trim(), eq]));

  const registros_validos = [];
  const erros = [];
  const novas_unidades_nomes_originais = new Map();

  const obter_valor_por_chaves = (obj, chaves_possiveis) => {
    const chave_encontrada = Object.keys(obj).find(k => 
      chaves_possiveis.some(c => k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(c))
    );
    return chave_encontrada ? String(obj[chave_encontrada]).trim() : '';
  };

  linhas_brutas.forEach((linha, indice) => {
    const num_linha = indice + 2;

    const nf = obter_valor_por_chaves(linha, ['numero_funcional', 'nf', 'matricula', 'funcional']);
    const nome = obter_valor_por_chaves(linha, ['nome_completo', 'nome']);
    const cargo = obter_valor_por_chaves(linha, ['cargo']);
    const classificacao = obter_valor_por_chaves(linha, ['classificacao_funcional', 'classificacao', 'regime']);
    const registro = obter_valor_por_chaves(linha, ['registro_profissional', 'crm', 'coren', 'cro']);
    const especializacao = obter_valor_por_chaves(linha, ['especializacao']);
    const nome_unidade_original = obter_valor_por_chaves(linha, ['unidade']);
    const nome_unidade_key = nome_unidade_original.toLowerCase();
    const nome_equipe_key = obter_valor_por_chaves(linha, ['equipe']).toLowerCase();

    if (!nf) {
      erros.push(`Linha ${num_linha}: O Número Funcional (NF) é obrigatório.`);
      return;
    }
    if (!nome) {
      erros.push(`Linha ${num_linha}: O Nome completo é obrigatório.`);
      return;
    }
    if (!cargo) {
      erros.push(`Linha ${num_linha}: O Cargo é obrigatório.`);
      return;
    }

    let equipe_id = null;
    if (nome_equipe_key) {
      const equipe_encontrada = mapa_equipes.get(nome_equipe_key);
      if (!equipe_encontrada) {
        erros.push(`Linha ${num_linha}: A equipe "${linha.equipe || linha.Equipe}" não está cadastrada no sistema.`);
        return;
      }
      equipe_id = equipe_encontrada.id;
    }

    if (nome_unidade_key && !mapa_unidades.has(nome_unidade_key)) {
      novas_unidades_nomes_originais.set(nome_unidade_key, nome_unidade_original);
    }

    registros_validos.push({
      numero_funcional: nf,
      nome,
      cargo,
      regime: classificacao || null,
      registro_profissional: registro || null,
      especializacao: especializacao || null,
      nome_unidade_temp: nome_unidade_key || null,
      equipe_id
    });
  });

  if (erros.length > 0) {
    textoStatus.innerText = `Foram encontrados ${erros.length} erro(s). Corrija a planilha para continuar:`;
    listaErros.innerHTML = erros.map(e => `<li>${window.sanitizar_texto(e)}</li>`).join('');
    btnConfirmar.setAttribute('disabled', 'true');
    return;
  }

  dados_prontos_para_importar = {
    registros: registros_validos,
    mapa_unidades_existentes: mapa_unidades
  };

  unidades_novas_para_criar = Array.from(novas_unidades_nomes_originais.values()).map(nome => ({ nome }));

  let mensagem_sucesso = `✓ ${registros_validos.length} funcionário(s) pronto(s) para importação.`;
  if (unidades_novas_para_criar.length > 0) {
    mensagem_sucesso += `\n✦ ${unidades_novas_para_criar.length} nova(s) unidade(s) identificada(s) e será(ão) criada(s) automaticamente!`;
  }

  textoStatus.innerText = mensagem_sucesso;
  textoStatus.style.color = '#15803d';
  btnConfirmar.removeAttribute('disabled');
}

async function confirmar_importacao_banco() {
  if (!dados_prontos_para_importar || !dados_prontos_para_importar.registros) return;

  const btnConfirmar = document.getElementById('btn_confirmar_importacao');
  if (btnConfirmar) {
    btnConfirmar.setAttribute('disabled', 'true');
    btnConfirmar.innerText = 'Importando, aguarde...';
  }

  const mapa_unidades = dados_prontos_para_importar.mapa_unidades_existentes;

  if (unidades_novas_para_criar.length > 0) {
    const { data: novas_unidades_criadas, error: errCriarUnidades } = await window._supabase
      .from('unidades')
      .insert(unidades_novas_para_criar)
      .select('id, nome');

    if (errCriarUnidades) {
      alert('Erro ao criar novas unidades: ' + errCriarUnidades.message);
      if (btnConfirmar) {
        btnConfirmar.removeAttribute('disabled');
        btnConfirmar.innerText = 'Gravar no Sistema';
      }
      return;
    }

    novas_unidades_criadas.forEach(u => {
      mapa_unidades.set(u.nome.toLowerCase().trim(), u.id);
    });
  }

  const registros_finais = dados_prontos_para_importar.registros.map(f => {
    const unidade_id = f.nome_unidade_temp ? (mapa_unidades.get(f.nome_unidade_temp) || null) : null;
    return {
      numero_funcional: f.numero_funcional,
      nome: f.nome,
      cargo: f.cargo,
      regime: f.regime,
      registro_profissional: f.registro_profissional,
      especializacao: f.especializacao,
      unidade_id: unidade_id,
      equipe_id: f.equipe_id
    };
  });

  const { error: errInsertFuncs } = await window._supabase.from('funcionarios').insert(registros_finais);

  if (errInsertFuncs) {
    alert('Erro ao gravar funcionários no banco: ' + errInsertFuncs.message);
    if (btnConfirmar) {
      btnConfirmar.removeAttribute('disabled');
      btnConfirmar.innerText = 'Gravar no Sistema';
    }
  } else {
    alert('Funcionários e unidades importados com sucesso!');
    fechar_modal_importacao();
    await carregar_funcionarios();
  }
}

async function exportar_funcionarios_excel() {
  if (typeof XLSX === 'undefined') {
    alert('Biblioteca XLSX não disponível.');
    return;
  }

  const { data: funcionarios, error } = await window._supabase
    .from('funcionarios')
    .select('*, unidades(nome), equipes(nome, unidades(nome))')
    .order('nome', { ascending: true });

  if (error) {
    alert('Erro ao buscar dados para exportação: ' + error.message);
    return;
  }

  if (!funcionarios || funcionarios.length === 0) {
    alert('Não há funcionários cadastrados para exportar.');
    return;
  }

  const dados_planilha = funcionarios.map(f => ({
    "Número Funcional": f.numero_funcional || '',
    "Nome Completo": f.nome || '',
    "Cargo": f.cargo || '',
    "Classificação Funcional": f.regime || '',
    "Registro Profissional": f.registro_profissional || '',
    "Especialização": f.especializacao || '',
    "Equipe": f.equipes?.nome || 'Sem equipe',
    "Unidade": f.unidades?.nome || f.equipes?.unidades?.nome || 'Sem unidade'
  }));

  const worksheet = XLSX.utils.json_to_sheet(dados_planilha);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");

  XLSX.writeFile(workbook, "lista_funcionarios.xlsx");
}
