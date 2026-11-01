#!/usr/bin/env python3
"""Generate versioned MVP content packs. Deterministic; no network."""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'data/content'
OUT.mkdir(parents=True,exist_ok=True)

def dump(name,obj):
    (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

cats=[('player',25),('coach',20),('agency',15),('locker',10),('press',10),('health',8),('finance',6),('milestone',6)]
topics={
 'player':[('Minutos extra','Extra minutes'),('Ritual de tiro','Shooting ritual'),('Video nocturno','Late film'),('Retiro del barrio','Neighborhood court'),('Debut soñado','Dream debut')],
 'coach':[('Pizarra final','Final playboard'),('Rotación corta','Short rotation'),('Charla de vestuario','Locker talk'),('Presión de junta','Board pressure'),('Scouting rival','Rival scouting')],
 'agency':[('Oferta de zapatillas','Shoe offer'),('Cláusula de salida','Exit clause'),('Agente insistente','Pushy agent'),('Draft-and-stash','Draft-and-stash'),('Ventana de mercado','Market window')],
 'locker':[('Mentoría joven','Young mentor'),('Conflicto de roles','Role conflict'),('Viaje largo','Long trip'),('Química de pista','On-court chemistry'),('Capitán vocal','Vocal captain')],
 'press':[('Rueda de prensa','Press conference'),('Redes sociales','Social media'),('Crítica pública','Public criticism'),('Rumor de trade','Trade rumor'),('Entrevista exclusiva','Exclusive interview')],
 'health':[('Carga alta','High load'),('Molestia muscular','Muscle soreness'),('Sueño irregular','Poor sleep'),('Recuperación activa','Active recovery'),('Nutrición','Nutrition')],
 'finance':[('Inversión local','Local investment'),('Ahorro familiar','Family savings'),('Impuestos','Taxes'),('Donación comunitaria','Community donation'),('Gasto impulsivo','Impulse spend')],
 'milestone':[('Primer titular','First start'),('Récord personal','Personal best'),('Camiseta local','Local jersey'),('Homenaje barrio','Neighborhood tribute'),('Meta de carrera','Career goal')]
}
events=[]
for cat,count in cats:
    for i in range(count):
        topic=topics[cat][i%len(topics[cat])]
        eid=f'{cat}-{i+1:03d}'
        es=f'{topic[0]} · semana {i+1}'
        en=f'{topic[1]} · week {i+1}'
        opts=[
          {'id':'a','es':'Aceptar el reto','en':'Take the challenge','effects':{'morale':3,'load':6,'xp':4,'style':1}},
          {'id':'b','es':'Priorizar el equipo','en':'Put the team first','effects':{'chemistry':5,'morale':1,'xp':2}},
          {'id':'c','es':'Descansar y preparar','en':'Rest and prepare','effects':{'load':-8,'fatigue':-0.1,'morale':2}}
        ]
        if cat=='agency': opts[0]['effects'].update({'cash':5000,'style':3})
        if cat=='finance': opts[0]['effects'].update({'cash':-2000,'morale':2}); opts[1]['effects'].update({'cash':3000})
        if cat=='press': opts[0]['effects'].update({'chemistry':-2,'style':2}); opts[1]['effects'].update({'chemistry':3})
        events.append({'id':eid,'category':cat,'weight':10-(i%4),'cooldownWeeks':6,'conditions':{'mode':'player' if cat in ('player','health','finance') else 'any'},'title':{'es':es,'en':en},'body':{'es':'Una decisión breve puede cambiar el ánimo, la carga o los recursos de la carrera.','en':'A short decision can change career morale, load or resources.'},'options':opts})
# events.json lo genera tools/content_v2.py (contenido escrito a mano).

ach=[]
metrics=[('games',1,10,25,50,100),('points',100,500,1000,2500,5000),('wins',1,5,15,30,50),('seasons',1,2,3,5,10),('ovr',55,60,65,70,80),('cash',10000,50000,100000,250000,500000),('style',10,25,50,100,200),('events',1,5,10,25,50),('train',1,5,10,25,50),('signs',1,2,3,5,10)]
names_es=['Primer paso','Constancia','Referente','Leyenda local','Camino al aro']
names_en=['First step','Consistency','Benchmark','Local legend','Road to the rim']
for row in metrics:
    metric, vals = row[0], row[1:]
    for tier,v in enumerate(vals):
        ach.append({'id':f'{metric}-{tier+1}','metric':metric,'threshold':v,'tier':tier+1,'title':{'es':f'{names_es[tier]} · {metric}','en':f'{names_en[tier]} · {metric}'},'rewardStyle':(tier+1)*5})
# achievements.json lo genera tools/content_v2.py (trofeos con guiños).

shop=[]
items=[('shoes','AroWear Uno','AroWear One',20,'#ffb547'),('shoes','Parquet Lab Air','Parquet Lab Air',45,'#59d18c'),('shoes','Skyline Hoops Pro','Skyline Hoops Pro',80,'#5aa9ff'),('jersey','Local Clásica','Local Classic',15,'#eef6f4'),('jersey','Local Noche','Local Night',35,'#122126'),('jersey','Local Retro','Local Retro',60,'#ff7a6b'),('accessory','Muñeca Barrio','Neighborhood Wristband',10,'#ffb547'),('accessory','Cinta Capitán','Captain Headband',30,'#59d18c'),('accessory','Manga Tiro','Shooting Sleeve',50,'#5aa9ff'),('background','Cancha Barrio','Neighborhood Court',25,'#24424a'),('background','Pabellón Local','Local Arena',55,'#0b1417'),('background','Atardecer Urbano','Urban Sunset',90,'#ff9f43')]
for i,(slot,es,en,cost,color) in enumerate(items):
    shop.append({'id':f'item-{i+1}','slot':slot,'name':{'es':es,'en':en},'cost':cost,'color':color,'bonus':{'morale':1 if i%3==0 else 0},'source':'offline'})
dump('shop.json',{'schemaVersion':1,'packId':'mvp-shop','version':'0.1.0','items':shop})

press=[
 {'id':'win-streak','condition':'wins>=3','es':'{club} encadena {wins} victorias y mira hacia arriba.','en':'{club} strings together {wins} wins and looks up.'},
 {'id':'loss-streak','condition':'losses>=3','es':'Preguntas en {club} tras {losses} derrotas seguidas.','en':'Questions at {club} after {losses} straight losses.'},
 {'id':'star-game','condition':'points>=20','es':'{player} firma {points} puntos y gana focos.','en':'{player} posts {points} points and earns the spotlight.'},
 {'id':'injury','condition':'injury','es':'{player} gestiona una lesión y el cuerpo técnico pide paciencia.','en':'{player} manages an injury and the staff asks for patience.'},
 {'id':'draft','condition':'drafted','es':'{player} empieza una nueva etapa tras el draft.','en':'{player} begins a new chapter after the draft.'},
 {'id':'default','condition':'always','es':'Semana de trabajo en {club}: rol, carga y próximo rival.','en':'Work week at {club}: role, load and next opponent.'}
]
_unused_press=({'schemaVersion':1,'packId':'mvp-press','version':'0.1.0','templates':press})

guide=[
 {'id':'create','es':'Crea jugador o entrenador y elige ruta.','en':'Create a player or coach and choose a route.'},
 {'id':'week','es':'Juega una semana; el motor resuelve el partido sin red.','en':'Play a week; the engine resolves the match offline.'},
 {'id':'load','es':'Vigila carga y lesiones; descansar también progresa.','en':'Watch load and injuries; resting also progresses.'},
 {'id':'event','es':'Resuelve eventos breves con consecuencias visibles.','en':'Resolve short events with visible consequences.'},
 {'id':'market','es':'Firma ofertas y explora cruces entre Europa y NA.','en':'Sign offers and explore crossings between Europe and NA.'},
 {'id':'style','es':'Gana estilo con logros y equipa a tu Me 2D.','en':'Earn style from achievements and equip your 2D Me.'},
 {'id':'save','es':'Guarda en cualquier semana; exporta/importa JSON.','en':'Save any week; export/import JSON.'},
 {'id':'access','es':'Ajusta texto, color, movimiento y alternativa automática.','en':'Adjust text, color, motion and automatic alternative.'}
]
dump('guide.json',{'schemaVersion':1,'packId':'mvp-guide','version':'0.1.0','steps':guide})
print('content generated',len(events),len(ach),len(shop))
