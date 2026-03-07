let rooms = [];

exports.getAll = () => rooms;

exports.create = (data) => {
    const room = { id: Date.now(), ...data };
    rooms.push(room);
    return room;
};

exports.update = (id, data) => {
    rooms = rooms.map(r => r.id == id ? { ...r, ...data } : r);
    return rooms.find(r => r.id == id);
};

exports.remove = (id) => {
    rooms = rooms.filter(r => r.id != id);
};
