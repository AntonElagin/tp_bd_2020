const Users = require('../models/userModel');

class UserController {
  static async getUser(req, resp) {
    const nickname = req.params.nickname;
    const result = await Users.getUserByNickname(nickname);

    if (result) {
      return resp.code(200).send(result);
    }
    return resp.code(404).send({
      message: `Can't find user with nickname '${nickname}'\n`,
    });
  }

  static async createUser(req, resp) {
    const userData = {
      nickname: req.params.nickname,
      ...req.body,
    };

    const result = await Users.createUserTx(userData);

    return resp.code(result.status).send(result.user);
  }

  static async updateUser(req, resp) {
    const nickname = req.params.nickname;
    const userData = req.body;

    const result = await Users.updateUserTx(nickname, userData);

    return resp.code(result.status).send(result.data);
  }
}

module.exports = UserController;
