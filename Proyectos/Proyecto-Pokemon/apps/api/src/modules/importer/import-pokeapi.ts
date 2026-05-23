import type { Collection, Db } from "mongodb";
import { mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import { env } from "../../config/env";
import { getDb } from "../../lib/mongodb";

const DEFAULT_TARGET_POKEMON = 300;
const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const SHOWDOWN_SPRITES_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown";
const BW_SPRITES_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
const BATTLE_MOVE_COUNT = 4;
const SPRITES_ROOT = resolve(fileURLToPath(new URL("../../../assets/sprites", import.meta.url)));

type NamedApiResource = {
  name: string;
  url: string;
};

type PokemonListResponse = {
  results: NamedApiResource[];
};

type PokemonResponse = {
  id: number;
  name: string;
  stats: Array<{
    base_stat: number;
    stat: { name: string };
  }>;
  types: Array<{
    slot: number;
    type: { name: string };
  }>;
  sprites: {
    front_default: string | null;
    back_default: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
  moves: Array<{
    move: { name: string };
  }>;
};

type MoveResponse = {
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  priority: number;
  type: { name: string };
  damage_class: { name: string };
  effect_chance: number | null;
  effect_entries: Array<{
    language: { name: string };
    short_effect: string;
    effect: string;
  }>;
  target: { name: string };
};

type TypeResponse = {
  name: string;
  damage_relations: {
    double_damage_from: Array<{ name: string }>;
    double_damage_to: Array<{ name: string }>;
    half_damage_from: Array<{ name: string }>;
    half_damage_to: Array<{ name: string }>;
    no_damage_from: Array<{ name: string }>;
    no_damage_to: Array<{ name: string }>;
  };
};

type ImportedPokemonDoc = {
  pokedexId: number;
  name: string;
  types: string[];
  baseStats: Record<string, number>;
  spriteUrl: string | null;
  spriteFrontUrl: string | null;
  spriteBackUrl: string | null;
  spriteAnimatedFrontUrl: string | null;
  spriteAnimatedBackUrl: string | null;
  moveIds: string[];
  battleMoveIds: string[];
  importedBatchId: string;
  updatedAt: Date;
};

type ImportedMoveDoc = {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  damageClass: string;
  effectShort: string | null;
  effect: string | null;
  effectChance: number | null;
  target: string;
  importedBatchId: string;
  updatedAt: Date;
};

type ImportedTypeDoc = {
  name: string;
  doubleDamageFrom: string[];
  doubleDamageTo: string[];
  halfDamageFrom: string[];
  halfDamageTo: string[];
  noDamageFrom: string[];
  noDamageTo: string[];
  importedBatchId: string;
  updatedAt: Date;
};

export type ImportSummary = {
  targetPokemon: number;
  maxPokedexId: number | null;
  importedPokemon: number;
  importedMoves: number;
  importedTypes: number;
  skippedPokemon: number;
};

export type ImportOptions = {
  targetPokemon?: number;
  maxPokedexId?: number;
};

const isBattleMoveDoc = (move: ImportedMoveDoc): boolean => {
  if (move.accuracy === null || move.power === null) {
    return false;
  }

  if (move.power <= 0) {
    return false;
  }

  return move.damageClass === "physical" || move.damageClass === "special";
};

const toBaseStats = (stats: PokemonResponse["stats"]): Record<string, number> => {
  const parsed = stats.map((entry) => [entry.stat.name, entry.base_stat] as const);
  return Object.fromEntries(parsed);
};

const getSpriteUrls = (pokemon: PokemonResponse): { front: string | null; back: string | null } => {
  return {
    front: pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default,
    back: pokemon.sprites.back_default,
  };
};

const getShowdownSpriteUrls = (pokemonId: number): { front: string; back: string } => ({
  front: `${SHOWDOWN_SPRITES_BASE}/${pokemonId}.gif`,
  back: `${SHOWDOWN_SPRITES_BASE}/back/${pokemonId}.gif`,
});

const getBwAnimatedSpriteUrls = (pokemonId: number): { front: string; back: string } => ({
  front: `${BW_SPRITES_BASE}/${pokemonId}.gif`,
  back: `${BW_SPRITES_BASE}/back/${pokemonId}.gif`,
});

const getPublicBaseUrl = (): string => env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`;

const toPublicSpriteUrl = (relativePath: string): string => {
  const normalized = relativePath.replace(/\\/g, "/");
  return `${getPublicBaseUrl()}/sprites/${normalized}`;
};

const cacheSprite = async (url: string | null, relativePath: string): Promise<string | null> => {
  if (!url) {
    return null;
  }

  const filePath = resolve(SPRITES_ROOT, relativePath);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return toPublicSpriteUrl(relativePath);
  }

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  await mkdir(dirname(filePath), { recursive: true });
  await Bun.write(filePath, await response.arrayBuffer());
  return toPublicSpriteUrl(relativePath);
};

const cacheSpriteSet = async (
  baseDir: string,
  pokemonId: number,
  extension: "png" | "gif",
  urls: { front: string | null; back: string | null },
): Promise<{ front: string | null; back: string | null }> => {
  const frontPath = `${baseDir}/${pokemonId}/front.${extension}`;
  const backPath = `${baseDir}/${pokemonId}/back.${extension}`;
  const [frontCached, backCached] = await Promise.all([
    cacheSprite(urls.front, frontPath),
    cacheSprite(urls.back, backPath),
  ]);
  return {
    front: frontCached,
    back: backCached,
  };
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed request to ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
};

const getCollections = (db: Db): {
  pokemon: Collection<ImportedPokemonDoc>;
  moves: Collection<ImportedMoveDoc>;
  types: Collection<ImportedTypeDoc>;
} => {
  return {
    pokemon: db.collection<ImportedPokemonDoc>("pokemon"),
    moves: db.collection<ImportedMoveDoc>("moves"),
    types: db.collection<ImportedTypeDoc>("types"),
  };
};

const ensureCollectionIndexes = async (db: Db): Promise<void> => {
  const { pokemon, moves, types } = getCollections(db);
  await Promise.all([
    pokemon.createIndex({ pokedexId: 1 }, { unique: true }),
    pokemon.createIndex({ name: 1 }, { unique: true }),
    moves.createIndex({ name: 1 }, { unique: true }),
    types.createIndex({ name: 1 }, { unique: true }),
  ]);
};

const getEnglishEffectEntry = (
  effectEntries: MoveResponse["effect_entries"],
): { shortEffect: string | null; effect: string | null } => {
  const english = effectEntries.find((entry) => entry.language.name === "en");
  return {
    shortEffect: english?.short_effect ?? null,
    effect: english?.effect ?? null,
  };
};

const buildTypeDoc = (typeData: TypeResponse, batchId: string, now: Date): ImportedTypeDoc => {
  return {
    name: typeData.name,
    doubleDamageFrom: typeData.damage_relations.double_damage_from.map((entry) => entry.name),
    doubleDamageTo: typeData.damage_relations.double_damage_to.map((entry) => entry.name),
    halfDamageFrom: typeData.damage_relations.half_damage_from.map((entry) => entry.name),
    halfDamageTo: typeData.damage_relations.half_damage_to.map((entry) => entry.name),
    noDamageFrom: typeData.damage_relations.no_damage_from.map((entry) => entry.name),
    noDamageTo: typeData.damage_relations.no_damage_to.map((entry) => entry.name),
    importedBatchId: batchId,
    updatedAt: now,
  };
};

const buildMoveDoc = (move: MoveResponse, batchId: string, now: Date): ImportedMoveDoc => {
  const effectInfo = getEnglishEffectEntry(move.effect_entries);
  return {
    name: move.name,
    type: move.type.name,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    priority: move.priority,
    damageClass: move.damage_class.name,
    effectShort: effectInfo.shortEffect,
    effect: effectInfo.effect,
    effectChance: move.effect_chance,
    target: move.target.name,
    importedBatchId: batchId,
    updatedAt: now,
  };
};

const upsertTypeDocs = async (
  typeDocs: ImportedTypeDoc[],
  db: Db,
): Promise<void> => {
  const { types } = getCollections(db);

  await Promise.all(
    typeDocs.map((doc) =>
      types.updateOne(
        { name: doc.name },
        { $set: doc },
        { upsert: true },
      ),
    ),
  );
};

const upsertMoveDocs = async (
  moveDocs: ImportedMoveDoc[],
  db: Db,
): Promise<void> => {
  const { moves } = getCollections(db);

  await Promise.all(
    moveDocs.map((doc) =>
      moves.updateOne(
        { name: doc.name },
        { $set: doc },
        { upsert: true },
      ),
    ),
  );
};

const upsertPokemonDoc = async (
  pokemonDoc: ImportedPokemonDoc,
  db: Db,
): Promise<void> => {
  const { pokemon } = getCollections(db);

  await pokemon.updateOne(
    { pokedexId: pokemonDoc.pokedexId },
    { $set: pokemonDoc },
    { upsert: true },
  );
};

const toMoveDocArray = (moveCache: Map<string, ImportedMoveDoc>): ImportedMoveDoc[] => {
  return [...moveCache.values()];
};

const fetchMove = async (
  moveName: string,
  moveCache: Map<string, ImportedMoveDoc>,
  batchId: string,
  now: Date,
): Promise<ImportedMoveDoc> => {
  const cached = moveCache.get(moveName);
  if (cached) {
    return cached;
  }

  const moveData = await fetchJson<MoveResponse>(`${POKEAPI_BASE}/move/${moveName}`);
  const moveDoc = buildMoveDoc(moveData, batchId, now);
  moveCache.set(moveName, moveDoc);
  return moveDoc;
};

const getFirstNUnique = (values: string[], count: number): string[] => {
  return [...new Set(values)].slice(0, count);
};

const getTypeDocsToImport = async (
  db: Db,
  usedTypes: Set<string>,
  batchId: string,
  now: Date,
): Promise<ImportedTypeDoc[]> => {
  const typeDocs: ImportedTypeDoc[] = [];
  const typeNames = [...usedTypes];
  const { types } = getCollections(db);
  const existingDocs = await types.find({ name: { $in: typeNames } }).toArray();
  const existingDocsByName = new Map(existingDocs.map((doc) => [doc.name, doc]));

  for (const typeName of typeNames) {
    const existingDoc = existingDocsByName.get(typeName);
    if (existingDoc) {
      typeDocs.push({
        name: existingDoc.name,
        doubleDamageFrom: existingDoc.doubleDamageFrom,
        doubleDamageTo: existingDoc.doubleDamageTo,
        halfDamageFrom: existingDoc.halfDamageFrom,
        halfDamageTo: existingDoc.halfDamageTo,
        noDamageFrom: existingDoc.noDamageFrom,
        noDamageTo: existingDoc.noDamageTo,
        importedBatchId: batchId,
        updatedAt: now,
      });
      continue;
    }

    const typeData = await fetchJson<TypeResponse>(`${POKEAPI_BASE}/type/${typeName}`);
    typeDocs.push(buildTypeDoc(typeData, batchId, now));
  }

  return typeDocs;
};

export const importFromPokeApi = async (
  options: ImportOptions | number = {},
): Promise<ImportSummary> => {
  const opts: ImportOptions = typeof options === "number" ? { targetPokemon: options } : options;
  const targetPokemon = opts.targetPokemon ?? DEFAULT_TARGET_POKEMON;
  const maxPokedexId = opts.maxPokedexId ?? null;

  if (!Number.isInteger(targetPokemon) || targetPokemon <= 0) {
    throw new Error("targetPokemon must be a positive integer");
  }

  if (maxPokedexId !== null && (!Number.isInteger(maxPokedexId) || maxPokedexId <= 0)) {
    throw new Error("maxPokedexId must be a positive integer when provided");
  }

  const db = await getDb();
  await ensureCollectionIndexes(db);

  const batchId = `${Date.now()}`;
  const now = new Date();
  const moveCache = new Map<string, ImportedMoveDoc>();
  const usedTypes = new Set<string>();

  const pokemonList = await fetchJson<PokemonListResponse>(
    `${POKEAPI_BASE}/pokemon?limit=1302&offset=0`,
  );

  let importedPokemon = 0;
  let skippedPokemon = 0;
  let stopByPokedexCap = false;

  for (const pokemonRef of pokemonList.results) {
    if (importedPokemon >= targetPokemon) {
      break;
    }

    const pokemonData = await fetchJson<PokemonResponse>(pokemonRef.url);

    if (maxPokedexId !== null && pokemonData.id > maxPokedexId) {
      stopByPokedexCap = true;
      break;
    }

    const uniqueMoveNames = getFirstNUnique(
      pokemonData.moves.map((entry) => entry.move.name),
      pokemonData.moves.length,
    );

    const moveDocs = await Promise.all(
      uniqueMoveNames.map((moveName) => fetchMove(moveName, moveCache, batchId, now)),
    );

    const battleMoveIds = getFirstNUnique(
      moveDocs.filter((moveDoc) => isBattleMoveDoc(moveDoc)).map((moveDoc) => moveDoc.name),
      BATTLE_MOVE_COUNT,
    );

    if (battleMoveIds.length < BATTLE_MOVE_COUNT) {
      skippedPokemon += 1;
      continue;
    }

    const sortedTypes = [...pokemonData.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name);

    for (const typeName of sortedTypes) {
      usedTypes.add(typeName);
    }

    const remoteSprites = getSpriteUrls(pokemonData);
    const staticSprites = await cacheSpriteSet("static", pokemonData.id, "png", remoteSprites);
    const showdownSprites = await cacheSpriteSet(
      "animated/showdown",
      pokemonData.id,
      "gif",
      getShowdownSpriteUrls(pokemonData.id),
    );
    const bwSprites = await cacheSpriteSet(
      "animated/bw",
      pokemonData.id,
      "gif",
      getBwAnimatedSpriteUrls(pokemonData.id),
    );
    const animatedFront = showdownSprites.front ?? bwSprites.front ?? staticSprites.front;
    const animatedBack = showdownSprites.back ?? bwSprites.back ?? staticSprites.back;
    const pokemonDoc: ImportedPokemonDoc = {
      pokedexId: pokemonData.id,
      name: pokemonData.name,
      types: sortedTypes,
      baseStats: toBaseStats(pokemonData.stats),
      spriteUrl: staticSprites.front,
      spriteFrontUrl: staticSprites.front,
      spriteBackUrl: staticSprites.back,
      spriteAnimatedFrontUrl: animatedFront,
      spriteAnimatedBackUrl: animatedBack,
      moveIds: moveDocs.map((moveDoc) => moveDoc.name),
      battleMoveIds,
      importedBatchId: batchId,
      updatedAt: now,
    };

    await upsertPokemonDoc(pokemonDoc, db);
    importedPokemon += 1;
  }

  if (!stopByPokedexCap && importedPokemon < targetPokemon) {
    throw new Error(
      `Could not import ${targetPokemon} Pokemon with 4 unique valid battle moves. Imported: ${importedPokemon}`,
    );
  }

  const typeDocs = await getTypeDocsToImport(db, usedTypes, batchId, now);
  await upsertTypeDocs(typeDocs, db);
  await upsertMoveDocs(toMoveDocArray(moveCache), db);

  const { pokemon, moves, types } = getCollections(db);
  await Promise.all([
    pokemon.deleteMany({ importedBatchId: { $ne: batchId } }),
    moves.deleteMany({ importedBatchId: { $ne: batchId } }),
    types.deleteMany({ importedBatchId: { $ne: batchId } }),
  ]);

  return {
    targetPokemon,
    maxPokedexId,
    importedPokemon,
    importedMoves: moveCache.size,
    importedTypes: typeDocs.length,
    skippedPokemon,
  };
};
