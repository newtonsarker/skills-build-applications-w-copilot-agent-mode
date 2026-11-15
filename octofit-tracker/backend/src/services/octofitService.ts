import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function requireNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(`${field} is required`, 400);
  }
  return value.trim();
}

function requirePositiveNumber(value: unknown, field: string) {
  if (typeof value === 'string') {
    const num = Number(value);
    if (Number.isFinite(num) && num >= 1) return num;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) return value;
  throw httpError(`${field} must be at least 1`, 400);
}

function normalizeObjectId(value: unknown, field: string) {
  const input = requireNonEmptyString(value, field);
  if (!mongoose.Types.ObjectId.isValid(input)) {
    throw httpError(`${field} is invalid`, 400);
  }
  return new mongoose.Types.ObjectId(input);
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function inferWorkoutFocus(goal: string | undefined, recentTypes: string[]) {
  const normalizedGoal = (goal ?? '').trim().toLowerCase();
  if (normalizedGoal) return normalizedGoal;
  return recentTypes[0]?.toLowerCase() ?? 'endurance';
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw httpError('Activity payload is required', 400);
  }

  const payload = input as Record<string, unknown>;
  const userId = normalizeObjectId(payload.userId, 'userId');
  const teamId = normalizeObjectId(payload.teamId, 'teamId');
  const type = requireNonEmptyString(payload.type, 'type').toLowerCase();
  const minutes = requirePositiveNumber(payload.minutes, 'minutes');

  const user = await User.findById(userId);
  if (!user) {
    throw httpError('User not found', 404);
  }
  const team = await Team.findById(teamId);
  if (!team) {
    throw httpError('Team not found', 404);
  }

  const points = Math.max(1, Math.round(minutes));
  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw httpError('Team payload is required', 400);
  }

  const payload = input as Record<string, unknown>;
  const name = requireNonEmptyString(payload.name, 'name');
  const mascot = requireNonEmptyString(payload.mascot, 'mascot');
  const membersValue = Array.isArray(payload.members) ? payload.members : [];

  const members = membersValue.map((memberId, index) => normalizeObjectId(memberId, `members[${index}]`));

  try {
    const team = await Team.create({
      name,
      mascot,
      members,
    });
    return team.toObject();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw httpError('A team with this name already exists', 409);
    }
    throw error;
  }
}

export async function getLeaderboard() {
  const teams = await Team.find().select('_id name').lean();
  const teamMap = new Map(teams.map((team) => [team._id.toString(), team.name]));
  const collection = await Activity.find().select('team points').lean();
  const totals = new Map<string, number>();

  for (const item of collection) {
    const teamId = item.team?.toString();
    if (!teamId) continue;
    totals.set(teamId, (totals.get(teamId) ?? 0) + (Number(item.points) || 0));
  }

  const leaderboard = Array.from(totals.entries())
    .map(([teamId, totalPoints]) => ({
      teamId,
      teamName: teamMap.get(teamId) ?? 'Unknown team',
      totalPoints,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName));

  return leaderboard.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = requireNonEmptyString(userEmail, 'userEmail');
  const user = await User.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();

  if (!user) {
    throw httpError('User not found', 404);
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentTypes = recentActivities.map((activity) => String(activity.type ?? ''));
  const preferredFocus = inferWorkoutFocus(user.fitnessGoal, recentTypes);

  const workouts = await Workout.find().sort({ minutes: 1 }).lean();
  const matchingWorkouts = workouts.filter((workout) => String(workout.focus).toLowerCase() === preferredFocus.toLowerCase());
  const rankedWorkouts = matchingWorkouts.length > 0 ? matchingWorkouts : workouts;

  return rankedWorkouts.slice(0, 3).map((workout, index) => ({
    ...workout,
    reason: index === 0
      ? `Matches your ${preferredFocus} goal${recentTypes.length ? ` and recent ${recentTypes[0]} activity` : ''}.`
      : `Builds on your ${preferredFocus} focus with ${workout.minutes} minutes of ${workout.difficulty} effort.`,
  }));
}

export { User };
