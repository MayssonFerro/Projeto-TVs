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
    if (window.eventoLink && qrcodeContainer && qrcodeContainer.innerHTML.trim() === '') {
        new QRCode(qrcodeContainer, window.eventoLink);
    }

    // Define a imagem de fundo do painel, se existir
    if (window.eventoImagem) {
        const painel = document.querySelector('.painel');
        if (painel) {
            painel.style.backgroundImage = `url('${window.eventoImagem}')`;
            painel.style.backgroundSize = "cover";
            painel.style.backgroundPosition = "center";
        }
    }


    // ======================================================
    // SEÇÃO 3: LÓGICA DE ROTAÇÃO DE PÁGINAS (QUIOSQUE)
    // ======================================================
    const paginas = ['/', '/clima']; // Defina aqui as páginas para o ciclo
    const tempoDeExibicao = 10000;  // 30 segundos

    const paginaAtualPath = window.location.pathname;
    const paginaAtualIndex = paginas.indexOf(paginaAtualPath);

    // Só inicia o temporizador se a página atual estiver na lista de rotação
    if (paginaAtualIndex !== -1) {
        const proximaPaginaIndex = (paginaAtualIndex + 1) % paginas.length;
        const proximaPagina = paginas[proximaPaginaIndex];

        setTimeout(function() {
            window.location.href = proximaPagina;
        }, tempoDeExibicao);
    }
});

