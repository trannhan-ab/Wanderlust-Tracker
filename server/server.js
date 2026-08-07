// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fileStore = require('./fileStore');

const app = express();
app.use(cors());
app.use(express.json());

const API_BASE = '/api';

// --- Trips endpoints ---
app.get(`${API_BASE}/trips`, async (req, res) => {
  try {
    const trips = await fileStore.readJsonFile('trips.json', { defaultValue: [] });
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read trips' });
  }
});

app.get(`${API_BASE}/trips/:id`, async (req, res) => {
  try {
    const trips = await fileStore.readJsonFile('trips.json', { defaultValue: [] });
    const trip = trips.find(t => String(t.id) === String(req.params.id));
    if (!trip) return res.status(404).json({ error: 'Not found' });
    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read trip' });
  }
});

app.post(`${API_BASE}/trips`, async (req, res) => {
  try {
    const trips = await fileStore.readJsonFile('trips.json', { defaultValue: [] });
    const newTrip = { ...req.body, id: uuidv4(), createdAt: new Date().toISOString() };
    trips.push(newTrip);
    await fileStore.writeJsonFile('trips.json', trips);
    res.status(201).json(newTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

app.put(`${API_BASE}/trips/:id`, async (req, res) => {
  try {
    const trips = await fileStore.readJsonFile('trips.json', { defaultValue: [] });
    const idx = trips.findIndex(t => String(t.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    trips[idx] = { ...trips[idx], ...req.body, id: trips[idx].id, updatedAt: new Date().toISOString() };
    await fileStore.writeJsonFile('trips.json', trips);
    res.json(trips[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

app.delete(`${API_BASE}/trips/:id`, async (req, res) => {
  try {
    const trips = await fileStore.readJsonFile('trips.json', { defaultValue: [] });
    const updated = trips.filter(t => String(t.id) !== String(req.params.id));
    await fileStore.writeJsonFile('trips.json', updated);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// Serve static frontend in production (optional)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}${API_BASE}`));
