import React, { Component, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const STORAGE_KEY = "chute_plataforma_mvp_v5";
const THEME_KEY = "chute_plataforma_theme";
const APP_VERSION = "1.9.0";
const DATA_VERSION = 6;


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function safeAliasFromEmail(email = "") {
  return (email.split("@")[0] || "jugador")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 22) || "jugador";
}

function profileToLocalUser(profile, authUser) {
  const name = profile?.full_name || authUser?.user_metadata?.full_name || profile?.alias || authUser?.email || "Jugador";
  return {
    id: profile?.id || authUser?.id,
    name,
    alias: profile?.alias || authUser?.user_metadata?.alias || safeAliasFromEmail(authUser?.email),
    createdAt: (profile?.created_at || new Date().toISOString()).slice(0, 10),
    cloud: true
  };
}

function cloudProfileToLocalUser(profile) {
  if (!profile?.id) return null;
  return {
    id: profile.id,
    name: profile.full_name || profile.alias || "Jugador",
    alias: profile.alias || "Sin alias",
    createdAt: (profile.created_at || new Date().toISOString()).slice(0, 10),
    cloud: true
  };
}

function cloudFriendshipToLocal(row) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: (row.created_at || new Date().toISOString()).slice(0, 10),
    respondedAt: row.responded_at || null,
    cloud: true
  };
}

function cloudTournamentToLocal(row, participants = [], joinRequests = [], matches = [], activityRows = [], summaryRow = null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    format: row.format || "league",
    visibility: row.visibility || "private",
    status: row.status || "preparing",
    allowDuplicateTeams: Boolean(row.allow_duplicate_teams),
    teamSelectionMode: row.team_selection_mode || "fixed",
    fixtureMode: row.fixture_mode || "single_leg",
    thirdPlaceEnabled: Boolean(row.third_place_enabled),
    inviteCode: row.invite_code || makeInviteCode(row.name || "CHUTE"),
    season: row.season || CURRENT_SEASON,
    creatorId: row.creator_id,
    createdAt: (row.created_at || new Date().toISOString()).slice(0, 10),
    participants: participants.map((p) => ({ userId: p.user_id, teamId: p.team_id || null, joinedAt: (p.joined_at || new Date().toISOString()).slice(0, 10), joinedByCode: Boolean(p.joined_by_code), cloud: true })),
    matches: matches.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    championUserId: row.champion_user_id || null,
    championTeamId: row.champion_team_id || null,
    joinRequests: joinRequests.map((r) => ({ id: r.id, userId: r.user_id, teamId: r.requested_team_id || null, status: r.status, requestedAt: (r.requested_at || new Date().toISOString()).slice(0, 10), resolvedAt: r.resolved_at || null, resolvedBy: r.resolved_by || null, reason: r.reason || "", cloud: true })),
    activity: activityRows.map(cloudActivityToLocal),
    historySummary: summaryRow ? cloudTournamentSummaryToLocal(summaryRow) : null,
    cloud: true
  };
}

function cloudInvitationToLocal(row) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: (row.created_at || new Date().toISOString()).slice(0, 10),
    respondedAt: row.responded_at || null,
    cloud: true
  };
}

function cloudGoalEventToLocal(row) {
  return {
    id: row.id,
    matchId: row.match_id,
    tournamentId: row.tournament_id,
    teamId: row.team_id,
    userId: row.user_id,
    side: row.side || "home",
    playerName: row.player_name,
    assistName: row.assist_name || "",
    minute: row.minute || "",
    createdBy: row.created_by || null,
    createdAt: (row.created_at || new Date().toISOString()).slice(0, 10),
    cloud: true
  };
}

function cloudMatchToLocal(row, goalRows = []) {
  const proposalActive = ["pending_confirmation", "rejected"].includes(row.result_status) && row.proposed_home_goals !== null && row.proposed_home_goals !== undefined;
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    round: row.round,
    homeUserId: row.home_user_id,
    awayUserId: row.away_user_id,
    homeTeamId: row.home_team_id || null,
    awayTeamId: row.away_team_id || null,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
    resultStatus: row.result_status || null,
    resultProposal: proposalActive ? {
      homeGoals: row.proposed_home_goals,
      awayGoals: row.proposed_away_goals,
      proposedBy: row.proposed_by,
      status: row.result_status === "rejected" ? "rejected" : "pending",
      createdAt: (row.created_at || new Date().toISOString()).slice(0, 10),
      penaltyWinnerUserId: row.proposed_penalty_winner_user_id || null
    } : null,
    proposedBy: row.proposed_by || null,
    confirmedBy: row.confirmed_by || null,
    playedAt: row.played_at || null,
    sortOrder: row.sort_order ?? 0,
    stage: row.stage || null,
    bracketRound: row.bracket_round || null,
    bracketSlot: row.bracket_slot ?? null,
    nextMatchId: row.next_match_id || null,
    nextSide: row.next_side || null,
    loserNextMatchId: row.loser_next_match_id || null,
    loserNextSide: row.loser_next_side || null,
    winnerUserId: row.winner_user_id || null,
    penaltyWinnerUserId: row.penalty_winner_user_id || null,
    proposedPenaltyWinnerUserId: row.proposed_penalty_winner_user_id || null,
    goalEvents: goalRows.map(cloudGoalEventToLocal),
    cloud: true
  };
}

function cloudActivityToLocal(row) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    userId: row.user_id || null,
    createdAt: (row.created_at || new Date().toISOString()).slice(0, 10),
    cloud: true
  };
}

function cloudTournamentSummaryToLocal(row) {
  if (!row?.tournament_id) return null;
  return {
    tournamentId: row.tournament_id,
    championUserId: row.champion_user_id || null,
    championTeamId: row.champion_team_id || null,
    runnerUpUserId: row.runner_up_user_id || null,
    runnerUpTeamId: row.runner_up_team_id || null,
    bestAttackTeamId: row.best_attack_team_id || null,
    bestDefenseTeamId: row.best_defense_team_id || null,
    topScorerName: row.top_scorer_name || "",
    topScorerTeamId: row.top_scorer_team_id || null,
    topScorerGoals: Number(row.top_scorer_goals || 0),
    topAssistName: row.top_assist_name || "",
    topAssistTeamId: row.top_assist_team_id || null,
    topAssistCount: Number(row.top_assist_count || 0),
    bestPlayerName: row.best_player_name || "",
    bestPlayerTeamId: row.best_player_team_id || null,
    bestPlayerGoals: Number(row.best_player_goals || 0),
    bestPlayerAssists: Number(row.best_player_assists || 0),
    bestPlayerContributions: Number(row.best_player_contributions || 0),
    playedMatches: Number(row.played_matches || 0),
    totalGoals: Number(row.total_goals || 0),
    finishedAt: row.finished_at || null,
    summary: row.summary_json || {},
    cloud: true
  };
}


function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCloudUserRanking(rows = []) {
  return rows.map((row, index) => ({
    pos: numberValue(row.pos, index + 1),
    userId: row.user_id,
    name: row.name || "Jugador",
    tournaments: numberValue(row.tournaments),
    pj: numberValue(row.pj),
    pg: numberValue(row.pg),
    pe: numberValue(row.pe),
    pp: numberValue(row.pp),
    gf: numberValue(row.gf),
    gc: numberValue(row.gc),
    dg: numberValue(row.dg),
    pts: numberValue(row.pts),
    titles: numberValue(row.titles),
    performance: numberValue(row.performance),
    score: numberValue(row.score),
    status: row.status || (numberValue(row.pj) >= 5 ? "Clasificado" : "En clasificación"),
    cloud: true
  }));
}

function normalizeCloudTeamRanking(rows = []) {
  return rows.map((row, index) => ({
    pos: numberValue(row.pos, index + 1),
    teamId: row.team_id,
    name: row.name || row.team_id || "Equipo",
    tournaments: numberValue(row.tournaments),
    pj: numberValue(row.pj),
    pg: numberValue(row.pg),
    pe: numberValue(row.pe),
    pp: numberValue(row.pp),
    gf: numberValue(row.gf),
    gc: numberValue(row.gc),
    dg: numberValue(row.dg),
    pts: numberValue(row.pts),
    titles: numberValue(row.titles),
    performance: numberValue(row.performance),
    score: numberValue(row.score),
    cloud: true
  }));
}

function normalizeCloudUserTeamRanking(rows = []) {
  return rows.map((row, index) => ({
    pos: numberValue(row.pos, index + 1),
    key: `${row.user_id}_${row.team_id}`,
    userId: row.user_id,
    teamId: row.team_id,
    userName: row.user_name || "Jugador",
    teamName: row.team_name || row.team_id || "Equipo",
    name: `${row.user_name || "Jugador"} + ${row.team_name || row.team_id || "Equipo"}`,
    tournaments: numberValue(row.tournaments),
    pj: numberValue(row.pj),
    pg: numberValue(row.pg),
    pe: numberValue(row.pe),
    pp: numberValue(row.pp),
    gf: numberValue(row.gf),
    gc: numberValue(row.gc),
    dg: numberValue(row.dg),
    pts: numberValue(row.pts),
    titles: numberValue(row.titles),
    performance: numberValue(row.performance),
    score: numberValue(row.score),
    cloud: true
  }));
}

function normalizeCloudPlayerRanking(rows = []) {
  return rows.map((row, index) => ({
    pos: numberValue(row.pos, index + 1),
    key: `${row.team_id}_${row.player_name}`,
    playerName: row.player_name || "Jugador",
    teamId: row.team_id,
    teamName: row.team_name || row.team_id || "Equipo",
    goals: numberValue(row.goals),
    assists: numberValue(row.assists),
    contributions: numberValue(row.contributions, numberValue(row.goals) + numberValue(row.assists)),
    tournaments: numberValue(row.tournaments),
    last: row.last || "Sin registro",
    cloud: true
  }));
}

function cleanSearchTerm(value = "") {
  return String(value)
    .trim()
    .replace(/[%,]/g, "")
    .slice(0, 40);
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

const TEAMS = [
  {
    id: "trucha",
    name: "Sporting La Trucha",
    short: "La Trucha",
    badge: "ST",
    tone: "azul",
    logo: "/team-logos/trucha.png",
    coach: "Bruno Benítez",
    players: [
      ["Eddy Pino", "Arquero"], ["Burt McCloskey", "Defensa"], ["Dominic Mortensen", "Defensa"], ["Donald Ortega", "Defensa"], ["Mario Luna", "Defensa"],
      ["Angelo Carboni", "Medio"], ["Jerold Bogan", "Medio"], ["Kelly Rivera", "Medio"], ["Wilfredo Fernandez", "Medio"],
      ["Boris Lentz", "Delantero"], ["Dino Richi", "Delantero"], ["Eric Perry", "Delantero"], ["Faustino Soriano", "Delantero"], ["Ricky Watkins", "Delantero"]
    ]
  },
  {
    id: "guanaco",
    name: "C.S.D El Guanaco",
    short: "El Guanaco",
    badge: "EG",
    tone: "rojo",
    logo: "/team-logos/guanaco.png",
    coach: "Hank Romano",
    players: [
      ["Rosendo Acosta", "Arquero"], ["Bo de la Rosa", "Defensa"], ["Carmelo Wilkinson", "Defensa"], ["Robbie Solomon", "Defensa"], ["Warner Ferrera", "Defensa"],
      ["Chuck Chong", "Medio"], ["Donovan Vinson", "Medio"], ["Harley Peralta", "Medio"], ["Wilton Blackwood", "Medio"],
      ["Davis Bronson", "Delantero"], ["Irwin Medeiros", "Delantero"], ["Lonny Ventura", "Delantero"], ["Sid Koslowski", "Delantero"], ["Sonny Saldana", "Delantero"]
    ]
  },
  {
    id: "pantera",
    name: "Atlético Pantera",
    short: "Pantera",
    badge: "AP",
    tone: "morado",
    logo: "/team-logos/pantera.png",
    coach: "Nina Taylor",
    players: [
      ["Rita Malone", "Arquero"], ["Belinda Sparks", "Defensa"], ["Mandy Wallace", "Defensa"], ["Nora Cruz", "Defensa"], ["Sabrina Mendoza", "Defensa"],
      ["Lina Yamamoto", "Medio"], ["Margaret Castillo", "Medio"], ["Rebeca Sanders", "Medio"], ["Sherry Terry", "Medio"],
      ["Cindy Fitzgerald", "Delantero"], ["Jackie Sanchez", "Delantero"], ["Nancy King", "Delantero"], ["Roxie Jones", "Delantero"], ["Sharon Ortiz", "Delantero"]
    ]
  },
  {
    id: "parrilla",
    name: "La Parrilla F.C.",
    short: "La Parrilla",
    badge: "LP",
    tone: "naranja",
    logo: "/team-logos/parrilla.png",
    coach: "Barry Mack",
    players: [
      ["Alex Meres", "Arquero"], ["Arthur Turok", "Defensa"], ["Freddy Manfredo", "Defensa"], ["Joe Pavo", "Defensa"], ["John Giovanni", "Defensa"],
      ["Claudio Conde", "Medio"], ["El Profesor", "Medio"], ["Peta Zeta", "Medio"], ["Rod Lete", "Medio"], ["Rolando Akira", "Medio"],
      ["El Guaton Nelson", "Delantero"], ["Luis Felipe", "Delantero"], ["Nick Cabezon", "Delantero"], ["Randolph D'Luna", "Delantero"]
    ]
  },
  {
    id: "perla",
    name: "La Perla United",
    short: "La Perla",
    badge: "PU",
    tone: "celeste",
    logo: "/team-logos/perla.png",
    coach: "Cornelius Waters",
    players: [
      ["Eusebio Flowers", "Arquero"], ["Edison Cabrera", "Defensa"], ["Jacinto Chavarria", "Defensa"], ["Lucius Chase", "Defensa"], ["Melvin Clayton", "Defensa"],
      ["Archie Jackson", "Medio"], ["Eric Reyes", "Medio"], ["Sammy Portillo", "Medio"], ["Toyo Takahashi", "Medio"],
      ["El Kraken", "Delantero"], ["Julio Vega", "Delantero"], ["Marty Love", "Delantero"], ["Omar Watson", "Delantero"], ["Randolph Salazar", "Delantero"], ["Steven Ramos", "Delantero"]
    ]
  },
  {
    id: "polpetta",
    name: "Sportivo La Polpetta",
    short: "La Polpetta",
    badge: "SP",
    tone: "verde",
    logo: "/team-logos/polpetta.png",
    coach: "Giuseppe Perlatore",
    players: [
      ["Vito Volta", "Arquero"], ["Enzo Mancini", "Defensa"], ["Fabio Clemenza", "Defensa"], ["Giorgio Valentino", "Defensa"], ["Rocco Carusso", "Defensa"],
      ["Donnie Spumoni", "Medio"], ["Fiorino Panicucci", "Medio"], ["Mario De Luca", "Medio"], ["Milo Gorgazzi", "Medio"],
      ["Alessandro Zito", "Delantero"], ["Freddo Bellini", "Delantero"], ["Giulio Locatelli", "Delantero"], ["Nicola Pisani", "Delantero"], ["Paolo Fontana", "Delantero"]
    ]
  }
];

const PLAYER_PHOTOS = {
  "trucha": {
    "Eddy Pino": "/player-photos/trucha/eddy-pino.png",
    "Burt McCloskey": "/player-photos/trucha/burt-mccloskey.png",
    "Dominic Mortensen": "/player-photos/trucha/dominic-mortensen.png",
    "Donald Ortega": "/player-photos/trucha/donald-ortega.png",
    "Mario Luna": "/player-photos/trucha/mario-luna.png",
    "Angelo Carboni": "/player-photos/trucha/angelo-carboni.png",
    "Jerold Bogan": "/player-photos/trucha/jerold-bogan.png",
    "Kelly Rivera": "/player-photos/trucha/kelly-rivera.png",
    "Wilfredo Fernandez": "/player-photos/trucha/wilfredo-fernandez.png",
    "Boris Lentz": "/player-photos/trucha/boris-lentz.png",
    "Dino Richi": "/player-photos/trucha/dino-richi.png",
    "Eric Perry": "/player-photos/trucha/eric-perry.png",
    "Faustino Soriano": "/player-photos/trucha/faustino-soriano.png",
    "Ricky Watkins": "/player-photos/trucha/ricky-watkins.png"
  },
  "guanaco": {
    "Rosendo Acosta": "/player-photos/guanaco/rosendo-acosta.png",
    "Bo de la Rosa": "/player-photos/guanaco/bo-de-la-rosa.png",
    "Carmelo Wilkinson": "/player-photos/guanaco/carmelo-wilkinson.png",
    "Robbie Solomon": "/player-photos/guanaco/robbie-solomon.png",
    "Warner Ferrera": "/player-photos/guanaco/warner-ferrera.png",
    "Chuck Chong": "/player-photos/guanaco/chuck-chong.png",
    "Donovan Vinson": "/player-photos/guanaco/donovan-vinson.png",
    "Harley Peralta": "/player-photos/guanaco/harley-peralta.png",
    "Wilton Blackwood": "/player-photos/guanaco/wilton-blackwood.png",
    "Davis Bronson": "/player-photos/guanaco/davis-bronson.png",
    "Irwin Medeiros": "/player-photos/guanaco/irwin-medeiros.png",
    "Lonny Ventura": "/player-photos/guanaco/lonny-ventura.png",
    "Sid Koslowski": "/player-photos/guanaco/sid-koslowski.png",
    "Sonny Saldana": "/player-photos/guanaco/sonny-saldana.png"
  },
  "pantera": {
    "Rita Malone": "/player-photos/pantera/rita-malone.png",
    "Belinda Sparks": "/player-photos/pantera/belinda-sparks.png",
    "Mandy Wallace": "/player-photos/pantera/mandy-wallace.png",
    "Nora Cruz": "/player-photos/pantera/nora-cruz.png",
    "Sabrina Mendoza": "/player-photos/pantera/sabrina-mendoza.png",
    "Lina Yamamoto": "/player-photos/pantera/lina-yamamoto.png",
    "Margaret Castillo": "/player-photos/pantera/margaret-castillo.png",
    "Rebeca Sanders": "/player-photos/pantera/rebeca-sanders.png",
    "Sherry Terry": "/player-photos/pantera/sherry-terry.png",
    "Cindy Fitzgerald": "/player-photos/pantera/cindy-fitzgerald.png",
    "Jackie Sanchez": "/player-photos/pantera/jackie-sanchez.png",
    "Nancy King": "/player-photos/pantera/nancy-king.png",
    "Roxie Jones": "/player-photos/pantera/roxie-jones.png",
    "Sharon Ortiz": "/player-photos/pantera/sharon-ortiz.png"
  },
  "parrilla": {
    "Alex Meres": "/player-photos/parrilla/alex-meres.png",
    "Arthur Turok": "/player-photos/parrilla/arthur-turok.png",
    "Freddy Manfredo": "/player-photos/parrilla/freddy-manfredo.png",
    "Joe Pavo": "/player-photos/parrilla/joe-pavo.png",
    "John Giovanni": "/player-photos/parrilla/john-giovanni.png",
    "Claudio Conde": "/player-photos/parrilla/claudio-conde.png",
    "El Profesor": "/player-photos/parrilla/el-profesor.png",
    "Peta Zeta": "/player-photos/parrilla/peta-zeta.png",
    "Rod Lete": "/player-photos/parrilla/rod-lete.png",
    "Rolando Akira": "/player-photos/parrilla/rolando-akira.png",
    "El Guaton Nelson": "/player-photos/parrilla/el-guaton-nelson.png",
    "Luis Felipe": "/player-photos/parrilla/luis-felipe.png",
    "Nick Cabezon": "/player-photos/parrilla/nick-cabezon.png",
    "Randolph D'Luna": "/player-photos/parrilla/randolph-dluna.png"
  },
  "perla": {
    "Eusebio Flowers": "/player-photos/perla/eusebio-flowers.png",
    "Edison Cabrera": "/player-photos/perla/edison-cabrera.png",
    "Jacinto Chavarria": "/player-photos/perla/jacinto-chavarria.png",
    "Lucius Chase": "/player-photos/perla/lucius-chase.png",
    "Melvin Clayton": "/player-photos/perla/melvin-clayton.png",
    "Archie Jackson": "/player-photos/perla/archie-jackson.png",
    "Eric Reyes": "/player-photos/perla/eric-reyes.png",
    "Sammy Portillo": "/player-photos/perla/sammy-portillo.png",
    "Toyo Takahashi": "/player-photos/perla/toyo-takahashi.png",
    "El Kraken": "/player-photos/perla/el-kraken.png",
    "Julio Vega": "/player-photos/perla/julio-vega.png",
    "Marty Love": "/player-photos/perla/marty-love.png",
    "Omar Watson": "/player-photos/perla/omar-watson.png",
    "Randolph Salazar": "/player-photos/perla/randolph-salazar.png",
    "Steven Ramos": "/player-photos/perla/steven-ramos.png"
  },
  "polpetta": {
    "Vito Volta": "/player-photos/polpetta/vito-volta.png",
    "Enzo Mancini": "/player-photos/polpetta/enzo-mancini.png",
    "Fabio Clemenza": "/player-photos/polpetta/fabio-clemenza.png",
    "Giorgio Valentino": "/player-photos/polpetta/giorgio-valentino.png",
    "Rocco Carusso": "/player-photos/polpetta/rocco-carusso.png",
    "Donnie Spumoni": "/player-photos/polpetta/donnie-spumoni.png",
    "Fiorino Panicucci": "/player-photos/polpetta/fiorino-panicucci.png",
    "Mario De Luca": "/player-photos/polpetta/mario-de-luca.png",
    "Milo Gorgazzi": "/player-photos/polpetta/milo-gorgazzi.png",
    "Alessandro Zito": "/player-photos/polpetta/alessandro-zito.png",
    "Freddo Bellini": "/player-photos/polpetta/freddo-bellini.png",
    "Giulio Locatelli": "/player-photos/polpetta/giulio-locatelli.png",
    "Nicola Pisani": "/player-photos/polpetta/nicola-pisani.png",
    "Paolo Fontana": "/player-photos/polpetta/paolo-fontana.png"
  }
};

const CURRENT_SEASON = "Temporada 2026";

const ACHIEVEMENTS = [
  { id: "first_win", title: "Primer triunfo", description: "Gana tu primer partido oficial." },
  { id: "first_title", title: "Primer título", description: "Cierra un torneo como campeón." },
  { id: "five_matches", title: "Jugador estable", description: "Juega al menos 5 partidos oficiales." },
  { id: "perfect_tournament", title: "Invicto", description: "Gana un torneo cerrado sin perder partidos." },
  { id: "goal_machine", title: "Ataque letal", description: "Marca 10 o más goles históricos." },
  { id: "social_player", title: "Comunidad Chute", description: "Tiene al menos 3 amigos aceptados." }
];

const FORMAT_LABELS = {
  league: "Liga",
  league_playoff: "Liga + Playoff",
  groups: "Copa con grupos",
  knockout: "Eliminación directa"
};

const TEAM_SELECTION_LABELS = {
  fixed: "Equipo fijo",
  free_per_match: "Equipo libre por partido"
};

const FIXTURE_MODE_LABELS = {
  single_leg: "Solo ida",
  double_leg: "Ida y vuelta"
};

const STATUS_LABELS = {
  preparing: "En preparación",
  active: "En curso",
  closed: "Finalizado",
  paused: "Pausado"
};

const emptyStats = () => ({ pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, titles: 0, tournaments: 0, score: 0 });

function today(){
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix){
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function makeInviteCode(name = "CHUTE"){
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 5)
    .toUpperCase() || "CHUTE";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

const seedState = () => ({
  currentUserId: "guest_user",
  currentSeason: CURRENT_SEASON,
  seasons: [CURRENT_SEASON, "Histórico"],
  users: [
    { id: "guest_user", name: "Jugador invitado", alias: "Jugador", createdAt: today() }
  ],
  friends: [],
  invitations: [],
  teams: TEAMS,
  tournaments: [],
  meta: { dataVersion: DATA_VERSION, migratedAt: today(), release: APP_VERSION }
});


function hydrateTeams(savedTeams){
  const saved = Array.isArray(savedTeams) ? savedTeams : [];
  const officialIds = new Set(TEAMS.map((team) => team.id));
  const mergedOfficial = TEAMS.map((team) => {
    const old = saved.find((item) => item?.id === team.id) || {};
    return {
      ...team,
      ...old,
      name: team.name,
      short: team.short,
      badge: team.badge,
      tone: team.tone,
      logo: team.logo,
      coach: old.coach || team.coach,
      players: old.players?.length ? old.players : team.players
    };
  });
  const custom = saved.filter((team) => team?.id && !officialIds.has(team.id));
  return [...mergedOfficial, ...custom];
}

function normalizeState(parsed){
  const seeded = seedState();
  return {
    ...seeded,
    ...parsed,
    meta: { ...(parsed?.meta || {}), dataVersion: DATA_VERSION, release: APP_VERSION, migratedAt: parsed?.meta?.migratedAt || today() },
    teams: hydrateTeams(parsed?.teams),
    currentSeason: parsed?.currentSeason || CURRENT_SEASON,
    seasons: parsed?.seasons?.length ? parsed.seasons : [CURRENT_SEASON, "Histórico"],
    friends: parsed?.friends || [],
    invitations: parsed?.invitations || [],
    tournaments: (parsed?.tournaments || []).map((t) => ({
      description: "",
      status: t.matches?.length ? "active" : "preparing",
      allowDuplicateTeams: false,
      teamSelectionMode: t.teamSelectionMode || t.team_selection_mode || "fixed",
      fixtureMode: t.fixtureMode || t.fixture_mode || "single_leg",
      thirdPlaceEnabled: Boolean(t.thirdPlaceEnabled || t.third_place_enabled),
      inviteCode: t.inviteCode || makeInviteCode(t.name || "CHUTE"),
      season: t.season || CURRENT_SEASON,
      championUserId: null,
      championTeamId: null,
      ...t,
      participants: (t.participants || []).map((p) => ({ joinedAt: t.createdAt || today(), ...p })),
      matches: (t.matches || []).map((m) => ({ resultStatus: matchPlayed(m) ? "confirmed" : null, resultProposal: null, goalEvents: [], ...m })),
      joinRequests: t.joinRequests || [],
      activity: t.activity || []
    }))
  };
}

function loadInitialState(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const initial = seedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return normalizeState(JSON.parse(saved));
  } catch {
    return seedState();
  }
}

function saveState(next){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function roundRobin(participants, options = {}){
  const players = participants.map((p) => ({ ...p }));
  if (players.length % 2 !== 0) players.push({ userId: null, teamId: null, bye: true });

  const firstLeg = [];
  const secondLeg = [];
  const totalRounds = players.length - 1;
  const half = players.length / 2;
  const doubleLeg = Boolean(options.doubleLeg || options.roundTrip || options.fixtureMode === "double_leg");
  let rotation = [...players];

  function makeMatch(home, away, roundLabel){
    return {
      id: uid("m"),
      round: roundLabel,
      homeUserId: home.userId,
      awayUserId: away.userId,
      homeTeamId: options.freeTeams ? null : home.teamId,
      awayTeamId: options.freeTeams ? null : away.teamId,
      homeGoals: null,
      awayGoals: null,
      resultStatus: null,
      resultProposal: null,
      goalEvents: [],
      playedAt: null
    };
  }

  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];
      if (!a.bye && !b.bye) {
        const swap = round % 2 === 0;
        const firstHome = swap ? b : a;
        const firstAway = swap ? a : b;
        firstLeg.push(makeMatch(firstHome, firstAway, doubleLeg ? `Fecha ${round} · Ida` : `Fecha ${round}`));
        if (doubleLeg) secondLeg.push(makeMatch(firstAway, firstHome, `Fecha ${totalRounds + round} · Vuelta`));
      }
    }
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, rotation.length - 1)];
  }
  return doubleLeg ? [...firstLeg, ...secondLeg] : firstLeg;
}


function safeRandomId(prefix = "m", uuid = false){
  if (uuid && globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return uid(prefix);
}

function isKnockoutTournament(tournament){
  return tournament?.format === "knockout";
}

function isPowerOfTwo(value){
  return value > 0 && (value & (value - 1)) === 0;
}

function playoffStageLabel(roundIndex, totalRounds){
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semifinal";
  if (remaining === 3) return "Cuartos de final";
  if (remaining === 4) return "Octavos de final";
  return `Ronda ${roundIndex}`;
}

function buildTournamentFixture(tournament, options = {}){
  if (isKnockoutTournament(tournament)) {
    return knockoutBracket(tournament.participants || [], {
      freeTeams: isFreeTeamTournament(tournament),
      thirdPlaceEnabled: Boolean(tournament.thirdPlaceEnabled),
      uuidIds: options.uuidIds
    });
  }
  return roundRobin(tournament.participants || [], {
    freeTeams: isFreeTeamTournament(tournament),
    doubleLeg: isDoubleLegTournament(tournament)
  });
}

function knockoutBracket(participants, options = {}){
  const players = (participants || []).map((p) => ({ ...p }));
  if (!isPowerOfTwo(players.length) || players.length < 2) {
    throw new Error("La eliminación directa necesita 2, 4, 8 o 16 participantes confirmados.");
  }
  const freeTeams = Boolean(options.freeTeams);
  const totalRounds = Math.log2(players.length);
  const rounds = [];
  let sortOrder = 1;
  let previousRoundMatches = [];

  for (let roundIndex = 1; roundIndex <= totalRounds; roundIndex++) {
    const stage = playoffStageLabel(roundIndex, totalRounds);
    const matchesInRound = players.length / Math.pow(2, roundIndex);
    const currentRound = [];
    for (let slot = 1; slot <= matchesInRound; slot++) {
      const isFirstRound = roundIndex === 1;
      const homeParticipant = isFirstRound ? players[(slot - 1) * 2] : null;
      const awayParticipant = isFirstRound ? players[(slot - 1) * 2 + 1] : null;
      currentRound.push({
        id: safeRandomId("m", options.uuidIds),
        round: matchesInRound === 1 ? "Final" : `${stage} ${slot}`,
        stage: stage.toLowerCase().replaceAll(" ", "_"),
        bracketRound: roundIndex,
        bracketSlot: slot,
        homeUserId: homeParticipant?.userId || null,
        awayUserId: awayParticipant?.userId || null,
        homeTeamId: freeTeams ? null : (homeParticipant?.teamId || null),
        awayTeamId: freeTeams ? null : (awayParticipant?.teamId || null),
        homeGoals: null,
        awayGoals: null,
        resultStatus: null,
        resultProposal: null,
        goalEvents: [],
        playedAt: null,
        sortOrder: sortOrder++,
        nextMatchId: null,
        nextSide: null,
        loserNextMatchId: null,
        loserNextSide: null,
        winnerUserId: null,
        penaltyWinnerUserId: null
      });
    }
    previousRoundMatches.forEach((match, index) => {
      const target = currentRound[Math.floor(index / 2)];
      if (target) {
        match.nextMatchId = target.id;
        match.nextSide = index % 2 === 0 ? "home" : "away";
      }
    });
    rounds.push(currentRound);
    previousRoundMatches = currentRound;
  }

  if (options.thirdPlaceEnabled && players.length >= 4) {
    const semifinals = rounds[rounds.length - 2] || [];
    const third = {
      id: safeRandomId("m", options.uuidIds),
      round: "Tercer lugar",
      stage: "tercer_lugar",
      bracketRound: totalRounds,
      bracketSlot: 99,
      homeUserId: null,
      awayUserId: null,
      homeTeamId: null,
      awayTeamId: null,
      homeGoals: null,
      awayGoals: null,
      resultStatus: null,
      resultProposal: null,
      goalEvents: [],
      playedAt: null,
      sortOrder: sortOrder++,
      nextMatchId: null,
      nextSide: null,
      loserNextMatchId: null,
      loserNextSide: null,
      winnerUserId: null,
      penaltyWinnerUserId: null
    };
    semifinals.forEach((match, index) => {
      match.loserNextMatchId = third.id;
      match.loserNextSide = index === 0 ? "home" : "away";
    });
    rounds.push([third]);
  }

  return rounds.flat();
}

function playoffMatchReady(match){
  return Boolean(match?.homeUserId && match?.awayUserId);
}

function getMatchWinnerUserId(match){
  if (!matchPlayed(match)) return null;
  const home = Number(match.homeGoals);
  const away = Number(match.awayGoals);
  if (home > away) return match.homeUserId;
  if (away > home) return match.awayUserId;
  return match.penaltyWinnerUserId || match.resultProposal?.penaltyWinnerUserId || null;
}

function getMatchLoserUserId(match){
  const winner = getMatchWinnerUserId(match);
  if (!winner) return null;
  return winner === match.homeUserId ? match.awayUserId : match.homeUserId;
}


function getKnockoutFinalMatch(tournament){
  if (!isKnockoutTournament(tournament)) return null;
  return (tournament.matches || []).find((m) => m.stage === "final" || m.round === "Final") || null;
}

function buildKnockoutResultRow(state, tournament, userId, match){
  if (!userId || !match) return null;
  const user = getUser(state, userId);
  const side = userId === match.homeUserId ? "home" : userId === match.awayUserId ? "away" : null;
  const teamId = side ? getMatchTeamId(tournament, match, side) : getParticipantTeamId(tournament, userId);
  return {
    userId,
    teamId,
    name: user.alias || user.name,
    teamName: getTeam(state, teamId).short || getTeam(state, teamId).name,
    ...emptyStats(),
    performance: 0
  };
}

function getTournamentChampionRow(state, tournament, standings){
  if (isKnockoutTournament(tournament)) {
    const final = getKnockoutFinalMatch(tournament);
    const winnerId = getMatchWinnerUserId(final);
    const row = buildKnockoutResultRow(state, tournament, winnerId, final);
    if (row) return row;
  }
  return standings[0] || null;
}

function getTournamentRunnerUpRow(state, tournament, standings){
  if (isKnockoutTournament(tournament)) {
    const final = getKnockoutFinalMatch(tournament);
    const loserId = getMatchLoserUserId(final);
    const row = buildKnockoutResultRow(state, tournament, loserId, final);
    if (row) return row;
  }
  return standings[1] || null;
}

function getAdvancingTeamId(tournament, match, userId){
  if (!userId) return null;
  if (isFreeTeamTournament(tournament)) return null;
  if (userId === match.homeUserId) return getMatchTeamId(tournament, match, "home") || null;
  if (userId === match.awayUserId) return getMatchTeamId(tournament, match, "away") || null;
  return getParticipantTeamId(tournament, userId) || null;
}

function applyPlayoffAdvancement(tournament, sourceMatchId){
  if (!isKnockoutTournament(tournament)) return;
  const matches = tournament.matches || [];
  const source = matches.find((m) => m.id === sourceMatchId);
  if (!source || !matchPlayed(source)) return;
  const winnerUserId = getMatchWinnerUserId(source);
  const loserUserId = getMatchLoserUserId(source);
  if (!winnerUserId) return;
  source.winnerUserId = winnerUserId;

  const applySide = (targetId, side, userId) => {
    if (!targetId || !side || !userId) return;
    const target = matches.find((m) => m.id === targetId);
    if (!target) return;
    const userKey = side === "home" ? "homeUserId" : "awayUserId";
    const teamKey = side === "home" ? "homeTeamId" : "awayTeamId";
    target[userKey] = userId;
    target[teamKey] = getAdvancingTeamId(tournament, source, userId);
  };

  applySide(source.nextMatchId, source.nextSide, winnerUserId);
  applySide(source.loserNextMatchId, source.loserNextSide, loserUserId);
}

function validatePlayoffResult(tournament, match, homeGoals, awayGoals, penaltyWinnerUserId){
  if (!isKnockoutTournament(tournament)) return "";
  if (!playoffMatchReady(match)) return "Este partido aún espera clasificados.";
  if (Number(homeGoals) === Number(awayGoals) && !penaltyWinnerUserId) {
    return "En eliminación directa, si hay empate debes elegir ganador por penales.";
  }
  return "";
}

function matchPlayed(match){
  if (!match) return false;
  return match.homeGoals !== null && match.awayGoals !== null && match.homeGoals !== "" && match.awayGoals !== "";
}

function scoreIsValid(homeGoals, awayGoals){
  const hg = Number(homeGoals);
  const ag = Number(awayGoals);
  return Number.isInteger(hg) && Number.isInteger(ag) && hg >= 0 && ag >= 0 && hg <= 99 && ag <= 99;
}

function hasPendingResult(match){
  return match.resultStatus === "pending_confirmation" || match.resultStatus === "rejected" || match.resultProposal?.status === "pending";
}

function goalEventCounts(match){
  return (match.goalEvents || []).reduce((acc, event) => {
    if (event.side === "home") acc.home += 1;
    if (event.side === "away") acc.away += 1;
    return acc;
  }, { home: 0, away: 0 });
}

function currentMatchScore(match){
  const proposal = match.resultProposal?.status === "pending" ? match.resultProposal : null;
  return {
    home: proposal ? proposal.homeGoals : match.homeGoals,
    away: proposal ? proposal.awayGoals : match.awayGoals
  };
}

function matchGoalIssues(match){
  const events = match.goalEvents || [];
  if (!events.length) return [];
  const score = currentMatchScore(match);
  if (score.home === null || score.home === "" || score.away === null || score.away === "") return [];
  const counts = goalEventCounts(match);
  const issues = [];
  if (counts.home !== Number(score.home)) issues.push(`El marcador local indica ${score.home}, pero hay ${counts.home} goles registrados.`);
  if (counts.away !== Number(score.away)) issues.push(`El marcador visita indica ${score.away}, pero hay ${counts.away} goles registrados.`);
  if (events.some((event) => event.assistName && event.assistName === event.playerName)) issues.push("Hay una asistencia registrada para el mismo jugador que convirtió el gol.");
  return issues;
}

function tournamentGoalIssueCount(tournament){
  return (tournament?.matches || []).reduce((total, match) => total + matchGoalIssues(match).length, 0);
}

function getFinishBlockReason(tournament){
  if (!tournament?.matches?.length) return "Primero genera el fixture.";
  if (tournament.matches.some(hasPendingResult)) return "Hay resultados pendientes de confirmar o corregir.";
  if (tournament.matches.some((m) => !matchPlayed(m))) return "Aún hay partidos sin marcador.";
  if (isKnockoutTournament(tournament) && tournament.matches.some((m) => matchPlayed(m) && Number(m.homeGoals) === Number(m.awayGoals) && !m.penaltyWinnerUserId)) return "Hay empates de eliminación directa sin ganador por penales.";
  if (tournamentGoalIssueCount(tournament) > 0) return "Hay diferencias entre marcador y goles registrados.";
  if (!tournament.matches.some(matchPlayed)) return "Debe existir al menos un partido jugado.";
  return "";
}

function loadTheme(){
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
}

function sortRows(rows){
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (a.gc !== b.gc) return a.gc - b.gc;
    return a.name.localeCompare(b.name);
  }).map((row, index) => ({ ...row, pos: index + 1 }));
}

function getUser(state, userId){
  return state.users.find((u) => u.id === userId) || { id: userId, name: "Usuario", alias: "Sin alias", createdAt: "" };
}

function getEffectiveUser(state, session, profile){
  if (session?.user?.id) {
    return state.users.find((u) => u.id === session.user.id) || profileToLocalUser(profile, session.user);
  }
  return getUser(state, state.currentUserId);
}

function getTeam(state, teamId){
  return state.teams.find((t) => t.id === teamId) || { id: teamId, name: "Equipo", short: "Equipo", badge: "?", tone: "azul", logo: "", coach: "", players: [] };
}

function getTeamPlayerNames(state, teamId){
  return (getTeam(state, teamId).players || []).map(([name]) => name);
}

function getTeamSelectionMode(tournament){
  return tournament?.teamSelectionMode || tournament?.team_selection_mode || "fixed";
}

function isFreeTeamTournament(tournament){
  return getTeamSelectionMode(tournament) === "free_per_match";
}

function teamSelectionLabel(tournament){
  return TEAM_SELECTION_LABELS[getTeamSelectionMode(tournament)] || "Equipo fijo";
}

function getFixtureMode(tournament){
  return tournament?.fixtureMode || tournament?.fixture_mode || "single_leg";
}

function isDoubleLegTournament(tournament){
  return getFixtureMode(tournament) === "double_leg";
}

function fixtureModeLabel(tournament){
  return FIXTURE_MODE_LABELS[getFixtureMode(tournament)] || FIXTURE_MODE_LABELS.single_leg;
}

function fixtureDateLabel(match){
  const round = String(match?.round || "").trim();
  const fecha = round.match(/Fecha\s+(\d+)/i);
  if (fecha) return `Fecha ${fecha[1]}`;
  if (/tercer lugar/i.test(round)) return "Tercer lugar";
  if (/final/i.test(round)) return "Final";
  if (/semifinal/i.test(round)) return "Semifinales";
  if (/cuartos/i.test(round)) return "Cuartos de final";
  if (/octavos/i.test(round)) return "Octavos de final";
  return round || "Fecha por definir";
}

function fixtureRoundDetail(match){
  const round = String(match?.round || "").trim();
  const clean = round.replace(/^Fecha\s+\d+\s*·?\s*/i, "").trim();
  return clean && clean !== round ? clean : "";
}

function matchStatusLabel(match){
  if (!playoffMatchReady(match)) return "Esperando clasificados";
  if (match.resultStatus === "pending_confirmation") return "Por confirmar";
  if (match.resultStatus === "rejected") return "Rechazado";
  if (matchPlayed(match)) return "Confirmado";
  return "Pendiente";
}

function groupMatchesByFixtureDate(matches = []){
  const groups = [];
  const index = new Map();
  (matches || []).forEach((match) => {
    const label = fixtureDateLabel(match);
    if (!index.has(label)) {
      index.set(label, { id: label.toLowerCase().replace(/[^a-z0-9]+/gi, "-"), label, matches: [] });
      groups.push(index.get(label));
    }
    index.get(label).matches.push(match);
  });
  return groups;
}

function getParticipantTeamId(tournament, userId){
  return (tournament?.participants || []).find((p) => p.userId === userId)?.teamId || "";
}

function getMatchTeamId(tournament, match, side){
  const key = side === "home" ? "homeTeamId" : "awayTeamId";
  const userKey = side === "home" ? "homeUserId" : "awayUserId";
  return match?.[key] || getParticipantTeamId(tournament, match?.[userKey]);
}

function participantTeamLabel(state, tournament, userId){
  if (isFreeTeamTournament(tournament)) return "Equipo libre por partido";
  const teamId = getParticipantTeamId(tournament, userId);
  const team = getTeam(state, teamId);
  return team.short || team.name;
}

function getPlayerPhoto(teamId, playerName){
  return PLAYER_PHOTOS?.[teamId]?.[playerName] || "";
}

function PlayerAvatar({ teamId, playerName, size = "" }){
  const src = getPlayerPhoto(teamId, playerName);
  const initials = (playerName || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`player-avatar ${size}`} title={playerName || "Jugador"}>
      {src ? <img src={src} alt={playerName || "Jugador"} /> : <b>{initials || "?"}</b>}
    </span>
  );
}

function createActivity(type, message, userId = null){
  return { id: uid("act"), type, message, userId, createdAt: today() };
}

function addActivity(tournament, type, message, userId = null){
  if (!tournament.activity) tournament.activity = [];
  tournament.activity.unshift(createActivity(type, message, userId));
}

function getPlayerGroups(team){
  const groups = { Arquero: [], Defensa: [], Medio: [], Delantero: [] };
  (team.players || []).forEach(([name, position]) => {
    if (!groups[position]) groups[position] = [];
    groups[position].push(name);
  });
  return groups;
}

function teamLogoSrc(team){
  return team?.logo || (team?.id ? `/team-logos/${team.id}.png` : "");
}

function TeamLogo({ team, size = "" }){
  const src = teamLogoSrc(team);
  return (
    <div className={`team-logo ${size} ${team?.tone || ""}`} title={team?.name || "Equipo"}>
      {src ? <img src={src} alt={`Logo ${team?.name || "equipo"}`} /> : null}
      <span>{team?.badge || "?"}</span>
    </div>
  );
}

function getFriendIds(state, userId, options = {}){
  const source = Array.isArray(state.friends) ? state.friends : [];
  return source
    .filter((f) => {
      if (options.cloudOnly && !f.cloud) return false;
      if (options.localOnly && f.cloud) return false;
      return f.status === "accepted" && (f.requesterId === userId || f.receiverId === userId);
    })
    .map((f) => f.requesterId === userId ? f.receiverId : f.requesterId);
}

function usedTeamIds(tournament){
  return new Set((tournament?.participants || []).map((p) => p.teamId));
}

function firstAvailableTeamForTournament(state, tournament){
  if (!tournament || tournament.allowDuplicateTeams) return state.teams[0]?.id || "";
  const used = usedTeamIds(tournament);
  return state.teams.find((t) => !used.has(t.id))?.id || state.teams[0]?.id || "";
}

function tournamentStandings(state, tournament){
  const rows = {};
  (tournament?.participants || []).forEach((p) => {
    const user = getUser(state, p.userId);
    const team = getTeam(state, p.teamId);
    rows[p.userId] = {
      userId: p.userId,
      teamId: p.teamId,
      name: user.alias || user.name,
      teamName: isFreeTeamTournament(tournament) ? "Libre" : (team.short || team.name),
      ...emptyStats(),
      performance: 0
    };
  });

  (tournament?.matches || []).filter(matchPlayed).forEach((m) => {
    const home = rows[m.homeUserId];
    const away = rows[m.awayUserId];
    if (!home || !away) return;
    applyMatchToRows(home, away, Number(m.homeGoals), Number(m.awayGoals));
  });

  Object.values(rows).forEach((r) => finalizeStats(r));
  return sortRows(Object.values(rows));
}

function applyMatchToRows(home, away, hg, ag){
  home.pj += 1;
  away.pj += 1;
  home.gf += hg;
  home.gc += ag;
  away.gf += ag;
  away.gc += hg;

  if (hg > ag) {
    home.pg += 1;
    away.pp += 1;
    home.pts += 3;
  } else if (hg < ag) {
    away.pg += 1;
    home.pp += 1;
    away.pts += 3;
  } else {
    home.pe += 1;
    away.pe += 1;
    home.pts += 1;
    away.pts += 1;
  }
}

function applySingleSide(row, goalsFor, goalsAgainst){
  row.pj += 1;
  row.gf += goalsFor;
  row.gc += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    row.pg += 1;
    row.pts += 3;
  } else if (goalsFor < goalsAgainst) {
    row.pp += 1;
  } else {
    row.pe += 1;
    row.pts += 1;
  }
}

function finalizeStats(row){
  row.dg = row.gf - row.gc;
  row.performance = row.pj ? Math.round((row.pts / (row.pj * 3)) * 1000) / 10 : 0;
  row.score = row.pts + row.titles * 20 + row.pg * 2;
  return row;
}

function buildUserRanking(state, scopeUserIds = null, seasonFilter = "all"){
  const allowed = scopeUserIds ? new Set(scopeUserIds) : null;
  const map = {};

  state.users.forEach((u) => {
    if (!allowed || allowed.has(u.id)) {
      map[u.id] = { userId: u.id, name: u.alias || u.name, ...emptyStats(), performance: 0 };
    }
  });

  state.tournaments.filter((t) => seasonFilter === "all" || t.season === seasonFilter).forEach((t) => {
    t.participants.forEach((p) => {
      if (map[p.userId]) map[p.userId].tournaments += 1;
    });

    t.matches.filter(matchPlayed).forEach((m) => {
      const hg = Number(m.homeGoals);
      const ag = Number(m.awayGoals);
      if (map[m.homeUserId]) applySingleSide(map[m.homeUserId], hg, ag);
      if (map[m.awayUserId]) applySingleSide(map[m.awayUserId], ag, hg);
    });

    if (t.championUserId && map[t.championUserId]) map[t.championUserId].titles += 1;
  });

  return Object.values(map).map(finalizeStats).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.performance !== a.performance) return b.performance - a.performance;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return a.name.localeCompare(b.name);
  }).map((row, index) => ({ ...row, pos: index + 1, status: row.pj >= 5 ? "Clasificado" : "En clasificación" }));
}

function buildTeamRanking(state, seasonFilter = "all"){
  const map = {};
  state.teams.forEach((team) => {
    map[team.id] = { teamId: team.id, name: team.short || team.name, ...emptyStats(), performance: 0 };
  });

  state.tournaments.filter((t) => seasonFilter === "all" || t.season === seasonFilter).forEach((t) => {
    t.participants.forEach((p) => {
      if (map[p.teamId]) map[p.teamId].tournaments += 1;
    });

    t.matches.filter(matchPlayed).forEach((m) => {
      const hg = Number(m.homeGoals);
      const ag = Number(m.awayGoals);
      if (map[m.homeTeamId]) applySingleSide(map[m.homeTeamId], hg, ag);
      if (map[m.awayTeamId]) applySingleSide(map[m.awayTeamId], ag, hg);
    });

    if (t.championTeamId && map[t.championTeamId]) map[t.championTeamId].titles += 1;
  });

  return Object.values(map).map(finalizeStats).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.performance !== a.performance) return b.performance - a.performance;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return a.name.localeCompare(b.name);
  }).map((row, index) => ({ ...row, pos: index + 1 }));
}

function buildUserTeamRanking(state, seasonFilter = "all"){
  const map = {};

  state.tournaments.filter((t) => seasonFilter === "all" || t.season === seasonFilter).forEach((t) => {
    t.participants.forEach((p) => {
      const key = `${p.userId}_${p.teamId}`;
      if (!map[key]) {
        const user = getUser(state, p.userId);
        const team = getTeam(state, p.teamId);
        map[key] = {
          key,
          userId: p.userId,
          teamId: p.teamId,
          name: `${user.alias || user.name} + ${team.short || team.name}`,
          userName: user.alias || user.name,
          teamName: team.short || team.name,
          ...emptyStats(),
          performance: 0
        };
      }
      map[key].tournaments += 1;
    });

    t.matches.filter(matchPlayed).forEach((m) => {
      const hg = Number(m.homeGoals);
      const ag = Number(m.awayGoals);
      const homeTeamId = m.homeTeamId || getParticipantTeamId(t, m.homeUserId);
      const awayTeamId = m.awayTeamId || getParticipantTeamId(t, m.awayUserId);
      const homeKey = `${m.homeUserId}_${homeTeamId}`;
      const awayKey = `${m.awayUserId}_${awayTeamId}`;
      [[homeKey, m.homeUserId, homeTeamId], [awayKey, m.awayUserId, awayTeamId]].forEach(([key, userId, teamId]) => {
        if (!teamId || map[key]) return;
        const user = getUser(state, userId);
        const team = getTeam(state, teamId);
        map[key] = { key, userId, teamId, name: `${user.alias || user.name} + ${team.short || team.name}`, userName: user.alias || user.name, teamName: team.short || team.name, ...emptyStats(), performance: 0 };
      });
      if (map[homeKey]) applySingleSide(map[homeKey], hg, ag);
      if (map[awayKey]) applySingleSide(map[awayKey], ag, hg);
    });

    if (t.championUserId && t.championTeamId) {
      const key = `${t.championUserId}_${t.championTeamId}`;
      if (map[key]) map[key].titles += 1;
    }
  });

  return Object.values(map).map(finalizeStats).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.performance !== a.performance) return b.performance - a.performance;
    if (b.pg !== a.pg) return b.pg - a.pg;
    return a.name.localeCompare(b.name);
  }).map((row, index) => ({ ...row, pos: index + 1 }));
}

function getHeadToHead(state, userAId, userBId){
  const a = { ...emptyStats(), name: getUser(state, userAId).alias };
  const b = { ...emptyStats(), name: getUser(state, userBId).alias };
  const matches = [];

  state.tournaments.forEach((t) => {
    t.matches.filter(matchPlayed).forEach((m) => {
      const involves = [m.homeUserId, m.awayUserId].includes(userAId) && [m.homeUserId, m.awayUserId].includes(userBId);
      if (!involves) return;
      const aGoals = m.homeUserId === userAId ? Number(m.homeGoals) : Number(m.awayGoals);
      const bGoals = m.homeUserId === userBId ? Number(m.homeGoals) : Number(m.awayGoals);
      applySingleSide(a, aGoals, bGoals);
      applySingleSide(b, bGoals, aGoals);
      matches.push({ tournament: t.name, round: m.round, aGoals, bGoals, homeUserId: m.homeUserId, awayUserId: m.awayUserId });
    });
  });

  finalizeStats(a);
  finalizeStats(b);
  const last = matches[matches.length - 1];
  const biggest = [...matches].sort((x, y) => Math.abs(y.aGoals - y.bGoals) - Math.abs(x.aGoals - x.bGoals))[0];
  return { a, b, matches, last, biggest };
}

function getUserInsights(state, userId){
  const comboRows = buildUserTeamRanking(state).filter((r) => r.userId === userId);
  const favorite = [...comboRows].sort((a, b) => b.tournaments - a.tournaments || b.pj - a.pj)[0];
  const best = [...comboRows].filter((r) => r.pj > 0).sort((a, b) => b.performance - a.performance || b.score - a.score)[0];
  const rivals = {};
  const recent = [];

  state.tournaments.forEach((t) => {
    t.matches.filter(matchPlayed).forEach((m) => {
      if (m.homeUserId !== userId && m.awayUserId !== userId) return;
      const opponentId = m.homeUserId === userId ? m.awayUserId : m.homeUserId;
      rivals[opponentId] = (rivals[opponentId] || 0) + 1;
      recent.push({ tournament: t.name, match: m, opponentId });
    });
  });

  const topRivalId = Object.entries(rivals).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    favoriteTeam: favorite?.teamName || "Sin datos",
    bestTeam: best?.teamName || "Sin datos",
    topRival: topRivalId ? getUser(state, topRivalId).alias : "Sin datos",
    recent: recent.slice(-5).reverse()
  };
}

function buildUserRecentMatchRows(state, userId, limit = 8){
  const rows = [];
  state.tournaments.forEach((tournament) => {
    (tournament.matches || []).filter(matchPlayed).forEach((match) => {
      if (match.homeUserId !== userId && match.awayUserId !== userId) return;
      const isHome = match.homeUserId === userId;
      const opponentId = isHome ? match.awayUserId : match.homeUserId;
      const myGoals = Number(isHome ? match.homeGoals : match.awayGoals);
      const opponentGoals = Number(isHome ? match.awayGoals : match.homeGoals);
      const teamId = isHome ? (match.homeTeamId || getParticipantTeamId(tournament, userId)) : (match.awayTeamId || getParticipantTeamId(tournament, userId));
      rows.push({
        key: `${tournament.id}_${match.id}_${userId}`,
        tournament: tournament.name,
        round: match.round || "Partido",
        opponent: getUser(state, opponentId).alias || getUser(state, opponentId).name,
        team: getTeam(state, teamId).short || getTeam(state, teamId).name,
        score: `${myGoals}-${opponentGoals}`,
        result: myGoals > opponentGoals ? "Victoria" : myGoals < opponentGoals ? "Derrota" : "Empate",
        playedAt: match.playedAt || tournament.createdAt || ""
      });
    });
  });
  return rows.slice(-limit).reverse();
}

function buildUserRivalRows(state, userId){
  const map = {};
  state.tournaments.forEach((tournament) => {
    (tournament.matches || []).filter(matchPlayed).forEach((match) => {
      if (match.homeUserId !== userId && match.awayUserId !== userId) return;
      const isHome = match.homeUserId === userId;
      const opponentId = isHome ? match.awayUserId : match.homeUserId;
      const myGoals = Number(isHome ? match.homeGoals : match.awayGoals);
      const opponentGoals = Number(isHome ? match.awayGoals : match.homeGoals);
      if (!map[opponentId]) {
        const opponent = getUser(state, opponentId);
        map[opponentId] = { key: opponentId, opponent: opponent.alias || opponent.name, ...emptyStats(), performance: 0 };
      }
      applySingleSide(map[opponentId], myGoals, opponentGoals);
    });
  });
  return Object.values(map)
    .map(finalizeStats)
    .sort((a, b) => b.pj - a.pj || b.score - a.score || a.opponent.localeCompare(b.opponent))
    .slice(0, 8);
}

function buildUserPlayerRows(state, userId){
  const map = {};
  state.tournaments.forEach((tournament) => {
    (tournament.matches || []).forEach((match) => {
      (match.goalEvents || []).forEach((event) => {
        const inferredUserId = event.userId || (event.side === "away" ? match.awayUserId : match.homeUserId);
        if (inferredUserId !== userId) return;
        const teamId = event.teamId || (event.side === "away" ? match.awayTeamId : match.homeTeamId) || getParticipantTeamId(tournament, userId);
        const key = `${teamId}_${event.playerName}`;
        if (!map[key]) {
          const team = getTeam(state, teamId);
          map[key] = { key, playerName: event.playerName || "Jugador", teamId, teamName: team.short || team.name, goals: 0, assists: 0, contributions: 0, tournaments: new Set(), last: "" };
        }
        map[key].goals += 1;
        map[key].contributions += 1;
        map[key].tournaments.add(tournament.name);
        map[key].last = `${tournament.name} · ${match.round || "Partido"}`;
        if (event.assistName) {
          const assistKey = `${teamId}_${event.assistName}`;
          if (!map[assistKey]) {
            const team = getTeam(state, teamId);
            map[assistKey] = { key: assistKey, playerName: event.assistName, teamId, teamName: team.short || team.name, goals: 0, assists: 0, contributions: 0, tournaments: new Set(), last: "" };
          }
          map[assistKey].assists += 1;
          map[assistKey].contributions += 1;
          map[assistKey].tournaments.add(tournament.name);
          map[assistKey].last = `${tournament.name} · ${match.round || "Partido"}`;
        }
      });
    });
  });
  return Object.values(map)
    .map((row) => ({ ...row, tournaments: row.tournaments.size }))
    .sort((a, b) => b.contributions - a.contributions || b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName))
    .map((row, index) => ({ ...row, pos: index + 1 }));
}

function buildUserTournamentResume(state, userId){
  const played = [];
  const titles = [];
  const runnerUps = [];
  state.tournaments.forEach((tournament) => {
    const participated = (tournament.participants || []).some((p) => p.userId === userId) || (tournament.matches || []).some((m) => m.homeUserId === userId || m.awayUserId === userId);
    if (!participated) return;
    played.push(tournament);
    if (tournament.status === "closed" && tournament.championUserId === userId) titles.push(tournament);
    if (tournament.status === "closed" && tournament.historySummary?.runnerUpUserId === userId) runnerUps.push(tournament);
  });
  return {
    played,
    titles: titles.slice(-6).reverse(),
    runnerUps: runnerUps.slice(-6).reverse(),
    closed: played.filter((tournament) => tournament.status === "closed")
  };
}

function getUserDisplayName(user, ranking = null){
  if (user?.alias && user.alias !== "Sin alias") return user.alias;
  return ranking?.name || user?.name || "Jugador";
}

function getNextMatchForUser(state, userId){
  const candidates = [];
  state.tournaments.forEach((t) => {
    if (t.status !== "active") return;
    t.matches.filter((m) => !matchPlayed(m) && (m.homeUserId === userId || m.awayUserId === userId)).forEach((match) => {
      candidates.push({ tournament: t, match });
    });
  });
  return candidates[0] || null;
}

function getAchievementsForUser(state, userId){
  const ranking = buildUserRanking(state).find((r) => r.userId === userId) || { ...emptyStats(), performance: 0, titles: 0 };
  const friendCount = getFriendIds(state, userId).length;
  const perfectTitle = state.tournaments.some((t) => {
    if (t.championUserId !== userId || t.status !== "closed") return false;
    return t.matches.filter(matchPlayed).every((m) => {
      if (m.homeUserId !== userId && m.awayUserId !== userId) return true;
      const myGoals = m.homeUserId === userId ? Number(m.homeGoals) : Number(m.awayGoals);
      const otherGoals = m.homeUserId === userId ? Number(m.awayGoals) : Number(m.homeGoals);
      return myGoals >= otherGoals;
    });
  });
  const unlocked = new Set();
  if (ranking.pg > 0) unlocked.add("first_win");
  if (ranking.titles > 0) unlocked.add("first_title");
  if (ranking.pj >= 5) unlocked.add("five_matches");
  if (perfectTitle) unlocked.add("perfect_tournament");
  if (ranking.gf >= 10) unlocked.add("goal_machine");
  if (friendCount >= 3) unlocked.add("social_player");
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}

function getTeamProfile(state, teamId){
  const ranking = buildTeamRanking(state).find((r) => r.teamId === teamId) || { teamId, name: getTeam(state, teamId).short, ...emptyStats(), performance: 0 };
  const combos = buildUserTeamRanking(state).filter((r) => r.teamId === teamId).sort((a, b) => b.score - a.score);
  const recent = [];
  state.tournaments.forEach((t) => {
    t.matches.filter((m) => matchPlayed(m) && (m.homeTeamId === teamId || m.awayTeamId === teamId)).forEach((match) => recent.push({ tournament: t.name, match }));
  });
  return { ranking, combos, recent: recent.slice(-5).reverse() };
}


function buildScorerRanking(state, tournamentId = null){
  const map = {};
  state.tournaments
    .filter((t) => !tournamentId || t.id === tournamentId)
    .forEach((t) => {
      t.matches.forEach((m) => {
        (m.goalEvents || []).forEach((event) => {
          const key = `${event.teamId}_${event.playerName}`;
          if (!map[key]) {
            const team = getTeam(state, event.teamId);
            map[key] = { key, playerName: event.playerName, teamName: team.short || team.name, teamId: event.teamId, goals: 0, assists: 0, tournaments: new Set(), last: "" };
          }
          map[key].goals += 1;
          map[key].tournaments.add(t.name);
          map[key].last = `${t.name} · ${m.round}`;
          if (event.assistName) {
            const assistKey = `${event.teamId}_${event.assistName}`;
            if (!map[assistKey]) {
              const team = getTeam(state, event.teamId);
              map[assistKey] = { key: assistKey, playerName: event.assistName, teamName: team.short || team.name, teamId: event.teamId, goals: 0, assists: 0, tournaments: new Set(), last: "" };
            }
            map[assistKey].assists += 1;
            map[assistKey].tournaments.add(t.name);
            map[assistKey].last = `${t.name} · ${m.round}`;
          }
        });
      });
    });
  return Object.values(map)
    .map((row) => ({ ...row, tournaments: row.tournaments.size }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName))
    .map((row, index) => ({ ...row, pos: index + 1 }));
}

function buildAssistRanking(state, tournamentId = null){
  return buildScorerRanking(state, tournamentId)
    .filter((row) => row.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.playerName.localeCompare(b.playerName))
    .map((row, index) => ({ ...row, pos: index + 1 }));
}

function buildGoalRanking(state, tournamentId = null){
  return buildScorerRanking(state, tournamentId)
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName))
    .map((row, index) => ({ ...row, pos: index + 1 }));
}

function buildRivalryRows(state){
  const map = {};
  state.tournaments.forEach((t) => {
    t.matches.filter(matchPlayed).forEach((m) => {
      const ids = [m.homeUserId, m.awayUserId].sort();
      const key = `${ids[0]}_${ids[1]}`;
      if (!map[key]) {
        map[key] = {
          key,
          userAId: ids[0],
          userBId: ids[1],
          userA: getUser(state, ids[0]).alias,
          userB: getUser(state, ids[1]).alias,
          pj: 0,
          aWins: 0,
          bWins: 0,
          draws: 0,
          goalsA: 0,
          goalsB: 0,
          last: "Sin datos",
          biggest: "Sin datos",
          biggestDiff: -1
        };
      }
      const row = map[key];
      const aGoals = m.homeUserId === row.userAId ? Number(m.homeGoals) : Number(m.awayGoals);
      const bGoals = m.homeUserId === row.userBId ? Number(m.homeGoals) : Number(m.awayGoals);
      row.pj += 1;
      row.goalsA += aGoals;
      row.goalsB += bGoals;
      if (aGoals > bGoals) row.aWins += 1;
      else if (aGoals < bGoals) row.bWins += 1;
      else row.draws += 1;
      row.last = `${t.name}: ${row.userA} ${aGoals}-${bGoals} ${row.userB}`;
      const diff = Math.abs(aGoals - bGoals);
      if (diff > row.biggestDiff) {
        row.biggestDiff = diff;
        row.biggest = `${row.userA} ${aGoals}-${bGoals} ${row.userB} · ${t.name}`;
      }
    });
  });
  return Object.values(map).sort((a, b) => b.pj - a.pj || b.biggestDiff - a.biggestDiff);
}

function buildRecords(state){
  const userRanking = buildUserRanking(state);
  const teamRanking = buildTeamRanking(state);
  const matches = state.tournaments.flatMap((t) => t.matches.filter(matchPlayed).map((m) => ({ ...m, tournamentName: t.name })));
  const biggestWin = [...matches].sort((a, b) => Math.abs(Number(b.homeGoals) - Number(b.awayGoals)) - Math.abs(Number(a.homeGoals) - Number(a.awayGoals)))[0];
  const highestScoring = [...matches].sort((a, b) => (Number(b.homeGoals) + Number(b.awayGoals)) - (Number(a.homeGoals) + Number(a.awayGoals)))[0];
  const mostTitlesUser = [...userRanking].sort((a, b) => b.titles - a.titles || b.score - a.score)[0];
  const mostTitlesTeam = [...teamRanking].sort((a, b) => b.titles - a.titles || b.score - a.score)[0];
  const bestPerformanceUser = [...userRanking].filter((r) => r.pj >= 5).sort((a, b) => b.performance - a.performance || b.score - a.score)[0];
  const mostUsedTeam = [...teamRanking].sort((a, b) => b.tournaments - a.tournaments || b.pj - a.pj)[0];
  return [
    { label: "Mayor goleada", value: biggestWin ? `${getUser(state, biggestWin.homeUserId).alias} ${biggestWin.homeGoals}-${biggestWin.awayGoals} ${getUser(state, biggestWin.awayUserId).alias}` : "Sin datos", note: biggestWin?.tournamentName || "" },
    { label: "Partido con más goles", value: highestScoring ? `${highestScoring.homeGoals}-${highestScoring.awayGoals}` : "Sin datos", note: highestScoring ? `${getUser(state, highestScoring.homeUserId).alias} vs ${getUser(state, highestScoring.awayUserId).alias} · ${highestScoring.tournamentName}` : "" },
    { label: "Usuario con más títulos", value: mostTitlesUser?.name || "Sin datos", note: `${mostTitlesUser?.titles || 0} títulos` },
    { label: "Equipo con más títulos", value: mostTitlesTeam?.name || "Sin datos", note: `${mostTitlesTeam?.titles || 0} títulos` },
    { label: "Mejor rendimiento", value: bestPerformanceUser?.name || "Sin datos", note: `${bestPerformanceUser?.performance || 0}% con mínimo 5 PJ` },
    { label: "Equipo más usado", value: mostUsedTeam?.name || "Sin datos", note: `${mostUsedTeam?.tournaments || 0} torneos` }
  ];
}

function buildTournamentFinishSummary(state, tournament, standings, goalRows, assistRows){
  const champion = getTournamentChampionRow(state, tournament, standings);
  const runnerUp = getTournamentRunnerUpRow(state, tournament, standings);
  const bestAttack = [...standings].sort((a, b) => b.gf - a.gf || b.dg - a.dg)[0] || null;
  const bestDefense = [...standings].sort((a, b) => a.gc - b.gc || b.dg - a.dg)[0] || null;
  const topScorer = goalRows[0] || null;
  const topAssist = assistRows[0] || null;
  const playedMatches = (tournament.matches || []).filter(matchPlayed).length;
  const totalGoals = (tournament.matches || []).filter(matchPlayed).reduce((sum, match) => sum + Number(match.homeGoals || 0) + Number(match.awayGoals || 0), 0);
  return {
    champion,
    runnerUp,
    bestAttack,
    bestDefense,
    topScorer,
    topAssist,
    playedMatches,
    totalGoals,
    issueCount: tournamentGoalIssueCount(tournament),
    championUser: champion ? getUser(state, champion.userId) : null,
    championTeam: champion ? getTeam(state, champion.teamId) : null
  };
}

function downloadChampionImage(state, tournament, summary){
  if (!summary?.champion) return alert("Primero debe existir un campeón calculado.");
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 1200, 675);
  grad.addColorStop(0, "#07111f");
  grad.addColorStop(.55, "#10294a");
  grad.addColorStop(1, "#4b2bbb");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 675);

  ctx.fillStyle = "rgba(94, 211, 255, .18)";
  ctx.beginPath(); ctx.arc(160, 120, 180, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(124, 92, 255, .22)";
  ctx.beginPath(); ctx.arc(1080, 70, 260, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.07)";
  ctx.roundRect(70, 74, 1060, 525, 36);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#5ed3ff";
  ctx.font = "700 28px Arial";
  ctx.fillText("CHUTE PLATAFORMA", 100, 126);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 76px Arial";
  ctx.fillText("CAMPEÓN", 100, 216);
  ctx.font = "800 44px Arial";
  ctx.fillText(tournament.name, 100, 276);

  ctx.fillStyle = "#ffd166";
  ctx.font = "900 58px Arial";
  ctx.fillText(summary.championUser?.alias || "Usuario", 100, 380);
  ctx.fillStyle = "#edf3ff";
  ctx.font = "800 38px Arial";
  ctx.fillText(summary.championTeam?.name || "Equipo", 100, 430);

  const badgeX = 885, badgeY = 220;
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.beginPath(); ctx.roundRect(badgeX, badgeY, 170, 170, 42); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px Arial";
  ctx.textAlign = "center";
  ctx.fillText(summary.championTeam?.badge || "CH", badgeX + 85, badgeY + 108);
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "700 28px Arial";
  const line = `PJ ${summary.champion.pj} · PG ${summary.champion.pg} · DG ${summary.champion.dg} · ${summary.champion.performance}% rendimiento`;
  ctx.fillText(line, 100, 510);
  ctx.fillStyle = "rgba(237,243,255,.76)";
  ctx.font = "600 24px Arial";
  ctx.fillText(`Goles del torneo: ${summary.totalGoals} · Partidos jugados: ${summary.playedMatches} · ${today()}`, 100, 555);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `campeon-${tournament.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${today()}.png`;
  link.click();
}


function slugify(value){
  return String(value || "chute").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "chute";
}

function drawShareBackground(ctx, title, subtitle){
  const grad = ctx.createLinearGradient(0, 0, 1200, 675);
  grad.addColorStop(0, "#07111f");
  grad.addColorStop(.58, "#10294a");
  grad.addColorStop(1, "#25145c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = "rgba(94, 211, 255, .16)";
  ctx.beginPath(); ctx.arc(120, 110, 190, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(124, 92, 255, .20)";
  ctx.beginPath(); ctx.arc(1110, 100, 250, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.075)";
  ctx.roundRect(70, 70, 1060, 535, 36); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#5ed3ff";
  ctx.font = "800 25px Arial";
  ctx.fillText("CHUTE PLATAFORMA", 100, 122);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px Arial";
  ctx.fillText(title, 100, 180);
  ctx.fillStyle = "rgba(237,243,255,.78)";
  ctx.font = "600 24px Arial";
  ctx.fillText(subtitle, 100, 220);
  ctx.fillStyle = "rgba(237,243,255,.62)";
  ctx.font = "700 18px Arial";
  ctx.fillText(`Chute Plataforma · ${today()}`, 100, 575);
}

function triggerCanvasDownload(canvas, filename){
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(filename)}-${today()}.png`;
  link.click();
}

function drawTableRows(ctx, rows, columns, labels, x, y, colWidths, options = {}){
  const rowH = options.rowHeight || 44;
  ctx.font = "800 19px Arial";
  ctx.fillStyle = "rgba(94, 211, 255, .95)";
  let cx = x;
  columns.forEach((col, i) => {
    ctx.fillText(labels[col] || col, cx + 8, y);
    cx += colWidths[i];
  });
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + colWidths.reduce((a, b) => a + b, 0), y + 14); ctx.stroke();
  ctx.font = "700 20px Arial";
  rows.forEach((row, rIndex) => {
    const yy = y + 42 + rIndex * rowH;
    ctx.fillStyle = rIndex % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.07)";
    ctx.roundRect(x - 4, yy - 27, colWidths.reduce((a, b) => a + b, 0) + 8, 36, 12); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.92)";
    let ccx = x;
    columns.forEach((col, i) => {
      const value = col === "performance" ? `${row[col] || 0}%` : row[col];
      ctx.fillText(String(value ?? ""), ccx + 8, yy);
      ccx += colWidths[i];
    });
  });
}

function downloadStandingsImage(state, tournament, standings){
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  drawShareBackground(ctx, "TABLA DE POSICIONES", tournament.name);
  drawTableRows(ctx, standings.slice(0, 10), ["pos", "name", "teamName", "pj", "dg", "pts"], { pos: "#", name: "Usuario", teamName: "Equipo", pj: "PJ", dg: "DG", pts: "PTS" }, 100, 285, [70, 270, 270, 90, 90, 100]);
  triggerCanvasDownload(canvas, `tabla-${tournament.name}`);
}

function downloadFixtureImage(state, tournament){
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  drawShareBackground(ctx, "FIXTURE / PRÓXIMA FECHA", tournament.name);
  const rows = (tournament.matches || [])
    .filter((m) => !matchPlayed(m))
    .slice(0, 8)
    .map((m) => ({ round: m.round, home: `${getUser(state, m.homeUserId).alias} · ${getTeam(state, m.homeTeamId).short}`, away: `${getUser(state, m.awayUserId).alias} · ${getTeam(state, m.awayTeamId).short}`, state: "Pendiente" }));
  drawTableRows(ctx, rows.length ? rows : [{ round: "-", home: "Sin partidos pendientes", away: "", state: "" }], ["round", "home", "away", "state"], { round: "Fecha", home: "Local", away: "Visita", state: "Estado" }, 100, 285, [160, 340, 340, 140]);
  triggerCanvasDownload(canvas, `fixture-${tournament.name}`);
}

function downloadScorersImage(state, tournament, goalRows, assistRows){
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  drawShareBackground(ctx, "GOLEADORES Y ASISTIDORES", tournament.name);
  ctx.fillStyle = "#ffd166";
  ctx.font = "900 28px Arial";
  ctx.fillText("Goleadores", 100, 275);
  drawTableRows(ctx, goalRows.slice(0, 5), ["pos", "playerName", "teamName", "goals"], { pos: "#", playerName: "Jugador", teamName: "Equipo", goals: "G" }, 100, 315, [55, 300, 230, 70], { rowHeight: 42 });
  ctx.fillStyle = "#ffd166";
  ctx.font = "900 28px Arial";
  ctx.fillText("Asistidores", 100, 535);
  const assistStart = Math.min(570, 315 + 42 * Math.max(6, Math.min(5, goalRows.length) + 1));
  drawTableRows(ctx, assistRows.slice(0, 3), ["pos", "playerName", "teamName", "assists"], { pos: "#", playerName: "Jugador", teamName: "Equipo", assists: "A" }, 100, assistStart, [55, 300, 230, 70], { rowHeight: 40 });
  triggerCanvasDownload(canvas, `goleadores-${tournament.name}`);
}

function downloadMatchImage(state, tournament, match){
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  drawShareBackground(ctx, "RESULTADO DEL PARTIDO", `${tournament.name} · ${match.round}`);
  const home = getUser(state, match.homeUserId);
  const away = getUser(state, match.awayUserId);
  const homeTeam = getTeam(state, getMatchTeamId(tournament, match, "home"));
  const awayTeam = getTeam(state, getMatchTeamId(tournament, match, "away"));
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px Arial";
  ctx.fillText(`${home.alias}`, 100, 330);
  ctx.font = "700 27px Arial";
  ctx.fillStyle = "rgba(237,243,255,.72)";
  ctx.fillText(homeTeam.short || homeTeam.name, 100, 370);
  ctx.fillStyle = "#ffd166";
  ctx.font = "900 96px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${match.homeGoals ?? "-"} - ${match.awayGoals ?? "-"}`, 600, 355);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px Arial";
  ctx.fillText(`${away.alias}`, 760, 330);
  ctx.font = "700 27px Arial";
  ctx.fillStyle = "rgba(237,243,255,.72)";
  ctx.fillText(awayTeam.short || awayTeam.name, 760, 370);
  const goals = (match.goalEvents || []).slice(0, 8).map((e) => `${e.minute ? e.minute + "' · " : ""}${e.playerName}${e.assistName ? "  (A: " + e.assistName + ")" : ""}`);
  ctx.fillStyle = "rgba(255,255,255,.90)";
  ctx.font = "700 24px Arial";
  ctx.fillText("Detalle de goles", 100, 465);
  ctx.font = "600 21px Arial";
  if (!goals.length) ctx.fillText("Sin goles registrados por jugador.", 100, 505);
  goals.forEach((line, i) => ctx.fillText(line, 100, 505 + i * 28));
  if (match.penaltyWinnerUserId) {
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 24px Arial";
    ctx.fillText(`Ganador por penales: ${getUser(state, match.penaltyWinnerUserId).alias}`, 100, 625);
  }
  triggerCanvasDownload(canvas, `resultado-${tournament.name}-${home.alias}-vs-${away.alias}`);
}

function buildPlayerContributionRanking(state, tournamentId = null){
  return buildScorerRanking(state, tournamentId)
    .map((row) => ({ ...row, contributions: row.goals + row.assists }))
    .filter((row) => row.contributions > 0)
    .sort((a, b) => b.contributions - a.contributions || b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName))
    .map((row, index) => ({ ...row, pos: index + 1 }));
}

function getAllOfficialPlayers(state){
  return (state.teams || []).flatMap((team) => (team.players || []).map(([name, position]) => ({
    key: `${team.id}_${name}`,
    teamId: team.id,
    teamName: team.short || team.name,
    teamFullName: team.name,
    teamTone: team.tone,
    playerName: name,
    position
  })));
}

function getOfficialPlayer(state, teamId, playerName){
  return getAllOfficialPlayers(state).find((player) => player.teamId === teamId && player.playerName === playerName) || {
    key: `${teamId}_${playerName}`,
    teamId,
    teamName: getTeam(state, teamId).short || getTeam(state, teamId).name,
    teamFullName: getTeam(state, teamId).name,
    teamTone: getTeam(state, teamId).tone,
    playerName: playerName || "Jugador",
    position: "Sin posición"
  };
}

function buildPlayerProfile(state, teamId, playerName){
  const base = getOfficialPlayer(state, teamId, playerName);
  const globalRows = buildPlayerContributionRanking(state);
  const teamRows = globalRows.filter((row) => row.teamId === teamId);
  const globalRank = globalRows.find((row) => row.teamId === teamId && row.playerName === playerName);
  const teamRank = teamRows.findIndex((row) => row.teamId === teamId && row.playerName === playerName) + 1;
  const userMap = {};
  const tournamentMap = {};
  const recent = [];

  state.tournaments.forEach((tournament) => {
    (tournament.matches || []).forEach((match) => {
      (match.goalEvents || []).forEach((event) => {
        const eventTeamId = event.teamId || (event.side === "away" ? match.awayTeamId : match.homeTeamId);
        if (eventTeamId !== teamId) return;
        const scorerHit = event.playerName === playerName;
        const assistHit = event.assistName === playerName;
        if (!scorerHit && !assistHit) return;
        const userId = event.userId || (event.side === "away" ? match.awayUserId : match.homeUserId);
        const user = getUser(state, userId);
        if (!userMap[userId]) {
          userMap[userId] = { key: userId, userId, userName: user.alias || user.name || "Usuario", goals: 0, assists: 0, contributions: 0, tournaments: new Set(), last: "" };
        }
        if (!tournamentMap[tournament.id]) {
          tournamentMap[tournament.id] = { key: tournament.id, tournament: tournament.name, goals: 0, assists: 0, contributions: 0, last: "" };
        }
        if (scorerHit) {
          userMap[userId].goals += 1;
          tournamentMap[tournament.id].goals += 1;
          recent.push({
            key: `${tournament.id}_${match.id}_${event.id || recent.length}_goal`,
            tournament: tournament.name,
            round: match.round || "Partido",
            userName: user.alias || user.name || "Usuario",
            action: "Gol",
            minute: event.minute ? `${event.minute}'` : "-",
            match: `${getUser(state, match.homeUserId).alias} ${match.homeGoals ?? "-"}-${match.awayGoals ?? "-"} ${getUser(state, match.awayUserId).alias}`
          });
        }
        if (assistHit) {
          userMap[userId].assists += 1;
          tournamentMap[tournament.id].assists += 1;
          recent.push({
            key: `${tournament.id}_${match.id}_${event.id || recent.length}_assist`,
            tournament: tournament.name,
            round: match.round || "Partido",
            userName: user.alias || user.name || "Usuario",
            action: "Asistencia",
            minute: event.minute ? `${event.minute}'` : "-",
            match: `${getUser(state, match.homeUserId).alias} ${match.homeGoals ?? "-"}-${match.awayGoals ?? "-"} ${getUser(state, match.awayUserId).alias}`
          });
        }
        userMap[userId].contributions = userMap[userId].goals + userMap[userId].assists;
        userMap[userId].tournaments.add(tournament.name);
        userMap[userId].last = `${tournament.name} · ${match.round || "Partido"}`;
        tournamentMap[tournament.id].contributions = tournamentMap[tournament.id].goals + tournamentMap[tournament.id].assists;
        tournamentMap[tournament.id].last = match.round || "Partido";
      });
    });
  });

  const users = Object.values(userMap)
    .map((row) => ({ ...row, tournaments: row.tournaments.size }))
    .sort((a, b) => b.contributions - a.contributions || b.goals - a.goals || b.assists - a.assists || a.userName.localeCompare(b.userName));
  const tournaments = Object.values(tournamentMap)
    .sort((a, b) => b.contributions - a.contributions || b.goals - a.goals || a.tournament.localeCompare(b.tournament));

  return {
    ...base,
    goals: globalRank?.goals || 0,
    assists: globalRank?.assists || 0,
    contributions: globalRank?.contributions || 0,
    tournamentsCount: globalRank?.tournaments || tournaments.length,
    last: globalRank?.last || "Sin registros",
    globalRank: globalRank?.pos || "-",
    teamRank: teamRank || "-",
    users,
    tournaments,
    recent: recent.slice(-8).reverse()
  };
}


function buildTournamentHistory(state, tournament){
  const standings = tournamentStandings(state, tournament);
  const goalRows = buildGoalRanking(state, tournament.id);
  const assistRows = buildAssistRanking(state, tournament.id);
  const playerRows = buildPlayerContributionRanking(state, tournament.id);
  const playedMatches = (tournament.matches || []).filter(matchPlayed);
  const biggestWin = [...playedMatches].sort((a, b) => Math.abs(Number(b.homeGoals) - Number(b.awayGoals)) - Math.abs(Number(a.homeGoals) - Number(a.awayGoals)))[0];
  const highestScoring = [...playedMatches].sort((a, b) => (Number(b.homeGoals) + Number(b.awayGoals)) - (Number(a.homeGoals) + Number(a.awayGoals)))[0];
  const championRow = getTournamentChampionRow(state, tournament, standings);
  const saved = tournament.historySummary || null;
  const savedChampionUser = saved?.championUserId ? getUser(state, saved.championUserId) : null;
  const savedChampionTeam = saved?.championTeamId ? getTeam(state, saved.championTeamId) : null;
  const savedRunnerUpUser = saved?.runnerUpUserId ? getUser(state, saved.runnerUpUserId) : null;
  return {
    champion: savedChampionUser?.alias || (tournament.championUserId ? getUser(state, tournament.championUserId).alias : championRow ? getUser(state, championRow.userId).alias : "Sin definir"),
    championTeam: savedChampionTeam?.short || (tournament.championTeamId ? getTeam(state, tournament.championTeamId).short : championRow ? getTeam(state, championRow.teamId).short : "Sin equipo"),
    runnerUp: savedRunnerUpUser?.alias || (getTournamentRunnerUpRow(state, tournament, standings) ? getUser(state, getTournamentRunnerUpRow(state, tournament, standings).userId).alias : "Sin datos"),
    topScorer: saved?.topScorerName ? `${saved.topScorerName} (${saved.topScorerGoals})` : goalRows[0] ? `${goalRows[0].playerName} (${goalRows[0].goals})` : "Sin datos",
    topAssist: saved?.topAssistName ? `${saved.topAssistName} (${saved.topAssistCount})` : assistRows[0] ? `${assistRows[0].playerName} (${assistRows[0].assists})` : "Sin datos",
    bestPlayer: saved?.bestPlayerName ? `${saved.bestPlayerName} (${saved.bestPlayerContributions} G+A)` : playerRows[0] ? `${playerRows[0].playerName} (${playerRows[0].contributions} G+A)` : "Sin datos",
    bestAttack: saved?.bestAttackTeamId ? getTeam(state, saved.bestAttackTeamId).short : standings[0] ? getTeam(state, [...standings].sort((a, b) => b.gf - a.gf)[0].teamId).short : "Sin datos",
    bestDefense: saved?.bestDefenseTeamId ? getTeam(state, saved.bestDefenseTeamId).short : standings[0] ? getTeam(state, [...standings].sort((a, b) => a.gc - b.gc)[0].teamId).short : "Sin datos",
    biggestWin: saved?.summary?.biggestWin || (biggestWin ? `${getUser(state, biggestWin.homeUserId).alias} ${biggestWin.homeGoals}-${biggestWin.awayGoals} ${getUser(state, biggestWin.awayUserId).alias}` : "Sin datos"),
    highestScoring: saved?.summary?.highestScoring || (highestScoring ? `${highestScoring.homeGoals}-${highestScoring.awayGoals} · ${getUser(state, highestScoring.homeUserId).alias} vs ${getUser(state, highestScoring.awayUserId).alias}` : "Sin datos"),
    playedMatches: saved?.playedMatches ?? playedMatches.length,
    totalGoals: saved?.totalGoals ?? playedMatches.reduce((sum, m) => sum + Number(m.homeGoals || 0) + Number(m.awayGoals || 0), 0),
    finishedAt: saved?.finishedAt || null,
    saved: Boolean(saved)
  };
}


function buildTournamentProfile(state, tournament){
  const standings = tournamentStandings(state, tournament);
  const history = buildTournamentHistory(state, tournament);
  const goalRows = buildGoalRanking(state, tournament.id);
  const assistRows = buildAssistRanking(state, tournament.id);
  const playerRows = buildPlayerContributionRanking(state, tournament.id);
  const playedMatches = (tournament.matches || []).filter(matchPlayed);
  const championRow = getTournamentChampionRow(state, tournament, standings);
  const runnerUpRow = getTournamentRunnerUpRow(state, tournament, standings);
  const championUser = tournament.championUserId ? getUser(state, tournament.championUserId) : championRow ? getUser(state, championRow.userId) : null;
  const championTeam = tournament.championTeamId ? getTeam(state, tournament.championTeamId) : championRow ? getTeam(state, championRow.teamId) : null;
  const runnerUpUser = runnerUpRow ? getUser(state, runnerUpRow.userId) : null;
  const runnerUpTeam = runnerUpRow ? getTeam(state, runnerUpRow.teamId) : null;
  const bestAttack = [...standings].sort((a, b) => b.gf - a.gf || b.dg - a.dg)[0] || null;
  const bestDefense = [...standings].sort((a, b) => a.gc - b.gc || b.dg - a.dg)[0] || null;
  const finalMatch = getKnockoutFinalMatch(tournament) || playedMatches[playedMatches.length - 1] || null;
  const notableMatches = [...playedMatches]
    .map((match) => {
      const totalGoals = Number(match.homeGoals || 0) + Number(match.awayGoals || 0);
      const diff = Math.abs(Number(match.homeGoals || 0) - Number(match.awayGoals || 0));
      const homeUser = getUser(state, match.homeUserId);
      const awayUser = getUser(state, match.awayUserId);
      const homeTeam = getTeam(state, getMatchTeamId(tournament, match, "home"));
      const awayTeam = getTeam(state, getMatchTeamId(tournament, match, "away"));
      const winnerId = Number(match.homeGoals) > Number(match.awayGoals) ? match.homeUserId : Number(match.awayGoals) > Number(match.homeGoals) ? match.awayUserId : match.penaltyWinnerUserId || match.winnerUserId || null;
      const winner = winnerId ? getUser(state, winnerId).alias : "Empate";
      return {
        id: match.id,
        round: fixtureDateLabel(match),
        detail: fixtureRoundDetail(match),
        match: `${homeUser.alias} ${match.homeGoals}-${match.awayGoals} ${awayUser.alias}`,
        teams: `${homeTeam.short || homeTeam.name} vs ${awayTeam.short || awayTeam.name}`,
        totalGoals,
        diff,
        winner
      };
    })
    .sort((a, b) => b.totalGoals - a.totalGoals || b.diff - a.diff)
    .slice(0, 6)
    .map((row, index) => ({ ...row, pos: index + 1 }));
  const participants = (tournament.participants || []).map((participant) => {
    const user = getUser(state, participant.userId);
    const team = participant.teamId ? getTeam(state, participant.teamId) : null;
    const ranking = standings.find((row) => row.userId === participant.userId);
    return {
      key: participant.userId,
      user: user.alias,
      team: team ? (team.short || team.name) : "Equipo libre",
      pj: ranking?.pj || 0,
      pts: ranking?.pts || 0,
      dg: ranking?.dg || 0
    };
  });
  return {
    standings,
    history,
    goalRows,
    assistRows,
    playerRows,
    playedMatches,
    championUser,
    championTeam,
    runnerUpUser,
    runnerUpTeam,
    bestAttack,
    bestDefense,
    finalMatch,
    notableMatches,
    participants,
    totalMatches: (tournament.matches || []).length,
    pendingMatches: (tournament.matches || []).filter((match) => !matchPlayed(match)).length,
    totalGoals: playedMatches.reduce((sum, match) => sum + Number(match.homeGoals || 0) + Number(match.awayGoals || 0), 0),
    formatLabel: formatLabel(tournament.format),
    fixtureLabel: fixtureModeLabel(tournament),
    teamModeLabel: teamSelectionLabel(tournament),
    statusLabel: STATUS_LABELS[tournament.status] || tournament.status
  };
}

function buildTournamentArchiveRows(state){
  return (state.tournaments || [])
    .filter((tournament) => tournament.status === "closed" && (tournament.championUserId || tournament.historySummary))
    .sort((a, b) => String(b.historySummary?.finishedAt || b.createdAt || "").localeCompare(String(a.historySummary?.finishedAt || a.createdAt || "")))
    .map((tournament) => {
      const profile = buildTournamentProfile(state, tournament);
      return { tournament, profile };
    });
}


function getRecentResultRows(state, tournaments = state.tournaments, limit = 6){
  return (tournaments || [])
    .flatMap((tournament) => (tournament.matches || [])
      .filter(matchPlayed)
      .map((match) => {
        const homeUser = getUser(state, match.homeUserId);
        const awayUser = getUser(state, match.awayUserId);
        const homeTeam = getTeam(state, getMatchTeamId(tournament, match, "home"));
        const awayTeam = getTeam(state, getMatchTeamId(tournament, match, "away"));
        const totalGoals = Number(match.homeGoals || 0) + Number(match.awayGoals || 0);
        return {
          key: `${tournament.id}_${match.id}`,
          tournamentId: tournament.id,
          tournament: tournament.name,
          round: fixtureDateLabel(match),
          detail: fixtureRoundDetail(match),
          home: homeUser.alias,
          away: awayUser.alias,
          homeTeam: homeTeam.short || homeTeam.name,
          awayTeam: awayTeam.short || awayTeam.name,
          score: `${match.homeGoals}-${match.awayGoals}`,
          totalGoals,
          sortOrder: Number(match.sortOrder || 0),
          createdAt: match.updatedAt || match.playedAt || tournament.createdAt || ""
        };
      }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.sortOrder - a.sortOrder || b.totalGoals - a.totalGoals)
    .slice(0, limit);
}

function getFeaturedTournaments(tournaments = [], limit = 4){
  return [...(tournaments || [])]
    .sort((a, b) => {
      const aOpen = a.status === "closed" ? 0 : 1;
      const bOpen = b.status === "closed" ? 0 : 1;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    })
    .slice(0, limit);
}

function getTournamentProgress(tournament){
  const total = (tournament.matches || []).length;
  const played = (tournament.matches || []).filter(matchPlayed).length;
  return {
    total,
    played,
    pending: Math.max(total - played, 0),
    percent: total ? Math.round((played / total) * 100) : 0
  };
}

function getLatestTournamentChampion(state){
  const rows = buildTournamentArchiveRows(state);
  return rows[0] || null;
}


function buildDataDiagnostics(state){
  const issues = [];
  const aliasMap = new Map();
  (state.users || []).forEach((user) => {
    const alias = String(user.alias || "").trim().toLowerCase();
    if (!alias) issues.push({ type: "Usuario sin alias", detail: user.name || user.id });
    if (aliasMap.has(alias)) issues.push({ type: "Alias duplicado", detail: `${user.alias} también existe en otro usuario.` });
    aliasMap.set(alias, user.id);
  });
  (state.teams || []).forEach((team) => {
    if (!team.logo) issues.push({ type: "Equipo sin logo", detail: team.name });
    (team.players || []).forEach(([playerName]) => {
      if (!getPlayerPhoto(team.id, playerName)) issues.push({ type: "Jugador sin foto", detail: `${playerName} · ${team.short || team.name}` });
    });
  });
  state.tournaments.forEach((t) => {
    const participantIds = new Set((t.participants || []).map((p) => p.userId));
    (t.matches || []).forEach((m) => {
      if (!participantIds.has(m.homeUserId) || !participantIds.has(m.awayUserId)) issues.push({ type: "Partido con usuario fuera del torneo", detail: `${t.name} · ${m.round}` });
      matchGoalIssues(m).forEach((issue) => issues.push({ type: "Marcador vs goles", detail: `${t.name} · ${getUser(state, m.homeUserId).alias} vs ${getUser(state, m.awayUserId).alias}: ${issue}` }));
      (m.goalEvents || []).forEach((event) => {
        const validTeam = event.side === "home" ? m.homeTeamId : m.awayTeamId;
        if (event.teamId !== validTeam) issues.push({ type: "Gol asociado a equipo incorrecto", detail: `${t.name} · ${event.playerName}` });
        if (event.minute && (!Number.isInteger(Number(event.minute)) || Number(event.minute) < 1 || Number(event.minute) > 90)) issues.push({ type: "Minuto fuera de rango", detail: `${t.name} · ${event.playerName}: ${event.minute}` });
      });
    });
    if (!(t.participants || []).length) issues.push({ type: "Torneo sin participantes", detail: t.name });
    if (t.status !== "preparing" && !(t.matches || []).length) issues.push({ type: "Torneo activo sin fixture", detail: t.name });
    if (t.status === "closed" && (!t.championUserId || !t.championTeamId)) issues.push({ type: "Torneo cerrado sin campeón", detail: t.name });
  });
  return issues;
}

function canViewTournament(state, tournament, userId){
  if (!tournament || !userId) return false;
  if (tournament.creatorId === userId) return true;
  if ((tournament.participants || []).some((p) => p.userId === userId)) return true;
  if ((state.invitations || []).some((i) => i.tournamentId === tournament.id && i.toUserId === userId)) return true;
  if ((tournament.joinRequests || []).some((r) => r.userId === userId)) return true;
  return false;
}

function getVisibleTournamentsForUser(state, userId){
  return state.tournaments.filter((t) => canViewTournament(state, t, userId));
}

function tournamentAccessLabel(state, tournament, userId){
  if (tournament.creatorId === userId) return "Creado por ti";
  if ((tournament.participants || []).some((p) => p.userId === userId)) return "Participas";
  if ((state.invitations || []).some((i) => i.tournamentId === tournament.id && i.toUserId === userId && i.status === "pending")) return "Invitación pendiente";
  if ((tournament.joinRequests || []).some((r) => r.userId === userId && r.status === "pending")) return "Solicitud pendiente";
  if ((tournament.joinRequests || []).some((r) => r.userId === userId && r.status === "rejected")) return "Solicitud rechazada";
  return "Acceso permitido";
}

function getWorldSummary(state){
  const userRanking = buildUserRanking(state);
  const teamRanking = buildTeamRanking(state);
  const records = buildRecords(state);
  const closed = state.tournaments.filter((t) => t.status === "closed" && t.championUserId);
  const played = state.tournaments.flatMap((t) => t.matches).filter(matchPlayed).length;
  const activeCount = state.tournaments.filter((t) => t.status !== "closed").length;
  const privateCount = state.tournaments.filter((t) => t.visibility !== "public").length;
  return { userRanking, teamRanking, records, closed, played, activeCount, privateCount };
}

function App(){
  const [state, setState] = useState(loadInitialState);
  const [view, setView] = useState("inicio");
  const [selectedTournamentId, setSelectedTournamentId] = useState(state.tournaments[0]?.id || null);
  const [rankingScope, setRankingScope] = useState("global");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [theme, setTheme] = useState(loadTheme);
  const [cloudSession, setCloudSession] = useState(null);
  const [cloudProfile, setCloudProfile] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(Boolean(supabaseClient));
  const [cloudNotice, setCloudNotice] = useState("");
  const [cloudFriendsLoading, setCloudFriendsLoading] = useState(false);
  const [cloudFriendsNotice, setCloudFriendsNotice] = useState("");
  const [cloudTournamentsLoading, setCloudTournamentsLoading] = useState(false);
  const [cloudTournamentsNotice, setCloudTournamentsNotice] = useState("");
  const [cloudRankings, setCloudRankings] = useState({ userRanking: [], teamRanking: [], userTeamRanking: [], goalRanking: [], assistRanking: [], playerRanking: [], loaded: false });
  const [cloudRankingsLoading, setCloudRankingsLoading] = useState(false);
  const [cloudRankingsNotice, setCloudRankingsNotice] = useState("");

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!supabaseClient) {
      setCloudLoading(false);
      return undefined;
    }

    let active = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!active) return;
      handleCloudSession(data.session, null, { silent: true });
    }).catch(() => {
      if (!active) return;
      setCloudLoading(false);
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      handleCloudSession(session, null, { silent: true });
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    refreshCloudFriends({ silent: true });
    refreshCloudTournaments({ silent: true });
  }, [cloudSession?.user?.id]);


  useEffect(() => {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    refreshCloudRankings({ silent: true });
  }, [cloudSession?.user?.id, seasonFilter]);

  const currentUser = getEffectiveUser(state, cloudSession, cloudProfile);
  const effectiveUserId = currentUser?.id || state.currentUserId;
  const visibleTournaments = useMemo(() => getVisibleTournamentsForUser(state, effectiveUserId), [state, effectiveUserId]);
  const selectedTournament = visibleTournaments.find((t) => t.id === selectedTournamentId) || visibleTournaments[0] || null;
  const cloudModeActive = Boolean(supabaseClient && cloudSession?.user?.id);
  const friendIds = useMemo(() => getFriendIds(state, effectiveUserId, { cloudOnly: cloudModeActive }), [state, effectiveUserId, cloudModeActive]);
  const myRankingIds = useMemo(() => [effectiveUserId, ...friendIds], [effectiveUserId, friendIds]);
  const rankingUsers = useMemo(() => {
    if (cloudModeActive && cloudRankings.loaded) {
      const base = rankingScope === "friends" ? cloudRankings.userRanking.filter((row) => myRankingIds.includes(row.userId)) : cloudRankings.userRanking;
      return base.map((row, index) => ({ ...row, pos: index + 1 }));
    }
    return buildUserRanking(state, rankingScope === "friends" ? myRankingIds : null, seasonFilter);
  }, [state, rankingScope, myRankingIds, seasonFilter, cloudModeActive, cloudRankings]);
  const globalRankingUsers = useMemo(() => cloudModeActive && cloudRankings.loaded ? cloudRankings.userRanking : buildUserRanking(state, null, "all"), [state, cloudModeActive, cloudRankings]);
  const teamRanking = useMemo(() => cloudModeActive && cloudRankings.loaded ? cloudRankings.teamRanking : buildTeamRanking(state, seasonFilter), [state, seasonFilter, cloudModeActive, cloudRankings]);
  const userTeamRanking = useMemo(() => cloudModeActive && cloudRankings.loaded ? cloudRankings.userTeamRanking : buildUserTeamRanking(state, seasonFilter), [state, seasonFilter, cloudModeActive, cloudRankings]);

  async function ensureCloudProfile(authUser, fallback = {}) {
    if (!supabaseClient || !authUser?.id) return null;

    const existing = await supabaseClient
      .from("profiles")
      .select("id, alias, full_name, avatar_url, created_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existing.error && existing.error.code !== "PGRST116") throw existing.error;
    if (existing.data) return existing.data;

    const payload = {
      id: authUser.id,
      alias: (fallback.alias || authUser.user_metadata?.alias || safeAliasFromEmail(authUser.email)).trim(),
      full_name: (fallback.full_name || fallback.name || authUser.user_metadata?.full_name || "").trim() || null,
      avatar_url: null
    };

    const created = await supabaseClient
      .from("profiles")
      .insert(payload)
      .select("id, alias, full_name, avatar_url, created_at")
      .single();

    if (created.error) throw created.error;
    return created.data;
  }

  async function handleCloudSession(session, fallbackProfile = {}, options = {}) {
    setCloudSession(session || null);
    if (!session?.user) {
      setCloudProfile(null);
      setCloudLoading(false);
      return;
    }

    try {
      setCloudLoading(true);
      const profile = await ensureCloudProfile(session.user, fallbackProfile);
      const localUser = profileToLocalUser(profile, session.user);
      setCloudProfile(profile);
      commit((draft) => {
        const index = draft.users.findIndex((u) => u.id === localUser.id);
        if (index >= 0) draft.users[index] = { ...draft.users[index], ...localUser };
        else draft.users.push(localUser);
        draft.currentUserId = localUser.id;
        return draft;
      });
      if (!options.silent) setCloudNotice("Cuenta iniciada correctamente.");
    } catch (error) {
      const fallbackUser = profileToLocalUser(fallbackProfile?.id ? fallbackProfile : null, session.user);
      setCloudProfile(fallbackProfile?.id ? fallbackProfile : null);
      commit((draft) => {
        const index = draft.users.findIndex((u) => u.id === fallbackUser.id);
        if (index >= 0) draft.users[index] = { ...draft.users[index], ...fallbackUser };
        else draft.users.push(fallbackUser);
        draft.currentUserId = fallbackUser.id;
        return draft;
      });
      if (!options.silent) setCloudNotice(error?.message || "Tu sesión inició, pero no se pudo sincronizar el perfil completo.");
    } finally {
      setCloudLoading(false);
    }
  }

  function syncCloudFriendsToState(profileRows = [], friendshipRows = [], ownerId = null) {
    const localUsers = profileRows.map(cloudProfileToLocalUser).filter(Boolean);
    const localFriendships = friendshipRows.map(cloudFriendshipToLocal);
    commit((draft) => {
      localUsers.forEach((user) => {
        const index = draft.users.findIndex((item) => item.id === user.id);
        if (index >= 0) draft.users[index] = { ...draft.users[index], ...user };
        else draft.users.push(user);
      });

      if (ownerId) {
        draft.friends = (draft.friends || []).filter((item) => {
          if (!item.cloud) return true;
          return item.requesterId !== ownerId && item.receiverId !== ownerId;
        });
      }

      const existingIds = new Set((draft.friends || []).map((item) => item.id));
      localFriendships.forEach((item) => {
        const index = draft.friends.findIndex((current) => current.id === item.id);
        if (index >= 0) draft.friends[index] = { ...draft.friends[index], ...item };
        else if (!existingIds.has(item.id)) draft.friends.push(item);
      });
      return draft;
    });
  }

  async function refreshCloudFriends(options = {}) {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    const userId = cloudSession.user.id;
    if (!options.silent) setCloudFriendsNotice("");
    setCloudFriendsLoading(true);
    try {
      const { data: friendships, error } = await supabaseClient
        .from("friendships")
        .select("id, requester_id, receiver_id, status, created_at, responded_at")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ids = new Set([userId]);
      (friendships || []).forEach((item) => {
        ids.add(item.requester_id);
        ids.add(item.receiver_id);
      });

      let profiles = [];
      if (ids.size) {
        const { data: profileRows, error: profilesError } = await supabaseClient
          .from("profiles")
          .select("id, alias, full_name, avatar_url, created_at")
          .in("id", Array.from(ids));
        if (profilesError) throw profilesError;
        profiles = profileRows || [];
      }

      syncCloudFriendsToState(profiles, friendships || [], userId);
      if (!options.silent) setCloudFriendsNotice("Amigos actualizados.");
    } catch (error) {
      setCloudFriendsNotice(error?.message || "No se pudo actualizar la lista de amigos.");
    } finally {
      setCloudFriendsLoading(false);
    }
  }

  async function searchCloudProfiles(term) {
    if (!supabaseClient || !cloudSession?.user?.id) {
      setCloudFriendsNotice("Inicia sesión para buscar usuarios reales.");
      return [];
    }
    const clean = cleanSearchTerm(term);
    if (clean.length < 2) {
      setCloudFriendsNotice("Escribe al menos 2 caracteres para buscar.");
      return [];
    }

    setCloudFriendsLoading(true);
    setCloudFriendsNotice("");
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, alias, full_name, avatar_url, created_at")
        .or(`alias.ilike.%${clean}%,full_name.ilike.%${clean}%`)
        .limit(12);
      if (error) throw error;
      const results = (data || [])
        .filter((profile) => profile.id !== cloudSession.user.id)
        .map(cloudProfileToLocalUser)
        .filter(Boolean);
      if (!results.length) setCloudFriendsNotice("No se encontraron usuarios con ese alias o nombre.");
      return results;
    } catch (error) {
      setCloudFriendsNotice(error?.message || "No se pudo buscar usuarios.");
      return [];
    } finally {
      setCloudFriendsLoading(false);
    }
  }

  async function requestCloudFriend(receiverId) {
    if (!supabaseClient || !cloudSession?.user?.id) {
      setCloudFriendsNotice("Inicia sesión para enviar solicitudes.");
      return;
    }
    const requesterId = cloudSession.user.id;
    if (receiverId === requesterId) return setCloudFriendsNotice("No puedes agregarte a ti mismo.");
    setCloudFriendsLoading(true);
    setCloudFriendsNotice("");
    try {
      const { data: existing, error: existingError } = await supabaseClient
        .from("friendships")
        .select("id, requester_id, receiver_id, status")
        .or(`and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        if (existing.status === "accepted") {
          setCloudFriendsNotice("Ese usuario ya está en tus amigos. Si quieres volver a enviar solicitud, primero elimina la amistad.");
          await refreshCloudFriends({ silent: true });
          return;
        }
        if (existing.receiver_id === requesterId && existing.status === "pending") {
          setCloudFriendsNotice("Ese usuario ya te envió una solicitud. Puedes aceptarla en solicitudes recibidas.");
          await refreshCloudFriends({ silent: true });
          return;
        }
        if (existing.requester_id === requesterId && existing.status === "pending") {
          setCloudFriendsNotice("Ya enviaste una solicitud a ese usuario.");
          await refreshCloudFriends({ silent: true });
          return;
        }

        await deleteCloudFriendship(existing.id);
      }

      const { error } = await supabaseClient
        .from("friendships")
        .insert({ requester_id: requesterId, receiver_id: receiverId, status: "pending" });
      if (error) throw error;
      setCloudFriendsNotice("Solicitud enviada.");
      await refreshCloudFriends({ silent: true });
    } catch (error) {
      setCloudFriendsNotice(error?.message || "No se pudo enviar la solicitud.");
    } finally {
      setCloudFriendsLoading(false);
    }
  }

  async function deleteCloudFriendship(friendshipId) {
    if (!supabaseClient || !cloudSession?.user?.id || !friendshipId) return;

    // Compatibilidad: versiones antiguas podían dejar amistades locales con ids tipo "f_...".
    // Esos ids no son UUID de Supabase y no deben enviarse a la función RPC.
    if (!isUuid(friendshipId)) {
      commit((draft) => {
        draft.friends = (draft.friends || []).filter((item) => item.id !== friendshipId);
        return draft;
      });
      return;
    }

    // Preferimos una función RPC con SECURITY DEFINER para evitar bloqueos de RLS en DELETE.
    // Si la función aún no existe, usamos DELETE directo como respaldo.
    const rpcResult = await supabaseClient.rpc("delete_friendship", { friendship_id: friendshipId });
    if (!rpcResult.error) return;

    const missingFunction = ["42883", "PGRST202"].includes(rpcResult.error.code);
    if (!missingFunction) throw rpcResult.error;

    const { error } = await supabaseClient
      .from("friendships")
      .delete()
      .eq("id", friendshipId);
    if (error) throw error;
  }

  async function answerCloudFriend(friendshipId, status) {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    setCloudFriendsLoading(true);
    setCloudFriendsNotice("");
    try {
      if (status === "rejected") {
        await deleteCloudFriendship(friendshipId);
        setCloudFriendsNotice("Solicitud rechazada. La otra persona podrá enviarte una nueva solicitud más adelante.");
      } else {
        const { error } = await supabaseClient
          .from("friendships")
          .update({ status, responded_at: new Date().toISOString() })
          .eq("id", friendshipId)
          .eq("receiver_id", cloudSession.user.id);
        if (error) throw error;
        setCloudFriendsNotice("Solicitud aceptada.");
      }
      await refreshCloudFriends({ silent: true });
    } catch (error) {
      setCloudFriendsNotice(error?.message || "No se pudo responder la solicitud.");
    } finally {
      setCloudFriendsLoading(false);
    }
  }

  async function removeCloudFriend(friendshipId, options = {}) {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    const confirmed = options.skipConfirm || window.confirm(options.message || "¿Eliminar esta amistad? Después podrán enviarse una nueva solicitud si lo necesitan.");
    if (!confirmed) return;
    setCloudFriendsLoading(true);
    setCloudFriendsNotice("");
    try {
      await deleteCloudFriendship(friendshipId);
      setCloudFriendsNotice(options.notice || "Amistad eliminada. Ahora pueden enviarse una nueva solicitud.");
      await refreshCloudFriends({ silent: true });
    } catch (error) {
      setCloudFriendsNotice(error?.message || "No se pudo eliminar la amistad.");
    } finally {
      setCloudFriendsLoading(false);
    }
  }


  function syncCloudTournamentsToState(tournamentRows = [], participantRows = [], invitationRows = [], joinRows = [], matchRows = [], goalRows = [], activityRows = [], summaryRows = [], profileRows = [], ownerId = null) {
    const participantsByTournament = new Map();
    participantRows.forEach((row) => {
      if (!participantsByTournament.has(row.tournament_id)) participantsByTournament.set(row.tournament_id, []);
      participantsByTournament.get(row.tournament_id).push(row);
    });

    const joinByTournament = new Map();
    joinRows.forEach((row) => {
      if (!joinByTournament.has(row.tournament_id)) joinByTournament.set(row.tournament_id, []);
      joinByTournament.get(row.tournament_id).push(row);
    });

    const goalsByMatch = new Map();
    goalRows.forEach((row) => {
      if (!goalsByMatch.has(row.match_id)) goalsByMatch.set(row.match_id, []);
      goalsByMatch.get(row.match_id).push(row);
    });

    const matchesByTournament = new Map();
    matchRows.forEach((row) => {
      if (!matchesByTournament.has(row.tournament_id)) matchesByTournament.set(row.tournament_id, []);
      matchesByTournament.get(row.tournament_id).push(cloudMatchToLocal(row, goalsByMatch.get(row.id) || []));
    });

    const activityByTournament = new Map();
    activityRows.forEach((row) => {
      if (!activityByTournament.has(row.tournament_id)) activityByTournament.set(row.tournament_id, []);
      activityByTournament.get(row.tournament_id).push(row);
    });

    const summariesByTournament = new Map();
    summaryRows.forEach((row) => {
      if (row?.tournament_id) summariesByTournament.set(row.tournament_id, row);
    });

    const localTournaments = tournamentRows.map((row) => cloudTournamentToLocal(
      row,
      participantsByTournament.get(row.id) || [],
      joinByTournament.get(row.id) || [],
      matchesByTournament.get(row.id) || [],
      activityByTournament.get(row.id) || [],
      summariesByTournament.get(row.id) || null
    ));
    const localInvitations = invitationRows.map(cloudInvitationToLocal);
    const localUsers = profileRows.map(cloudProfileToLocalUser).filter(Boolean);

    commit((draft) => {
      localUsers.forEach((user) => {
        const index = draft.users.findIndex((item) => item.id === user.id);
        if (index >= 0) draft.users[index] = { ...draft.users[index], ...user };
        else draft.users.push(user);
      });

      draft.tournaments = (draft.tournaments || []).filter((item) => !item.cloud);
      draft.tournaments.unshift(...localTournaments);
      draft.invitations = (draft.invitations || []).filter((item) => !item.cloud);
      draft.invitations.unshift(...localInvitations);

      localTournaments.forEach((t) => {
        if (t.season && !draft.seasons.includes(t.season)) draft.seasons.unshift(t.season);
      });
      return draft;
    });
  }

  async function refreshCloudTournaments(options = {}) {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    if (!options.silent) setCloudTournamentsNotice("");
    setCloudTournamentsLoading(true);
    try {
      const { data: tournaments, error } = await supabaseClient
        .from("tournaments")
        .select("id, name, description, format, visibility, status, allow_duplicate_teams, team_selection_mode, fixture_mode, invite_code, season, creator_id, champion_user_id, champion_team_id, third_place_enabled, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (tournaments || []).map((t) => t.id);
      let participants = [];
      let invitations = [];
      let joinRows = [];
      let matches = [];
      let goalRows = [];
      let activityRows = [];
      let summaryRows = [];
      if (ids.length) {
        const [participantRes, invitationRes, joinRes, matchRes, activityRes] = await Promise.all([
          supabaseClient.from("tournament_players").select("id, tournament_id, user_id, team_id, joined_by_code, joined_at").in("tournament_id", ids),
          supabaseClient.from("tournament_invitations").select("id, tournament_id, from_user_id, to_user_id, status, created_at, responded_at").in("tournament_id", ids),
          supabaseClient.from("tournament_join_requests").select("id, tournament_id, user_id, requested_team_id, status, requested_at, resolved_at, resolved_by, reason").in("tournament_id", ids),
          supabaseClient.from("matches").select("id, tournament_id, round, home_user_id, away_user_id, home_team_id, away_team_id, home_goals, away_goals, proposed_home_goals, proposed_away_goals, proposed_penalty_winner_user_id, result_status, proposed_by, confirmed_by, played_at, sort_order, stage, bracket_round, bracket_slot, next_match_id, next_side, loser_next_match_id, loser_next_side, winner_user_id, penalty_winner_user_id, created_at").in("tournament_id", ids).order("sort_order", { ascending: true }),
          supabaseClient.from("tournament_activity").select("id, tournament_id, type, message, user_id, created_at").in("tournament_id", ids).order("created_at", { ascending: false })
        ]);
        if (participantRes.error) throw participantRes.error;
        if (invitationRes.error) throw invitationRes.error;
        if (joinRes.error) throw joinRes.error;
        if (matchRes.error) throw matchRes.error;
        if (activityRes.error) throw activityRes.error;
        participants = participantRes.data || [];
        invitations = invitationRes.data || [];
        joinRows = joinRes.data || [];
        matches = matchRes.data || [];
        activityRows = activityRes.data || [];

        if (matches.length) {
          const { data: goalsData, error: goalsError } = await supabaseClient
            .from("match_goal_events")
            .select("id, match_id, tournament_id, team_id, user_id, side, player_name, assist_name, minute, created_by, created_at")
            .in("match_id", matches.map((m) => m.id))
            .order("created_at", { ascending: true });
          if (goalsError) throw goalsError;
          goalRows = goalsData || [];
        }

        const { data: summariesData, error: summariesError } = await supabaseClient
          .from("tournament_summaries")
          .select("tournament_id, champion_user_id, champion_team_id, runner_up_user_id, runner_up_team_id, best_attack_team_id, best_defense_team_id, top_scorer_name, top_scorer_team_id, top_scorer_goals, top_assist_name, top_assist_team_id, top_assist_count, best_player_name, best_player_team_id, best_player_goals, best_player_assists, best_player_contributions, played_matches, total_goals, finished_at, summary_json, updated_at")
          .in("tournament_id", ids);
        if (summariesError && summariesError.code !== "42P01" && summariesError.code !== "PGRST205") throw summariesError;
        summaryRows = summariesData || [];
      }

      const userIds = new Set([cloudSession.user.id]);
      (tournaments || []).forEach((t) => { if (t.creator_id) userIds.add(t.creator_id); if (t.champion_user_id) userIds.add(t.champion_user_id); });
      participants.forEach((p) => userIds.add(p.user_id));
      invitations.forEach((i) => { userIds.add(i.from_user_id); userIds.add(i.to_user_id); });
      joinRows.forEach((r) => { userIds.add(r.user_id); if (r.resolved_by) userIds.add(r.resolved_by); });
      matches.forEach((m) => { userIds.add(m.home_user_id); userIds.add(m.away_user_id); if (m.proposed_by) userIds.add(m.proposed_by); if (m.confirmed_by) userIds.add(m.confirmed_by); });
      goalRows.forEach((g) => { if (g.user_id) userIds.add(g.user_id); if (g.created_by) userIds.add(g.created_by); });
      activityRows.forEach((a) => { if (a.user_id) userIds.add(a.user_id); });

      let profiles = [];
      if (userIds.size) {
        const { data: profileRows, error: profilesError } = await supabaseClient
          .from("profiles")
          .select("id, alias, full_name, avatar_url, created_at")
          .in("id", Array.from(userIds));
        if (profilesError) throw profilesError;
        profiles = profileRows || [];
      }

      syncCloudTournamentsToState(tournaments || [], participants, invitations, joinRows, matches, goalRows, activityRows, summaryRows, profiles, cloudSession.user.id);
      refreshCloudRankings({ silent: true });
      if (!options.silent) setCloudTournamentsNotice("Salas actualizadas.");
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudieron actualizar las salas.");
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function refreshCloudRankings(options = {}) {
    if (!supabaseClient || !cloudSession?.user?.id) return;
    if (!options.silent) setCloudRankingsNotice("");
    setCloudRankingsLoading(true);
    try {
      const seasonArg = seasonFilter || "all";
      const [usersRes, teamsRes, combosRes, playersRes] = await Promise.all([
        supabaseClient.rpc("get_chute_user_ranking", { p_season: seasonArg }),
        supabaseClient.rpc("get_chute_team_ranking", { p_season: seasonArg }),
        supabaseClient.rpc("get_chute_user_team_ranking", { p_season: seasonArg }),
        supabaseClient.rpc("get_chute_player_ranking", { p_season: seasonArg })
      ]);
      if (usersRes.error) throw usersRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (combosRes.error) throw combosRes.error;
      if (playersRes.error) throw playersRes.error;

      const playerRanking = normalizeCloudPlayerRanking(playersRes.data || []);
      setCloudRankings({
        userRanking: normalizeCloudUserRanking(usersRes.data || []),
        teamRanking: normalizeCloudTeamRanking(teamsRes.data || []),
        userTeamRanking: normalizeCloudUserTeamRanking(combosRes.data || []),
        playerRanking,
        goalRanking: playerRanking.filter((row) => row.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName)).map((row, index) => ({ ...row, pos: index + 1 })),
        assistRanking: playerRanking.filter((row) => row.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.playerName.localeCompare(b.playerName)).map((row, index) => ({ ...row, pos: index + 1 })),
        loaded: true
      });
      if (!options.silent) setCloudRankingsNotice("Rankings actualizados.");
    } catch (error) {
      setCloudRankingsNotice(error?.message || "No se pudieron actualizar los rankings.");
      setCloudRankings((current) => ({ ...current, loaded: false }));
    } finally {
      setCloudRankingsLoading(false);
    }
  }

  async function createCloudTournament(payload) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const rpcPayload = {
        p_name: payload.name,
        p_description: payload.description || null,
        p_format: payload.format,
        p_visibility: payload.visibility,
        p_allow_duplicate_teams: payload.teamSelectionMode === "fixed" ? Boolean(payload.allowDuplicateTeams) : true,
        p_team_selection_mode: payload.teamSelectionMode || "fixed",
        p_fixture_mode: payload.fixtureMode || "single_leg",
        p_third_place_enabled: Boolean(payload.thirdPlaceEnabled),
        p_invite_code: payload.inviteCode,
        p_season: payload.season || "Temporada 2026",
        p_creator_team_id: payload.teamSelectionMode === "fixed" ? (payload.creatorTeamId || null) : null,
        p_invite_user_ids: payload.inviteIds || []
      };

      const { data: tournamentId, error } = await supabaseClient.rpc("create_chute_tournament", rpcPayload);
      if (error) throw error;

      setCloudTournamentsNotice("Torneo creado correctamente.");
      await refreshCloudTournaments({ silent: true });
      return tournamentId;
    } catch (error) {
      const rawMessage = error?.message || "No se pudo crear el torneo.";
      const friendlyMessage = rawMessage.includes("Could not find the function") || rawMessage.includes("create_chute_tournament")
        ? "Falta aplicar una actualización de la base de datos."
        : rawMessage;
      setCloudTournamentsNotice(friendlyMessage);
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function insertCloudActivity(tournamentId, type, message, userId = cloudSession?.user?.id) {
    if (!supabaseClient || !tournamentId) return;
    await supabaseClient.from("tournament_activity").insert({ tournament_id: tournamentId, type, message, user_id: userId || null });
  }

  async function finishCloudTournamentWithFallback(tournamentId, extra = {}) {
    const championUserId = extra.champion_user_id || null;
    const championTeamId = extra.champion_team_id || null;
    const summaryJson = extra.summary_json || {};
    const nowIso = new Date().toISOString();
    const rpcAttempts = [
      {
        name: "finish_chute_tournament_safe_v174",
        args: {
          p_tournament_id: tournamentId,
          p_champion_user_id: championUserId,
          p_champion_team_id: championTeamId,
          p_summary_json: summaryJson
        }
      },
      {
        name: "finish_chute_tournament_v172",
        args: {
          p_tournament_id: tournamentId,
          p_champion_user_id: championUserId,
          p_champion_team_id: championTeamId
        }
      },
      {
        name: "close_chute_tournament",
        args: {
          p_tournament_id: tournamentId,
          p_champion_user_id: championUserId,
          p_champion_team_id: championTeamId
        }
      }
    ];

    const rpcErrors = [];
    for (const attempt of rpcAttempts) {
      const { error } = await supabaseClient.rpc(attempt.name, attempt.args);
      if (!error) return { ok: true, mode: attempt.name };
      rpcErrors.push(`${attempt.name}: ${error.message || error.code || "error"}`);
    }

    const fallbackPayload = {
      status: "closed",
      champion_user_id: championUserId,
      champion_team_id: championTeamId,
      updated_at: nowIso
    };
    const { error: tournamentError } = await supabaseClient
      .from("tournaments")
      .update(fallbackPayload)
      .eq("id", tournamentId);

    if (tournamentError) {
      return { ok: false, error: tournamentError, rpcErrors };
    }

    const summaryPayload = {
      tournament_id: tournamentId,
      champion_user_id: championUserId,
      champion_team_id: championTeamId,
      runner_up_user_id: summaryJson.runnerUpUserId || null,
      runner_up_team_id: summaryJson.runnerUpTeamId || null,
      best_attack_team_id: summaryJson.bestAttackTeamId || null,
      best_defense_team_id: summaryJson.bestDefenseTeamId || null,
      top_scorer_name: summaryJson.topScorerName || null,
      top_scorer_team_id: summaryJson.topScorerTeamId || null,
      top_scorer_goals: Number(summaryJson.topScorerGoals || 0),
      top_assist_name: summaryJson.topAssistName || null,
      top_assist_team_id: summaryJson.topAssistTeamId || null,
      top_assist_count: Number(summaryJson.topAssistCount || 0),
      best_player_name: summaryJson.bestPlayerName || null,
      best_player_team_id: summaryJson.bestPlayerTeamId || null,
      best_player_goals: Number(summaryJson.bestPlayerGoals || 0),
      best_player_assists: Number(summaryJson.bestPlayerAssists || 0),
      best_player_contributions: Number(summaryJson.bestPlayerContributions || 0),
      played_matches: Number(summaryJson.playedMatches || 0),
      total_goals: Number(summaryJson.totalGoals || 0),
      finished_at: nowIso,
      summary_json: summaryJson,
      updated_at: nowIso
    };

    await supabaseClient
      .from("tournament_summaries")
      .upsert(summaryPayload, { onConflict: "tournament_id" });

    await insertCloudActivity(tournamentId, "closed", "El torneo fue finalizado.");
    return { ok: true, mode: "direct_update_fallback", rpcErrors };
  }

  async function updateCloudTournamentStatus(tournamentId, status, extra = {}) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      if (status === "closed") {
        const result = await finishCloudTournamentWithFallback(tournamentId, extra);
        if (!result.ok) {
          const message = result.error?.message || "No se pudo finalizar el torneo.";
          throw new Error(message);
        }
        setCloudTournamentsNotice("Torneo finalizado correctamente.");
        await refreshCloudTournaments({ silent: true });
        return true;
      }

      const payload = { status, ...extra };
      payload.champion_user_id = null;
      payload.champion_team_id = null;
      const { error } = await supabaseClient.from("tournaments").update(payload).eq("id", tournamentId);
      if (error) throw error;
      await insertCloudActivity(tournamentId, "status", `El torneo cambió a estado: ${STATUS_LABELS[status] || status}.`);
      await refreshCloudTournaments({ silent: true });
      return true;
    } catch (error) {
      const rawMessage = error?.message || "No se pudo actualizar el estado del torneo.";
      setCloudTournamentsNotice(rawMessage);
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function deleteCloudTournament(tournamentId) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const { error } = await supabaseClient.from("tournaments").delete().eq("id", tournamentId);
      if (error) throw error;
      setSelectedTournamentId(null);
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Torneo eliminado.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo eliminar el torneo.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function advanceCloudPlayoff(tournament, matchId, patch = {}) {
    if (!supabaseClient || !isKnockoutTournament(tournament)) return;
    const match = (tournament?.matches || []).find((item) => item.id === matchId);
    if (!match) return;
    const source = {
      ...match,
      homeGoals: patch.homeGoals ?? match.homeGoals,
      awayGoals: patch.awayGoals ?? match.awayGoals,
      penaltyWinnerUserId: patch.penaltyWinnerUserId ?? match.penaltyWinnerUserId,
      winnerUserId: patch.winnerUserId ?? match.winnerUserId
    };
    const winnerUserId = getMatchWinnerUserId(source);
    const loserUserId = getMatchLoserUserId(source);
    if (!winnerUserId) return;

    const updates = [];
    const makeSidePatch = (side, userId) => {
      const userKey = side === "home" ? "home_user_id" : "away_user_id";
      const teamKey = side === "home" ? "home_team_id" : "away_team_id";
      return { [userKey]: userId, [teamKey]: getAdvancingTeamId(tournament, source, userId) };
    };

    if (source.nextMatchId && source.nextSide) {
      updates.push(supabaseClient.from("matches").update(makeSidePatch(source.nextSide, winnerUserId)).eq("id", source.nextMatchId));
    }
    if (source.loserNextMatchId && source.loserNextSide && loserUserId) {
      updates.push(supabaseClient.from("matches").update(makeSidePatch(source.loserNextSide, loserUserId)).eq("id", source.loserNextMatchId));
    }
    if (updates.length) {
      const results = await Promise.all(updates);
      const failed = results.find((res) => res.error);
      if (failed?.error) throw failed.error;
    }
  }

  async function generateCloudFixture(tournament) {
    if (!supabaseClient || !cloudSession?.user?.id || !tournament?.id) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const localMatches = buildTournamentFixture(tournament, { uuidIds: true });
      const { error: deleteError } = await supabaseClient.from("matches").delete().eq("tournament_id", tournament.id);
      if (deleteError) throw deleteError;
      const matchRows = localMatches.map((match, index) => ({
        tournament_id: tournament.id,
        round: match.round,
        home_user_id: match.homeUserId,
        away_user_id: match.awayUserId,
        home_team_id: match.homeTeamId || null,
        away_team_id: match.awayTeamId || null,
        sort_order: match.sortOrder || index + 1,
        stage: match.stage || null,
        bracket_round: match.bracketRound || null,
        bracket_slot: match.bracketSlot || null,
        next_match_id: match.nextMatchId || null,
        next_side: match.nextSide || null,
        loser_next_match_id: match.loserNextMatchId || null,
        loser_next_side: match.loserNextSide || null
      }));
      if (matchRows.length) {
        const { error: insertError } = await supabaseClient.from("matches").insert(matchRows);
        if (insertError) throw insertError;
      }
      const { error: updateError } = await supabaseClient.from("tournaments").update({ status: "active", champion_user_id: null, champion_team_id: null }).eq("id", tournament.id);
      if (updateError) throw updateError;
      await insertCloudActivity(tournament.id, "fixture", "Se generó el fixture del torneo.");
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Fixture guardado en la nube.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo generar el fixture.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function submitCloudMatchResult(tournament, matchId, homeGoals, awayGoals, teamSelection = {}) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    const match = (tournament?.matches || []).find((item) => item.id === matchId);
    if (!match) return false;
    const hg = Number(homeGoals);
    const ag = Number(awayGoals);
    const penaltyWinnerUserId = teamSelection.penaltyWinnerUserId || null;
    const validationMessage = validatePlayoffResult(tournament, match, hg, ag, penaltyWinnerUserId);
    if (validationMessage) {
      setCloudTournamentsNotice(validationMessage);
      return false;
    }
    const winnerUserId = hg > ag ? match.homeUserId : ag > hg ? match.awayUserId : penaltyWinnerUserId;
    const isAdmin = tournament.creatorId === cloudSession.user.id;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const basePayload = {
        home_team_id: isFreeTeamTournament(tournament) ? (teamSelection.homeTeamId || match.homeTeamId || null) : (match.homeTeamId || null),
        away_team_id: isFreeTeamTournament(tournament) ? (teamSelection.awayTeamId || match.awayTeamId || null) : (match.awayTeamId || null)
      };
      const payload = isAdmin
        ? { ...basePayload, home_goals: hg, away_goals: ag, proposed_home_goals: null, proposed_away_goals: null, proposed_penalty_winner_user_id: null, result_status: "confirmed", proposed_by: null, confirmed_by: cloudSession.user.id, played_at: today(), penalty_winner_user_id: hg === ag ? penaltyWinnerUserId : null, winner_user_id: winnerUserId || null }
        : { ...basePayload, proposed_home_goals: hg, proposed_away_goals: ag, proposed_penalty_winner_user_id: hg === ag ? penaltyWinnerUserId : null, result_status: "pending_confirmation", proposed_by: cloudSession.user.id };
      const { error } = await supabaseClient.from("matches").update(payload).eq("id", matchId);
      if (error) throw error;
      if (isAdmin) await advanceCloudPlayoff(tournament, matchId, { homeGoals: hg, awayGoals: ag, penaltyWinnerUserId, winnerUserId });
      await supabaseClient.from("tournaments").update({ status: "active", champion_user_id: null, champion_team_id: null }).eq("id", tournament.id);
      await insertCloudActivity(tournament.id, isAdmin ? "result" : "result_proposed", isAdmin ? `Resultado cargado: ${hg}-${ag}.` : `Resultado propuesto: ${hg}-${ag}.`);
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice(isAdmin ? "Resultado guardado en la nube." : "Resultado propuesto para confirmación.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo guardar el resultado.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function clearCloudMatchResult(tournament, matchId) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const { error: deleteGoalsError } = await supabaseClient.from("match_goal_events").delete().eq("match_id", matchId);
      if (deleteGoalsError) throw deleteGoalsError;
      const { error } = await supabaseClient.from("matches").update({
        home_goals: null,
        away_goals: null,
        proposed_home_goals: null,
        proposed_away_goals: null,
        result_status: null,
        proposed_by: null,
        proposed_penalty_winner_user_id: null,
        penalty_winner_user_id: null,
        winner_user_id: null,
        confirmed_by: null,
        played_at: null
      }).eq("id", matchId);
      if (error) throw error;
      await supabaseClient.from("tournaments").update({ champion_user_id: null, champion_team_id: null }).eq("id", tournament.id);
      await insertCloudActivity(tournament.id, "result_cleared", "Un partido quedó nuevamente pendiente.");
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Partido marcado como pendiente.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo limpiar el partido.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function confirmCloudMatchResult(tournament, matchId) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    const match = (tournament?.matches || []).find((item) => item.id === matchId);
    if (!match?.resultProposal) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const hg = Number(match.resultProposal.homeGoals);
      const ag = Number(match.resultProposal.awayGoals);
      const penaltyWinnerUserId = match.resultProposal.penaltyWinnerUserId || match.proposedPenaltyWinnerUserId || null;
      const validationMessage = validatePlayoffResult(tournament, match, hg, ag, penaltyWinnerUserId);
      if (validationMessage) throw new Error(validationMessage);
      const winnerUserId = hg > ag ? match.homeUserId : ag > hg ? match.awayUserId : penaltyWinnerUserId;
      const { error } = await supabaseClient.from("matches").update({
        home_goals: hg,
        away_goals: ag,
        proposed_home_goals: null,
        proposed_away_goals: null,
        proposed_penalty_winner_user_id: null,
        penalty_winner_user_id: hg === ag ? penaltyWinnerUserId : null,
        winner_user_id: winnerUserId || null,
        result_status: "confirmed",
        confirmed_by: cloudSession.user.id,
        played_at: today()
      }).eq("id", matchId);
      if (error) throw error;
      await advanceCloudPlayoff(tournament, matchId, { homeGoals: hg, awayGoals: ag, penaltyWinnerUserId, winnerUserId });
      await insertCloudActivity(tournament.id, "result_confirmed", "Se confirmó un resultado.");
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Resultado confirmado.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo confirmar el resultado.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function rejectCloudMatchResult(tournament, matchId) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const { error } = await supabaseClient.from("matches").update({ result_status: "rejected" }).eq("id", matchId);
      if (error) throw error;
      await insertCloudActivity(tournament.id, "result_rejected", "Se rechazó un resultado propuesto.");
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Resultado rechazado.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo rechazar el resultado.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function addCloudGoalEvent(tournament, matchId, event) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    const match = (tournament?.matches || []).find((item) => item.id === matchId);
    if (!match) return false;
    const isAdmin = tournament.creatorId === cloudSession.user.id;
    const baseHome = Number(isAdmin ? (match.homeGoals ?? 0) : (match.resultProposal?.homeGoals ?? match.homeGoals ?? 0));
    const baseAway = Number(isAdmin ? (match.awayGoals ?? 0) : (match.resultProposal?.awayGoals ?? match.awayGoals ?? 0));
    const nextHome = event.side === "home" ? Math.max(0, baseHome + 1) : Math.max(0, baseHome);
    const nextAway = event.side === "away" ? Math.max(0, baseAway + 1) : Math.max(0, baseAway);
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const { error: insertError } = await supabaseClient.from("match_goal_events").insert({
        match_id: matchId,
        tournament_id: tournament.id,
        team_id: event.teamId,
        user_id: event.userId || cloudSession.user.id,
        side: event.side,
        player_name: event.playerName,
        assist_name: event.assistName || null,
        minute: event.minute || null,
        created_by: cloudSession.user.id
      });
      if (insertError) throw insertError;
      const updatePayload = isAdmin
        ? { home_goals: nextHome, away_goals: nextAway, result_status: "confirmed", proposed_home_goals: null, proposed_away_goals: null, proposed_by: null, confirmed_by: cloudSession.user.id, played_at: today() }
        : { proposed_home_goals: nextHome, proposed_away_goals: nextAway, result_status: "pending_confirmation", proposed_by: cloudSession.user.id };
      const { error: updateError } = await supabaseClient.from("matches").update(updatePayload).eq("id", matchId);
      if (updateError) throw updateError;
      await supabaseClient.from("tournaments").update({ status: "active", champion_user_id: null, champion_team_id: null }).eq("id", tournament.id);
      await insertCloudActivity(tournament.id, "goal_event", `${event.playerName} fue registrado como goleador. Marcador actualizado: ${nextHome}-${nextAway}.`);
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Gol guardado en la nube.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo guardar el gol.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function removeCloudGoalEvent(tournament, matchId, eventId) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    const match = (tournament?.matches || []).find((item) => item.id === matchId);
    const removed = (match?.goalEvents || []).find((item) => item.id === eventId);
    if (!match || !removed) return false;
    const isAdmin = tournament.creatorId === cloudSession.user.id;
    const baseHome = Number(isAdmin ? (match.homeGoals ?? 0) : (match.resultProposal?.homeGoals ?? match.homeGoals ?? 0));
    const baseAway = Number(isAdmin ? (match.awayGoals ?? 0) : (match.resultProposal?.awayGoals ?? match.awayGoals ?? 0));
    const nextHome = removed.side === "home" ? Math.max(0, baseHome - 1) : Math.max(0, baseHome);
    const nextAway = removed.side === "away" ? Math.max(0, baseAway - 1) : Math.max(0, baseAway);
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      const { error: deleteError } = await supabaseClient.from("match_goal_events").delete().eq("id", eventId);
      if (deleteError) throw deleteError;
      const updatePayload = isAdmin
        ? { home_goals: nextHome, away_goals: nextAway, result_status: "confirmed", confirmed_by: cloudSession.user.id, played_at: today() }
        : { proposed_home_goals: nextHome, proposed_away_goals: nextAway, result_status: "pending_confirmation", proposed_by: cloudSession.user.id };
      const { error: updateError } = await supabaseClient.from("matches").update(updatePayload).eq("id", matchId);
      if (updateError) throw updateError;
      await insertCloudActivity(tournament.id, "goal_removed", `Se corrigió un registro de gol. Marcador actualizado: ${nextHome}-${nextAway}.`);
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice("Gol eliminado.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo eliminar el gol.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function answerCloudTournamentInvitation(invitationId, action, teamId = null) {
    if (!supabaseClient || !cloudSession?.user?.id) return false;
    const invitation = (state.invitations || []).find((item) => item.id === invitationId);
    const tournament = state.tournaments.find((item) => item.id === invitation?.tournamentId);
    if (!invitation || !tournament) return false;
    setCloudTournamentsLoading(true);
    setCloudTournamentsNotice("");
    try {
      if (action === "accepted") {
        const { error: playerError } = await supabaseClient.from("tournament_players").insert({
          tournament_id: tournament.id,
          user_id: cloudSession.user.id,
          team_id: isFreeTeamTournament(tournament) ? null : teamId
        });
        if (playerError && playerError.code !== "23505") throw playerError;
      }
      const { error } = await supabaseClient.from("tournament_invitations").update({ status: action, responded_at: new Date().toISOString() }).eq("id", invitationId).eq("to_user_id", cloudSession.user.id);
      if (error) throw error;
      await insertCloudActivity(tournament.id, action === "accepted" ? "invite_accepted" : "invite_rejected", action === "accepted" ? "Una invitación fue aceptada." : "Una invitación fue rechazada.");
      await refreshCloudTournaments({ silent: true });
      setCloudTournamentsNotice(action === "accepted" ? "Invitación aceptada." : "Invitación rechazada.");
      return true;
    } catch (error) {
      setCloudTournamentsNotice(error?.message || "No se pudo responder la invitación.");
      return false;
    } finally {
      setCloudTournamentsLoading(false);
    }
  }

  async function signInCloud(email, password) {
    if (!supabaseClient) return setCloudNotice("El acceso con cuenta todavía no está disponible.");
    setCloudNotice("");
    setCloudLoading(true);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setCloudLoading(false);
      setCloudNotice(error.message || "No se pudo iniciar sesión.");
      return;
    }
    await handleCloudSession(data.session, {}, { silent: false });
  }

  async function signUpCloud({ email, password, name, alias }) {
    if (!supabaseClient) return setCloudNotice("El acceso con cuenta todavía no está disponible.");
    setCloudNotice("");
    setCloudLoading(true);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, alias } }
    });
    if (error) {
      setCloudLoading(false);
      setCloudNotice(error.message || "No se pudo crear la cuenta.");
      return;
    }
    if (data.session) {
      await handleCloudSession(data.session, { name, alias }, { silent: false });
    } else {
      setCloudLoading(false);
      setCloudNotice("Cuenta creada. Revisa tu correo para confirmar el acceso.");
    }
  }

  async function signOutCloud() {
    if (!supabaseClient) return;
    const ownerId = cloudSession?.user?.id;
    await supabaseClient.auth.signOut();
    setCloudSession(null);
    setCloudProfile(null);
    setCloudFriendsNotice("");
    if (ownerId) {
      commit((draft) => {
        draft.friends = (draft.friends || []).filter((item) => !item.cloud || (item.requesterId !== ownerId && item.receiverId !== ownerId));
        draft.tournaments = (draft.tournaments || []).filter((item) => !item.cloud);
        draft.invitations = (draft.invitations || []).filter((item) => !item.cloud);
        return draft;
      });
    }
    setCloudNotice("Sesión cerrada.");
  }

  function commit(updater){
    setState((prev) => {
      const base = typeof structuredClone === "function" ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
      const next = typeof updater === "function" ? updater(base) : updater;
      saveState(next);
      return next;
    });
  }

  function openTournament(tournamentId){
    const target = state.tournaments.find((t) => t.id === tournamentId);
    if (!canViewTournament(state, target, effectiveUserId)) {
      alert("Este torneo no está disponible para tu usuario. Solo puedes abrir torneos creados por ti, donde participas, donde tienes invitación o donde solicitaste acceso.");
      return;
    }
    setSelectedTournamentId(tournamentId);
    setView("torneos");
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <div className="brand-card">
          <div className="logo">CH</div>
          <div>
            <strong>Chute Plataforma</strong>
            <span>Torneos y rankings de Chute</span>
          </div>
        </div>
        <nav className="side-nav">
          <NavButton id="inicio" label="Inicio" view={view} setView={setView} />
          <NavButton id="torneos" label="Torneos" view={view} setView={setView} />
          <NavButton id="mundo" label="Mundo Chute" view={view} setView={setView} />
          <NavButton id="amigos" label="Amigos" view={view} setView={setView} />
          <NavButton id="ranking" label="Ranking" view={view} setView={setView} />
          <NavButton id="equipos" label="Equipos" view={view} setView={setView} />
          <NavButton id="perfil" label="Perfil" view={view} setView={setView} />
          <NavButton id="admin" label="Ajustes" view={view} setView={setView} />
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Torneos y rankings de Chute</p>
            <h1>{pageTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
            <CloudAccount
              available={Boolean(supabaseClient)}
              session={cloudSession}
              profile={cloudProfile}
              loading={cloudLoading}
              notice={cloudNotice}
              onSignIn={signInCloud}
              onSignUp={signUpCloud}
              onSignOut={signOutCloud}
            />
            <UserSwitcher state={state} commit={commit} currentUser={currentUser} cloudSession={cloudSession} cloudAvailable={Boolean(supabaseClient)} />
          </div>
        </header>

        {view === "inicio" && <Home state={state} currentUser={currentUser} rankingUsers={globalRankingUsers} setView={setView} selectedTournament={selectedTournament} openTournament={openTournament} visibleTournaments={visibleTournaments} />}
        {view === "torneos" && <Tournaments state={state} commit={commit} currentUser={currentUser} selectedTournament={selectedTournament} setSelectedTournamentId={setSelectedTournamentId} visibleTournaments={visibleTournaments} cloudMode={cloudModeActive} cloudLoading={cloudTournamentsLoading} cloudNotice={cloudTournamentsNotice} onCloudCreateTournament={createCloudTournament} onCloudRefreshTournaments={refreshCloudTournaments} onCloudGenerateFixture={generateCloudFixture} onCloudSubmitResult={submitCloudMatchResult} onCloudClearResult={clearCloudMatchResult} onCloudConfirmResult={confirmCloudMatchResult} onCloudRejectResult={rejectCloudMatchResult} onCloudAddGoal={addCloudGoalEvent} onCloudRemoveGoal={removeCloudGoalEvent} onCloudUpdateTournamentStatus={updateCloudTournamentStatus} onCloudDeleteTournament={deleteCloudTournament} />}
        {view === "mundo" && <MundoChute state={state} openTournament={openTournament} setView={setView} />}
        {view === "amigos" && <Friends state={state} commit={commit} currentUser={currentUser} friendIds={friendIds} cloudAvailable={Boolean(supabaseClient)} cloudSession={cloudSession} cloudLoading={cloudFriendsLoading || cloudTournamentsLoading} cloudNotice={cloudFriendsNotice || cloudTournamentsNotice} onCloudSearch={searchCloudProfiles} onCloudRequest={requestCloudFriend} onCloudAnswer={answerCloudFriend} onCloudRemove={removeCloudFriend} onCloudRefresh={refreshCloudFriends} onCloudAnswerTournamentInvitation={answerCloudTournamentInvitation} />}
        {view === "ranking" && <Ranking state={state} rankingScope={rankingScope} setRankingScope={setRankingScope} seasonFilter={seasonFilter} setSeasonFilter={setSeasonFilter} rankingUsers={rankingUsers} teamRanking={teamRanking} userTeamRanking={userTeamRanking} currentUser={currentUser} cloudRankings={cloudRankings} cloudModeActive={cloudModeActive} cloudRankingsLoading={cloudRankingsLoading} cloudRankingsNotice={cloudRankingsNotice} onRefreshRankings={() => refreshCloudRankings({ silent: false })} openTournament={openTournament} />}
        {view === "equipos" && <Teams state={state} teamRanking={teamRanking} userTeamRanking={userTeamRanking} />}
        {view === "perfil" && <Profile state={state} currentUser={currentUser} friendIds={friendIds} rankingUsers={globalRankingUsers} openTournament={openTournament} visibleTournaments={visibleTournaments} />}
        {view === "admin" && <Admin state={state} commit={commit} />}
      </main>

      <nav className="bottom-nav">
        <NavButton id="inicio" label="Inicio" view={view} setView={setView} />
        <NavButton id="torneos" label="Torneos" view={view} setView={setView} />
        <NavButton id="mundo" label="Mundo" view={view} setView={setView} />
        <NavButton id="ranking" label="Ranking" view={view} setView={setView} />
        <NavButton id="perfil" label="Perfil" view={view} setView={setView} />
      </nav>
    </div>
  );
}

function pageTitle(view){
  return {
    inicio: "Panel principal",
    torneos: "Sala de torneos",
    mundo: "Mundo Chute",
    amigos: "Amigos e invitaciones",
    ranking: "Ranking Chute",
    equipos: "Equipos oficiales",
    perfil: "Mi perfil competitivo",
    admin: "Ajustes"
  }[view] || "Chute Plataforma";
}

function NavButton({ id, label, view, setView }){
  return <button className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>;
}

function CloudAccount({ available, session, profile, loading, notice, onSignIn, onSignUp, onSignOut }){
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");

  function submit(){
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) return alert("Ingresa correo y contraseña.");
    if (mode === "register") {
      const cleanName = name.trim();
      const cleanAlias = alias.trim();
      if (!cleanName || !cleanAlias) return alert("Ingresa nombre y alias.");
      onSignUp({ email: cleanEmail, password: cleanPassword, name: cleanName, alias: cleanAlias });
      return;
    }
    onSignIn(cleanEmail, cleanPassword);
  }

  if (session) {
    const displayAlias = profile?.alias || session.user?.user_metadata?.alias || safeAliasFromEmail(session.user?.email);
    return (
      <div className="cloud-account connected">
        <div>
          <strong>{displayAlias}</strong>
          <span>Sesión iniciada</span>
        </div>
        <button className="ghost small" onClick={onSignOut}>Salir</button>
      </div>
    );
  }

  return (
    <div className="cloud-login">
      <button className="secondary" onClick={() => setOpen(!open)}>Ingresar</button>
      {open && (
        <div className="floating-form auth-form">
          <div className="segmented mini-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Ingresar</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Crear cuenta</button>
          </div>
          {!available && <p className="notice warning">El acceso con cuenta aún no está disponible en este entorno.</p>}
          {mode === "register" && (
            <>
              <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder="Alias público" value={alias} onChange={(e) => setAlias(e.target.value)} />
            </>
          )}
          <input placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="primary" disabled={loading || !available} onClick={submit}>{loading ? "Procesando..." : mode === "register" ? "Crear cuenta" : "Ingresar"}</button>
          {notice && <p className="notice">{notice}</p>}
        </div>
      )}
    </div>
  );
}

function UserSwitcher({ state, commit, currentUser, cloudSession, cloudAvailable }){
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");

  function createUser(){
    const cleanName = name.trim();
    const cleanAlias = alias.trim();
    if (!cleanName || !cleanAlias) return alert("Ingresa nombre y alias.");
    if (state.users.some((u) => u.alias.toLowerCase() === cleanAlias.toLowerCase())) return alert("Ese alias ya existe.");
    commit((draft) => {
      const user = { id: uid("u"), name: cleanName, alias: cleanAlias, createdAt: today() };
      draft.users.push(user);
      draft.currentUserId = user.id;
      return draft;
    });
    setName("");
    setAlias("");
    setOpen(false);
  }

  if (cloudSession) {
    const alias = currentUser?.alias || currentUser?.name || "Jugador";
    return (
      <div className="user-box locked-user">
        <div className="avatar">{alias.slice(0, 2).toUpperCase()}</div>
        <div>
          <strong>{alias}</strong>
          <span>Cuenta activa</span>
        </div>
      </div>
    );
  }

  if (cloudAvailable) {
    return (
      <div className="user-box locked-user inactive-user">
        <div className="avatar muted">--</div>
        <div>
          <strong>Sin sesión</strong>
          <span>Ingresa para activar tu cuenta</span>
        </div>
      </div>
    );
  }

  return (
    <div className="user-box">
      <div className="avatar">{(currentUser.alias || currentUser.name).slice(0, 2).toUpperCase()}</div>
      <div>
        <strong>{currentUser.alias}</strong>
        <span>{currentUser.name}</span>
      </div>
      <select value={state.currentUserId} onChange={(e) => commit((draft) => ({ ...draft, currentUserId: e.target.value }))}>
        {state.users.map((u) => <option key={u.id} value={u.id}>{u.alias}</option>)}
      </select>
      <button className="ghost small" onClick={() => setOpen(!open)}>Nuevo</button>
      {open && (
        <div className="floating-form">
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Alias público" value={alias} onChange={(e) => setAlias(e.target.value)} />
          <button className="primary" onClick={createUser}>Crear cuenta</button>
        </div>
      )}
    </div>
  );
}

function Home({ state, currentUser, rankingUsers, setView, selectedTournament, openTournament, visibleTournaments }){
  const played = state.tournaments.flatMap((t) => t.matches).filter(matchPlayed).length;
  const totalGoals = state.tournaments.flatMap((t) => t.matches).filter(matchPlayed).reduce((sum, match) => sum + Number(match.homeGoals || 0) + Number(match.awayGoals || 0), 0);
  const leader = rankingUsers[0];
  const latestChampion = getLatestTournamentChampion(state);
  const topTeam = buildTeamRanking(state)[0];
  const topPlayers = buildPlayerContributionRanking(state).slice(0, 4);
  const topTeams = buildTeamRanking(state).slice(0, 3);
  const featuredTournaments = getFeaturedTournaments(visibleTournaments, 4);
  const recentResults = getRecentResultRows(state, visibleTournaments, 5);
  const activeTournaments = visibleTournaments.filter((t) => t.status !== "closed");
  const closedTournaments = buildTournamentArchiveRows(state).filter(({ tournament }) => visibleTournaments.some((visible) => visible.id === tournament.id));
  const myInvitations = state.invitations.filter((i) => i.toUserId === currentUser.id && i.status === "pending");
  const nextForMe = getNextMatchForUser(state, currentUser.id);

  return (
    <section className="stack product-home">
      <div className="hero-panel product-hero">
        <div>
          <p className="eyebrow">Chute Plataforma</p>
          <h2>La casa competitiva para tus torneos de Chute.</h2>
          <p>Gestiona campeonatos, fechas, resultados, perfiles, rankings y palmarés en una experiencia visual pensada como producto final.</p>
          <div className="actions-row">
            <button className="primary" onClick={() => setView("torneos")}>Crear torneo</button>
            <button className="secondary" onClick={() => setView("mundo")}>Explorar Mundo Chute</button>
            <button className="ghost" onClick={() => setView("ranking")}>Ver rankings</button>
          </div>
        </div>
        <div className="product-hero-board">
          <div className="scoreboard-main">
            <span>Campeón reciente</span>
            <strong>{latestChampion?.profile?.championUser?.alias || latestChampion?.profile?.history?.champion || "Sin campeón"}</strong>
            <small>{latestChampion ? `${latestChampion.tournament.name} · ${latestChampion.profile.championTeam?.short || latestChampion.profile.history.championTeam}` : "Finaliza un torneo para inaugurar el palmarés."}</small>
          </div>
          <div className="scoreboard-row">
            <span>Líder</span><b>{leader?.name || "Sin datos"}</b><em>{leader ? `${leader.score} pts` : "—"}</em>
          </div>
          <div className="scoreboard-row">
            <span>Equipo destacado</span><b>{topTeam?.name || "Sin datos"}</b><em>{topTeam ? `${topTeam.performance}%` : "—"}</em>
          </div>
        </div>
      </div>

      <div className="metric-grid product-metrics">
        <Metric title="Torneos activos" value={activeTournaments.length} />
        <Metric title="Torneos finalizados" value={closedTournaments.length} />
        <Metric title="Partidos jugados" value={played} />
        <Metric title="Goles registrados" value={totalGoals} />
      </div>

      {nextForMe && (
        <article className="card next-match focus-card product-next-match">
          <p className="eyebrow">Tu próximo partido</p>
          <strong>{getUser(state, nextForMe.match.homeUserId).alias} vs {getUser(state, nextForMe.match.awayUserId).alias}</strong>
          <span>{nextForMe.tournament.name} · {fixtureDateLabel(nextForMe.match)} · {getTeam(state, getMatchTeamId(nextForMe.tournament, nextForMe.match, "home")).short} vs {getTeam(state, getMatchTeamId(nextForMe.tournament, nextForMe.match, "away")).short}</span>
          <button className="primary small" onClick={() => openTournament(nextForMe.tournament.id)}>Abrir partido</button>
        </article>
      )}

      <div className="product-showcase-grid">
        <article className="card product-panel large-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Torneos</p>
              <h3>Salas destacadas</h3>
            </div>
            <button className="ghost small" onClick={() => setView("torneos")}>Ver salas</button>
          </div>
          <TournamentSpotlightList state={state} tournaments={featuredTournaments} openTournament={openTournament} setView={setView} />
        </article>

        <article className="card product-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Ranking</p>
              <h3>Podio global</h3>
            </div>
            <button className="ghost small" onClick={() => setView("ranking")}>Completo</button>
          </div>
          <ProductRankingList rows={rankingUsers.slice(0, 5)} />
        </article>
      </div>

      <div className="grid-2 product-grid">
        <article className="card product-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Equipos</p>
              <h3>Clubes destacados</h3>
            </div>
            <button className="ghost small" onClick={() => setView("equipos")}>Ver equipos</button>
          </div>
          <ProductTeamHighlights state={state} rows={topTeams} />
        </article>

        <article className="card product-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Futbolistas</p>
              <h3>Figuras del momento</h3>
            </div>
            <button className="ghost small" onClick={() => setView("ranking")}>Ver fichas</button>
          </div>
          <ProductPlayerHighlights rows={topPlayers} />
        </article>
      </div>

      <div className="grid-2 product-grid">
        <article className="card product-panel champion-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Palmarés</p>
              <h3>Último torneo destacado</h3>
            </div>
            <button className="ghost small" onClick={() => setView("mundo")}>Ver álbum</button>
          </div>
          {latestChampion ? (
            <button type="button" className="champion-card-button" onClick={() => openTournament(latestChampion.tournament.id)}>
              <span className="champion-cup">CH</span>
              <span>
                <strong>{latestChampion.tournament.name}</strong>
                <small>{latestChampion.profile.championUser?.alias || latestChampion.profile.history.champion} · {latestChampion.profile.championTeam?.short || latestChampion.profile.history.championTeam}</small>
              </span>
              <b>{latestChampion.profile.totalGoals} goles</b>
            </button>
          ) : <EmptyState title="Sin álbum histórico" text="Cuando finalices torneos, aparecerá aquí el último campeón." />}
        </article>

        <article className="card product-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Actividad</p>
              <h3>Últimos resultados</h3>
            </div>
          </div>
          <RecentResultsFeed rows={recentResults} openTournament={openTournament} />
        </article>
      </div>

      {myInvitations.length > 0 && (
        <article className="card soft-card product-alert">
          <div className="section-head">
            <div>
              <p className="eyebrow">Pendiente</p>
              <h3>Tienes invitaciones a torneos</h3>
            </div>
            <button className="secondary" onClick={() => setView("amigos")}>Responder</button>
          </div>
          <p>Acepta la invitación para seleccionar equipo y quedar vinculado al campeonato.</p>
        </article>
      )}
    </section>
  );
}

function TournamentSpotlightList({ state, tournaments, openTournament, setView }){
  if (!tournaments.length) return <EmptyState title="Sin torneos visibles" text="Crea tu primer torneo o acepta una invitación para ver salas destacadas." action="Crear torneo" onAction={() => setView("torneos")} />;
  return (
    <div className="tournament-spotlight-list">
      {tournaments.map((tournament) => {
        const progress = getTournamentProgress(tournament);
        const leader = tournamentStandings(state, tournament)[0];
        return (
          <button key={tournament.id} type="button" className="tournament-spotlight-card" onClick={() => openTournament(tournament.id)}>
            <span className={`status-pill ${tournament.status}`}>{STATUS_LABELS[tournament.status] || tournament.status}</span>
            <span className="spotlight-main"><strong>{tournament.name}</strong><small>{formatLabel(tournament.format)} · {fixtureModeLabel(tournament)} · {tournament.participants.length} jugadores</small></span>
            <span className="spotlight-progress"><b>{progress.percent}%</b><small>{progress.played}/{progress.total || 0} PJ</small></span>
            <span className="spotlight-leader"><small>Líder</small><b>{leader ? getUser(state, leader.userId).alias : "Sin tabla"}</b></span>
          </button>
        );
      })}
    </div>
  );
}

function ProductRankingList({ rows }){
  if (!rows.length) return <p className="empty">Aún no hay ranking.</p>;
  return (
    <div className="product-rank-list">
      {rows.map((row) => (
        <div className="product-rank-row" key={row.userId}>
          <span className="rank-number">#{row.pos}</span>
          <span><strong>{row.name}</strong><small>{row.pj} PJ · {row.performance}% · {row.titles} títulos</small></span>
          <b>{row.score}</b>
        </div>
      ))}
    </div>
  );
}

function ProductTeamHighlights({ state, rows }){
  if (!rows.length) return <p className="empty">Sin equipos con partidos oficiales.</p>;
  return (
    <div className="product-team-list">
      {rows.map((row) => {
        const team = getTeam(state, row.teamId);
        return (
          <div className="product-team-row" key={row.teamId}>
            <TeamLogo team={team} size="small" />
            <span><strong>{row.name}</strong><small>{row.pj} PJ · {row.pg} PG · DG {row.dg}</small></span>
            <b>{row.score}</b>
          </div>
        );
      })}
    </div>
  );
}

function ProductPlayerHighlights({ rows }){
  if (!rows.length) return <p className="empty">Registra goles y asistencias para ver figuras destacadas.</p>;
  return (
    <div className="product-player-list">
      {rows.map((row) => (
        <div className="product-player-row" key={row.key}>
          <PlayerAvatar teamId={row.teamId} playerName={row.playerName} size="small" />
          <span><strong>{row.playerName}</strong><small>{row.teamName} · {row.goals} G · {row.assists} A</small></span>
          <b>{row.contributions}</b>
        </div>
      ))}
    </div>
  );
}

function RecentResultsFeed({ rows, openTournament }){
  if (!rows.length) return <p className="empty">Aún no hay resultados recientes.</p>;
  return (
    <div className="recent-feed-list">
      {rows.map((row) => (
        <button key={row.key} type="button" className="recent-feed-row" onClick={() => openTournament(row.tournamentId)}>
          <span><strong>{row.home} {row.score} {row.away}</strong><small>{row.tournament} · {row.round}</small></span>
          <b>{row.homeTeam} vs {row.awayTeam}</b>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ title, text, action, onAction }){
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
      {action && onAction && <button className="secondary small" onClick={onAction}>{action}</button>}
    </div>
  );
}

function Metric({ title, value }){
  return <div className="metric"><span>{title}</span><strong>{value}</strong></div>;
}

function TournamentMiniTable({ state, tournament }){
  const rows = tournamentStandings(state, tournament).slice(0, 4);
  if (tournament.status === "preparing") {
    return <p className="empty">Torneo en preparación · {tournament.participants.length} participante(s) confirmados.</p>;
  }
  return <SimpleTable rows={rows} columns={["pos", "name", "teamName", "pts"]} labels={{ pos: "#", name: "Usuario", teamName: "Equipo", pts: "PTS" }} compact />;
}

function ReleaseCandidatePanel({ state, currentUser, setView, visibleTournaments, pendingInvitations }){
  const closedCount = visibleTournaments.filter((t) => t.status === "closed").length;
  const activeCount = visibleTournaments.filter((t) => t.status !== "closed").length;
  const friendships = Array.isArray(state.friends)
    ? state.friends
    : Array.isArray(state.friendships)
      ? state.friendships
      : [];
  const currentUserId = currentUser?.id;
  const hasAcceptedFriends = Boolean(currentUserId) && friendships.some((f) => {
    const firstUserId = f.requesterId || f.fromUserId;
    const secondUserId = f.receiverId || f.toUserId;
    return f.status === "accepted" && [firstUserId, secondUserId].includes(currentUserId);
  });
  const steps = [
    { title: "Crea tu perfil", detail: "Usa un alias claro para que tus amigos te reconozcan.", done: Boolean(currentUser?.alias), action: "Perfil", view: "perfil" },
    { title: "Agrega amigos", detail: "Con amigos podrás crear rankings propios e invitarlos a torneos.", done: hasAcceptedFriends, action: "Amigos", view: "amigos" },
    { title: "Crea una sala", detail: "Define formato, participantes y equipos disponibles.", done: activeCount > 0 || closedCount > 0, action: "Torneos", view: "torneos" },
    { title: "Revisa invitaciones", detail: pendingInvitations ? `Tienes ${pendingInvitations} invitación pendiente.` : "Cuando te inviten a un torneo aparecerá aquí.", done: pendingInvitations === 0, action: "Invitaciones", view: "amigos" },
    { title: "Construye historial", detail: "Finaliza torneos para alimentar rankings, logros y fichas históricas.", done: closedCount > 0, action: "Ranking", view: "ranking" }
  ];
  return (
    <article className="card release-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Primeros pasos</p>
          <h3>Comienza a organizar Chute</h3>
        </div>
        <span className="status-pill active">Guía rápida</span>
      </div>
      <p>Usa esta ruta para crear tu primera sala, invitar participantes, registrar resultados y revisar el historial competitivo.</p>
      <div className="release-grid">
        {steps.map((step) => (
          <button key={step.title} className={`release-step ${step.done ? "done" : ""}`} onClick={() => setView(step.view)}>
            <span>{step.done ? "✓" : "•"}</span>
            <strong>{step.title}</strong>
            <small>{step.detail}</small>
            <em>{step.action}</em>
          </button>
        ))}
      </div>
      <p className="hint">Puedes guardar una copia de seguridad desde Ajustes cuando quieras conservar tu historial.</p>
    </article>
  );
}

function Tournaments({ state, commit, currentUser, selectedTournament, setSelectedTournamentId, visibleTournaments, cloudMode = false, cloudLoading = false, cloudNotice = "", onCloudCreateTournament, onCloudRefreshTournaments, onCloudGenerateFixture, onCloudSubmitResult, onCloudClearResult, onCloudConfirmResult, onCloudRejectResult, onCloudAddGoal, onCloudRemoveGoal, onCloudUpdateTournamentStatus, onCloudDeleteTournament }){
  const [openPanel, setOpenPanel] = useState(null);

  function togglePanel(panel){
    setOpenPanel((current) => current === panel ? null : panel);
  }

  return (
    <section className="stack">
      <article className="card tournament-actions-card">
        <div className="section-head compact-head">
          <div>
            <h3>Acciones rápidas</h3>
            <p>Elige el flujo que quieres abrir.</p>
          </div>
        </div>
        {cloudMode && <div className="info-note compact"><strong>Torneos sincronizados</strong><span>Las salas, fixture, resultados, goles y asistencias quedan asociados a tu cuenta.</span></div>}
        {cloudNotice && <p className="notice">{cloudNotice}</p>}
        <div className="tournament-action-buttons action-card-grid">
          <button className={`action-card-button primary ${openPanel === "create" ? "open" : ""}`} aria-expanded={openPanel === "create"} onClick={() => togglePanel("create")}>
            <span>Nuevo torneo</span>
            <small>Crea una sala, elige formato e invita jugadores.</small>
          </button>
          <button className={`action-card-button secondary ${openPanel === "join" ? "open" : ""}`} aria-expanded={openPanel === "join"} onClick={() => togglePanel("join")}>
            <span>Unirse a torneo</span>
            <small>Ingresa un código y solicita tu participación.</small>
          </button>
        </div>
      </article>

      {openPanel === "join" && (
        <JoinByCodePanel state={state} commit={commit} currentUser={currentUser} setSelectedTournamentId={setSelectedTournamentId} onDone={() => setOpenPanel(null)} />
      )}
      {openPanel === "create" && (
        <CreateTournamentWizard state={state} commit={commit} currentUser={currentUser} setSelectedTournamentId={setSelectedTournamentId} onDone={() => setOpenPanel(null)} cloudMode={cloudMode} cloudLoading={cloudLoading} onCloudCreateTournament={onCloudCreateTournament} />
      )}

      <div className="tournament-vertical-layout">
        <article className="card tournament-list-card full-width-section">
          <div className="section-head solo-title">
            <div>
              <h3>Mis salas</h3>
              <p>Abre una sala para revisar partidos, tabla, goleadores, asistencias e historia.</p>
            </div>
            <span className="counter-badge">{visibleTournaments.length}</span>
          </div>
          <div className="list">
            {visibleTournaments.map((t) => {
              const confirmed = t.participants.length;
              const pendingInvites = state.invitations.filter((i) => i.tournamentId === t.id && i.status === "pending").length;
              const access = tournamentAccessLabel(state, t, currentUser.id);
              const meta = `${formatLabel(t.format)} · ${teamSelectionLabel(t)} · ${fixtureModeLabel(t)} · ${t.visibility === "private" ? "Privado" : "Público"} · ${t.season || state.currentSeason}`;
              return (
                <button key={t.id} className={`tournament-card-button ${selectedTournament?.id === t.id ? "selected" : ""}`} onClick={() => setSelectedTournamentId(t.id)}>
                  <span className="tournament-card-main">
                    <strong>{t.name}</strong>
                    <small className="room-meta-line">{meta}</small>
                    <small>{access} · Código {t.inviteCode}</small>
                  </span>
                  <span className="tournament-card-stats">
                    <em>{STATUS_LABELS[t.status]}</em>
                    <em>{confirmed} confirmados</em>
                    <em>{(t.matches || []).filter(matchPlayed).length}/{(t.matches || []).length} partidos</em>
                    <em>{t.championUserId ? `Campeón: ${getUser(state, t.championUserId).alias}` : `${pendingInvites} invitaciones pendientes`}</em>
                  </span>
                  <b>Abrir sala</b>
                </button>
              );
            })}
            {!visibleTournaments.length && <EmptyState title="Aún no tienes salas visibles" text="Crea una sala, acepta una invitación o solicita ingreso con código para comenzar tu historial Chute." action="Crear sala" onAction={() => setOpenPanel("create")} />}
          </div>
        </article>
        <div className="full-width-section tournament-detail-section">
          <TournamentRoom state={state} commit={commit} tournament={selectedTournament} currentUser={currentUser} cloudMode={cloudMode} cloudLoading={cloudLoading} onCloudGenerateFixture={onCloudGenerateFixture} onCloudSubmitResult={onCloudSubmitResult} onCloudClearResult={onCloudClearResult} onCloudConfirmResult={onCloudConfirmResult} onCloudRejectResult={onCloudRejectResult} onCloudAddGoal={onCloudAddGoal} onCloudRemoveGoal={onCloudRemoveGoal} onCloudUpdateTournamentStatus={onCloudUpdateTournamentStatus} onCloudDeleteTournament={onCloudDeleteTournament} />
        </div>
      </div>
    </section>
  );
}

function JoinByCodePanel({ state, commit, currentUser, setSelectedTournamentId, onDone }){
  const [code, setCode] = useState("");
  const [teamId, setTeamId] = useState(state.teams[0]?.id || "");
  const tournament = state.tournaments.find((t) => t.inviteCode?.toLowerCase() === code.trim().toLowerCase());
  const freeTeams = tournament ? isFreeTeamTournament(tournament) : false;
  const used = tournament ? usedTeamIds(tournament) : new Set();
  const alreadyIn = tournament?.participants?.some((p) => p.userId === currentUser.id);
  const existingRequest = tournament?.joinRequests?.find((r) => r.userId === currentUser.id && r.status === "pending");

  function requestJoin(){
    if (!tournament) return alert("No se encontró un torneo con ese código.");
    if (alreadyIn) {
      setSelectedTournamentId(tournament.id);
      return alert("Ya formas parte de este torneo.");
    }
    if (existingRequest) return alert("Ya tienes una solicitud pendiente para este torneo.");
    if (tournament.status !== "preparing") return alert("Solo puedes solicitar ingreso mientras el torneo está en preparación.");
    if (!freeTeams && !teamId) return alert("Elige un equipo.");
    if (!freeTeams && !tournament.allowDuplicateTeams && used.has(teamId)) return alert("Ese equipo ya fue elegido en este torneo.");
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      if (!t.joinRequests) t.joinRequests = [];
      t.joinRequests.unshift({ id: uid("jr"), userId: currentUser.id, teamId: freeTeams ? null : teamId, status: "pending", requestedAt: today(), resolvedAt: null });
      addActivity(t, "join_request", freeTeams ? `${currentUser.alias} solicitó entrar al torneo.` : `${currentUser.alias} solicitó entrar con ${getTeam(draft, teamId).short}.`, currentUser.id);
      return draft;
    });
    setSelectedTournamentId(tournament.id);
    setCode("");
    onDone?.();
  }

  return (
    <article className="card code-card collapsible-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Unirse a torneo</p>
          <h3>Solicitar ingreso con código</h3>
        </div>
      </div>
      <div className="form-grid three">
        <label>Código<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej: APERT-2026" /></label>
        {!freeTeams && <label>Equipo solicitado<select value={teamId} onChange={(e) => setTeamId(e.target.value)}>{state.teams.map((team) => <option key={team.id} value={team.id} disabled={!!tournament && !tournament.allowDuplicateTeams && used.has(team.id)}>{team.name}</option>)}</select></label>}
        {freeTeams && <label>Modo de equipos<input value="Equipo libre por partido" readOnly /></label>}
        <label>Estado<input value={tournament ? existingRequest ? "Solicitud pendiente" : `${tournament.name} · ${STATUS_LABELS[tournament.status]}` : "Sin coincidencia"} readOnly /></label>
      </div>
      <div className="actions-row"><button className="secondary" onClick={requestJoin}>Enviar solicitud</button>{tournament && <button className="ghost" onClick={() => setSelectedTournamentId(tournament.id)}>Abrir sala</button>}</div>
      <p className="hint">El código crea una solicitud que el creador acepta o rechaza desde la sala.</p>
    </article>
  );
}

function CreateTournamentWizard({ state, commit, currentUser, setSelectedTournamentId, onDone, cloudMode = false, cloudLoading = false, onCloudCreateTournament }){
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("league");
  const [visibility, setVisibility] = useState("private");
  const [season, setSeason] = useState(state.currentSeason || CURRENT_SEASON);
  const [allowDuplicateTeams, setAllowDuplicateTeams] = useState(false);
  const [teamSelectionMode, setTeamSelectionMode] = useState("fixed");
  const [fixtureMode, setFixtureMode] = useState("single_leg");
  const [thirdPlaceEnabled, setThirdPlaceEnabled] = useState(true);
  const [creatorTeamId, setCreatorTeamId] = useState(state.teams[0]?.id || "");
  const [inviteIds, setInviteIds] = useState([]);

  const friendIds = getFriendIds(state, currentUser.id);
  const friends = state.users.filter((u) => friendIds.includes(u.id));

  function toggleInvite(userId){
    setInviteIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  }

  async function create(){
    const clean = name.trim();
    if (!clean) return alert("Ingresa un nombre para el torneo.");
    if (teamSelectionMode === "fixed" && !creatorTeamId) return alert("Elige tu equipo para el torneo.");

    const cloudPayload = {
      name: clean,
      description: description.trim(),
      format,
      visibility,
      season: season.trim() || state.currentSeason || CURRENT_SEASON,
      inviteCode: makeInviteCode(clean),
      allowDuplicateTeams,
      teamSelectionMode,
      fixtureMode,
      thirdPlaceEnabled: format === "knockout" ? thirdPlaceEnabled : false,
      creatorTeamId,
      inviteIds
    };

    if (cloudMode && onCloudCreateTournament) {
      const cloudId = await onCloudCreateTournament(cloudPayload);
      if (cloudId) {
        setSelectedTournamentId(cloudId);
        setName("");
        setDescription("");
        setInviteIds([]);
        setFixtureMode("single_leg");
        setThirdPlaceEnabled(true);
        setStep(1);
        onDone?.();
      }
      return;
    }

    const tournament = {
      id: uid("t"),
      name: clean,
      description: description.trim(),
      format,
      visibility,
      season: season.trim() || state.currentSeason || CURRENT_SEASON,
      inviteCode: makeInviteCode(clean),
      status: "preparing",
      allowDuplicateTeams: teamSelectionMode === "fixed" ? allowDuplicateTeams : true,
      teamSelectionMode,
      fixtureMode,
      thirdPlaceEnabled: format === "knockout" ? thirdPlaceEnabled : false,
      creatorId: currentUser.id,
      createdAt: today(),
      participants: [{ userId: currentUser.id, teamId: teamSelectionMode === "fixed" ? creatorTeamId : null, joinedAt: today() }],
      matches: [],
      championUserId: null,
      championTeamId: null,
      joinRequests: [],
      activity: [createActivity("created", `${currentUser.alias} creó el torneo.`, currentUser.id)]
    };

    const invites = inviteIds.map((userId) => ({
      id: uid("i"),
      tournamentId: tournament.id,
      fromUserId: currentUser.id,
      toUserId: userId,
      status: "pending",
      createdAt: today(),
      respondedAt: null
    }));

    commit((draft) => {
      draft.tournaments.unshift(tournament);
      if (!draft.seasons.includes(tournament.season)) draft.seasons.unshift(tournament.season);
      draft.invitations.unshift(...invites);
      return draft;
    });
    setSelectedTournamentId(tournament.id);
    setName("");
    setDescription("");
    setInviteIds([]);
    setFixtureMode("single_leg");
    setThirdPlaceEnabled(true);
    setStep(1);
    onDone?.();
  }

  return (
    <article className="card create-card collapsible-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Nuevo torneo</p>
          <h3>Creación guiada</h3>
        </div>
        <div className="stepper">
          {[1,2,3].map((n) => <button key={n} className={step === n ? "active" : ""} onClick={() => setStep(n)}>{n}</button>)}
        </div>
      </div>

      {step === 1 && (
        <div className="wizard-panel">
          <div className="form-grid three">
            <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Copa Gato Dulce 2026" /></label>
            <label>Formato<select value={format} onChange={(e) => setFormat(e.target.value)}><option value="league">Liga</option><option value="league_playoff">Liga + Playoff</option><option value="groups">Copa con grupos</option><option value="knockout">Eliminación directa</option></select></label>
            <label>Visibilidad<select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="private">Privado</option><option value="public">Público</option></select></label>
            <label>Temporada<input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Ej: Temporada 2026" /></label>
          </div>
          <div className="mode-choice-grid">
            <button type="button" className={`mode-choice ${teamSelectionMode === "fixed" ? "active" : ""}`} onClick={() => setTeamSelectionMode("fixed")}>
              <strong>Equipo fijo</strong>
              <span>Cada usuario elige un equipo y lo mantiene durante todo el torneo.</span>
            </button>
            <button type="button" className={`mode-choice ${teamSelectionMode === "free_per_match" ? "active" : ""}`} onClick={() => setTeamSelectionMode("free_per_match")}>
              <strong>Equipo libre por partido</strong>
              <span>Los usuarios pueden usar equipos distintos en cada fecha o partido.</span>
            </button>
          </div>
          <div className="mode-choice-grid fixture-mode-grid">
            <button type="button" className={`mode-choice ${fixtureMode === "single_leg" ? "active" : ""}`} onClick={() => setFixtureMode("single_leg")}>
              <strong>Solo ida</strong>
              <span>Cada cruce entre usuarios se juega una sola vez.</span>
            </button>
            <button type="button" className={`mode-choice ${fixtureMode === "double_leg" ? "active" : ""}`} onClick={() => setFixtureMode("double_leg")}>
              <strong>Ida y vuelta</strong>
              <span>Cada cruce genera dos partidos, alternando local y visita.</span>
            </button>
          </div>
          {format === "knockout" && (
            <div className="info-note playoff-note">
              <strong>Definición de eliminación directa</strong>
              <span>Si un partido termina empatado, se elegirá ganador por penales.</span>
              <label className="check-line block"><input type="checkbox" checked={thirdPlaceEnabled} onChange={(e) => setThirdPlaceEnabled(e.target.checked)} /> Incluir partido por tercer lugar</label>
            </div>
          )}
          <label>Descripción<textarea className="short-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reglas, contexto o nombre de temporada" /></label>
          <div className="actions-row"><button className="primary" onClick={() => setStep(2)}>Continuar</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-panel">
          <div className="form-grid two">
            {teamSelectionMode === "fixed" && <label>Tu equipo para este torneo<select value={creatorTeamId} onChange={(e) => setCreatorTeamId(e.target.value)}>{state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
            {teamSelectionMode === "fixed" && <label className="check-line block"><input type="checkbox" checked={allowDuplicateTeams} onChange={(e) => setAllowDuplicateTeams(e.target.checked)} /> Permitir equipos repetidos en este torneo</label>}
            {teamSelectionMode === "free_per_match" && <div className="info-note"><strong>Equipo libre por partido</strong><span>Los participantes no quedan asociados a un equipo al aceptar. El equipo se define en cada partido.</span></div>}
          </div>
          <h4>Invitar amigos</h4>
          <div className="participant-grid">
            {friends.map((u) => <label className={`participant-card ${inviteIds.includes(u.id) ? "on" : ""}`} key={u.id}><span className="check-line"><input type="checkbox" checked={inviteIds.includes(u.id)} onChange={() => toggleInvite(u.id)} /> <strong>{u.alias}</strong></span><small>{u.name}</small></label>)}
            {!friends.length && <p className="empty">Primero agrega amigos para poder invitarlos.</p>}
          </div>
          <div className="actions-row"><button className="ghost" onClick={() => setStep(1)}>Volver</button><button className="primary" onClick={() => setStep(3)}>Revisar</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-panel">
          <div className="review-card">
            <p className="eyebrow">Resumen</p>
            <h3>{name || "Torneo sin nombre"}</h3>
            <div className="info-grid">
              <span>Formato <strong>{formatLabel(format)}</strong></span>
              <span>Visibilidad <strong>{visibility === "private" ? "Privado" : "Público"}</strong></span>
              <span>Temporada <strong>{season || state.currentSeason}</strong></span>
              <span>Modo equipos <strong>{formatTeamSelectionMode(teamSelectionMode)}</strong></span>
              <span>Partidos <strong>{format === "knockout" ? "Llave eliminatoria" : FIXTURE_MODE_LABELS[fixtureMode]}</strong></span>
              {format === "knockout" && <span>Tercer lugar <strong>{thirdPlaceEnabled ? "Sí" : "No"}</strong></span>}
              <span>Tu equipo <strong>{teamSelectionMode === "fixed" ? getTeam(state, creatorTeamId).short : "Libre por partido"}</strong></span>
              <span>Invitados <strong>{inviteIds.length}</strong></span>
            </div>
            <p>El torneo quedará en preparación. {teamSelectionMode === "fixed" ? "Los invitados deberán aceptar y elegir equipo." : "Los participantes elegirán equipo en cada partido."} Luego podrás generar el fixture desde la sala del torneo.</p>
          </div>
          <div className="actions-row"><button className="ghost" onClick={() => setStep(2)}>Volver</button><button className="primary" onClick={create} disabled={cloudLoading}>{cloudMode ? cloudLoading ? "Creando en la nube..." : "Crear sala en la nube" : "Crear sala"}</button></div>
        </div>
      )}
    </article>
  );
}

function TournamentRoom({ state, commit, tournament, currentUser, cloudMode = false, cloudLoading = false, onCloudGenerateFixture, onCloudSubmitResult, onCloudClearResult, onCloudConfirmResult, onCloudRejectResult, onCloudAddGoal, onCloudRemoveGoal, onCloudUpdateTournamentStatus, onCloudDeleteTournament }){
  const [roomTab, setRoomTab] = useState("resumen");
  const [showFinishSummary, setShowFinishSummary] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    setRoomTab("resumen");
    setShowFinishSummary(false);
    setConfirmAction(null);
  }, [tournament?.id]);

  if (!tournament) return <article className="card"><p className="empty">Selecciona un torneo.</p></article>;
  if (!canViewTournament(state, tournament, currentUser.id)) return <article className="card"><p className="empty">Este torneo no está disponible para tu usuario.</p></article>;
  const standings = tournamentStandings(state, tournament);
  const scorerRows = buildGoalRanking(state, tournament.id);
  const assistRows = buildAssistRanking(state, tournament.id);
  const pendingInvites = state.invitations.filter((i) => i.tournamentId === tournament.id && i.status === "pending");
  const acceptedInvites = state.invitations.filter((i) => i.tournamentId === tournament.id && i.status === "accepted");
  const pendingJoinRequests = (tournament.joinRequests || []).filter((r) => r.status === "pending");
  const played = tournament.matches.filter(matchPlayed).length;
  const unplayed = tournament.matches.filter((m) => !matchPlayed(m)).length;
  const pendingResults = tournament.matches.filter((m) => m.resultStatus === "pending_confirmation" || m.resultStatus === "rejected").length;
  const nextMatch = tournament.matches.find((m) => !matchPlayed(m));
  const isCreator = tournament.creatorId === currentUser.id;
  const isCloudTournament = Boolean(cloudMode && tournament.cloud);
  const finishBlockReason = getFinishBlockReason(tournament);
  const finishSummary = buildTournamentFinishSummary(state, tournament, standings, scorerRows, assistRows);
  const tournamentHistory = buildTournamentHistory(state, tournament);
  const goalIssueRows = tournament.matches.flatMap((match) => matchGoalIssues(match).map((issue) => ({ match, issue })));
  const safeTab = tournament.status === "preparing" && ["partidos", "tabla", "goles", "asistencias", "historia"].includes(roomTab) ? "resumen" : roomTab;

  async function generateFixture(){
    if (tournament.participants.length < 2) return alert("Necesitas al menos 2 participantes confirmados.");
    if (isKnockoutTournament(tournament) && !isPowerOfTwo(tournament.participants.length)) return alert("La eliminación directa necesita 2, 4, 8 o 16 participantes confirmados.");
    if (!isFreeTeamTournament(tournament)) {
      const uniqueTeams = new Set(tournament.participants.map((p) => p.teamId));
      if (!tournament.allowDuplicateTeams && uniqueTeams.size !== tournament.participants.length) return alert("Hay equipos repetidos. Ajusta los equipos antes de generar fixture.");
    }
    if (isCloudTournament && onCloudGenerateFixture) {
      const ok = await onCloudGenerateFixture(tournament);
      if (ok) setRoomTab("partidos");
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      t.matches = buildTournamentFixture(t);
      t.status = "active";
      t.championUserId = null;
      t.championTeamId = null;
      addActivity(t, "fixture", "Se generó el fixture del torneo.", currentUser.id);
      return draft;
    });
    setRoomTab("partidos");
  }

  function answerJoinRequest(requestId, decision){
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      const req = (t.joinRequests || []).find((item) => item.id === requestId);
      if (!req || req.status !== "pending") return draft;
      if (decision === "accepted") {
        const alreadyIn = t.participants.some((p) => p.userId === req.userId);
        const freeTeams = isFreeTeamTournament(t);
        const teamUsed = !freeTeams && !t.allowDuplicateTeams && t.participants.some((p) => p.teamId === req.teamId);
        if (!alreadyIn && !teamUsed) {
          t.participants.push({ userId: req.userId, teamId: freeTeams ? null : req.teamId, joinedAt: today(), joinedByCode: true });
          req.status = "accepted";
          req.resolvedAt = today();
          req.resolvedBy = currentUser.id;
          addActivity(t, "join_accepted", freeTeams ? `${getUser(draft, req.userId).alias} fue aceptado en modo equipo libre.` : `${getUser(draft, req.userId).alias} fue aceptado con ${getTeam(draft, req.teamId).short}.`, currentUser.id);
        } else {
          req.status = "rejected";
          req.resolvedAt = today();
          req.reason = alreadyIn ? "Ya era participante" : "Equipo ocupado";
          addActivity(t, "join_rejected", `Solicitud de ${getUser(draft, req.userId).alias} rechazada: ${req.reason}.`, currentUser.id);
        }
      } else {
        req.status = "rejected";
        req.resolvedAt = today();
        req.resolvedBy = currentUser.id;
        addActivity(t, "join_rejected", `Solicitud de ${getUser(draft, req.userId).alias} rechazada.`, currentUser.id);
      }
      return draft;
    });
  }

  async function submitResult(matchId, homeGoals, awayGoals, teamSelection = {}){
    const hg = Number(homeGoals);
    const ag = Number(awayGoals);
    if (!scoreIsValid(hg, ag)) return alert("Ingresa un marcador válido entre 0 y 99, sin decimales.");
    if (isFreeTeamTournament(tournament) && (!teamSelection.homeTeamId || !teamSelection.awayTeamId)) return alert("Selecciona equipo local y visitante para este partido.");
    const currentMatch = tournament.matches.find((item) => item.id === matchId);
    const playoffValidation = validatePlayoffResult(tournament, currentMatch, hg, ag, teamSelection.penaltyWinnerUserId || null);
    if (playoffValidation) return alert(playoffValidation);
    if (["closed", "paused"].includes(tournament.status)) return alert("No se puede modificar un torneo pausado o finalizado.");
    if (isCloudTournament && onCloudSubmitResult) {
      await onCloudSubmitResult(tournament, matchId, hg, ag, teamSelection);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      const m = t.matches.find((item) => item.id === matchId);
      const isAdmin = t.creatorId === currentUser.id;
      if (isFreeTeamTournament(t)) {
        m.homeTeamId = teamSelection.homeTeamId || m.homeTeamId;
        m.awayTeamId = teamSelection.awayTeamId || m.awayTeamId;
      }
      if (isAdmin) {
        m.homeGoals = hg;
        m.awayGoals = ag;
        m.penaltyWinnerUserId = hg === ag ? (teamSelection.penaltyWinnerUserId || null) : null;
        m.winnerUserId = hg > ag ? m.homeUserId : ag > hg ? m.awayUserId : m.penaltyWinnerUserId;
        m.resultStatus = "confirmed";
        m.resultProposal = null;
        m.playedAt = today();
        applyPlayoffAdvancement(t, matchId);
        addActivity(t, "result", `${getUser(draft, m.homeUserId).alias} ${hg}-${ag} ${getUser(draft, m.awayUserId).alias} fue cargado/corregido por el creador.`, currentUser.id);
      } else {
        if (![m.homeUserId, m.awayUserId].includes(currentUser.id)) return draft;
        m.resultProposal = { homeGoals: hg, awayGoals: ag, penaltyWinnerUserId: hg === ag ? (teamSelection.penaltyWinnerUserId || null) : null, proposedBy: currentUser.id, status: "pending", createdAt: today() };
        m.resultStatus = "pending_confirmation";
        addActivity(t, "result_proposed", `${currentUser.alias} propuso resultado ${hg}-${ag}.`, currentUser.id);
      }
      t.championUserId = null;
      t.championTeamId = null;
      t.status = "active";
      return draft;
    });
  }

  function clearMatchResult(matchId){
    if (["closed", "paused"].includes(tournament.status)) return alert("No se puede modificar un torneo pausado o finalizado.");
    const match = tournament.matches.find((item) => item.id === matchId);
    setConfirmAction({
      title: "Dejar partido pendiente",
      description: `Se borrará el marcador, la propuesta y el detalle de goles/asistencias de ${match ? `${getUser(state, match.homeUserId).alias} vs ${getUser(state, match.awayUserId).alias}` : "este partido"}. Esta acción no se puede deshacer automáticamente.`,
      intent: "warning",
      confirmLabel: "Marcar pendiente",
      onConfirm: async () => {
        if (isCloudTournament && onCloudClearResult) {
          await onCloudClearResult(tournament, matchId);
          setConfirmAction(null);
          return;
        }
        commit((draft) => {
          const t = draft.tournaments.find((item) => item.id === tournament.id);
          const m = t.matches.find((item) => item.id === matchId);
          if (!m) return draft;
          const isAdmin = t.creatorId === currentUser.id;
          const isInMatch = [m.homeUserId, m.awayUserId].includes(currentUser.id);
          if (!isAdmin && !isInMatch) return draft;
          m.homeGoals = null;
          m.awayGoals = null;
          m.resultStatus = null;
          m.resultProposal = null;
          m.penaltyWinnerUserId = null;
          m.winnerUserId = null;
          m.confirmedBy = null;
          m.playedAt = null;
          m.goalEvents = [];
          t.championUserId = null;
          t.championTeamId = null;
          if (t.status === "closed") t.status = "active";
          addActivity(t, "result_cleared", `${getUser(draft, m.homeUserId).alias} vs ${getUser(draft, m.awayUserId).alias} quedó nuevamente pendiente.`, currentUser.id);
          return draft;
        });
        setConfirmAction(null);
      }
    });
  }

  async function confirmResult(matchId){
    if (isCloudTournament && onCloudConfirmResult) {
      await onCloudConfirmResult(tournament, matchId);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      const m = t.matches.find((item) => item.id === matchId);
      if (!m?.resultProposal) return draft;
      const proposerId = m.resultProposal.proposedBy;
      const isOpponent = [m.homeUserId, m.awayUserId].includes(currentUser.id) && currentUser.id !== proposerId;
      const isAdmin = t.creatorId === currentUser.id;
      if (!isOpponent && !isAdmin) return draft;
      m.homeGoals = Number(m.resultProposal.homeGoals);
      m.awayGoals = Number(m.resultProposal.awayGoals);
      m.penaltyWinnerUserId = m.homeGoals === m.awayGoals ? (m.resultProposal.penaltyWinnerUserId || null) : null;
      m.winnerUserId = m.homeGoals > m.awayGoals ? m.homeUserId : m.awayGoals > m.homeGoals ? m.awayUserId : m.penaltyWinnerUserId;
      m.resultStatus = "confirmed";
      m.confirmedBy = currentUser.id;
      m.resultProposal = null;
      m.playedAt = today();
      applyPlayoffAdvancement(t, matchId);
      t.championUserId = null;
      t.championTeamId = null;
      addActivity(t, "result_confirmed", `${currentUser.alias} confirmó un resultado.`, currentUser.id);
      return draft;
    });
  }

  async function rejectResult(matchId){
    if (isCloudTournament && onCloudRejectResult) {
      await onCloudRejectResult(tournament, matchId);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      const m = t.matches.find((item) => item.id === matchId);
      if (!m?.resultProposal) return draft;
      const proposerId = m.resultProposal.proposedBy;
      const isOpponent = [m.homeUserId, m.awayUserId].includes(currentUser.id) && currentUser.id !== proposerId;
      const isAdmin = t.creatorId === currentUser.id;
      if (!isOpponent && !isAdmin) return draft;
      m.resultProposal = { ...m.resultProposal, status: "rejected", rejectedBy: currentUser.id, rejectedAt: today() };
      m.resultStatus = "rejected";
      addActivity(t, "result_rejected", `${currentUser.alias} rechazó un resultado propuesto.`, currentUser.id);
      return draft;
    });
  }

  function closeTournament(){
    if (!isCreator) return alert("Solo el creador puede finalizar este torneo.");
    const blockReason = getFinishBlockReason(tournament);
    if (blockReason) return alert(blockReason);
    const champion = getTournamentChampionRow(state, tournament, standings);
    if (!champion) return alert("No hay campeón calculable todavía.");
    setShowFinishSummary(true);
  }

  async function confirmCloseTournament(){
    const champion = getTournamentChampionRow(state, tournament, standings);
    if (!champion) return alert("No hay campeón calculable todavía.");
    if (isCloudTournament && onCloudUpdateTournamentStatus) {
      const bestPlayer = buildPlayerContributionRanking(state, tournament.id)[0] || null;
      const cloudSummary = {
        source: "client_1_7_4",
        runnerUpUserId: finishSummary.runnerUp?.userId || null,
        runnerUpTeamId: finishSummary.runnerUp?.teamId || null,
        bestAttackTeamId: finishSummary.bestAttack?.teamId || null,
        bestDefenseTeamId: finishSummary.bestDefense?.teamId || null,
        topScorerName: finishSummary.topScorer?.playerName || null,
        topScorerTeamId: finishSummary.topScorer?.teamId || null,
        topScorerGoals: Number(finishSummary.topScorer?.goals || 0),
        topAssistName: finishSummary.topAssist?.playerName || null,
        topAssistTeamId: finishSummary.topAssist?.teamId || null,
        topAssistCount: Number(finishSummary.topAssist?.assists || 0),
        bestPlayerName: bestPlayer?.playerName || null,
        bestPlayerTeamId: bestPlayer?.teamId || null,
        bestPlayerGoals: Number(bestPlayer?.goals || 0),
        bestPlayerAssists: Number(bestPlayer?.assists || 0),
        bestPlayerContributions: Number(bestPlayer?.contributions || 0),
        playedMatches: Number(finishSummary.playedMatches || 0),
        totalGoals: Number(finishSummary.totalGoals || 0)
      };
      const ok = await onCloudUpdateTournamentStatus(tournament.id, "closed", { champion_user_id: champion.userId, champion_team_id: champion.teamId, summary_json: cloudSummary });
      if (ok) setShowFinishSummary(false);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      t.status = "closed";
      t.championUserId = champion.userId;
      t.championTeamId = champion.teamId;
      addActivity(t, "closed", `${getUser(draft, champion.userId).alias} fue declarado campeón con ${getTeam(draft, champion.teamId).short}.`, currentUser.id);
      return draft;
    });
    setShowFinishSummary(false);
  }

  async function changeStatus(status){
    if (isCloudTournament && onCloudUpdateTournamentStatus) {
      await onCloudUpdateTournamentStatus(tournament.id, status);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      t.status = status;
      if (status !== "closed") {
        t.championUserId = null;
        t.championTeamId = null;
      }
      addActivity(t, "status", `El torneo cambió a estado: ${STATUS_LABELS[status]}.`, currentUser.id);
      return draft;
    });
  }

  function deleteTournament(){
    if (!isCreator) return alert("Solo el creador puede eliminar este torneo.");
    setConfirmAction({
      title: `Eliminar torneo: ${tournament.name}`,
      description: "Se eliminarán invitaciones, solicitudes, partidos, goles, asistencias y estadísticas asociadas a este torneo. La acción no se puede deshacer desde la app.",
      intent: "danger",
      confirmLabel: "Eliminar torneo",
      onConfirm: async () => {
        if (isCloudTournament && onCloudDeleteTournament) {
          await onCloudDeleteTournament(tournament.id);
          setConfirmAction(null);
          return;
        }
        commit((draft) => {
          draft.tournaments = draft.tournaments.filter((item) => item.id !== tournament.id);
          draft.invitations = (draft.invitations || []).filter((invite) => invite.tournamentId !== tournament.id);
          return draft;
        });
        setConfirmAction(null);
      }
    });
  }

  async function addGoalEvent(matchId, event){
    if (["closed", "paused"].includes(tournament.status)) return alert("No se puede modificar un torneo pausado o finalizado.");
    if (!event.playerName) return alert("Selecciona al jugador que hizo el gol.");
    if (event.assistName && event.assistName === event.playerName) return alert("El asistidor no puede ser el mismo jugador que hizo el gol.");
    const sourceMatch = tournament.matches.find((item) => item.id === matchId);
    if (isCloudTournament && isFreeTeamTournament(tournament) && sourceMatch && (!sourceMatch.homeTeamId || !sourceMatch.awayTeamId)) {
      return alert("Antes de registrar goles, selecciona los equipos del partido y guarda el marcador.");
    }
    if (isCloudTournament && onCloudAddGoal) {
      await onCloudAddGoal(tournament, matchId, event);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      const m = t.matches.find((item) => item.id === matchId);
      if (!m) return draft;
      if (isFreeTeamTournament(t) && (!m.homeTeamId || !m.awayTeamId)) {
        alert("Antes de registrar goles, selecciona los equipos del partido y guarda el marcador.");
        return draft;
      }
      const isAdmin = t.creatorId === currentUser.id;
      const isInMatch = [m.homeUserId, m.awayUserId].includes(currentUser.id);
      if (!isAdmin && !isInMatch) return draft;

      if (!m.goalEvents) m.goalEvents = [];
      m.goalEvents.push({ id: uid("goal"), ...event, createdAt: today() });

      const baseHome = Number(isAdmin ? (m.homeGoals ?? 0) : (m.resultProposal?.homeGoals ?? m.homeGoals ?? 0));
      const baseAway = Number(isAdmin ? (m.awayGoals ?? 0) : (m.resultProposal?.awayGoals ?? m.awayGoals ?? 0));
      const nextHome = event.side === "home" ? Math.max(0, baseHome + 1) : Math.max(0, baseHome);
      const nextAway = event.side === "away" ? Math.max(0, baseAway + 1) : Math.max(0, baseAway);

      if (isAdmin) {
        m.homeGoals = nextHome;
        m.awayGoals = nextAway;
        m.resultStatus = "confirmed";
        m.resultProposal = null;
        m.playedAt = today();
      } else {
        m.resultProposal = {
          homeGoals: nextHome,
          awayGoals: nextAway,
          proposedBy: currentUser.id,
          status: "pending",
          createdAt: m.resultProposal?.createdAt || today(),
          updatedAt: today()
        };
        m.resultStatus = "pending_confirmation";
      }

      t.championUserId = null;
      t.championTeamId = null;
      if (t.status === "closed") t.status = "active";
      addActivity(t, "goal_event", `${event.playerName} fue registrado como goleador. Marcador actualizado: ${nextHome}-${nextAway}.`, currentUser.id);
      return draft;
    });
  }

  async function removeGoalEvent(matchId, eventId){
    if (["closed", "paused"].includes(tournament.status)) return alert("No se puede modificar un torneo pausado o finalizado.");
    if (isCloudTournament && onCloudRemoveGoal) {
      await onCloudRemoveGoal(tournament, matchId, eventId);
      return;
    }
    commit((draft) => {
      const t = draft.tournaments.find((item) => item.id === tournament.id);
      const m = t.matches.find((item) => item.id === matchId);
      if (!m) return draft;
      const isAdmin = t.creatorId === currentUser.id;
      const isInMatch = [m.homeUserId, m.awayUserId].includes(currentUser.id);
      if (!isAdmin && !isInMatch) return draft;

      const removed = (m.goalEvents || []).find((event) => event.id === eventId);
      if (!removed) return draft;
      m.goalEvents = (m.goalEvents || []).filter((event) => event.id !== eventId);

      const baseHome = Number(isAdmin ? (m.homeGoals ?? 0) : (m.resultProposal?.homeGoals ?? m.homeGoals ?? 0));
      const baseAway = Number(isAdmin ? (m.awayGoals ?? 0) : (m.resultProposal?.awayGoals ?? m.awayGoals ?? 0));
      const nextHome = removed.side === "home" ? Math.max(0, baseHome - 1) : Math.max(0, baseHome);
      const nextAway = removed.side === "away" ? Math.max(0, baseAway - 1) : Math.max(0, baseAway);

      if (isAdmin) {
        m.homeGoals = nextHome;
        m.awayGoals = nextAway;
        m.resultStatus = "confirmed";
        m.resultProposal = null;
        m.playedAt = today();
      } else {
        m.resultProposal = {
          homeGoals: nextHome,
          awayGoals: nextAway,
          proposedBy: currentUser.id,
          status: "pending",
          createdAt: m.resultProposal?.createdAt || today(),
          updatedAt: today()
        };
        m.resultStatus = "pending_confirmation";
      }

      t.championUserId = null;
      t.championTeamId = null;
      if (t.status === "closed") t.status = "active";
      addActivity(t, "goal_removed", `Se corrigió un registro de gol. Marcador actualizado: ${nextHome}-${nextAway}.`, currentUser.id);
      return draft;
    });
  }

  return (
    <article className="card tournament-detail">
      <div className="section-head tournament-room-head">
        <div className="tournament-title-block">
          <h3>{tournament.name}</h3>
          <p className="tournament-meta-line">{formatLabel(tournament.format)} · {teamSelectionLabel(tournament)} · {fixtureModeLabel(tournament)} · {tournament.visibility === "private" ? "Privado" : "Público"} · {tournament.season || state.currentSeason}</p>
          {tournament.description && <p>{tournament.description}</p>}
        </div>
        <span className={`status-pill ${tournament.status}`}>{STATUS_LABELS[tournament.status]}</span>
      </div>

      {tournament.championUserId && <div className="champion-banner champion-banner-actions"><span>Campeón: <strong>{getUser(state, tournament.championUserId).alias}</strong> con <strong>{getTeam(state, tournament.championTeamId).short}</strong></span><button className="secondary small" onClick={() => downloadChampionImage(state, tournament, finishSummary)}>Imagen campeón</button></div>}
      <div className="code-banner">Código de invitación: <strong>{tournament.inviteCode}</strong><span>Con este código otros jugadores pueden solicitar ingreso.</span></div>
      <TournamentStatusGuide tournament={tournament} isCreator={isCreator} pendingJoinRequests={pendingJoinRequests.length} pendingResults={pendingResults} unplayed={unplayed} finishBlockReason={finishBlockReason} />
      {isFreeTeamTournament(tournament) && <div className="info-note compact"><strong>Modo equipo libre</strong><span>En este torneo los equipos se eligen por partido, no al aceptar la invitación.</span></div>}

      <div className="stat-strip">
        <span>Confirmados <strong>{tournament.participants.length}</strong></span>
        <span>Solicitudes <strong>{pendingJoinRequests.length}</strong></span>
        <span>Resultados por revisar <strong>{pendingResults}</strong></span>
        <span>Validaciones <strong>{goalIssueRows.length}</strong></span>
      </div>

      <div className="tabbar room-tabs">
        <button className={safeTab === "resumen" ? "active" : ""} onClick={() => setRoomTab("resumen")}>Resumen</button>
        <button className={safeTab === "perfil" ? "active" : ""} onClick={() => setRoomTab("perfil")}>Perfil</button>
        {tournament.status !== "preparing" && <button className={safeTab === "partidos" ? "active" : ""} onClick={() => setRoomTab("partidos")}>Partidos</button>}
        {tournament.status !== "preparing" && <button className={safeTab === "tabla" ? "active" : ""} onClick={() => setRoomTab("tabla")}>Tabla</button>}
        {tournament.status !== "preparing" && <button className={safeTab === "goles" ? "active" : ""} onClick={() => setRoomTab("goles")}>Goleadores</button>}
        {tournament.status !== "preparing" && <button className={safeTab === "asistencias" ? "active" : ""} onClick={() => setRoomTab("asistencias")}>Asistencias</button>}
        {tournament.status !== "preparing" && <button className={safeTab === "historia" ? "active" : ""} onClick={() => setRoomTab("historia")}>Historia</button>}
        {isCreator && <button className={safeTab === "admin" ? "active" : ""} onClick={() => setRoomTab("admin")}>Administración</button>}
      </div>

      {showFinishSummary && (
        <FinishTournamentModal
          state={state}
          tournament={tournament}
          summary={finishSummary}
          standings={standings}
          onCancel={() => setShowFinishSummary(false)}
          onConfirm={confirmCloseTournament}
          onDownload={() => downloadChampionImage(state, tournament, finishSummary)}
        />
      )}

      {confirmAction && (
        <ConfirmationModal
          title={confirmAction.title}
          description={confirmAction.description}
          intent={confirmAction.intent}
          confirmLabel={confirmAction.confirmLabel}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}

      {safeTab === "resumen" && (
        <div className="tab-panel">
          <TournamentCentralPanel
            state={state}
            tournament={tournament}
            standings={standings}
            scorerRows={scorerRows}
            assistRows={assistRows}
            played={played}
            unplayed={unplayed}
            pendingResults={pendingResults}
            goalIssueRows={goalIssueRows}
            finishBlockReason={finishBlockReason}
            isCreator={isCreator}
            onGoTo={setRoomTab}
            onDownloadFixture={() => downloadFixtureImage(state, tournament)}
            onDownloadStandings={() => downloadStandingsImage(state, tournament, standings)}
            onDownloadScorers={() => downloadScorersImage(state, tournament, scorerRows, assistRows)}
            onDownloadChampion={() => downloadChampionImage(state, tournament, finishSummary)}
          />
          {tournament.status === "closed" && (
            <TournamentClosedOverview state={state} tournament={tournament} history={tournamentHistory} standings={standings} scorerRows={scorerRows} assistRows={assistRows} onDownloadChampion={() => downloadChampionImage(state, tournament, finishSummary)} />
          )}
          <div className="share-actions-grid share-actions-grid-compact">
            <button className="secondary small" onClick={() => downloadFixtureImage(state, tournament)}>Imagen fixture</button>
            {standings.length > 0 && <button className="secondary small" onClick={() => downloadStandingsImage(state, tournament, standings)}>Imagen tabla</button>}
            {(scorerRows.length > 0 || assistRows.length > 0) && <button className="secondary small" onClick={() => downloadScorersImage(state, tournament, scorerRows, assistRows)}>Imagen goleadores</button>}
            {tournament.championUserId && <button className="secondary small" onClick={() => downloadChampionImage(state, tournament, finishSummary)}>Imagen campeón</button>}
          </div>
          <div className="room-grid">
            <section>
              <h4>Participantes confirmados</h4>
              <div className="list spaced">
                {tournament.participants.map((p) => {
                  const participantTeam = getTeam(state, p.teamId);
                  return <div className="list-row with-logo" key={p.userId}>{isFreeTeamTournament(tournament) ? <span className="team-logo xs neutral"><span>★</span></span> : <TeamLogo team={participantTeam} size="xs" />}<span><strong>{getUser(state, p.userId).alias}</strong><small>{isFreeTeamTournament(tournament) ? "Equipo libre por partido" : participantTeam.name}</small></span><b>{p.userId === tournament.creatorId ? "Creador" : "Jugador"}</b></div>;
                })}
              </div>
            </section>
            <section>
              <h4>Invitaciones</h4>
              <div className="list spaced">
                {pendingInvites.map((i) => <div className="list-row" key={i.id}><span><strong>{getUser(state, i.toUserId).alias}</strong><small>Pendiente de respuesta</small></span><b>Pendiente</b></div>)}
                {acceptedInvites.map((i) => <div className="list-row" key={i.id}><span><strong>{getUser(state, i.toUserId).alias}</strong><small>Invitación aceptada</small></span><b>Aceptada</b></div>)}
                {!pendingInvites.length && !acceptedInvites.length && <p className="empty">Sin invitaciones registradas.</p>}
              </div>
            </section>
          </div>
          {goalIssueRows.length > 0 && (
            <div className="validation-box warn-box">
              <h4>Validaciones pendientes</h4>
              {goalIssueRows.slice(0, 6).map(({ match, issue }, index) => <p key={`${match.id}_${index}`}><strong>{getUser(state, match.homeUserId).alias} vs {getUser(state, match.awayUserId).alias}:</strong> {issue}</p>)}
            </div>
          )}
          <TournamentActivity tournament={tournament} state={state} />
        </div>
      )}

      {safeTab === "perfil" && (
        <TournamentProfilePanel
          state={state}
          tournament={tournament}
          onDownloadChampion={() => downloadChampionImage(state, tournament, finishSummary)}
          onDownloadStandings={() => downloadStandingsImage(state, tournament, standings)}
          onDownloadFixture={() => downloadFixtureImage(state, tournament)}
        />
      )}

      {safeTab === "admin" && isCreator && (
        <div className="tab-panel">
          <TournamentAdminPanel
            state={state}
            tournament={tournament}
            pendingInvites={pendingInvites}
            pendingJoinRequests={pendingJoinRequests}
            played={played}
            unplayed={unplayed}
            pendingResults={pendingResults}
            onAcceptRequest={(id) => answerJoinRequest(id, "accepted")}
            onRejectRequest={(id) => answerJoinRequest(id, "rejected")}
            onPause={() => changeStatus("paused")}
            onResume={() => changeStatus("active")}
            onReopen={() => changeStatus(tournament.matches.length ? "active" : "preparing")}
            onFinish={closeTournament}
            onDelete={deleteTournament}
            finishBlockReason={finishBlockReason}
          />
          {isCreator && tournament.status === "preparing" && <InviteMoreFriendsPanel state={state} commit={commit} tournament={tournament} currentUser={currentUser} />}
          <div className="actions-row room-actions">
            {tournament.status === "preparing" && <button className="primary" onClick={generateFixture}>Generar fixture</button>}
            {tournament.status !== "preparing" && tournament.status !== "paused" && <button className="primary" onClick={closeTournament} disabled={Boolean(finishBlockReason)} title={finishBlockReason}>{tournament.championUserId ? "Recalcular campeón" : "Finalizar torneo"}</button>}
            {finishBlockReason && tournament.status !== "preparing" && <span className="finish-hint">{finishBlockReason}</span>}
          </div>
        </div>
      )}

      {safeTab === "tabla" && tournament.status !== "preparing" && (
        <div className="tab-panel">
          <div className="section-head"><h4>Tabla del torneo</h4><button className="secondary small" onClick={() => downloadStandingsImage(state, tournament, standings)}>Imagen tabla</button></div>
          <SimpleTable rows={standings} columns={["pos", "name", "teamName", "pj", "pg", "pe", "pp", "dg", "pts", "performance"]} labels={{ pos: "#", name: "Usuario", teamName: "Equipo", pj: "PJ", pg: "PG", pe: "PE", pp: "PP", dg: "DG", pts: "PTS", performance: "%" }} />
        </div>
      )}

      {safeTab === "goles" && tournament.status !== "preparing" && (
        <div className="tab-panel">
          <div className="section-head"><h4>Goleadores del torneo</h4><button className="secondary small" onClick={() => downloadScorersImage(state, tournament, scorerRows, assistRows)}>Imagen goleadores</button></div>
          <SimpleTable rows={scorerRows.slice(0, 12)} columns={["pos", "playerName", "teamName", "goals", "last"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", goals: "Goles", last: "Último registro" }} compact />
          <p className="hint">El ranking de goleadores usa los registros de goles por jugador real del equipo.</p>
        </div>
      )}

      {safeTab === "asistencias" && tournament.status !== "preparing" && (
        <div className="tab-panel">
          <h4>Asistidores del torneo</h4>
          <SimpleTable rows={assistRows.slice(0, 12)} columns={["pos", "playerName", "teamName", "assists", "last"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", assists: "Asist.", last: "Último registro" }} compact />
          <p className="hint">Las asistencias se muestran separadas de los goles para evitar mezclar ambos rankings.</p>
        </div>
      )}

      {safeTab === "historia" && tournament.status !== "preparing" && (
        <TournamentHistoryPanel
          state={state}
          tournament={tournament}
          history={tournamentHistory}
          goalRows={scorerRows}
          assistRows={assistRows}
          playerRows={buildPlayerContributionRanking(state, tournament.id)}
          onDownloadChampion={() => downloadChampionImage(state, tournament, finishSummary)}
        />
      )}

      {safeTab === "partidos" && tournament.status !== "preparing" && (
        <div className="tab-panel">
          <div className="section-head"><div><p className="eyebrow">Fixture</p><h4>Partidos por fecha</h4></div><span className="muted">{played} jugados · {unplayed} pendientes</span></div>
          <FixtureByDatesPanel
            state={state}
            tournament={tournament}
            currentUser={currentUser}
            onSubmit={submitResult}
            onConfirm={confirmResult}
            onReject={rejectResult}
            onClearResult={clearMatchResult}
            onAddGoal={addGoalEvent}
            onRemoveGoal={removeGoalEvent}
            onDownloadMatch={(match) => downloadMatchImage(state, tournament, match)}
          />
        </div>
      )}
    </article>
  );
}



function getCurrentFixtureGroup(tournament){
  const groups = groupMatchesByFixtureDate(tournament.matches || []);
  if (!groups.length) return null;
  return groups.find((group) => group.matches.some((match) => !matchPlayed(match))) || groups[groups.length - 1];
}

function getFeaturedMatch(tournament){
  const currentGroup = getCurrentFixtureGroup(tournament);
  const groupMatches = currentGroup?.matches || [];
  return groupMatches.find((match) => !matchPlayed(match)) || groupMatches.find(matchPlayed) || (tournament.matches || []).find((match) => !matchPlayed(match)) || (tournament.matches || [])[0] || null;
}

function buildHeadToHeadSummary(state, tournament, match){
  if (!match) return null;
  const homeId = match.homeUserId;
  const awayId = match.awayUserId;
  const rows = (tournament.matches || []).filter((item) => matchPlayed(item) && [item.homeUserId, item.awayUserId].includes(homeId) && [item.homeUserId, item.awayUserId].includes(awayId));
  const summary = {
    total: rows.length,
    homeWins: 0,
    awayWins: 0,
    draws: 0,
    homeGoals: 0,
    awayGoals: 0,
    last: null,
    biggest: null
  };
  rows.forEach((item) => {
    const homeAsHome = item.homeUserId === homeId;
    const goalsA = homeAsHome ? Number(item.homeGoals || 0) : Number(item.awayGoals || 0);
    const goalsB = homeAsHome ? Number(item.awayGoals || 0) : Number(item.homeGoals || 0);
    summary.homeGoals += goalsA;
    summary.awayGoals += goalsB;
    if (goalsA > goalsB) summary.homeWins += 1;
    else if (goalsA < goalsB) summary.awayWins += 1;
    else summary.draws += 1;
    const label = `${getUser(state, item.homeUserId).alias} ${item.homeGoals}-${item.awayGoals} ${getUser(state, item.awayUserId).alias}`;
    summary.last = { ...item, label };
    const diff = Math.abs(goalsA - goalsB);
    if (!summary.biggest || diff > summary.biggest.diff) summary.biggest = { ...item, diff, label };
  });
  return summary;
}

function TournamentCentralPanel({ state, tournament, standings, scorerRows, assistRows, played, unplayed, pendingResults, goalIssueRows, finishBlockReason, isCreator, onGoTo, onDownloadFixture, onDownloadStandings, onDownloadScorers, onDownloadChampion }){
  const leader = standings[0] || null;
  const currentGroup = getCurrentFixtureGroup(tournament);
  const featuredMatch = getFeaturedMatch(tournament);
  const groupPlayed = currentGroup ? currentGroup.matches.filter(matchPlayed).length : 0;
  const groupTotal = currentGroup ? currentGroup.matches.length : 0;
  const groupProgress = groupTotal ? Math.round((groupPlayed / groupTotal) * 100) : 0;
  const bestDefense = standings.filter((row) => row.pj > 0).sort((a, b) => a.gc - b.gc || b.pts - a.pts)[0] || null;
  const topScorer = scorerRows[0] || null;
  const topAssist = assistRows[0] || null;
  const featuredHomeTeam = featuredMatch ? getTeam(state, getMatchTeamId(tournament, featuredMatch, "home")) : null;
  const featuredAwayTeam = featuredMatch ? getTeam(state, getMatchTeamId(tournament, featuredMatch, "away")) : null;
  const h2h = buildHeadToHeadSummary(state, tournament, featuredMatch);
  const statusText = STATUS_LABELS[tournament.status] || "Torneo";
  const canShowFinalImage = tournament.status === "closed" || Boolean(tournament.championUserId);
  return (
    <section className={`tournament-central ${tournament.status}`}>
      <div className="central-hero-card">
        <div>
          <p className="eyebrow">Central del campeonato</p>
          <h2>{tournament.name}</h2>
          <p>{formatLabel(tournament.format)} · {teamSelectionLabel(tournament)} · {fixtureModeLabel(tournament)} · {tournament.season || state.currentSeason}</p>
        </div>
        <div className="central-hero-status">
          <span className={`status-pill ${tournament.status}`}>{statusText}</span>
          <strong>{played}/{played + unplayed}</strong>
          <small>partidos jugados</small>
        </div>
      </div>

      <div className="central-metrics-grid">
        <span>Líder actual <strong>{leader?.name || "Sin líder"}</strong><small>{leader ? `${leader.pts} pts · DG ${leader.dg}` : "Genera fixture y registra resultados"}</small></span>
        <span>Fecha actual <strong>{currentGroup?.label || "Sin fixture"}</strong><small>{groupTotal ? `${groupPlayed} de ${groupTotal} partidos · ${groupProgress}%` : "Pendiente de generar"}</small></span>
        <span>Goleador <strong>{topScorer?.playerName || "Sin datos"}</strong><small>{topScorer ? `${topScorer.goals} goles · ${topScorer.teamName}` : "Registra goles para activar ranking"}</small></span>
        <span>Mejor defensa <strong>{bestDefense?.teamName || "Sin datos"}</strong><small>{bestDefense ? `${bestDefense.gc} GC · ${bestDefense.performance}%` : "Aparecerá con partidos jugados"}</small></span>
      </div>

      <div className="central-action-row">
        <button className="primary small" type="button" onClick={() => onGoTo?.(tournament.status === "preparing" ? "admin" : "partidos")}>{tournament.status === "preparing" ? "Preparar fixture" : "Ver próxima fecha"}</button>
        <button className="secondary small" type="button" onClick={() => onGoTo?.("tabla")} disabled={!standings.length}>Ver tabla</button>
        <button className="secondary small" type="button" onClick={() => onGoTo?.("perfil")}>Perfil del torneo</button>
        {isCreator && tournament.status !== "closed" && <button className="ghost small" type="button" onClick={() => onGoTo?.("admin")}>Administración</button>}
      </div>

      {currentGroup && <CurrentRoundPanel state={state} tournament={tournament} group={currentGroup} onGoTo={onGoTo} />}

      {featuredMatch && (
        <article className="central-match-card">
          <div className="section-head compact-head">
            <div>
              <p className="eyebrow">Partido destacado</p>
              <h4>{getUser(state, featuredMatch.homeUserId).alias} vs {getUser(state, featuredMatch.awayUserId).alias}</h4>
            </div>
            <span className={`result-status ${featuredMatch.resultStatus || (matchPlayed(featuredMatch) ? "confirmed" : "pending")}`}>{matchStatusLabel(featuredMatch)}</span>
          </div>
          <div className="central-scoreboard">
            <div className="scoreboard-side">
              <TeamLogo team={featuredHomeTeam} size="sm" />
              <strong>{getUser(state, featuredMatch.homeUserId).alias}</strong>
              <small>{featuredHomeTeam?.short || "Equipo por elegir"}</small>
            </div>
            <div className="scoreboard-result">
              <strong>{matchPlayed(featuredMatch) ? `${featuredMatch.homeGoals} - ${featuredMatch.awayGoals}` : "VS"}</strong>
              <small>{fixtureDateLabel(featuredMatch)} · {fixtureRoundDetail(featuredMatch) || featuredMatch.round}</small>
            </div>
            <div className="scoreboard-side away">
              <TeamLogo team={featuredAwayTeam} size="sm" />
              <strong>{getUser(state, featuredMatch.awayUserId).alias}</strong>
              <small>{featuredAwayTeam?.short || "Equipo por elegir"}</small>
            </div>
          </div>
          <HeadToHeadMini state={state} match={featuredMatch} summary={h2h} />
          <div className="actions-row compact right"><button className="secondary small" type="button" onClick={() => onGoTo?.("partidos")}>Abrir fixture</button></div>
        </article>
      )}

      <div className="central-alert-grid">
        <span className={pendingResults ? "needs-action" : "ok"}>Resultados por revisar <strong>{pendingResults}</strong></span>
        <span className={goalIssueRows.length ? "needs-action" : "ok"}>Validaciones <strong>{goalIssueRows.length}</strong></span>
        <span className={finishBlockReason ? "needs-action" : "ok"}>Cierre del torneo <strong>{finishBlockReason || "Listo"}</strong></span>
        <span>Máximo asistidor <strong>{topAssist?.playerName || "Sin datos"}</strong></span>
      </div>

      <div className="central-share-panel">
        <div><strong>Material para compartir</strong><small>Descarga imágenes del torneo para WhatsApp o redes.</small></div>
        <div className="actions-row compact">
          <button className="secondary small" type="button" onClick={onDownloadFixture}>Fixture</button>
          {standings.length > 0 && <button className="secondary small" type="button" onClick={onDownloadStandings}>Tabla</button>}
          {(scorerRows.length > 0 || assistRows.length > 0) && <button className="secondary small" type="button" onClick={onDownloadScorers}>Goleadores</button>}
          {canShowFinalImage && <button className="primary small" type="button" onClick={onDownloadChampion}>Campeón</button>}
        </div>
      </div>
    </section>
  );
}

function CurrentRoundPanel({ state, tournament, group, onGoTo }){
  const played = group.matches.filter(matchPlayed).length;
  const total = group.matches.length;
  return (
    <section className="current-round-panel">
      <div className="section-head compact-head">
        <div>
          <p className="eyebrow">Fecha actual</p>
          <h4>{group.label}</h4>
        </div>
        <span className="round-progress-pill">{played}/{total} jugados</span>
      </div>
      <div className="current-round-list">
        {group.matches.slice(0, 5).map((match) => {
          const homeTeam = getTeam(state, getMatchTeamId(tournament, match, "home"));
          const awayTeam = getTeam(state, getMatchTeamId(tournament, match, "away"));
          return (
            <div className="current-round-row" key={match.id}>
              <span><strong>{getUser(state, match.homeUserId).alias}</strong><small>{homeTeam?.short || "Equipo por elegir"}</small></span>
              <b>{matchPlayed(match) ? `${match.homeGoals} - ${match.awayGoals}` : "vs"}</b>
              <span><strong>{getUser(state, match.awayUserId).alias}</strong><small>{awayTeam?.short || "Equipo por elegir"}</small></span>
              <em>{matchStatusLabel(match)}</em>
            </div>
          );
        })}
      </div>
      {group.matches.length > 5 && <p className="hint">Se muestran 5 partidos. Abre el fixture para ver la fecha completa.</p>}
      <div className="actions-row compact right"><button className="ghost small" type="button" onClick={() => onGoTo?.("partidos")}>Ver fecha completa</button></div>
    </section>
  );
}

function HeadToHeadMini({ state, match, summary }){
  if (!match || !summary || !summary.total) return <p className="hint h2h-empty">Este cruce todavía no tiene historial registrado.</p>;
  return (
    <div className="head-to-head-mini">
      <span><small>Historial</small><strong>{summary.total}</strong></span>
      <span><small>{getUser(state, match.homeUserId).alias}</small><strong>{summary.homeWins}</strong></span>
      <span><small>Empates</small><strong>{summary.draws}</strong></span>
      <span><small>{getUser(state, match.awayUserId).alias}</small><strong>{summary.awayWins}</strong></span>
      <span><small>Último</small><strong>{summary.last?.label || "Sin dato"}</strong></span>
    </div>
  );
}

function TournamentStatusGuide({ tournament, isCreator, pendingJoinRequests, pendingResults, unplayed, finishBlockReason }){
  let title = "Torneo en preparación";
  let text = "Confirma participantes, acepta solicitudes y genera el fixture cuando la sala esté lista.";
  let action = isCreator ? "Siguiente acción: revisar participantes y generar fixture." : "Espera a que el creador genere el fixture.";
  if (tournament.status === "active") {
    title = "Torneo en curso";
    text = "Registra resultados, confirma marcadores y revisa la tabla mientras avanza la competencia.";
    action = finishBlockReason ? `Pendiente: ${finishBlockReason}` : "El torneo ya está listo para finalizar cuando el creador lo decida.";
  }
  if (tournament.status === "paused") {
    title = "Torneo pausado";
    text = "La sala está detenida temporalmente. No se pueden registrar cambios hasta reanudarla.";
    action = isCreator ? "Siguiente acción: reanudar o revisar administración." : "Espera la reanudación del torneo.";
  }
  if (tournament.status === "closed") {
    title = "Torneo finalizado";
    text = "La sala quedó como registro histórico. Puedes revisar resumen, tabla, goleadores e imágenes para compartir.";
    action = "Siguiente acción: revisar Historia o descargar el resumen del campeón.";
  }
  return (
    <div className={`status-guide ${tournament.status}`}>
      <span className="status-guide-icon">{tournament.status === "closed" ? "🏆" : tournament.status === "active" ? "▶" : tournament.status === "paused" ? "Ⅱ" : "•"}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        <small>{action}</small>
      </div>
      <div className="status-guide-stats">
        <em>{pendingJoinRequests} solicitudes</em>
        <em>{pendingResults} por revisar</em>
        <em>{unplayed} pendientes</em>
      </div>
    </div>
  );
}


function TournamentProfilePanel({ state, tournament, onDownloadChampion, onDownloadStandings, onDownloadFixture }){
  const profile = buildTournamentProfile(state, tournament);
  const closed = tournament.status === "closed" || Boolean(tournament.championUserId);
  const championInitials = (profile.championUser?.alias || "CH").slice(0, 2).toUpperCase();
  const finalMatch = profile.finalMatch;
  const finalMatchLabel = finalMatch ? `${getUser(state, finalMatch.homeUserId).alias} ${finalMatch.homeGoals}-${finalMatch.awayGoals} ${getUser(state, finalMatch.awayUserId).alias}` : "Sin final registrada";
  return (
    <div className="tab-panel tournament-profile-panel">
      <article className={`tournament-profile-detail ${closed ? "closed" : "active"}`}>
        <div className="tournament-profile-hero">
          <span className="tournament-cup-badge">{closed ? "🏆" : "CH"}</span>
          <div>
            <p className="eyebrow">Perfil de torneo</p>
            <h2>{tournament.name}</h2>
            <p>{profile.formatLabel} · {profile.teamModeLabel} · {profile.fixtureLabel} · {tournament.season || state.currentSeason}</p>
          </div>
          <span className={`status-pill ${tournament.status}`}>{profile.statusLabel}</span>
        </div>

        <div className="tournament-profile-main-card">
          <div className="tournament-champion-block">
            <span className="avatar huge">{championInitials}</span>
            <div>
              <small>{closed ? "Campeón" : "Líder actual"}</small>
              <strong>{profile.championUser?.alias || profile.history.champion}</strong>
              <p>{profile.championTeam?.name || profile.history.championTeam}</p>
            </div>
          </div>
          <div className="tournament-final-block">
            <small>Partido destacado</small>
            <strong>{finalMatchLabel}</strong>
            <p>{finalMatch ? `${fixtureDateLabel(finalMatch)} · ${fixtureRoundDetail(finalMatch)}` : "Aparecerá cuando existan partidos jugados."}</p>
          </div>
        </div>

        <div className="info-grid tournament-profile-stats">
          <span>Participantes <strong>{profile.participants.length}</strong></span>
          <span>Partidos <strong>{profile.playedMatches.length}/{profile.totalMatches}</strong></span>
          <span>Goles <strong>{profile.totalGoals}</strong></span>
          <span>Goleador <strong>{profile.goalRows[0]?.playerName || "Sin datos"}</strong></span>
          <span>Asistidor <strong>{profile.assistRows[0]?.playerName || "Sin datos"}</strong></span>
          <span>Mejor futbolista <strong>{profile.playerRows[0]?.playerName || "Sin datos"}</strong></span>
          <span>Mejor ataque <strong>{profile.bestAttack ? getTeam(state, profile.bestAttack.teamId).short : "Sin datos"}</strong></span>
          <span>Mejor defensa <strong>{profile.bestDefense ? getTeam(state, profile.bestDefense.teamId).short : "Sin datos"}</strong></span>
        </div>

        <div className="share-actions-grid tournament-profile-actions">
          {closed && <button className="secondary small" onClick={onDownloadChampion}>Imagen campeón</button>}
          <button className="secondary small" onClick={onDownloadStandings}>Imagen tabla</button>
          <button className="secondary small" onClick={onDownloadFixture}>Imagen fixture</button>
        </div>
      </article>

      <div className="grid-2 tournament-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Podio y rendimiento</h3>
          <div className="list spaced">
            <div className="list-row"><span><strong>{profile.championUser?.alias || profile.history.champion}</strong><small>{profile.championTeam?.short || profile.history.championTeam}</small></span><b>Campeón</b></div>
            <div className="list-row"><span><strong>{profile.runnerUpUser?.alias || profile.history.runnerUp}</strong><small>{profile.runnerUpTeam?.short || "Subcampeón"}</small></span><b>2° lugar</b></div>
            <div className="list-row"><span><strong>{profile.bestAttack ? getTeam(state, profile.bestAttack.teamId).short : profile.history.bestAttack}</strong><small>{profile.bestAttack?.gf || 0} goles a favor</small></span><b>Ataque</b></div>
            <div className="list-row"><span><strong>{profile.bestDefense ? getTeam(state, profile.bestDefense.teamId).short : profile.history.bestDefense}</strong><small>{profile.bestDefense?.gc || 0} goles en contra</small></span><b>Defensa</b></div>
          </div>
        </section>

        <section className="profile-public-card soft-card">
          <h3>Futbolistas destacados</h3>
          <div className="player-mini-list">
            {profile.playerRows.slice(0, 5).map((row) => (
              <div className="player-mini-row" key={`${row.teamId}_${row.playerName}`}>
                <PlayerAvatar teamId={row.teamId} playerName={row.playerName} size="xs" />
                <span><strong>{row.playerName}</strong><small>{row.teamName} · {row.goals} G · {row.assists} A</small></span>
                <b>{row.contributions}</b>
              </div>
            ))}
            {!profile.playerRows.length && <p className="empty">Aún no hay goles ni asistencias registradas.</p>}
          </div>
        </section>
      </div>

      <div className="grid-2 tournament-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Tabla final</h3>
          <SimpleTable rows={profile.standings.slice(0, 8)} columns={["pos", "name", "teamName", "pj", "pg", "pe", "pp", "dg", "pts", "performance"]} labels={{ pos: "#", name: "Usuario", teamName: "Equipo", pj: "PJ", pg: "PG", pe: "PE", pp: "PP", dg: "DG", pts: "PTS", performance: "%" }} compact />
        </section>
        <section className="profile-public-card soft-card">
          <h3>Partidos destacados</h3>
          <SimpleTable rows={profile.notableMatches} columns={["pos", "round", "match", "teams", "winner"]} labels={{ pos: "#", round: "Fecha", match: "Resultado", teams: "Equipos", winner: "Ganador" }} compact />
        </section>
      </div>
    </div>
  );
}

function TournamentClosedOverview({ state, tournament, history, standings, scorerRows, assistRows, onDownloadChampion }){
  const champion = tournament.championUserId ? getUser(state, tournament.championUserId) : null;
  const championTeam = tournament.championTeamId ? getTeam(state, tournament.championTeamId) : null;
  const runnerUp = standings[1];
  return (
    <section className="closed-overview-card">
      <div className="closed-overview-hero">
        <div>
          <p className="eyebrow">Torneo finalizado</p>
          <h3>{champion?.alias || history.champion}</h3>
          <p>{championTeam?.name || history.championTeam} quedó registrado como campeón de {tournament.name}.</p>
        </div>
        <button className="secondary small" onClick={onDownloadChampion}>Imagen campeón</button>
      </div>
      <div className="closed-overview-grid">
        <span>Subcampeón <strong>{runnerUp ? getUser(state, runnerUp.userId).alias : history.runnerUp}</strong></span>
        <span>Goleador <strong>{scorerRows[0]?.playerName || history.topScorer}</strong></span>
        <span>Máximo asistidor <strong>{assistRows[0]?.playerName || history.topAssist}</strong></span>
        <span>Mejor futbolista <strong>{history.bestPlayer}</strong></span>
        <span>Partidos jugados <strong>{history.playedMatches}</strong></span>
      </div>
    </section>
  );
}


function TournamentHistoryPanel({ state, tournament, history, goalRows, assistRows, playerRows, onDownloadChampion }){
  const closed = tournament.status === "closed" || Boolean(tournament.championUserId);
  const rows = [
    { label: "Campeón", value: `${history.champion} · ${history.championTeam}` },
    { label: "Subcampeón", value: history.runnerUp },
    { label: "Goleador", value: history.topScorer },
    { label: "Máximo asistidor", value: history.topAssist },
    { label: "Mejor futbolista", value: history.bestPlayer },
    { label: "Mejor ataque", value: history.bestAttack },
    { label: "Mejor defensa", value: history.bestDefense },
    { label: "Mayor goleada", value: history.biggestWin },
    { label: "Partido con más goles", value: history.highestScoring },
    { label: "Partidos jugados", value: history.playedMatches },
    { label: "Goles totales", value: history.totalGoals }
  ];
  return (
    <div className="tab-panel tournament-history-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Historia del torneo</p>
          <h4>{closed ? "Resumen histórico" : "Resumen parcial"}</h4>
        </div>
        {closed && <button className="secondary small" onClick={onDownloadChampion}>Imagen campeón</button>}
      </div>
      {closed && (
        <div className="final-trophy-card">
          <div>
            <p className="eyebrow">Ficha histórica final</p>
            <h3>{history.champion}</h3>
            <span>{history.championTeam} · campeón del torneo</span>
          </div>
          <div className="final-trophy-stats">
            <span>Partidos <strong>{history.playedMatches}</strong></span>
            <span>Goles <strong>{history.totalGoals}</strong></span>
            <span>Goleador <strong>{history.topScorer}</strong></span>
            <span>Asistidor <strong>{history.topAssist}</strong></span>
            <span>Mejor futbolista <strong>{history.bestPlayer}</strong></span>
          </div>
        </div>
      )}
      <div className="history-grid">
        {rows.map((row) => <span key={row.label}><small>{row.label}</small><strong>{row.value}</strong></span>)}
      </div>
      <div className="stats-split space-top">
        <section>
          <h4>Futbolistas más influyentes</h4>
          <SimpleTable rows={playerRows.slice(0, 8)} columns={["pos", "playerName", "teamName", "goals", "assists", "contributions"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", goals: "G", assists: "A", contributions: "G+A" }} compact />
        </section>
        <section>
          <h4>Detalle histórico</h4>
          <SimpleTable rows={goalRows.slice(0, 5)} columns={["pos", "playerName", "teamName", "goals", "last"]} labels={{ pos: "#", playerName: "Goleador", teamName: "Equipo", goals: "G", last: "Último" }} compact />
          <SimpleTable rows={assistRows.slice(0, 5)} columns={["pos", "playerName", "teamName", "assists", "last"]} labels={{ pos: "#", playerName: "Asistidor", teamName: "Equipo", assists: "A", last: "Último" }} compact />
        </section>
      </div>
    </div>
  );
}

function ConfirmationModal({ title, description, intent = "warning", confirmLabel = "Confirmar", onCancel, onConfirm }){
  return (
    <div className="finish-modal">
      <div className={`finish-card confirmation-card ${intent}`}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Confirmación requerida</p>
            <h3>{title}</h3>
          </div>
          <span className={`status-pill ${intent === "danger" ? "rejected" : "pending_confirmation"}`}>{intent === "danger" ? "Acción crítica" : "Revisar"}</span>
        </div>
        <p>{description}</p>
        <div className="actions-row right">
          <button className="ghost" onClick={onCancel}>Cancelar</button>
          <button className={intent === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function FinishTournamentModal({ state, tournament, summary, standings, onCancel, onConfirm, onDownload }){
  return (
    <div className="finish-modal">
      <div className="finish-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Resumen antes de finalizar</p>
            <h3>{tournament.name}</h3>
          </div>
          <span className="status-pill active">Revisión final</span>
        </div>
        <div className="finish-summary-grid">
          <span>Campeón detectado <strong>{summary.championUser?.alias || "Sin datos"}</strong><small>{summary.championTeam?.name || "Sin equipo"}</small></span>
          <span>Subcampeón <strong>{summary.runnerUp ? getUser(state, summary.runnerUp.userId).alias : "Sin datos"}</strong><small>{summary.runnerUp ? getTeam(state, summary.runnerUp.teamId).short : ""}</small></span>
          <span>Mejor ataque <strong>{summary.bestAttack ? getTeam(state, summary.bestAttack.teamId).short : "Sin datos"}</strong><small>{summary.bestAttack?.gf || 0} GF</small></span>
          <span>Mejor defensa <strong>{summary.bestDefense ? getTeam(state, summary.bestDefense.teamId).short : "Sin datos"}</strong><small>{summary.bestDefense?.gc || 0} GC</small></span>
          <span>Goleador <strong>{summary.topScorer?.playerName || "Sin datos"}</strong><small>{summary.topScorer?.goals || 0} goles</small></span>
          <span>Máximo asistidor <strong>{summary.topAssist?.playerName || "Sin datos"}</strong><small>{summary.topAssist?.assists || 0} asistencias</small></span>
          <span>Partidos jugados <strong>{summary.playedMatches}</strong><small>{summary.totalGoals} goles totales</small></span>
          <span>Validaciones <strong>{summary.issueCount}</strong><small>Debe ser 0 para cerrar</small></span>
        </div>
        <div className="table-preview">
          <SimpleTable rows={standings.slice(0, 4)} columns={["pos", "name", "teamName", "pts", "dg", "performance"]} labels={{ pos: "#", name: "Usuario", teamName: "Equipo", pts: "PTS", dg: "DG", performance: "%" }} compact />
        </div>
        <div className="actions-row right"><button className="ghost" onClick={onCancel}>Volver</button><button className="secondary" onClick={onDownload}>Descargar imagen</button><button className="primary" onClick={onConfirm}>Confirmar finalización</button></div>
      </div>
    </div>
  );
}


function TournamentAdminPanel({ state, tournament, pendingInvites, pendingJoinRequests, played, unplayed, pendingResults, onAcceptRequest, onRejectRequest, onPause, onResume, onReopen, onFinish, onDelete, finishBlockReason }){
  const occupied = tournament.participants.map((p) => getTeam(state, p.teamId).short).join(", ") || "Sin equipos";
  return (
    <section className="admin-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Panel del creador</p>
          <h4>Control del torneo</h4>
        </div>
        <div className="actions-row compact">
          {tournament.status === "active" && <button className="ghost small" onClick={onPause}>Pausar</button>}
          {tournament.status === "paused" && <button className="secondary small" onClick={onResume}>Reanudar</button>}
          {["active", "paused"].includes(tournament.status) && <button className="primary small" onClick={onFinish} disabled={Boolean(finishBlockReason)} title={finishBlockReason}>Finalizar torneo</button>}
          {tournament.status === "closed" && <button className="ghost small" onClick={onReopen}>Reabrir</button>}
          <button className="danger small" onClick={onDelete}>Eliminar torneo</button>
        </div>
      </div>
      {finishBlockReason && ["active", "paused"].includes(tournament.status) && <p className="hint finish-hint">Para finalizar: {finishBlockReason}</p>}
      <div className="admin-grid">
        <span>Estado <strong>{STATUS_LABELS[tournament.status]}</strong></span>
        <span>Confirmados <strong>{tournament.participants.length}</strong></span>
        <span>Invitados pendientes <strong>{pendingInvites.length}</strong></span>
        <span>Solicitudes pendientes <strong>{pendingJoinRequests.length}</strong></span>
        <span>Resultados por revisar <strong>{pendingResults}</strong></span>
        <span>Partidos jugados <strong>{played}</strong></span>
        <span>Partidos sin jugar <strong>{unplayed}</strong></span>
        <span>Equipos ocupados <strong>{occupied}</strong></span>
      </div>
      {pendingJoinRequests.length > 0 && (
        <div className="requests-box">
          <h4>Solicitudes por código</h4>
          <div className="list spaced">
            {pendingJoinRequests.map((req) => <div className="list-row" key={req.id}><span><strong>{getUser(state, req.userId).alias}</strong><small>Solicita {getTeam(state, req.teamId).name}</small></span><div className="actions-row compact"><button className="primary small" onClick={() => onAcceptRequest(req.id)}>Aceptar</button><button className="ghost small" onClick={() => onRejectRequest(req.id)}>Rechazar</button></div></div>)}
          </div>
        </div>
      )}
    </section>
  );
}

function TournamentActivity({ tournament, state }){
  const items = tournament.activity || [];
  return (
    <section className="activity-box">
      <div className="section-head">
        <div>
          <p className="eyebrow">Historial</p>
          <h4>Actividad reciente</h4>
        </div>
      </div>
      <div className="timeline">
        {items.slice(0, 8).map((item) => <div className="timeline-item" key={item.id}><span></span><div><strong>{item.message}</strong><small>{item.createdAt}{item.userId ? ` · ${getUser(state, item.userId).alias}` : ""}</small></div></div>)}
        {!items.length && <p className="empty">Sin actividad registrada.</p>}
      </div>
    </section>
  );
}

function FixtureByDatesPanel({ state, tournament, currentUser, onSubmit, onConfirm, onReject, onClearResult, onAddGoal, onRemoveGoal, onDownloadMatch }){
  const groups = groupMatchesByFixtureDate(tournament.matches || []);
  const [openGroups, setOpenGroups] = useState(() => new Set(groups.slice(0, 1).map((group) => group.id)));
  const [openMatches, setOpenMatches] = useState(() => new Set());

  function toggleGroup(groupId){
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleMatch(matchId){
    setOpenMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  if (!groups.length) return <p className="empty">Aún no hay partidos generados.</p>;

  return (
    <div className="fixture-date-list">
      {groups.map((group) => {
        const expanded = openGroups.has(group.id);
        const playedCount = group.matches.filter(matchPlayed).length;
        return (
          <section className="fixture-date-card" key={group.id}>
            <button className="fixture-date-head" type="button" onClick={() => toggleGroup(group.id)}>
              <span>
                <strong>{group.label}</strong>
                <small>{playedCount}/{group.matches.length} partidos jugados</small>
              </span>
              <b>{expanded ? "Ocultar" : "Ver fecha"}</b>
            </button>
            {expanded && (
              <div className="fixture-date-body">
                {group.matches.map((match) => {
                  const matchOpen = openMatches.has(match.id);
                  const homeTeam = getTeam(state, getMatchTeamId(tournament, match, "home"));
                  const awayTeam = getTeam(state, getMatchTeamId(tournament, match, "away"));
                  const detail = fixtureRoundDetail(match);
                  return (
                    <div className="fixture-match-shell" key={match.id}>
                      <div className="fixture-match-summary">
                        <div className="fixture-club left">
                          <TeamLogo team={homeTeam} size="xs" />
                          <span><strong>{getUser(state, match.homeUserId).alias}</strong><small>{homeTeam.short}</small></span>
                        </div>
                        <div className="fixture-score-pill">
                          <strong>{matchPlayed(match) ? `${match.homeGoals} - ${match.awayGoals}` : "vs"}</strong>
                          <small>{detail || matchStatusLabel(match)}</small>
                        </div>
                        <div className="fixture-club right">
                          <span><strong>{getUser(state, match.awayUserId).alias}</strong><small>{awayTeam.short}</small></span>
                          <TeamLogo team={awayTeam} size="xs" />
                        </div>
                        <div className="fixture-summary-actions">
                          <span className={`result-status ${match.resultStatus || (matchPlayed(match) ? "confirmed" : "pending")}`}>{matchStatusLabel(match)}</span>
                          <button className="secondary small" type="button" onClick={() => toggleMatch(match.id)}>{matchOpen ? "Ocultar" : "Ver más"}</button>
                        </div>
                      </div>
                      {matchOpen && (
                        <MatchResultCard
                          state={state}
                          match={match}
                          tournament={tournament}
                          currentUser={currentUser}
                          onSubmit={onSubmit}
                          onConfirm={onConfirm}
                          onReject={onReject}
                          onClearResult={onClearResult}
                          onAddGoal={onAddGoal}
                          onRemoveGoal={onRemoveGoal}
                          onDownloadMatch={onDownloadMatch}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MatchResultCard({ state, match, tournament, currentUser, onSubmit, onConfirm, onReject, onClearResult, onAddGoal, onRemoveGoal, onDownloadMatch }){
  const [homeGoals, setHomeGoals] = useState(match.resultProposal?.homeGoals ?? match.homeGoals ?? "");
  const [awayGoals, setAwayGoals] = useState(match.resultProposal?.awayGoals ?? match.awayGoals ?? "");
  const [homeTeamId, setHomeTeamId] = useState(getMatchTeamId(tournament, match, "home") || "");
  const [awayTeamId, setAwayTeamId] = useState(getMatchTeamId(tournament, match, "away") || "");
  const [penaltyWinnerUserId, setPenaltyWinnerUserId] = useState(match.resultProposal?.penaltyWinnerUserId || match.penaltyWinnerUserId || "");

  useEffect(() => {
    setHomeGoals(match.resultProposal?.homeGoals ?? match.homeGoals ?? "");
    setAwayGoals(match.resultProposal?.awayGoals ?? match.awayGoals ?? "");
    setHomeTeamId(getMatchTeamId(tournament, match, "home") || "");
    setAwayTeamId(getMatchTeamId(tournament, match, "away") || "");
    setPenaltyWinnerUserId(match.resultProposal?.penaltyWinnerUserId || match.penaltyWinnerUserId || "");
  }, [match.id, match.homeGoals, match.awayGoals, match.resultProposal?.homeGoals, match.resultProposal?.awayGoals, match.resultProposal?.penaltyWinnerUserId, match.penaltyWinnerUserId, match.resultStatus, match.homeTeamId, match.awayTeamId, tournament?.id]);

  const isParticipant = [match.homeUserId, match.awayUserId].includes(currentUser.id);
  const isCreator = tournament.creatorId === currentUser.id;
  const proposer = match.resultProposal ? getUser(state, match.resultProposal.proposedBy) : null;
  const canRespond = match.resultProposal?.status === "pending" && (isCreator || (isParticipant && match.resultProposal.proposedBy !== currentUser.id));
  const readyForResult = !isKnockoutTournament(tournament) || playoffMatchReady(match);
  const canSubmit = (isCreator || isParticipant) && readyForResult;
  const canEditGoals = canSubmit && tournament.status !== "closed" && tournament.status !== "paused";
  const validationIssues = matchGoalIssues(match);
  const submitLabel = isCreator
    ? matchPlayed(match) ? "Corregir resultado" : "Guardar resultado"
    : matchPlayed(match) || match.resultProposal ? "Proponer corrección" : "Proponer resultado";
  const freeTeams = isFreeTeamTournament(tournament);
  const homeTeam = getTeam(state, homeTeamId || match.homeTeamId);
  const awayTeam = getTeam(state, awayTeamId || match.awayTeamId);
  const playoffTie = isKnockoutTournament(tournament) && homeGoals !== "" && awayGoals !== "" && Number(homeGoals) === Number(awayGoals);
  const playoffWinner = match.penaltyWinnerUserId ? getUser(state, match.penaltyWinnerUserId) : null;

  return (
    <div className={`match-card ${match.resultStatus || ""}`}>
      <small>{match.round} · {match.resultStatus === "pending_confirmation" ? "Pendiente de confirmación" : match.resultStatus === "rejected" ? "Resultado rechazado" : matchPlayed(match) ? "Confirmado" : "Pendiente"}</small>
      <div className="match-line">
        <span className="match-side"><TeamLogo team={homeTeam} size="sm" /><span><b>{getUser(state, match.homeUserId).alias}</b><em>{homeTeam.short}</em></span></span>
        <input type="number" min="0" value={homeGoals} onChange={(e) => setHomeGoals(e.target.value)} disabled={!canSubmit || tournament.status === "closed" || tournament.status === "paused"} />
        <strong>-</strong>
        <input type="number" min="0" value={awayGoals} onChange={(e) => setAwayGoals(e.target.value)} disabled={!canSubmit || tournament.status === "closed" || tournament.status === "paused"} />
        <span className="match-side away"><TeamLogo team={awayTeam} size="sm" /><span><b>{getUser(state, match.awayUserId).alias}</b><em>{awayTeam.short}</em></span></span>
      </div>

      {!readyForResult && <p className="hint">Este partido espera clasificados de una ronda anterior.</p>}
      {isKnockoutTournament(tournament) && matchPlayed(match) && match.penaltyWinnerUserId && <p className="hint">Ganador por penales: <strong>{playoffWinner?.alias || "Definido"}</strong>.</p>}
      {playoffTie && canSubmit && tournament.status !== "closed" && tournament.status !== "paused" && (
        <div className="penalty-box">
          <label>Ganador por penales
            <select value={penaltyWinnerUserId} onChange={(e) => setPenaltyWinnerUserId(e.target.value)}>
              <option value="">Seleccionar ganador</option>
              <option value={match.homeUserId}>{getUser(state, match.homeUserId).alias}</option>
              <option value={match.awayUserId}>{getUser(state, match.awayUserId).alias}</option>
            </select>
          </label>
          
        </div>
      )}
      {freeTeams && canSubmit && tournament.status !== "closed" && tournament.status !== "paused" && (
        <div className="match-team-selector-grid">
          <label>Equipo local<select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}><option value="">Seleccionar equipo</option>{state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label>Equipo visita<select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}><option value="">Seleccionar equipo</option>{state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        </div>
      )}
      <div className="match-meta-grid">
        <span>Local <strong>{homeTeamId || match.homeTeamId ? homeTeam.name : "Equipo por elegir"}</strong></span>
        <span>Visita <strong>{awayTeamId || match.awayTeamId ? awayTeam.name : "Equipo por elegir"}</strong></span>
        <span>Estado <strong>{match.resultStatus === "pending_confirmation" ? "Por confirmar" : match.resultStatus === "rejected" ? "Rechazado" : matchPlayed(match) ? "Confirmado" : "Pendiente"}</strong></span>
        <span>Goles cargados <strong>{(match.goalEvents || []).length}</strong></span>
      </div>
      {match.resultProposal && (
        <div className="proposal-box">
          <span>{match.resultProposal.status === "rejected" ? "Rechazado" : "Propuesto"} por <strong>{proposer?.alias || "Usuario"}</strong>: {match.resultProposal.homeGoals}-{match.resultProposal.awayGoals}{match.resultProposal.penaltyWinnerUserId ? ` · penales: ${getUser(state, match.resultProposal.penaltyWinnerUserId).alias}` : ""}</span>
          {canRespond && <div className="actions-row compact"><button className="primary small" onClick={() => onConfirm(match.id)}>Confirmar</button><button className="ghost small" onClick={() => onReject(match.id)}>Rechazar</button></div>}
        </div>
      )}
      {match.resultStatus === "rejected" && <p className="hint">El resultado fue rechazado. Cualquier jugador involucrado o el creador puede proponer/cargar otro marcador.</p>}
      {validationIssues.length > 0 && (
        <div className="match-warning">
          <strong>Revisar detalle del marcador</strong>
          {validationIssues.map((issue, index) => <span key={index}>{issue}</span>)}
        </div>
      )}
      {canSubmit && tournament.status !== "closed" && tournament.status !== "paused" && (
        <div className="actions-row compact right">
          {(matchPlayed(match) || match.resultProposal || (match.goalEvents || []).length > 0) && <button className="ghost small" onClick={() => onClearResult(match.id)}>Marcar pendiente</button>}
          {matchPlayed(match) && <button className="ghost small" onClick={() => onDownloadMatch?.(match)}>Imagen resultado</button>}
          <button className="secondary small" onClick={() => onSubmit(match.id, homeGoals, awayGoals, { homeTeamId, awayTeamId, penaltyWinnerUserId })}>{submitLabel}</button>
        </div>
      )}
      <GoalEventsEditor state={state} tournament={tournament} match={match} canEdit={canEditGoals} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} currentUser={currentUser} />
    </div>
  );
}

function GoalEventsEditor({ state, tournament, match, canEdit, onAddGoal, onRemoveGoal, currentUser }){
  const [side, setSide] = useState("home");
  const [playerName, setPlayerName] = useState("");
  const [assistName, setAssistName] = useState("");
  const [minute, setMinute] = useState("");
  const teamId = side === "home" ? getMatchTeamId(tournament, match, "home") : getMatchTeamId(tournament, match, "away");
  const players = getTeamPlayerNames(state, teamId);
  const selectedPlayer = playerName || players[0] || "";

  function add(){
    if (!teamId) return alert("Primero selecciona y guarda los equipos del partido.");
    if (minute && (!Number.isInteger(Number(minute)) || Number(minute) < 1 || Number(minute) > 90)) return alert("El minuto debe ser un número entre 1 y 90.");
    onAddGoal(match.id, {
      teamId,
      side,
      playerName: selectedPlayer,
      assistName: assistName || "",
      minute: minute || "",
      userId: currentUser.id
    });
    setPlayerName("");
    setAssistName("");
    setMinute("");
  }

  return (
    <div className="goal-events-box">
      <div className="section-head compact-head"><div><p className="eyebrow">Detalle opcional</p><h4>Registro de goles</h4></div></div>
      <div className="goal-list">
        {(match.goalEvents || []).map((event) => <div className="goal-chip with-player" key={event.id}><PlayerAvatar teamId={event.teamId} playerName={event.playerName} size="sm" /><span><strong>Gol: {event.playerName}</strong>{event.assistName ? <em><PlayerAvatar teamId={event.teamId} playerName={event.assistName} size="micro" /> Asistencia: {event.assistName}</em> : <em>Sin asistencia</em>}<small>{getTeam(state, event.teamId).short}{event.minute ? ` · ${event.minute}'` : ""}</small></span>{canEdit && <button className="ghost tiny" onClick={() => onRemoveGoal(match.id, event.id)}>Quitar</button>}</div>)}
        {!(match.goalEvents || []).length && <p className="empty small-empty">Sin goles registrados.</p>}
      </div>
      {canEdit && (
        <>
          <div className="goal-form-preview">
            <span><PlayerAvatar teamId={teamId} playerName={selectedPlayer} size="sm" /> Gol: <strong>{selectedPlayer || "Jugador"}</strong></span>
            {assistName ? <span><PlayerAvatar teamId={teamId} playerName={assistName} size="sm" /> Asistencia: <strong>{assistName}</strong></span> : <span className="muted">Sin asistencia seleccionada</span>}
          </div>
          <div className="goal-form">
          <select value={side} onChange={(e) => { setSide(e.target.value); setPlayerName(""); setAssistName(""); }}><option value="home">Equipo local</option><option value="away">Equipo visita</option></select>
          <select value={selectedPlayer} onChange={(e) => setPlayerName(e.target.value)}>{players.map((name) => <option key={name} value={name}>{name}</option>)}</select>
          <select value={assistName} onChange={(e) => setAssistName(e.target.value)}><option value="">Sin asistencia</option>{players.filter((name) => name !== selectedPlayer).map((name) => <option key={name} value={name}>{name}</option>)}</select>
          <input type="number" min="1" max="90" value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="Min. 1-90" />
            <button className="secondary small" onClick={add}>Agregar gol</button>
          </div>
        </>
      )}
    </div>
  );
}

function InviteMoreFriendsPanel({ state, commit, tournament, currentUser }){
  const friendIds = getFriendIds(state, currentUser.id);
  const unavailable = new Set([
    ...tournament.participants.map((p) => p.userId),
    ...state.invitations.filter((i) => i.tournamentId === tournament.id && i.status === "pending").map((i) => i.toUserId)
  ]);
  const candidates = state.users.filter((u) => friendIds.includes(u.id) && !unavailable.has(u.id));
  const [selected, setSelected] = useState(candidates[0]?.id || "");

  function invite(){
    if (!selected) return;
    commit((draft) => {
      draft.invitations.unshift({ id: uid("i"), tournamentId: tournament.id, fromUserId: currentUser.id, toUserId: selected, status: "pending", createdAt: today(), respondedAt: null });
      return draft;
    });
    setSelected("");
  }

  if (!candidates.length) return null;
  return (
    <div className="inline-panel">
      <h4>Invitar otro amigo</h4>
      <div className="inline-form">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>{candidates.map((u) => <option key={u.id} value={u.id}>{u.alias}</option>)}</select>
        <button className="secondary" onClick={invite}>Enviar invitación</button>
      </div>
    </div>
  );
}

function Friends({ state, commit, currentUser, friendIds, cloudAvailable, cloudSession, cloudLoading, cloudNotice, onCloudSearch, onCloudRequest, onCloudAnswer, onCloudRemove, onCloudRefresh, onCloudAnswerTournamentInvitation }){
  const [query, setQuery] = useState("");
  const [cloudResults, setCloudResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const cloudMode = Boolean(cloudAvailable && cloudSession?.user?.id);

  const allFriendships = Array.isArray(state.friends) ? state.friends : [];
  const friendships = cloudMode ? allFriendships.filter((f) => f.cloud) : allFriendships.filter((f) => !f.cloud);
  const acceptedFriendships = friendships.filter((f) => f.status === "accepted" && (f.requesterId === currentUser.id || f.receiverId === currentUser.id));
  const friends = state.users.filter((u) => friendIds.includes(u.id));
  const incoming = friendships.filter((f) => f.status === "pending" && f.receiverId === currentUser.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requesterId === currentUser.id);
  const getFriendshipBetween = (userId) => acceptedFriendships.find((f) => (f.requesterId === currentUser.id && f.receiverId === userId) || (f.requesterId === userId && f.receiverId === currentUser.id));

  const localCandidates = state.users.filter((u) => {
    if (u.id === currentUser.id) return false;
    const text = `${u.name} ${u.alias}`.toLowerCase();
    const already = friendships.some((f) => (f.requesterId === currentUser.id && f.receiverId === u.id) || (f.requesterId === u.id && f.receiverId === currentUser.id));
    return text.includes(query.toLowerCase()) && !already;
  });

  const cloudCandidates = cloudResults.filter((u) => {
    const already = friendships.some((f) => (f.requesterId === currentUser.id && f.receiverId === u.id) || (f.requesterId === u.id && f.receiverId === currentUser.id));
    return u.id !== currentUser.id && !already;
  });

  async function searchRealUsers(){
    if (!onCloudSearch) return;
    const results = await onCloudSearch(query);
    setCloudResults(results || []);
    setSearched(true);
  }

  function requestFriend(receiverId){
    if (cloudMode) {
      onCloudRequest?.(receiverId);
      setCloudResults((prev) => prev.filter((user) => user.id !== receiverId));
      return;
    }
    commit((draft) => {
      draft.friends.push({ id: uid("f"), requesterId: currentUser.id, receiverId, status: "pending", createdAt: today() });
      return draft;
    });
  }

  function answerFriend(friendshipId, status){
    if (cloudMode) {
      onCloudAnswer?.(friendshipId, status);
      return;
    }
    commit((draft) => {
      const item = draft.friends.find((f) => f.id === friendshipId);
      if (status === "rejected") draft.friends = draft.friends.filter((f) => f.id !== friendshipId);
      else if (item) item.status = "accepted";
      return draft;
    });
  }

  function removeFriend(friendshipId){
    if (cloudMode) {
      onCloudRemove?.(friendshipId);
      return;
    }
    const confirmed = window.confirm("¿Eliminar esta amistad? Después podrán enviarse una nueva solicitud.");
    if (!confirmed) return;
    commit((draft) => {
      draft.friends = draft.friends.filter((f) => f.id !== friendshipId);
      return draft;
    });
  }

  if (cloudAvailable && !cloudSession) {
    return (
      <section className="stack">
        <article className="card hero-panel compact-hero">
          <p className="eyebrow">Amigos reales</p>
          <h2>Inicia sesión para agregar amigos</h2>
          <p>El sistema de amigos ahora usa cuentas registradas. Inicia sesión para buscar usuarios por alias, enviar solicitudes y construir tu ranking entre amigos.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="stack">
      <TournamentInvitationCenter state={state} commit={commit} currentUser={currentUser} cloudMode={cloudMode} cloudLoading={cloudLoading} onCloudAnswerTournamentInvitation={onCloudAnswerTournamentInvitation} />
      <div className="grid-2">
        <article className="card">
          <div className="section-heading compact">
            <div>
              <h3>{cloudMode ? "Buscar usuarios registrados" : "Buscar usuarios"}</h3>
              <p>{cloudMode ? "Busca por alias o nombre público." : "Busca entre los usuarios disponibles."}</p>
            </div>
            {cloudMode && <button className="ghost small" onClick={() => onCloudRefresh?.()} disabled={cloudLoading}>{cloudLoading ? "Actualizando..." : "Actualizar"}</button>}
          </div>

          <div className="inline-form search-inline">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={cloudMode ? "Ej: FelipeChute" : "Buscar por nombre o alias"} onKeyDown={(e) => { if (cloudMode && e.key === "Enter") searchRealUsers(); }} />
            {cloudMode && <button className="primary" onClick={searchRealUsers} disabled={cloudLoading}>{cloudLoading ? "Buscando..." : "Buscar"}</button>}
          </div>

          {cloudNotice && <p className="notice">{cloudNotice}</p>}

          <div className="list spaced">
            {(cloudMode ? cloudCandidates : localCandidates).map((u) => (
              <div className="list-row" key={u.id}>
                <span><strong>{u.alias}</strong><small>{u.name}</small></span>
                <button className="primary small" onClick={() => requestFriend(u.id)} disabled={cloudLoading}>Agregar</button>
              </div>
            ))}
            {cloudMode && searched && !cloudCandidates.length && <p className="empty">No hay usuarios disponibles con ese filtro o ya existe una solicitud.</p>}
            {!cloudMode && !localCandidates.length && <p className="empty">No hay usuarios disponibles con ese filtro.</p>}
          </div>
        </article>

        <article className="card">
          <div className="section-heading compact">
            <div>
              <h3>Mis amigos</h3>
              <p>{cloudMode ? "Amigos vinculados a tu cuenta." : "Amigos guardados en este dispositivo."}</p>
            </div>
          </div>
          <div className="list spaced">
            {friends.map((u) => {
              const friendship = getFriendshipBetween(u.id);
              return <div className="list-row" key={u.id}><span><strong>{u.alias}</strong><small>{u.name}</small></span><div className="actions-row compact"><b>Amigo</b>{friendship && <button className="ghost danger small" disabled={cloudLoading} onClick={() => removeFriend(friendship.id)}>Eliminar</button>}</div></div>;
            })}
            {!friends.length && <p className="empty">Aún no tienes amigos aceptados.</p>}
          </div>

          <h3>Solicitudes recibidas</h3>
          <div className="list spaced">
            {incoming.map((f) => {
              const u = getUser(state, f.requesterId);
              return <div className="list-row" key={f.id}><span><strong>{u.alias}</strong><small>Quiere agregarte</small></span><div className="actions-row compact"><button className="primary small" disabled={cloudLoading} onClick={() => answerFriend(f.id, "accepted")}>Aceptar</button><button className="ghost small" disabled={cloudLoading} onClick={() => answerFriend(f.id, "rejected")}>Rechazar</button></div></div>;
            })}
            {!incoming.length && <p className="empty">Sin solicitudes pendientes.</p>}
          </div>

          <h3>Solicitudes enviadas</h3>
          <div className="list spaced">
            {outgoing.map((f) => {
              const u = getUser(state, f.receiverId);
              return <div className="list-row" key={f.id}><span><strong>{u.alias}</strong><small>Pendiente de respuesta</small></span><div className="actions-row compact"><b>Pendiente</b><button className="ghost danger small" disabled={cloudLoading} onClick={() => cloudMode ? onCloudRemove?.(f.id, { message: "¿Cancelar esta solicitud?", notice: "Solicitud cancelada." }) : removeFriend(f.id)}>Cancelar</button></div></div>;
            })}
            {!outgoing.length && <p className="empty">No tienes solicitudes enviadas pendientes.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function TournamentInvitationCenter({ state, commit, currentUser, cloudMode = false, cloudLoading = false, onCloudAnswerTournamentInvitation }){
  const pending = state.invitations.filter((i) => i.toUserId === currentUser.id && i.status === "pending");
  const [teamByInvite, setTeamByInvite] = useState({});

  async function answerInvitation(invitationId, action){
    if (cloudMode && onCloudAnswerTournamentInvitation) {
      const tournament = state.tournaments.find((t) => t.id === state.invitations.find((i) => i.id === invitationId)?.tournamentId);
      const freeTeams = tournament ? isFreeTeamTournament(tournament) : false;
      const teamId = freeTeams ? null : (teamByInvite[invitationId] || firstAvailableTeamForTournament(state, tournament));
      await onCloudAnswerTournamentInvitation(invitationId, action, teamId);
      return;
    }
    commit((draft) => {
      const invite = draft.invitations.find((i) => i.id === invitationId);
      const tournament = draft.tournaments.find((t) => t.id === invite?.tournamentId);
      if (!invite || !tournament) return draft;

      if (action === "rejected") {
        invite.status = "rejected";
        invite.respondedAt = today();
        return draft;
      }

      const freeTeams = isFreeTeamTournament(tournament);
      const teamId = freeTeams ? null : (teamByInvite[invitationId] || firstAvailableTeamForTournament(draft, tournament));
      if (!freeTeams && !teamId) return draft;
      if (!freeTeams && !tournament.allowDuplicateTeams && tournament.participants.some((p) => p.teamId === teamId)) {
        alert("Ese equipo ya fue elegido en este torneo.");
        return draft;
      }
      if (!tournament.participants.some((p) => p.userId === currentUser.id)) {
        tournament.participants.push({ userId: currentUser.id, teamId, joinedAt: today() });
      }
      invite.status = "accepted";
      invite.respondedAt = today();
      return draft;
    });
  }

  return (
    <article className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Torneos</p>
          <h3>Invitaciones pendientes</h3>
        </div>
        <span className="counter-badge">{pending.length}</span>
      </div>
      <div className="invite-grid">
        {pending.map((invite) => {
          const t = state.tournaments.find((item) => item.id === invite.tournamentId);
          if (!t) return null;
          const selected = teamByInvite[invite.id] || firstAvailableTeamForTournament(state, t);
          const used = usedTeamIds(t);
          return (
            <div className="invite-card" key={invite.id}>
              <span className="status-pill preparing">Invitación</span>
              <h4>{t.name}</h4>
              <p>Invita {getUser(state, invite.fromUserId).alias}. {isFreeTeamTournament(t) ? "Este torneo usa equipo libre por partido." : "Elige equipo para quedar asociado durante todo el torneo."}</p>
              {!isFreeTeamTournament(t) && <select value={selected} onChange={(e) => setTeamByInvite((old) => ({ ...old, [invite.id]: e.target.value }))}>
                {state.teams.map((team) => <option key={team.id} value={team.id} disabled={!t.allowDuplicateTeams && used.has(team.id)}>{team.name}</option>)}
              </select>}
              {isFreeTeamTournament(t) && <div className="info-note compact"><strong>Equipo libre</strong><span>Elegirás equipo en cada partido.</span></div>}
              <div className="actions-row compact"><button className="primary small" disabled={cloudLoading} onClick={() => answerInvitation(invite.id, "accepted")}>Aceptar</button><button className="ghost small" disabled={cloudLoading} onClick={() => answerInvitation(invite.id, "rejected")}>Rechazar</button></div>
            </div>
          );
        })}
        {!pending.length && <p className="empty">No tienes invitaciones pendientes a torneos.</p>}
      </div>
    </article>
  );
}


function MundoChute({ state, openTournament, setView }){
  const summary = getWorldSummary(state);
  const leader = summary.userRanking.find((r) => r.status === "Clasificado") || summary.userRanking[0];
  const topTeam = summary.teamRanking[0];
  const topPlayers = buildPlayerContributionRanking(state).slice(0, 5);
  const activeTournaments = getFeaturedTournaments(state.tournaments.filter((t) => t.status !== "closed"), 5);
  const recentResults = getRecentResultRows(state, state.tournaments, 6);
  const latestChampion = getLatestTournamentChampion(state);
  const totalGoals = state.tournaments.flatMap((t) => t.matches).filter(matchPlayed).reduce((sum, match) => sum + Number(match.homeGoals || 0) + Number(match.awayGoals || 0), 0);
  return (
    <section className="stack mundo-product">
      <div className="hero-panel world-panel product-hero">
        <div>
          <p className="eyebrow">Portada competitiva</p>
          <h2>Mundo Chute</h2>
          <p>Una vista general de la actividad competitiva: campeones, rankings, clubes, futbolistas y torneos activos.</p>
          <div className="actions-row"><button className="primary" onClick={() => setView("torneos")}>Crear o abrir torneo</button><button className="ghost" onClick={() => setView("ranking")}>Ver ranking completo</button></div>
        </div>
        <div className="product-hero-board">
          <div className="scoreboard-main">
            <span>Líder competitivo</span>
            <strong>{leader?.name || "Sin datos"}</strong>
            <small>{leader ? `${leader.score} pts · ${leader.performance}% rendimiento` : "Registra partidos para activar el ranking."}</small>
          </div>
          <div className="scoreboard-row"><span>Equipo líder</span><b>{topTeam?.name || "Sin datos"}</b><em>{topTeam ? `${topTeam.score} pts` : "—"}</em></div>
          <div className="scoreboard-row"><span>Último campeón</span><b>{latestChampion?.profile?.championUser?.alias || "Sin campeón"}</b><em>{latestChampion?.profile?.championTeam?.short || "—"}</em></div>
        </div>
      </div>

      <div className="metric-grid product-metrics wide-metrics">
        <Metric title="Usuarios" value={state.users.length} />
        <Metric title="Torneos activos" value={summary.activeCount} />
        <Metric title="Torneos finalizados" value={summary.closed.length} />
        <Metric title="Partidos ranking" value={summary.played} />
        <Metric title="Goles registrados" value={totalGoals} />
      </div>

      <div className="product-showcase-grid">
        <article className="card product-panel large-panel">
          <div className="section-head">
            <div><p className="eyebrow">Agenda competitiva</p><h3>Torneos activos destacados</h3></div>
            <button className="ghost small" onClick={() => setView("torneos")}>Mis salas</button>
          </div>
          <TournamentSpotlightList state={state} tournaments={activeTournaments} openTournament={openTournament} setView={setView} />
        </article>
        <article className="card product-panel">
          <div className="section-head">
            <div><p className="eyebrow">Usuarios</p><h3>Top global</h3></div>
            <button className="ghost small" onClick={() => setView("ranking")}>Ranking</button>
          </div>
          <ProductRankingList rows={summary.userRanking.slice(0, 5)} />
        </article>
      </div>

      <div className="grid-2 product-grid">
        <article className="card product-panel">
          <div className="section-head"><div><p className="eyebrow">Clubes</p><h3>Equipos dominantes</h3></div><button className="ghost small" onClick={() => setView("equipos")}>Equipos</button></div>
          <ProductTeamHighlights state={state} rows={summary.teamRanking.slice(0, 4)} />
        </article>
        <article className="card product-panel">
          <div className="section-head"><div><p className="eyebrow">Cartas</p><h3>Futbolistas destacados</h3></div><button className="ghost small" onClick={() => setView("ranking")}>Fichas</button></div>
          <ProductPlayerHighlights rows={topPlayers} />
        </article>
      </div>

      <div className="grid-2 product-grid">
        <article className="card product-panel">
          <div className="section-head"><div><p className="eyebrow">Actividad</p><h3>Últimos resultados</h3></div></div>
          <RecentResultsFeed rows={recentResults} openTournament={openTournament} />
        </article>
        <RecordsPanel state={state} />
      </div>

      <HistoryArchivePanel state={state} openTournament={openTournament} />
    </section>
  );
}


function HistoryArchivePanel({ state, openTournament }){
  const closed = buildTournamentArchiveRows(state);
  return (
    <article className="card history-archive-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Palmarés</p>
          <h3>Álbum histórico de torneos</h3>
          <p>Cada torneo finalizado queda guardado como ficha competitiva: campeón, tabla, figuras y partidos destacados.</p>
        </div>
      </div>
      <div className="tournament-archive-grid">
        {closed.slice(0, 8).map(({ tournament, profile }) => {
          const content = (
            <>
              <div className="archive-card-top">
                <span className={`status-pill ${tournament.status}`}>{profile.statusLabel}</span>
                <small>{tournament.season || state.currentSeason}</small>
              </div>
              <h4>{tournament.name}</h4>
              <p><strong>{profile.championUser?.alias || profile.history.champion}</strong> · {profile.championTeam?.short || profile.history.championTeam}</p>
              <div className="archive-mini-stats">
                <span>Partidos <strong>{profile.playedMatches.length}</strong></span>
                <span>Goles <strong>{profile.totalGoals}</strong></span>
                <span>Goleador <strong>{profile.goalRows[0]?.playerName || "Sin datos"}</strong></span>
              </div>
              <small className="archive-card-footer">{profile.formatLabel} · {profile.fixtureLabel}</small>
            </>
          );
          return openTournament ? (
            <button type="button" className="tournament-archive-card" key={tournament.id} onClick={() => openTournament(tournament.id)}>{content}</button>
          ) : (
            <div className="tournament-archive-card" key={tournament.id}>{content}</div>
          );
        })}
        {!closed.length && <p className="empty">Cuando finalices torneos, aparecerán aquí como historial competitivo.</p>}
      </div>
    </article>
  );
}

function RivalriesPanel({ state }){
  const rows = buildRivalryRows(state);
  return (
    <div className="space-top">
      <h4>Rivalidades entre usuarios</h4>
      <SimpleTable rows={rows} columns={["userA", "userB", "pj", "aWins", "bWins", "draws", "goalsA", "goalsB", "last"]} labels={{ userA: "Usuario A", userB: "Usuario B", pj: "PJ", aWins: "Gana A", bWins: "Gana B", draws: "Emp", goalsA: "Goles A", goalsB: "Goles B", last: "Último" }} />
      <p className="hint">Se calcula desde partidos confirmados y permite ver quién domina los enfrentamientos directos.</p>
    </div>
  );
}

function RecordsPanel({ state }){
  const records = buildRecords(state);
  return (
    <article className="card records-card">
      <div className="section-head"><div><p className="eyebrow">Historia</p><h3>Récords históricos</h3></div></div>
      <div className="record-grid">
        {records.map((record) => <div className="record-card" key={record.label}><span>{record.label}</span><strong>{record.value}</strong><small>{record.note}</small></div>)}
      </div>
    </article>
  );
}

function Ranking({ state, rankingScope, setRankingScope, seasonFilter, setSeasonFilter, rankingUsers, teamRanking, userTeamRanking, currentUser, cloudRankings, cloudModeActive, cloudRankingsLoading, cloudRankingsNotice, onRefreshRankings, openTournament }){
  const [tab, setTab] = useState("users");
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const classifiedUsers = rankingUsers.filter((r) => r.status === "Clasificado");
  const classifyingUsers = rankingUsers.filter((r) => r.status !== "Clasificado");
  const selectedUserRanking = rankingUsers.find((r) => r.userId === selectedUserId) || rankingUsers[0] || null;
  const selectedUser = selectedUserRanking ? { ...getUser(state, selectedUserRanking.userId), alias: getUserDisplayName(getUser(state, selectedUserRanking.userId), selectedUserRanking) } : currentUser;

  useEffect(() => {
    if (rankingUsers.length && !rankingUsers.some((row) => row.userId === selectedUserId)) {
      setSelectedUserId(rankingUsers[0].userId);
    }
  }, [rankingUsers, selectedUserId]);

  return (
    <section className="stack">
      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Competencia</p>
            <h3>Ranking Chute</h3>
          </div>
          <div className="tabbar">
            <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Usuarios</button>
            <button className={tab === "teams" ? "active" : ""} onClick={() => setTab("teams")}>Equipos</button>
            <button className={tab === "combos" ? "active" : ""} onClick={() => setTab("combos")}>Usuario + Equipo</button>
            <button className={tab === "public" ? "active" : ""} onClick={() => setTab("public")}>Fichas</button>
            <button className={tab === "rivalries" ? "active" : ""} onClick={() => setTab("rivalries")}>Rivalidades</button>
            <button className={tab === "scorers" ? "active" : ""} onClick={() => setTab("scorers")}>Goles/Asist.</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Palmarés</button><button className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}>Récords</button>
          </div>
        </div>

        {tab === "users" && (
          <>
            <div className="ranking-controls">
              <div className="segmented">
                <button className={rankingScope === "global" ? "active" : ""} onClick={() => setRankingScope("global")}>Global</button>
                <button className={rankingScope === "friends" ? "active" : ""} onClick={() => setRankingScope("friends")}>Mis amigos</button>
              </div>
              <label className="compact-select">Temporada<select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}><option value="all">Histórico</option>{state.seasons.filter((s) => s !== "Histórico").map((season) => <option key={season} value={season}>{season}</option>)}</select></label>
              {cloudModeActive ? <button className="ghost mini" type="button" onClick={onRefreshRankings} disabled={cloudRankingsLoading}>{cloudRankingsLoading ? "Actualizando…" : "Actualizar ranking"}</button> : null}
            </div>
            <div className="section-head compact-head">
              <div>
                <p className="eyebrow">Perfil de usuario</p>
                <h4>Ficha competitiva</h4>
              </div>
            </div>
            {selectedUserRanking ? (
              <UserProfilePanel state={state} user={selectedUser} ranking={selectedUserRanking} userTeamRanking={userTeamRanking} />
            ) : <p className="empty">Aún no hay usuarios con historial competitivo.</p>}

            <div className="section-head compact-head">
              <div>
                <p className="eyebrow">Seleccionar usuario</p>
                <h4>Ranking principal</h4>
              </div>
            </div>
            <div className="user-ranking-grid">
              {[...classifiedUsers, ...classifyingUsers].map((row) => (
                <button key={row.userId} type="button" className={`user-rank-card ${selectedUserId === row.userId ? "selected" : ""}`} onClick={() => setSelectedUserId(row.userId)}>
                  <span className="avatar small">{(row.name || "JU").slice(0, 2).toUpperCase()}</span>
                  <span><strong>#{row.pos} {row.name}</strong><small>{row.pj} PJ · {row.pg} PG · {row.performance}% · {row.titles} copas</small></span>
                  <b>{row.score}</b>
                </button>
              ))}
            </div>
            <h4>Ranking principal</h4>
            <SimpleTable rows={classifiedUsers} columns={["pos", "name", "tournaments", "pj", "pg", "pe", "pp", "dg", "titles", "performance", "score"]} labels={{ pos: "#", name: "Usuario", tournaments: "T", pj: "PJ", pg: "PG", pe: "PE", pp: "PP", dg: "DG", titles: "Copas", performance: "%", score: "Score" }} />
            <h4>En clasificación</h4>
            <SimpleTable rows={classifyingUsers} columns={["pos", "name", "pj", "pg", "performance", "score", "status"]} labels={{ pos: "#", name: "Usuario", pj: "PJ", pg: "PG", performance: "%", score: "Score", status: "Estado" }} compact />
            <p className="hint">El ranking principal exige mínimo 5 partidos jugados. Quienes no cumplen quedan visibles en “En clasificación”.</p>
            {cloudRankingsNotice ? <p className="hint">{cloudRankingsNotice}</p> : null}
          </>
        )}
        {tab === "teams" && <SimpleTable rows={teamRanking} columns={["pos", "name", "tournaments", "pj", "pg", "pe", "pp", "dg", "titles", "performance", "score"]} labels={{ pos: "#", name: "Equipo", tournaments: "T", pj: "PJ", pg: "PG", pe: "PE", pp: "PP", dg: "DG", titles: "Copas", performance: "%", score: "Score" }} />}
        {tab === "combos" && <SimpleTable rows={userTeamRanking} columns={["pos", "userName", "teamName", "tournaments", "pj", "pg", "performance", "titles", "score"]} labels={{ pos: "#", userName: "Usuario", teamName: "Equipo", tournaments: "T", pj: "PJ", pg: "PG", performance: "%", titles: "Copas", score: "Score" }} />}
        {tab === "public" && <PublicProfiles state={state} currentUser={currentUser} />}
        {tab === "rivalries" && <RivalriesPanel state={state} />}
        {tab === "scorers" && <ScorersPanel state={state} cloudRankings={cloudRankings} />}
        {tab === "history" && <HistoryArchivePanel state={state} openTournament={openTournament} />}{tab === "records" && <RecordsPanel state={state} />}
      </article>
      <UserComparator state={state} currentUser={currentUser} />
    </section>
  );
}

function ScorersPanel({ state, cloudRankings }){
  const usingCloud = Boolean(cloudRankings?.loaded);
  const goalRows = usingCloud ? cloudRankings.goalRanking : buildGoalRanking(state);
  const assistRows = usingCloud ? cloudRankings.assistRanking : buildAssistRanking(state);
  const playerRows = usingCloud ? cloudRankings.playerRanking : buildPlayerContributionRanking(state);
  const officialPlayers = getAllOfficialPlayers(state);
  const firstRanked = playerRows[0];
  const initialPlayer = firstRanked ? { teamId: firstRanked.teamId, playerName: firstRanked.playerName } : officialPlayers[0];
  const [selectedKey, setSelectedKey] = useState(initialPlayer ? `${initialPlayer.teamId}_${initialPlayer.playerName}` : "");
  const selected = officialPlayers.find((player) => player.key === selectedKey)
    || playerRows.find((row) => `${row.teamId}_${row.playerName}` === selectedKey)
    || initialPlayer;

  useEffect(() => {
    if (!selectedKey && initialPlayer) setSelectedKey(`${initialPlayer.teamId}_${initialPlayer.playerName}`);
  }, [selectedKey, initialPlayer?.teamId, initialPlayer?.playerName]);

  return (
    <div className="space-top stats-split">
      {selected ? <PlayerProfilePanel state={state} teamId={selected.teamId} playerName={selected.playerName} /> : null}

      <section>
        <div className="section-head compact-head">
          <div>
            <p className="eyebrow">Seleccionar futbolista</p>
            <h4>Ranking histórico de G+A</h4>
          </div>
        </div>
        <div className="player-card-grid">
          {playerRows.slice(0, 12).map((row) => {
            const key = `${row.teamId}_${row.playerName}`;
            return (
              <button type="button" className={`player-rank-card ${selectedKey === key ? "selected" : ""}`} key={key} onClick={() => setSelectedKey(key)}>
                <PlayerAvatar teamId={row.teamId} playerName={row.playerName} size="sm" />
                <span><strong>#{row.pos} {row.playerName}</strong><small>{row.teamName} · {row.goals} G · {row.assists} A</small></span>
                <b>{row.contributions}</b>
              </button>
            );
          })}
          {!playerRows.length && officialPlayers.slice(0, 12).map((player) => (
            <button type="button" className={`player-rank-card ${selectedKey === player.key ? "selected" : ""}`} key={player.key} onClick={() => setSelectedKey(player.key)}>
              <PlayerAvatar teamId={player.teamId} playerName={player.playerName} size="sm" />
              <span><strong>{player.playerName}</strong><small>{player.teamName} · {player.position}</small></span>
              <b>0</b>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>Futbolistas históricos</h4>
        <SimpleTable rows={playerRows} columns={["pos", "playerName", "teamName", "goals", "assists", "contributions", "tournaments"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", goals: "G", assists: "A", contributions: "G+A", tournaments: "Torneos" }} />
      </section>
      <section>
        <h4>Goleadores históricos</h4>
        <SimpleTable rows={goalRows} columns={["pos", "playerName", "teamName", "goals", "tournaments", "last"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", goals: "Goles", tournaments: "Torneos", last: "Último registro" }} />
      </section>
      <section>
        <h4>Asistidores históricos</h4>
        <SimpleTable rows={assistRows} columns={["pos", "playerName", "teamName", "assists", "tournaments", "last"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", assists: "Asist.", tournaments: "Torneos", last: "Último registro" }} />
      </section>
    </div>
  );
}

function PlayerProfilePanel({ state, teamId, playerName }){
  const profile = buildPlayerProfile(state, teamId, playerName);
  const team = getTeam(state, teamId);
  const userRows = profile.users.slice(0, 6);
  const tournamentRows = profile.tournaments.slice(0, 6);
  const recentRows = profile.recent;

  return (
    <article className={`player-profile-detail ${team.tone || ""}`}>
      <div className="player-profile-hero">
        <PlayerAvatar teamId={teamId} playerName={playerName} size="xl" />
        <div>
          <p className="eyebrow">Perfil de futbolista</p>
          <h2>{profile.playerName}</h2>
          <p>{profile.position} · <strong>{profile.teamFullName}</strong></p>
        </div>
        <span className="status-pill closed">Ranking #{profile.globalRank}</span>
      </div>

      <div className="info-grid player-profile-stats">
        <span>Goles <strong>{profile.goals}</strong></span>
        <span>Asistencias <strong>{profile.assists}</strong></span>
        <span>G+A <strong>{profile.contributions}</strong></span>
        <span>Torneos <strong>{profile.tournamentsCount}</strong></span>
        <span>Ranking club <strong>#{profile.teamRank}</strong></span>
      </div>

      <div className="grid-2 player-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Usuarios que más lo han usado</h3>
          <div className="list spaced">
            {userRows.map((row) => (
              <div className="list-row" key={row.key}>
                <span><strong>{row.userName}</strong><small>{row.goals} G · {row.assists} A · {row.tournaments} torneos</small></span>
                <b>{row.contributions}</b>
              </div>
            ))}
            {!userRows.length && <p className="empty">Aún no tiene registros competitivos.</p>}
          </div>
        </section>

        <section className="profile-public-card soft-card">
          <h3>Torneos destacados</h3>
          <div className="list spaced">
            {tournamentRows.map((row) => (
              <div className="list-row" key={row.key}>
                <span><strong>{row.tournament}</strong><small>{row.goals} G · {row.assists} A · {row.last}</small></span>
                <b>{row.contributions}</b>
              </div>
            ))}
            {!tournamentRows.length && <p className="empty">Aún no registra goles ni asistencias en torneos.</p>}
          </div>
        </section>
      </div>

      <section className="profile-public-card soft-card">
        <h3>Últimos registros</h3>
        <SimpleTable rows={recentRows} columns={["tournament", "round", "action", "minute", "userName", "match"]} labels={{ tournament: "Torneo", round: "Fecha", action: "Acción", minute: "Min.", userName: "Usuario", match: "Partido" }} compact />
      </section>
    </article>
  );
}

function PublicProfiles({ state, currentUser }){
  const [userId, setUserId] = useState(currentUser.id);
  const [teamId, setTeamId] = useState(state.teams[0]?.id || "");
  const currentTeam = getTeam(state, teamId);
  const firstPlayer = currentTeam.players?.[0]?.[0] || "";
  const [playerName, setPlayerName] = useState(firstPlayer);
  const user = getUser(state, userId);
  const ranking = buildUserRanking(state).find((r) => r.userId === userId) || { userId, name: user.alias || user.name, ...emptyStats(), performance: 0, pos: "-", score: 0, status: "En clasificación" };
  const team = getTeam(state, teamId);
  const teamProfile = getTeamProfile(state, teamId);
  const userTeamRows = buildUserTeamRanking(state);

  useEffect(() => {
    if (!team.players?.some(([name]) => name === playerName)) {
      setPlayerName(team.players?.[0]?.[0] || "");
    }
  }, [teamId, playerName, team.players]);

  return (
    <div className="space-top stack">
      <div className="form-grid three profile-picker-row">
        <label>Ficha pública de usuario<select value={userId} onChange={(e) => setUserId(e.target.value)}>{state.users.map((u) => <option key={u.id} value={u.id}>{u.alias}</option>)}</select></label>
        <label>Ficha pública de equipo<select value={teamId} onChange={(e) => setTeamId(e.target.value)}>{state.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Ficha de futbolista<select value={playerName} onChange={(e) => setPlayerName(e.target.value)}>{(team.players || []).map(([name, position]) => <option key={name} value={name}>{name} · {position}</option>)}</select></label>
      </div>

      <UserProfilePanel state={state} user={user} ranking={ranking} userTeamRanking={userTeamRows} />

      <PlayerProfilePanel state={state} teamId={team.id} playerName={playerName} />

      <article className={`profile-public-card team-profile ${team.tone}`}>
        <TeamLogo team={team} size="lg" />
        <h3>{team.name}</h3>
        <p>Entrenador: <strong>{team.coach || "Sin entrenador"}</strong></p>
        <div className="info-grid">
          <span>Partidos <strong>{teamProfile.ranking.pj}</strong></span>
          <span>Victorias <strong>{teamProfile.ranking.pg}</strong></span>
          <span>Títulos <strong>{teamProfile.ranking.titles}</strong></span>
          <span>Rendimiento <strong>{teamProfile.ranking.performance}%</strong></span>
        </div>
        <h4>Plantilla oficial</h4>
        <RosterPreview team={team} onPlayerSelect={setPlayerName} selectedPlayerName={playerName} />
        <h4>Usuarios destacados</h4>
        <div className="list spaced">
          {teamProfile.combos.slice(0, 3).map((combo) => <div className="list-row" key={combo.key}><span><strong>{combo.userName}</strong><small>{combo.pj} PJ · {combo.performance}% rendimiento</small></span><b>{combo.score}</b></div>)}
          {!teamProfile.combos.length && <p className="empty">Aún sin datos suficientes.</p>}
        </div>
      </article>
    </div>
  );
}

function UserComparator({ state, currentUser }){
  const firstOther = state.users.find((u) => u.id !== currentUser.id)?.id || state.users[0]?.id;
  const [userA, setUserA] = useState(currentUser.id);
  const [userB, setUserB] = useState(firstOther);
  const h2h = userA && userB && userA !== userB ? getHeadToHead(state, userA, userB) : null;

  return (
    <article className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Comparador</p>
          <h3>Usuario contra usuario</h3>
        </div>
      </div>
      <div className="form-grid two">
        <label>Usuario A<select value={userA} onChange={(e) => setUserA(e.target.value)}>{state.users.map((u) => <option key={u.id} value={u.id}>{u.alias}</option>)}</select></label>
        <label>Usuario B<select value={userB} onChange={(e) => setUserB(e.target.value)}>{state.users.map((u) => <option key={u.id} value={u.id}>{u.alias}</option>)}</select></label>
      </div>
      {h2h ? (
        <div className="compare-grid">
          <div className="compare-card"><strong>{h2h.a.name}</strong><span>{h2h.a.pg} victorias · {h2h.a.gf} goles</span></div>
          <div className="compare-center"><strong>{h2h.matches.length}</strong><span>enfrentamientos</span></div>
          <div className="compare-card"><strong>{h2h.b.name}</strong><span>{h2h.b.pg} victorias · {h2h.b.gf} goles</span></div>
          <div className="compare-note">
            {h2h.last ? `Último: ${h2h.last.tournament} · ${h2h.a.name} ${h2h.last.aGoals}-${h2h.last.bGoals} ${h2h.b.name}` : "Aún no registran enfrentamientos directos."}
          </div>
        </div>
      ) : <p className="empty">Elige dos usuarios distintos.</p>}
    </article>
  );
}

function Teams({ state, teamRanking, userTeamRanking }){
  const [selectedTeamId, setSelectedTeamId] = useState(state.teams[0]?.id || "");

  useEffect(() => {
    if (!state.teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(state.teams[0]?.id || "");
    }
  }, [state.teams, selectedTeamId]);

  const selectedTeam = state.teams.find((team) => team.id === selectedTeamId) || state.teams[0];
  const selectedRank = selectedTeam ? (teamRanking.find((r) => r.teamId === selectedTeam.id) || { teamId: selectedTeam.id, name: selectedTeam.short || selectedTeam.name, ...emptyStats(), performance: 0, pos: "-" }) : null;

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">Clubes oficiales</p>
          <h2>Equipos</h2>
          <p>Selecciona un club para revisar su perfil competitivo, rendimiento histórico, usuarios destacados y plantilla oficial.</p>
        </div>
      </div>

      {selectedTeam && <TeamProfilePanel state={state} team={selectedTeam} ranking={selectedRank} userTeamRanking={userTeamRanking} />}

      <div className="section-head compact-head">
        <div>
          <p className="eyebrow">Seleccionar equipo</p>
          <h3>Perfiles disponibles</h3>
        </div>
      </div>
      <div className="team-grid detailed selectable-team-grid">
        {state.teams.map((team) => {
          const rank = teamRanking.find((r) => r.teamId === team.id) || { ...emptyStats(), performance: 0, pos: "-" };
          const bestCombo = userTeamRanking.filter((r) => r.teamId === team.id).sort((a, b) => b.score - a.score)[0];
          const active = selectedTeamId === team.id;
          return (
            <button type="button" className={`team-card team-card-button ${team.tone} ${active ? "selected" : ""}`} key={team.id} onClick={() => setSelectedTeamId(team.id)}>
              <div className="team-card-topline">
                <TeamLogo team={team} size="lg" />
                <span className="status-pill">{active ? "Perfil abierto" : "Ver perfil"}</span>
              </div>
              <h3>{team.name}</h3>
              <p>DT: <strong>{team.coach}</strong></p>
              <div className="team-card-mini-stats">
                <span><strong>{rank.pj || 0}</strong><small>PJ</small></span>
                <span><strong>{rank.pg || 0}</strong><small>PG</small></span>
                <span><strong>{rank.titles || 0}</strong><small>Copas</small></span>
                <span><strong>{rank.performance || 0}%</strong><small>Rend.</small></span>
              </div>
              <small>Mejor usuario: {bestCombo?.userName || "Sin datos"}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function UserProfilePanel({ state, user, ranking, userTeamRanking }){
  const displayName = getUserDisplayName(user, ranking);
  const rank = ranking || { userId: user.id, name: displayName, ...emptyStats(), performance: 0, pos: "-", score: 0, status: "En clasificación" };
  const insights = getUserInsights(state, user.id);
  const achievements = getAchievementsForUser(state, user.id);
  const resume = buildUserTournamentResume(state, user.id);
  const teamRows = (userTeamRanking || buildUserTeamRanking(state)).filter((row) => row.userId === user.id).sort((a, b) => b.score - a.score || b.performance - a.performance).slice(0, 6);
  const recentRows = buildUserRecentMatchRows(state, user.id, 8);
  const rivalRows = buildUserRivalRows(state, user.id);
  const playerRows = buildUserPlayerRows(state, user.id).slice(0, 8);
  const statusText = rank.status || (rank.pj >= 5 ? "Clasificado" : "En clasificación");

  return (
    <article className="user-profile-detail">
      <div className="user-profile-hero">
        <div className="avatar huge">{displayName.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="eyebrow">Perfil de usuario</p>
          <h2>{displayName}</h2>
          <p>{user.name && user.name !== displayName ? user.name : "Competidor Chute"}{user.createdAt ? ` · miembro desde ${user.createdAt}` : ""}</p>
        </div>
        <span className="status-pill closed">Ranking #{rank.pos || "-"}</span>
      </div>

      <div className="info-grid user-profile-stats">
        <span>Partidos <strong>{rank.pj || 0}</strong></span>
        <span>Victorias <strong>{rank.pg || 0}</strong></span>
        <span>Empates <strong>{rank.pe || 0}</strong></span>
        <span>Derrotas <strong>{rank.pp || 0}</strong></span>
        <span>Goles a favor <strong>{rank.gf || 0}</strong></span>
        <span>Goles en contra <strong>{rank.gc || 0}</strong></span>
        <span>Diferencia <strong>{rank.dg || 0}</strong></span>
        <span>Títulos <strong>{rank.titles || 0}</strong></span>
        <span>Rendimiento <strong>{rank.performance || 0}%</strong></span>
        <span>Score <strong>{rank.score || 0}</strong></span>
      </div>

      <div className="grid-2 user-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Identidad competitiva</h3>
          <div className="profile-lines">
            <span>Estado <strong>{statusText}</strong></span>
            <span>Torneos jugados <strong>{resume.played.length}</strong></span>
            <span>Torneos finalizados <strong>{resume.closed.length}</strong></span>
            <span>Subcampeonatos <strong>{resume.runnerUps.length}</strong></span>
            <span>Equipo más usado <strong>{insights.favoriteTeam}</strong></span>
            <span>Mejor equipo <strong>{insights.bestTeam}</strong></span>
            <span>Rival frecuente <strong>{insights.topRival}</strong></span>
          </div>
        </section>

        <section className="profile-public-card soft-card">
          <h3>Mejores equipos usados</h3>
          <div className="list spaced">
            {teamRows.map((row) => (
              <div className="list-row" key={row.key}>
                <span><strong>{row.teamName}</strong><small>{row.pj} PJ · {row.pg} PG · {row.performance}% rendimiento · {row.titles} copas</small></span>
                <b>{row.score}</b>
              </div>
            ))}
            {!teamRows.length && <p className="empty">Aún no hay equipos con historial suficiente.</p>}
          </div>
        </section>
      </div>

      <div className="grid-2 user-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Últimos partidos</h3>
          <SimpleTable rows={recentRows} columns={["tournament", "round", "opponent", "team", "score", "result"]} labels={{ tournament: "Torneo", round: "Fecha", opponent: "Rival", team: "Equipo", score: "Marcador", result: "Resultado" }} compact />
        </section>

        <section className="profile-public-card soft-card">
          <h3>Rivales frecuentes</h3>
          <SimpleTable rows={rivalRows} columns={["opponent", "pj", "pg", "pe", "pp", "gf", "gc", "performance"]} labels={{ opponent: "Rival", pj: "PJ", pg: "PG", pe: "PE", pp: "PP", gf: "GF", gc: "GC", performance: "%" }} compact />
        </section>
      </div>

      <div className="grid-2 user-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Futbolistas destacados</h3>
          <SimpleTable rows={playerRows} columns={["pos", "playerName", "teamName", "goals", "assists", "contributions"]} labels={{ pos: "#", playerName: "Jugador", teamName: "Equipo", goals: "G", assists: "A", contributions: "G+A" }} compact />
        </section>

        <section className="profile-public-card soft-card">
          <h3>Palmarés</h3>
          <div className="list spaced">
            {resume.titles.map((tournament) => (
              <div className="list-row" key={tournament.id}>
                <span><strong>{tournament.name}</strong><small>{tournament.season || state.currentSeason} · {getTeam(state, tournament.championTeamId).short || getTeam(state, tournament.championTeamId).name}</small></span>
                <b>🏆</b>
              </div>
            ))}
            {!resume.titles.length && <p className="empty">Aún no registra títulos.</p>}
          </div>
        </section>
      </div>

      <section className="profile-public-card soft-card">
        <h3>Logros</h3>
        <div className="achievement-strip wrap">
          {achievements.map((achievement) => <span key={achievement.id} className={achievement.unlocked ? "achievement on" : "achievement"}><strong>{achievement.title}</strong><small>{achievement.description}</small></span>)}
        </div>
      </section>
    </article>
  );
}

function TeamProfilePanel({ state, team, ranking, userTeamRanking }){
  const profile = getTeamProfile(state, team.id);
  const rank = ranking || profile.ranking || { ...emptyStats(), performance: 0, pos: "-" };
  const rankedPlayer = buildPlayerContributionRanking(state).find((row) => row.teamId === team.id);
  const [selectedPlayerName, setSelectedPlayerName] = useState(rankedPlayer?.playerName || team.players?.[0]?.[0] || "");
  const bestCombos = userTeamRanking.filter((row) => row.teamId === team.id).sort((a, b) => b.score - a.score || b.performance - a.performance).slice(0, 5);
  const playerRows = buildPlayerContributionRanking(state).filter((row) => row.teamId === team.id).slice(0, 6);
  const goalRows = buildGoalRanking(state).filter((row) => row.teamId === team.id).slice(0, 5);
  const assistRows = buildAssistRanking(state).filter((row) => row.teamId === team.id).slice(0, 5);
  const titles = (state.tournaments || []).filter((t) => t.status === "closed" && t.championTeamId === team.id).slice(-5).reverse();
  const recentRows = profile.recent.map(({ tournament, match }, index) => {
    const home = getUser(state, match.homeUserId).alias;
    const away = getUser(state, match.awayUserId).alias;
    const homeTeam = getTeam(state, match.homeTeamId).short || getTeam(state, match.homeTeamId).name;
    const awayTeam = getTeam(state, match.awayTeamId).short || getTeam(state, match.awayTeamId).name;
    return {
      key: `${team.id}_${match.id || index}`,
      tournament,
      round: match.round || "Partido",
      result: `${home} ${match.homeGoals}-${match.awayGoals} ${away}`,
      teams: `${homeTeam} vs ${awayTeam}`
    };
  });

  useEffect(() => {
    if (!team.players?.some(([name]) => name === selectedPlayerName)) {
      setSelectedPlayerName(team.players?.[0]?.[0] || "");
    }
  }, [team.id, selectedPlayerName, team.players]);

  return (
    <article className={`team-profile-detail ${team.tone}`}>
      <div className="team-profile-hero">
        <TeamLogo team={team} size="xl" />
        <div>
          <p className="eyebrow">Perfil de equipo</p>
          <h2>{team.name}</h2>
          <p>DT: <strong>{team.coach || "Sin entrenador"}</strong></p>
        </div>
        <span className="status-pill closed">Ranking #{rank.pos || "-"}</span>
      </div>

      <div className="info-grid team-profile-stats">
        <span>Partidos <strong>{rank.pj || 0}</strong></span>
        <span>Victorias <strong>{rank.pg || 0}</strong></span>
        <span>Empates <strong>{rank.pe || 0}</strong></span>
        <span>Derrotas <strong>{rank.pp || 0}</strong></span>
        <span>Goles a favor <strong>{rank.gf || 0}</strong></span>
        <span>Goles en contra <strong>{rank.gc || 0}</strong></span>
        <span>Diferencia <strong>{rank.dg || 0}</strong></span>
        <span>Títulos <strong>{rank.titles || 0}</strong></span>
        <span>Rendimiento <strong>{rank.performance || 0}%</strong></span>
        <span>Score <strong>{rank.score || 0}</strong></span>
      </div>

      <div className="grid-2 team-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Usuarios destacados</h3>
          <div className="list spaced">
            {bestCombos.map((combo) => (
              <div className="list-row" key={combo.key}>
                <span><strong>{combo.userName}</strong><small>{combo.pj} PJ · {combo.pg} PG · {combo.performance}% rendimiento</small></span>
                <b>{combo.score}</b>
              </div>
            ))}
            {!bestCombos.length && <p className="empty">Aún no hay usuarios destacados con este equipo.</p>}
          </div>
        </section>

        <section className="profile-public-card soft-card">
          <h3>Últimos partidos</h3>
          <SimpleTable rows={recentRows} columns={["tournament", "round", "result", "teams"]} labels={{ tournament: "Torneo", round: "Fecha", result: "Resultado", teams: "Equipos" }} compact />
        </section>
      </div>

      <div className="grid-2 team-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Futbolistas históricos</h3>
          <div className="player-mini-list">
            {playerRows.map((row) => (
              <button type="button" key={row.key} className={`player-mini-row ${selectedPlayerName === row.playerName ? "selected" : ""}`} onClick={() => setSelectedPlayerName(row.playerName)}>
                <PlayerAvatar teamId={row.teamId} playerName={row.playerName} size="xs" />
                <span><strong>{row.playerName}</strong><small>{row.goals} G · {row.assists} A</small></span>
                <b>{row.contributions}</b>
              </button>
            ))}
            {!playerRows.length && <p className="empty">Aún no hay futbolistas con registros competitivos.</p>}
          </div>
        </section>

        <section className="profile-public-card soft-card">
          <h3>Palmarés reciente</h3>
          <div className="list spaced">
            {titles.map((tournament) => (
              <div className="list-row" key={tournament.id}>
                <span><strong>{tournament.name}</strong><small>{tournament.season || state.currentSeason} · Campeón: {getUser(state, tournament.championUserId).alias}</small></span>
                <b>🏆</b>
              </div>
            ))}
            {!titles.length && <p className="empty">Aún no registra títulos.</p>}
          </div>
        </section>
      </div>

      <div className="grid-2 team-profile-grid">
        <section className="profile-public-card soft-card">
          <h3>Goleadores del club</h3>
          <SimpleTable rows={goalRows} columns={["pos", "playerName", "goals", "assists"]} labels={{ pos: "#", playerName: "Jugador", goals: "Goles", assists: "Asist." }} compact />
        </section>

        <section className="profile-public-card soft-card">
          <h3>Asistidores del club</h3>
          <SimpleTable rows={assistRows} columns={["pos", "playerName", "assists", "goals"]} labels={{ pos: "#", playerName: "Jugador", assists: "Asist.", goals: "Goles" }} compact />
        </section>
      </div>

      <PlayerProfilePanel state={state} teamId={team.id} playerName={selectedPlayerName} />

      <section className="profile-public-card soft-card roster-profile-card">
        <h3>Plantilla oficial</h3>
        <RosterPreview team={team} onPlayerSelect={setSelectedPlayerName} selectedPlayerName={selectedPlayerName} />
      </section>
    </article>
  );
}

function RosterPreview({ team, onPlayerSelect, selectedPlayerName = "" }){
  const groups = getPlayerGroups(team);
  return (
    <div className="roster-box photo-roster">
      {Object.entries(groups).filter(([, players]) => players.length).map(([position, players]) => (
        <div key={position} className="roster-group">
          <strong>{position}</strong>
          <div className="roster-photo-grid">
            {players.map((name) => {
              const content = <><PlayerAvatar teamId={team.id} playerName={name} size="sm" /><em>{name}</em></>;
              return onPlayerSelect ? (
                <button type="button" className={`roster-player roster-player-button ${selectedPlayerName === name ? "selected" : ""}`} key={name} onClick={() => onPlayerSelect(name)}>{content}</button>
              ) : <span className="roster-player" key={name}>{content}</span>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Profile({ state, currentUser, friendIds, rankingUsers, openTournament, visibleTournaments }){
  const row = rankingUsers.find((r) => r.userId === currentUser.id) || { userId: currentUser.id, name: currentUser.alias || currentUser.name, ...emptyStats(), performance: 0, score: 0, pos: "-", status: "En clasificación" };
  const myTournaments = visibleTournaments;
  const friends = state.users.filter((u) => friendIds.includes(u.id));
  const userTeamRows = buildUserTeamRanking(state);

  return (
    <section className="stack">
      <UserProfilePanel state={state} user={currentUser} ranking={row} userTeamRanking={userTeamRows} />

      <div className="grid-2">
        <article className="card">
          <h3>Mis torneos</h3>
          <div className="list spaced">
            {myTournaments.map((t) => <button className="list-row button-row" key={t.id} onClick={() => openTournament(t.id)}><span><strong>{t.name}</strong><small>{formatLabel(t.format)} · {STATUS_LABELS[t.status]}</small></span><b>{t.championUserId === currentUser.id ? "Campeón" : "Abrir"}</b></button>)}
            {!myTournaments.length && <p className="empty">Aún no participa en torneos.</p>}
          </div>
        </article>
        <article className="card">
          <h3>Amigos</h3>
          <div className="list spaced">
            {friends.map((u) => <div className="list-row" key={u.id}><span><strong>{u.alias}</strong><small>{u.name}</small></span></div>)}
            {!friends.length && <p className="empty">Sin amigos aceptados.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function Admin({ state, commit }){
  const [payload, setPayload] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const backupSize = JSON.stringify(state).length;
  const diagnostics = buildDataDiagnostics(state);

  function exportJson(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chute-respaldo-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson(){
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      alert("Respaldo copiado al portapapeles.");
    } catch {
      setPayload(JSON.stringify(state, null, 2));
      alert("No se pudo copiar automáticamente. Dejé el respaldo en el cuadro de texto.");
    }
  }

  function importJson(){
    try {
      const parsed = normalizeState(JSON.parse(payload));
      if (!parsed.users || !parsed.tournaments) return alert("El respaldo no parece válido.");
      commit(parsed);
      setPayload("");
    } catch {
      alert("No se pudo leer el JSON.");
    }
  }

  function reset(){
    setConfirmAction({
      title: "Reiniciar información",
      description: "Se reemplazará la información actual por una instalación limpia. Descarga un respaldo antes si quieres conservar tu avance.",
      intent: "warning",
      confirmLabel: "Reiniciar",
      onConfirm: () => { commit(seedState()); setConfirmAction(null); }
    });
  }

  function clearLocalData(){
    setConfirmAction({
      title: "Reiniciar datos",
      description: "Se borrarán los datos guardados de Chute en este navegador y se cargará una instalación limpia. Esta acción no se puede deshacer si no descargaste un respaldo.",
      intent: "danger",
      confirmLabel: "Reiniciar",
      onConfirm: () => {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        const fresh = seedState();
        saveState(fresh);
        commit(fresh);
        setConfirmAction(null);
      }
    });
  }

  function recalculateClosedChampions(){
    commit((draft) => {
      draft.tournaments.forEach((t) => {
        if (t.status !== "closed") return;
        const standings = tournamentStandings(draft, t);
        const champion = standings[0];
        if (champion) {
          t.championUserId = champion.userId;
          t.championTeamId = champion.teamId;
          addActivity(t, "recalculated", "Se recalculó el campeón desde la tabla actual.", draft.currentUserId);
        }
      });
      return draft;
    });
  }


  function repairBasicData(){
    commit((draft) => {
      const normalized = normalizeState(draft);
      normalized.tournaments.forEach((t) => {
        if (t.status === "closed") {
          const standings = tournamentStandings(normalized, t);
          const champion = standings[0];
          if (champion) {
            t.championUserId = champion.userId;
            t.championTeamId = champion.teamId;
          }
        }
      });
      normalized.meta = { ...(normalized.meta || {}), dataVersion: DATA_VERSION, release: APP_VERSION, repairedAt: today() };
      return normalized;
    });
  }

  return (
    <section className="stack">
      {confirmAction && (
        <ConfirmationModal
          title={confirmAction.title}
          description={confirmAction.description}
          intent={confirmAction.intent}
          confirmLabel={confirmAction.confirmLabel}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}
      <article className="card backup-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Respaldo</p>
            <h3>Guardar, importar o reiniciar información</h3>
          </div>
          <span className="status-pill active">{Math.ceil(backupSize / 1024)} KB</span>
        </div>
        <p>Descarga un respaldo antes de realizar cambios grandes, importar información o reiniciar la aplicación.</p>
        <div className="backup-actions">
          <button className="primary" onClick={exportJson}>Descargar respaldo</button>
          <button className="secondary" onClick={copyJson}>Copiar respaldo</button>
          <button className="ghost" onClick={reset}>Reiniciar datos</button>
          <button className="danger" onClick={clearLocalData}>Borrar información</button>
        </div>
        <label>Importar respaldo JSON<textarea value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Pega aquí el contenido de un respaldo JSON exportado desde Chute" /></label>
        <div className="actions-row right"><button className="secondary" onClick={importJson}>Importar respaldo pegado</button></div>
      </article>
      <article className="card diagnostics-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Revisión</p>
            <h3>Estado de la información</h3>
          </div>
          <span className={diagnostics.length ? "status-pill rejected" : "status-pill active"}>{diagnostics.length} alertas</span>
        </div>
        <p>Revisa diferencias entre marcador y goles, minutos fuera de rango o torneos finalizados sin campeón.</p>
        <div className="actions-row"><button className="secondary" onClick={recalculateClosedChampions}>Recalcular campeones cerrados</button><button className="ghost" onClick={repairBasicData}>Reparar datos básicos</button></div>
        <div className="list spaced">
          {diagnostics.slice(0, 12).map((issue, index) => <div className="list-row" key={index}><span><strong>{issue.type}</strong><small>{issue.detail}</small></span></div>)}
          {!diagnostics.length && <p className="empty">No se detectaron inconsistencias relevantes.</p>}
        </div>
      </article>

      <article className="card help-card">
        <h3>Ayuda rápida</h3>
        <p>Usa esta guía como referencia básica para administrar torneos sin perder consistencia en los registros.</p>
        <ul className="clean-list">
          <li>Crea una sala y elige tu equipo.</li>
          <li>Invita amigos o comparte el código de ingreso.</li>
          <li>Registra resultados y, si quieres, carga goleadores y asistidores.</li>
          <li>Finaliza el torneo cuando todos los partidos estén confirmados.</li>
          <li>Descarga respaldos antes de borrar o importar información.</li>
        </ul>
      </article>
    </section>
  );
}


class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Chute Plataforma detectó un error de interfaz:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <article className="card">
            <p className="eyebrow">Recuperación</p>
            <h2>No se pudo cargar esta vista</h2>
            <p>Actualiza la página. Si el problema continúa, descarga un respaldo desde Ajustes cuando puedas y revisa la información guardada.</p>
            <div className="actions-row">
              <button className="primary" onClick={() => window.location.reload()}>Actualizar página</button>
            </div>
          </article>
        </div>
      );
    }
    return this.props.children;
  }
}

function SimpleTable({ rows, columns, labels, compact = false }){
  if (!rows?.length) return <p className="empty">Sin datos.</p>;
  function renderCell(row, column){
    if (column === "performance") return `${row[column] || 0}%`;
    if (column === "playerName" && row.teamId) {
      return <span className="table-player"><PlayerAvatar teamId={row.teamId} playerName={row[column]} size="xs" /><span>{row[column]}</span></span>;
    }
    return row[column];
  }
  return (
    <div className="table-wrap">
      <table className={compact ? "compact" : ""}>
        <thead><tr>{columns.map((c) => <th key={c}>{labels[c] || c}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.key || row.userId || row.teamId || index}>{columns.map((c) => <td key={c}>{renderCell(row, c)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function statusShort(status){
  return status === "preparing" ? "Preparando" : status === "closed" ? "Finalizado" : status === "paused" ? "Pausado" : "Activo";
}

function formatLabel(format){
  return FORMAT_LABELS[format] || format;
}

function formatTeamSelectionMode(mode){
  return TEAM_SELECTION_LABELS[mode] || TEAM_SELECTION_LABELS.fixed;
}

function formatFixtureMode(mode){
  return FIXTURE_MODE_LABELS[mode] || FIXTURE_MODE_LABELS.single_leg;
}

createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
