const Users = require('../models/userModel');

class UserController {
  static async getUser(req, resp) {
    const nickname = req.params.nickname;
    const result = await Users.getUserByNickname(nickname);

    if (result) {
      return resp.status(200).json(result);
    }
    return resp.status(404).json({
      message: `Can't find user with nickname '${nickname}'\n`,
    });
  }

  static async createUser(req, resp) {
    const userData = {
      nickname: req.params.nickname,
      ...req.body,
    };

    const result = await Users.createUserTx(userData);

    return resp.status(result.status).json(result.user);
  }

  static async updateUser(req, resp) {
    const nickname = req.params.nickname;
    const userData = req.body;

    const result = await Users.updateUserTx(nickname, userData);

    return resp.status(result.status).json(result.data);
  }
}

module.exports = UserController;
