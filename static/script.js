function atualizarRelogio() {
    const agora = new Date();
    const opcoes = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
    const data = agora.toLocaleDateString('pt-BR', opcoes);
    const hora = agora.toLocaleTimeString('pt-BR');
    document.getElementById('data').textContent = data.charAt(0).toUpperCase() + data.slice(1);
    document.getElementById('hora').textContent = hora;
}

document.addEventListener("DOMContentLoaded", function() {
    setInterval(atualizarRelogio, 1000);
    atualizarRelogio();

    if (window.eventoLink && document.getElementById("qrcode")) {
        new QRCode(document.getElementById("qrcode"), window.eventoLink);
    }
    if (window.eventoImagem) {
        const painel = document.querySelector('.painel');
        if (painel) {
            painel.style.backgroundImage = `url('${window.eventoImagem}')`;
            painel.style.backgroundSize = "cover";
            painel.style.backgroundPosition = "center";
        }
    }
});