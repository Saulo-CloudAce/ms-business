function calcExpireTime (fromTime, toTime) {
  return Math.ceil((fromTime.getTime() - toTime.getTime()) / 1000)
}

module.exports = { calcExpireTime }
