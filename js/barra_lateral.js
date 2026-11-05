function renderizar_barra_lateral() {
  const pagina_atual = window.location.pathname.split('/').pop() || 'unidades.html';
  const e_pagina_funcionarios = pagina_atual === 'funcionarios.html' || pagina_atual === 'folgas_abonos.html';

  const html_barra_lateral = `
    <!-- BOTÃO FIXO FORA DO CONTAINER TRANSFORMADO -->
    <button 
      type="button" 
      id="btn_alternar_barra" 
      class="btn-alternar-barra" 
      onclick="alternar_barra_lateral()" 
      title="Recolher barra lateral"
    >
      <span id="icone_seta_barra">◀</span>
    </button>

    <aside class="barra-lateral" id="barra_lateral_container">
      <div class="conteudo-barra-lateral">
        <div class="cabecalho-barra-lateral">
          <h2 class="titulo-sistema">Sistema</h2>
        </div>
        
        <nav class="navegacao-barra-lateral">
          <a href="unidades.html" class="link-navegacao ${pagina_atual === 'unidades.html' || pagina_atual === 'unidade_detalhes.html' ? 'ativo' : ''}">
            Unidades
          </a>

          <a href="equipes.html" class="link-navegacao ${pagina_atual === 'equipes.html' || pagina_atual === 'equipe_detalhes.html' ? 'ativo' : ''}">
            Equipes
          </a>

          <!-- DROPDOWN FUNCIONÁRIOS -->
          <div class="item-dropdown ${e_pagina_funcionarios ? 'aberto' : ''}" id="container_dropdown_funcionarios">
            <div class="link-navegacao btn-dropdown-toggle ${e_pagina_funcionarios ? 'ativo' : ''}" onclick="alternar_dropdown_funcionarios()">
              <span>Funcionários</span>
              <span class="icone-seta">▼</span>
            </div>
            
            <div class="menu-subitens ${e_pagina_funcionarios ? '' : 'oculto'}" id="subitens_funcionarios">
              <a href="funcionarios.html" class="sublink-navegacao ${pagina_atual === 'funcionarios.html' ? 'ativo' : ''}">
                Lista de funcionários
              </a>
              <a href="folgas_abonos.html" class="sublink-navegacao ${pagina_atual === 'folgas_abonos.html' ? 'ativo' : ''}">
                Folgas, abonos e atestados
              </a>
            </div>
          </div>
        </nav>
      </div>

      <button type="button" class="btn-sair" onclick="fazer_logout()">Sair</button>
    </aside>
  `;

  if (!document.querySelector('.barra-lateral')) {
    document.body.insertAdjacentHTML('afterbegin', html_barra_lateral);
  }

  const esta_recolhida = localStorage.getItem('barra_recolhida') === 'true';
  if (esta_recolhida) {
    aplicar_estado_barra(true);
  }
}

function alternar_barra_lateral() {
  const esta_recolhida = document.body.classList.contains('barra-recolhida');
  const novo_estado = !esta_recolhida;

  aplicar_estado_barra(novo_estado);
  localStorage.setItem('barra_recolhida', novo_estado.toString());
}

function aplicar_estado_barra(recolher) {
  const btn = document.getElementById('btn_alternar_barra');
  const icone = document.getElementById('icone_seta_barra');

  if (recolher) {
    document.body.classList.add('barra-recolhida');
    if (icone) icone.innerText = '▶';
    if (btn) btn.title = 'Expandir barra lateral';
  } else {
    document.body.classList.remove('barra-recolhida');
    if (icone) icone.innerText = '◀';
    if (btn) btn.title = 'Recolher barra lateral';
  }
}

function alternar_dropdown_funcionarios() {
  const container = document.getElementById('container_dropdown_funcionarios');
  const subitens = document.getElementById('subitens_funcionarios');

  if (container && subitens) {
    container.classList.toggle('aberto');
    subitens.classList.toggle('oculto');
  }
}

async function fazer_logout() {
  if (typeof _supabase !== 'undefined') {
    await _supabase.auth.signOut();
  }
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  renderizar_barra_lateral();
});