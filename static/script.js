// Adiciona um único "ouvinte" que espera a página carregar completamente.
document.addEventListener("DOMContentLoaded", function() {

    // ======================================================
    // SEÇÃO 1: LÓGICA DO RELÓGIO
    // ======================================================
    const elementoData = document.getElementById('data');
    const elementoHora = document.getElementById('hora');

    // Só executa a lógica do relógio se os elementos existirem na página
    if (elementoData && elementoHora) {
        function atualizarRelogio() {
            const agora = new Date();
            const opcoesData = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
            
            // Formata a data e coloca a primeira letra em maiúsculo
            const dataFormatada = agora.toLocaleDateString('pt-BR', opcoesData);
            elementoData.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

            // Formata a hora para mostrar apenas Horas e Minutos (HH:MM)
            const horaFormatada = agora.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            elementoHora.textContent = horaFormatada;
        }
        
        // Inicia o relógio
        atualizarRelogio();
        setInterval(atualizarRelogio, 1000);
    }

    // ======================================================
    // SEÇÃO 2: ROTAÇÃO DE PÁGINAS (se necessário)
    // ======================================================
    const paginaAtualPath = window.location.pathname;
    console.log("--- Iniciando Script de Rotação de Página ---");
    console.log("Página atual:", paginaAtualPath);

    // Verificar se deve desabilitar rotação para páginas administrativas
    const paginasAdministrativas = ['/admin', '/login', '/adicionar_dispositivo', '/listar_dispositivos'];
    if (paginasAdministrativas.some(pagina => paginaAtualPath.startsWith(pagina))) {
        console.log("Página administrativa detectada. Rotação de página desabilitada.");
        return; // Sai da função, não faz rotação
    }

    // 1. OBTER DADOS DO PYTHON - Com fallback seguro
    let deveMostrarAviso = false;
    
    if (typeof window.SHOW_AVISO !== "undefined") {
        deveMostrarAviso = window.SHOW_AVISO;
    } else if (typeof SHOW_AVISO !== "undefined") {
        deveMostrarAviso = SHOW_AVISO;
    }
    
    console.log("Condição para mostrar a página de aviso:", deveMostrarAviso);

    // 2. MONTAR A LISTA DE PÁGINAS VÁLIDAS PARA ESTE MOMENTO
    const paginasBase = ['/', '/clima'];
    let paginasAtuais = [...paginasBase];

    if (deveMostrarAviso) {
        paginasAtuais.push('/aviso-intervalo');
    }
    console.log("Lista de páginas na rotação atual:", paginasAtuais);

    // 3. DEFINIR TEMPO DE EXIBIÇÃO
    const tempoDeExibicao = 15000; // 15 segundos

    // 4. DECIDIR QUAL SERÁ A PRÓXIMA PÁGINA
    const indexDaPaginaAtual = paginasAtuais.indexOf(paginaAtualPath);
    console.log("Índice da página atual na lista:", indexDaPaginaAtual);

    let proximaPagina;

    if (indexDaPaginaAtual !== -1) {
        const indexDaProximaPagina = (indexDaPaginaAtual + 1) % paginasAtuais.length;
        proximaPagina = paginasAtuais[indexDaProximaPagina];
        console.log("Página está no ciclo. Próxima página será:", proximaPagina);
    } else {
        proximaPagina = paginasBase[0];
        console.log("Página atual está FORA do ciclo. Voltando para a página inicial:", proximaPagina);
    }

    console.log(`Redirecionando para '${proximaPagina}' em ${tempoDeExibicao / 1000} segundos.`);

    // 5. AGENDAR O REDIRECIONAMENTO
    setTimeout(function() {
        window.location.href = proximaPagina;
    }, tempoDeExibicao);

    // =========================
    // ROTAÇÃO DE EVENTOS PAINEL
    // =========================
    if (window.eventosPainel && window.eventosPainel.length > 0) {
        // Só mostra UM evento por vez, e avança a cada vez que a página '/' é exibida
        let idx = Number(localStorage.getItem('idxEventoPainel') || 0);
        if (isNaN(idx) || idx >= window.eventosPainel.length) idx = 0;

        const midiaContainer = document.getElementById('midia-container');
        const descricaoContainer = document.getElementById('descricao-container');
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';

        function mostrarEvento(i) {
            const ev = window.eventosPainel[i];
            midiaContainer.innerHTML = '';
            descricaoContainer.innerHTML = '';
            qrcodeDiv.innerHTML = '';

            if (ev.video) {
                midiaContainer.style.background = '';
                midiaContainer.style.backgroundImage = '';
                midiaContainer.innerHTML = `<video id="bg-video" autoplay loop muted playsinline style="width:100%;height:auto;">
                    <source src="${ev.video}" type="video/mp4">
                </video>`;
            } else if (ev.imagem) {
                midiaContainer.innerHTML = '';
                midiaContainer.style.backgroundImage = `url('${ev.imagem}')`;
                midiaContainer.style.backgroundSize = 'cover';
                midiaContainer.style.backgroundPosition = 'center';
                midiaContainer.style.backgroundRepeat = 'no-repeat';
            } else {
                midiaContainer.innerHTML = '';
                midiaContainer.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                midiaContainer.style.backgroundImage = '';
            }

            if (ev.titulo !== "Conteúdo - Imagem de fundo") {
                descricaoContainer.innerHTML = `<h2>${ev.titulo || ''}</h2><p>${ev.descricao || ''}</p>`;
            } else {
                descricaoContainer.innerHTML = '';
            }

            if (ev.link) {
                qrcodeDiv.style.display = 'block';
                new QRCode(qrcodeDiv, {
                    text: ev.link,
                    width: 128,
                    height: 128
                });
            } else {
                qrcodeDiv.style.display = 'none';
            }
        }

        mostrarEvento(idx);

        // Atualiza o índice para o próximo ciclo
        idx = (idx + 1) % window.eventosPainel.length;
        localStorage.setItem('idxEventoPainel', idx);
    }
});

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        window.location.href = "/login";
    }
});