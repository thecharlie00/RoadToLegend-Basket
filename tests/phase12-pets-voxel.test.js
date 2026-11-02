'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const Voxel = require('../src/render/voxel.js');
const Pet = require('../src/domain/pet.js');
const PetVox = require('../src/render/petvox.js');

function freshLife(cash) { return { cash: cash == null ? 10000 : cash, style: 500, fans: 0, achievements: [] }; }
function petState(patch) {
  const state = { seed: 'voxel-pet', rng: { n: 0 }, life: freshLife(), pet: Object.assign({
    species: 'dog', name: 'Rebote', trait: 'active', ageWeeks: 0, hunger: 100, thirst: 100, energy: 100,
    happiness: 100, hygiene: 100, fun: 100, affection: 100, bond: 40, tricks: {}, owned: [], equipped: {},
    inv: {}, toys: [], contests: { played: 0, won: 0, wins: {} }, album: [], lastContestWeek: -99, actionsLeft: 0
  }, patch) };
  return state;
}

test('pet content matches the football roster: 13 species, 13 care actions, 10 coats, 7 backgrounds, 30 accessories in 6 slots', () => {
  assert.equal(Object.keys(Pet.SPECIES).length, 13);
  for (const exotic of ['parrot', 'hedgehog', 'fennec', 'capybara', 'iguana', 'python', 'tarantula']) assert.equal(Pet.SPECIES[exotic].exotic, true, exotic);
  assert.equal(Pet.ACTIONS.length, 13);
  for (const a of ['pat', 'watch', 'photo', 'spa', 'home']) assert.ok(Pet.ACTIONS.includes(a), a);
  assert.equal(Pet.COATS.length, 10);
  assert.equal(Pet.BACKGROUNDS.length, 7);
  assert.equal(Pet.ITEMS.length, 30);
  assert.equal(Pet.SLOTS.length, 6);
  assert.deepEqual(Pet.SLOTS, ['head', 'face', 'neck', 'body', 'feet', 'toy']);
  for (const sl of Pet.SLOTS) assert.ok(Pet.ITEMS.some(i => i.slot === sl), sl);
  for (const sp of Object.keys(Pet.SPECIES)) assert.ok(Pet.SPECIES[sp].shape, sp);
  const keys = ['pet.free', 'pet.noDeath', 'pet.view.care', 'pet.view.style', 'pet.view.info', 'pet.views'];
  for (const sp of Object.keys(Pet.SPECIES)) keys.push('pet.species.' + sp);
  for (const c of Pet.COATS) keys.push('pet.coat.' + c.id);
  for (const b of Pet.BACKGROUNDS) keys.push('pet.bg.' + b.id);
  for (const i of Pet.ITEMS) keys.push('pet.item.' + i.id);
  for (const s of Pet.SLOTS) keys.push('pet.slot.' + s);
  for (const a of Pet.ACTIONS) keys.push('pet.act.' + a);
  for (const k of ['pat', 'watch', 'photo', 'photoLook', 'spa', 'home', 'vet', 'renamed', 'coat', 'bg']) keys.push('pet.msg.' + k);
  const locales = ['es', 'en', 'fr', 'de', 'it'].map(l => [l, JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/' + l + '.json'), 'utf8'))]);
  for (const [lang, dict] of locales) {
    for (const k of keys) assert.ok(typeof dict[k] === 'string' && dict[k].length > 1, 'missing ' + lang + ' ' + k);
    assert.deepEqual(Object.keys(dict), Object.keys(locales[0][1]), 'same key order in ' + lang);
  }
});

test('voxel pet renders every species, coat and background within the cube budget', () => {
  for (const species of Object.keys(Pet.SPECIES)) {
    for (const coat of Pet.COATS) {
      for (const bg of Pet.BACKGROUNDS) {
        const scene = PetVox.geometry({ species, coat: coat.id, bg: bg.id, happiness: 80 }, { t: 1.3 });
        assert.equal(scene.kind, 'avatar');
        assert.ok(scene.cubes.length > 5 && scene.cubes.length <= Voxel.MAX_CUBES, species + ' ' + scene.cubes.length);
        for (const c of scene.cubes) assert.ok(scene.colors[c.color], species + ' missing colour ' + c.color);
      }
    }
  }
  const club = PetVox.geometry({ species: 'dog', bg: 'club' }, { clubColors: ['#ff0000', '#00ff00'] });
  assert.deepEqual(club.colors.bgWall, [1, 0, 0]);
  assert.deepEqual(club.colors.bgFloor, [0, 1, 0]);
  const baby = PetVox.geometry({ species: 'dog', stage: 'baby' });
  const adult = PetVox.geometry({ species: 'dog', stage: 'adult' });
  assert.ok(baby.cubes[0].sx < adult.cubes[0].sx);
  const reduced = PetVox.geometry({ species: 'dog' }, { reduced: true });
  assert.ok(reduced.cubes.every(c => Number.isFinite(c.x) && Number.isFinite(c.y)));
});

test('coats: trophy colours stay locked until the matching contest is won and survive a save round trip', () => {
  const base = petState({});
  assert.equal(Pet.coatOpen(base, 'gold'), false);
  assert.throws(() => Pet.setCoat({ pet: base }, 'gold'), /locked/);
  base.contests.wins.regional = 1;
  assert.equal(Pet.coatOpen(base, 'gold'), true);
  assert.equal(Pet.coatOpen(base, 'rainbow'), false);
  Pet.setCoat({ pet: base }, 'gold');
  assert.equal(base.coat, 'gold');
  base.contests.wins.national = 1;
  Pet.setCoat({ pet: base }, 'rainbow');
  assert.equal(base.coat, 'rainbow');
  Pet.setBg({ pet: base }, 'club');
  assert.equal(base.bg, 'club');
  assert.throws(() => Pet.setBg({ pet: base }, 'lava'), /unknown/);
  // Las partidas antiguas sin color/fondo se migran a los valores por defecto.
  const old = petState({});
  delete old.pet.coat; delete old.pet.bg; delete old.pet.caresLeft;
  const migrated = Pet.migrate({ pet: old.pet });
  assert.equal(migrated.coat, 'nat');
  assert.equal(migrated.bg, 'none');
  assert.equal(migrated.caresLeft, Pet.PER_WEEK);
  assert.equal(Pet.validate(Object.assign({}, old.pet, { coat: 'nope' })), false);
});

test('winning contests unlocks the trophy accessories in the right order', () => {
  const s = petState({ species: 'dog', bond: 100, hygiene: 100, happiness: 100, actionsLeft: 3 });
  s.week = 0; s.pet.tricks = Object.fromEntries(Pet.TRICKS.map(t => [t.id, 100]));
  for (const tier of ['local', 'regional', 'national']) {
    Pet.contest(s, s.life, { tier });
    s.week += 5;
  }
  assert.deepEqual(s.pet.contests.wins, { local: 1, regional: 1, national: 1 });
  for (const id of ['crown', 'star', 'medal', 'gold', 'cup']) assert.ok(s.pet.owned.includes(id), id);
  assert.equal(Pet.coatOpen(s.pet, 'gold'), true);
  assert.equal(Pet.coatOpen(s.pet, 'rainbow'), true);
});

test('care: species rules, photos paid in style, spa paid in cash and the vet scare never kills', () => {
  assert.equal(Pet.careAllowed({ species: 'fish' }, 'pat'), false);
  assert.equal(Pet.careAllowed({ species: 'fish' }, 'watch'), true);
  assert.equal(Pet.careAllowed({ species: 'fish' }, 'spa'), false);
  assert.equal(Pet.careAllowed({ species: 'dog' }, 'spa'), true);
  assert.equal(Pet.careAllowed({ species: 'dog' }, 'watch'), false);
  assert.equal(Pet.careAllowed({ species: 'turtle' }, 'home'), true);
  const s = petState({ actionsLeft: 3 });
  const before = s.life.style;
  Pet.act(s, s.life, { action: 'photo' });
  assert.ok(s.life.style > before);
  s.pet.equipped = { head: 'cap', neck: 'collar' };
  const withLook = s.life.style;
  Pet.act(s, s.life, { action: 'photo' });
  assert.ok(s.life.style - withLook > before - (withLook - 2), 'accessories improve the photo');
  const cash = s.life.cash;
  Pet.act(s, s.life, { action: 'spa' });
  assert.equal(s.life.cash, cash - Pet.SPA_COST);
  assert.equal(s.pet.hygiene, 100);
  assert.throws(() => Pet.act({ pet: Object.assign({}, s.pet, { species: 'fish', actionsLeft: 1 }) }, s.life, { action: 'spa' }), /spa/);
  // El miedo veterinario cuesta dinero, pero la mascota sigue viva y la partida valida.
  const v = petState({ species: 'fennec', ageWeeks: Pet.WEEKS_PER_SEASON - 1, actionsLeft: 3 });
  v.life.cash = 10000;
  Pet.weekTick(v, v.life);
  assert.equal(v.pet.ageWeeks, Pet.WEEKS_PER_SEASON);
  assert.ok(v.life.cash < 10000);
  assert.ok(v.pet.bond >= 0 && v.pet.happiness >= 0);
  assert.equal(Pet.validate(v.pet), true);
});

test('rename sanitises what the player types and the pet owner name is bounded', () => {
  const s = petState({});
  assert.equal(Pet.rename({ pet: s.pet }, '  <b>Mamba</b>  '), 'bMamba/b');
  assert.equal(s.pet.name, 'bMamba/b');
  assert.throws(() => Pet.rename({ pet: s.pet }, '   '), /empty/);
  const long = Pet.rename({ pet: s.pet }, 'x'.repeat(40));
  assert.equal(long.length, 20);
});
