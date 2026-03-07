const service = require('../services/room.service');

exports.getAll = (req, res) => {
    res.json(service.getAll());
};

exports.create = (req, res) => {
    res.status(201).json(service.create(req.body));
};

exports.update = (req, res) => {
    res.json(service.update(req.params.id, req.body));
};

exports.remove = (req, res) => {
    service.remove(req.params.id);
    res.status(204).end();
};
