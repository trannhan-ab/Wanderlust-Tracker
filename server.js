const express = require("express");
const path = require("path");
const { readJSON, writeJSON } = require("./db");

const app = express(); 
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// READ ALL
app.get('/destinations', (req, res) => {
  const destinations = readJSON('destinations');
  res.json(destinations);
});

// READ ONE 
app.get('/destinations/:id', (req, res) => {
  const destinations = readJSON('destinations');
  const item = destinations.find(d => d.id == req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Không tìm thấy địa điểm!' });
  }
  res.json(item);
});

// CREATE
app.post('/destinations', (req, res) => {
  const destinations = readJSON('destinations');
  const newDestination = {
    id: Date.now().toString(),
    name: req.body.name,
    category: req.body.category || 'General',
    budget: req.body.budget || 0,
    status: req.body.status || 'Planned'
  };

  destinations.push(newDestination);
  writeJSON('destinations', destinations);
  res.status(201).json(newDestination);
});

// UPDATE
app.put('/destinations/:id', (req, res) => {
  const destinations = readJSON('destinations');
  const index = destinations.findIndex(d => d.id == req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'Không tìm thấy địa điểm!' });
  }

  destinations[index] = {
    ...destinations[index],
    name: req.body.name || destinations[index].name,
    category: req.body.category || destinations[index].category,
    budget: req.body.budget || destinations[index].budget,
    status: req.body.status || destinations[index].status
  };

  writeJSON('destinations', destinations);
  res.json(destinations[index]);
});

// DELETE
app.delete('/destinations/:id', (req, res) => {
  const destinations = readJSON('destinations');
  const index = destinations.findIndex(d => d.id == req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'Không tìm thấy địa điểm!' });
  }

  destinations.splice(index, 1);
  writeJSON('destinations', destinations);
  res.json({ message: 'Đã xóa địa điểm thành công!' });
});

// USER
app.get('/users', (req, res) => {
  const users = readJSON('users');
  res.json(users);
});

// Đăng ký người dùng mới
app.post('/users', (req, res) => {
  const users = readJSON('users');
  const newUser = {
    id: Date.now().toString(),
    username: req.body.username,
    email: req.body.email,
    password: req.body.password
  };

  users.push(newUser);
  writeJSON('users', users);
  res.status(201).json(newUser);
});

// BUDGETS
app.get('/budgets', (req, res) => {
  const budgets = readJSON('budgets');
  res.json(budgets);
});

// Thêm nguồn quỹ mới
app.post('/budgets', (req, res) => {
  const budgets = readJSON('budgets');
  const newBudget = {
    id: Date.now().toString(),
    sourceName: req.body.sourceName,
    amount: req.body.amount || 0
  };

  budgets.push(newBudget);
  writeJSON('budgets', budgets);
  res.status(201).json(newBudget);
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`Server Node.js đang chạy tại: http://localhost:${PORT}`);
});
