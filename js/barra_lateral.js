function renderizar_barra_lateral() {
  const pagina_atual = window.location.pathname.split('/').pop() || 'unidades.html';
  const e_pagina_funcionarios = pagina_atual === 'funcionarios.html' || 
                                pagina_atual === 'folgas_abonos.html' || 
                                pagina_atual === 'gerenciar_usuarios.html';
  
  // Obtém o role salvo no sessionStorage (padrão: funcionario)
  const role_usuario = sessionStorage.getItem('usuario_role') || 'funcionario';
  const e_admin = role_usuario === 'admin';

  const html_barra_lateral = `
    <aside class="barra-lateral" id="barra_lateral_container">
      <div class="conteudo-barra-lateral">
        <div class="cabecalho-barra-lateral">
          <h2 class="titulo-sistema">GME</h2>
          <button 
            type="button" 
            id="btn_alternar_barra" 
            class="btn-recolher-sidebar" 
            onclick="alternar_barra_lateral()" 
            title="Recolher barra lateral"
          >
            <span id="icone_seta_barra">◀</span>
          </button>
        </div>
        
        <nav class="navegacao-barra-lateral">
          <!-- UNIDADES (LIBERADO PARA TODOS) -->
          <a href="unidades.html" class="link-navegacao ${pagina_atual === 'unidades.html' || pagina_atual === 'unidade_detalhes.html' ? 'ativo' : ''}" title="Unidades">
            <span class="icone-menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </span>
            <span class="texto-menu">Unidades</span>
          </a>

          <!-- EQUIPES (LIBERADO PARA TODOS) -->
          <a href="equipes.html" class="link-navegacao ${pagina_atual === 'equipes.html' || pagina_atual === 'equipe_detalhes.html' ? 'ativo' : ''}" title="Equipes">
            <span class="icone-menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </span>
            <span class="texto-menu">Equipes</span>
          </a>

          <!-- DROPDOWN FUNCIONÁRIOS -->
          <div class="item-dropdown ${e_pagina_funcionarios ? 'aberto' : ''}" id="container_dropdown_funcionarios">
            <div class="link-navegacao btn-dropdown-toggle ${e_pagina_funcionarios ? 'ativo' : ''}" onclick="alternar_dropdown_funcionarios()" title="Funcionários">
              <span class="icone-menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <span class="texto-menu">Funcionários</span>
              <span class="icone-seta">▼</span>
            </div>
            
            <div class="menu-subitens ${e_pagina_funcionarios ? '' : 'oculto'}" id="subitens_funcionarios">
              <!-- LISTA DE FUNCIONÁRIOS (LIBERADO PARA TODOS) -->
              <a href="funcionarios.html" class="sublink-navegacao ${pagina_atual === 'funcionarios.html' ? 'ativo' : ''}" title="Lista de funcionários">
                <span class="icone-menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </span>
                <span class="texto-menu">Lista de funcionários</span>
              </a>
              
              <!-- FOLGAS E ABONOS (LIBERADO PARA TODOS) -->
              <a href="folgas_abonos.html" class="sublink-navegacao ${pagina_atual === 'folgas_abonos.html' ? 'ativo' : ''}" title="Folgas, abonos e atestados">
                <span class="icone-menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </span>
                <span class="texto-menu">Folgas, abonos e atestados</span>
              </a>

              ${e_admin ? `
                <!-- GERENCIAR USUÁRIOS (EXCLUSIVO ADMIN) -->
                <a href="gerenciar_usuarios.html" class="sublink-navegacao ${pagina_atual === 'gerenciar_usuarios.html' ? 'ativo' : ''}" title="Gerenciar usuários">
                  <span class="icone-menu">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
                  </span>
                  <span class="texto-menu">Gerenciar usuários</span>
                </a>
              ` : ''}
            </div>
          </div>
        </nav>
      </div>

      <!-- BOTÃO SAIR -->
      <button type="button" class="btn-sair" onclick="fazer_logout()" title="Sair">
        <span class="icone-menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </span>
        <span class="texto-menu">Sair</span>
      </button>
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
  if (document.body.classList.contains('barra-recolhida')) {
    alternar_barra_lateral();
  }

  const container = document.getElementById('container_dropdown_funcionarios');
  const subitens = document.getElementById('subitens_funcionarios');

  if (container && subitens) {
    container.classList.toggle('aberto');
    subitens.classList.toggle('oculto');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof obter_usuario_logado === 'function') {
    await obter_usuario_logado();
  }
  renderizar_barra_lateral();
});

document.addEventListener('spa_tela_carregada', (e) => {
  const url = e.detail || '';
  const nome_arquivo = url.split('/').pop().split('?')[0];
  const e_pagina_funcionarios = nome_arquivo === 'funcionarios.html' || 
                                nome_arquivo === 'folgas_abonos.html' || 
                                nome_arquivo === 'gerenciar_usuarios.html';
  const container = document.getElementById('container_dropdown_funcionarios');
  const subitens = document.getElementById('subitens_funcionarios');
  if (container && subitens && e_pagina_funcionarios) {
    container.classList.add('aberto');
    subitens.classList.remove('oculto');
  }
});
