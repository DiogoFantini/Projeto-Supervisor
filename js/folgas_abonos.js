var lista_ausencias_todas = [];
var lista_funcionarios_ausencia = [];
var data_atual_calendario = new Date();
var ausencia_selecionada = null;

async function carregar_ausencias() {
  const { data, error } = await _supabase
    .from('ausencias')
    .select('*, funcionarios(id, nome, cargo, equipe_id, equipes(id, nome, unidade_id, unidades(id, nome)))')
    .order('data_inicio', { ascending: true });

  if (error) {
    console.error('Erro ao carregar ausências:', error);
    return;
  }

  lista_ausencias_todas = data || [];
  renderizar_calendario();
}

async function carregar_unidades_filtro() {
  const selectUnidade = document.getElementById('filtro_unidade_ausencia');
  if (!selectUnidade) return;

  const { data: unidades, error } = await _supabase
    .from('unidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar unidades para filtro:', error);
    return;
  }

  selectUnidade.innerHTML = '<option value="">Todas as unidades</option>';
  (unidades || []).forEach(u => {
    const nome_seguro = sanitizar_texto(u.nome);
    selectUnidade.innerHTML += `<option value="${u.id}">${nome_seguro}</option>`;
  });
}

async function ao_mudar_unidade_filtro() {
  await carregar_equipes_filtro();
  filtrar_ausencias();
}

async function carregar_equipes_filtro() {
  const selectUnidade = document.getElementById('filtro_unidade_ausencia');
  const selectEquipe = document.getElementById('filtro_equipe_ausencia');
  if (!selectUnidade || !selectEquipe) return;

  const unidadeId = selectUnidade.value;

  if (!unidadeId) {
    selectEquipe.value = '';
    selectEquipe.classList.add('oculto');
    selectEquipe.innerHTML = '<option value="">Todas as equipes</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  selectEquipe.classList.remove('oculto');

  const { data: equipes, error } = await _supabase
    .from('equipes')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar equipes para filtro:', error);
    selectEquipe.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    return;
  }

  selectEquipe.innerHTML = '<option value="">Todas as equipes</option>';
  if (!equipes || equipes.length === 0) {
    selectEquipe.innerHTML = '<option value="">Nenhuma equipe cadastrada nesta unidade</option>';
  } else {
    equipes.forEach(eq => {
      const nome_seguro = sanitizar_texto(eq.nome);
      selectEquipe.innerHTML += `<option value="${eq.id}">${nome_seguro}</option>`;
    });
  }
}

function mudar_mes(delta) {
  data_atual_calendario.setMonth(data_atual_calendario.getMonth() + delta);
  renderizar_calendario();
}

function ir_para_hoje() {
  data_atual_calendario = new Date();
  renderizar_calendario();
}

function obter_classe_cor_tipo(tipo) {
  if (!tipo) return 'outro';
  const t = tipo.toLowerCase();
  if (t.includes('férias') || t.includes('ferias')) return 'ferias';
  if (t.includes('atestado')) return 'atestado';
  if (t.includes('abono')) return 'abono';
  if (t.includes('folga')) return 'folga';
  if (t.includes('licença') || t.includes('licenca')) return 'licenca';
  return 'outro';
}

function formatar_data_iso(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatar_data_br(data_iso) {
  if (!data_iso) return '-';
  const partes = data_iso.split('-');
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function filtrar_ausencias() {
  renderizar_calendario();
}

function renderizar_calendario() {
  const containerGrade = document.getElementById('grade_dias_mes');
  const tituloMesAno = document.getElementById('titulo_mes_ano');
  if (!containerGrade || !tituloMesAno) return;

  const ano = data_atual_calendario.getFullYear();
  const mes = data_atual_calendario.getMonth();

  const primeiroDiaMes = new Date(ano, mes, 1);
  const ultimoDiaMes = new Date(ano, mes + 1, 0);

  const nomeMes = data_atual_calendario.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  tituloMesAno.innerText = nomeMes;

  containerGrade.innerHTML = '';

  const diaSemanaInicial = primeiroDiaMes.getDay();
  const totalDiasMes = ultimoDiaMes.getDate();

  const termoBusca = (document.getElementById('campo_busca_ausencia')?.value || '').toLowerCase().trim();
  const filtroTipo = document.getElementById('filtro_tipo_ausencia')?.value || '';
  const filtroUnidade = document.getElementById('filtro_unidade_ausencia')?.value || '';
  const filtroEquipe = document.getElementById('filtro_equipe_ausencia')?.value || '';

  const ausenciasFiltradas = lista_ausencias_todas.filter(a => {
    const nome = a.funcionarios?.nome ? a.funcionarios.nome.toLowerCase() : '';
    const bateNome = nome.includes(termoBusca);
    const bateTipo = filtroTipo === '' || a.tipo_ausencia === filtroTipo;

    const unidadeIdFunc = a.funcionarios?.equipes?.unidade_id || a.funcionarios?.equipes?.unidades?.id;
    const bateUnidade = filtroUnidade === '' || unidadeIdFunc === filtroUnidade;

    const equipeIdFunc = a.funcionarios?.equipe_id || a.funcionarios?.equipes?.id;
    const bateEquipe = filtroEquipe === '' || equipeIdFunc === filtroEquipe;

    return bateNome && bateTipo && bateUnidade && bateEquipe;
  });

  const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
  for (let i = diaSemanaInicial - 1; i >= 0; i--) {
    const diaNum = ultimoDiaMesAnterior - i;
    containerGrade.innerHTML += `<div class="celula-dia outro-mes"><span class="numero-dia">${diaNum}</span></div>`;
  }

  const hojeStr = formatar_data_iso(new Date());

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const dataAtual = new Date(ano, mes, dia);
    const dataIso = formatar_data_iso(dataAtual);
    const eHoje = dataIso === hojeStr ? 'hoje' : '';

    let barrasHtml = '';

    ausenciasFiltradas.forEach(ausencia => {
      if (dataIso >= ausencia.data_inicio && dataIso <= ausencia.data_fim) {
        const classeCor = obter_classe_cor_tipo(ausencia.tipo_ausencia);

        const eInicio = dataIso === ausencia.data_inicio ? 'inicio' : '';
        const eFim = dataIso === ausencia.data_fim ? 'fim' : '';
        const eMeio = (!eInicio && !eFim) ? 'meio' : '';

        const nomeFuncionario = sanitizar_texto(ausencia.funcionarios?.nome || 'Funcionário');
        const tipoAusenciaSeguro = sanitizar_texto(ausencia.tipo_ausencia);
        const textoExibicao = (eInicio || dia === 1 || dataAtual.getDay() === 0) 
          ? `${nomeFuncionario} (${tipoAusenciaSeguro})` 
          : '&nbsp;';

        barrasHtml += `
          <div 
            class="barra-ausencia ${classeCor} ${eInicio} ${eFim} ${eMeio}" 
            onclick='abrir_modal_detalhes_ausencia(${JSON.stringify(ausencia)})'
            title="${nomeFuncionario} - ${tipoAusenciaSeguro} (${formatar_data_br(ausencia.data_inicio)} até ${formatar_data_br(ausencia.data_fim)})"
          >
            ${textoExibicao}
          </div>
        `;
      }
    });

    containerGrade.innerHTML += `
      <div class="celula-dia ${eHoje}">
        <span class="numero-dia">${dia}</span>
        ${barrasHtml}
      </div>
    `;
  }

  const totalCelulasExibidas = diaSemanaInicial + totalDiasMes;
  const celulasRestantes = (7 - (totalCelulasExibidas % 7)) % 7;
  for (let i = 1; i <= celulasRestantes; i++) {
    containerGrade.innerHTML += `<div class="celula-dia outro-mes"><span class="numero-dia">${i}</span></div>`;
  }
}

function abrir_modal_detalhes_ausencia(ausencia) {
  ausencia_selecionada = ausencia;

  const dInicio = new Date(ausencia.data_inicio);
  const dFim = new Date(ausencia.data_fim);
  const dias = Math.ceil((dFim - dInicio) / (1000 * 60 * 60 * 24)) + 1;

  document.getElementById('detalhe_funcionario').innerText = ausencia.funcionarios?.nome || '-';
  document.getElementById('detalhe_tipo').innerText = ausencia.tipo_ausencia || '-';
  document.getElementById('detalhe_periodo').innerText = `${formatar_data_br(ausencia.data_inicio)} até ${formatar_data_br(ausencia.data_fim)}`;
  document.getElementById('detalhe_duracao').innerText = `${dias} dia(s)`;
  document.getElementById('detalhe_motivo').innerText = ausencia.motivo_observacao || 'Sem observações.';

  const modal = document.getElementById('modal_detalhes_ausencia');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_detalhes_ausencia() {
  const modal = document.getElementById('modal_detalhes_ausencia');
  if (modal) modal.classList.add('oculto');
  ausencia_selecionada = null;
}

async function excluir_ausencia_atual() {
  if (!ausencia_selecionada) return;

  const nomeFunc = ausencia_selecionada.funcionarios?.nome || 'o funcionário';
  if (!confirm(`Tem certeza que deseja excluir o registro de ausência de ${nomeFunc}?`)) return;

  const { error } = await _supabase
    .from('ausencias')
    .delete()
    .eq('id', ausencia_selecionada.id);

  if (error) {
    alert('Erro ao excluir registro: ' + error.message);
  } else {
    fechar_modal_detalhes_ausencia();
    carregar_ausencias();
  }
}

async function abrir_modal_registrar_ausencia() {
  const modal = document.getElementById('modal_cadastro_ausencia');
  if (modal) modal.classList.remove('oculto');
  await carregar_select_funcionarios();
}

function fechar_modal_registrar_ausencia() {
  const modal = document.getElementById('modal_cadastro_ausencia');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_ausencia');
  if (form) form.reset();
}

async function carregar_select_funcionarios() {
  const select = document.getElementById('select_funcionario_ausencia');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando funcionários...</option>';

  const { data: funcionarios, error } = await _supabase
    .from('funcionarios')
    .select('id, nome, cargo')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar funcionários:', error);
    select.innerHTML = '<option value="">Erro ao carregar funcionários</option>';
    return;
  }

  lista_funcionarios_ausencia = funcionarios || [];
  select.innerHTML = '<option value="">-- Selecione o funcionário --</option>';

  lista_funcionarios_ausencia.forEach(f => {
    const nome_seguro = sanitizar_texto(f.nome);
    const cargo_seguro = sanitizar_texto(f.cargo || 'Sem cargo');
    select.innerHTML += `<option value="${f.id}">${nome_seguro} (${cargo_seguro})</option>`;
  });
}

function validar_intervalo_datas() {
  const inicio = document.getElementById('data_inicio_ausencia').value;
  const fim = document.getElementById('data_fim_ausencia').value;

  if (inicio && fim && new Date(fim) < new Date(inicio)) {
    alert('A data de término não pode ser anterior à data de início.');
    document.getElementById('data_fim_ausencia').value = inicio;
  }
}

async function iniciar_tela_folgas_abonos() {
  ausencia_selecionada = null;
  await carregar_unidades_filtro();
  carregar_ausencias();

  const form = document.getElementById('form_cadastro_ausencia');
  if (form && !form.dataset.eventoRegistrado) {
    form.dataset.eventoRegistrado = "true";
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const funcionario_id = document.getElementById('select_funcionario_ausencia').value;
      const tipo_ausencia = document.getElementById('tipo_ausencia').value;
      const data_inicio = document.getElementById('data_inicio_ausencia').value;
      const data_fim = document.getElementById('data_fim_ausencia').value;
      const motivo_observacao = document.getElementById('motivo_observacao_ausencia').value;

      const { error } = await _supabase.from('ausencias').insert([{
        funcionario_id,
        tipo_ausencia,
        data_inicio,
        data_fim,
        motivo_observacao: motivo_observacao || null
      }]);

      if (error) {
        alert('Erro ao registrar ausência: ' + error.message);
      } else {
        fechar_modal_registrar_ausencia();
        carregar_ausencias();
      }
    });
  }

  if (!window.listenersModalFolgasAbonosInjetados) {
    window.listenersModalFolgasAbonosInjetados = true;
    window.addEventListener('click', (event) => {
      const modal_cadastro = document.getElementById('modal_cadastro_ausencia');
      const modal_detalhes = document.getElementById('modal_detalhes_ausencia');
      if (modal_cadastro && event.target === modal_cadastro) fechar_modal_registrar_ausencia();
      if (modal_detalhes && event.target === modal_detalhes) fechar_modal_detalhes_ausencia();
    });
  }
}

// 1. Gatilho F5 / Acesso direto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('grade_dias_mes')) {
    iniciar_tela_folgas_abonos();
  }
});

// 2. Gatilho Navegação SPA
document.addEventListener('spa_tela_carregada', (e) => {
  const url_carregada = e.detail;
  if (url_carregada.includes('folgas_abonos.html')) {
    iniciar_tela_folgas_abonos();
  }
});
