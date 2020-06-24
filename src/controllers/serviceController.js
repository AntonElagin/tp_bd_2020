const Service = require('../models/serviceModel');

module.exports = class ServiceController {
  static async deleteAll(req, resp) {
    await Service.deleteAll();

    resp.type('text/plain');
    return resp.code(200).send();
  }

  static async getInfo(req, resp) {
    const info = await Service.getInfo();

    if (!info) {
      return resp.code(500).end();
    }

    return resp.code(200).send(info);
  }
};
