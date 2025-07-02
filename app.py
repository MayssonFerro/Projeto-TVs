import json
import os
import requests
from flask import Flask, render_template, request, redirect, flash, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, login_required, logout_user, current_user, UserMixin
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, time, timedelta

app = Flask(__name__)
app.secret_key = 'uma_chave_muito_secreta_aqui'

api_key = '4cd224af1c46c58cf99cdbd798e13931'
city = 'Três Lagoas, br'
CACHE_FILE = 'clima.json'

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# --- SEÇÃO DE CONFIGURAÇÃO DE INTERVALOS ---
DURACAO_INTERVALO = timedelta(minutes=15)

HORARIOS_EVENTOS = {
    "o primeiro intervalo": {'inicio': time(9, 15), 'duracao': DURACAO_INTERVALO},
    "a saída dos estudantes": {'inicio': time(13, 0), 'duracao': timedelta(minutes=0)},
    "o segundo intervalo": {'inicio': time(15, 15), 'duracao': DURACAO_INTERVALO},
    "o horário de saída": {'inicio': time(18, 30), 'duracao': timedelta(minutes=0)}
}

# --- FUNÇÃO AUXILIAR PARA VERIFICAR O STATUS DO INTERVALO ---
def get_status_intervalo():
    """
    Verifica o horário atual e retorna o status do próximo evento.
    Retorna um dicionário com informações para o template.
    """
    # --- INÍCIO DAS LINHAS DE DEBUG (Pode remover depois) ---
    print(f"\n=======================================================")
    print(f"DEBUG: Hora atual do servidor: {datetime.now()}")
    print(f"=======================================================")
    # --- FIM DAS LINHAS DE DEBUG ---

    agora_dt = datetime.now()
    hoje = agora_dt.date()

    eventos_ordenados = sorted(HORARIOS_EVENTOS.items(), key=lambda item: item[1]['inicio'])

    for nome, detalhes in eventos_ordenados:
        inicio_dt = datetime.combine(hoje, detalhes['inicio'])
        fim_dt = inicio_dt + detalhes['duracao']

        tempo_para_inicio = inicio_dt - agora_dt
        tempo_para_fim = fim_dt - agora_dt

        # --- INÍCIO DAS LINHAS DE DEBUG (Pode remover depois) ---
        print(f"--- Verificando evento: '{nome}' ---")
        print(f"Tempo para início: {tempo_para_inicio}")
        print(f"Condição de início atendida? {timedelta(seconds=0) < tempo_para_inicio <= timedelta(minutes=15)}")
        # --- FIM DAS LINHAS DE DEBUG ---

        # CONDIÇÃO 1: Faltam 15 minutos ou menos para COMEÇAR o evento
        if timedelta(seconds=0) < tempo_para_inicio <= timedelta(minutes=15):
            return {
                "show_aviso": True,
                "mensagem_status": f"Tempo para {nome}",
                "tempo_restante_segundos": tempo_para_inicio.total_seconds()
            }

        # CONDIÇÃO 2: Faltam 5 minutos ou menos para TERMINAR o intervalo
        if detalhes['duracao'].total_seconds() > 0 and timedelta(seconds=0) < tempo_para_fim <= timedelta(minutes=5):
            return {
                "show_aviso": True,
                "mensagem_status": f"Tempo para o fim de {nome}",
                "tempo_restante_segundos": tempo_para_fim.total_seconds()
            }

    # Se nenhuma das condições acima for atendida, retorna um dicionário padrão
    return {
        "show_aviso": False,
        "mensagem_status": "Tenha um ótimo dia!",
        "tempo_restante_segundos": None
        }


@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))


def fetch_and_cache_weather():
    print("--------------------------------------------------")
    print(f"AGENDADOR: Buscando dados de PREVISÃO para {city}...")
    url = f'https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={api_key}&units=metric&lang=pt_br'
    try:
        response = requests.get(url, verify=False)
        response.raise_for_status()
        dados_previsao = response.json()
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(dados_previsao, f, ensure_ascii=False, indent=4)
        print("AGENDADOR: Dados de previsão salvos com sucesso no cache!")
    except requests.exceptions.RequestException as e:
        print(f"!!!!!!!!!! AGENDADOR: Erro ao chamar a API: {e} !!!!!!!!!!!")
    print("--------------------------------------------------")

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
    if not Usuario.query.filter_by(email='admin@example.com').first():
        admin_user = Usuario(nome='Admin', email='admin@example.com', senha='admin')
        db.session.add(admin_user)
        db.session.commit()
        
    if not Dispositivo.query.first():
        novo_dispositivo = Dispositivo(ip="192.168.0.1", nome="Painel Teste", local="Entrada")
        db.session.add(novo_dispositivo)
        db.session.commit()
    if not Noticia.query.first():
        nova_noticia = Noticia(dispositivo_id=1, conteudo="Sejam bem-vindos!", status="ativa")
        db.session.add(nova_noticia)
        db.session.commit()
    if not Evento.query.first():
        novo_evento = Evento(dispositivo_id=1, titulo="Início das Aulas", descricao="O ano letivo começa hoje.", status="ativo")
        db.session.add(novo_evento)
        db.session.commit()


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin'))
    if request.method == 'POST':
        email = request.form['email']
        senha = request.form['senha']
        user = Usuario.query.filter_by(email=email).first()
        if user and user.senha == senha:
            login_user(user)
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('admin'))
        else:
            flash('Email ou senha incorretos.', 'danger')
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
    status_intervalo = get_status_intervalo()
    return render_template("painel.html", noticia=noticia, evento=evento, **status_intervalo)


@app.route('/dispositivos')
@login_required
def show_dispositivos():
    dispositivos = Dispositivo.query.all()
    return render_template('dispositivos.html', dispositivos=dispositivos)


@app.route('/adicionar_dispositivo', methods=["GET", 'POST'])
@login_required
def adicionar_dispositivo():
    if request.method == "POST":
        ip = request.form["ip"]
        if Dispositivo.query.filter_by(ip=ip).first():
            flash("Já existe um dispositivo com esse IP!", "warning")
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
        flash("Dispositivo adicionado com sucesso!", "success")
        return redirect(url_for('show_dispositivos'))
    return render_template("adicionar_dispositivo.html")

@app.route("/aviso-intervalo")
def aviso_intervalo():
    noticia = Noticia.query.filter_by(status="ativa").all()
    status_intervalo = get_status_intervalo()
    return render_template('aviso-intervalo.html', noticia=noticia, **status_intervalo)


horarios_agendados = [
    (6, 10), (8, 0), (12, 0), (13, 0), (15, 0),
    (17, 0), (18, 0), (19, 0), (21, 0), (22, 0), (22, 50)
]

scheduler = BackgroundScheduler(daemon=True)
for hora, minuto in horarios_agendados:
    scheduler.add_job(fetch_and_cache_weather, 'cron', hour=hora, minute=minuto)
scheduler.start()


@app.route('/admin')
@login_required
def admin():
    dispositivos = Dispositivo.query.order_by(Dispositivo.nome).all()
    noticias = Noticia.query.order_by(Noticia.data_inicio.desc()).all()
    eventos = Evento.query.order_by(Evento.data_inicio.desc()).all()
    mensagens_temporarias = Mensagem_Temporaria.query.order_by(Mensagem_Temporaria.data_inicio.desc()).all()
    return render_template("gerenciador_deconteudo/admin.html", dispositivos=dispositivos, noticias=noticias, eventos=eventos, mensagens_temporarias=mensagens_temporarias)

@app.route('/admin/conteudo/adicionar', methods=['GET', 'POST'])
@login_required
def adicionar_conteudo():
    if request.method == 'POST':
        dispositivos_ids = request.form.getlist('dispositivos')
        conteudo_noticia = request.form.get('conteudo_noticia')

        if not dispositivos_ids:
            flash("Você deve selecionar ao menos um dispositivo.", "danger")
            return redirect(url_for('adicionar_conteudo'))

        if not conteudo_noticia:
            flash("O campo de conteúdo não pode estar vazio.", "danger")
            return redirect(url_for('adicionar_conteudo'))

        for id_dispositivo in dispositivos_ids:
            nova_noticia = Noticia(
                conteudo=conteudo_noticia,
                status="ativa",
                dispositivo_id=id_dispositivo
            )
            db.session.add(nova_noticia)

        db.session.commit()
        flash("Notícia rápida adicionada com sucesso!", "success")
        return redirect(url_for('admin'))

    dispositivos = Dispositivo.query.order_by(Dispositivo.nome).all()
    return render_template("gerenciador_deconteudo/adicionar_conteudo.html", dispositivos=dispositivos)


@app.route('/admin/noticia/excluir/<int:id>', methods=['POST'])
@login_required
def excluir_noticia(id):
    noticia_para_excluir = Noticia.query.get_or_404(id)
    db.session.delete(noticia_para_excluir)
    db.session.commit()
    flash("Notícia removida com sucesso.", "success")
    return redirect(url_for('admin'))


@app.route('/admin/mensagem/excluir/<int:id>', methods=['POST'])
@login_required
def excluir_mensagem(id):
    mensagem_para_excluir = Mensagem_Temporaria.query.get_or_404(id)
    db.session.delete(mensagem_para_excluir)
    db.session.commit()
    flash("Mensagem programada removida com sucesso.", "success")
    return redirect(url_for('admin'))

@app.route('/clima')
def clima():
    status_intervalo = get_status_intervalo()
    clima_data = None
    erro_msg = None
    noticia = Noticia.query.all()
    evento = Evento.query.all()

    if not os.path.exists(CACHE_FILE):
        erro_msg = "Dados do clima ainda não disponíveis. Aguardando a primeira busca."
    else:
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                dados_previsao = json.load(f)

            primeira_previsao = dados_previsao['list'][0]
            clima_data = {
                'cidade': dados_previsao['city']['name'],
                'temperatura': f"{primeira_previsao['main']['temp']:.0f}",
                'condicao': primeira_previsao['weather'][0]['description'].capitalize(),
                'chance_chuva': int(primeira_previsao['pop'] * 100),
                'vento': round(primeira_previsao['wind']['speed'] * 3.6, 1),
                'icone': primeira_previsao['weather'][0]['icon'],
            }
        except (IOError, json.JSONDecodeError, KeyError) as e:
            print(f"Erro ao ler ou processar o arquivo de cache: {e}")
            erro_msg = "Ocorreu um erro ao carregar os dados do clima."
            
    return render_template('clima.html', clima=clima_data, erro=erro_msg, **status_intervalo, noticia=noticia, evento=evento)



if __name__ == '__main__':
    print("Executando a busca inicial de clima antes de iniciar o servidor...")
    with app.app_context():
        fetch_and_cache_weather()
    app.run(debug=True, use_reloader=False)