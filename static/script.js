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
    // SEÇÃO 2: LÓGICA DO QR CODE E IMAGEM DE FUNDO
    // ======================================================

    // Gera o QR Code (com a verificação para não duplicar)
    const qrcodeContainer = document.getElementById("qrcode");
    console.log("DEBUG - Container QR Code:", qrcodeContainer);
    console.log("DEBUG - Link do evento:", window.eventoLink);
    console.log("DEBUG - Imagem do evento:", window.eventoImagem);

    if (qrcodeContainer && window.eventoLink && window.eventoLink.trim() !== "") {
        console.log('Container QR Code encontrado!');
        console.log('Link encontrado:', window.eventoLink);
        console.log('Container já tem conteúdo:', qrcodeContainer.innerHTML.trim() !== '');
        
        // Só gera o QR Code se o container estiver vazio
        if (qrcodeContainer.innerHTML.trim() === '') {
            console.log('Gerando QR Code...');
            try {
                new QRCode(qrcodeContainer, {
                    text: window.eventoLink,
                    width: 150,
                    height: 150,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
                console.log('QR Code gerado com sucesso!');
            } catch (error) {
                console.error('Erro ao gerar QR Code:', error);
            }
        } else {
            console.log('Container já possui QR Code, pulando geração...');
        }
    } else {
        console.log('QR Code não será gerado:');
        console.log('  - Container existe:', !!qrcodeContainer);
        console.log('  - Link existe:', !!window.eventoLink);
        console.log('  - Link não vazio:', window.eventoLink && window.eventoLink.trim() !== "");
    }

    // Aplicar imagem de fundo do painel
    const painel = document.querySelector('.painel');
    if (painel) {
        if (window.eventoImagem) {
            console.log('Aplicando imagem de evento como papel de parede:', window.eventoImagem);
            painel.style.backgroundImage = `url('${window.eventoImagem}')`;
            painel.style.backgroundSize = 'cover';
            painel.style.backgroundPosition = 'center';
            painel.style.backgroundRepeat = 'no-repeat';
        } else {
            console.log('Aplicando fundo padrão (gradiente)');
            painel.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    // ======================================================
    // SEÇÃO 3: ROTAÇÃO DE PÁGINAS (se necessário)
    // ======================================================
    
    // Obter a URL atual
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
});

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        window.location.href = "/login";
    }
});