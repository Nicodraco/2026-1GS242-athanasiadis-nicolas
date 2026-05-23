import { importFromPokeApi } from "./import-pokeapi";

const parsePositiveInt = (label: string, rawValue: string | undefined): number | undefined => {
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label} value. Expected a positive integer.`);
  }

  return parsed;
};

const readFlagValue = (flag: string): string | undefined => {
  const flagIndex = process.argv.findIndex((arg) => arg === flag);
  if (flagIndex === -1) {
    return undefined;
  }

  return process.argv[flagIndex + 1];
};

const main = async (): Promise<void> => {
  const limit = parsePositiveInt("--limit", readFlagValue("--limit"));
  const maxId = parsePositiveInt("--max-id", readFlagValue("--max-id"));

  const targetPokemon = limit ?? (maxId ? maxId * 2 : undefined);

  const summary = await importFromPokeApi({
    targetPokemon,
    maxPokedexId: maxId,
  });

  console.log(
    [
      "Pokemon import completed.",
      `Pokemon: ${summary.importedPokemon}/${summary.targetPokemon}`,
      summary.maxPokedexId ? `MaxPokedexId: ${summary.maxPokedexId}` : "",
      `Moves: ${summary.importedMoves}`,
      `Types: ${summary.importedTypes}`,
      `Skipped due to invalid move set: ${summary.skippedPokemon}`,
    ]
      .filter((entry) => entry.length > 0)
      .join(" · "),
  );
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown import error";
  console.error(`Pokemon import failed: ${message}`);
  process.exit(1);
});
