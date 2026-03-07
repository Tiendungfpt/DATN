const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('API Thịnh Phát Hotel running');
});

/* Room routes (Admin quản lý phòng) */
const roomRoutes = require('./routes/room.routes');
app.use('/api/rooms', roomRoutes);

module.exports = app;
