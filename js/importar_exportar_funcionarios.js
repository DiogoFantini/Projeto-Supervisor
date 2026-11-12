var dados_prontos_para_importar = [];
var unidades_novas_para_criar = [];

function abrir_modal_importacao() {
  const modal = document.getElementById('modal_importacao_funcionarios');
  if (modal) modal.classList.remove('oculto');
  const arqInput = document.getElementById('arquivo_excel_input');
  if (arqInput) arqInput.value = '';
  const contRes = document.getElementById('container_resultado_importacao');
  if (contRes) contRes.classList.add('oculto');
  const btnConf = document.getElementById('btn_confirmar_importacao');
  if (btnConf) btnConf.setAttribute('disabled', 'true');
  dados_prontos_para_importar = [];
  unidades_novas_para_criar = [];
}

function fechar_modal_importacao() {
  const modal = document.getElementById('modal_importacao_funcionarios');
  if (modal) modal.classList.add('oculto');
  dados_prontos_para_importar = [];
  unidades_novas_para_criar = [];
}

// ==========================================
// LÓGICA DE IMPORTAÇÃO E CRIAÇÃO AUTOMÁTICA DE UNIDADES
// ==========================================
async function processar_arquivo_selecionado(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

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

  // 1. Busca unidades e equipes existentes no Supabase
  const { data: lista_unidades } = await _supabase.from('unidades').select('id, nome');
  const { data: lista_equipes } = await _supabase.from('equipes').select('id, nome, unidade_id');

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

    // Validações obrigatórias
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

    // Regras de validação de equipe
    let equipe_id = null;
    if (nome_equipe_key) {
      const equipe_encontrada = mapa_equipes.get(nome_equipe_key);
      if (!equipe_encontrada) {
        erros.push(`Linha ${num_linha}: A equipe "${linha.equipe || linha.Equipe}" não está cadastrada no sistema.`);
        return;
      }
      equipe_id = equipe_encontrada.id;
    }

    // Identifica se a unidade precisa ser criada
    if (nome_unidade_key && !mapa_unidades.has(nome_unidade_key)) {
      novas_unidades_nomes_originais.set(nome_unidade_key, nome_unidade_original);
    }

    registros_validos.push({
      numero_funcional: nf,
      nome: nome,
      cargo: cargo,
      regime: classificacao || null,
      registro_profissional: registro || null,
      especializacao: especializacao || null,
      nome_unidade_temp: nome_unidade_key || null,
      equipe_id: equipe_id
    });
  });

  if (erros.length > 0) {
    textoStatus.innerText = `Foram encontrados ${erros.length} erro(s). Corrija a planilha para continuar:`;
    erros.forEach(erro => {
      const li = document.createElement('li');
      li.innerText = erro;
      listaErros.appendChild(li);
    });
    btnConfirmar.setAttribute('disabled', 'true');
    return;
  }

  // Prepara estado para confirmação
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
  btnConfirmar.setAttribute('disabled', 'true');
  btnConfirmar.innerText = 'Importando, aguarde...';

  const mapa_unidades = dados_prontos_para_importar.mapa_unidades_existentes;

  // 1. Cria novas unidades detectadas no Supabase
  if (unidades_novas_para_criar.length > 0) {
    const { data: novas_unidades_criadas, error: errCriarUnidades } = await _supabase
      .from('unidades')
      .insert(unidades_novas_para_criar)
      .select('id, nome');

    if (errCriarUnidades) {
      alert('Erro ao criar novas unidades: ' + errCriarUnidades.message);
      btnConfirmar.removeAttribute('disabled');
      btnConfirmar.innerText = 'Gravar no Sistema';
      return;
    }

    novas_unidades_criadas.forEach(u => {
      mapa_unidades.set(u.nome.toLowerCase().trim(), u.id);
    });
  }

  // 2. Mapeia os funcionários aos IDs das unidades
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

  // 3. Insere todos os funcionários no Supabase
  const { error: errInsertFuncs } = await _supabase.from('funcionarios').insert(registros_finais);

  if (errInsertFuncs) {
    alert('Erro ao gravar funcionários no banco: ' + errInsertFuncs.message);
    btnConfirmar.removeAttribute('disabled');
    btnConfirmar.innerText = 'Gravar no Sistema';
  } else {
    alert('Funcionários e unidades importados com sucesso!');
    fechar_modal_importacao();
    if (typeof carregar_funcionarios === 'function') {
      carregar_funcionarios();
    }
  }
}

// ==========================================
// LÓGICA DE EXPORTAÇÃO
// ==========================================
async function exportar_funcionarios_excel() {
  const { data: funcionarios, error } = await _supabase
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

function iniciar_tela_importar_exportar_funcionarios() {
  dados_prontos_para_importar = [];
  unidades_novas_para_criar = [];

  if (!window.listenersModalImportacaoInjetados) {
    window.listenersModalImportacaoInjetados = true;
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('modal_importacao_funcionarios');
      if (modal && event.target === modal) fechar_modal_importacao();
    });
  }
}

// 1. Gatilho F5 / Acesso direto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('modal_importacao_funcionarios')) {
    iniciar_tela_importar_exportar_funcionarios();
  }
});

// 2. Gatilho Navegação SPA
document.addEventListener('spa_tela_carregada', (e) => {
  const url_carregada = e.detail;
  if (url_carregada.includes('funcionarios.html')) {
    iniciar_tela_importar_exportar_funcionarios();
  }
});
