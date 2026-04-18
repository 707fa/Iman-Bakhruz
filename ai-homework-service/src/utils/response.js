function ok(res, payload) {
  return res.status(200).json(payload);
}

function created(res, payload) {
  return res.status(201).json(payload);
}

module.exports = {
  ok,
  created,
};
