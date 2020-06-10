const Service = require('../models/serviceModel');

module.exports = class ServiceController {
  static async deleteAll(req, resp) {
    const deleted = await Service.deleteAll();

    if (!deleted.success) {
      return resp.status(500);
    }

    return resp.status(200);
  }

  static async getInfo(req, resp) {
    const info = await Service.getInfo();

    if (!info.success) {
      return resp.status(500);
    }

    return resp.status(200).json(info.data);
  }
};
