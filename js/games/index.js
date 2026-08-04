// Registry of all 23 games. Each module default-exports
// { id, title, icon, tagline, howTo, group?, mount(stage, ctx) }.

import scramble from './scramble.js';
import falling from './falling.js';
import train from './train.js';
import puzzle from './puzzle.js';
import disappear from './disappear.js';
import balloon from './balloon.js';
import firefly from './firefly.js';
import karaoke from './karaoke.js';
import echo from './echo.js';
import refrace from './refrace.js';
import feed from './feed.js';
import hopscotch from './hopscotch.js';
import slash from './slash.js';
import stones from './stones.js';
import rocket from './rocket.js';
import spinner from './spinner.js';
import relay from './relay.js';
import hotpotato from './hotpotato.js';
import stickers from './stickers.js';
import garden from './garden.js';
import singalong from './singalong.js';
import drawtell from './drawtell.js';
import firstletter from './firstletter.js';

const list = [
  scramble, falling, train, puzzle, disappear, balloon, firefly, karaoke,
  echo, refrace, feed, hopscotch, slash, stones, rocket, spinner, relay,
  hotpotato, stickers, garden, singalong, drawtell, firstletter,
];

export const GAMES = Object.fromEntries(list.map((g) => [g.id, g]));
export const GAME_LIST = list;
