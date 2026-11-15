import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Team } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Team.init();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Team.deleteMany({});
});

describe('OctoFit API validation', () => {
  it('rejects activity durations below the model minimum', async () => {
    const response = await request(app).post('/api/activities').send({
      userId: new mongoose.Types.ObjectId().toString(),
      teamId: new mongoose.Types.ObjectId().toString(),
      type: 'run',
      minutes: 0.5,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/at least 1/i);
  });

  it('returns conflict when a team name is already in use', async () => {
    await Team.create({ name: 'Octocats', mascot: 'Mona' });

    const response = await request(app).post('/api/teams').send({ name: 'Octocats', mascot: 'Mona' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already exists/i);
  });
});
