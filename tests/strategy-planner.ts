import { chapters } from "../src/game/missions.ts";
import {
  startGame,
  actionsFor,
  chooseAction,
  nextChoice,
  type Game,
  type Difficulty,
} from "../src/game/engine.ts";
// A bounded search is a test oracle for a viable plan, not a player-facing hint or solver.
export function viableGame(
  m: (typeof chapters)[number],
  role: "red" | "blue",
  difficulty: Difficulty,
): Game {
  const rank = (g: Game) =>
    (g.role === "red"
      ? g.attackScore! - g.defenseScore!
      : g.defenseScore! - g.attackScore!) *
      2 +
    g.stats.health * 0.8 -
    g.stats.risk * 0.8 +
    g.strategy!.resources * 0.5 +
    g.strategy!.preparedness * 0.15 -
    g.strategy!.pressure * 0.4 -
    g.strategy!.unresolved * 8 -
    g.strategy!.fatigue * 0.4;
  let beam = [startGame(m, role, difficulty)];
  const limit = beam[0].turnLimit!;
  for (let i = 0; i < limit; i++) {
    const options = beam.flatMap((g) =>
      actionsFor(g, m).map((a) => nextChoice(chooseAction(g, m, a.id))),
    );
    options.sort(
      (a, b) =>
        (b.status === "won" ? 10000 : 0) +
        rank(b) -
        ((a.status === "won" ? 10000 : 0) + rank(a)),
    );
    beam = options.slice(0, 20);
  }
  return beam[0];
}
