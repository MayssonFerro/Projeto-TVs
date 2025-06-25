import json
import os
import requests
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_login import UserMixin
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, render_template, request, redirect, flash, url_for

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'uma_chave_muito_secreta_aqui'


api_key = '4cd224af1c46c58cf99cdbd798e13931'
city = 'Três Lagoas, br'
CACHE_FILE = 'clima.json' 
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Define como carregar o usuário
@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

def fetch_and_cache_weather():
    """
    Busca os dados de previsão do tempo, desabilitando a verificação SSL
    para contornar problemas de rede/firewall local.
    """
    print("--------------------------------------------------")
    print(f"AGENDADOR: Buscando dados de PREVISÃO para {city}...")
    
    url = f'https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={api_key}&units=metric&lang=pt_br'
    
    try:
        # MUDANÇA FINAL: Desabilitando a verificação SSL com 'verify=False'.
        # Isso é um contorno para o erro de certificado local.
        response = requests.get(url, verify=False)
        
        response.raise_for_status()
        dados_previsao = response.json()
        
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(dados_previsao, f, ensure_ascii=False, indent=4)
            
        print("AGENDADOR: Dados de previsão salvos com sucesso no cache!")

    except requests.exceptions.RequestException as e:
        # A biblioteca 'urllib3' pode gerar um aviso sobre a conexão insegura.
        # Podemos ignorá-lo neste contexto de desenvolvimento.
        # Para suprimir o aviso, você pode adicionar no topo do seu script:
        # import urllib3
        # urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        print(f"!!!!!!!!!! AGENDADOR: Erro ao chamar a API: {e} !!!!!!!!!!!")
    
    print("--------------------------------------------------")


# ===================================================================
# ROTA CORRIGIDA PARA LER OS DADOS DE PREVISÃO
# ===================================================================
@app.route('/clima')
def clima(): 
    """
    Lê o cache e envia os dados para o template de forma segura,
    garantindo que 'clima' e 'erro' sejam sempre definidos.
    """
    # Cenário 1: O arquivo de cache ainda não existe.
    if not os.path.exists(CACHE_FILE):
        erro_msg = "Dados do clima ainda não disponíveis. Aguardando a primeira busca."
        # SOLUÇÃO: Enviamos 'clima' como None e a mensagem de erro.
        return render_template('clima.html', clima=None, erro=erro_msg)
    
    # Cenário 2: Tenta ler o arquivo de cache.
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            dados_previsao = json.load(f)
        
        primeira_previsao = dados_previsao['list'][0]
        
        # Monta o dicionário com os dados do clima.
        clima_data = {
            'cidade': dados_previsao['city']['name'],
            'temperatura': f"{primeira_previsao['main']['temp']:.0f}", 
            'condicao': primeira_previsao['weather'][0]['description'].capitalize(),
            'chance_chuva': int(primeira_previsao['pop'] * 100),
            'vento': round(primeira_previsao['wind']['speed'] * 3.6, 1),
            'icone': primeira_previsao['weather'][0]['icon'],
        }
        
        # SOLUÇÃO: Enviamos os dados do clima e 'erro' como None.
        return render_template('clima.html', clima=clima_data, erro=None) 

    # Cenário 3: O arquivo de cache está corrompido ou em formato antigo.
    except (IOError, json.JSONDecodeError, KeyError) as e:
        print(f"Erro ao ler ou processar o arquivo de cache: {e}")
        erro_msg = "Ocorreu um erro ao carregar os dados do clima."
        # SOLUÇÃO: Enviamos 'clima' como None e a mensagem de erro.
        return render_template('clima.html', clima=None, erro=erro_msg)


app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dispositivos.db'
db = SQLAlchemy(app)

class Dispositivo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String(15), unique=True, nullable=False)
    nome = db.Column(db.String(50), nullable=False)
    local = db.Column(db.String(50), nullable=False)
    ultima_atualizacao = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    ultima_sincronizacao = db.Column(db.DateTime, default=datetime.now)

class Evento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey('dispositivo.id'), nullable=False)
    titulo = db.Column(db.String(50), nullable=False)
    descricao = db.Column(db.String(250), nullable=False)
    link = db.Column(db.String(250))
    imagem = db.Column(db.String(250))
    status = db.Column(db.String(20), nullable=False)
    data_inicio = db.Column(db.DateTime, default=datetime.now)
    data_fim = db.Column(db.DateTime)
    dispositivo = db.relationship('Dispositivo', backref=db.backref('eventos', lazy=True))

class Mensagem_Temporaria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey('dispositivo.id'), nullable=False)
    mensagem = db.Column(db.String(250), nullable=True)
    link = db.Column(db.String(250), nullable=True)
    prioridade = db.Column(db.String(20), nullable=False)
    data_inicio = db.Column(db.DateTime, default=datetime.now)
    data_fim = db.Column(db.DateTime)
    hora_fim = db.Column(db.Time)
    dispositivo = db.relationship('Dispositivo', backref=db.backref('mensagens_temporarias', lazy=True))

class Noticia(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey('dispositivo.id'), nullable=False)
    conteudo = db.Column(db.String(250), nullable=False)
    data_inicio = db.Column(db.DateTime, default=datetime.now)
    data_fim = db.Column(db.DateTime)
    status = db.Column(db.String(20), nullable=False)
    dispositivo = db.relationship('Dispositivo', backref=db.backref('noticias', lazy=True))

class Usuario(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.now)

with app.app_context():
    db.create_all()

with app.app_context():
    nova_noticia = Noticia(
        dispositivo_id=1,
        conteudo="Esta é uma notícia de teste para o painel.",
        data_inicio=datetime.now(),
        data_fim=None,
        status="ativa"
    )
    db.session.add(nova_noticia)
    db.session.commit()

with app.app_context():
    novo_dispositivo = Dispositivo(
        ip="11w1",
        nome="22",
        local="33"
    )
    db.session.add(novo_dispositivo)
    db.session.commit()
    
with app.app_context():
    novo_evento = Evento(
        dispositivo_id=1,
        titulo="Evento com Imagem",
        descricao="Este evento tem uma imagem separada.",
        link="https://www.ifms.edu.br/noticias/2025/aberto-prazo-de-matriculas-para-selecionados-no-partiu-if",
        imagem="/static/images/partiuif.png",
        status="ativo",
        data_inicio=datetime.now(),
        data_fim=None
    )
    db.session.add(novo_evento)
    db.session.commit()
 
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        senha = request.form['senha']
        user = Usuario.query.filter_by(email=email).first()

        if user and user.senha == senha:
            login_user(user)
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('painel_admin'))  # ou outro painel
        else:
            flash('Email ou senha incorretos.', 'error')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash("Logout realizado com sucesso.", "info")
    return redirect(url_for('login'))

@app.route("/")
def show_painel():
    noticia = Noticia.query.all()
    evento = Evento.query.all()
    return render_template("painel.html", noticia=noticia, evento = evento)

@app.route('/dispositivos')
def show_dispositivos():
    dispositivos = Dispositivo.query.all()
    return render_template('dispositivos.html', dispositivos=dispositivos)

@app.route('/adicionar_dispositivo', methods=["GET", 'POST'])
def adicionar_dispositivo():
    if request.method == "POST":
        ip = request.form["ip"]
        if Dispositivo.query.filter_by(ip=ip).first():
            flash("Já existe um dispositivo com esse IP!", "error")
            return render_template("adicionar_dispositivo.html")
        novo_dispositivo = Dispositivo(
            nome=request.form["nome"],
            local=request.form["local"],
            ip=ip,
            ultima_atualizacao=datetime.now(),
            ultima_sincronizacao=datetime.now()
        )
        db.session.add(novo_dispositivo)
        db.session.commit()
        return redirect("/")
    return render_template("adicionar_dispositivo.html")


horarios_agendados = [
    (6, 10), (8, 0), (12, 0), (13, 0), (15, 0),
    (17, 0), (18, 0), (19, 0), (21, 0), (22, 0), (22, 50)
]

scheduler = BackgroundScheduler(daemon=True)

for hora, minuto in horarios_agendados:
    scheduler.add_job(fetch_and_cache_weather, 'cron', hour=hora, minute=minuto)

scheduler.start()

@app.route('/aviso', methods=["GET"])
def mostrarAviso():
    return render_template("aviso.html")


# --- ROTAS DE GERENCIAMENTO DE CONTEÚDO ---

@app.route('/admin/conteudo/adicionar', methods=['GET', 'POST'])
def adicionar_conteudo():
    """
    Exibe o formulário para adicionar novo conteúdo (GET) e
    processa o envio do formulário (POST).
    """
    if request.method == 'POST':
        # Obtém a lista de IDs dos dispositivos selecionados
        dispositivos_ids = request.form.getlist('dispositivos')
        conteudo_noticia = request.form.get('conteudo_noticia')

        # Validações
        if not dispositivos_ids:
            flash("Você deve selecionar ao menos um dispositivo.", "error")
            return redirect(url_for('adicionar_conteudo'))

        if not conteudo_noticia:
            flash("O campo de conteúdo não pode estar vazio.", "error")
            return redirect(url_for('adicionar_conteudo'))

        # Cria uma nova notícia para cada dispositivo selecionado
        for id_dispositivo in dispositivos_ids:
            nova_noticia = Noticia(
                conteudo=conteudo_noticia,
                status="ativa",
                dispositivo_id=id_dispositivo
            )
            db.session.add(nova_noticia)
        
        db.session.commit()
        flash("Notícia rápida adicionada com sucesso!", "success")
        return redirect(url_for('painel_admin'))

    # Para o método GET, apenas busca os dispositivos e exibe o formulário
    dispositivos = Dispositivo.query.order_by(Dispositivo.nome).all()
    # Lembre-se de incluir a subpasta no caminho do template!
    return render_template("gerenciador_deconteudo/adicionar_conteudo.html", dispositivos=dispositivos)


@app.route('/admin/noticia/excluir/<int:id>', methods=['POST'])
def excluir_noticia(id):
    """
    Encontra uma notícia pelo seu ID e a remove do banco de dados.
    """
    noticia_para_excluir = Noticia.query.get_or_404(id)
    db.session.delete(noticia_para_excluir)
    db.session.commit()
    flash("Notícia removida com sucesso.", "success")
    return redirect(url_for('painel_admin'))


@app.route('/admin/mensagem/excluir/<int:id>', methods=['POST'])
def excluir_mensagem(id):
    """
    Encontra uma mensagem programada pelo seu ID e a remove do banco de dados.
    """
    mensagem_para_excluir = Mensagem_Temporaria.query.get_or_404(id)
    db.session.delete(mensagem_para_excluir)
    db.session.commit()
    flash("Mensagem programada removida com sucesso.", "success")
    return redirect(url_for('painel_admin'))



if __name__ == '__main__':
    print("Executando a busca inicial de clima antes de iniciar o servidor...")
    fetch_and_cache_weather()








app.run(debug=True, use_reloader=False)