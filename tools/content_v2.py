#!/usr/bin/env python3
"""Genera data/content/events.json y achievements.json (contenido v2) a partir de
tools/content_events.py y tools/content_trophies.py. Determinista; sin red."""
import json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import content_events, content_trophies

def dump(name, obj):
    (ROOT / 'data/content' / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

events = content_events.EVENTS
dump('events.json', {'schemaVersion': 2, 'packId': 'baloncesto-decisiones', 'version': '2.0.0', 'targetCount': 300, 'events': events})

ach = []
for i, (metric, threshold, mode, es, en) in enumerate(content_trophies.T):
    tier = 1 + sum(1 for m, t, *_ in content_trophies.T[:i] if m == metric)
    ach.append({'id': f'{metric}-{threshold}', 'metric': metric, 'threshold': threshold, 'mode': mode, 'tier': tier,
                'title': {'es': es, 'en': en}, 'rewardStyle': min(40, 4 + tier * 3)})
for mode, es, en in [('player', 'Platino: el camino completo', 'Platinum: The Whole Road'), ('coach', 'Platino: el banquillo eterno', 'Platinum: The Eternal Bench')]:
    reachable = sum(1 for a in ach if a['mode'] in (mode, 'any'))
    ach.append({'id': f'platinum-{mode}', 'metric': 'achievements', 'threshold': reachable, 'mode': mode, 'tier': 99, 'platinum': True,
                'title': {'es': es, 'en': en}, 'rewardStyle': 100})
assert len({a['id'] for a in ach}) == len(ach)
dump('achievements.json', {'schemaVersion': 2, 'packId': 'baloncesto-trofeos', 'version': '2.0.0', 'targetCount': 150, 'achievements': ach})
PRESS = [
 ('injury', 'El parte médico aleja a {player} de la pista: el {club} cuenta los días.', 'The injury report keeps {player} off the court: {club} counts the days.'),
 ('my-big', '{player} firma {myPts} puntos ante {opponent} y se gana los titulares.', '{player} drops {myPts} on {opponent} and grabs the headlines.'),
 ('my-big', 'Noche de {player}: {myPts} puntos y el pabellón en pie.', '{player}\'s night: {myPts} points and the arena on its feet.'),
 ('win-close', 'Final de infarto: el {club} gana {us}-{them} a {opponent} en el último suspiro.', 'Heart-stopper: {club} beats {opponent} {us}-{them} at the death.'),
 ('win-close', '{us}-{them}: el {club} sobrevive a {opponent} con el corazón en la mano.', '{us}-{them}: {club} survives {opponent} with hearts in mouths.'),
 ('win-big', 'Exhibición del {club}: {us}-{them} a {opponent}, sin discusión.', '{club} clinic: {us}-{them} over {opponent}, no debate.'),
 ('win-big', 'El {club} pasa por encima de {opponent} ({us}-{them}).', '{club} rolls over {opponent} ({us}-{them}).'),
 ('loss-close', 'El {club} cae {us}-{them} ante {opponent} por un suspiro y sale con dudas.', '{club} falls {us}-{them} to {opponent} by a whisker and leaves with doubts.'),
 ('loss-big', 'Noche para olvidar: {opponent} arrolla al {club} ({them}-{us}).', 'A night to forget: {opponent} crushes {club} ({them}-{us}).'),
 ('streak-win', 'El {club} encadena {streak} victorias y ya mira a la parte alta.', '{club} strings together {streak} wins and looks upward.'),
 ('streak-loss', 'Alarma en el {club}: {streakAbs} derrotas seguidas y el banquillo, en el foco.', 'Alarm at {club}: {streakAbs} straight losses and the bench under fire.'),
 ('top', 'El {club} es {rank}.º y se lo cree: la ciudad empieza a ilusionarse.', '{club} sits {rank}th and believes: the city starts to dream.'),
 ('bottom', 'El {club}, {rank}.º, necesita reaccionar antes de que sea tarde.', '{club}, {rank}th, needs to react before it is too late.'),
 ('my-quiet', 'Partido gris de {player} ante {opponent}: la grada espera más.', 'A grey night for {player} against {opponent}: the crowd expects more.'),
 ('win', 'Victoria del {club} ante {opponent} ({us}-{them}). Trabajo hecho.', '{club} beats {opponent} ({us}-{them}). Job done.'),
 ('loss', 'Derrota del {club} ante {opponent} ({us}-{them}). Toca mirar el vídeo.', '{club} loses to {opponent} ({us}-{them}). Time to watch the film.'),
 ('always', 'Semana de trabajo en el {club} antes de medirse a {next}.', 'Work week at {club} ahead of {next}.'),
]
dump('press.json', {'schemaVersion': 2, 'packId': 'baloncesto-prensa', 'version': '2.0.0', 'templates': [{'id': f'{c}-{i}', 'condition': c, 'es': es, 'en': en} for i, (c, es, en) in enumerate(PRESS)]})
print(len(events), 'events ·', len(ach), 'trophies ·', len(PRESS), 'press')

# Traducciones fr/de/it del contenido narrativo (tools/i18n).
import runpy as _rp, pathlib as _pl
_rp.run_path(str(_pl.Path(__file__).with_name('content_i18n.py')))
