export function createHealthController(getMongoState) {
  return function getHealth(_req, res) {
    res.json({ status: "ok", mongo: getMongoState() });
  };
}
