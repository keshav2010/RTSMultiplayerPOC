
import dotenv from 'dotenv';
dotenv.config();
export const SERVER_CONFIG = {
  TICKRATE: Number(process.env.TICKRATE || 60),
  COUNTDOWN: Number(process.env.COUNTDOWN || 5000),
  COUNTDOWN_SPAWN_SELECTIONS: Number(
    process.env.COUNTDOWN_SPAWN_SELECTION || 5000
  ),
  COUNTDOWN_DEFAULT: Number(process.env.COUNTDOWN_DEFAULT || 15000),
  MAX_SESSION_PER_WORKER: Number(process.env.MAX_SESSION_PER_WORKER || 10),
  MINIMUM_PLAYERS_PER_SESSION: Number(
    process.env.MINIMUM_PLAYERS_PER_SESSION
  ),
};
export enum CoreErrorCodes {
  REMOVE_ITEM_FAILED = "remove_scene_item_failed",
  ADD_ITEM_FAILED = "add_scene_item_failed",
  MAX_SESSIONS_REACHED = "MAX_SESSIONS_REACHED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export const MOVABLE_UNIT_CONSTANTS = {
  MAX_STEER_FORCE: 10,
  MAX_REPEL_FORCE: 30,

  MAX_DISTANCE_OFFSET_ALLOWED_FROM_EXPECTED_POSITION: 50,

  /**
   * NEARBY_SEARCH_RADI serves following purpose
   * 1. detect nearby allies under attack
   * 2. find attack target
   */
  NEARBY_SEARCH_RADI: 150,

  /**
   * 
   */
  MINIMUM_SEPERATION_DISTANCE_BETWEEN_UNITS: 30, //to initiate repulsion force
  MAX_TARGETPOS_OVERLAP_DIST: 70,
};
